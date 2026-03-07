-- ============================================================
-- APEX RH — Migration S55 : Calibration Multi-niveaux & eNPS Enrichi
-- Session 55 — 07/03/2026
-- FIX v1 : re.cycle_id (pas re.review_cycle_id)
-- FIX v2 : sr.respondent_id (pas sr.user_id)
-- ============================================================

-- ── NETTOYAGE (idempotent) ───────────────────────────────────

DROP VIEW IF EXISTS v_calibration_matrix CASCADE;
DROP VIEW IF EXISTS v_enps_monthly      CASCADE;
DROP VIEW IF EXISTS v_enps_by_cohort    CASCADE;
DROP TABLE IF EXISTS calibration_history   CASCADE;
DROP TABLE IF EXISTS calibration_overrides CASCADE;
DROP TABLE IF EXISTS calibration_sessions  CASCADE;
DROP TABLE IF EXISTS enps_cache            CASCADE;
DROP FUNCTION IF EXISTS compute_enps(UUID) CASCADE;
DROP FUNCTION IF EXISTS refresh_enps_cache() CASCADE;

-- ── ENUMs ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE calibration_status AS ENUM ('open','in_progress','pending_n2','validated','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calibration_level AS ENUM ('n1','n2','hr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLE 1 : calibration_sessions
-- ============================================================

CREATE TABLE calibration_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  review_cycle_id  UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  division_id      UUID REFERENCES divisions(id),
  title            TEXT NOT NULL,
  status           calibration_status NOT NULL DEFAULT 'open',
  initiated_by     UUID REFERENCES users(id),
  validated_by_n2  UUID REFERENCES users(id),
  validated_by_hr  UUID REFERENCES users(id),
  n2_deadline      DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cal_sessions_org   ON calibration_sessions(organization_id);
CREATE INDEX idx_cal_sessions_cycle ON calibration_sessions(review_cycle_id);
CREATE INDEX idx_cal_sessions_div   ON calibration_sessions(division_id);

ALTER TABLE calibration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_sessions_org" ON calibration_sessions
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ============================================================
-- TABLE 2 : calibration_overrides
-- ============================================================

CREATE TABLE calibration_overrides (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calibration_session_id UUID NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  review_evaluation_id   UUID NOT NULL REFERENCES review_evaluations(id) ON DELETE CASCADE,
  level                  calibration_level NOT NULL DEFAULT 'n1',
  original_rating        TEXT,
  calibrated_rating      TEXT,
  delta_score            NUMERIC(4,2),
  justification          TEXT,
  created_by             UUID REFERENCES users(id),
  approved_by            UUID REFERENCES users(id),
  approved_at            TIMESTAMPTZ,
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected')),
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calibration_session_id, review_evaluation_id)
);

CREATE INDEX idx_cal_overrides_session ON calibration_overrides(calibration_session_id);
CREATE INDEX idx_cal_overrides_eval    ON calibration_overrides(review_evaluation_id);
CREATE INDEX idx_cal_overrides_org     ON calibration_overrides(organization_id);

ALTER TABLE calibration_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_overrides_org" ON calibration_overrides
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ============================================================
-- TABLE 3 : calibration_history
-- ============================================================

CREATE TABLE calibration_history (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calibration_session_id UUID NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  review_evaluation_id   UUID REFERENCES review_evaluations(id),
  actor_id               UUID REFERENCES users(id),
  action                 TEXT NOT NULL,
  level                  calibration_level,
  before_value           JSONB,
  after_value            JSONB,
  comment                TEXT,
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cal_history_session ON calibration_history(calibration_session_id);
CREATE INDEX idx_cal_history_org     ON calibration_history(organization_id);

ALTER TABLE calibration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_history_org" ON calibration_history
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ============================================================
-- TABLE 4 : enps_cache
-- ============================================================

CREATE TABLE enps_cache (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  survey_id        UUID REFERENCES engagement_surveys(id),
  month_key        TEXT NOT NULL,
  enps_score       NUMERIC(5,1),
  promoters_count  INT DEFAULT 0,
  passives_count   INT DEFAULT 0,
  detractors_count INT DEFAULT 0,
  total_responses  INT DEFAULT 0,
  response_rate    NUMERIC(5,2),
  benchmark_delta  NUMERIC(5,1),
  cohort_data      JSONB DEFAULT '{}',
  computed_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, month_key)
);

CREATE INDEX idx_enps_cache_org   ON enps_cache(organization_id);
CREATE INDEX idx_enps_cache_month ON enps_cache(month_key);

ALTER TABLE enps_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enps_cache_org" ON enps_cache
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ============================================================
-- VUE 1 : v_calibration_matrix
-- FIX : re.cycle_id (pas re.review_cycle_id)
-- ============================================================

