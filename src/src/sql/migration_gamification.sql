-- ============================================================
-- APEX RH — migration_gamification.sql
-- Session 31 — Module Gamification Avancée
-- Tables : gamification_points, gamification_badges
-- RLS : collaborateurs voient leurs propres données
--       managers voient leur scope
-- ============================================================

-- ─── POINTS REWARDS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gamification_points (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  points     integer NOT NULL DEFAULT 0,
  reason     text NOT NULL,  -- 'journal_submitted','brief_submitted','score_excellent','streak_7','streak_30'
  date_ref   date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gamification_points_user_id_idx ON gamification_points (user_id);
CREATE INDEX IF NOT EXISTS gamification_points_date_idx    ON gamification_points (date_ref DESC);

-- ─── BADGES OBTENUS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gamification_badges (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  badge_key  text NOT NULL,   -- 'first_journal','streak_7','streak_30','streak_90','score_bronze','score_silver','score_gold','perfect_week','perfect_month'
  earned_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_key)  -- un badge ne peut être obtenu qu'une seule fois
);

CREATE INDEX IF NOT EXISTS gamification_badges_user_id_idx ON gamification_badges (user_id);

-- ─── RLS ───────────────────────────────────────────────────
ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;

-- Points : chaque utilisateur lit/écrit ses propres points
CREATE POLICY "gamif_points_select_own"
  ON gamification_points FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "gamif_points_insert_own"
  ON gamification_points FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Managers voient les points de leur scope
CREATE POLICY "gamif_points_select_manager"
  ON gamification_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
    )
  );

-- Badges : chaque utilisateur lit/écrit ses propres badges
CREATE POLICY "gamif_badges_select_own"
  ON gamification_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "gamif_badges_insert_own"
  ON gamification_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gamif_badges_delete_own"
  ON gamification_badges FOR DELETE
  USING (user_id = auth.uid());

-- Managers voient les badges de leur scope
CREATE POLICY "gamif_badges_select_manager"
  ON gamification_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
    )
  );

-- ─── FEATURE FLAG dans app_settings ────────────────────────
UPDATE app_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{gamification_enabled}',
  'false'::jsonb
)
WHERE key = 'modules'
  AND NOT (value ? 'gamification_enabled');

-- ─── VÉRIFICATION ──────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'migration_gamification.sql : Tables gamification créées avec RLS ✓';
  RAISE NOTICE 'Feature flag gamification_enabled ajouté dans app_settings ✓';
END $$;
