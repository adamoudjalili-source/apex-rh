-- ============================================================
-- APEX RH — S82 : Intelligence RH — Bilan social + turnover
-- ============================================================

-- ─── 1. ENUM types ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE departure_reason AS ENUM (
    'resignation','dismissal','end_of_contract','retirement',
    'mutual_agreement','death','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE departure_type AS ENUM (
    'voluntary','involuntary','natural'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. TABLE employee_departures ────────────────────────────
CREATE TABLE IF NOT EXISTS employee_departures (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departure_date   date NOT NULL,
  reason           departure_reason NOT NULL DEFAULT 'other',
  type             departure_type   NOT NULL DEFAULT 'voluntary',
  rehirable        boolean NOT NULL DEFAULT false,
  notes            text,
  registered_by    uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_departures_user
  ON employee_departures(user_id);

CREATE INDEX IF NOT EXISTS idx_employee_departures_org
  ON employee_departures(organization_id);

CREATE INDEX IF NOT EXISTS idx_employee_departures_date
  ON employee_departures(organization_id, departure_date);

-- RLS
ALTER TABLE employee_departures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation_departures" ON employee_departures;
CREATE POLICY "org_isolation_departures" ON employee_departures
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- ─── 3. MV mv_headcount_stats ────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_headcount_stats CASCADE;
CREATE MATERIALIZED VIEW mv_headcount_stats AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', now() - interval '24 months'),
    date_trunc('month', now()),
    '1 month'::interval
  )::date AS month_start
),
departures_agg AS (
  SELECT
    organization_id,
    date_trunc('month', departure_date)::date AS dep_month,
    COUNT(*) AS departed_count
  FROM employee_departures
  GROUP BY organization_id, dep_month
),
active_users AS (
  SELECT
    u.organization_id,
    m.month_start,
    COUNT(DISTINCT u.id) AS headcount,
    COUNT(DISTINCT CASE WHEN u.role = 'collaborateur' THEN u.id END) AS collaborateurs,
    COUNT(DISTINCT CASE WHEN u.role IN ('chef_service','chef_division') THEN u.id END) AS managers,
    COUNT(DISTINCT CASE WHEN u.role IN ('administrateur','directeur') THEN u.id END) AS direction
  FROM users u
  CROSS JOIN months m
  LEFT JOIN employee_departures ed ON ed.user_id = u.id AND ed.departure_date < m.month_start
  WHERE ed.id IS NULL -- still active at that month
  GROUP BY u.organization_id, m.month_start
)
SELECT
  au.organization_id,
  au.month_start,
  au.headcount,
  au.collaborateurs,
  au.managers,
  au.direction,
  COALESCE(da.departed_count, 0) AS departed_count
FROM active_users au
LEFT JOIN departures_agg da
  ON da.organization_id = au.organization_id
 AND da.dep_month = au.month_start;

CREATE INDEX IF NOT EXISTS idx_mv_headcount_org_month
  ON mv_headcount_stats(organization_id, month_start);

REVOKE ALL ON mv_headcount_stats FROM anon, authenticated;

-- ─── 4. MV mv_turnover_stats ─────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_turnover_stats CASCADE;
CREATE MATERIALIZED VIEW mv_turnover_stats AS
WITH monthly_base AS (
  SELECT
    ed.organization_id,
    date_trunc('month', ed.departure_date)::date AS dep_month,
    ed.reason::text AS reason,
    ed.type::text   AS departure_type,
    ed.rehirable,
    COUNT(*) AS cnt
  FROM employee_departures ed
  GROUP BY ed.organization_id, date_trunc('month', ed.departure_date)::date,
           ed.reason::text, ed.type::text, ed.rehirable
),
org_headcount AS (
  SELECT organization_id, COUNT(*) AS total_active
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM employee_departures ed WHERE ed.user_id = u.id
  )
  GROUP BY organization_id
)
SELECT
  mb.organization_id,
  mb.dep_month,
  mb.reason,
  mb.departure_type,
  mb.rehirable,
  mb.cnt AS departure_count,
  oh.total_active,
  ROUND(
    (mb.cnt::numeric / NULLIF(oh.total_active, 0)) * 100,
    2
  ) AS turnover_rate_pct
FROM monthly_base mb
LEFT JOIN org_headcount oh USING (organization_id);

CREATE INDEX IF NOT EXISTS idx_mv_turnover_org_month
  ON mv_turnover_stats(organization_id, dep_month);

REVOKE ALL ON mv_turnover_stats FROM anon, authenticated;

