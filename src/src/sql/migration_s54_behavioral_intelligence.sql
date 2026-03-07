-- ============================================================
-- APEX RH — migration_s54_behavioral_intelligence.sql
-- Session 54 — Behavioral Intelligence Engine
--
-- Livrables :
--   1. Table attrition_risk_scores    — scores de risque départ par user
--   2. Table behavioral_alerts        — alertes auto managers
--   3. Table career_predictions       — prédictions trajectoire carrière
--   4. Vue v_attrition_risk           — calcul agrégé multi-facteurs
--   5. Vue v_career_opportunity       — matching postes × profil
--   6. Fonction compute_attrition_risk() — logique de scoring
--   7. Fonction refresh_behavioral_scores() — maj périodique
--   8. pg_cron job — refresh hebdomadaire
--
-- ENUMS valides rappel :
--   objectives.status  : brouillon | actif | en_evaluation | valide | archive
--   objectives.level   : strategique | division | service | individuel
--   users.role         : administrateur | directeur | chef_division | chef_service | collaborateur
-- ============================================================

-- ─── 1. TABLE attrition_risk_scores ──────────────────────────
DROP TABLE IF EXISTS attrition_risk_scores CASCADE;
CREATE TABLE attrition_risk_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Score global 0-100 (100 = risque maximal)
  risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_level          TEXT NOT NULL DEFAULT 'low'
                        CHECK (risk_level IN ('low','medium','high','critical')),

  -- Scores par facteur (0-100 chacun)
  factor_pulse        NUMERIC(5,2) DEFAULT 0,   -- Tendance PULSE (30%)
  factor_feedback     NUMERIC(5,2) DEFAULT 0,   -- Score F360 (20%)
  factor_okr          NUMERIC(5,2) DEFAULT 0,   -- Progress OKR (20%)
  factor_seniority    NUMERIC(5,2) DEFAULT 0,   -- Ancienneté inversée (15%)
  factor_activity     NUMERIC(5,2) DEFAULT 0,   -- Inactivité NITA (15%)

  -- Contexte
  trend_direction     TEXT DEFAULT 'stable'
                        CHECK (trend_direction IN ('improving','stable','declining','critical_decline')),
  alert_sent          BOOLEAN DEFAULT FALSE,
  alert_sent_at       TIMESTAMPTZ,
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  notes               TEXT,

  UNIQUE(user_id)
);

CREATE INDEX idx_attrition_risk_org   ON attrition_risk_scores(organization_id);
CREATE INDEX idx_attrition_risk_level ON attrition_risk_scores(risk_level);
CREATE INDEX idx_attrition_risk_score ON attrition_risk_scores(risk_score DESC);

-- RLS
ALTER TABLE attrition_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attrition_risk_select" ON attrition_risk_scores
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

CREATE POLICY "attrition_risk_insert" ON attrition_risk_scores
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

CREATE POLICY "attrition_risk_update" ON attrition_risk_scores
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

-- ─── 2. TABLE behavioral_alerts ──────────────────────────────
DROP TABLE IF EXISTS behavioral_alerts CASCADE;
CREATE TABLE behavioral_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- collaborateur concerné
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL, -- manager destinataire

  alert_type      TEXT NOT NULL
                    CHECK (alert_type IN (
                      'attrition_risk',
                      'performance_decline',
                      'okr_stagnation',
                      'feedback_gap',
                      'activity_drop',
                      'career_plateau'
                    )),
  severity        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('info','medium','high','critical')),
  title           TEXT NOT NULL,
  message         TEXT,
  risk_score      NUMERIC(5,2),

  -- Statut
  is_read         BOOLEAN DEFAULT FALSE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_behavioral_alerts_org     ON behavioral_alerts(organization_id);
CREATE INDEX idx_behavioral_alerts_manager ON behavioral_alerts(manager_id, is_read);
CREATE INDEX idx_behavioral_alerts_user    ON behavioral_alerts(user_id);
CREATE INDEX idx_behavioral_alerts_type    ON behavioral_alerts(alert_type, severity);

