-- ============================================================
-- APEX RH — Migration Session 35 — Intégrations Tierces
-- Table : integration_webhooks
-- Feature flag : integrations_enabled dans app_settings.modules
-- ============================================================

-- ─── TABLE WEBHOOKS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type         text NOT NULL CHECK (type IN ('slack', 'teams', 'zapier')),
  label        text NOT NULL DEFAULT '',           -- nom affiché
  webhook_url  text NOT NULL,                      -- URL du webhook entrant
  is_active    boolean DEFAULT true,
  -- Événements déclencheurs (JSON array de strings)
  triggers     jsonb DEFAULT '["award","alert_manager","review_cycle","survey"]',
  -- Dernier test
  last_tested_at  timestamptz,
  last_test_ok    boolean,
  last_test_error text,
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index pour requêtes par type
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_type
  ON integration_webhooks(type);

-- ─── TABLE LOGS D'ENVOI ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_logs (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id     uuid REFERENCES integration_webhooks(id) ON DELETE CASCADE,
  event_type     text NOT NULL,   -- 'award', 'alert_manager', 'review_cycle', etc.
  payload        jsonb,
  success        boolean NOT NULL DEFAULT false,
  http_status    integer,
  error_message  text,
  sent_at        timestamptz DEFAULT now()
);

-- Index pour requêtes récentes
CREATE INDEX IF NOT EXISTS idx_integration_logs_webhook
  ON integration_logs(webhook_id, sent_at DESC);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs     ENABLE ROW LEVEL SECURITY;

-- Seuls les administrateurs peuvent gérer les webhooks
CREATE POLICY "admins_manage_webhooks" ON integration_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'administrateur'
    )
  );

-- Les managers peuvent voir les logs (lecture seule)
CREATE POLICY "managers_read_logs" ON integration_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrateur', 'directeur', 'chef_division', 'chef_service')
    )
  );

-- ─── FEATURE FLAG ───────────────────────────────────────────
UPDATE app_settings
SET value = (value::jsonb || '{"integrations_enabled": false}'::jsonb)
WHERE key = 'modules'
  AND NOT (value::jsonb ? 'integrations_enabled');
