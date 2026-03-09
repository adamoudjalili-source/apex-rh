-- ============================================================
-- APEX RH — S125-A1 : Statuts tâches (version ENUM PostgreSQL)
-- Corrigé : task_status est un TYPE ENUM, pas un CHECK TEXT
-- ============================================================

-- 1. Ajouter les nouvelles valeurs à l'enum existant
--    (ADD VALUE est idempotent en PostgreSQL 12+ avec IF NOT EXISTS)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'en_attente';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'annule';

-- 2. Mettre à jour la RPC update_task_status pour accepter les 8 valeurs
CREATE OR REPLACE FUNCTION update_task_status(
  target_task_id UUID,
  new_status     task_status,
  old_status     task_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tasks
  SET status = new_status, updated_at = NOW()
  WHERE id = target_task_id;

  INSERT INTO task_activity_log (task_id, user_id, action, old_value, new_value)
  VALUES (target_task_id, auth.uid(), 'status_changed', old_status::text, new_status::text);
END;
$$;