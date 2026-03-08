-- ============================================================
-- APEX RH — S73 : Formation — Budget + Obligatoire + Évaluation
-- ============================================================

-- ─── 1. COLONNES training_catalog ────────────────────────────
ALTER TABLE training_catalog
  ADD COLUMN IF NOT EXISTS is_mandatory        BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mandatory_roles     TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mandatory_services  UUID[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS renewal_months      INT       DEFAULT NULL,   -- NULL = pas de renouvellement
  ADD COLUMN IF NOT EXISTS budget_cost         NUMERIC(12,2) DEFAULT 0;  -- coût unitaire FCFA

-- ─── 2. COLONNES training_enrollments ────────────────────────
ALTER TABLE training_enrollments
  ADD COLUMN IF NOT EXISTS satisfaction_score    SMALLINT  CHECK (satisfaction_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS satisfaction_comment  TEXT,
  ADD COLUMN IF NOT EXISTS satisfaction_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effectiveness_score   SMALLINT  CHECK (effectiveness_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS effectiveness_comment TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_at      TIMESTAMPTZ;  -- J+30

-- ─── 3. COLONNES training_plans ──────────────────────────────
ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS budget_allocated  NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_consumed   NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by       UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;

-- ─── 4. TABLE training_budget ────────────────────────────────
CREATE TABLE IF NOT EXISTS training_budget (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id     UUID REFERENCES divisions(id),   -- NULL = org-wide
  year            INT  NOT NULL,
  label           TEXT NOT NULL,                   -- "Budget Formation 2026 — RH"
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  consumed_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, division_id, year)
);

ALTER TABLE training_budget ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_budget_org ON training_budget(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_budget_year ON training_budget(year);

-- RLS training_budget
DROP POLICY IF EXISTS training_budget_org_rls ON training_budget;
CREATE POLICY training_budget_org_rls ON training_budget
  USING (organization_id = auth_user_organization_id());

-- ─── 5. TABLE training_mandatory_rules ───────────────────────
CREATE TABLE IF NOT EXISTS training_mandatory_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  training_id     UUID NOT NULL REFERENCES training_catalog(id) ON DELETE CASCADE,
  target_type     TEXT NOT NULL CHECK (target_type IN ('role','service','division','all')),
  target_id       UUID,     -- service_id ou division_id; NULL si role ou all
  target_role     TEXT,     -- rôle cible si target_type='role'
  renewal_months  INT,      -- surcharge du catalogue
  deadline_days   INT DEFAULT 90,  -- délai pour accomplir après embauche/renouvellement
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, training_id, target_type, target_id, target_role)
);

ALTER TABLE training_mandatory_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tmr_org ON training_mandatory_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_tmr_training ON training_mandatory_rules(training_id);

DROP POLICY IF EXISTS tmr_org_rls ON training_mandatory_rules;
CREATE POLICY tmr_org_rls ON training_mandatory_rules
  USING (organization_id = auth_user_organization_id());

-- ─── 6. VUE MATÉRIALISÉE — Conformité formations obligatoires ─
DROP MATERIALIZED VIEW IF EXISTS mv_mandatory_compliance;
CREATE MATERIALIZED VIEW mv_mandatory_compliance AS
WITH rules AS (
  SELECT
    r.id AS rule_id,
    r.organization_id,
    r.training_id,
    r.target_type,
    r.target_id,
    r.target_role,
    COALESCE(r.renewal_months, tc.renewal_months) AS renewal_months,
    r.deadline_days
  FROM training_mandatory_rules r
  JOIN training_catalog tc ON tc.id = r.training_id
  WHERE r.is_active = TRUE
),
users_in_scope AS (
  SELECT
    u.id AS user_id,
    u.organization_id,
    u.role,
    u.service_id,
    u.division_id
  FROM users u
  WHERE u.is_active = TRUE
),
completions AS (
  SELECT
    e.user_id,
    e.training_id,
    MAX(e.completed_at) AS last_completed_at
  FROM training_enrollments e
  WHERE e.status = 'termine'
  GROUP BY e.user_id, e.training_id
),
compliance_raw AS (
  SELECT
    u.user_id,
    u.organization_id,
    r.training_id,
    r.rule_id,
    c.last_completed_at,
    r.renewal_months,
    CASE
      WHEN c.last_completed_at IS NULL THEN 'non_realise'
      WHEN r.renewal_months IS NOT NULL
        AND c.last_completed_at < NOW() - (r.renewal_months || ' months')::INTERVAL
        THEN 'a_renouveler'
      ELSE 'conforme'
    END AS compliance_status
  FROM rules r
  JOIN users_in_scope u ON u.organization_id = r.organization_id
  LEFT JOIN completions c ON c.user_id = u.user_id AND c.training_id = r.training_id
  -- filtrage périmètre
  WHERE
    r.target_type = 'all'
    OR (r.target_type = 'role'     AND u.role::TEXT = r.target_role)
    OR (r.target_type = 'service'  AND u.service_id  = r.target_id)
    OR (r.target_type = 'division' AND u.division_id = r.target_id)
)
SELECT
  organization_id,
  training_id,
  compliance_status,
  COUNT(*)                          AS user_count,
  MIN(last_completed_at)            AS oldest_completion
FROM compliance_raw
GROUP BY organization_id, training_id, compliance_status;

CREATE UNIQUE INDEX IF NOT EXISTS mv_mandatory_compliance_pk
  ON mv_mandatory_compliance(organization_id, training_id, compliance_status);

-- Protéger contre accès API direct
REVOKE ALL ON mv_mandatory_compliance FROM anon, authenticated;

-- ─── 7. VUE MATÉRIALISÉE — Satisfaction agrégée ──────────────
DROP MATERIALIZED VIEW IF EXISTS mv_training_satisfaction;
CREATE MATERIALIZED VIEW mv_training_satisfaction AS
SELECT
  te.training_id,
  COUNT(*)                                  AS eval_count,
  ROUND(AVG(te.satisfaction_score), 2)      AS avg_satisfaction,
  ROUND(AVG(te.effectiveness_score), 2)     AS avg_effectiveness,
  COUNT(CASE WHEN te.satisfaction_score  IS NOT NULL THEN 1 END) AS satisfaction_responses,
  COUNT(CASE WHEN te.effectiveness_score IS NOT NULL THEN 1 END) AS effectiveness_responses,
  MAX(te.satisfaction_at)                   AS last_eval_at
FROM training_enrollments te
WHERE te.status = 'termine'
GROUP BY te.training_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_training_satisfaction_pk ON mv_training_satisfaction(training_id);
REVOKE ALL ON mv_training_satisfaction FROM anon, authenticated;

-- ─── 8. FONCTION refresh MVs formation ───────────────────────
CREATE OR REPLACE FUNCTION refresh_formation_mvs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mandatory_compliance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_training_satisfaction;
  REFRESH MATERIALIZED VIEW mv_training_popularity;  -- déjà existant S57
END;
$$;

-- ─── 9. FONCTION compute_budget_consumed ─────────────────────
CREATE OR REPLACE FUNCTION update_budget_consumed(p_org_id UUID, p_year INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consumed NUMERIC;
BEGIN
  SELECT COALESCE(SUM(tc.budget_cost), 0)
  INTO v_consumed
  FROM training_enrollments te
  JOIN training_catalog tc ON tc.id = te.training_id
  WHERE te.status IN ('inscrit','en_cours','termine')
    AND EXTRACT(YEAR FROM te.enrolled_at) = p_year
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = te.user_id AND u.organization_id = p_org_id
    );

  UPDATE training_budget
  SET consumed_amount = v_consumed, updated_at = NOW()
  WHERE organization_id = p_org_id AND year = p_year AND division_id IS NULL;
END;
$$;

-- ─── COMMENTAIRES ────────────────────────────────────────────
COMMENT ON TABLE training_budget IS 'Budget formation par organisation/division/année — S73';
COMMENT ON TABLE training_mandatory_rules IS 'Règles formations obligatoires par périmètre — S73';
COMMENT ON MATERIALIZED VIEW mv_mandatory_compliance IS 'Conformité formations obligatoires par user — S73';
COMMENT ON MATERIALIZED VIEW mv_training_satisfaction IS 'Agrégats satisfaction/efficacité par formation — S73';