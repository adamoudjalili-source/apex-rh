-- ============================================================
-- APEX RH — Migration Session 80
-- Entretiens Annuels — Mi-année + Auto-évaluation + Suivi managérial
-- ============================================================

-- ─── 1. ENUM review_type ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE review_type AS ENUM ('annual', 'mid_year', 'probation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Colonne review_type sur annual_reviews ───────────────
ALTER TABLE annual_reviews
  ADD COLUMN IF NOT EXISTS review_type review_type NOT NULL DEFAULT 'annual';

CREATE INDEX IF NOT EXISTS idx_annual_reviews_type
  ON annual_reviews(review_type);

-- ─── 3. Table review_self_assessments ───────────────────────
-- Auto-évaluation structurée (découplée du champ self_eval)
CREATE TABLE IF NOT EXISTS review_self_assessments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  review_id    uuid NOT NULL REFERENCES annual_reviews(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id),
  answers      jsonb NOT NULL DEFAULT '{}',
  -- Clés attendues dans answers :
  --   bilan.accomplissements, bilan.points_forts, bilan.difficultes
  --   competences.{qualite,delais,communication,travail_equipe,initiative,adaptabilite} : 1-5
  --   objectifs_proposes : [{title, description, deadline}]
  --   developpement.besoins_formation, developpement.souhaits_evolution
  --   commentaire_libre
  submitted_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),

  UNIQUE(review_id, user_id)
);

ALTER TABLE review_self_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON review_self_assessments FROM anon;

CREATE POLICY "rsa_org_select" ON review_self_assessments
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "rsa_owner_insert" ON review_self_assessments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "rsa_owner_update" ON review_self_assessments
  FOR UPDATE USING (
    user_id = auth.uid()
    AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_rsa_review   ON review_self_assessments(review_id);
CREATE INDEX IF NOT EXISTS idx_rsa_user     ON review_self_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_rsa_org      ON review_self_assessments(organization_id);

-- ─── 4. Table review_development_plans ──────────────────────
-- Plan de développement individuel (PDI) issu de l'entretien
CREATE TABLE IF NOT EXISTS review_development_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  review_id       uuid NOT NULL REFERENCES annual_reviews(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id),
  -- goals = [{id, title, description, category, deadline, actions:[{text,done}], status}]
  -- category : 'competence' | 'leadership' | 'mobilite' | 'formation' | 'autre'
  -- status   : 'pending' | 'in_progress' | 'completed' | 'abandoned'
  goals           jsonb NOT NULL DEFAULT '[]',
  next_check_date date,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  manager_comment text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE(review_id, user_id)
);

ALTER TABLE review_development_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON review_development_plans FROM anon;

CREATE POLICY "rdp_org_select" ON review_development_plans
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "rdp_upsert" ON review_development_plans
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_rdp_review ON review_development_plans(review_id);
CREATE INDEX IF NOT EXISTS idx_rdp_user   ON review_development_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_rdp_org    ON review_development_plans(organization_id);

-- ─── 5. RPC get_review_completion_stats ─────────────────────
CREATE OR REPLACE FUNCTION get_review_completion_stats(p_manager_id uuid)
RETURNS TABLE (
  campaign_id   uuid,
  campaign_title text,
  campaign_year  integer,
  total_reviews  bigint,
  pending_count  bigint,
  self_submitted bigint,
  completed_count bigint,
  signed_count   bigint,
  overdue_count  bigint,
  mid_year_count bigint,
  completion_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id                                                    AS campaign_id,
    c.title                                                 AS campaign_title,
    c.year                                                  AS campaign_year,
    COUNT(*)                                                AS total_reviews,
    COUNT(*) FILTER (WHERE r.status = 'pending')            AS pending_count,
    COUNT(*) FILTER (WHERE r.status = 'self_submitted')     AS self_submitted,
    COUNT(*) FILTER (WHERE r.status IN ('completed','signed')) AS completed_count,
    COUNT(*) FILTER (WHERE r.status = 'signed')             AS signed_count,
    COUNT(*) FILTER (
      WHERE r.status NOT IN ('completed','signed','archived')
      AND c.manager_eval_deadline < now()
    )                                                       AS overdue_count,
    COUNT(*) FILTER (WHERE r.review_type = 'mid_year')      AS mid_year_count,
    CASE WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE r.status IN ('completed','signed'))::numeric
        / COUNT(*) * 100, 1
      )
    END                                                     AS completion_pct
  FROM annual_review_campaigns c
  JOIN annual_reviews r ON r.campaign_id = c.id
  WHERE r.manager_id = p_manager_id
  GROUP BY c.id, c.title, c.year
  ORDER BY c.year DESC;
$$;

GRANT EXECUTE ON FUNCTION get_review_completion_stats(uuid) TO authenticated;

-- ─── 6. Trigger updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_rsa_updated_at ON review_self_assessments;
CREATE TRIGGER trg_rsa_updated_at
  BEFORE UPDATE ON review_self_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_rdp_updated_at ON review_development_plans;
CREATE TRIGGER trg_rdp_updated_at
  BEFORE UPDATE ON review_development_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