ALTER TABLE behavioral_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "behavioral_alerts_select" ON behavioral_alerts
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

CREATE POLICY "behavioral_alerts_insert" ON behavioral_alerts
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

CREATE POLICY "behavioral_alerts_update" ON behavioral_alerts
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

-- ─── 3. TABLE career_predictions ─────────────────────────────
DROP TABLE IF EXISTS career_predictions CASCADE;
CREATE TABLE career_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Trajectoire probable
  trajectory_label    TEXT,   -- 'Spécialiste Expert', 'Manager', 'Transversal', etc.
  trajectory_score    NUMERIC(5,2) DEFAULT 0,  -- score de confiance 0-100
  horizon_months      INT DEFAULT 12,

  -- Profil actuel agrégé
  current_pulse_avg   NUMERIC(5,2),
  current_okr_avg     NUMERIC(5,2),
  current_f360_avg    NUMERIC(5,2),
  current_nita_avg    NUMERIC(5,2),

  -- Matching postes (JSON array de key_position IDs avec scores)
  matched_positions   JSONB DEFAULT '[]'::JSONB,

  -- Recommandations PDI générées
  pdi_recommendations JSONB DEFAULT '[]'::JSONB,

  -- Points forts / zones de développement
  strengths           TEXT[],
  development_areas   TEXT[],

  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_career_pred_org    ON career_predictions(organization_id);
CREATE INDEX idx_career_pred_user   ON career_predictions(user_id);

ALTER TABLE career_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "career_pred_select" ON career_predictions
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

CREATE POLICY "career_pred_insert" ON career_predictions
  FOR INSERT WITH CHECK (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

CREATE POLICY "career_pred_update" ON career_predictions
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    OR is_super_admin()
  );