-- ─── 5. MV mv_absenteeism_stats ──────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_absenteeism_stats CASCADE;
CREATE MATERIALIZED VIEW mv_absenteeism_stats AS
WITH monthly_leaves AS (
  SELECT
    lr.organization_id,
    date_trunc('month', lr.start_date)::date AS absence_month,
    lr.leave_type_id AS leave_type,
    COUNT(*)                                  AS request_count,
    SUM(lr.days_count)                     AS total_days
  FROM leave_requests lr
  WHERE lr.status = 'approved'
  GROUP BY lr.organization_id,
           date_trunc('month', lr.start_date)::date,
           lr.leave_type_id
),
org_working_days AS (
  -- Approximation : 22 jours ouvrables/mois
  SELECT
    organization_id,
    COUNT(*) AS headcount,
    COUNT(*) * 22 AS total_working_days_month
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM employee_departures ed WHERE ed.user_id = u.id
  )
  GROUP BY organization_id
)
SELECT
  ml.organization_id,
  ml.absence_month,
  ml.leave_type,
  ml.request_count,
  ml.total_days,
  owd.headcount,
  owd.total_working_days_month,
  ROUND(
    (ml.total_days::numeric / NULLIF(owd.total_working_days_month, 0)) * 100,
    2
  ) AS absenteeism_rate_pct
FROM monthly_leaves ml
LEFT JOIN org_working_days owd USING (organization_id);

CREATE INDEX IF NOT EXISTS idx_mv_absenteeism_org_month
  ON mv_absenteeism_stats(organization_id, absence_month);

REVOKE ALL ON mv_absenteeism_stats FROM anon, authenticated;

-- ─── 6. RPC get_social_report ────────────────────────────────
CREATE OR REPLACE FUNCTION get_social_report(p_org_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_caller_org uuid;
BEGIN
  -- Security: verify caller belongs to this org
  SELECT organization_id INTO v_caller_org
  FROM users WHERE id = auth.uid();

  IF v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    -- Effectifs courants
    'total_headcount', (
      SELECT COUNT(*) FROM users u
      WHERE u.organization_id = p_org_id
        AND NOT EXISTS (SELECT 1 FROM employee_departures ed WHERE ed.user_id = u.id)
    ),
    -- Répartition par rôle
    'by_role', (
      SELECT jsonb_object_agg(role::text, cnt)
      FROM (
        SELECT role::text, COUNT(*) AS cnt
        FROM users u
        WHERE u.organization_id = p_org_id
          AND NOT EXISTS (SELECT 1 FROM employee_departures ed WHERE ed.user_id = u.id)
        GROUP BY role::text
      ) r
    ),
    -- Départs dans l'année
    'departures_year', (
      SELECT COUNT(*) FROM employee_departures ed
      JOIN users u ON u.id = ed.user_id
      WHERE u.organization_id = p_org_id
        AND EXTRACT(year FROM ed.departure_date) = p_year
    ),
    -- Départs par motif
    'departures_by_reason', (
      SELECT jsonb_object_agg(reason::text, cnt)
      FROM (
        SELECT ed.reason::text, COUNT(*) AS cnt
        FROM employee_departures ed
        JOIN users u ON u.id = ed.user_id
        WHERE u.organization_id = p_org_id
          AND EXTRACT(year FROM ed.departure_date) = p_year
        GROUP BY ed.reason::text
      ) r
    ),
    -- Taux turnover annuel
    'annual_turnover_rate', (
      SELECT ROUND(
        (COUNT(ed.*)::numeric / NULLIF((
          SELECT COUNT(*) FROM users u2
          WHERE u2.organization_id = p_org_id
        ), 0)) * 100,
        2
      )
      FROM employee_departures ed
      JOIN users u ON u.id = ed.user_id
      WHERE u.organization_id = p_org_id
        AND EXTRACT(year FROM ed.departure_date) = p_year
    ),
    -- Absentéisme annuel (jours)
    'total_absence_days', (
      SELECT COALESCE(SUM(lr.days_count), 0)
      FROM leave_requests lr
      WHERE lr.organization_id = p_org_id
        AND lr.status = 'approved'
        AND EXTRACT(year FROM lr.start_date) = p_year
    ),
    -- Masse salariale
    'salary_mass', (
      SELECT COALESCE(SUM(cr.salary_amount * 12), 0)
      FROM compensation_records cr
      JOIN users u ON u.id = cr.employee_id
      WHERE u.organization_id = p_org_id
        AND cr.is_current = true
    ),
    -- Salaire moyen
    'avg_salary', (
      SELECT COALESCE(AVG(cr.salary_amount), 0)
      FROM compensation_records cr
      JOIN users u ON u.id = cr.employee_id
      WHERE u.organization_id = p_org_id
        AND cr.is_current = true
    ),
    'year', p_year,
    'generated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ─── 7. Refresh functions ─────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_headcount_stats_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_headcount_stats;
  REFRESH MATERIALIZED VIEW mv_turnover_stats;
  REFRESH MATERIALIZED VIEW mv_absenteeism_stats;
END;
$$;

-- ─── 8. Updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_departures_updated_at ON employee_departures;
CREATE TRIGGER trg_departures_updated_at
  BEFORE UPDATE ON employee_departures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();