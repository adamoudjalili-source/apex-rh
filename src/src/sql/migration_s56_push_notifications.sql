-- ============================================================
-- APEX RH — migration_s56_push_notifications.sql
-- Session 56 — Alertes Push & Onboarding Enrichi
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ 1. ENUM notification_type (créer ou enrichir)          │
-- └─────────────────────────────────────────────────────────┘
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'task_assigned', 'task_overdue', 'task_completed', 'task_comment',
      'objective_evaluation', 'objective_validated',
      'project_member_added', 'project_milestone_reached', 'project_deliverable_due',
      'system',
      'calibration_session_opened', 'calibration_override_approved', 'calibration_override_rejected',
      'enps_survey_available', 'performance_alert', 'behavioral_alert',
      'succession_nominated', 'career_opportunity',
      'review_cycle_started', 'review_evaluation_due', 'onboarding_reminder'
    );
  ELSE
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'calibration_session_opened';    EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'calibration_override_approved'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'calibration_override_rejected'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'enps_survey_available';         EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'performance_alert';             EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'behavioral_alert';              EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'succession_nominated';          EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'career_opportunity';            EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_cycle_started';          EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'review_evaluation_due';         EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'onboarding_reminder';           EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 2. TABLE PUSH_SUBSCRIPTIONS (Web Push API)             │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  is_active       boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org_active
  ON push_subscriptions(organization_id, is_active) WHERE is_active = true;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "push_subscriptions_own"
    ON push_subscriptions FOR ALL
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "push_subscriptions_admin_read"
    ON push_subscriptions FOR SELECT
    USING (organization_id = auth_user_organization_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 3. TABLE PUSH_NOTIFICATION_LOGS                        │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS push_notification_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending',
  error_message   text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_logs_user_id
  ON push_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_status
  ON push_notification_logs(status, created_at DESC);

ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "push_logs_own"
    ON push_notification_logs FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 4. TABLE NOTIFICATION_PREFERENCES (créer ou enrichir)  │
-- └─────────────────────────────────────────────────────────┘
-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS notification_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Colonnes email existantes (idempotent)
  email_task_assigned       boolean NOT NULL DEFAULT true,
  email_task_overdue        boolean NOT NULL DEFAULT true,
  email_task_completed      boolean NOT NULL DEFAULT false,
  email_task_comment        boolean NOT NULL DEFAULT true,
  email_objective_evaluation boolean NOT NULL DEFAULT true,
  email_project_member      boolean NOT NULL DEFAULT true,
  email_project_milestone   boolean NOT NULL DEFAULT true,

  CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id)
);

-- Ajouter colonnes push_* si absentes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE notification_preferences
      ADD COLUMN push_enabled               boolean NOT NULL DEFAULT false,
      ADD COLUMN push_task_assigned         boolean NOT NULL DEFAULT true,
      ADD COLUMN push_task_overdue          boolean NOT NULL DEFAULT true,
      ADD COLUMN push_calibration_events    boolean NOT NULL DEFAULT true,
      ADD COLUMN push_performance_alerts    boolean NOT NULL DEFAULT true,
      ADD COLUMN push_review_cycle          boolean NOT NULL DEFAULT true,
      ADD COLUMN push_quiet_hours_start     time    DEFAULT '22:00',
      ADD COLUMN push_quiet_hours_end       time    DEFAULT '07:00',
      ADD COLUMN in_app_sound               boolean NOT NULL DEFAULT false,
      ADD COLUMN digest_frequency           text    NOT NULL DEFAULT 'realtime';
  END IF;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 5. TABLE ONBOARDING_CHECKLIST                          │
-- └─────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_key        text NOT NULL,
  is_completed    boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT onboarding_checklist_user_item_unique UNIQUE (user_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_user
  ON onboarding_checklist(user_id);

ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "onboarding_checklist_own"
    ON onboarding_checklist FOR ALL
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 6. FONCTION : create_push_notification                 │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION create_push_notification(
  p_user_id         uuid,
  p_type            notification_type,
  p_title           text,
  p_message         text DEFAULT NULL,
  p_link            text DEFAULT NULL,
  p_metadata        jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notif_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notif_id;
  RETURN v_notif_id;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 7. FONCTION : get_user_push_subscriptions              │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id uuid)
RETURNS TABLE (id uuid, endpoint text, p256dh text, auth text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, endpoint, p256dh, auth
  FROM push_subscriptions
  WHERE user_id = p_user_id AND is_active = true;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 8. TRIGGER : updated_at push_subscriptions             │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscription_timestamp();

-- ┌─────────────────────────────────────────────────────────┐
-- │ 9. pg_cron : nettoyage subscriptions expirées          │
-- └─────────────────────────────────────────────────────────┘
DO $outer$ BEGIN
  PERFORM cron.schedule(
    'push-subscription-cleanup',
    '0 3 * * 0',
    $cron$
      UPDATE push_subscriptions
      SET is_active = false
      WHERE last_used_at < now() - interval '90 days'
        AND is_active = true;
    $cron$
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $outer$;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 10. VAPID CONFIG dans app_settings                     │
-- └─────────────────────────────────────────────────────────┘
INSERT INTO app_settings (key, value)
VALUES
  ('vapid_public_key',  '"REPLACE_WITH_REAL_VAPID_PUBLIC_KEY"'),
  ('vapid_private_key', '"REPLACE_WITH_REAL_VAPID_PRIVATE_KEY"'),
  ('vapid_subject',     '"mailto:admin@apex-rh.fr"')
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'Migration S56 terminée : push_subscriptions, push_notification_logs, onboarding_checklist créées';
END $$;