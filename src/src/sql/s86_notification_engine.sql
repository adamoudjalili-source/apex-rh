-- ============================================================
-- APEX RH — s86_notification_engine.sql
-- Session 86 — Notifications : Moteur de règles + escalade
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ 1. TABLE notification_rules                            │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS notification_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                text NOT NULL,
  trigger_event       text NOT NULL,
  -- ex: 'leave_refused', 'departure_registered', 'review_due', 'onboarding_overdue', 'offboarding_alert'
  conditions          jsonb NOT NULL DEFAULT '{}',
  -- ex: { "leave_type": "conge_annuel", "min_days": 5 }
  target_roles        text[] NOT NULL DEFAULT '{}',
  -- ex: ['administrateur', 'directeur']
  message_template    text NOT NULL DEFAULT '',
  -- supports {{employee_name}}, {{event_date}}, {{details}}
  is_active           boolean NOT NULL DEFAULT true,
  escalate_after_days integer,
  escalate_to_role    text,
  -- ex: 'administrateur'
  created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_rules_org ON notification_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_notif_rules_event ON notification_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_notif_rules_active ON notification_rules(organization_id, is_active) WHERE is_active = true;

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_rules_org_select" ON notification_rules;
CREATE POLICY "notif_rules_org_select" ON notification_rules
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "notif_rules_admin_all" ON notification_rules;
CREATE POLICY "notif_rules_admin_all" ON notification_rules
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur', 'directeur')
  );

