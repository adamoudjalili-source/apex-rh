-- ============================================================
-- APEX RH — migration_s67_conges.sql
-- Session 67 — Congés & Absences
-- Tables : leave_types, leave_balances, leave_requests,
--          leave_request_comments, leave_settings
-- ============================================================

-- ─── 1. LEAVE_TYPES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  code               TEXT NOT NULL,
  color              TEXT NOT NULL DEFAULT '#6366F1',
  max_days           NUMERIC,
  requires_attachment BOOLEAN NOT NULL DEFAULT false,
  is_paid            BOOLEAN NOT NULL DEFAULT true,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id);

-- ─── 2. LEAVE_BALANCES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id    UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year             INT NOT NULL,
  initial_days     NUMERIC NOT NULL DEFAULT 0,
  used_days        NUMERIC NOT NULL DEFAULT 0,
  pending_days     NUMERIC NOT NULL DEFAULT 0,
  carried_over     NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_org  ON leave_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(user_id, year);

-- ─── 3. LEAVE_REQUESTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id       UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  days_count          NUMERIC NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','manager_approved','hr_approved','rejected')),
  reason              TEXT,
  attachment_url      TEXT,
  manager_approved_by UUID REFERENCES users(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approved_by      UUID REFERENCES users(id),
  hr_approved_at      TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org    ON leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user   ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates  ON leave_requests(start_date, end_date);

-- ─── 4. LEAVE_REQUEST_COMMENTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_request_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_comments_request ON leave_request_comments(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_comments_org     ON leave_request_comments(organization_id);

-- ─── 5. LEAVE_SETTINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  cp_days_per_year     NUMERIC NOT NULL DEFAULT 25,
  rtt_days_per_year    NUMERIC NOT NULL DEFAULT 10,
  carry_over_max       NUMERIC NOT NULL DEFAULT 5,
  carry_over_deadline  DATE,
  work_days            INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. TRIGGERS updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_leave_types_updated_at') THEN
    CREATE TRIGGER set_leave_types_updated_at
      BEFORE UPDATE ON leave_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_leave_balances_updated_at') THEN
    CREATE TRIGGER set_leave_balances_updated_at
      BEFORE UPDATE ON leave_balances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_leave_requests_updated_at') THEN
    CREATE TRIGGER set_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_leave_settings_updated_at') THEN
    CREATE TRIGGER set_leave_settings_updated_at
      BEFORE UPDATE ON leave_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── 7. TRIGGER : recalc pending_days sur leave_balances ──────
-- Quand une demande change de statut, pending_days est recalculé
CREATE OR REPLACE FUNCTION recalc_leave_balance_pending()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year INT;
BEGIN
  -- Recalcul sur l'ancienne ligne si UPDATE
  IF TG_OP = 'UPDATE' AND OLD.user_id IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM OLD.start_date)::INT;
    UPDATE leave_balances
    SET pending_days = COALESCE((
      SELECT SUM(days_count) FROM leave_requests
      WHERE user_id = OLD.user_id
        AND leave_type_id = OLD.leave_type_id
        AND EXTRACT(YEAR FROM start_date) = v_year
        AND status = 'submitted'
    ), 0),
    used_days = COALESCE((
      SELECT SUM(days_count) FROM leave_requests
      WHERE user_id = OLD.user_id
        AND leave_type_id = OLD.leave_type_id
        AND EXTRACT(YEAR FROM start_date) = v_year
        AND status IN ('manager_approved','hr_approved')
    ), 0)
    WHERE user_id = OLD.user_id
      AND leave_type_id = OLD.leave_type_id
      AND year = v_year;
  END IF;

  -- Recalcul sur la nouvelle ligne
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.user_id IS NOT NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.start_date)::INT;
    UPDATE leave_balances
    SET pending_days = COALESCE((
      SELECT SUM(days_count) FROM leave_requests
      WHERE user_id = NEW.user_id
        AND leave_type_id = NEW.leave_type_id
        AND EXTRACT(YEAR FROM start_date) = v_year
        AND status = 'submitted'
    ), 0),
    used_days = COALESCE((
      SELECT SUM(days_count) FROM leave_requests
      WHERE user_id = NEW.user_id
        AND leave_type_id = NEW.leave_type_id
        AND EXTRACT(YEAR FROM start_date) = v_year
        AND status IN ('manager_approved','hr_approved')
    ), 0)
    WHERE user_id = NEW.user_id
      AND leave_type_id = NEW.leave_type_id
      AND year = v_year;
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_leave_requests_recalc') THEN
    CREATE TRIGGER trig_leave_requests_recalc
      AFTER INSERT OR UPDATE OR DELETE ON leave_requests
      FOR EACH ROW EXECUTE FUNCTION recalc_leave_balance_pending();
  END IF;