CREATE VIEW v_calibration_matrix AS
SELECT
  re.id                                  AS evaluation_id,
  re.cycle_id                            AS review_cycle_id,
  re.evaluatee_id,
  u.first_name || ' ' || u.last_name     AS collaborateur_name,
  u.organization_id,
  d.name                                 AS division_name,
  s.name                                 AS service_name,
  re.status                              AS eval_status,
  re.overall_rating,
  re.self_answers,
  re.manager_answers,
  re.final_comment,
  re.manager_submitted_at,
  CASE WHEN re.self_answers IS NOT NULL THEN
    ROUND(
      ((COALESCE((re.self_answers->>'quality')::NUMERIC, 0) +
        COALESCE((re.self_answers->>'deadlines')::NUMERIC, 0) +
        COALESCE((re.self_answers->>'communication')::NUMERIC, 0) +
        COALESCE((re.self_answers->>'teamwork')::NUMERIC, 0) +
        COALESCE((re.self_answers->>'initiative')::NUMERIC, 0)) / 5.0)::NUMERIC, 2)
  ELSE NULL END                          AS self_avg_score,
  CASE WHEN re.manager_answers IS NOT NULL THEN
    ROUND(
      ((COALESCE((re.manager_answers->>'quality')::NUMERIC, 0) +
        COALESCE((re.manager_answers->>'deadlines')::NUMERIC, 0) +
        COALESCE((re.manager_answers->>'communication')::NUMERIC, 0) +
        COALESCE((re.manager_answers->>'teamwork')::NUMERIC, 0) +
        COALESCE((re.manager_answers->>'initiative')::NUMERIC, 0)) / 5.0)::NUMERIC, 2)
  ELSE NULL END                          AS manager_avg_score,
  co.id                                  AS override_id,
  co.calibrated_rating,
  co.delta_score,
  co.justification,
  co.status                              AS override_status,
  co.level                               AS override_level,
  co.created_by                          AS override_by,
  cs.id                                  AS calibration_session_id,
  cs.title                               AS session_title,
  cs.status                              AS session_status
FROM review_evaluations re
JOIN users u        ON u.id = re.evaluatee_id
LEFT JOIN services s  ON s.id = u.service_id
LEFT JOIN divisions d ON d.id = u.division_id
LEFT JOIN calibration_overrides co ON co.review_evaluation_id = re.id
LEFT JOIN calibration_sessions  cs ON cs.id = co.calibration_session_id;

-- ============================================================
-- VUE 2 : v_enps_monthly
-- FIX : sr.respondent_id (pas sr.user_id)
-- ============================================================

CREATE VIEW v_enps_monthly AS
WITH monthly_responses AS (
  SELECT
    u.organization_id,
    TO_CHAR(sr.submitted_at, 'YYYY-MM') AS month_key,
    (sr.scores->>'enps')::INT            AS enps_score
  FROM survey_responses sr
  JOIN users u ON u.id = sr.respondent_id
  WHERE sr.scores->>'enps' IS NOT NULL
),
monthly_agg AS (
  SELECT
    organization_id,
    month_key,
    COUNT(*)                                             AS total,
    COUNT(*) FILTER (WHERE enps_score >= 9)             AS promoters,
    COUNT(*) FILTER (WHERE enps_score BETWEEN 7 AND 8)  AS passives,
    COUNT(*) FILTER (WHERE enps_score <= 6)             AS detractors
  FROM monthly_responses
  GROUP BY organization_id, month_key
)
SELECT
  organization_id,
  month_key,
  total                                                              AS total_responses,
  promoters,
  passives,
  detractors,
  ROUND(
    (promoters::NUMERIC/NULLIF(total,0)*100) -
    (detractors::NUMERIC/NULLIF(total,0)*100)
  , 1)                                                              AS enps_score,
  ROUND(promoters::NUMERIC /NULLIF(total,0)*100, 1)                 AS promoters_pct,
  ROUND(passives::NUMERIC  /NULLIF(total,0)*100, 1)                 AS passives_pct,
  ROUND(detractors::NUMERIC/NULLIF(total,0)*100, 1)                 AS detractors_pct
FROM monthly_agg
ORDER BY organization_id, month_key;

-- ============================================================
-- VUE 3 : v_enps_by_cohort
-- FIX : sr.respondent_id (pas sr.user_id)
-- ============================================================

