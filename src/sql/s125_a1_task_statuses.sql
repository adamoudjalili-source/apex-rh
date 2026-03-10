-- ============================================================
-- APEX RH — S125-A1 : Nouveaux statuts tâches
-- Ajoute : en_attente, annule
-- ============================================================

-- 1. Supprimer la contrainte actuelle
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 2. Recréer avec les 7 statuts
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'backlog',
    'a_faire',
    'en_cours',
    'en_attente',
    'en_revue',
    'terminee',
    'bloquee',
    'annule'
  ));

-- 3. Mettre à jour la RPC update_task_status pour accepter les nouveaux statuts
CREATE OR REPLACE FUNCTION update_task_status(
  target_task_id UUID,
  new_status TEXT,
  old_status TEXT
) RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET status = new_status, updated_at = NOW()
  WHERE id = target_task_id;

  INSERT INTO task_activity_log (task_id, user_id, action, old_value, new_value)
  VALUES (target_task_id, auth.uid(), 'status_changed', old_status, new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