END $$;

-- ─── 8. RLS ───────────────────────────────────────────────────
ALTER TABLE leave_types             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_request_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_settings          ENABLE ROW LEVEL SECURITY;

-- Helpers (déjà créés en S66 — sécurisé par SECURITY DEFINER)
-- current_user_role() et auth_user_organization_id() sont supposés existants

-- ── leave_types ───
DROP POLICY IF EXISTS "leave_types_select" ON leave_types;
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT
  USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "leave_types_insert" ON leave_types;
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT
  WITH CHECK (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

DROP POLICY IF EXISTS "leave_types_update" ON leave_types;
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE
  USING (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

DROP POLICY IF EXISTS "leave_types_delete" ON leave_types;
CREATE POLICY "leave_types_delete" ON leave_types FOR DELETE
  USING (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

-- ── leave_balances ───
DROP POLICY IF EXISTS "leave_balances_select" ON leave_balances;
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT
  USING (organization_id = auth_user_organization_id()
    AND (user_id = auth.uid()
      OR current_user_role() IN ('administrateur','directeur','chef_division','chef_service')));

DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT
  WITH CHECK (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

DROP POLICY IF EXISTS "leave_balances_update" ON leave_balances;
CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE
  USING (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

-- ── leave_requests ───
DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
  USING (organization_id = auth_user_organization_id()
    AND (user_id = auth.uid()
      OR current_user_role() IN ('administrateur','directeur','chef_division','chef_service')));

DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT
  WITH CHECK (organization_id = auth_user_organization_id()
    AND user_id = auth.uid());

DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
  USING (organization_id = auth_user_organization_id()
    AND (user_id = auth.uid()
      OR current_user_role() IN ('administrateur','directeur','chef_division','chef_service')));

DROP POLICY IF EXISTS "leave_requests_delete" ON leave_requests;
CREATE POLICY "leave_requests_delete" ON leave_requests FOR DELETE
  USING (organization_id = auth_user_organization_id()
    AND user_id = auth.uid()
    AND status = 'draft');

-- ── leave_request_comments ───
DROP POLICY IF EXISTS "leave_comments_select" ON leave_request_comments;
CREATE POLICY "leave_comments_select" ON leave_request_comments FOR SELECT
  USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "leave_comments_insert" ON leave_request_comments;
CREATE POLICY "leave_comments_insert" ON leave_request_comments FOR INSERT
  WITH CHECK (organization_id = auth_user_organization_id()
    AND user_id = auth.uid());

-- ── leave_settings ───
DROP POLICY IF EXISTS "leave_settings_select" ON leave_settings;
CREATE POLICY "leave_settings_select" ON leave_settings FOR SELECT
  USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "leave_settings_update" ON leave_settings;
CREATE POLICY "leave_settings_update" ON leave_settings FOR UPDATE
  USING (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

DROP POLICY IF EXISTS "leave_settings_insert" ON leave_settings;
CREATE POLICY "leave_settings_insert" ON leave_settings FOR INSERT
  WITH CHECK (organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur'));

-- ─── 9. DONNÉES PAR DÉFAUT — Types de congés ──────────────────
-- Insère les 5 types standard pour chaque org existante
INSERT INTO leave_types (organization_id, name, code, color, max_days, requires_attachment, is_paid)
SELECT
  o.id,
  t.name, t.code, t.color, t.max_days, t.requires_attachment, t.is_paid
FROM organizations o
CROSS JOIN (VALUES
  ('Congés payés',          'CP',        '#10B981', 25,   false, true),
  ('RTT',                   'RTT',       '#3B82F6', 10,   false, true),
  ('Maladie / Arrêt',       'MALADIE',   '#EF4444', NULL, true,  false),
  ('Maternité / Paternité', 'PARENTALE', '#8B5CF6', 90,   false, true),
  ('Sans solde',            'CSS',       '#6B7280', NULL, false, false)
) AS t(name, code, color, max_days, requires_attachment, is_paid)
WHERE o.is_active = true
ON CONFLICT (organization_id, code) DO NOTHING;

-- Insère leave_settings par défaut pour chaque org
INSERT INTO leave_settings (organization_id)
SELECT id FROM organizations WHERE is_active = true
ON CONFLICT (organization_id) DO NOTHING;

-- ─── 10. ACTIVATION MODULE ────────────────────────────────────
UPDATE app_settings
SET value = value || '{"conges_enabled": true}'::jsonb
WHERE key = 'modules';

-- ─── 11. NOTIFICATIONS : index supplémentaire ─────────────────
-- Pour les notifications de type congé
CREATE INDEX IF NOT EXISTS idx_notifications_conges
  ON notifications(user_id, type)
  WHERE type LIKE 'leave_%';
