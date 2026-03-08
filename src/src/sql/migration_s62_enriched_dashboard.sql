-- ============================================================
-- APEX RH — migration_s62_enriched_dashboard.sql
-- Session 62 — Tableau de bord entretiens annuels enrichi
-- MVs : mv_annual_multiyear_trends, mv_annual_division_heatmap,
--        mv_annual_rating_progression
-- Refresh : pg_cron chaque nuit à 3h05
-- ============================================================

-- ─── MV 1 : Tendances multi-années par organisation ──────────
-- Agrégat annuel global : completion, scores moyens, distribution ratings

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_annual_multiyear_trends AS
SELECT
  c.organization_id,
  c.year,
  COUNT(DISTINCT c.id)                                     AS campaigns_count,
  COUNT(r.id)                                              AS total_reviews,
  COUNT(r.id) FILTER (WHERE r.status IN ('completed','signed','archived')) AS completed_count,
  COUNT(r.id) FILTER (WHERE r.status = 'signed')           AS signed_count,
  ROUND(
    COUNT(r.id) FILTER (WHERE r.status IN ('completed','signed','archived'))::numeric
    / NULLIF(COUNT(r.id), 0) * 100, 1
  )                                                        AS completion_rate,
  ROUND(
    COUNT(r.id) FILTER (WHERE r.status = 'signed')::numeric
    / NULLIF(COUNT(r.id), 0) * 100, 1
  )                                                        AS signature_rate,
  -- Score moyen (1-5)
  ROUND(AVG(
    CASE r.overall_rating
      WHEN 'excellent'    THEN 5
      WHEN 'bien'         THEN 4
      WHEN 'satisfaisant' THEN 3
      WHEN 'a_ameliorer'  THEN 2
      WHEN 'insuffisant'  THEN 1
    END
  ) FILTER (WHERE r.overall_rating IS NOT NULL), 2)        AS avg_rating_score,
  -- Distribution ratings
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'excellent')    AS rating_excellent,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'bien')         AS rating_bien,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'satisfaisant') AS rating_satisfaisant,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'a_ameliorer')  AS rating_a_ameliorer,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'insuffisant')  AS rating_insuffisant,
  -- Reco salariales
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'augmentation_merite')    AS aug_merite_count,
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'augmentation_promotion') AS aug_promotion_count,
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'revision_exceptionnelle') AS aug_exceptional_count,
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'maintien')               AS maintien_count,
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'gel')                    AS gel_count,
  ROUND(AVG(r.salary_increase_pct) FILTER (WHERE r.salary_increase_pct > 0), 2) AS avg_increase_pct,
  now()                                                    AS refreshed_at
FROM annual_review_campaigns c
LEFT JOIN annual_reviews r ON r.campaign_id = c.id
GROUP BY c.organization_id, c.year
ORDER BY c.organization_id, c.year;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_annual_multiyear_trends_pk
  ON mv_annual_multiyear_trends(organization_id, year);
CREATE INDEX IF NOT EXISTS idx_mv_annual_multiyear_trends_org
  ON mv_annual_multiyear_trends(organization_id);

-- ─── MV 2 : Heatmap divisions × années ───────────────────────
-- Score moyen et completion rate par division, par an

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_annual_division_heatmap AS
SELECT
  r.organization_id,
  c.year,
  u.division_id,
  d.name                                                    AS division_name,
  COUNT(r.id)                                               AS total_reviews,
  COUNT(r.id) FILTER (WHERE r.status IN ('completed','signed','archived')) AS completed_count,
  ROUND(
    COUNT(r.id) FILTER (WHERE r.status IN ('completed','signed','archived'))::numeric
    / NULLIF(COUNT(r.id), 0) * 100, 1
  )                                                         AS completion_rate,
  ROUND(AVG(
    CASE r.overall_rating
      WHEN 'excellent'    THEN 5
      WHEN 'bien'         THEN 4
      WHEN 'satisfaisant' THEN 3
      WHEN 'a_ameliorer'  THEN 2
      WHEN 'insuffisant'  THEN 1
    END
  ) FILTER (WHERE r.overall_rating IS NOT NULL), 2)         AS avg_rating_score,
  -- % excellents + biens
  ROUND(
    COUNT(r.id) FILTER (WHERE r.overall_rating IN ('excellent','bien'))::numeric
    / NULLIF(COUNT(r.id) FILTER (WHERE r.overall_rating IS NOT NULL), 0) * 100, 1
  )                                                         AS top_performer_pct,
  now()                                                     AS refreshed_at
FROM annual_reviews r
JOIN annual_review_campaigns c ON c.id = r.campaign_id
JOIN users u ON u.id = r.employee_id
LEFT JOIN divisions d ON d.id = u.division_id
WHERE u.division_id IS NOT NULL
GROUP BY r.organization_id, c.year, u.division_id, d.name
ORDER BY r.organization_id, c.year, division_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_annual_division_heatmap_pk
  ON mv_annual_division_heatmap(organization_id, year, division_id);
CREATE INDEX IF NOT EXISTS idx_mv_annual_division_heatmap_org
  ON mv_annual_division_heatmap(organization_id);

-- ─── MV 3 : Progression individuelle (rating par employé × année) ──────
-- Pour sparklines & trajectoires individuelles

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_annual_rating_progression AS
SELECT
  r.employee_id,
  r.organization_id,
  c.year,
  r.overall_rating,
  CASE r.overall_rating
    WHEN 'excellent'    THEN 5
    WHEN 'bien'         THEN 4
    WHEN 'satisfaisant' THEN 3
    WHEN 'a_ameliorer'  THEN 2
    WHEN 'insuffisant'  THEN 1
    ELSE NULL
  END                   AS rating_score,
  r.salary_recommendation,
  r.status,
  u.division_id,
  u.service_id,
  now()                 AS refreshed_at
FROM annual_reviews r
JOIN annual_review_campaigns c ON c.id = r.campaign_id
JOIN users u ON u.id = r.employee_id
WHERE r.status IN ('completed', 'signed', 'archived')
  AND r.overall_rating IS NOT NULL
ORDER BY r.employee_id, c.year;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_annual_rating_progression_pk
  ON mv_annual_rating_progression(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_mv_annual_rating_progression_org_year
  ON mv_annual_rating_progression(organization_id, year);
CREATE INDEX IF NOT EXISTS idx_mv_annual_rating_progression_division
  ON mv_annual_rating_progression(organization_id, division_id, year);

-- ─── FONCTION REFRESH ────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_annual_enriched_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_multiyear_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_division_heatmap;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_rating_progression;
END;
$$;

-- Inclure dans refresh global S60
CREATE OR REPLACE FUNCTION refresh_annual_review_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_campaign_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_review_history;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_multiyear_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_division_heatmap;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_rating_progression;
END;
$$;

-- ─── pg_cron : refresh nightly 3h05 ──────────────────────────

DO $outer$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'refresh-annual-enriched-views-nightly'
  ) INTO job_exists;
  IF NOT job_exists THEN
    PERFORM cron.schedule(
      'refresh-annual-enriched-views-nightly',
      '5 3 * * *',
      $$SELECT refresh_annual_enriched_views();$$
    );
  END IF;
END;
$outer$;

-- ─── RLS : MVs lisibles par membres de l'org ─────────────────

-- mv_annual_multiyear_trends : pas de RLS natif sur MV,
-- accès via views ou fonctions avec filtre org côté app (useAuth)

-- Vérification finale
DO $$
BEGIN
  RAISE NOTICE 'S62 migration OK — MVs: mv_annual_multiyear_trends, mv_annual_division_heatmap, mv_annual_rating_progression';
END;
$$;
