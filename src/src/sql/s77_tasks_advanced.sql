-- ============================================================
-- APEX RH — S77 : Tâches Avancées
-- Dépendances + Récurrence + Suivi de temps + Charge + Gantt
-- ============================================================

-- ─── ENUM : type de dépendance ───────────────────────────────
CREATE TYPE task_dependency_type AS ENUM ('blocks', 'related');

-- ─── ENUM : fréquence récurrence ─────────────────────────────
CREATE TYPE task_recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- ─── COLONNES SUPPLÉMENTAIRES SUR tasks ──────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS workload_score    integer DEFAULT NULL CHECK (workload_score BETWEEN 0 AND 10);

-- ─── TABLE : task_dependencies ───────────────────────────────
CREATE TABLE IF NOT EXISTS task_dependencies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id        uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id  uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type task_dependency_type NOT NULL DEFAULT 'blocks',
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_id)
);

-- ─── TABLE : task_recurrences ────────────────────────────────
CREATE TABLE IF NOT EXISTS task_recurrences (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id        uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  frequency      task_recurrence_frequency NOT NULL,
  interval_value integer NOT NULL DEFAULT 1,   -- ex: toutes les 2 semaines
  days_of_week   integer[] DEFAULT NULL,        -- 0=Lun … 6=Dim
  day_of_month   integer DEFAULT NULL,
  start_date     date NOT NULL DEFAULT CURRENT_DATE,
  end_date       date DEFAULT NULL,
  max_occurrences integer DEFAULT NULL,
  last_generated date DEFAULT NULL,
  occurrences_count integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id)
);

-- ─── TABLE : task_time_tracking ──────────────────────────────
CREATE TABLE IF NOT EXISTS task_time_tracking (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id        uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minutes_spent  integer NOT NULL CHECK (minutes_spent > 0),
  logged_at      timestamptz NOT NULL DEFAULT now(),
  note           text DEFAULT NULL
);

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_task_dep_task_id   ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dep_on_id     ON task_dependencies(depends_on_id);
CREATE INDEX IF NOT EXISTS idx_task_recur_task    ON task_recurrences(task_id);
CREATE INDEX IF NOT EXISTS idx_task_recur_active  ON task_recurrences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_task_time_task     ON task_time_tracking(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_user     ON task_time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_org      ON task_time_tracking(organization_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE task_dependencies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_recurrences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_tracking  ENABLE ROW LEVEL SECURITY;

-- task_dependencies
CREATE POLICY "org_isolation_dep" ON task_dependencies
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- task_recurrences
CREATE POLICY "org_isolation_recur" ON task_recurrences
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- task_time_tracking : lire tout l'org, écrire ses propres entrées
CREATE POLICY "org_read_time" ON task_time_tracking
  FOR SELECT USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "own_insert_time" ON task_time_tracking
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "own_delete_time" ON task_time_tracking
  FOR DELETE USING (user_id = auth.uid());

-- ─── MATERIALIZED VIEW : mv_team_workload ────────────────────
-- Agrège les minutes passées + charge estimée par user sur les 30 derniers jours
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_team_workload AS
SELECT
  u.organization_id,
  u.id                                  AS user_id,
  u.email,
  COUNT(DISTINCT ta.task_id)            AS assigned_tasks,
  COUNT(DISTINCT t.id) FILTER (
    WHERE t.status NOT IN ('terminee','bloquee')
  )                                     AS active_tasks,
  COALESCE(SUM(t.estimated_minutes) FILTER (
    WHERE t.status NOT IN ('terminee','bloquee')
  ), 0)                                 AS total_estimated_minutes,
  COALESCE(SUM(tt.minutes_spent) FILTER (
    WHERE tt.logged_at >= now() - interval '30 days'
  ), 0)                                 AS logged_minutes_30d,
  COALESCE(AVG(t.workload_score) FILTER (
    WHERE t.status NOT IN ('terminee','bloquee')
    AND t.workload_score IS NOT NULL
  ), 0)                                 AS avg_workload_score
FROM users u
LEFT JOIN task_assignees ta ON ta.user_id = u.id
LEFT JOIN tasks t ON t.id = ta.task_id
  AND t.organization_id = u.organization_id
LEFT JOIN task_time_tracking tt ON tt.user_id = u.id
  AND tt.organization_id = u.organization_id
GROUP BY u.organization_id, u.id, u.email;

-- Sécurité : ne jamais exposer directement à l'API
REVOKE ALL ON mv_team_workload FROM anon, authenticated;

-- Index sur la MV
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_workload_user ON mv_team_workload(organization_id, user_id);

-- Fonction refresh
CREATE OR REPLACE FUNCTION refresh_team_workload_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_workload;
END;
$$;

-- ─── FONCTION RPC : get_team_workload ────────────────────────
CREATE OR REPLACE FUNCTION get_team_workload(p_organization_id uuid)
RETURNS TABLE (
  user_id              uuid,
  email                text,
  assigned_tasks       bigint,
  active_tasks         bigint,
  total_estimated_minutes bigint,
  logged_minutes_30d   bigint,
  avg_workload_score   numeric
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Vérifier que l'appelant appartient à l'organisation
  IF (SELECT organization_id FROM users WHERE id = auth.uid()) != p_organization_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    w.user_id, w.email, w.assigned_tasks, w.active_tasks,
    w.total_estimated_minutes, w.logged_minutes_30d, w.avg_workload_score
  FROM mv_team_workload w
  WHERE w.organization_id = p_organization_id
  ORDER BY w.avg_workload_score DESC, w.active_tasks DESC;
END;
$$;

-- ─── FONCTION RPC : get_gantt_tasks ──────────────────────────
CREATE OR REPLACE FUNCTION get_gantt_tasks(
  p_organization_id uuid,
  p_start_date      date DEFAULT CURRENT_DATE,
  p_end_date        date DEFAULT CURRENT_DATE + interval '28 days'
)
RETURNS TABLE (
  id              uuid,
  title           text,
  status          text,
  priority        text,
  start_date      date,
  due_date        date,
  estimated_minutes integer,
  assignees       jsonb
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT organization_id FROM users WHERE id = auth.uid()) != p_organization_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.status::text,
    t.priority::text,
    t.created_at::date AS start_date,
    t.due_date,
    t.estimated_minutes,
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'id', u.id,
        'email', u.email
      )) FILTER (WHERE u.id IS NOT NULL),
      '[]'::jsonb
    ) AS assignees
  FROM tasks t
  LEFT JOIN task_assignees ta ON ta.task_id = t.id
  LEFT JOIN users u ON u.id = ta.user_id
  WHERE t.organization_id = p_organization_id
    AND t.due_date IS NOT NULL
    AND (
      t.due_date >= p_start_date
      OR (t.created_at::date <= p_end_date AND t.status NOT IN ('terminee','bloquee'))
    )
    AND t.status != 'terminee'
  GROUP BY t.id
  ORDER BY t.due_date NULLS LAST, t.created_at;
END;
$$;