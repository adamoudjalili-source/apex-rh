-- ============================================================
-- APEX RH — Migration Session 75
-- Onboarding — Parcours progressif automatisé
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- ─── 1. ENUMs ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE onboarding_assignee_type AS ENUM ('self','manager','rh');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboarding_step_status AS ENUM ('pending','in_progress','completed','skipped','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboarding_step_category AS ENUM (
    'administrative','equipment','access','training','meeting','documentation','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. onboarding_templates ─────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id   uuid        REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name              text        NOT NULL,
  description       text,
  target_role       text,
  target_department text,
  is_active         boolean     DEFAULT true,
  created_by        uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_templates_read"  ON onboarding_templates;
DROP POLICY IF EXISTS "onboarding_templates_write" ON onboarding_templates;

CREATE POLICY "onboarding_templates_read" ON onboarding_templates
  FOR SELECT USING (organization_id = auth_user_organization_id());

CREATE POLICY "onboarding_templates_write" ON onboarding_templates
  FOR ALL USING (
    organization_id = auth_user_organization_id()
    AND (SELECT role::text FROM users WHERE id = auth.uid()) IN ('admin','rh')
  );

-- ─── 3. onboarding_steps ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     uuid        REFERENCES onboarding_templates(id) ON DELETE CASCADE NOT NULL,
  order_index     integer     NOT NULL DEFAULT 0,
  title           text        NOT NULL,
  description     text,
  due_day_offset  integer     NOT NULL DEFAULT 1,
  assignee_type   onboarding_assignee_type DEFAULT 'self',
  is_required     boolean     DEFAULT true,
  category        onboarding_step_category DEFAULT 'other',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_steps_read"  ON onboarding_steps;
DROP POLICY IF EXISTS "onboarding_steps_write" ON onboarding_steps;

CREATE POLICY "onboarding_steps_read" ON onboarding_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM onboarding_templates t
      WHERE t.id = onboarding_steps.template_id
      AND t.organization_id = auth_user_organization_id()
    )
  );

CREATE POLICY "onboarding_steps_write" ON onboarding_steps
  FOR ALL USING (
    (SELECT role::text FROM users WHERE id = auth.uid()) IN ('admin','rh')
    AND EXISTS (
      SELECT 1 FROM onboarding_templates t
      WHERE t.id = onboarding_steps.template_id
      AND t.organization_id = auth_user_organization_id()
    )
  );

-- ─── 4. onboarding_assignments ───────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_assignments (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id         uuid        REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  template_id     uuid        REFERENCES onboarding_templates(id) ON DELETE RESTRICT NOT NULL,
  start_date      date        NOT NULL DEFAULT CURRENT_DATE,
  assigned_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  status          text        DEFAULT 'active',
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, template_id)
);

ALTER TABLE onboarding_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_assignments_select" ON onboarding_assignments;
DROP POLICY IF EXISTS "onboarding_assignments_write"  ON onboarding_assignments;

-- SELECT : soi-même OU manager/rh/admin de la même org
CREATE POLICY "onboarding_assignments_select" ON onboarding_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      organization_id = auth_user_organization_id()
      AND (SELECT role::text FROM users WHERE id = auth.uid()) IN ('admin','rh','manager','direction')
    )
  );

-- ALL (insert/update/delete) : admin/rh uniquement
CREATE POLICY "onboarding_assignments_write" ON onboarding_assignments
  FOR ALL USING (
    organization_id = auth_user_organization_id()
    AND (SELECT role::text FROM users WHERE id = auth.uid()) IN ('admin','rh')
  );

-- ─── 5. onboarding_step_completions ──────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_step_completions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id   uuid        REFERENCES onboarding_assignments(id) ON DELETE CASCADE NOT NULL,
  step_id         uuid        REFERENCES onboarding_steps(id) ON DELETE CASCADE NOT NULL,
  user_id         uuid        REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status          onboarding_step_status DEFAULT 'pending',
  completed_at    timestamptz,
  comment         text,
  completed_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(assignment_id, step_id)
);

