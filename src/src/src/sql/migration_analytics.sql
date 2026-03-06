-- ============================================================
-- APEX RH — Migration Session 33 — Analytics Avancés & Prédictif
-- AUCUNE nouvelle table — uniquement des vues SQL pour agrégations
-- Feature flag : analytics_enabled dans app_settings.modules
-- ============================================================

-- ─── VUE 1 : SCORES PULSE MENSUELS PAR UTILISATEUR ──────────
-- Agrège les scores journaliers par user et par mois
-- Utilisée pour la heatmap équipe et la corrélation PULSE/OKR
CREATE OR REPLACE VIEW v_pulse_monthly_scores AS
SELECT
  ps.user_id,
  TO_CHAR(ps.score_date, 'YYYY-MM')          AS month_key,
  DATE_TRUNC('month', ps.score_date)::date   AS month_start,
  ROUND(AVG(ps.total_score)::numeric, 1)     AS avg_score,
  ROUND(AVG(ps.delivery_score)::numeric, 1)  AS avg_delivery,
  ROUND(AVG(ps.quality_score)::numeric, 1)   AS avg_quality,
  ROUND(AVG(ps.regularity_score)::numeric, 1)AS avg_regularity,
  ROUND(AVG(ps.bonus_score)::numeric, 1)     AS avg_bonus,
  COUNT(*)                                   AS days_count,
  MIN(ps.total_score)                        AS min_score,
  MAX(ps.total_score)                        AS max_score
FROM performance_scores ps
WHERE ps.score_period = 'daily'
GROUP BY
  ps.user_id,
  DATE_TRUNC('month', ps.score_date),
  TO_CHAR(ps.score_date, 'YYYY-MM');

-- ─── VUE 2 : MOYENNE PULSE PAR SERVICE ET PAR MOIS ──────────
-- Agrège les scores par service pour la comparaison inter-services
CREATE OR REPLACE VIEW v_service_monthly_pulse AS
SELECT
  u.service_id,
  TO_CHAR(ps.score_date, 'YYYY-MM')          AS month_key,
  DATE_TRUNC('month', ps.score_date)::date   AS month_start,
  ROUND(AVG(ps.total_score)::numeric, 1)     AS avg_score,
  ROUND(AVG(ps.delivery_score)::numeric, 1)  AS avg_delivery,
  ROUND(AVG(ps.quality_score)::numeric, 1)   AS avg_quality,
  ROUND(AVG(ps.regularity_score)::numeric, 1)AS avg_regularity,
  COUNT(DISTINCT ps.user_id)                 AS active_users,
  COUNT(*)                                   AS total_days
FROM performance_scores ps
JOIN users u ON u.id = ps.user_id
WHERE ps.score_period = 'daily'
  AND u.service_id IS NOT NULL
GROUP BY
  u.service_id,
  DATE_TRUNC('month', ps.score_date),
  TO_CHAR(ps.score_date, 'YYYY-MM');

-- ─── VUE 3 : RÉSUMÉ OKR INDIVIDUEL ──────────────────────────
-- Taux de completion et progression moyenne par utilisateur
CREATE OR REPLACE VIEW v_user_okr_summary AS
SELECT
  o.owner_id                                          AS user_id,
  COUNT(o.id)                                         AS total_objectives,
  ROUND(AVG(o.progress)::numeric, 1)                  AS avg_progress,
  COUNT(CASE WHEN o.status = 'completed'    THEN 1 END) AS completed_count,
  COUNT(CASE WHEN o.status = 'on_track'     THEN 1 END) AS on_track_count,
  COUNT(CASE WHEN o.status = 'at_risk'      THEN 1 END) AS at_risk_count,
  COUNT(CASE WHEN o.status = 'off_track'    THEN 1 END) AS off_track_count,
  COUNT(CASE WHEN o.status = 'not_started'  THEN 1 END) AS not_started_count
FROM objectives o
WHERE o.level = 'individual'
GROUP BY o.owner_id;

-- ─── VUE 4 : TENDANCE PULSE SUR 3 MOIS (pour calcul risque) ─
-- Compare le score du mois courant vs 3 mois avant
-- Un score décroissant sur 3 mois consécutifs = signal de risque
CREATE OR REPLACE VIEW v_pulse_trend_3m AS
WITH monthly AS (
  SELECT
    user_id,
    month_key,
    month_start,
    avg_score,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY month_start DESC) AS rn
  FROM v_pulse_monthly_scores
)
SELECT
  m1.user_id,
  m1.avg_score  AS score_m0,   -- mois le plus récent
  m2.avg_score  AS score_m1,   -- il y a 1 mois
  m3.avg_score  AS score_m2,   -- il y a 2 mois
  -- Variation : positif = amélioration, négatif = dégradation
  ROUND((COALESCE(m1.avg_score, 0) - COALESCE(m3.avg_score, m1.avg_score, 0))::numeric, 1) AS trend_delta,
  -- Tendance : declining si les 3 mois décroissants
  CASE
    WHEN m1.avg_score IS NOT NULL AND m2.avg_score IS NOT NULL AND m3.avg_score IS NOT NULL
      AND m1.avg_score < m2.avg_score AND m2.avg_score < m3.avg_score
    THEN true
    ELSE false
  END AS is_consistently_declining
FROM monthly m1
LEFT JOIN monthly m2 ON m2.user_id = m1.user_id AND m2.rn = 2
LEFT JOIN monthly m3 ON m3.user_id = m1.user_id AND m3.rn = 3
WHERE m1.rn = 1;

-- ─── FEATURE FLAG : ajouter analytics_enabled dans modules ──
-- Ajout sécurisé : ne modifie pas les valeurs existantes
UPDATE app_settings
SET value = (value::jsonb || '{"analytics_enabled": false}'::jsonb)
WHERE key = 'modules'
  AND NOT (value::jsonb ? 'analytics_enabled');

-- ─── GRANT SELECT sur les vues ───────────────────────────────
-- Les vues héritent les RLS des tables sources automatiquement
-- pas besoin de RLS supplémentaire sur les vues
GRANT SELECT ON v_pulse_monthly_scores  TO authenticated;
GRANT SELECT ON v_service_monthly_pulse TO authenticated;
GRANT SELECT ON v_user_okr_summary      TO authenticated;
GRANT SELECT ON v_pulse_trend_3m        TO authenticated;
