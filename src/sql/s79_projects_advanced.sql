-- ============================================================
-- APEX RH — S79 : Projets — Connexions OKR + Budget + Gantt avancé
-- ============================================================

-- ─── 1. COLONNES SUPPLÉMENTAIRES SUR projects ──────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS budget_total   numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_spent   numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_id       uuid REFERENCES okr_cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_cycle_id ON projects(cycle_id);

-- ─── 2. TABLE project_okr_links ────────────────────────────

CREATE TABLE IF NOT EXISTS project_okr_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_id    uuid NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(project_id, objective_id)
);

ALTER TABLE project_okr_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_okr_links_project   ON project_okr_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_okr_links_objective ON project_okr_links(objective_id);
CREATE INDEX IF NOT EXISTS idx_project_okr_links_org       ON project_okr_links(organization_id);

CREATE POLICY "org_isolation" ON project_okr_links
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ─── 3. TABLE project_budget_lines ─────────────────────────

CREATE TABLE IF NOT EXISTS project_budget_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category        text NOT NULL,            -- 'ressources_humaines' | 'materiel' | 'logiciel' | 'formation' | 'autre'
  label           text NOT NULL,
  amount_planned  numeric(15,2) NOT NULL DEFAULT 0,
  amount_actual   numeric(15,2) NOT NULL DEFAULT 0,
  note            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project ON project_budget_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_lines_org     ON project_budget_lines(organization_id);

CREATE POLICY "org_isolation" ON project_budget_lines
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ─── 4. TABLE project_milestones (jalons avancés) ──────────
-- Distinct de `milestones` existant : jalons liés à des tâches et à des KRs

CREATE TABLE IF NOT EXISTS project_advanced_milestones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  due_date        date NOT NULL,
  is_reached      boolean DEFAULT false,
  reached_at      timestamptz,
  key_result_id   uuid REFERENCES key_results(id) ON DELETE SET NULL,  -- lien KR optionnel
  position        integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE project_advanced_milestones ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_proj_adv_ms_project ON project_advanced_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_adv_ms_org     ON project_advanced_milestones(organization_id);

CREATE POLICY "org_isolation" ON project_advanced_milestones
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ─── 5. RPC get_projects_gantt ─────────────────────────────
-- Retourne les tâches + jalons avancés pour le Gantt multi-projets

CREATE OR REPLACE FUNCTION get_projects_gantt(
  p_start date,
  p_end   date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := (SELECT organization_id FROM users WHERE id = auth.uid());
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'projects', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'status', p.status,
          'start_date', p.start_date,
          'end_date', p.end_date,
          'progress', p.progress,
          'budget_total', p.budget_total,
          'budget_spent', p.budget_spent,
          'tasks', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', t.id,
                'title', t.title,
                'status', t.status,
                'priority', t.priority,
                'start_date', t.start_date,
                'due_date', t.due_date,
                'estimated_minutes', t.estimated_minutes,
                'project_id', p.id,
                'project_name', p.name,
                'assignees', COALESCE((
                  SELECT jsonb_agg(jsonb_build_object('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name))
                  FROM task_assignees ta2
                  JOIN users u ON u.id = ta2.user_id
                  WHERE ta2.task_id = t.id
                ), '[]')
              )
            )
            FROM project_tasks pt
            JOIN tasks t ON t.id = pt.task_id
            WHERE pt.project_id = p.id
              AND t.is_archived = false
              AND (t.start_date <= p_end OR t.due_date >= p_start OR t.start_date IS NULL)
          ), '[]'),
          'milestones', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', m.id,
                'title', m.title,
                'due_date', m.due_date,
                'is_reached', m.is_reached,
                'project_id', p.id,
                'project_name', p.name
              )
            )
            FROM project_advanced_milestones m
            WHERE m.project_id = p.id
              AND m.due_date BETWEEN p_start AND p_end
          ), '[]')
        )
      )
      FROM projects p
      WHERE p.organization_id = v_org_id
        AND p.is_archived = false
        AND (p.end_date >= p_start OR p.end_date IS NULL)
    ), '[]')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_projects_gantt(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION get_projects_gantt(date, date) TO authenticated;

-- ─── 6. RPC get_project_budget_summary ─────────────────────

CREATE OR REPLACE FUNCTION get_project_budget_summary(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := (SELECT organization_id FROM users WHERE id = auth.uid());
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_planned', COALESCE(SUM(amount_planned), 0),
      'total_actual',  COALESCE(SUM(amount_actual), 0),
      'variance',      COALESCE(SUM(amount_planned) - SUM(amount_actual), 0),
      'by_category',   jsonb_agg(
        jsonb_build_object(
          'category', category,
          'planned', SUM(amount_planned),
          'actual', SUM(amount_actual)
        )
      )
    )
    FROM project_budget_lines
    WHERE project_id = p_project_id
      AND organization_id = v_org_id
    GROUP BY project_id
  );
END;
$$;

REVOKE ALL ON FUNCTION get_project_budget_summary(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_project_budget_summary(uuid) TO authenticated;