ALTER TABLE onboarding_step_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_completions_select" ON onboarding_step_completions;
DROP POLICY IF EXISTS "onboarding_completions_self"   ON onboarding_step_completions;
DROP POLICY IF EXISTS "onboarding_completions_write"  ON onboarding_step_completions;

-- SELECT : soi-même OU manager/admin de la même org
CREATE POLICY "onboarding_completions_select" ON onboarding_step_completions
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      (SELECT role::text FROM users WHERE id = auth.uid()) IN ('admin','rh','manager','direction')
      AND (
        SELECT organization_id FROM users WHERE id = onboarding_step_completions.user_id
      ) = auth_user_organization_id()
    )
  );

-- INSERT/UPDATE : le collaborateur lui-même ou admin/rh
CREATE POLICY "onboarding_completions_write" ON onboarding_step_completions
  FOR ALL USING (
    user_id = auth.uid()
    OR (
      (SELECT role::text FROM users WHERE id = auth.uid()) IN ('admin','rh')
      AND (
        SELECT organization_id FROM users WHERE id = onboarding_step_completions.user_id
      ) = auth_user_organization_id()
    )
  );

-- ─── 6. MV mv_onboarding_progress ────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_onboarding_progress;
CREATE MATERIALIZED VIEW mv_onboarding_progress AS
SELECT
  oa.id                                                              AS assignment_id,
  oa.organization_id,
  oa.user_id,
  oa.template_id,
  oa.start_date,
  oa.status                                                          AS assignment_status,
  u.first_name || ' ' || u.last_name  AS user_name,
  u.role::text                                                       AS user_role,
  t.name                                                             AS template_name,
  t.target_role,
  t.target_department,
  COUNT(s.id)                                                        AS total_steps,
  COUNT(sc.id) FILTER (WHERE sc.status::text = 'completed')         AS completed_steps,
  COUNT(sc.id) FILTER (WHERE sc.status::text = 'overdue')           AS overdue_steps,
  ROUND(
    COUNT(sc.id) FILTER (WHERE sc.status::text = 'completed')::numeric
    / NULLIF(COUNT(s.id), 0) * 100
  )                                                                   AS completion_pct,
  MAX(sc.updated_at)                                                  AS last_activity
FROM onboarding_assignments oa
JOIN users u ON u.id = oa.user_id
JOIN onboarding_templates t ON t.id = oa.template_id
LEFT JOIN onboarding_steps s ON s.template_id = oa.template_id
LEFT JOIN onboarding_step_completions sc
       ON sc.step_id = s.id AND sc.assignment_id = oa.id
GROUP BY
  oa.id, oa.organization_id, oa.user_id, oa.template_id, oa.start_date, oa.status,
  u.first_name, u.last_name, u.role,
  t.name, t.target_role, t.target_department;

REVOKE ALL ON mv_onboarding_progress FROM anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_onboarding_progress_pk      ON mv_onboarding_progress(assignment_id);
CREATE INDEX        IF NOT EXISTS idx_mv_onboarding_progress_org     ON mv_onboarding_progress(organization_id);
CREATE INDEX        IF NOT EXISTS idx_mv_onboarding_progress_user    ON mv_onboarding_progress(user_id);

-- ─── 7. Fonction refresh ─────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_onboarding_mvs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_onboarding_progress;
END;
$$;

-- ─── 8. Index tables ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_org        ON onboarding_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_template       ON onboarding_steps(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_onboarding_assignments_user     ON onboarding_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_assignments_org      ON onboarding_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completions_assign   ON onboarding_step_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completions_user     ON onboarding_step_completions(user_id);

-- ─── 9. Trigger updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE tname text;
BEGIN
  FOR tname IN SELECT unnest(ARRAY[
    'onboarding_templates','onboarding_steps',
    'onboarding_assignments','onboarding_step_completions'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tname, tname, tname, tname
    );
  END LOOP;
END $$;