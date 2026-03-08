-- ============================================================
-- APEX RH — Migration Session 37
-- API NITA + Profil Performance Multi-Dimensionnel
-- Exécuter dans : Supabase → SQL Editor
-- ============================================================

-- ─── 1. Table agent_activity_logs ───────────────────────────
CREATE TABLE IF NOT EXISTS agent_activity_logs (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES users(id) ON DELETE CASCADE,
  date                  date NOT NULL,

  -- Données brutes NITA
  nb_transactions       integer DEFAULT 0,
  avg_processing_time_s numeric(8,2) DEFAULT 0,   -- secondes
  error_rate            numeric(5,4) DEFAULT 0,    -- 0.0000 → 1.0000 (ex: 0.0250 = 2.5%)
  amount_processed      numeric(15,2) DEFAULT 0,   -- FCFA

  -- Contexte journée (fourni par API NITA ou calculé)
  is_peak_day           boolean DEFAULT false,      -- jour marché / fin de mois / strong load
  shift_duration_hours  numeric(4,1) DEFAULT 8,     -- durée réelle du shift
  transaction_complexity numeric(3,2) DEFAULT 1.0,  -- 0.5 (simple) → 2.0 (complexe)

  -- Scores opérationnels calculés (0-100)
  resilience_score      integer,    -- performance pendant pics de transactions
  reliability_score     integer,    -- taux erreur/rejets pondéré par complexité
  endurance_score       integer,    -- maintien qualité sur shifts longs

  -- Meta
  synced_at             timestamptz DEFAULT now(),
  source                text DEFAULT 'api_nita',   -- 'api_nita' | 'manual' | 'seed'

  UNIQUE(user_id, date)
);

-- ─── 2. Index ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aal_user_date
  ON agent_activity_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_aal_date
  ON agent_activity_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_aal_peak
  ON agent_activity_logs(is_peak_day) WHERE is_peak_day = true;

-- ─── 3. RLS ──────────────────────────────────────────────────
ALTER TABLE agent_activity_logs ENABLE ROW LEVEL SECURITY;

-- Collaborateurs : voient uniquement leurs propres logs
CREATE POLICY "aal_self_read" ON agent_activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- Managers et admin : voient tous les logs de leur périmètre
CREATE POLICY "aal_manager_read" ON agent_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
    )
  );

-- Seulement les Edge Functions (service_role) peuvent insérer/mettre à jour
CREATE POLICY "aal_service_write" ON agent_activity_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 4. Vue mensuelle ────────────────────────────────────────
CREATE OR REPLACE VIEW v_agent_activity_monthly AS
SELECT
  user_id,
  date_trunc('month', date)::date                    AS month,
  COUNT(*)                                           AS days_logged,
  ROUND(AVG(nb_transactions))                        AS avg_transactions_day,
  SUM(nb_transactions)                               AS total_transactions,
  ROUND(AVG(avg_processing_time_s)::numeric, 1)      AS avg_processing_time_s,
  ROUND((AVG(error_rate) * 100)::numeric, 2)         AS avg_error_rate_pct,
  SUM(amount_processed)                              AS total_amount_processed,
  COUNT(*) FILTER (WHERE is_peak_day)                AS peak_days_count,
  ROUND(AVG(resilience_score))                       AS avg_resilience,
  ROUND(AVG(reliability_score))                      AS avg_reliability,
  ROUND(AVG(endurance_score))                        AS avg_endurance,
  ROUND((
    COALESCE(AVG(resilience_score), 0) * 0.35 +
    COALESCE(AVG(reliability_score), 0) * 0.40 +
    COALESCE(AVG(endurance_score), 0) * 0.25
  ))                                                 AS activite_score
FROM agent_activity_logs
GROUP BY user_id, date_trunc('month', date)::date;

-- ─── 5. Vue hebdomadaire (pour alertes peak) ─────────────────
CREATE OR REPLACE VIEW v_agent_activity_weekly AS
SELECT
  user_id,
  date_trunc('week', date)::date                     AS week_start,
  COUNT(*)                                           AS days_logged,
  ROUND(AVG(nb_transactions))                        AS avg_transactions,
  ROUND((AVG(error_rate) * 100)::numeric, 2)         AS avg_error_rate_pct,
  ROUND(AVG(resilience_score))                       AS avg_resilience,
  ROUND(AVG(reliability_score))                      AS avg_reliability,
  ROUND(AVG(endurance_score))                        AS avg_endurance
FROM agent_activity_logs
GROUP BY user_id, date_trunc('week', date)::date;

