-- ============================================================
-- APEX RH — s132_task_dependency_cycle_guard.sql
-- Détection de cycles dans task_dependencies au niveau SQL
-- CTE récursive + trigger BEFORE INSERT
-- ✅ Empêche A→B si B dépend déjà de A (directement ou indirectement)
-- ============================================================

-- ─── Fonction : détecte si l'ajout créerait un cycle ──────
CREATE OR REPLACE FUNCTION check_task_dependency_cycle(
  p_task_id       uuid,   -- la tâche qui va "dépendre de"
  p_depends_on_id uuid    -- la tâche dont elle dépend
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- Retourne TRUE si un cycle serait créé
  -- Un cycle existe si p_depends_on_id est un ancêtre de p_task_id
  -- c.-à-d. si en remontant la chaîne de dépendances de p_task_id
  -- on atteint p_depends_on_id
  WITH RECURSIVE dependency_chain AS (
    -- Base : dépendances directes de p_depends_on_id
    SELECT depends_on_id AS ancestor_id
    FROM   task_dependencies
    WHERE  task_id = p_depends_on_id

    UNION ALL

    -- Récursion : remonter la chaîne
    SELECT td.depends_on_id
    FROM   task_dependencies td
    INNER JOIN dependency_chain dc ON td.task_id = dc.ancestor_id
  )
  SELECT EXISTS (
    SELECT 1 FROM dependency_chain WHERE ancestor_id = p_task_id
  );
$$;

-- ─── Trigger BEFORE INSERT : rejette les cycles ───────────
CREATE OR REPLACE FUNCTION prevent_task_dependency_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Vérifier l'auto-dépendance
  IF NEW.task_id = NEW.depends_on_id THEN
    RAISE EXCEPTION 'Une tâche ne peut pas dépendre d''elle-même (task_id = depends_on_id).'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Vérifier le cycle indirect
  IF check_task_dependency_cycle(NEW.task_id, NEW.depends_on_id) THEN
    RAISE EXCEPTION 'Dépendance circulaire détectée : cette dépendance créerait un cycle.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_task_dep_cycle ON task_dependencies;
CREATE TRIGGER trg_prevent_task_dep_cycle
  BEFORE INSERT ON task_dependencies
  FOR EACH ROW EXECUTE FUNCTION prevent_task_dependency_cycle();

-- ─── Vérification des cycles existants (audit) ────────────
-- À exécuter manuellement pour auditer les données existantes :
/*
WITH RECURSIVE dep_chain AS (
  SELECT task_id, depends_on_id, ARRAY[task_id] AS visited, false AS has_cycle
  FROM task_dependencies

  UNION ALL

  SELECT td.task_id, td.depends_on_id,
         dc.visited || td.task_id,
         td.task_id = ANY(dc.visited) AS has_cycle
  FROM task_dependencies td
  INNER JOIN dep_chain dc ON td.task_id = dc.depends_on_id
  WHERE NOT dc.has_cycle AND array_length(dc.visited, 1) < 20
)
SELECT DISTINCT task_id, depends_on_id
FROM dep_chain
WHERE has_cycle = true;
*/
