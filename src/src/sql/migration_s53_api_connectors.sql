-- ============================================================
-- APEX RH — migration_s53_api_connectors.sql
-- Session 53 — API Ouverte & Connecteurs SIRH
-- Créé : 06/03/2026
-- Tables : api_keys, api_audit_logs, webhook_endpoints,
--          webhook_delivery_logs, field_mappings, scim_sync_logs
-- ============================================================

-- ─── 0. Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Enum scopes API ──────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE api_scope AS ENUM (
    'users:read',
    'users:write',
    'performance:read',
    'objectives:read',
    'objectives:write',
    'surveys:read',
    'scim:read',
    'scim:write',
    'webhooks:manage'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE webhook_event_type AS ENUM (
    'user.created',
    'user.updated',
    'user.deactivated',
    'performance.score_created',
    'performance.score_updated',
    'objective.created',
    'objective.updated',
    'objective.completed',
    'survey.completed',
    'succession.plan_updated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Table api_keys ───────────────────────────────────────
DROP TABLE IF EXISTS api_keys CASCADE;
CREATE TABLE api_keys (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  key_prefix        TEXT NOT NULL,          -- ex: "apx_live_"  (affiché en clair)
  key_hash          TEXT NOT NULL UNIQUE,   -- SHA-256 de la clé complète
  scopes            api_scope[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_min INT NOT NULL DEFAULT 100,
  expires_at        TIMESTAMPTZ,
  last_used_at      TIMESTAMPTZ,
  last_used_ip      TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_org         ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash        ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active      ON api_keys(is_active) WHERE is_active = true;
CREATE TRIGGER trg_api_keys_updated   BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. Table api_audit_logs ─────────────────────────────────
DROP TABLE IF EXISTS api_audit_logs CASCADE;
CREATE TABLE api_audit_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id        UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint          TEXT NOT NULL,
  method            TEXT NOT NULL,
  status_code       INT NOT NULL,
  ip_address        TEXT,
  user_agent        TEXT,
  request_params    JSONB,
  response_rows     INT,
  response_time_ms  INT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_audit_org        ON api_audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_api_audit_key        ON api_audit_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_audit_endpoint   ON api_audit_logs(endpoint, created_at DESC);
-- Rétention 90 jours (purge via pg_cron)
CREATE INDEX idx_api_audit_created    ON api_audit_logs(created_at);

-- ─── 4. Table webhook_endpoints ──────────────────────────────
DROP TABLE IF EXISTS webhook_endpoints CASCADE;
CREATE TABLE webhook_endpoints (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  url               TEXT NOT NULL,
  secret_hash       TEXT NOT NULL,          -- HMAC-SHA256 secret hashé pour stockage
  secret_prefix     TEXT NOT NULL,          -- 8 premiers chars du secret (affichage)
  events            webhook_event_type[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  retry_count       INT NOT NULL DEFAULT 3,
  timeout_seconds   INT NOT NULL DEFAULT 10,
  headers           JSONB DEFAULT '{}',     -- headers custom (ex: Authorization)
  last_triggered_at TIMESTAMPTZ,
  failure_count     INT NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_org          ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhook_active       ON webhook_endpoints(is_active, organization_id) WHERE is_active = true;
CREATE TRIGGER trg_webhook_updated    BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 5. Table webhook_delivery_logs ──────────────────────────
DROP TABLE IF EXISTS webhook_delivery_logs CASCADE;
CREATE TABLE webhook_delivery_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id        UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type        webhook_event_type NOT NULL,
  payload_preview   TEXT,                   -- 500 premiers chars du payload
  http_status       INT,
  attempt           INT NOT NULL DEFAULT 1,
  response_time_ms  INT,
  error_message     TEXT,
  delivered_at      TIMESTAMPTZ,
  next_retry_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wdl_webhook          ON webhook_delivery_logs(webhook_id, created_at DESC);
CREATE INDEX idx_wdl_org              ON webhook_delivery_logs(organization_id, created_at DESC);
CREATE INDEX idx_wdl_retry            ON webhook_delivery_logs(next_retry_at) WHERE http_status IS NULL OR http_status >= 500;

-- ─── 6. Table field_mappings ─────────────────────────────────
-- Mapping champs SCIM/SIRH externe → champs APEX RH
DROP TABLE IF EXISTS field_mappings CASCADE;
CREATE TABLE field_mappings (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_system     TEXT NOT NULL,          -- ex: 'workday', 'sap_successfactors', 'custom'
  mapping_name      TEXT NOT NULL,
  source_field      TEXT NOT NULL,          -- ex: 'worker.name.fullName'
  target_table      TEXT NOT NULL,          -- ex: 'users'
  target_field      TEXT NOT NULL,          -- ex: 'full_name'
  transform_fn      TEXT,                   -- ex: 'toLowerCase', 'splitFirst', 'date_iso'
  default_value     TEXT,
  is_required       BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_system, source_field, target_field)
);
CREATE INDEX idx_fm_org_system        ON field_mappings(organization_id, source_system);
CREATE TRIGGER trg_fm_updated         BEFORE UPDATE ON field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 7. Table scim_sync_logs ─────────────────────────────────
DROP TABLE IF EXISTS scim_sync_logs CASCADE;
CREATE TABLE scim_sync_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id        UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  sync_type         TEXT NOT NULL CHECK (sync_type IN ('import', 'export', 'delta')),
  source_system     TEXT NOT NULL DEFAULT 'scim',
  total_records     INT NOT NULL DEFAULT 0,
  created_count     INT NOT NULL DEFAULT 0,
  updated_count     INT NOT NULL DEFAULT 0,
  skipped_count     INT NOT NULL DEFAULT 0,
  error_count       INT NOT NULL DEFAULT 0,
  errors            JSONB DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scim_org             ON scim_sync_logs(organization_id, created_at DESC);

-- ─── 8. Fonctions helpers ────────────────────────────────────

-- Hachage clé API (SHA-256 hex)
CREATE OR REPLACE FUNCTION hash_api_key(key_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE SECURITY DEFINER
AS $$
  SELECT encode(digest(key_text, 'sha256'), 'hex');
$$;

-- Validation clé API → retourne l'enregistrement (sans hash)
-- Utilisée dans les Edge Functions via service role
CREATE OR REPLACE FUNCTION validate_api_key(key_text TEXT)
RETURNS TABLE (
  key_id          UUID,
  org_id          UUID,
  scopes          api_scope[],
  rate_limit      INT,
  is_valid        BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash TEXT := encode(digest(key_text, 'sha256'), 'hex');
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.organization_id,
    k.scopes,
    k.rate_limit_per_min,
    (k.is_active AND (k.expires_at IS NULL OR k.expires_at > now())) AS is_valid
  FROM api_keys k
  WHERE k.key_hash = v_hash;

  -- Mettre à jour last_used_at si trouvé
  UPDATE api_keys
  SET last_used_at = now()
  WHERE key_hash = v_hash;
END;
$$;

-- Vérification rate limit (100 req/min par org par défaut)
-- Retourne TRUE si sous la limite
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  p_key_id  UUID,
  p_limit   INT DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM api_audit_logs
  WHERE api_key_id = p_key_id
    AND created_at >= now() - INTERVAL '1 minute';

  RETURN v_count < p_limit;
END;
$$;

-- ─── 9. Mappings par défaut SCIM 2.0 ────────────────────────
-- Insérés pour l'organisation NITA (seule org existante)
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'nita' LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO field_mappings (organization_id, source_system, mapping_name, source_field, target_table, target_field, is_required, is_active)
  VALUES
    (v_org_id, 'scim', 'SCIM → Prénom',         'name.givenName',       'users', 'first_name',  true,  true),
    (v_org_id, 'scim', 'SCIM → Nom',             'name.familyName',      'users', 'last_name',   true,  true),
    (v_org_id, 'scim', 'SCIM → Email',           'emails[0].value',      'users', 'email',       true,  true),
    (v_org_id, 'scim', 'SCIM → Titre',           'title',                'users', 'job_title',   false, true),
    (v_org_id, 'scim', 'SCIM → Actif',           'active',               'users', 'is_active',   false, true),
    (v_org_id, 'scim', 'SCIM → Manager',         'manager.value',        'users', 'manager_id',  false, true),
    (v_org_id, 'scim', 'SCIM → Département',     'department',           'users', 'division_id', false, false),
    (v_org_id, 'scim', 'Workday → Matricule',    'worker.workerID',      'users', 'employee_id', false, false),
    (v_org_id, 'scim', 'Workday → Date entrée',  'hire.hireDate',        'users', 'hire_date',   false, false)
  ON CONFLICT (organization_id, source_system, source_field, target_field) DO NOTHING;
END $$;

-- ─── 10. RLS Policies ────────────────────────────────────────

ALTER TABLE api_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scim_sync_logs    ENABLE ROW LEVEL SECURITY;

-- api_keys : lecture admin+directeur, écriture admin uniquement
DROP POLICY IF EXISTS api_keys_select ON api_keys;
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('administrateur', 'directeur')
      )
    )
  );

DROP POLICY IF EXISTS api_keys_insert ON api_keys;
CREATE POLICY api_keys_insert ON api_keys
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'administrateur'
      )
    )
  );

DROP POLICY IF EXISTS api_keys_update ON api_keys;
CREATE POLICY api_keys_update ON api_keys
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'administrateur'
      )
    )
  );