-- ┌─────────────────────────────────────────────────────────┐
-- │ 2. TABLE notification_inbox                            │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS notification_inbox (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id          uuid REFERENCES notification_rules(id) ON DELETE SET NULL,
  title            text NOT NULL,
  body             text NOT NULL DEFAULT '',
  event_type       text NOT NULL,
  reference_id     uuid,
  reference_type   text,
  -- ex: 'leave_request', 'departure', 'onboarding_process', 'offboarding_process'
  priority         text NOT NULL DEFAULT 'normal',
  -- 'low' | 'normal' | 'high' | 'urgent'
  read_at          timestamptz,
  archived_at      timestamptz,
  escalated_at     timestamptz,
  escalated_from   uuid REFERENCES notification_inbox(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_inbox_user ON notification_inbox(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_inbox_unread ON notification_inbox(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_inbox_org ON notification_inbox(organization_id);
CREATE INDEX IF NOT EXISTS idx_notif_inbox_event ON notification_inbox(event_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notif_inbox_escalate ON notification_inbox(organization_id, rule_id, created_at)
  WHERE read_at IS NULL AND archived_at IS NULL AND escalated_at IS NULL;

ALTER TABLE notification_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_inbox_owner_select" ON notification_inbox;
CREATE POLICY "notif_inbox_owner_select" ON notification_inbox
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_inbox_owner_update" ON notification_inbox;
CREATE POLICY "notif_inbox_owner_update" ON notification_inbox
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_inbox_admin_select" ON notification_inbox;
CREATE POLICY "notif_inbox_admin_select" ON notification_inbox
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur', 'directeur')
  );

-- ┌─────────────────────────────────────────────────────────┐
-- │ 3. RÈGLES PRÉDÉFINIES PAR DÉFAUT (seed par org)        │
-- └─────────────────────────────────────────────────────────┘
-- Ces règles sont insérées via dispatch_notification ou manuellement par l'admin.
-- Elles servent de templates documentés ci-dessous :

-- trigger_event      | Description
-- ------------------|----------------------------------------------
-- leave_refused      | Congé refusé → notifier le demandeur
-- leave_approved     | Congé approuvé → notifier le demandeur
-- departure_registered | Départ enregistré → notifier RH/admin
-- onboarding_overdue | Tâche onboarding en retard → notifier manager
-- offboarding_alert  | Offboarding avec retard → notifier RH
-- review_due         | Entretien à planifier → notifier évaluateur
-- feedback360_due    | Feedback 360 en attente → notifier participant
-- settlement_applied | Solde de tout compte appliqué → notifier RH

-- ┌─────────────────────────────────────────────────────────┐
-- │ 4. FONCTION dispatch_notification                      │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION dispatch_notification(
  p_org_id       uuid,
  p_event_type   text,
  p_reference_id uuid DEFAULT NULL,
  p_data         jsonb DEFAULT '{}'
)
RETURNS integer   -- nombre de notifications insérées
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule         record;
  v_user         record;
  v_title        text;
  v_body         text;
  v_count        integer := 0;
  v_employee_name text;
  v_event_date    text;
  v_details       text;
BEGIN
  -- Extraire les variables de template communes
  v_employee_name := coalesce(p_data->>'employee_name', 'Employé');
  v_event_date    := coalesce(p_data->>'event_date', to_char(now(), 'DD/MM/YYYY'));
  v_details       := coalesce(p_data->>'details', '');

  -- Parcourir les règles actives pour cet événement et cette org
  FOR v_rule IN
    SELECT * FROM notification_rules
    WHERE organization_id = p_org_id
      AND trigger_event   = p_event_type
      AND is_active       = true
  LOOP
    -- Construire le message depuis le template
    v_title := coalesce(p_data->>'title', 'Notification APEX RH');
    v_body  := v_rule.message_template;
    v_body  := replace(v_body, '{{employee_name}}', v_employee_name);
    v_body  := replace(v_body, '{{event_date}}',    v_event_date);
    v_body  := replace(v_body, '{{details}}',       v_details);

    -- Pour chaque utilisateur cible (roles correspondants dans l'org)
    FOR v_user IN
      SELECT id FROM users
      WHERE organization_id = p_org_id
        AND role = ANY(v_rule.target_roles)
        AND id != coalesce((p_data->>'exclude_user_id')::uuid, '00000000-0000-0000-0000-000000000000')
    LOOP
      INSERT INTO notification_inbox (
        organization_id,
        user_id,
        rule_id,
        title,
        body,
        event_type,
        reference_id,
        reference_type,
        priority
      ) VALUES (
        p_org_id,
        v_user.id,
        v_rule.id,
        v_title,
        v_body,
        p_event_type,
        p_reference_id,
        coalesce(p_data->>'reference_type', p_event_type),
        coalesce(p_data->>'priority', 'normal')
      );
      v_count := v_count + 1;
    END LOOP;

    -- Notifier aussi l'utilisateur cible direct si spécifié
    IF p_data->>'target_user_id' IS NOT NULL THEN
      INSERT INTO notification_inbox (
        organization_id,
        user_id,
        rule_id,
        title,
        body,
        event_type,
        reference_id,
        reference_type,
        priority
      ) VALUES (
        p_org_id,
        (p_data->>'target_user_id')::uuid,
        v_rule.id,
        v_title,
        v_body,
        p_event_type,
        p_reference_id,
        coalesce(p_data->>'reference_type', p_event_type),
        coalesce(p_data->>'priority', 'normal')
      )
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END IF;

  END LOOP;

  RETURN v_count;

EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer la mutation appelante
  RAISE WARNING 'dispatch_notification error for event %: %', p_event_type, SQLERRM;
  RETURN 0;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 5. FONCTION process_notification_escalations           │
-- └─────────────────────────────────────────────────────────┘
-- À appeler via un cron job quotidien (pg_cron ou Edge Function scheduled)
CREATE OR REPLACE FUNCTION process_notification_escalations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif  record;
  v_rule   record;
  v_user   record;
  v_count  integer := 0;
BEGIN
  FOR v_notif IN
    SELECT ni.*, nr.escalate_after_days, nr.escalate_to_role, nr.message_template,
           nr.name as rule_name, nr.organization_id as org_id
    FROM notification_inbox ni
    JOIN notification_rules  nr ON nr.id = ni.rule_id
    WHERE ni.read_at    IS NULL
      AND ni.archived_at IS NULL
      AND ni.escalated_at IS NULL
      AND nr.escalate_after_days IS NOT NULL
      AND nr.escalate_to_role    IS NOT NULL
      AND ni.created_at < now() - (nr.escalate_after_days || ' days')::interval
  LOOP
    -- Trouver les utilisateurs cibles de l'escalade
    FOR v_user IN
      SELECT id FROM users
      WHERE organization_id = v_notif.org_id
        AND role = v_notif.escalate_to_role
    LOOP
      INSERT INTO notification_inbox (
        organization_id,
        user_id,
        rule_id,
        title,
        body,
        event_type,
        reference_id,
        reference_type,
        priority,
        escalated_from
      ) VALUES (
        v_notif.org_id,
        v_user.id,
        v_notif.rule_id,
        '[ESCALADE] ' || v_notif.title,
        'Notification non lue depuis ' || v_notif.escalate_after_days || ' jours : ' || v_notif.body,
        v_notif.event_type,
        v_notif.reference_id,
        v_notif.reference_type,
        'urgent',
        v_notif.id
      );
      v_count := v_count + 1;
    END LOOP;

    -- Marquer la notification originale comme escaladée
    UPDATE notification_inbox
    SET escalated_at = now()
    WHERE id = v_notif.id;

  END LOOP;

  RETURN v_count;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'process_notification_escalations error: %', SQLERRM;
  RETURN 0;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 6. RPC MARK READ (securisé)                            │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_inbox
  SET read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE notification_inbox
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND organization_id = p_org_id
    AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 7. GRANT RPC                                           │
-- └─────────────────────────────────────────────────────────┘
GRANT EXECUTE ON FUNCTION dispatch_notification(uuid, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION process_notification_escalations() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(uuid) TO authenticated;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 8. SEED RÈGLES PRÉDÉFINIES (à adapter par org)         │
-- └─────────────────────────────────────────────────────────┘
-- Exemple : insérer pour chaque org existante les règles de base
-- (à décommenter et adapter selon besoins)

/*
INSERT INTO notification_rules (organization_id, name, trigger_event, target_roles, message_template, escalate_after_days, escalate_to_role)
SELECT
  id,
  'Congé refusé → Notifier employé',
  'leave_refused',
  ARRAY['collaborateur'],
  'Votre demande de congé du {{event_date}} a été refusée. {{details}}',
  NULL,
  NULL
FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO notification_rules (organization_id, name, trigger_event, target_roles, message_template, escalate_after_days, escalate_to_role)
SELECT
  id,
  'Départ enregistré → Notifier RH',
  'departure_registered',
  ARRAY['administrateur', 'directeur'],
  '{{employee_name}} a un départ enregistré le {{event_date}}. {{details}}',
  3,
  'directeur'
FROM organizations
ON CONFLICT DO NOTHING;
*/