CREATE VIEW v_enps_by_cohort AS
WITH base AS (
  SELECT
    u.organization_id,
    TO_CHAR(sr.submitted_at, 'YYYY-MM') AS month_key,
    (sr.scores->>'enps')::INT            AS enps_score,
    d.name                               AS division_name,
    u.role                               AS user_role,
    CASE
      WHEN EXTRACT(YEAR FROM AGE(NOW(), u.created_at)) < 1 THEN '< 1 an'
      WHEN EXTRACT(YEAR FROM AGE(NOW(), u.created_at)) < 3 THEN '1–3 ans'
      WHEN EXTRACT(YEAR FROM AGE(NOW(), u.created_at)) < 5 THEN '3–5 ans'
      ELSE '5 ans+'
    END AS seniority_bracket
  FROM survey_responses sr
  JOIN users u ON u.id = sr.respondent_id
  LEFT JOIN divisions d ON d.id = u.division_id
  WHERE sr.scores->>'enps' IS NOT NULL
),
agg AS (
  SELECT
    organization_id,
    month_key,
    division_name,
    user_role,
    seniority_bracket,
    COUNT(*)                                  AS total,
    COUNT(*) FILTER (WHERE enps_score >= 9)   AS promoters,
    COUNT(*) FILTER (WHERE enps_score <= 6)   AS detractors
  FROM base
  GROUP BY organization_id, month_key, division_name, user_role, seniority_bracket
)
SELECT
  *,
  ROUND(
    (promoters::NUMERIC/NULLIF(total,0)*100) -
    (detractors::NUMERIC/NULLIF(total,0)*100)
  , 1) AS enps_score
FROM agg;

-- ============================================================
-- FONCTION : compute_enps(survey_id UUID)
-- ============================================================

CREATE OR REPLACE FUNCTION compute_enps(p_survey_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_total         INT;
  v_promoters     INT;
  v_passives      INT;
  v_detractors    INT;
  v_enps          NUMERIC;
  v_total_users   INT;
  v_response_rate NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE (scores->>'enps')::INT >= 9),
    COUNT(*) FILTER (WHERE (scores->>'enps')::INT BETWEEN 7 AND 8),
    COUNT(*) FILTER (WHERE (scores->>'enps')::INT <= 6)
  INTO v_total, v_promoters, v_passives, v_detractors
  FROM survey_responses
  WHERE survey_id = p_survey_id
    AND scores->>'enps' IS NOT NULL;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('enps_score', NULL, 'total', 0, 'error', 'no_enps_data');
  END IF;

  v_enps := ROUND(
    (v_promoters::NUMERIC / v_total * 100) -
    (v_detractors::NUMERIC / v_total * 100)
  , 1);

  SELECT COUNT(*) INTO v_total_users
  FROM users u
  JOIN engagement_surveys es ON es.organization_id = u.organization_id
  WHERE es.id = p_survey_id AND u.is_active = true;

  v_response_rate := CASE WHEN v_total_users > 0
    THEN ROUND(v_total::NUMERIC / v_total_users * 100, 1)
    ELSE 0 END;

  RETURN jsonb_build_object(
    'enps_score',     v_enps,
    'promoters',      v_promoters,
    'passives',       v_passives,
    'detractors',     v_detractors,
    'total',          v_total,
    'promoters_pct',  ROUND(v_promoters::NUMERIC  / v_total * 100, 1),
    'passives_pct',   ROUND(v_passives::NUMERIC   / v_total * 100, 1),
    'detractors_pct', ROUND(v_detractors::NUMERIC / v_total * 100, 1),
    'response_rate',  v_response_rate
  );
END;
$fn$;

-- ============================================================
-- FONCTION : refresh_enps_cache()
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_enps_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT DISTINCT organization_id, month_key
    FROM v_enps_monthly
    WHERE month_key >= TO_CHAR(NOW() - INTERVAL '12 months', 'YYYY-MM')
  LOOP
    INSERT INTO enps_cache (
      organization_id, month_key, enps_score,
      promoters_count, passives_count, detractors_count, total_responses
    )
    SELECT
      v_row.organization_id,
      v_row.month_key,
      enps_score,
      promoters,
      passives,
      detractors,
      total_responses
    FROM v_enps_monthly
    WHERE organization_id = v_row.organization_id
      AND month_key = v_row.month_key
    ON CONFLICT (organization_id, month_key)
    DO UPDATE SET
      enps_score       = EXCLUDED.enps_score,
      promoters_count  = EXCLUDED.promoters_count,
      passives_count   = EXCLUDED.passives_count,
      detractors_count = EXCLUDED.detractors_count,
      total_responses  = EXCLUDED.total_responses,
      computed_at      = now();
  END LOOP;
END;
$fn$;

-- ============================================================
-- pg_cron
-- ============================================================

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('enps-monthly-refresh');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $outer$;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'enps-monthly-refresh',
      '0 4 * * 1',
      'SELECT refresh_enps_cache()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $outer$;

-- ============================================================
-- Calcul initial
-- ============================================================

SELECT refresh_enps_cache();

-- ============================================================
-- TERMINÉ ✅
-- FIX v1 : re.cycle_id (colonne réelle de review_evaluations)
-- FIX v2 : sr.respondent_id (colonne réelle de survey_responses)
-- ============================================================