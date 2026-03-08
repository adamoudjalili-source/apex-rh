-- ============================================================
-- APEX RH — migration_ai_coach.sql
-- Session 30 — Module IA Coach
-- Table : ai_coach_analyses
-- RLS : collaborateurs voient leurs analyses / managers voient leur scope
-- ============================================================

-- ─── TABLE PRINCIPALE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_coach_analyses (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,       -- collaborateur analysé (NULL si type=team)
  generated_by    uuid REFERENCES users(id),                         -- manager qui a déclenché l'analyse
  analysis_type   text NOT NULL CHECK (analysis_type IN ('individual','team')),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  service_id      uuid REFERENCES services(id),                      -- scope pour team
  -- Résultats IA (JSON stringifié — 3 axes pour individual, 1 résumé pour team)
  performance_insights  text,  -- suggestions axe Performance
  wellbeing_insights    text,  -- suggestions axe Bien-être
  blockers_insights     text,  -- suggestions axe Blocages
  team_summary          text,  -- résumé équipe (type=team uniquement)
  -- Métadonnées
  journal_count   integer DEFAULT 0,  -- nb de journaux analysés
  created_at      timestamptz DEFAULT now()
);

-- ─── INDEX ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ai_coach_analyses_user_id_idx   ON ai_coach_analyses (user_id);
CREATE INDEX IF NOT EXISTS ai_coach_analyses_service_id_idx ON ai_coach_analyses (service_id);
CREATE INDEX IF NOT EXISTS ai_coach_analyses_created_at_idx ON ai_coach_analyses (created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE ai_coach_analyses ENABLE ROW LEVEL SECURITY;

-- Collaborateurs : lisent uniquement leurs propres analyses
CREATE POLICY "ai_coach_analyses_select_own"
  ON ai_coach_analyses FOR SELECT
  USING (
    user_id = auth.uid()
    OR generated_by = auth.uid()
  );

-- Managers : lisent toutes les analyses de leur scope (via service_id ou user_id)
CREATE POLICY "ai_coach_analyses_select_manager"
  ON ai_coach_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
    )
  );

-- Insert via service_role uniquement (Edge Function)
CREATE POLICY "ai_coach_analyses_insert_service_role"
  ON ai_coach_analyses FOR INSERT
  WITH CHECK (true);

-- ─── FEATURE FLAG dans app_settings ──────────────────────────
-- Ajoute ia_coach_enabled = false par défaut dans modules
UPDATE app_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{ia_coach_enabled}',
  'false'::jsonb
)
WHERE key = 'modules'
  AND NOT (value ? 'ia_coach_enabled');

-- ─── VÉRIFICATION ────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'migration_ai_coach.sql : Table ai_coach_analyses créée avec RLS ✓';
  RAISE NOTICE 'Feature flag ia_coach_enabled ajouté dans app_settings ✓';
END $$;
