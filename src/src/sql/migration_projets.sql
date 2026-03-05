-- ============================================================
-- APEX RH — Migration Module Projets
-- Session 11 — Tables, ENUMs, RLS, Index, Triggers
-- ============================================================
-- ⚠️ Exécuter ce script ENTIER dans le SQL Editor de Supabase
-- Les tables projets de la Session 2 sont recréées proprement

-- ─── 1. NETTOYAGE ────────────────────────────────────────
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS deliverables CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS project_priority CASCADE;
DROP TYPE IF EXISTS milestone_status CASCADE;
DROP TYPE IF EXISTS deliverable_status CASCADE;
DROP TYPE IF EXISTS risk_level CASCADE;
DROP TYPE IF EXISTS risk_status CASCADE;
DROP TYPE IF EXISTS project_member_role CASCADE;

-- ─── 2. ENUMS ────────────────────────────────────────────
CREATE TYPE project_status AS ENUM ('planifie', 'en_cours', 'en_pause', 'termine', 'annule');
CREATE TYPE project_priority AS ENUM ('basse', 'moyenne', 'haute', 'critique');
CREATE TYPE milestone_status AS ENUM ('en_attente', 'en_cours', 'atteint', 'en_retard');
CREATE TYPE deliverable_status AS ENUM ('a_faire', 'en_cours', 'soumis', 'valide', 'rejete');
CREATE TYPE risk_level AS ENUM ('faible', 'moyen', 'eleve', 'critique');
CREATE TYPE risk_status AS ENUM ('identifie', 'en_cours', 'resolu', 'accepte');
CREATE TYPE project_member_role AS ENUM ('chef_projet', 'membre', 'observateur');

-- ─── 3. TABLE PROJECTS ──────────────────────────────────
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'planifie',
  priority project_priority NOT NULL DEFAULT 'moyenne',
  start_date date,
  end_date date,
  budget numeric DEFAULT 0,
  budget_spent numeric DEFAULT 0,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  owner_id uuid NOT NULL REFERENCES users(id),
  direction_id uuid REFERENCES directions(id),
  division_id uuid REFERENCES divisions(id),
  service_id uuid REFERENCES services(id),
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT projects_direction_id_fkey FOREIGN KEY (direction_id) REFERENCES directions(id),
  CONSTRAINT projects_division_id_fkey FOREIGN KEY (division_id) REFERENCES divisions(id),
  CONSTRAINT projects_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id)
);

-- ─── 4. TABLE PROJECT_MEMBERS ───────────────────────────
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  role project_member_role NOT NULL DEFAULT 'membre',
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (project_id, user_id)
);

-- ─── 5. TABLE MILESTONES ────────────────────────────────
CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  description text,
  due_date date,
  completed_at timestamptz,
  status milestone_status NOT NULL DEFAULT 'en_attente',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ─── 6. TABLE DELIVERABLES ──────────────────────────────
CREATE TABLE deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  title varchar NOT NULL,
  description text,
  due_date date,
  status deliverable_status NOT NULL DEFAULT 'a_faire',
  assignee_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT deliverables_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
  CONSTRAINT deliverables_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- ─── 7. TABLE RISKS ─────────────────────────────────────
CREATE TABLE risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  description text,
  probability risk_level NOT NULL DEFAULT 'moyen',
  impact risk_level NOT NULL DEFAULT 'moyen',
  mitigation text,
  status risk_status NOT NULL DEFAULT 'identifie',
  owner_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT risks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT risks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ─── 8. TABLE PROJECT_TASKS (liaison tâches existantes) ─
CREATE TABLE project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT project_tasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE (project_id, task_id)
);

-- ─── 9. INDEX ────────────────────────────────────────────
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_direction ON projects(direction_id);
CREATE INDEX idx_projects_division ON projects(division_id);
CREATE INDEX idx_projects_service ON projects(service_id);
CREATE INDEX idx_projects_archived ON projects(is_archived);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_deliverables_assignee ON deliverables(assignee_id);
CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_task ON project_tasks(task_id);

-- ─── 10. TRIGGER updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at();

-- ─── 11. TRIGGER auto-recalcul progress ─────────────────
-- Recalcule le % d'avancement basé sur les jalons atteints
CREATE OR REPLACE FUNCTION recalculate_project_progress()
RETURNS trigger AS $$
DECLARE
  total_ms integer;
  done_ms integer;
  proj_id uuid;
