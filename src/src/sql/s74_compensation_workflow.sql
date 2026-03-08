-- ============================================================
-- APEX RH — S74 — Compensation — Workflow révision salariale
-- ============================================================

-- ─── 1. EXTENSION DE L'ENUM review_status ────────────────────

ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'brouillon';
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'soumis';
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'valide_manager';
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'valide_rh';
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'refuse';

-- ─── 2. COLONNES WORKFLOW SUR compensation_reviews ───────────

ALTER TABLE compensation_reviews
  ADD COLUMN IF NOT EXISTS submitted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_approved_by UUID    REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_approved_by      UUID    REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS hr_approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applied_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refused_reason      TEXT,
  ADD COLUMN IF NOT EXISTS review_cycle_id     UUID;

-- ─── 3. TABLE compensation_cycles ────────────────────────────

CREATE TABLE IF NOT EXISTS compensation_cycles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  year            INT         NOT NULL,
  start_date      DATE,
  end_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'ouvert'
                              CHECK (status IN ('ouvert','en_cours','cloture')),
  budget_envelope NUMERIC(15,2),
  currency        TEXT        NOT NULL DEFAULT 'XOF',
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK cycle -> reviews
ALTER TABLE compensation_reviews
  DROP CONSTRAINT IF EXISTS fk_review_cycle;

ALTER TABLE compensation_reviews
  ADD CONSTRAINT fk_review_cycle
  FOREIGN KEY (review_cycle_id) REFERENCES compensation_cycles(id) ON DELETE SET NULL;

-- ─── 4. RLS compensation_cycles ──────────────────────────────

ALTER TABLE compensation_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cycles_org_rls" ON compensation_cycles;

CREATE POLICY "cycles_org_rls" ON compensation_cycles
  USING (organization_id = auth_user_organization_id());

-- ─── 5. MV mv_compensation_cycles_progress ───────────────────
-- Colonnes reelles : old_base_salary / new_base_salary / user_id
-- Cast status::text pour eviter "unsafe use of new enum value"

DROP MATERIALIZED VIEW IF EXISTS mv_compensation_cycles_progress CASCADE;

CREATE MATERIALIZED VIEW mv_compensation_cycles_progress AS
SELECT
  cc.id                                                                               AS cycle_id,
  cc.organization_id,
  cc.name,
  cc.year,
  cc.status,
  cc.budget_envelope,
  cc.currency,
  COUNT(cr.id)                                                                        AS total_reviews,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'soumis')                             AS nb_soumis,
  COUNT(cr.id) FILTER (WHERE cr.status::text IN ('valide_manager','valide_rh','applique')) AS nb_valides,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'applique')                           AS nb_appliques,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'refuse')                             AS nb_refuses,
  COALESCE(
    SUM(cr.new_base_salary - cr.old_base_salary)
    FILTER (WHERE cr.status::text IN ('valide_rh','applique')), 0
  )                                                                                   AS budget_engage,
  CASE WHEN COUNT(cr.id) > 0
    THEN ROUND(
      100.0 * COUNT(cr.id) FILTER (WHERE cr.status::text IN ('valide_manager','valide_rh','applique'))
      / COUNT(cr.id), 1)
    ELSE 0
  END                                                                                 AS pct_valides
FROM compensation_cycles cc
LEFT JOIN compensation_reviews cr ON cr.review_cycle_id = cc.id
GROUP BY cc.id, cc.organization_id, cc.name, cc.year, cc.status, cc.budget_envelope, cc.currency;

CREATE UNIQUE INDEX ON mv_compensation_cycles_progress (cycle_id);
REVOKE ALL ON mv_compensation_cycles_progress FROM anon, authenticated;

-- ─── 6. MV mv_revision_stats ─────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS mv_revision_stats CASCADE;

CREATE MATERIALIZED VIEW mv_revision_stats AS
SELECT
  u.organization_id,
  COUNT(cr.id)                                                                        AS total,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'brouillon')                          AS nb_brouillon,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'soumis')                             AS nb_soumis,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'valide_manager')                     AS nb_valide_manager,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'valide_rh')                          AS nb_valide_rh,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'applique')                           AS nb_applique,
  COUNT(cr.id) FILTER (WHERE cr.status::text = 'refuse')                             AS nb_refuse,
  COALESCE(
    SUM(cr.increase_pct) FILTER (WHERE cr.status::text = 'applique')
    / NULLIF(COUNT(cr.id) FILTER (WHERE cr.status::text = 'applique'), 0),
    0
  )                                                                                   AS avg_increase_pct,
  COALESCE(
    SUM(cr.new_base_salary - cr.old_base_salary)
    FILTER (WHERE cr.status::text IN ('valide_rh','applique')), 0
  )                                                                                   AS total_budget_engage
FROM compensation_reviews cr
JOIN users u ON u.id = cr.user_id
GROUP BY u.organization_id;

CREATE UNIQUE INDEX ON mv_revision_stats (organization_id);
REVOKE ALL ON mv_revision_stats FROM anon, authenticated;

-- ─── 7. FONCTION refresh_compensation_mvs() ──────────────────

CREATE OR REPLACE FUNCTION refresh_compensation_mvs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_compensation_cycles_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revision_stats;
END;
$$;

-- ─── 8. INDEX PERFORMANCE ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_comp_reviews_status   ON compensation_reviews (status);
CREATE INDEX IF NOT EXISTS idx_comp_reviews_cycle    ON compensation_reviews (review_cycle_id);
CREATE INDEX IF NOT EXISTS idx_comp_reviews_user     ON compensation_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_comp_cycles_org_year  ON compensation_cycles (organization_id, year);