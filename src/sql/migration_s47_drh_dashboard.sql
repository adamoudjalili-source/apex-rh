-- ============================================================
-- APEX RH — migration_s47_drh_dashboard.sql
-- Session 47 — Tableau de Bord DRH
-- Vues SQL pour agrégations multi-divisions
-- ⚠️ Colonnes réelles : score_date, score_total, score_delivery, score_quality
-- ============================================================

-- ─── VUE 1 : Résumé mensuel par division ─────────────────────
-- Agrège PULSE + NITA par division × mois
-- Utilisée par useDRHDashboard pour la matrice et les graphiques

CREATE OR REPLACE VIEW v_division_monthly_summary AS
SELECT
  d.id                                                   AS division_id,
  d.name                                                 AS division_name,
  TO_CHAR(ps.score_date::date, 'YYYY-MM')               AS month_key,
  COUNT(DISTINCT u.id)::integer                          AS nb_agents,
  ROUND(AVG(ps.score_total))::integer                    AS avg_pulse,
  ROUND(AVG(ps.score_delivery))::integer                 AS avg_delivery,
  ROUND(AVG(ps.score_quality))::integer                  AS avg_quality,
  COUNT(DISTINCT ps.user_id)::integer                    AS agents_with_pulse
FROM divisions d
JOIN users u
  ON u.division_id = d.id
  AND u.is_active = true
JOIN performance_scores ps
  ON ps.user_id = u.id
  AND ps.score_total IS NOT NULL
GROUP BY
  d.id, d.name,
  TO_CHAR(ps.score_date::date, 'YYYY-MM');

-- ─── VUE 2 : Résumé mensuel NITA par division ────────────────

CREATE OR REPLACE VIEW v_division_nita_monthly AS
SELECT
  d.id                                                   AS division_id,
  d.name                                                 AS division_name,
  TO_CHAR(aal.date::date, 'YYYY-MM')                    AS month_key,
  ROUND(AVG(aal.resilience_score))::integer              AS avg_resilience,
  ROUND(AVG(aal.reliability_score))::integer             AS avg_reliability,
  ROUND(AVG(aal.endurance_score))::integer               AS avg_endurance,
  ROUND(
    AVG(aal.resilience_score)  * 0.35 +
    AVG(aal.reliability_score) * 0.40 +
    AVG(aal.endurance_score)   * 0.25
  )::integer                                             AS avg_nita_composite,
  COUNT(DISTINCT aal.user_id)::integer                   AS agents_with_nita
FROM divisions d
JOIN users u
  ON u.division_id = d.id
  AND u.is_active = true
JOIN agent_activity_logs aal
  ON aal.user_id = u.id
  AND (
    aal.resilience_score  IS NOT NULL OR
    aal.reliability_score IS NOT NULL OR
    aal.endurance_score   IS NOT NULL
  )
GROUP BY
  d.id, d.name,
  TO_CHAR(aal.date::date, 'YYYY-MM');

-- ─── VUE 3 : KPIs globaux courants (tous agents actifs) ──────

CREATE OR REPLACE VIEW v_drh_global_kpis AS
WITH last_month AS (
  SELECT TO_CHAR(
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'),
    'YYYY-MM'
  ) AS mk
),
prev_month AS (
  SELECT TO_CHAR(
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months'),
    'YYYY-MM'
  ) AS mk
),
pulse_cur AS (
  SELECT
    ROUND(AVG(ps.score_total))::integer     AS avg_pulse,
    COUNT(DISTINCT ps.user_id)::integer     AS pulse_agents
  FROM performance_scores ps
  WHERE TO_CHAR(ps.score_date::date, 'YYYY-MM') = (SELECT mk FROM last_month)
    AND ps.score_total IS NOT NULL
),
pulse_prev AS (
  SELECT ROUND(AVG(ps.score_total))::integer AS avg_pulse_prev
  FROM performance_scores ps
  WHERE TO_CHAR(ps.score_date::date, 'YYYY-MM') = (SELECT mk FROM prev_month)
    AND ps.score_total IS NOT NULL
),
nita_cur AS (
  SELECT
    ROUND(AVG(
      aal.resilience_score  * 0.35 +
      aal.reliability_score * 0.40 +
      aal.endurance_score   * 0.25
    ))::integer                              AS avg_nita,
    COUNT(DISTINCT aal.user_id)::integer    AS nita_agents
  FROM agent_activity_logs aal
  WHERE TO_CHAR(aal.date::date, 'YYYY-MM') = (SELECT mk FROM last_month)
),
nita_prev AS (
  SELECT
    ROUND(AVG(
      aal.resilience_score  * 0.35 +
      aal.reliability_score * 0.40 +
      aal.endurance_score   * 0.25
    ))::integer AS avg_nita_prev
  FROM agent_activity_logs aal
  WHERE TO_CHAR(aal.date::date, 'YYYY-MM') = (SELECT mk FROM prev_month)
),
f360 AS (
  SELECT
    COUNT(*)::integer                           AS total_f360,
    COUNT(*) FILTER (WHERE fr.status = 'completed')::integer AS completed_f360,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE fr.status = 'completed') * 100.0 / COUNT(*)
      )::integer
      ELSE 0
    END AS f360_completion_rate
  FROM feedback_requests fr
  WHERE fr.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
),
okr AS (
  SELECT
    COUNT(*)::integer                                    AS total_okr,
    ROUND(AVG(o.progress_score))::integer               AS avg_okr_progress
  FROM objectives o
  WHERE o.status IN ('actif','en_evaluation')
    AND o.progress_score IS NOT NULL
),
eng AS (
  SELECT
    COUNT(DISTINCT sr.respondent_id)::integer AS survey_respondents,
    NULL::integer                             AS avg_engagement
  FROM survey_responses sr
  JOIN engagement_surveys es
    ON es.id = sr.survey_id
  WHERE es.created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
  (SELECT avg_pulse FROM pulse_cur)              AS avg_pulse,
  (SELECT avg_pulse_prev FROM pulse_prev)        AS avg_pulse_prev,
  (SELECT pulse_agents FROM pulse_cur)           AS pulse_agents,
  (SELECT avg_nita FROM nita_cur)                AS avg_nita,
  (SELECT avg_nita_prev FROM nita_prev)          AS avg_nita_prev,
  (SELECT nita_agents FROM nita_cur)             AS nita_agents,
  (SELECT f360_completion_rate FROM f360)        AS f360_rate,
  (SELECT total_f360 FROM f360)                  AS f360_total,
  (SELECT completed_f360 FROM f360)              AS f360_completed,
  (SELECT avg_okr_progress FROM okr)             AS avg_okr_progress,
  (SELECT total_okr FROM okr)                    AS total_okr,
  (SELECT avg_engagement FROM eng)               AS avg_engagement,
  (SELECT survey_respondents FROM eng)           AS survey_respondents,
  (SELECT mk FROM last_month)                    AS reference_month;

-- ─── INDEX performance ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_perf_scores_date_total
  ON performance_scores(score_date, score_total)
  WHERE score_total IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_division_active
  ON users(division_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_aal_date_user
  ON agent_activity_logs(date, user_id);
