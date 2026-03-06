-- ============================================================
-- APEX RH — migration_s48_direction_dashboard.sql
-- Session 48 — Dashboard Direction Générale
-- Vues SQL pour indicateurs stratégiques
-- ⚠️ Colonnes réelles : score_date, score_total, score_delivery, score_quality
-- ============================================================

-- ─── Nouveau rôle 'direction' dans le CHECK constraint ───────
-- Exécuter UNIQUEMENT si la table users a un CHECK sur role
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check
--   CHECK (role IN ('administrateur','directeur','direction','chef_division','chef_service','collaborateur'));

-- ─── VUE 1 : Scorecard stratégique mensuelle ─────────────────
-- KPIs consolidés pour la direction générale

CREATE OR REPLACE VIEW v_direction_scorecard AS
WITH months AS (
  SELECT
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), 'YYYY-MM') AS cur,
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months'), 'YYYY-MM') AS prev,
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '13 months'), 'YYYY-MM') AS year_ago
),
-- PULSE global courant
pulse_cur AS (
  SELECT ROUND(AVG(score_total))::integer AS v
  FROM performance_scores
  WHERE TO_CHAR(score_date::date,'YYYY-MM') = (SELECT cur FROM months)
    AND score_total IS NOT NULL
),
pulse_prev AS (
  SELECT ROUND(AVG(score_total))::integer AS v
  FROM performance_scores
  WHERE TO_CHAR(score_date::date,'YYYY-MM') = (SELECT prev FROM months)
    AND score_total IS NOT NULL
),
pulse_year AS (
  SELECT ROUND(AVG(score_total))::integer AS v
  FROM performance_scores
  WHERE TO_CHAR(score_date::date,'YYYY-MM') = (SELECT year_ago FROM months)
    AND score_total IS NOT NULL
),
-- NITA global courant
nita_cur AS (
  SELECT ROUND(AVG(resilience_score*0.35 + reliability_score*0.40 + endurance_score*0.25))::integer AS v
  FROM agent_activity_logs
  WHERE TO_CHAR(date::date,'YYYY-MM') = (SELECT cur FROM months)
),
nita_prev AS (
  SELECT ROUND(AVG(resilience_score*0.35 + reliability_score*0.40 + endurance_score*0.25))::integer AS v
  FROM agent_activity_logs
  WHERE TO_CHAR(date::date,'YYYY-MM') = (SELECT prev FROM months)
),
-- OKR stratégiques
okr_strat AS (
  SELECT
    COUNT(*)::integer AS total,
    COUNT(*) FILTER (WHERE status = 'valide')::integer AS valides,
    ROUND(AVG(progress_score))::integer AS avg_progress,
    COUNT(*) FILTER (WHERE progress_score >= 70)::integer AS on_track
  FROM objectives
  WHERE level = 'strategique'
    AND status NOT IN ('brouillon','archive')
    AND progress_score IS NOT NULL
),
-- Taux engagement collaborateurs actifs
engagement AS (
  SELECT
    COUNT(DISTINCT u.id)::integer AS total_agents,
    COUNT(DISTINCT ps.user_id)::integer AS agents_actifs,
    CASE WHEN COUNT(DISTINCT u.id) > 0
      THEN ROUND(COUNT(DISTINCT ps.user_id) * 100.0 / COUNT(DISTINCT u.id))::integer
      ELSE 0
    END AS taux_activite
  FROM users u
  LEFT JOIN performance_scores ps
    ON ps.user_id = u.id
    AND TO_CHAR(ps.score_date::date,'YYYY-MM') = (SELECT cur FROM months)
  WHERE u.is_active = true
    AND u.role = 'collaborateur'
),
-- F360 taux complétion
f360 AS (
  SELECT
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE status='completed') * 100.0 / COUNT(*))::integer
      ELSE 0
    END AS completion_rate,
    COUNT(*)::integer AS total
  FROM feedback_requests
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
  (SELECT v FROM pulse_cur)               AS pulse_cur,
  (SELECT v FROM pulse_prev)              AS pulse_prev,
  (SELECT v FROM pulse_year)              AS pulse_year_ago,
  (SELECT v FROM nita_cur)                AS nita_cur,
  (SELECT v FROM nita_prev)               AS nita_prev,
  (SELECT avg_progress FROM okr_strat)    AS okr_progress,
  (SELECT total FROM okr_strat)           AS okr_total,
  (SELECT on_track FROM okr_strat)        AS okr_on_track,
  (SELECT valides FROM okr_strat)         AS okr_valides,
  (SELECT taux_activite FROM engagement)  AS taux_activite,
  (SELECT total_agents FROM engagement)   AS total_agents,
  (SELECT agents_actifs FROM engagement)  AS agents_actifs,
  (SELECT completion_rate FROM f360)      AS f360_rate,
  (SELECT cur FROM months)                AS reference_month;

