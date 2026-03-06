-- ============================================================
-- APEX RH — migration_s52_materialized_views.sql
-- Session 52 — Vues Matérialisées (S46-S48) + pg_cron refresh
--
-- ⚠️  PRÉREQUIS : migration_s52_multitenancy.sql exécuté d'abord
-- ⚠️  PRÉREQUIS : extension pg_cron activée dans Supabase (Dashboard → Extensions)
--
-- Vues matérialisées ciblées (volume > 10K lignes, requêtes lourdes) :
--   - mv_user_nita_monthly        (S46) — NITA agrégé user×mois
--   - mv_user_pulse_monthly       (S46) — PULSE agrégé user×mois
--   - mv_division_monthly_summary (S47) — PULSE/NITA par division×mois
--   - mv_drh_global_kpis          (S47) — KPIs DRH consolidés
--   - mv_direction_scorecard      (S48) — Scorecard stratégique
--   - mv_direction_trend_12m      (S48) — Évolution 12 mois
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. VUES MATÉRIALISÉES S46 — Analytics Prédictifs
-- ══════════════════════════════════════════════════════════════

-- ─── mv_user_nita_monthly ────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_user_nita_monthly CASCADE;
CREATE MATERIALIZED VIEW mv_user_nita_monthly AS
SELECT
  user_id,
  organization_id,
  DATE_TRUNC('month', date::date)::date AS month_start,
  TO_CHAR(date::date, 'YYYY-MM')        AS month_key,
  ROUND(AVG(resilience_score))::integer  AS avg_resilience,
  ROUND(AVG(reliability_score))::integer AS avg_reliability,
  ROUND(AVG(endurance_score))::integer   AS avg_endurance,
  ROUND(
    AVG(resilience_score)  * 0.35 +
    AVG(reliability_score) * 0.40 +
    AVG(endurance_score)   * 0.25
  )::integer AS avg_nita_composite,
  COUNT(*)::integer AS days_logged
FROM agent_activity_logs
WHERE
  resilience_score  IS NOT NULL OR
  reliability_score IS NOT NULL OR
  endurance_score   IS NOT NULL
