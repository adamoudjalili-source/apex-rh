-- ============================================================
-- APEX RH — s81_feedback360_advanced.sql
-- Session 81 — Feedback 360° : Cycles planifiés + tendances
-- ============================================================

-- ─── 1. Enum statuts ────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE feedback360_status AS ENUM ('draft','active','closed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback360_request_status AS ENUM ('pending','in_progress','submitted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. feedback360_templates ───────────────────────────────

CREATE TABLE IF NOT EXISTS feedback360_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  -- competences: [{key, label, questions:[{key, label, type:'rating'|'text'}]}]
  competences      jsonb NOT NULL DEFAULT '[]',
  is_default       boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback360_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback360_templates_org" ON feedback360_templates
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

REVOKE ALL ON feedback360_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback360_templates TO authenticated;

-- ─── 3. feedback360_cycles ──────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback360_cycles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  status           feedback360_status NOT NULL DEFAULT 'draft',
  template_id      uuid REFERENCES feedback360_templates(id) ON DELETE SET NULL,
  -- scope: 'all' | 'department' | 'custom'
  scope            text NOT NULL DEFAULT 'all',
  scope_filter     jsonb,   -- ex: {"department_ids": [...]} ou {"user_ids": [...]}
  created_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  launched_at      timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback360_cycles_org ON feedback360_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback360_cycles_status ON feedback360_cycles(status);

ALTER TABLE feedback360_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback360_cycles_org" ON feedback360_cycles
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

REVOKE ALL ON feedback360_cycles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback360_cycles TO authenticated;

-- ─── 4. feedback360_requests ────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback360_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cycle_id         uuid NOT NULL REFERENCES feedback360_cycles(id) ON DELETE CASCADE,
  evaluatee_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluator_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship     text NOT NULL DEFAULT 'peer',  -- 'manager'|'peer'|'direct_report'|'self'
  status           feedback360_request_status NOT NULL DEFAULT 'pending',
  is_anonymous     boolean NOT NULL DEFAULT true,
  -- answers: {competences:{[compKey]:{[qKey]:{rating:number, comment:string}}}, overall_comment:string}
  answers          jsonb,
  submitted_at     timestamptz,
  declined_reason  text,
  reminded_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, evaluatee_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback360_requests_cycle ON feedback360_requests(cycle_id);
CREATE INDEX IF NOT EXISTS idx_feedback360_requests_evaluatee ON feedback360_requests(evaluatee_id);
CREATE INDEX IF NOT EXISTS idx_feedback360_requests_evaluator ON feedback360_requests(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_feedback360_requests_org ON feedback360_requests(organization_id);

ALTER TABLE feedback360_requests ENABLE ROW LEVEL SECURITY;

-- Un utilisateur voit ses évaluations à remplir + les évaluations de ses subordonnés (manager) + tout pour admin
CREATE POLICY "feedback360_requests_select" ON feedback360_requests
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      evaluator_id = auth.uid()      -- évaluations que je dois faire
      OR evaluatee_id = auth.uid()   -- mes propres évaluations reçues (agrégées, jamais individuelles)
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

CREATE POLICY "feedback360_requests_insert" ON feedback360_requests
  FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "feedback360_requests_update" ON feedback360_requests
  FOR UPDATE USING (
    evaluator_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

REVOKE ALL ON feedback360_requests FROM anon;
GRANT SELECT, INSERT, UPDATE ON feedback360_requests TO authenticated;

-- ─── 5. Materialized View — tendances ───────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_feedback360_trends AS
SELECT
  r.organization_id,
  r.evaluatee_id,
  r.cycle_id,
  c.title   AS cycle_title,
  c.end_date AS cycle_end_date,
  c.status::text AS cycle_status,
  comp_key,
  ROUND(AVG((comp_answers->>'rating')::numeric), 2) AS avg_rating,
  COUNT(*)  AS response_count
FROM feedback360_requests r
JOIN feedback360_cycles c ON c.id = r.cycle_id
CROSS JOIN LATERAL jsonb_each(r.answers->'competences') AS comps(comp_key, comp_val)
CROSS JOIN LATERAL jsonb_each(comp_val) AS qs(q_key, comp_answers)
WHERE r.status = 'submitted'
  AND r.is_anonymous = true
  AND (comp_answers->>'rating') IS NOT NULL
GROUP BY r.organization_id, r.evaluatee_id, r.cycle_id, c.title, c.end_date, c.status, comp_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_feedback360_trends_pk
  ON mv_feedback360_trends(organization_id, evaluatee_id, cycle_id, comp_key);

REVOKE ALL ON mv_feedback360_trends FROM anon, authenticated;

-- ─── 6. RPC — synthèse scores d'un utilisateur ──────────────

CREATE OR REPLACE FUNCTION get_feedback360_summary(
  p_evaluatee_id uuid,
  p_cycle_id     uuid
)
RETURNS TABLE (
  comp_key       text,
  avg_rating     numeric,
  response_count bigint,
  min_rating     numeric,
  max_rating     numeric,
  trend_vs_prev  numeric   -- delta vs cycle précédent (null si premier)
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
  v_prev_cycle_id uuid;
  v_prev_end_date date;
  v_curr_end_date date;
BEGIN
  -- Vérification organisation
  SELECT organization_id INTO v_org_id
  FROM users WHERE id = auth.uid();

  -- Date du cycle courant
  SELECT end_date INTO v_curr_end_date
  FROM feedback360_cycles WHERE id = p_cycle_id;

  -- Cycle précédent le plus récent pour cet évalué
  SELECT id, end_date INTO v_prev_cycle_id, v_prev_end_date
  FROM feedback360_cycles c
  WHERE c.organization_id = v_org_id
    AND c.end_date < v_curr_end_date
    AND c.status IN ('closed','archived')
    AND EXISTS (
      SELECT 1 FROM feedback360_requests r2
      WHERE r2.cycle_id = c.id
        AND r2.evaluatee_id = p_evaluatee_id
        AND r2.status = 'submitted'
    )
  ORDER BY end_date DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    curr.comp_key,
    curr.avg_rating,
    curr.response_count,
    MIN((comp_answers->>'rating')::numeric)  AS min_rating,
    MAX((comp_answers->>'rating')::numeric)  AS max_rating,
    CASE WHEN prev.avg_rating IS NOT NULL
         THEN ROUND(curr.avg_rating - prev.avg_rating, 2)
         ELSE NULL
    END AS trend_vs_prev
  FROM mv_feedback360_trends curr
  LEFT JOIN mv_feedback360_trends prev
    ON prev.evaluatee_id = curr.evaluatee_id
   AND prev.comp_key     = curr.comp_key
   AND prev.cycle_id     = v_prev_cycle_id
  -- On rejoint les données brutes pour min/max
  JOIN feedback360_requests r ON r.cycle_id = p_cycle_id
                              AND r.evaluatee_id = p_evaluatee_id
                              AND r.status = 'submitted'
  CROSS JOIN LATERAL jsonb_each(r.answers->'competences') AS comps(ck, comp_val)
  CROSS JOIN LATERAL jsonb_each(comp_val) AS qs(q_key, comp_answers)
  WHERE curr.cycle_id = p_cycle_id
    AND curr.evaluatee_id = p_evaluatee_id
    AND curr.organization_id = v_org_id
    AND comps.ck = curr.comp_key
    AND (comp_answers->>'rating') IS NOT NULL
  GROUP BY curr.comp_key, curr.avg_rating, curr.response_count, prev.avg_rating;
END;
$$;

-- ─── 7. Fonction de refresh MV ──────────────────────────────

CREATE OR REPLACE FUNCTION refresh_feedback360_trends_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_feedback360_trends;
END;
$$;

-- ─── 8. Template par défaut ─────────────────────────────────

-- Inséré seulement si la table est vide pour l'org (géré côté app)
-- Les templates sont créés par les admins via l'interface

-- ─── 9. Indexes supplémentaires ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_feedback360_templates_org
  ON feedback360_templates(organization_id);

-- ─── 10. updated_at triggers ────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_feedback360_templates_updated_at
    BEFORE UPDATE ON feedback360_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_feedback360_cycles_updated_at
    BEFORE UPDATE ON feedback360_cycles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_feedback360_requests_updated_at
    BEFORE UPDATE ON feedback360_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
