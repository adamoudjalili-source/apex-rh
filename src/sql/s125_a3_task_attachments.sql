-- ============================================================
-- APEX RH — S125-A3 : Pièces jointes de tâches (version corrigée)
-- La table task_attachments existe déjà — on ajoute les colonnes manquantes
-- ============================================================

-- 1. Ajouter les colonnes manquantes si elles n'existent pas
ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS uploaded_by     UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS file_name       TEXT,
  ADD COLUMN IF NOT EXISTS file_size       BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type       TEXT,
  ADD COLUMN IF NOT EXISTS storage_path    TEXT,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT NOW();

-- 2. Remplir organization_id depuis la tâche parente (pour les lignes existantes)
UPDATE task_attachments ta
SET organization_id = t.organization_id
FROM tasks t
WHERE ta.task_id = t.id
  AND ta.organization_id IS NULL;

-- 3. Passer organization_id en NOT NULL maintenant qu'elle est remplie
ALTER TABLE task_attachments
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_rls_task_attachments" ON task_attachments;
CREATE POLICY "org_rls_task_attachments" ON task_attachments
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_org  ON task_attachments(organization_id);

-- 6. Bucket Supabase Storage (via Dashboard > Storage)
-- Nom : task-attachments · Accès : privé · Taille max : 10 Mo
-- Types MIME : image/*, application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.*, text/plain,
--   application/vnd.ms-excel, application/zip

-- 7. Policy Storage (via Dashboard > Storage > Policies)
-- Allow authenticated users : bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL