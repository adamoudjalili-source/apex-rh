-- ============================================================
-- APEX RH — migration_s46_predictive_analytics.sql
-- Session 46 — Analytics Prédictifs Avancés
-- Vues SQL pour corrélations NITA ↔ PULSE ↔ F360
-- ============================================================

-- ─── VUE 1 : Scores NITA agrégés par user × mois ────────────
-- Calcule les moyennes mensuelles des 3 scores NITA par utilisateur
-- Utilisée par le hook useCorrelationData pour les scatter plots

CREATE OR REPLACE VIEW v_user_nita_monthly AS
SELECT
  user_id,
  DATE_TRUNC('month', date::date)::date AS month_start,
  TO_CHAR(date::date, 'YYYY-MM') AS month_key,
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
GROUP BY user_id, DATE_TRUNC('month', date::date), TO_CHAR(date::date, 'YYYY-MM');

-- ─── VUE 2 : Scores PULSE agrégés par user × mois ───────────
-- Regroupe les scores PULSE journaliers en moyennes mensuelles

CREATE OR REPLACE VIEW v_user_pulse_monthly AS
SELECT
  user_id,
  DATE_TRUNC('month', date::date)::date AS month_start,
  TO_CHAR(date::date, 'YYYY-MM') AS month_key,
  ROUND(AVG(delivery_score))::integer AS avg_delivery,
  ROUND(AVG(quality_score))::integer  AS avg_quality,
  ROUND(AVG(total))::integer          AS avg_total,
  COUNT(*)::integer AS days_logged
FROM performance_scores
WHERE total IS NOT NULL
GROUP BY user_id, DATE_TRUNC('month', date::date), TO_CHAR(date::date, 'YYYY-MM');

-- ─── VUE 3 : Tableau de bord corrélations par utilisateur ───
-- Joint NITA + PULSE par user×mois pour analyses de corrélation
-- Les colonnes f360_* sont calculées séparément côté frontend
-- (la table feedback_responses n'a pas de colonne date directe)

CREATE OR REPLACE VIEW v_user_correlation_monthly AS
SELECT
  COALESCE(n.user_id, p.user_id) AS user_id,
  COALESCE(n.month_key, p.month_key) AS month_key,
  n.avg_resilience,
  n.avg_reliability,
  n.avg_endurance,
  n.avg_nita_composite,
  n.days_logged AS nita_days,
  p.avg_delivery,
  p.avg_quality,
  p.avg_total AS avg_pulse,
  p.days_logged AS pulse_days
FROM v_user_nita_monthly n
FULL OUTER JOIN v_user_pulse_monthly p
  ON n.user_id = p.user_id AND n.month_key = p.month_key
WHERE
  n.avg_nita_composite IS NOT NULL OR
  p.avg_total IS NOT NULL;

-- ─── VUE 4 : Tendances 3 mois NITA (complément de v_pulse_trend_3m) ─
-- Étend la vue existante avec les scores NITA pour analyses prédictives

CREATE OR REPLACE VIEW v_nita_trend_3m AS
WITH monthly AS (
  SELECT
    user_id,
    month_key,
    avg_nita_composite,
    avg_resilience,
    avg_reliability,
    avg_endurance,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY month_key DESC) AS rn
  FROM v_user_nita_monthly
)
SELECT
  user_id,
  MAX(CASE WHEN rn = 1 THEN avg_nita_composite END) AS score_m0,
  MAX(CASE WHEN rn = 2 THEN avg_nita_composite END) AS score_m1,
  MAX(CASE WHEN rn = 3 THEN avg_nita_composite END) AS score_m2,
  MAX(CASE WHEN rn = 1 THEN avg_resilience END)     AS res_m0,
  MAX(CASE WHEN rn = 1 THEN avg_reliability END)    AS rel_m0,
  MAX(CASE WHEN rn = 1 THEN avg_endurance END)      AS end_m0,
  -- Variation score composite M0 - M2
  COALESCE(
    MAX(CASE WHEN rn = 1 THEN avg_nita_composite END) -
    MAX(CASE WHEN rn = 3 THEN avg_nita_composite END),
    0
  ) AS trend_delta,
  -- Indicateur de déclin : 3 mois consécutifs en baisse
  CASE WHEN
    MAX(CASE WHEN rn = 1 THEN avg_nita_composite END) <
    MAX(CASE WHEN rn = 2 THEN avg_nita_composite END)
    AND
    MAX(CASE WHEN rn = 2 THEN avg_nita_composite END) <
    MAX(CASE WHEN rn = 3 THEN avg_nita_composite END)
  THEN TRUE ELSE FALSE END AS is_consistently_declining
FROM monthly
WHERE rn <= 3
GROUP BY user_id;

-- ─── RLS : appliquer les politiques sur les nouvelles vues ───
-- Les vues héritent des politiques RLS des tables sous-jacentes
-- (agent_activity_logs et performance_scores ont déjà RLS activé)
-- Aucune politique supplémentaire nécessaire pour ces vues

-- ─── INDEX de performance ────────────────────────────────────
-- Accélérer les requêtes de corrélation sur agent_activity_logs

CREATE INDEX IF NOT EXISTS idx_agent_activity_logs_user_date
  ON agent_activity_logs (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_performance_scores_user_date
  ON performance_scores (user_id, date DESC);

-- Index composite pour les jointures fréquentes S46
CREATE INDEX IF NOT EXISTS idx_agent_activity_logs_date_scores
  ON agent_activity_logs (date, user_id)
  WHERE resilience_score IS NOT NULL
     OR reliability_score IS NOT NULL
     OR endurance_score IS NOT NULL;

-- ─── COMMENTAIRES ────────────────────────────────────────────

COMMENT ON VIEW v_user_nita_monthly IS
  'S46 — Moyenne mensuelle des scores NITA (résilience, fiabilité, endurance) par utilisateur';

COMMENT ON VIEW v_user_pulse_monthly IS
  'S46 — Moyenne mensuelle des scores PULSE (delivery, quality, total) par utilisateur';

COMMENT ON VIEW v_user_correlation_monthly IS
  'S46 — Vue consolidée NITA + PULSE par user×mois pour analyses de corrélation prédictive';

COMMENT ON VIEW v_nita_trend_3m IS
  'S46 — Tendance NITA sur 3 mois par utilisateur, avec indicateur de déclin consécutif';
