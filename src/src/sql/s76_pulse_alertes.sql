-- ============================================================
-- APEX RH — s76_pulse_alertes.sql
-- Session 76 — Performance PULSE : Alertes proactives + Calibration
-- Tables : pulse_alert_rules, pulse_alerts, pulse_calibration
-- MV : mv_pulse_trends
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pulse_alert_type AS ENUM (
    'decrochage',    -- score bas plusieurs jours consécutifs
    'absence',       -- brief/journal manquant plusieurs jours
    'stagnation',    -- score stable à un niveau bas (pas d'amélioration)
    'pic_negatif'    -- chute brutale du score en 1 journée
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pulse_alert_status AS ENUM (
    'active',        -- alerte en cours, non traitée
    'acknowledged',  -- vue par le manager
    'resolved',      -- résolue (score remonté ou action prise)
    'dismissed'      -- ignorée volontairement
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pulse_dimension AS ENUM (
    'delivery',
    'quality',
    'regularity',
    'bonus_okr',
    'global'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TABLE : pulse_alert_rules ───────────────────────────────
-- Règles configurables par l'admin définissant quand déclencher une alerte

CREATE TABLE IF NOT EXISTS pulse_alert_rules (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  alert_type        pulse_alert_type NOT NULL,
  is_active         boolean     NOT NULL DEFAULT true,

  -- Critères de déclenchement
  threshold_score   numeric(5,2),          -- seuil de score (ex: 40)
  consecutive_days  integer DEFAULT 3,     -- nombre de jours consécutifs
  drop_pct          numeric(5,2),          -- % chute en 1 jour pour pic_negatif

  -- Cibles
  applies_to_dimension pulse_dimension NOT NULL DEFAULT 'global',

  -- Métadonnées
  created_by        uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── TABLE : pulse_alerts ─────────────────────────────────────
-- Alertes générées (1 ligne par alerte déclenchée)

CREATE TABLE IF NOT EXISTS pulse_alerts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id           uuid        REFERENCES pulse_alert_rules(id) ON DELETE SET NULL,
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  alert_type        pulse_alert_type NOT NULL,
  status            pulse_alert_status NOT NULL DEFAULT 'active',
  severity          text        NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),

  -- Contexte de déclenchement
  triggered_at      timestamptz NOT NULL DEFAULT now(),
  context_json      jsonb       DEFAULT '{}',  -- ex: {"avg_score":32,"days":4,"dimension":"global"}

  -- Traitement
  acknowledged_by   uuid        REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at   timestamptz,
  resolution_note   text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── TABLE : pulse_calibration ───────────────────────────────
-- Config des poids et seuils par organisation et par dimension

CREATE TABLE IF NOT EXISTS pulse_calibration (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dimension         pulse_dimension NOT NULL,

  -- Pondération (somme des weights doit = 100 pour les 4 dimensions non-global)
  weight            numeric(5,2) NOT NULL DEFAULT 25.0 CHECK (weight >= 0 AND weight <= 100),

  -- Seuils de déclenchement d'alerte
  min_trigger_score numeric(5,2) NOT NULL DEFAULT 40.0,
  target_score      numeric(5,2) NOT NULL DEFAULT 70.0,

  -- Fréquence de calcul (en heures)
  recalc_frequency_h integer NOT NULL DEFAULT 24,

  -- Métadonnées
  updated_by        uuid        REFERENCES users(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, dimension)
);

-- ─── MV : mv_pulse_trends ────────────────────────────────────
-- Tendances 7j et 30j par utilisateur (pré-calculées)

DROP MATERIALIZED VIEW IF EXISTS mv_pulse_trends;

CREATE MATERIALIZED VIEW mv_pulse_trends AS
SELECT
  ps.user_id,
  u.organization_id,
  u.role,

  -- Moyenne 7 derniers jours
  ROUND(AVG(ps.score_total) FILTER (
    WHERE ps.score_date >= CURRENT_DATE - INTERVAL '7 days'
  )::numeric, 2)                               AS avg_7d,

  -- Moyenne 30 derniers jours
  ROUND(AVG(ps.score_total) FILTER (
    WHERE ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
  )::numeric, 2)                               AS avg_30d,

  -- Tendance : diff entre moy 7j et moy des 7j précédents
  ROUND((
    AVG(ps.score_total) FILTER (WHERE ps.score_date >= CURRENT_DATE - INTERVAL '7 days')
    -
    AVG(ps.score_total) FILTER (
      WHERE ps.score_date >= CURRENT_DATE - INTERVAL '14 days'
        AND ps.score_date < CURRENT_DATE - INTERVAL '7 days'
    )
  )::numeric, 2)                               AS trend_delta,

  -- Min / Max 30j
  MIN(ps.score_total) FILTER (
    WHERE ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
  )                                            AS min_30d,
  MAX(ps.score_total) FILTER (
    WHERE ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
  )                                            AS max_30d,

  -- Nombre de logs ces 30j
  COUNT(ps.id) FILTER (
    WHERE ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
  )                                            AS log_count_30d,

  -- Score le plus récent
  (SELECT score_total FROM performance_scores
   WHERE user_id = ps.user_id AND score_period = 'daily'
   ORDER BY score_date DESC LIMIT 1)           AS latest_score,

  -- Date du dernier log
  MAX(ps.score_date)                           AS last_log_date,

  now()                                        AS refreshed_at

FROM performance_scores ps
JOIN users u ON u.id = ps.user_id
WHERE ps.score_period = 'daily'
  AND ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ps.user_id, u.organization_id, u.role;

-- Index sur la MV
CREATE UNIQUE INDEX IF NOT EXISTS mv_pulse_trends_user_idx ON mv_pulse_trends (user_id);
CREATE INDEX IF NOT EXISTS mv_pulse_trends_org_idx ON mv_pulse_trends (organization_id);

-- Révoquer l'accès direct API
REVOKE ALL ON mv_pulse_trends FROM anon, authenticated;

-- ─── FONCTION REFRESH ────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_pulse_trends_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pulse_trends;
END;
$$;

-- ─── INDEX TABLES ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pulse_alert_rules_org
  ON pulse_alert_rules (organization_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pulse_alerts_user
  ON pulse_alerts (user_id, status);

CREATE INDEX IF NOT EXISTS idx_pulse_alerts_org_status
  ON pulse_alerts (organization_id, status, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_calibration_org
  ON pulse_calibration (organization_id);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE pulse_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_calibration ENABLE ROW LEVEL SECURITY;

-- pulse_alert_rules : lecture org-wide, écriture admin/rh
CREATE POLICY "pulse_alert_rules_select" ON pulse_alert_rules
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "pulse_alert_rules_insert" ON pulse_alert_rules
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

CREATE POLICY "pulse_alert_rules_update" ON pulse_alert_rules
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

CREATE POLICY "pulse_alert_rules_delete" ON pulse_alert_rules
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'administrateur'
  );

-- pulse_alerts : collaborateur voit ses propres alertes, manager voit son équipe, admin voit tout
CREATE POLICY "pulse_alerts_select" ON pulse_alerts
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

CREATE POLICY "pulse_alerts_insert" ON pulse_alerts
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

CREATE POLICY "pulse_alerts_update" ON pulse_alerts
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- pulse_calibration : lecture admin/rh, écriture admin
CREATE POLICY "pulse_calibration_select" ON pulse_calibration
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

CREATE POLICY "pulse_calibration_insert" ON pulse_calibration
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "pulse_calibration_update" ON pulse_calibration
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'administrateur'
  );

-- ─── DONNÉES PAR DÉFAUT (règles exemples) ────────────────────
-- À exécuter APRÈS avoir créé les organisations

-- INSERT INTO pulse_alert_rules (organization_id, name, alert_type, threshold_score, consecutive_days, applies_to_dimension)
-- SELECT id, 'Décrochage score global', 'decrochage', 40, 3, 'global' FROM organizations LIMIT 1;