-- ============================================================
-- APEX RH — S83 : Succession & Talents — Vivier + gap analysis
-- ============================================================

-- ─── 1. ENUM readiness_level ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE talent_readiness AS ENUM (
    'ready_now', 'ready_1y', 'ready_2y'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. TABLE talent_pool_entries ────────────────────────────
-- Vivier de talents internes prêts à prendre un rôle clé
CREATE TABLE IF NOT EXISTS talent_pool_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role      text NOT NULL,           -- rôle/poste visé (libellé libre ou lié key_positions)
  target_position_id uuid REFERENCES key_positions(id) ON DELETE SET NULL,
  readiness        talent_readiness NOT NULL DEFAULT 'ready_2y',
  skills_gap       jsonb NOT NULL DEFAULT '[]',
  -- skills_gap format : [{skill, required_level, current_level, gap, priority}]
  notes            text,
  added_by         uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, target_position_id)
);

CREATE INDEX IF NOT EXISTS idx_talent_pool_org
  ON talent_pool_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_user
  ON talent_pool_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_readiness
  ON talent_pool_entries(organization_id, readiness);

ALTER TABLE talent_pool_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_isolation_talent_pool" ON talent_pool_entries;
CREATE POLICY "org_isolation_talent_pool" ON talent_pool_entries
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- ─── 3. TABLE succession_gaps ────────────────────────────────
-- Analyse des écarts de compétences pour chaque poste clé
CREATE TABLE IF NOT EXISTS succession_gaps (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  position_id          uuid NOT NULL REFERENCES key_positions(id) ON DELETE CASCADE,
  required_skills      jsonb NOT NULL DEFAULT '[]',
  -- required_skills format : [{skill, required_level, weight}]
  current_coverage_pct numeric(5,2) NOT NULL DEFAULT 0,
  last_assessed_at     timestamptz,
  assessed_by          uuid REFERENCES users(id),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_succession_gaps_org
  ON succession_gaps(organization_id);
CREATE INDEX IF NOT EXISTS idx_succession_gaps_position
  ON succession_gaps(position_id);

ALTER TABLE succession_gaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_isolation_succession_gaps" ON succession_gaps;
CREATE POLICY "org_isolation_succession_gaps" ON succession_gaps
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- ─── 4. MATERIALIZED VIEW mv_succession_coverage ─────────────
DROP MATERIALIZED VIEW IF EXISTS mv_succession_coverage;
CREATE MATERIALIZED VIEW mv_succession_coverage AS
SELECT
  kp.organization_id,
  kp.id                              AS position_id,
  kp.title                           AS position_title,
  kp.criticality_level::text         AS criticality_level,
  kp.is_active,

  -- Nombre de successeurs potentiels dans le vivier
  COUNT(DISTINCT tpe.user_id)        AS pool_count,

  -- Répartition par niveau de readiness
  COUNT(DISTINCT tpe.user_id) FILTER (WHERE tpe.readiness = 'ready_now') AS ready_now_count,
  COUNT(DISTINCT tpe.user_id) FILTER (WHERE tpe.readiness = 'ready_1y')  AS ready_1y_count,
  COUNT(DISTINCT tpe.user_id) FILTER (WHERE tpe.readiness = 'ready_2y')  AS ready_2y_count,

  -- Couverture depuis succession_gaps
  COALESCE(sg.current_coverage_pct, 0) AS coverage_pct,

  -- Risque : pas de ready_now ET poste critique
  CASE
    WHEN COUNT(DISTINCT tpe.user_id) FILTER (WHERE tpe.readiness = 'ready_now') = 0
     AND kp.criticality_level IN ('critical', 'high')
    THEN true
    ELSE false
  END AS is_at_risk

FROM key_positions kp
LEFT JOIN talent_pool_entries tpe
  ON tpe.target_position_id = kp.id
  AND tpe.organization_id   = kp.organization_id
LEFT JOIN succession_gaps sg
  ON sg.position_id       = kp.id
  AND sg.organization_id  = kp.organization_id
WHERE kp.is_active = true
GROUP BY
  kp.organization_id, kp.id, kp.title, kp.criticality_level,
  kp.is_active, sg.current_coverage_pct;

-- Index sur la MV
CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_succession_coverage_pos
  ON mv_succession_coverage(organization_id, position_id);
CREATE INDEX IF NOT EXISTS idx_mv_succession_coverage_org
  ON mv_succession_coverage(organization_id);

-- Sécurité MV : jamais exposée directement
REVOKE ALL ON mv_succession_coverage FROM anon, authenticated;

-- ─── 5. FONCTION refresh ─────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_succession_coverage_mv()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_succession_coverage;
END;
$$;

-- ─── 6. RPC get_talent_gap_analysis ──────────────────────────
-- Retourne les écarts agrégés par compétence pour toute l'organisation
CREATE OR REPLACE FUNCTION get_talent_gap_analysis(p_org_id uuid)
RETURNS TABLE (
  skill          text,
  avg_required   numeric,
  avg_current    numeric,
  avg_gap        numeric,
  affected_count bigint,
  priority       text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_caller_org uuid;
BEGIN
  -- Vérification org du caller
  SELECT organization_id INTO v_caller_org
  FROM users WHERE id = auth.uid();

  IF v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    (gap_item->>'skill')::text                                   AS skill,
    AVG((gap_item->>'required_level')::numeric)                  AS avg_required,
    AVG((gap_item->>'current_level')::numeric)                   AS avg_current,
    AVG((gap_item->>'gap')::numeric)                             AS avg_gap,
    COUNT(*)                                                     AS affected_count,
    CASE
      WHEN AVG((gap_item->>'gap')::numeric) >= 3 THEN 'critical'
      WHEN AVG((gap_item->>'gap')::numeric) >= 2 THEN 'high'
      WHEN AVG((gap_item->>'gap')::numeric) >= 1 THEN 'medium'
      ELSE 'low'
    END                                                          AS priority
  FROM talent_pool_entries tpe,
       jsonb_array_elements(tpe.skills_gap) AS gap_item
  WHERE tpe.organization_id = p_org_id
    AND (gap_item->>'gap')::numeric > 0
  GROUP BY (gap_item->>'skill')::text
  ORDER BY avg_gap DESC;
END;
$$;

-- ─── 7. RPC get_succession_coverage ──────────────────────────
-- Lit la MV mv_succession_coverage (sécurisée DEFINER)
CREATE OR REPLACE FUNCTION get_succession_coverage(p_org_id uuid)
RETURNS TABLE (
  position_id      uuid,
  position_title   text,
  criticality_level text,
  pool_count       bigint,
  ready_now_count  bigint,
  ready_1y_count   bigint,
  ready_2y_count   bigint,
  coverage_pct     numeric,
  is_at_risk       boolean
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_caller_org uuid;
BEGIN
  SELECT organization_id INTO v_caller_org
  FROM users WHERE id = auth.uid();

  IF v_caller_org IS DISTINCT FROM p_org_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    msc.position_id,
    msc.position_title,
    msc.criticality_level,
    msc.pool_count,
    msc.ready_now_count,
    msc.ready_1y_count,
    msc.ready_2y_count,
    msc.coverage_pct,
    msc.is_at_risk
  FROM mv_succession_coverage msc
  WHERE msc.organization_id = p_org_id
  ORDER BY
    CASE msc.criticality_level
      WHEN 'critical' THEN 1
      WHEN 'high'     THEN 2
      WHEN 'medium'   THEN 3
      ELSE 4
    END,
    msc.coverage_pct ASC;
END;
$$;

-- ─── 8. Trigger updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_talent_pool_updated_at ON talent_pool_entries;
CREATE TRIGGER trg_talent_pool_updated_at
  BEFORE UPDATE ON talent_pool_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_succession_gaps_updated_at ON succession_gaps;
CREATE TRIGGER trg_succession_gaps_updated_at
  BEFORE UPDATE ON succession_gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── FIN S83 ──────────────────────────────────────────────────
