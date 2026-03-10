-- ============================================================
-- APEX RH — S125-A3 : Pièces jointes de tâches
-- Storage bucket : task-attachments
-- Table : task_attachments
-- ============================================================

-- 1. Table des pièces jointes
CREATE TABLE IF NOT EXISTS task_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  storage_path    TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_rls_task_attachments" ON task_attachments;
CREATE POLICY "org_rls_task_attachments" ON task_attachments
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_org  ON task_attachments(organization_id);

-- 4. Bucket Supabase Storage (à exécuter via Dashboard Supabase Storage)
-- Nom du bucket : task-attachments
-- Accès : privé (auth requise)
-- Taille max : 10 Mo par fichier
-- Types MIME autorisés : image/*, application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.*, text/plain,
--   application/vnd.ms-excel, application/zip

-- 5. Policy Storage (via Dashboard > Storage > Policies)
-- Allow authenticated users to upload to their org folder :
--   bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL
