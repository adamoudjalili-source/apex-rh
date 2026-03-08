-- ============================================================
-- APEX RH — Migration Notifications
-- ✅ Session 12 — Notifications in-app + préparation email
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ 1. ENUM TYPE DE NOTIFICATION                           │
-- └─────────────────────────────────────────────────────────┘
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'task_assigned',
      'task_overdue',
      'task_completed',
      'task_comment',
      'objective_evaluation',
      'objective_validated',
      'project_member_added',
      'project_milestone_reached',
      'project_deliverable_due',
      'system'
    );
  END IF;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 2. TABLE NOTIFICATIONS                                 │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ┌─────────────────────────────────────────────────────────┐
-- │ 3. TABLE EMAIL_QUEUE (pour envoi différé)              │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  notification_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,

  CONSTRAINT email_queue_notification_id_fkey
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';

-- ┌─────────────────────────────────────────────────────────┐
-- │ 4. TABLE NOTIFICATION_PREFERENCES                      │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_task_assigned boolean NOT NULL DEFAULT true,
  email_task_overdue boolean NOT NULL DEFAULT true,
  email_task_completed boolean NOT NULL DEFAULT false,
  email_task_comment boolean NOT NULL DEFAULT true,
  email_objective_evaluation boolean NOT NULL DEFAULT true,
  email_project_member boolean NOT NULL DEFAULT true,
  email_project_milestone boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notification_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ 5. FONCTION HELPER : créer une notification            │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif_id uuid;
  v_email text;
  v_name text;
  v_pref_col text;
  v_send_email boolean;
BEGIN
  -- Créer la notification in-app
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notif_id;

  -- Vérifier les préférences email
  v_pref_col := 'email_' || split_part(p_type::text, '_', 1) || '_' || split_part(p_type::text, '_', 2);

  -- Récupérer l'email et le nom
  SELECT email, first_name INTO v_email, v_name
  FROM users WHERE id = p_user_id;

  -- Vérifier si l'utilisateur veut un email pour ce type
  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM notification_preferences WHERE user_id = $1), true)',
    v_pref_col
  ) INTO v_send_email USING p_user_id;

  -- Si oui, ajouter à la file d'attente email
  IF v_send_email AND v_email IS NOT NULL THEN
    INSERT INTO email_queue (to_email, to_name, subject, body_html, notification_id)
    VALUES (
      v_email,
      v_name,
      'APEX RH — ' || p_title,
      format(
        '<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <div style="background:#0F0F23;border-radius:12px;padding:24px;color:white;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
              <div style="width:32px;height:32px;background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:14px;font-weight:bold;">A</span>
              </div>
              <span style="font-size:14px;font-weight:800;letter-spacing:0.1em;">APEX RH</span>
            </div>
            <h2 style="font-size:16px;margin:0 0 8px;">%s</h2>
            <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 16px;">%s</p>
            %s
          </div>
          <p style="font-size:11px;color:#888;text-align:center;margin-top:12px;">
            Vous recevez cet email car vous utilisez APEX RH. 
            Vous pouvez modifier vos préférences dans l''application.
          </p>
        </div>',
        p_title,
        COALESCE(p_message, ''),
        CASE WHEN p_link IS NOT NULL THEN
          format('<a href="%s" style="display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Voir dans APEX RH</a>', p_link)
        ELSE '' END
      ),
      v_notif_id
    );
  END IF;

  RETURN v_notif_id;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 6. TRIGGER : notification quand tâche assignée         │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title text;
  v_assigner_name text;
BEGIN
  -- Ne pas notifier si on s'assigne soi-même
  IF NEW.user_id = COALESCE(NEW.assigned_by, auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_task_title FROM tasks WHERE id = NEW.task_id;
  SELECT first_name || ' ' || last_name INTO v_assigner_name
  FROM users WHERE id = COALESCE(NEW.assigned_by, auth.uid());

  PERFORM create_notification(
    NEW.user_id,
    'task_assigned',
    'Nouvelle tâche assignée',
    format('%s vous a assigné la tâche « %s »', v_assigner_name, v_task_title),
    '/tasks',
    jsonb_build_object('task_id', NEW.task_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON task_assignees;
CREATE TRIGGER trg_notify_task_assigned
  AFTER INSERT ON task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- ┌─────────────────────────────────────────────────────────┐
-- │ 7. TRIGGER : notification quand commentaire tâche      │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION notify_task_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title text;
  v_task_creator uuid;
  v_commenter_name text;
  v_assignee record;
BEGIN
  SELECT title, created_by INTO v_task_title, v_task_creator
  FROM tasks WHERE id = NEW.task_id;

  SELECT first_name || ' ' || last_name INTO v_commenter_name
  FROM users WHERE id = NEW.user_id;

  -- Notifier le créateur de la tâche (si différent du commentateur)
  IF v_task_creator IS NOT NULL AND v_task_creator != NEW.user_id THEN
    PERFORM create_notification(
      v_task_creator,
      'task_comment',
      'Nouveau commentaire',
      format('%s a commenté la tâche « %s »', v_commenter_name, v_task_title),
      '/tasks',
      jsonb_build_object('task_id', NEW.task_id)
    );
  END IF;

  -- Notifier les autres assignés (sauf le commentateur)
  FOR v_assignee IN
    SELECT user_id FROM task_assignees
    WHERE task_id = NEW.task_id AND user_id != NEW.user_id AND user_id != v_task_creator
  LOOP
    PERFORM create_notification(
      v_assignee.user_id,
      'task_comment',
      'Nouveau commentaire',
      format('%s a commenté la tâche « %s »', v_commenter_name, v_task_title),
      '/tasks',
      jsonb_build_object('task_id', NEW.task_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON task_comments;
CREATE TRIGGER trg_notify_task_comment
  AFTER INSERT ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_comment();

-- ┌─────────────────────────────────────────────────────────┐
-- │ 8. TRIGGER : notification changement évaluation OKR    │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION notify_objective_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg text;
BEGIN
  -- Seulement si le statut d'évaluation change
  IF OLD.evaluation_status = NEW.evaluation_status THEN
    RETURN NEW;
  END IF;

  -- Ne pas notifier le propriétaire de ses propres actions
  IF NEW.owner_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  CASE NEW.evaluation_status
    WHEN 'auto_evaluation' THEN
      v_msg := format('L''objectif « %s » est prêt pour votre auto-évaluation', NEW.title);
    WHEN 'validation_n1' THEN
      v_msg := format('L''objectif « %s » attend votre validation N+1', NEW.title);
    WHEN 'calibration_rh' THEN
      v_msg := format('L''objectif « %s » est en calibration RH', NEW.title);
    WHEN 'finalise' THEN
      v_msg := format('L''évaluation de l''objectif « %s » est finalisée', NEW.title);
    ELSE
      RETURN NEW;
  END CASE;

  PERFORM create_notification(
    NEW.owner_id,
    'objective_evaluation',
    'Évaluation mise à jour',
    v_msg,
    '/objectives',
    jsonb_build_object('objective_id', NEW.id, 'evaluation_status', NEW.evaluation_status::text)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_objective_evaluation ON objectives;
CREATE TRIGGER trg_notify_objective_evaluation
  AFTER UPDATE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION notify_objective_evaluation();

-- ┌─────────────────────────────────────────────────────────┐
-- │ 9. TRIGGER : notification ajout membre projet          │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION notify_project_member_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_name text;
  v_adder_name text;
BEGIN
  -- Ne pas notifier si on s'ajoute soi-même
  IF NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;
  SELECT first_name || ' ' || last_name INTO v_adder_name
  FROM users WHERE id = auth.uid();

  PERFORM create_notification(
    NEW.user_id,
    'project_member_added',
    'Ajouté à un projet',
    format('%s vous a ajouté au projet « %s »', v_adder_name, v_project_name),
    '/projects',
    jsonb_build_object('project_id', NEW.project_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_member ON project_members;
CREATE TRIGGER trg_notify_project_member
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_member_added();

-- ┌─────────────────────────────────────────────────────────┐
-- │ 10. TRIGGER : notification jalon atteint               │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION notify_milestone_reached()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_member record;
BEGIN
  -- Seulement si le statut passe à 'atteint'
  IF NEW.status != 'atteint' OR OLD.status = 'atteint' THEN
    RETURN NEW;
  END IF;

  SELECT id, name, owner_id INTO v_project FROM projects WHERE id = NEW.project_id;

  -- Notifier le propriétaire du projet
  IF v_project.owner_id IS NOT NULL THEN
    PERFORM create_notification(
      v_project.owner_id,
      'project_milestone_reached',
      'Jalon atteint',
      format('Le jalon « %s » du projet « %s » a été atteint', NEW.title, v_project.name),
      '/projects',
      jsonb_build_object('project_id', NEW.project_id, 'milestone_id', NEW.id)
    );
  END IF;

  -- Notifier les chefs de projet
  FOR v_member IN
    SELECT user_id FROM project_members
    WHERE project_id = NEW.project_id
      AND role = 'chef_projet'
      AND user_id != v_project.owner_id
      AND user_id != auth.uid()
  LOOP
    PERFORM create_notification(
      v_member.user_id,
      'project_milestone_reached',
      'Jalon atteint',
      format('Le jalon « %s » du projet « %s » a été atteint', NEW.title, v_project.name),
      '/projects',
      jsonb_build_object('project_id', NEW.project_id, 'milestone_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_milestone_reached ON milestones;
CREATE TRIGGER trg_notify_milestone_reached
  AFTER UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION notify_milestone_reached();

-- ┌─────────────────────────────────────────────────────────┐
-- │ 11. POLITIQUES RLS                                     │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications : chacun voit/modifie les siennes, admin voit tout
DROP POLICY IF EXISTS notif_select ON notifications;
CREATE POLICY notif_select ON notifications FOR SELECT USING (
  user_id = auth.uid() OR get_my_role()::text = 'administrateur'
);

DROP POLICY IF EXISTS notif_update ON notifications;
CREATE POLICY notif_update ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS notif_delete ON notifications;
CREATE POLICY notif_delete ON notifications FOR DELETE USING (
  user_id = auth.uid() OR get_my_role()::text = 'administrateur'
);

-- INSERT via SECURITY DEFINER (create_notification) uniquement
DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_insert ON notifications FOR INSERT WITH CHECK (true);

-- Préférences : chacun gère les siennes
DROP POLICY IF EXISTS notif_pref_select ON notification_preferences;
CREATE POLICY notif_pref_select ON notification_preferences FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS notif_pref_insert ON notification_preferences;
CREATE POLICY notif_pref_insert ON notification_preferences FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS notif_pref_update ON notification_preferences;
CREATE POLICY notif_pref_update ON notification_preferences FOR UPDATE USING (
  user_id = auth.uid()
);

-- Email queue : admin seulement
DROP POLICY IF EXISTS email_queue_select ON email_queue;
CREATE POLICY email_queue_select ON email_queue FOR SELECT USING (
  get_my_role()::text = 'administrateur'
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ 12. REALTIME (pour notifications instantanées)         │
-- └─────────────────────────────────────────────────────────┘
-- Activer le realtime sur la table notifications
-- (à exécuter dans les paramètres Supabase > Realtime > notifications)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- FIN DE LA MIGRATION
-- Tables créées : notifications, email_queue, notification_preferences
-- Triggers : 5 (task_assigned, task_comment, objective_evaluation,
--               project_member_added, milestone_reached)
-- Politiques RLS : 7
-- ============================================================
