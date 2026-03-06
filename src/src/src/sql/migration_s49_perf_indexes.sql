-- ============================================================
-- APEX RH — migration_s49_perf_indexes.sql
-- Session 49 — Quick Win QW4 : Index sur colonnes date
-- Contexte : les filtres WHERE TO_CHAR(date,'YYYY-MM') bloquent
--   l'utilisation des index B-tree standard → index d'expression
-- ============================================================

-- ─── Index 1 : performance_scores.score_date ─────────────────
-- Utilisé dans toutes les vues v_direction_*, v_drh_*, v_pulse_*
-- Sans cet index, chaque aggrégation mensuelle fait un full scan

CREATE INDEX IF NOT EXISTS idx_perf_scores_month
  ON performance_scores (TO_CHAR(score_date::date, 'YYYY-MM'));

-- Index complémentaire pour les requêtes par date + user
CREATE INDEX IF NOT EXISTS idx_perf_scores_user_date
  ON performance_scores (user_id, score_date DESC);

-- ─── Index 2 : agent_activity_logs.date ──────────────────────
-- Utilisé dans v_user_nita_monthly, v_division_nita_monthly,
-- v_direction_scorecard, et tous les hooks NITA

CREATE INDEX IF NOT EXISTS idx_nita_logs_month
  ON agent_activity_logs (TO_CHAR(date::date, 'YYYY-MM'));

-- Index complémentaire pour les requêtes par agent + date
CREATE INDEX IF NOT EXISTS idx_nita_logs_agent_date
  ON agent_activity_logs (agent_email, date DESC);

-- ─── Index 3 : objectives (status + level) ───────────────────
-- Utilisé dans v_direction_okr_strategiques et v_user_okr_summary

CREATE INDEX IF NOT EXISTS idx_objectives_status_level
  ON objectives (status, level)
  WHERE status != 'archive';

-- ─── Index 4 : survey_responses (scores JSONB) ───────────────
-- Pour les requêtes de type jsonb_object_keys sur le champ scores

CREATE INDEX IF NOT EXISTS idx_survey_responses_evaluated
  ON survey_responses (evaluated_id);

-- ─── Vérification ────────────────────────────────────────────
-- Après exécution, vérifier avec :
-- SELECT indexname, tablename FROM pg_indexes
--   WHERE indexname LIKE 'idx_%'
--   ORDER BY tablename, indexname;