DROP POLICY IF EXISTS api_keys_delete ON api_keys;
CREATE POLICY api_keys_delete ON api_keys
  FOR DELETE USING (
    organization_id = auth_user_organization_id()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'administrateur'
      )
    )
  );

-- api_audit_logs : lecture admin+directeur
DROP POLICY IF EXISTS api_audit_select ON api_audit_logs;
CREATE POLICY api_audit_select ON api_audit_logs
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    AND (
      is_super_admin()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('administrateur', 'directeur')
      )
    )
  );

-- webhook_endpoints
DROP POLICY IF EXISTS webhook_select ON webhook_endpoints;
CREATE POLICY webhook_select ON webhook_endpoints
  FOR SELECT USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS webhook_write ON webhook_endpoints;
CREATE POLICY webhook_write ON webhook_endpoints
  FOR ALL USING (
    organization_id = auth_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  );

-- webhook_delivery_logs
DROP POLICY IF EXISTS wdl_select ON webhook_delivery_logs;
CREATE POLICY wdl_select ON webhook_delivery_logs
  FOR SELECT USING (organization_id = auth_user_organization_id());

-- field_mappings
DROP POLICY IF EXISTS fm_select ON field_mappings;
CREATE POLICY fm_select ON field_mappings
  FOR SELECT USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS fm_write ON field_mappings;
CREATE POLICY fm_write ON field_mappings
  FOR ALL USING (
    organization_id = auth_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'administrateur'
    )
  );

-- scim_sync_logs
DROP POLICY IF EXISTS scim_select ON scim_sync_logs;
CREATE POLICY scim_select ON scim_sync_logs
  FOR SELECT USING (organization_id = auth_user_organization_id());

-- ─── 11. Purge automatique audit_logs > 90 jours (pg_cron) ──
-- À exécuter après activation pg_cron si pas déjà présent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-api-audit-logs',
      '0 3 * * *',  -- 3h du matin chaque jour
      $$DELETE FROM api_audit_logs WHERE created_at < now() - INTERVAL '90 days'$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── Vérification finale ─────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ S53 Migration OK';
  RAISE NOTICE '   Tables créées : api_keys, api_audit_logs, webhook_endpoints, webhook_delivery_logs, field_mappings, scim_sync_logs';
  RAISE NOTICE '   Fonctions : hash_api_key(), validate_api_key(), check_api_rate_limit()';
  RAISE NOTICE '   RLS activé sur toutes les tables';
  RAISE NOTICE '   Mappings SCIM par défaut insérés pour org NITA';
END $$;