-- ─── 4. FONCTION compute_attrition_risk() ────────────────────
-- Calcule le score de risque d'attrition pour un utilisateur donné
-- Retourne un score 0-100 et le niveau de risque
CREATE OR REPLACE FUNCTION compute_attrition_risk(p_user_id UUID)
RETURNS TABLE(
  risk_score       NUMERIC,
  risk_level       TEXT,
  factor_pulse     NUMERIC,
  factor_feedback  NUMERIC,
  factor_okr       NUMERIC,
  factor_seniority NUMERIC,
  factor_activity  NUMERIC,
  trend_direction  TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pulse_recent    NUMERIC := 0;
  v_pulse_older     NUMERIC := 0;
  v_pulse_trend     NUMERIC := 0;
  v_f360_avg        NUMERIC := 0;
  v_okr_progress    NUMERIC := 0;
  v_created_at      TIMESTAMPTZ;
  v_seniority_days  INT := 0;
  v_nita_recent     NUMERIC := 0;
  v_f_pulse         NUMERIC := 0;
  v_f_feedback      NUMERIC := 0;
  v_f_okr           NUMERIC := 0;
  v_f_seniority     NUMERIC := 0;
  v_f_activity      NUMERIC := 0;
  v_total           NUMERIC := 0;
  v_level           TEXT := 'low';
  v_trend           TEXT := 'stable';
BEGIN
  -- Facteur 1 : PULSE trend (30%) — baisse = risque
  SELECT
    AVG(CASE WHEN score_date >= NOW() - INTERVAL '3 months' THEN score_total END),
    AVG(CASE WHEN score_date >= NOW() - INTERVAL '6 months'
              AND score_date <  NOW() - INTERVAL '3 months' THEN score_total END)
  INTO v_pulse_recent, v_pulse_older
  FROM performance_scores
  WHERE user_id = p_user_id;

  IF v_pulse_recent IS NOT NULL AND v_pulse_older IS NOT NULL AND v_pulse_older > 0 THEN
    v_pulse_trend := ((v_pulse_older - v_pulse_recent) / v_pulse_older) * 100;
    -- Normaliser: baisse > 20% → score facteur max (100)
    v_f_pulse := LEAST(100, GREATEST(0, v_pulse_trend * 5));
  ELSIF v_pulse_recent IS NOT NULL THEN
    -- Pas d'historique : score proportionnel à l'inverse de la performance actuelle
    v_f_pulse := GREATEST(0, 100 - (v_pulse_recent * 10));
  ELSE
    v_f_pulse := 50; -- donnée absente = risque moyen
  END IF;

  -- Facteur 2 : Feedback 360 moyen (20%) — bas score = risque
  SELECT COALESCE(AVG(
    (COALESCE((scores->>'quality')::NUMERIC,0) +
     COALESCE((scores->>'teamwork')::NUMERIC,0) +
     COALESCE((scores->>'communication')::NUMERIC,0) +
     COALESCE((scores->>'initiative')::NUMERIC,0)) / 4
  ), -1)
  INTO v_f360_avg
  FROM feedback_responses fr
  JOIN feedback_requests req ON req.id = fr.request_id
  WHERE req.evaluated_id = p_user_id
    AND fr.created_at >= NOW() - INTERVAL '6 months';

  IF v_f360_avg >= 0 THEN
    -- Score F360 max est ~5 → normaliser sur 0-100 et inverser
    v_f_feedback := GREATEST(0, 100 - (v_f360_avg * 20));
  ELSE
    v_f_feedback := 40; -- pas de F360 = risque modéré
  END IF;

  -- Facteur 3 : OKR progress (20%) — progress_score bas = risque
  SELECT COALESCE(AVG(progress_score), -1)
  INTO v_okr_progress
  FROM objectives
  WHERE owner_id = p_user_id
    AND status IN ('actif', 'en_evaluation');

  IF v_okr_progress >= 0 THEN
    v_f_okr := GREATEST(0, 100 - v_okr_progress);
  ELSE
    v_f_okr := 30; -- pas d'OKR actifs = risque faible sur ce facteur
  END IF;

  -- Facteur 4 : Ancienneté inversée (15%) — < 2 ans = plus de risque
  SELECT created_at INTO v_created_at
  FROM users WHERE id = p_user_id;

  v_seniority_days := EXTRACT(DAY FROM (NOW() - v_created_at));
  -- < 6 mois → score 90; 6-12 mois → 70; 1-2 ans → 50; > 2 ans → 20; > 5 ans → 5
  v_f_seniority := CASE
    WHEN v_seniority_days < 180  THEN 90
    WHEN v_seniority_days < 365  THEN 70
    WHEN v_seniority_days < 730  THEN 50
    WHEN v_seniority_days < 1825 THEN 20
    ELSE 5
  END;

  -- Facteur 5 : Activité NITA (15%) — faible activité récente = risque
  SELECT COALESCE(AVG(
    (COALESCE(resilience_score,0) + COALESCE(reliability_score,0) + COALESCE(endurance_score,0)) / 3
  ), -1)
  INTO v_nita_recent
  FROM agent_activity_logs
  WHERE user_id = p_user_id
    AND date >= NOW() - INTERVAL '1 month';

  IF v_nita_recent >= 0 THEN
    v_f_activity := GREATEST(0, 100 - (v_nita_recent * 10));
  ELSE
    v_f_activity := 60; -- pas de données NITA récentes = risque modéré-élevé
  END IF;

  -- Score total pondéré
  v_total := (v_f_pulse * 0.30)
           + (v_f_feedback * 0.20)
           + (v_f_okr * 0.20)
           + (v_f_seniority * 0.15)
           + (v_f_activity * 0.15);

  v_total := ROUND(LEAST(100, GREATEST(0, v_total)), 2);

  -- Niveau
  v_level := CASE
    WHEN v_total >= 75 THEN 'critical'
    WHEN v_total >= 55 THEN 'high'
    WHEN v_total >= 30 THEN 'medium'
    ELSE 'low'
  END;

  -- Tendance
  IF v_pulse_trend > 15 THEN
    v_trend := 'critical_decline';
  ELSIF v_pulse_trend > 5 THEN
    v_trend := 'declining';
  ELSIF v_pulse_trend < -5 THEN
    v_trend := 'improving';
  ELSE
    v_trend := 'stable';
  END IF;

  RETURN QUERY SELECT
    v_total,
    v_level,
    ROUND(v_f_pulse, 2),
    ROUND(v_f_feedback, 2),
    ROUND(v_f_okr, 2),
    ROUND(v_f_seniority, 2),
    ROUND(v_f_activity, 2),
    v_trend;
END;
$$;

-- ─── 5. FONCTION refresh_behavioral_scores() ─────────────────
CREATE OR REPLACE FUNCTION refresh_behavioral_scores()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec RECORD;
  v_org_id UUID;
  v_risk   RECORD;
  v_trajectory TEXT;
  v_traj_score NUMERIC;
BEGIN
  -- Pour chaque utilisateur actif
  FOR rec IN
    SELECT u.id, u.organization_id, u.role, u.service_id, u.division_id
    FROM users u
    WHERE u.is_active = TRUE
  LOOP
    -- Calculer le score d'attrition
    SELECT * INTO v_risk FROM compute_attrition_risk(rec.id);

    -- Déterminer la trajectoire carrière (logique simple)
    v_trajectory := CASE
      WHEN rec.role = 'collaborateur' THEN
        CASE
          WHEN v_risk.factor_okr < 30 AND v_risk.factor_feedback < 30 THEN 'Potentiel Managérial'
          WHEN v_risk.factor_okr < 40 THEN 'Spécialiste Expert'
          ELSE 'Socle Opérationnel'
        END
      WHEN rec.role = 'chef_service' THEN 'Évolution Chef de Division'
      WHEN rec.role = 'chef_division' THEN 'Évolution Directeur'
      ELSE 'Leadership Stratégique'
    END;

    v_traj_score := GREATEST(0, 100 - v_risk.risk_score);

    -- Upsert attrition_risk_scores
    INSERT INTO attrition_risk_scores (
      organization_id, user_id,
      risk_score, risk_level,
      factor_pulse, factor_feedback, factor_okr, factor_seniority, factor_activity,
      trend_direction, computed_at
    ) VALUES (
      rec.organization_id, rec.id,
      v_risk.risk_score, v_risk.risk_level,
      v_risk.factor_pulse, v_risk.factor_feedback, v_risk.factor_okr,
      v_risk.factor_seniority, v_risk.factor_activity,
      v_risk.trend_direction, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      risk_score      = EXCLUDED.risk_score,
      risk_level      = EXCLUDED.risk_level,
      factor_pulse    = EXCLUDED.factor_pulse,
      factor_feedback = EXCLUDED.factor_feedback,
      factor_okr      = EXCLUDED.factor_okr,
      factor_seniority= EXCLUDED.factor_seniority,
      factor_activity = EXCLUDED.factor_activity,
      trend_direction = EXCLUDED.trend_direction,
      computed_at     = EXCLUDED.computed_at;

    -- Upsert career_predictions
    INSERT INTO career_predictions (
      organization_id, user_id,
      trajectory_label, trajectory_score, horizon_months, computed_at
    ) VALUES (
      rec.organization_id, rec.id,
      v_trajectory, v_traj_score, 12, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      trajectory_label = EXCLUDED.trajectory_label,
      trajectory_score = EXCLUDED.trajectory_score,
      computed_at      = EXCLUDED.computed_at;

    -- Générer alertes si risque élevé et non déjà envoyé
    IF v_risk.risk_level IN ('high', 'critical') THEN
      INSERT INTO behavioral_alerts (
        organization_id, user_id, alert_type, severity, title, message, risk_score
      )
      SELECT
        rec.organization_id,
        rec.id,
        'attrition_risk',
        CASE v_risk.risk_level WHEN 'critical' THEN 'critical' ELSE 'high' END,
        CASE v_risk.risk_level
          WHEN 'critical' THEN 'Risque de départ critique détecté'
          ELSE 'Risque de départ élevé à surveiller'
        END,
        'Score de risque : ' || v_risk.risk_score || '/100. Facteurs : PULSE ' ||
          v_risk.factor_pulse || ', F360 ' || v_risk.factor_feedback ||
          ', OKR ' || v_risk.factor_okr || '.',
        v_risk.risk_score
      WHERE NOT EXISTS (
        SELECT 1 FROM behavioral_alerts
        WHERE user_id = rec.id
          AND alert_type = 'attrition_risk'
          AND created_at >= NOW() - INTERVAL '7 days'
          AND is_acknowledged = FALSE
      );
    END IF;

  END LOOP;
END;
$$;

-- ─── 6. VUE v_attrition_risk ─────────────────────────────────
DROP VIEW IF EXISTS v_attrition_risk CASCADE;
CREATE VIEW v_attrition_risk AS
SELECT
  ars.id,
  ars.user_id,
  ars.organization_id,
  ars.risk_score,
  ars.risk_level,
  ars.factor_pulse,
  ars.factor_feedback,
  ars.factor_okr,
  ars.factor_seniority,
  ars.factor_activity,
  ars.trend_direction,
  ars.computed_at,
  u.first_name,
  u.last_name,
  u.role,
  u.is_active,
  u.division_id,
  u.service_id,
  u.direction_id,
  d.name AS division_name,
  s.name AS service_name,
  di.name AS direction_name
FROM attrition_risk_scores ars
JOIN users u ON u.id = ars.user_id
LEFT JOIN divisions d  ON d.id  = u.division_id
LEFT JOIN services  s  ON s.id  = u.service_id
LEFT JOIN directions di ON di.id = u.direction_id
WHERE u.is_active = TRUE;

-- ─── 7. VUE v_career_opportunity ─────────────────────────────
-- Matching entre career_predictions et key_positions disponibles
DROP VIEW IF EXISTS v_career_opportunity CASCADE;
CREATE VIEW v_career_opportunity AS
SELECT
  cp.user_id,
  cp.trajectory_label,
  cp.trajectory_score,
  cp.pdi_recommendations,
  cp.strengths,
  cp.development_areas,
  cp.computed_at,
  u.first_name,
  u.last_name,
  u.role,
  u.division_id,
  u.service_id,
  -- Nombre de postes clés potentiellement accessibles
  (
    SELECT COUNT(*) FROM key_positions kp
    WHERE kp.is_active = TRUE
      AND kp.organization_id = cp.organization_id
      AND (kp.division_id = u.division_id OR kp.direction_id = u.direction_id)
  ) AS matching_positions_count
FROM career_predictions cp
JOIN users u ON u.id = cp.user_id
WHERE u.is_active = TRUE;

-- ─── 8. INITIALISER les scores pour tous les utilisateurs actifs ──
SELECT refresh_behavioral_scores();

-- ─── 9. pg_cron — refresh hebdomadaire (dimanche 02h00) ──────
-- ⚠️ pg_cron doit être activé dans Supabase Dashboard → Extensions
DO $cron$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'behavioral-scores-weekly',
      '0 2 * * 0',
      'SELECT refresh_behavioral_scores()'
    );
  END IF;
END;
$cron$;

-- ─── 10. Purge automatique alertes expirées (90 jours) ───────
DO $purge$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'behavioral-alerts-purge',
      '0 3 * * 1',
      'DELETE FROM behavioral_alerts WHERE expires_at < NOW()'
    );
  END IF;
END;
$purge$;