GROUP BY user_id, organization_id,
         DATE_TRUNC('month', date::date),
         TO_CHAR(date::date, 'YYYY-MM');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_nita_monthly_pk
  ON mv_user_nita_monthly(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_mv_user_nita_monthly_org
  ON mv_user_nita_monthly(organization_id, month_key);

-- ─── mv_user_pulse_monthly ───────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_user_pulse_monthly CASCADE;
CREATE MATERIALIZED VIEW mv_user_pulse_monthly AS
SELECT
  ps.user_id,
  ps.organization_id,
  DATE_TRUNC('month', ps.score_date::date)::date  AS month_start,
  TO_CHAR(ps.score_date::date, 'YYYY-MM')          AS month_key,
  ROUND(AVG(ps.score_total))::integer              AS avg_pulse,
  ROUND(AVG(ps.score_delivery))::integer           AS avg_delivery,
  ROUND(AVG(ps.score_quality))::integer            AS avg_quality,
  COUNT(*)::integer                                AS days_logged
FROM performance_scores ps
WHERE ps.score_total IS NOT NULL
GROUP BY ps.user_id, ps.organization_id,
         DATE_TRUNC('month', ps.score_date::date),
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_pulse_monthly_pk
  ON mv_user_pulse_monthly(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_mv_user_pulse_monthly_org
  ON mv_user_pulse_monthly(organization_id, month_key);

-- ─── mv_user_correlation_monthly ────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_user_correlation_monthly CASCADE;
CREATE MATERIALIZED VIEW mv_user_correlation_monthly AS
SELECT
  p.user_id,
  p.organization_id,
  p.month_key,
  p.avg_pulse,
  p.avg_delivery,
  p.avg_quality,
  n.avg_nita_composite,
  n.avg_resilience,
  n.avg_reliability,
  n.avg_endurance
FROM mv_user_pulse_monthly p
LEFT JOIN mv_user_nita_monthly n
  ON n.user_id = p.user_id AND n.month_key = p.month_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_correlation_monthly_pk
  ON mv_user_correlation_monthly(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_mv_correlation_monthly_org
  ON mv_user_correlation_monthly(organization_id, month_key);

-- ══════════════════════════════════════════════════════════════
-- 2. VUES MATÉRIALISÉES S47 — Tableau de Bord DRH
-- ══════════════════════════════════════════════════════════════

-- ─── mv_division_monthly_summary ─────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_division_monthly_summary CASCADE;
CREATE MATERIALIZED VIEW mv_division_monthly_summary AS
SELECT
  d.id                                                   AS division_id,
  d.name                                                 AS division_name,
  u.organization_id,
  TO_CHAR(ps.score_date::date, 'YYYY-MM')               AS month_key,
  COUNT(DISTINCT u.id)::integer                          AS nb_agents,
  ROUND(AVG(ps.score_total))::integer                    AS avg_pulse,
  ROUND(AVG(ps.score_delivery))::integer                 AS avg_delivery,
  ROUND(AVG(ps.score_quality))::integer                  AS avg_quality,
  COUNT(DISTINCT ps.user_id)::integer                    AS agents_with_pulse
FROM divisions d
JOIN users u
  ON u.division_id = d.id AND u.is_active = TRUE
JOIN performance_scores ps
  ON ps.user_id = u.id AND ps.score_total IS NOT NULL
GROUP BY d.id, d.name, u.organization_id,
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_division_monthly_pk
  ON mv_division_monthly_summary(division_id, month_key);
CREATE INDEX IF NOT EXISTS idx_mv_division_monthly_org
  ON mv_division_monthly_summary(organization_id, month_key);

-- ─── mv_division_nita_monthly ────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_division_nita_monthly CASCADE;
CREATE MATERIALIZED VIEW mv_division_nita_monthly AS
SELECT
  d.id                                                    AS division_id,
  d.name                                                  AS division_name,
  u.organization_id,
  TO_CHAR(aal.date::date, 'YYYY-MM')                     AS month_key,
  ROUND(AVG(aal.resilience_score))::integer               AS avg_resilience,
  ROUND(AVG(aal.reliability_score))::integer              AS avg_reliability,
  ROUND(AVG(aal.endurance_score))::integer                AS avg_endurance,
  ROUND(
    AVG(aal.resilience_score)  * 0.35 +
    AVG(aal.reliability_score) * 0.40 +
    AVG(aal.endurance_score)   * 0.25
  )::integer AS avg_nita_composite,
  COUNT(DISTINCT aal.user_id)::integer                    AS agents_with_nita
FROM divisions d
JOIN users u
  ON u.division_id = d.id AND u.is_active = TRUE
JOIN agent_activity_logs aal
  ON aal.user_id = u.id
GROUP BY d.id, d.name, u.organization_id,
         TO_CHAR(aal.date::date, 'YYYY-MM');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_division_nita_pk
  ON mv_division_nita_monthly(division_id, month_key);
CREATE INDEX IF NOT EXISTS idx_mv_division_nita_org
  ON mv_division_nita_monthly(organization_id, month_key);

-- ─── mv_drh_global_kpis ──────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_drh_global_kpis CASCADE;
CREATE MATERIALIZED VIEW mv_drh_global_kpis AS
SELECT
  u.organization_id,
  TO_CHAR(NOW(), 'YYYY-MM')                              AS month_key,
  COUNT(DISTINCT u.id)::integer                          AS total_actifs,
  ROUND(AVG(ps.score_total))::integer                    AS avg_pulse_global,
  ROUND(AVG(aal.resilience_score * 0.35 +
            aal.reliability_score * 0.40 +
            aal.endurance_score   * 0.25))::integer      AS avg_nita_global,
  COUNT(DISTINCT CASE
    WHEN ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
    THEN ps.user_id END)::integer                        AS agents_actifs_30j,
  COUNT(DISTINCT CASE
    WHEN o.status = 'valide' OR o.status = 'actif'
    THEN o.owner_id END)::integer                        AS agents_okr_on_track
FROM users u
LEFT JOIN performance_scores ps
  ON ps.user_id = u.id
  AND ps.score_date >= CURRENT_DATE - INTERVAL '90 days'
LEFT JOIN agent_activity_logs aal
  ON aal.user_id = u.id
  AND aal.date >= CURRENT_DATE - INTERVAL '90 days'
LEFT JOIN objectives o
  ON o.owner_id = u.id AND o.organization_id = u.organization_id
WHERE u.is_active = TRUE
  AND u.role NOT IN ('administrateur', 'directeur')
GROUP BY u.organization_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_drh_kpis_pk
  ON mv_drh_global_kpis(organization_id, month_key);

-- ══════════════════════════════════════════════════════════════
-- 3. VUES MATÉRIALISÉES S48 — Dashboard Direction
-- ══════════════════════════════════════════════════════════════

-- ─── mv_direction_scorecard ──────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_direction_scorecard CASCADE;
CREATE MATERIALIZED VIEW mv_direction_scorecard AS
WITH current_month AS (
  SELECT
    p.organization_id,
    'pulse'   AS metric_name,
    p.avg_pulse AS current_val,
    LAG(p.avg_pulse) OVER (PARTITION BY p.organization_id ORDER BY p.month_key) AS prev_val,
    p.month_key
  FROM mv_user_pulse_monthly p
  UNION ALL
  SELECT
    n.organization_id,
    'nita'    AS metric_name,
    n.avg_nita_composite AS current_val,
    LAG(n.avg_nita_composite) OVER (PARTITION BY n.organization_id ORDER BY n.month_key) AS prev_val,
    n.month_key
  FROM mv_user_nita_monthly n
)
SELECT
  organization_id,
  metric_name,
  month_key,
  current_val,
  prev_val,
  ROUND(((current_val - prev_val)::numeric / NULLIF(prev_val, 0)) * 100, 1) AS delta_pct,
  CASE
    WHEN current_val >= 75 THEN 'green'
    WHEN current_val >= 55 THEN 'amber'
    ELSE 'red'
  END AS rag_status
FROM current_month
WHERE month_key = TO_CHAR(NOW(), 'YYYY-MM');

CREATE INDEX IF NOT EXISTS idx_mv_direction_scorecard_org
  ON mv_direction_scorecard(organization_id);

-- ─── mv_direction_trend_12m ──────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_direction_trend_12m CASCADE;
CREATE MATERIALIZED VIEW mv_direction_trend_12m AS
SELECT
  p.organization_id,
  p.month_key,
  p.avg_pulse                AS avg_pulse,
  n.avg_nita_composite       AS avg_nita,
  ROUND(AVG(o.progress_score))::integer AS avg_okr_progress,
  COUNT(DISTINCT p.user_id)::integer AS agents_actifs
FROM mv_user_pulse_monthly p
LEFT JOIN mv_user_nita_monthly n
  ON n.user_id = p.user_id AND n.month_key = p.month_key
LEFT JOIN objectives o
  ON o.owner_id = p.user_id AND o.organization_id = p.organization_id
WHERE p.month_key >= TO_CHAR(NOW() - INTERVAL '12 months', 'YYYY-MM')
GROUP BY p.organization_id, p.month_key, p.avg_pulse, n.avg_nita_composite
ORDER BY p.organization_id, p.month_key;

CREATE INDEX IF NOT EXISTS idx_mv_direction_trend_org
  ON mv_direction_trend_12m(organization_id, month_key);

-- ══════════════════════════════════════════════════════════════
-- 4. ALIASES RÉTROCOMPATIBILITÉ (vues ordinaires sur MV)
-- ══════════════════════════════════════════════════════════════
-- Les hooks S46-S48 continuent de référencer les noms d'origine.
-- On remplace les vues ordinaires par des vues alias sur les MV.

-- Drop des vues existantes avant de les recréer comme alias MV
DROP VIEW IF EXISTS v_direction_trend_12m     CASCADE;
DROP VIEW IF EXISTS v_direction_scorecard     CASCADE;
DROP VIEW IF EXISTS v_drh_global_kpis         CASCADE;
DROP VIEW IF EXISTS v_division_nita_monthly   CASCADE;
DROP VIEW IF EXISTS v_division_monthly_summary CASCADE;
DROP VIEW IF EXISTS v_user_correlation_monthly CASCADE;
DROP VIEW IF EXISTS v_user_pulse_monthly      CASCADE;
DROP VIEW IF EXISTS v_user_nita_monthly       CASCADE;

CREATE VIEW v_user_nita_monthly       AS SELECT * FROM mv_user_nita_monthly;
CREATE VIEW v_user_pulse_monthly      AS SELECT * FROM mv_user_pulse_monthly;
CREATE VIEW v_user_correlation_monthly AS SELECT * FROM mv_user_correlation_monthly;
CREATE VIEW v_division_monthly_summary AS SELECT * FROM mv_division_monthly_summary;
CREATE VIEW v_division_nita_monthly   AS SELECT * FROM mv_division_nita_monthly;
CREATE VIEW v_drh_global_kpis         AS SELECT * FROM mv_drh_global_kpis;
CREATE VIEW v_direction_scorecard     AS SELECT * FROM mv_direction_scorecard;
CREATE VIEW v_direction_trend_12m     AS SELECT * FROM mv_direction_trend_12m;

-- ══════════════════════════════════════════════════════════════
-- 5. REFRESH AUTOMATIQUE VIA pg_cron
-- ══════════════════════════════════════════════════════════════
-- ⚠️  Activer d'abord l'extension pg_cron dans Supabase :
--     Dashboard → Database → Extensions → pg_cron → Enable
-- ⚠️  Ces cron jobs tournent dans le schéma "cron"

-- Fonction de refresh centralisée
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Ordre : MV de base d'abord, puis celles qui en dépendent
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_nita_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_pulse_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_correlation_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_division_monthly_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_division_nita_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drh_global_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_direction_scorecard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_direction_trend_12m;
  RAISE NOTICE 'Toutes les vues matérialisées rafraîchies à %', NOW();
END;
$$;

-- Refresh horaire (toutes les heures)
SELECT cron.schedule(
  'refresh-mv-hourly',
  '0 * * * *',
  'SELECT refresh_all_materialized_views()'
);

-- Refresh nocturne complet (minuit, heure Lomé = UTC+0)
SELECT cron.schedule(
  'refresh-mv-nightly',
  '0 0 * * *',
  'SELECT refresh_all_materialized_views()'
);

-- ══════════════════════════════════════════════════════════════
-- VÉRIFICATIONS POST-MIGRATION
-- ══════════════════════════════════════════════════════════════

-- Vérifier les MV créées
-- SELECT schemaname, matviewname, ispopulated FROM pg_matviews;

-- Vérifier les cron jobs
-- SELECT jobname, schedule, command FROM cron.job;

-- Test refresh manuel
-- SELECT refresh_all_materialized_views();

-- Vérifier perf (requête sur MV vs vue ordinaire)
-- EXPLAIN ANALYZE SELECT * FROM mv_division_monthly_summary WHERE organization_id = '...';