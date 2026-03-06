-- ============================================================
-- APEX RH — migration_s51_succession_planning.sql
-- Session 51 — Succession Planning & Cartographie 9-Box
--
-- 1. Table key_positions   — postes clés par département
-- 2. Table succession_plans — candidats successeurs
-- 3. Vue v_talent_ninebox  — placement Performance × Potentiel
-- 4. Index + RLS
-- ============================================================

-- ─── 1. TABLE key_positions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS key_positions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  -- Lien organisationnel (au moins un requis)
  direction_id     UUID REFERENCES directions(id) ON DELETE SET NULL,
  division_id      UUID REFERENCES divisions(id)  ON DELETE SET NULL,
  service_id       UUID REFERENCES services(id)   ON DELETE SET NULL,
  -- current_holder : poste actuellement occupé par qui
  current_holder_id UUID REFERENCES users(id)     ON DELETE SET NULL,
  criticality_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (criticality_level IN ('critical','high','medium','low')),
  -- Délai moyen avant vacance prévisible (mois)
  vacancy_horizon_months INTEGER DEFAULT 12,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. TABLE succession_plans ───────────────────────────────
CREATE TABLE IF NOT EXISTS succession_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id      UUID NOT NULL REFERENCES key_positions(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  readiness_level  TEXT NOT NULL DEFAULT 'ready_in_2_years'
    CHECK (readiness_level IN ('ready_now','ready_in_1_year','ready_in_2_years','potential')),
  notes            TEXT,
  nominated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un candidat ne peut être nominé qu'une fois par poste
  UNIQUE (position_id, candidate_user_id)
);

-- ─── 3. INDEX ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_key_positions_direction  ON key_positions(direction_id);
CREATE INDEX IF NOT EXISTS idx_key_positions_division   ON key_positions(division_id);
CREATE INDEX IF NOT EXISTS idx_key_positions_criticality ON key_positions(criticality_level);
CREATE INDEX IF NOT EXISTS idx_succession_position      ON succession_plans(position_id);
CREATE INDEX IF NOT EXISTS idx_succession_candidate     ON succession_plans(candidate_user_id);

-- ─── 4. VUE v_talent_ninebox ──────────────────────────────────
-- Place chaque utilisateur actif sur l'axe Performance × Potentiel
-- Performance = moyenne score_total PULSE sur 3 derniers mois (0–100)
-- Potentiel   = composite (OKR progress moyen + F360 average + ancienneté inversée normalisée)
-- Sortie : performance_band (low/medium/high) × potential_band (low/medium/high)

CREATE OR REPLACE VIEW v_talent_ninebox AS
WITH

-- ── A. Score PULSE moyen sur 3 mois glissants ─────────────────
pulse_3m AS (
  SELECT
    ps.user_id,
    ROUND(AVG(ps.score_total)::NUMERIC, 1) AS avg_pulse,
    COUNT(ps.id)                            AS pulse_days
  FROM performance_scores ps
  WHERE ps.score_date >= (CURRENT_DATE - INTERVAL '90 days')
    AND ps.score_total IS NOT NULL
  GROUP BY ps.user_id
),

-- ── B. Progress OKR moyen (objectifs actifs) ─────────────────
okr_avg AS (
  SELECT
    o.owner_id,
    ROUND(AVG(o.progress_score)::NUMERIC, 1) AS avg_okr_progress
  FROM objectives o
  WHERE o.status IN ('actif','en_evaluation')
    AND o.progress_score IS NOT NULL
  GROUP BY o.owner_id
),

-- ── C. Score F360 moyen reçu ──────────────────────────────────
-- survey_responses.scores est JSONB → extraire average_score si présent
-- sinon on compte simplement les feedbacks reçus comme proxy
f360_avg AS (
  SELECT
    fr.evaluated_id,
    COUNT(DISTINCT fr.id) FILTER (WHERE fr.status = 'completed') AS f360_count,
    -- Bonus : plus de feedbacks complétés = signal positif potentiel
    LEAST(COUNT(DISTINCT fr.id) FILTER (WHERE fr.status = 'completed') * 10, 40)::NUMERIC AS f360_score
  FROM feedback_requests fr
  WHERE fr.created_at >= (CURRENT_DATE - INTERVAL '180 days')
  GROUP BY fr.evaluated_id
),

-- ── D. Ancienneté inversée (normalisée 0-20, max 3 ans) ──────
-- Collaborateur récent = potentiel plus élevé par convention RH
seniority AS (
  SELECT
    u.id,
    EXTRACT(DAY FROM NOW() - u.created_at) AS days_in_company,
    -- Formule : moins c'est ancien, plus le score est élevé (max 20 pts)
    GREATEST(0, LEAST(20, 20 - (EXTRACT(DAY FROM NOW() - u.created_at) / 365.0 * 7)))::NUMERIC AS seniority_score
  FROM users u
  WHERE u.is_active = TRUE
),