-- ─── VUE 2 : Évolution mensuelle globale sur 12 mois ─────────

CREATE OR REPLACE VIEW v_direction_trend_12m AS
WITH months_12 AS (
  SELECT
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - (n || ' months')::interval), 'YYYY-MM') AS month_key,
    n AS months_ago
  FROM generate_series(0, 11) AS n
),
pulse_monthly AS (
  SELECT
    TO_CHAR(score_date::date, 'YYYY-MM') AS month_key,
    ROUND(AVG(score_total))::integer      AS avg_pulse,
    ROUND(AVG(score_delivery))::integer   AS avg_delivery,
    ROUND(AVG(score_quality))::integer    AS avg_quality,
    COUNT(DISTINCT user_id)::integer      AS nb_agents
  FROM performance_scores
  WHERE score_total IS NOT NULL
    AND score_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY TO_CHAR(score_date::date, 'YYYY-MM')
),
nita_monthly AS (
  SELECT
    TO_CHAR(date::date, 'YYYY-MM') AS month_key,
    ROUND(AVG(resilience_score*0.35 + reliability_score*0.40 + endurance_score*0.25))::integer AS avg_nita,
    COUNT(DISTINCT user_id)::integer AS nb_agents_nita
  FROM agent_activity_logs
  WHERE date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY TO_CHAR(date::date, 'YYYY-MM')
),
okr_monthly AS (
  SELECT
    TO_CHAR(updated_at::date, 'YYYY-MM') AS month_key,
    ROUND(AVG(progress_score))::integer  AS avg_okr
  FROM objectives
  WHERE level = 'strategique'
    AND status NOT IN ('brouillon','archive')
    AND progress_score IS NOT NULL
  GROUP BY TO_CHAR(updated_at::date, 'YYYY-MM')
)
SELECT
  m.month_key,
  m.months_ago,
  p.avg_pulse,
  p.avg_delivery,
  p.avg_quality,
  p.nb_agents,
  n.avg_nita,
  o.avg_okr
FROM months_12 m
LEFT JOIN pulse_monthly p ON p.month_key = m.month_key
LEFT JOIN nita_monthly  n ON n.month_key = m.month_key
LEFT JOIN okr_monthly   o ON o.month_key = m.month_key
ORDER BY m.month_key ASC;

-- ─── VUE 3 : OKR Stratégiques détaillés ─────────────────────

CREATE OR REPLACE VIEW v_direction_okr_strategiques AS
SELECT
  o.id,
  o.title,
  o.description,
  o.progress_score,
  o.status,
  u.first_name || ' ' || u.last_name AS owner_name,
  u.role AS owner_role,
  d.name AS direction_name,
  CASE
    WHEN o.progress_score >= 70 THEN 'on_track'
    WHEN o.progress_score >= 40 THEN 'at_risk'
    ELSE 'behind'
  END AS health,
  0::integer AS kr_count
FROM objectives o
LEFT JOIN users u ON u.id = o.owner_id
LEFT JOIN directions d ON d.id = u.direction_id
WHERE o.level = 'strategique'
  AND o.status NOT IN ('brouillon', 'archive')
ORDER BY o.progress_score DESC NULLS LAST;

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_objectives_level_status
  ON objectives(level, status)
  WHERE status NOT IN ('brouillon','archive');
