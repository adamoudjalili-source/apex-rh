-- ============================================================
-- APEX RH — s130_task_automations.sql
-- Automations simples : 4 règles déclenchées par pg_cron
--   1. Tâche terminée     → notifier le manager
--   2. Échéance dépassée  → escalade + alerte
--   3. En revue > 48h     → relance automatique
--   4. (Template → assignation automatique, géré côté app)
-- ============================================================

-- ─── Table des règles d'automation ────────────────────────
CREATE TABLE IF NOT EXISTS task_automation_rules (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  trigger_event   text NOT NULL CHECK (trigger_event IN (
    'task_completed',     -- tâche passée à terminee
    'task_overdue',       -- échéance dépassée
    'review_timeout',     -- en_revue sans action depuis N heures
    'task_blocked'        -- tâche passée à bloquee
  )),
  -- Paramètres du déclencheur
  trigger_config  jsonb NOT NULL DEFAULT '{}',
  -- ex: { "timeout_hours": 48 } pour review_timeout
  -- ex: { "overdue_hours": 0 }  pour task_overdue (immédiat)
  -- Actions à effectuer
  action_type     text NOT NULL CHECK (action_type IN (
    'notify_manager',     -- notifier le manager direct
    'notify_assignees',   -- notifier les assignés
    'notify_creator',     -- notifier le créateur
    'change_status'       -- changer le statut (ex: bloquee)
  )),
  action_config   jsonb NOT NULL DEFAULT '{}',
  -- ex: { "new_status": "bloquee" }
  -- ex: { "message": "Votre tâche {{title}} est en retard" }
  is_active       boolean DEFAULT true,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── Table des logs d'exécution ───────────────────────────
CREATE TABLE IF NOT EXISTS task_automation_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  rule_id         uuid REFERENCES task_automation_rules(id) ON DELETE CASCADE,
  task_id         uuid REFERENCES tasks(id) ON DELETE CASCADE,
  action_type     text NOT NULL,
  status          text NOT NULL CHECK (status IN ('success','error','skipped')),
  details         jsonb DEFAULT '{}',
  executed_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_auto_rules_org    ON task_automation_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_task_auto_logs_task    ON task_automation_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_auto_logs_rule    ON task_automation_logs(rule_id, executed_at DESC);

ALTER TABLE task_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_automation_logs  ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres
CREATE POLICY "task_auto_rules_select" ON task_automation_rules
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Écriture : administrateur, directeur
CREATE POLICY "task_auto_rules_write" ON task_automation_rules
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

-- Logs : lecture organisation
CREATE POLICY "task_auto_logs_select" ON task_automation_logs
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ─── Fonction : envoyer une notification in-app ────────────
-- Insère dans la table `notifications` (existante S12)
CREATE OR REPLACE FUNCTION notify_task_automation(
  p_organization_id uuid,
  p_user_id         uuid,
  p_title           text,
  p_body            text,
  p_task_id         uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (organization_id, user_id, title, body, type, metadata, created_at)
  VALUES (
    p_organization_id,
    p_user_id,
    p_title,
    p_body,
    'task_automation',
    jsonb_build_object('task_id', p_task_id),
    now()
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── Fonction : Règle 1 — Tâche terminée → notifier manager
-- Déclenchée par trigger sur UPDATE tasks.status → 'terminee'
CREATE OR REPLACE FUNCTION trigger_task_completed_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rule     record;
  v_manager  uuid;
  v_title    text;
BEGIN
  -- Seulement si le statut passe à 'terminee'
  IF NEW.status <> 'terminee' OR OLD.status = 'terminee' THEN
    RETURN NEW;
  END IF;

  -- Chercher les règles actives task_completed pour cette organisation
  FOR v_rule IN
    SELECT * FROM task_automation_rules
    WHERE organization_id = NEW.organization_id
      AND trigger_event = 'task_completed'
      AND is_active = true
      AND action_type = 'notify_manager'
  LOOP
    -- Trouver le manager du service de la tâche
    SELECT manager_id INTO v_manager
    FROM services
    WHERE id = NEW.service_id;

    IF v_manager IS NOT NULL AND v_manager <> NEW.created_by THEN
      v_title := '✅ Tâche terminée';
      PERFORM notify_task_automation(
        NEW.organization_id, v_manager,
        v_title,
        'La tâche "' || NEW.title || '" a été marquée comme terminée.',
        NEW.id
      );
      -- Logguer
      INSERT INTO task_automation_logs(organization_id, rule_id, task_id, action_type, status, details)
      VALUES(NEW.organization_id, v_rule.id, NEW.id, 'notify_manager', 'success',
             jsonb_build_object('manager_id', v_manager));
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_completed_notify ON tasks;
CREATE TRIGGER trg_task_completed_notify
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_task_completed_notifications();

-- ─── Fonction pg_cron : Règle 2 — Tâches en retard ────────
-- À appeler toutes les heures via pg_cron
CREATE OR REPLACE FUNCTION run_task_overdue_automations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rule   record;
  v_task   record;
  v_user   record;
  v_msg    text;
  v_already_notified boolean;
BEGIN
  FOR v_rule IN
    SELECT * FROM task_automation_rules
    WHERE trigger_event = 'task_overdue' AND is_active = true
  LOOP
    FOR v_task IN
      SELECT t.* FROM tasks t
      WHERE t.organization_id = v_rule.organization_id
        AND t.due_date < CURRENT_DATE
        AND t.status NOT IN ('terminee','annule','bloquee')
        AND t.is_archived = false
    LOOP
      -- Éviter le doublon : vérifier si déjà notifié aujourd'hui
      SELECT EXISTS(
        SELECT 1 FROM task_automation_logs
        WHERE task_id = v_task.id
          AND rule_id = v_rule.id
          AND executed_at::date = CURRENT_DATE
      ) INTO v_already_notified;

      IF v_already_notified THEN CONTINUE; END IF;

      v_msg := 'La tâche "' || v_task.title || '" est en retard depuis le '
               || to_char(v_task.due_date, 'DD/MM/YYYY') || '.';

      -- Notifier les assignés
      FOR v_user IN
        SELECT user_id FROM task_assignees WHERE task_id = v_task.id
      LOOP
        PERFORM notify_task_automation(
          v_task.organization_id, v_user.user_id,
          '⚠️ Tâche en retard', v_msg, v_task.id
        );
      END LOOP;

      INSERT INTO task_automation_logs(organization_id, rule_id, task_id, action_type, status)
      VALUES(v_task.organization_id, v_rule.id, v_task.id, 'notify_assignees', 'success');
    END LOOP;
  END LOOP;
END;
$$;

-- ─── Fonction pg_cron : Règle 3 — En revue > 48h sans action
CREATE OR REPLACE FUNCTION run_task_review_timeout_automations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rule     record;
  v_task     record;
  v_timeout  integer;
  v_manager  uuid;
  v_already  boolean;
BEGIN
  FOR v_rule IN
    SELECT * FROM task_automation_rules
    WHERE trigger_event = 'review_timeout' AND is_active = true
  LOOP
    v_timeout := COALESCE((v_rule.trigger_config->>'timeout_hours')::integer, 48);

    FOR v_task IN
      SELECT t.* FROM tasks t
      WHERE t.organization_id = v_rule.organization_id
        AND t.status = 'en_revue'
        AND t.is_archived = false
        -- En revue depuis plus de N heures
        AND t.updated_at < (now() - make_interval(hours => v_timeout))
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM task_automation_logs
        WHERE task_id = v_task.id
          AND rule_id = v_rule.id
          AND executed_at > (now() - make_interval(hours => v_timeout))
      ) INTO v_already;

      IF v_already THEN CONTINUE; END IF;

      -- Notifier le manager du service
      SELECT manager_id INTO v_manager FROM services WHERE id = v_task.service_id;
      IF v_manager IS NOT NULL THEN
        PERFORM notify_task_automation(
          v_task.organization_id, v_manager,
          '⏳ Validation en attente',
          'La tâche "' || v_task.title || '" attend votre validation depuis plus de '
          || v_timeout || 'h.',
          v_task.id
        );
      END IF;

      -- Notifier également le créateur
      PERFORM notify_task_automation(
        v_task.organization_id, v_task.created_by,
        '⏳ Relance validation',
        'Votre tâche "' || v_task.title || '" est en attente de validation depuis ' || v_timeout || 'h.',
        v_task.id
      );

      INSERT INTO task_automation_logs(organization_id, rule_id, task_id, action_type, status,
        details)
      VALUES(v_task.organization_id, v_rule.id, v_task.id, 'notify_manager', 'success',
             jsonb_build_object('timeout_hours', v_timeout, 'manager_id', v_manager));
    END LOOP;
  END LOOP;
END;
$$;

-- ─── Enregistrement pg_cron (à activer dans Supabase) ─────
-- SELECT cron.schedule('task-overdue-check',   '0 * * * *',  'SELECT run_task_overdue_automations()');
-- SELECT cron.schedule('task-review-timeout',  '0 8 * * *',  'SELECT run_task_review_timeout_automations()');

-- ─── Règles par défaut (à insérer après avoir l'org_id) ───
-- À adapter avec l'organization_id réel :
-- INSERT INTO task_automation_rules (organization_id, name, trigger_event, trigger_config, action_type, action_config)
-- VALUES
--   ('<org_id>', 'Notifier manager à la completion', 'task_completed', '{}', 'notify_manager', '{}'),
--   ('<org_id>', 'Alerte retard quotidienne',         'task_overdue',   '{"overdue_hours":0}', 'notify_assignees', '{}'),
--   ('<org_id>', 'Relance validation 48h',            'review_timeout', '{"timeout_hours":48}','notify_manager',   '{}');

-- ─── Trigger updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_task_automation_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_task_auto_rules_updated_at
  BEFORE UPDATE ON task_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_task_automation_rules_updated_at();
