-- ============================================================
-- APEX RH — migration_s66_gestion_temps.sql
-- Session 66 — Gestion des Temps
-- Tables : time_sheets, time_entries, time_clock_events, time_settings
-- ============================================================

-- ─── ACTIVATION EXTENSION ────────────────────────────────────
-- (pg_cron et uuid-ossp déjà activés)

-- ─── 1. time_settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hours_per_day         NUMERIC(4,2) NOT NULL DEFAULT 8,
  hours_per_week        NUMERIC(5,2) NOT NULL DEFAULT 40,
  overtime_threshold    NUMERIC(5,2) NOT NULL DEFAULT 40,
  work_days             INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- ─── 2. time_sheets ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_sheets (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start                DATE NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','submitted','manager_approved','hr_approved','rejected')),
  total_hours               NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_hours            NUMERIC(6,2) NOT NULL DEFAULT 0,
  submitted_at              TIMESTAMPTZ,
  manager_approved_by       UUID REFERENCES users(id),
  manager_approved_at       TIMESTAMPTZ,
  hr_approved_by            UUID REFERENCES users(id),
  hr_approved_at            TIMESTAMPTZ,
  rejection_reason          TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id, week_start)
);

-- ─── 3. time_entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id    UUID NOT NULL REFERENCES time_sheets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  hours           NUMERIC(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  entry_type      TEXT NOT NULL DEFAULT 'regular'
                    CHECK (entry_type IN ('regular','overtime','project','task')),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. time_clock_events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_clock_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL
                    CHECK (event_type IN ('clock_in','clock_out','break_start','break_end')),
  event_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  device_info     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEX ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_time_sheets_org_user    ON time_sheets(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_time_sheets_org_status  ON time_sheets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_time_sheets_week        ON time_sheets(organization_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_sheet      ON time_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date  ON time_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_clock_user         ON time_clock_events(organization_id, user_id, event_at DESC);

-- ─── TRIGGERS updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_time_sheets_updated_at') THEN
    CREATE TRIGGER set_time_sheets_updated_at
      BEFORE UPDATE ON time_sheets FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_time_settings_updated_at') THEN
    CREATE TRIGGER set_time_settings_updated_at
      BEFORE UPDATE ON time_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

-- ─── TRIGGER : recalculer total_hours à chaque entrée ─────────
CREATE OR REPLACE FUNCTION trig_recalc_timesheet_hours()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total NUMERIC(6,2);
  v_threshold NUMERIC(5,2) := 40;
  v_sheet_id UUID;
BEGIN
  v_sheet_id := COALESCE(NEW.timesheet_id, OLD.timesheet_id);

  SELECT COALESCE(SUM(hours), 0)
    INTO v_total
    FROM time_entries
   WHERE timesheet_id = v_sheet_id;

  SELECT COALESCE(ts.overtime_threshold, 40)
    INTO v_threshold
    FROM time_sheets tsh
    LEFT JOIN time_settings ts ON ts.organization_id = tsh.organization_id
   WHERE tsh.id = v_sheet_id;

  UPDATE time_sheets
     SET total_hours    = v_total,
         overtime_hours = GREATEST(0, v_total - v_threshold),
         updated_at     = NOW()
   WHERE id = v_sheet_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trig_time_entries_recalc ON time_entries;
CREATE TRIGGER trig_time_entries_recalc
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION trig_recalc_timesheet_hours();

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE time_sheets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_settings      ENABLE ROW LEVEL SECURITY;

-- time_settings : lecture org, écriture admin
DROP POLICY IF EXISTS "time_settings_select" ON time_settings;
CREATE POLICY "time_settings_select" ON time_settings
  FOR SELECT USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "time_settings_admin" ON time_settings;
CREATE POLICY "time_settings_admin" ON time_settings
  FOR ALL USING (organization_id = auth_user_organization_id());

-- time_sheets : collaborateur voit les siennes, manager/RH voit l'org
DROP POLICY IF EXISTS "time_sheets_select" ON time_sheets;
CREATE POLICY "time_sheets_select" ON time_sheets
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','direction','chef_division','chef_service')
    )
  );

DROP POLICY IF EXISTS "time_sheets_insert" ON time_sheets;
CREATE POLICY "time_sheets_insert" ON time_sheets
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "time_sheets_update" ON time_sheets;
CREATE POLICY "time_sheets_update" ON time_sheets
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','direction','chef_division','chef_service')
    )
  );

-- time_entries
DROP POLICY IF EXISTS "time_entries_select" ON time_entries;
CREATE POLICY "time_entries_select" ON time_entries
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','direction','chef_division','chef_service')
    )
  );

DROP POLICY IF EXISTS "time_entries_insert" ON time_entries;
CREATE POLICY "time_entries_insert" ON time_entries
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "time_entries_update" ON time_entries;
CREATE POLICY "time_entries_update" ON time_entries
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "time_entries_delete" ON time_entries;
CREATE POLICY "time_entries_delete" ON time_entries
  FOR DELETE USING (
    organization_id = auth_user_organization_id()
    AND user_id = auth.uid()
  );

-- time_clock_events
DROP POLICY IF EXISTS "time_clock_select" ON time_clock_events;
CREATE POLICY "time_clock_select" ON time_clock_events
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','direction','chef_division','chef_service')
    )
  );

DROP POLICY IF EXISTS "time_clock_insert" ON time_clock_events;
CREATE POLICY "time_clock_insert" ON time_clock_events
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    AND user_id = auth.uid()
  );

-- ─── RPC : stats hebdomadaires ────────────────────────────────
CREATE OR REPLACE FUNCTION get_time_stats(
  p_org_id  UUID,
  p_user_id UUID DEFAULT NULL,
  p_from    DATE DEFAULT (DATE_TRUNC('month', CURRENT_DATE))::DATE,
  p_to      DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  week_start    DATE,
  user_id       UUID,
  total_hours   NUMERIC,
  overtime_hours NUMERIC,
  status        TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    ts.week_start,
    ts.user_id,
    ts.total_hours,
    ts.overtime_hours,
    ts.status
  FROM time_sheets ts
  WHERE ts.organization_id = p_org_id
    AND (p_user_id IS NULL OR ts.user_id = p_user_id)
    AND ts.week_start BETWEEN p_from AND p_to
  ORDER BY ts.week_start DESC, ts.user_id;
$$;

-- ─── ACTIVER LE MODULE ────────────────────────────────────────
UPDATE app_settings
   SET modules = modules || '{"gestion_temps_enabled": true}'::jsonb
 WHERE organization_id IS NOT NULL;

-- ─── INSÉRER time_settings PAR DÉFAUT pour chaque org ─────────
INSERT INTO time_settings (organization_id)
SELECT id FROM organizations
WHERE id NOT IN (SELECT organization_id FROM time_settings)
ON CONFLICT DO NOTHING;
