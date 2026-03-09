-- ============================================================
-- APEX RH — S125-A2 : Tags / Labels de tâches
-- Tables : task_tags + task_tag_links
-- ============================================================

-- 1. Table des tags (référentiel par organisation)
CREATE TABLE IF NOT EXISTS task_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6B7280',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

-- 2. Table de liaison tâche↔tag (N-N)
CREATE TABLE IF NOT EXISTS task_tag_links (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- 3. RLS
ALTER TABLE task_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_rls_task_tags" ON task_tags;
CREATE POLICY "org_rls_task_tags" ON task_tags
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "org_rls_task_tag_links" ON task_tag_links;
CREATE POLICY "org_rls_task_tag_links" ON task_tag_links
  USING (task_id IN (
    SELECT id FROM tasks WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS idx_task_tags_org ON task_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_tag_links_task ON task_tag_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tag_links_tag ON task_tag_links(tag_id);