-- ── E. Score Potentiel composite ─────────────────────────────
potential_calc AS (
  SELECT
    u.id   AS user_id,
    -- OKR : 40% du potentiel
    COALESCE(oa.avg_okr_progress * 0.4, 0)
    -- F360 : 40%
    + COALESCE(f.f360_score, 0)
    -- Ancienneté inversée : 20%
    + COALESCE(s.seniority_score, 0) AS raw_potential
  FROM users u
  LEFT JOIN okr_avg  oa ON oa.owner_id = u.id
  LEFT JOIN f360_avg f  ON f.evaluated_id = u.id
  LEFT JOIN seniority s ON s.id = u.id
  WHERE u.is_active = TRUE
),

-- ── F. Normalisation potentiel 0-100 ─────────────────────────
potential_norm AS (
  SELECT
    pc.user_id,
    pc.raw_potential,
    -- Normalisation simple linéaire capped à 100
    LEAST(ROUND((pc.raw_potential / 80.0 * 100)::NUMERIC, 1), 100) AS potential_score
  FROM potential_calc pc
),

-- ── G. Assemblage final avec bandes ──────────────────────────
final AS (
  SELECT
    u.id                            AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.division_id,
    u.service_id,
    u.direction_id,
    d.name                          AS division_name,
    sv.name                         AS service_name,
    dir.name                        AS direction_name,
    COALESCE(p.avg_pulse, 0)        AS performance_score,
    COALESCE(p.pulse_days, 0)       AS pulse_days,
    COALESCE(pn.potential_score, 0) AS potential_score,
    COALESCE(oa.avg_okr_progress, 0) AS okr_progress,

    -- BANDE PERFORMANCE : 0-49 = low, 50-74 = medium, 75-100 = high
    CASE
      WHEN COALESCE(p.avg_pulse, 0) >= 75 THEN 'high'
      WHEN COALESCE(p.avg_pulse, 0) >= 50 THEN 'medium'
      ELSE 'low'
    END AS performance_band,

    -- BANDE POTENTIEL : 0-39 = low, 40-69 = medium, 70-100 = high
    CASE
      WHEN COALESCE(pn.potential_score, 0) >= 70 THEN 'high'
      WHEN COALESCE(pn.potential_score, 0) >= 40 THEN 'medium'
      ELSE 'low'
    END AS potential_band

  FROM users u
  LEFT JOIN pulse_3m     p   ON p.user_id = u.id
  LEFT JOIN potential_norm pn ON pn.user_id = u.id
  LEFT JOIN okr_avg      oa  ON oa.owner_id = u.id
  LEFT JOIN divisions    d   ON d.id = u.division_id
  LEFT JOIN services     sv  ON sv.id = u.service_id
  LEFT JOIN directions   dir ON dir.id = u.direction_id
  WHERE u.is_active = TRUE
    AND u.role NOT IN ('administrateur')
)

SELECT
  f.*,
  -- Étiquette de cellule 9-box
  CASE
    WHEN f.performance_band = 'high'   AND f.potential_band = 'high'   THEN 'star'
    WHEN f.performance_band = 'high'   AND f.potential_band = 'medium' THEN 'backbone'
    WHEN f.performance_band = 'high'   AND f.potential_band = 'low'    THEN 'expert'
    WHEN f.performance_band = 'medium' AND f.potential_band = 'high'   THEN 'high_potential'
    WHEN f.performance_band = 'medium' AND f.potential_band = 'medium' THEN 'core'
    WHEN f.performance_band = 'medium' AND f.potential_band = 'low'    THEN 'reliable'
    WHEN f.performance_band = 'low'    AND f.potential_band = 'high'   THEN 'enigma'
    WHEN f.performance_band = 'low'    AND f.potential_band = 'medium' THEN 'inconsistent'
    ELSE                                                                     'underperformer'
  END AS ninebox_cell
FROM final f;

-- ─── 5. RLS key_positions ────────────────────────────────────
ALTER TABLE key_positions ENABLE ROW LEVEL SECURITY;

-- Lecture : managers + admins
CREATE POLICY "key_positions_read" ON key_positions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- Écriture : admins + directeurs uniquement
CREATE POLICY "key_positions_write" ON key_positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('administrateur','directeur')
    )
  );

-- ─── 6. RLS succession_plans ─────────────────────────────────
ALTER TABLE succession_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "succession_read" ON succession_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

CREATE POLICY "succession_write" ON succession_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- ─── 7. Trigger updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_key_positions_updated_at  ON key_positions;
CREATE TRIGGER trg_key_positions_updated_at
  BEFORE UPDATE ON key_positions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_succession_updated_at ON succession_plans;
CREATE TRIGGER trg_succession_updated_at
  BEFORE UPDATE ON succession_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 8. Vérification ────────────────────────────────────────
-- SELECT COUNT(*) FROM key_positions;
-- SELECT COUNT(*) FROM succession_plans;
-- SELECT ninebox_cell, COUNT(*) FROM v_talent_ninebox GROUP BY ninebox_cell;