BEGIN
  -- Déterminer le project_id selon l'opération
  IF TG_OP = 'DELETE' THEN
    proj_id := OLD.project_id;
  ELSE
    proj_id := NEW.project_id;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'atteint')
  INTO total_ms, done_ms
  FROM milestones WHERE project_id = proj_id;

  IF total_ms > 0 THEN
    UPDATE projects SET progress = ROUND((done_ms::numeric / total_ms) * 100)
    WHERE id = proj_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_milestone_progress ON milestones;
CREATE TRIGGER trg_milestone_progress
  AFTER INSERT OR UPDATE OR DELETE ON milestones
  FOR EACH ROW EXECUTE FUNCTION recalculate_project_progress();

-- ─── 12. RLS — ENABLE ───────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- ─── 13. HELPER FUNCTION ────────────────────────────────
-- Vérifie si l'utilisateur est membre ou propriétaire du projet
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid()
  )
$$;

-- ─── 14. POLITIQUES RLS — PROJECTS ─────────────────────
-- Admin voit tout, les autres voient selon leur périmètre
CREATE POLICY projects_select ON projects FOR SELECT USING (
  get_my_role()::text = 'administrateur'
  OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid())
  OR direction_id IN (SELECT direction_id FROM users WHERE id = auth.uid())
  OR division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
  OR service_id IN (SELECT service_id FROM users WHERE id = auth.uid())
);

CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY projects_update ON projects FOR UPDATE USING (
  get_my_role()::text = 'administrateur'
  OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid() AND role = 'chef_projet')
);

CREATE POLICY projects_delete ON projects FOR DELETE USING (
  get_my_role()::text = 'administrateur'
  OR owner_id = auth.uid()
);

-- ─── 15. POLITIQUES RLS — PROJECT_MEMBERS ───────────────
CREATE POLICY pm_select ON project_members FOR SELECT USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY pm_insert ON project_members FOR INSERT WITH CHECK (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY pm_delete ON project_members FOR DELETE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

-- ─── 16. POLITIQUES RLS — MILESTONES ────────────────────
CREATE POLICY ms_select ON milestones FOR SELECT USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (
    p.direction_id IN (SELECT direction_id FROM users WHERE id = auth.uid())
    OR p.division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR p.service_id IN (SELECT service_id FROM users WHERE id = auth.uid())
  ))
);

CREATE POLICY ms_insert ON milestones FOR INSERT WITH CHECK (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY ms_update ON milestones FOR UPDATE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY ms_delete ON milestones FOR DELETE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

-- ─── 17. POLITIQUES RLS — DELIVERABLES ──────────────────
CREATE POLICY del_select ON deliverables FOR SELECT USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
  OR assignee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (
    p.direction_id IN (SELECT direction_id FROM users WHERE id = auth.uid())
    OR p.division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR p.service_id IN (SELECT service_id FROM users WHERE id = auth.uid())
  ))
);

CREATE POLICY del_insert ON deliverables FOR INSERT WITH CHECK (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY del_update ON deliverables FOR UPDATE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur' OR assignee_id = auth.uid()
);

CREATE POLICY del_delete ON deliverables FOR DELETE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

-- ─── 18. POLITIQUES RLS — RISKS ─────────────────────────
CREATE POLICY risks_select ON risks FOR SELECT USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (
    p.direction_id IN (SELECT direction_id FROM users WHERE id = auth.uid())
    OR p.division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR p.service_id IN (SELECT service_id FROM users WHERE id = auth.uid())
  ))
);

CREATE POLICY risks_insert ON risks FOR INSERT WITH CHECK (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY risks_update ON risks FOR UPDATE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY risks_delete ON risks FOR DELETE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

-- ─── 19. POLITIQUES RLS — PROJECT_TASKS ─────────────────
CREATE POLICY pt_select ON project_tasks FOR SELECT USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
  OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND (
    p.direction_id IN (SELECT direction_id FROM users WHERE id = auth.uid())
    OR p.division_id IN (SELECT division_id FROM users WHERE id = auth.uid())
    OR p.service_id IN (SELECT service_id FROM users WHERE id = auth.uid())
  ))
);

CREATE POLICY pt_insert ON project_tasks FOR INSERT WITH CHECK (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

CREATE POLICY pt_delete ON project_tasks FOR DELETE USING (
  is_project_member(project_id) OR get_my_role()::text = 'administrateur'
);

-- ─── DONE ────────────────────────────────────────────────
-- 7 ENUMs, 6 tables, 16 index, 2 triggers, 1 helper, 18 politiques RLS
-- Prêt pour le frontend !