-- ─── 6. Fonction utilitaire : calcul des 3 scores ────────────
-- Cette fonction est utilisée par l'Edge Function sync-nita-activity
CREATE OR REPLACE FUNCTION compute_nita_scores(
  p_nb_transactions       integer,
  p_avg_processing_time_s numeric,
  p_error_rate            numeric,
  p_is_peak_day           boolean,
  p_shift_duration_hours  numeric,
  p_transaction_complexity numeric,
  -- Benchmarks service (valeurs par défaut NITA)
  p_bench_transactions    integer  DEFAULT 150,
  p_bench_processing_time numeric  DEFAULT 45,
  p_bench_error_rate      numeric  DEFAULT 0.02
)
RETURNS TABLE(resilience_score integer, reliability_score integer, endurance_score integer)
LANGUAGE plpgsql AS $$
DECLARE
  v_resilience  numeric := 0;
  v_reliability numeric := 0;
  v_endurance   numeric := 0;
  v_peak_bonus  numeric := 1.0;
BEGIN
  -- ── Resilience : perf pendant pics ───────────────────────
  -- Base : ratio transactions réalisées vs benchmark
  -- Bonus si jour pic (×1.2 pour tenir compte de la pression)
  IF p_is_peak_day THEN v_peak_bonus := 1.2; END IF;

  v_resilience := LEAST(
    (p_nb_transactions::numeric / NULLIF(p_bench_transactions, 0)) * 100 * v_peak_bonus,
    100
  );

  -- ── Reliability : erreurs pondérées par complexité ────────
  -- Taux erreur pondéré : moins de marge pour transactions complexes
  -- 0 erreur = 100, taux max acceptable = 5% = score 0
  DECLARE v_weighted_error numeric;
  BEGIN
    v_weighted_error := p_error_rate * p_transaction_complexity;
    v_reliability := GREATEST(
      100 - (v_weighted_error / 0.05) * 100,
      0
    );
  END;

  -- ── Endurance : maintien qualité sur shifts longs ─────────
  -- Ratio temps de traitement réel vs benchmark
  -- Pénalité si shift > 9h (fatigue = ralentissement attendu)
  DECLARE v_time_ratio numeric; v_fatigue_factor numeric;
  BEGIN
    v_time_ratio     := p_bench_processing_time / NULLIF(p_avg_processing_time_s, 0);
    v_fatigue_factor := CASE WHEN p_shift_duration_hours > 9 THEN 0.92 ELSE 1.0 END;
    v_endurance      := LEAST(v_time_ratio * 100 * v_fatigue_factor, 100);
    v_endurance      := GREATEST(v_endurance, 0);
  END;

  RETURN QUERY SELECT
    ROUND(v_resilience)::integer,
    ROUND(v_reliability)::integer,
    ROUND(v_endurance)::integer;
END;
$$;

-- ─── 7. Données de démonstration (seed) ──────────────────────
-- À exécuter UNIQUEMENT en développement pour visualiser les nouvelles fonctionnalités
-- Remplacez les UUIDs par de vrais IDs d'utilisateurs de votre base

/*
-- Exemple avec un utilisateur fictif :
INSERT INTO agent_activity_logs (user_id, date, nb_transactions, avg_processing_time_s,
  error_rate, amount_processed, is_peak_day, shift_duration_hours, transaction_complexity,
  resilience_score, reliability_score, endurance_score, source)
SELECT
  u.id,
  generate_series::date,
  FLOOR(100 + random() * 120)::integer,
  30 + random() * 30,
  random() * 0.04,
  FLOOR(500000 + random() * 1500000)::numeric,
  (EXTRACT(DOW FROM generate_series) IN (1, 5) OR EXTRACT(DAY FROM generate_series) > 25),
  7.5 + random() * 2,
  0.8 + random() * 0.8,
  FLOOR(60 + random() * 40)::integer,
  FLOOR(65 + random() * 35)::integer,
  FLOOR(55 + random() * 45)::integer,
  'seed'
FROM users u,
     generate_series(
       date_trunc('month', now()) - interval '3 months',
       now()::date,
       '1 day'::interval
     ) generate_series
WHERE u.role = 'collaborateur'
  AND EXTRACT(DOW FROM generate_series) BETWEEN 1 AND 5
ON CONFLICT (user_id, date) DO NOTHING;
*/

-- ─── 8. Grant sur la vue ─────────────────────────────────────
GRANT SELECT ON v_agent_activity_monthly TO authenticated;
GRANT SELECT ON v_agent_activity_weekly  TO authenticated;

COMMENT ON TABLE agent_activity_logs IS
  'Logs activité NITA par agent et par jour. Alimenté par Edge Function sync-nita-activity (toutes les heures). Contient les 3 scores opérationnels NITA : résilience, fiabilité, endurance.';
