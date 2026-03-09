-- ============================================================
-- APEX RH — Migration S128 : Templates de tâches
-- Tables : task_templates + task_template_items
-- RLS : isolation organization_id
-- ✅ S128-fix : valeurs enum user_role en minuscules
--   Rôles valides : super_admin · administrateur · directeur
--                   chef_division · chef_service · collaborateur
-- ============================================================

-- ─── Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_templates (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text DEFAULT 'general',
  priority        text DEFAULT 'normale' CHECK (priority IN ('basse','normale','haute','urgente')),
  estimated_hours numeric,
  color           text DEFAULT '#4F46E5',
  is_active       boolean DEFAULT true,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_template_items (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id      uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  priority         text DEFAULT 'normale' CHECK (priority IN ('basse','normale','haute','urgente')),
  delay_days       integer DEFAULT 0,
  checklist_items  jsonb DEFAULT '[]'::jsonb,
  order_index      integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- ─── Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_task_templates_org   ON task_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_cat   ON task_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_items_tmpl  ON task_template_items(template_id, order_index);

-- ─── RLS ───────────────────────────────────────────────────
ALTER TABLE task_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres de l'organisation
CREATE POLICY "task_templates_select" ON task_templates
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Écriture : administrateur, directeur, chef_division, chef_service
CREATE POLICY "task_templates_insert" ON task_templates
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid())
        IN ('administrateur','directeur','chef_division','chef_service')
  );

CREATE POLICY "task_templates_update" ON task_templates
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid())
        IN ('administrateur','directeur','chef_division','chef_service')
  );

-- Suppression (soft delete) : administrateur uniquement
CREATE POLICY "task_templates_delete" ON task_templates
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'administrateur'
  );

-- Items : accès via template_id → organization_id
CREATE POLICY "task_template_items_select" ON task_template_items
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM task_templates
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "task_template_items_write" ON task_template_items
  FOR ALL USING (
    template_id IN (
      SELECT id FROM task_templates
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid())
          IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- ─── Trigger updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_task_templates_updated_at();