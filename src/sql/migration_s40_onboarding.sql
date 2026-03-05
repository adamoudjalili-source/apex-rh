-- ============================================================
-- APEX RH — Migration Session 40
-- Onboarding tracking + Adoption metrics
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- ─── Table onboarding_completions ────────────────────────────
-- Trace les étapes d'onboarding complétées par utilisateur
CREATE TABLE IF NOT EXISTS onboarding_completions (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid    REFERENCES users(id) ON DELETE CASCADE,
  step_key    text    NOT NULL,     -- ex: 'welcome', 'brief_demo', 'tasks_demo'
  role_group  text    NOT NULL,     -- 'collaborateur' | 'manager' | 'admin'
  completed   boolean DEFAULT false,
  completed_at timestamptz,
  skipped     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, step_key)
);

ALTER TABLE onboarding_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_self" ON onboarding_completions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "onboarding_admin_read" ON onboarding_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('administrateur','directeur')
    )
  );

-- ─── Table app_usage_logs ─────────────────────────────────────
-- Trace les connexions / pages visitées pour le tableau d'adoption
CREATE TABLE IF NOT EXISTS app_usage_logs (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  page      text NOT NULL,        -- '/ma-performance', '/travail/taches', etc.
  logged_at timestamptz DEFAULT now(),
  date_ref  date DEFAULT CURRENT_DATE
);

ALTER TABLE app_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_self_insert" ON app_usage_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "usage_admin_read" ON app_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- ─── Vue v_adoption_summary ───────────────────────────────────
-- Résumé d'adoption par utilisateur pour le tableau de bord admin
CREATE OR REPLACE VIEW v_adoption_summary AS
SELECT
  u.id              AS user_id,
  u.first_name,
  u.last_name,
  u.role,
  s.name            AS service_name,
  -- Connexions 30 derniers jours
  COUNT(DISTINCT ul.date_ref) FILTER (
    WHERE ul.logged_at >= NOW() - INTERVAL '30 days'
  ) AS active_days_30,
  -- Dernière connexion
  MAX(ul.logged_at)  AS last_seen,
  -- Pages visitées (variété)
  COUNT(DISTINCT ul.page) FILTER (
    WHERE ul.logged_at >= NOW() - INTERVAL '30 days'
  ) AS pages_visited,
  -- Onboarding terminé ?
  COUNT(oc.id) FILTER (WHERE oc.completed = true) AS onboarding_steps_done,
  COUNT(oc.id)                                      AS onboarding_steps_total,
  -- PULSE : jours de soumission ce mois
  COUNT(DISTINCT ps.score_date) FILTER (
    WHERE ps.score_date >= date_trunc('month', CURRENT_DATE)::date
  ) AS pulse_days_this_month
FROM users u
LEFT JOIN services s ON s.id = u.service_id
LEFT JOIN app_usage_logs ul ON ul.user_id = u.id
LEFT JOIN onboarding_completions oc ON oc.user_id = u.id
LEFT JOIN performance_scores ps ON ps.user_id = u.id AND ps.score_period = 'daily'
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.role, s.name;

-- ─── Index performance ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON app_usage_logs(user_id, date_ref);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_completions(user_id);
