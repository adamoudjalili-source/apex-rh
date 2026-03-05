-- ============================================================
-- APEX RH — Migration Session 41 — "Mon Développement" + PDI
-- Tables : development_plans, pdi_actions
-- Connexion : review_evaluations → pdi_actions → objectives
-- ============================================================

-- ─── 1. PLANS DE DÉVELOPPEMENT INDIVIDUEL ───────────────────

CREATE TABLE IF NOT EXISTS development_plans (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Mon Plan de Développement',
  period_label text NOT NULL DEFAULT '2025',   -- ex : '2025', 'Q2 2025'
  objectives   text,                            -- objectifs globaux libres
  notes        text,                            -- notes privées
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, period_label)
);

-- ─── 2. ACTIONS PDI ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pdi_actions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id          uuid REFERENCES development_plans(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES users(id) ON DELETE CASCADE,
  competency_key   text DEFAULT 'other'
                   CHECK (competency_key IN
                     ('quality','deadlines','communication','teamwork','initiative','other')),
  title            text NOT NULL,
  description      text,
  due_date         date,
  status           text DEFAULT 'todo'
                   CHECK (status IN ('todo','in_progress','done')),
  priority         text DEFAULT 'medium'
                   CHECK (priority IN ('low','medium','high')),
  review_cycle_id  uuid REFERENCES review_cycles(id) ON DELETE SET NULL,
  completed_at     timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ─── INDEX ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_development_plans_user_id
  ON development_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_pdi_actions_plan_id
  ON pdi_actions(plan_id);

CREATE INDEX IF NOT EXISTS idx_pdi_actions_user_id
  ON pdi_actions(user_id);

CREATE INDEX IF NOT EXISTS idx_pdi_actions_status
  ON pdi_actions(status);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdi_actions        ENABLE ROW LEVEL SECURITY;

-- Plans : chaque utilisateur voit/modifie son propre plan
-- Les managers peuvent lire les plans de leur équipe

DROP POLICY IF EXISTS "plans_select_own"   ON development_plans;
DROP POLICY IF EXISTS "plans_insert_own"   ON development_plans;
DROP POLICY IF EXISTS "plans_update_own"   ON development_plans;
DROP POLICY IF EXISTS "plans_delete_own"   ON development_plans;
DROP POLICY IF EXISTS "plans_manager_read" ON development_plans;

CREATE POLICY "plans_select_own" ON development_plans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "plans_insert_own" ON development_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "plans_update_own" ON development_plans
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "plans_delete_own" ON development_plans
  FOR DELETE USING (user_id = auth.uid());

-- Managers voient les plans de leur service (via join users)
CREATE POLICY "plans_manager_read" ON development_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users manager
      WHERE manager.id = auth.uid()
        AND manager.role IN ('administrateur','directeur','chef_division','chef_service')
        AND EXISTS (
          SELECT 1 FROM users collab
          WHERE collab.id = development_plans.user_id
            AND (
              collab.service_id   = manager.service_id   OR
              collab.division_id  = manager.division_id  OR
              collab.direction_id = manager.direction_id OR
              manager.role        = 'administrateur'
            )
        )
    )
  );

-- Actions PDI
DROP POLICY IF EXISTS "pdi_select_own"    ON pdi_actions;
DROP POLICY IF EXISTS "pdi_insert_own"    ON pdi_actions;
DROP POLICY IF EXISTS "pdi_update_own"    ON pdi_actions;
DROP POLICY IF EXISTS "pdi_delete_own"    ON pdi_actions;
DROP POLICY IF EXISTS "pdi_manager_read"  ON pdi_actions;

CREATE POLICY "pdi_select_own" ON pdi_actions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "pdi_insert_own" ON pdi_actions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "pdi_update_own" ON pdi_actions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "pdi_delete_own" ON pdi_actions
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "pdi_manager_read" ON pdi_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users manager
      WHERE manager.id = auth.uid()
        AND manager.role IN ('administrateur','directeur','chef_division','chef_service')
        AND EXISTS (
          SELECT 1 FROM users collab
          WHERE collab.id = pdi_actions.user_id
            AND (
              collab.service_id   = manager.service_id   OR
              collab.division_id  = manager.division_id  OR
              collab.direction_id = manager.direction_id OR
              manager.role        = 'administrateur'
            )
        )
    )
  );

-- ─── TRIGGER updated_at ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_development_plans_updated_at ON development_plans;
CREATE TRIGGER trg_development_plans_updated_at
  BEFORE UPDATE ON development_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pdi_actions_updated_at ON pdi_actions;
CREATE TRIGGER trg_pdi_actions_updated_at
  BEFORE UPDATE ON pdi_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── DONE ────────────────────────────────────────────────────
-- Pour déployer :
-- Supabase → SQL Editor → Coller et exécuter ce fichier
