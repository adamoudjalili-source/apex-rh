-- ============================================================
-- APEX RH — Migration Session 32 — Review Cycles Formels
-- Tables : review_cycles, review_evaluations, review_templates
-- Feature flag : review_cycles_enabled dans app_settings.modules
-- ============================================================

-- ─── 1. TEMPLATES DE GRILLE D'ÉVALUATION ───────────────────
CREATE TABLE IF NOT EXISTS review_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  frequency   text CHECK (frequency IN ('quarterly','biannual','annual')) DEFAULT 'annual',
  questions   jsonb NOT NULL DEFAULT '[]',
  is_default  boolean DEFAULT false,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now()
);

-- ─── 2. CYCLES DE REVIEW ────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_cycles (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  frequency    text CHECK (frequency IN ('quarterly','biannual','annual')) NOT NULL DEFAULT 'annual',
  period_start date NOT NULL,
  period_end   date NOT NULL,
  status       text CHECK (status IN ('draft','active','in_review','closed')) DEFAULT 'draft',
  template_id  uuid REFERENCES review_templates(id),
  service_id   uuid REFERENCES services(id),
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz DEFAULT now(),
  closed_at    timestamptz
);

-- ─── 3. ÉVALUATIONS INDIVIDUELLES ───────────────────────────
CREATE TABLE IF NOT EXISTS review_evaluations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id        uuid REFERENCES review_cycles(id) ON DELETE CASCADE,
  evaluatee_id    uuid REFERENCES users(id),   -- collaborateur évalué
  evaluator_id    uuid REFERENCES users(id),   -- manager évaluateur
  status          text CHECK (status IN ('pending','self_submitted','manager_submitted','validated','archived'))
                  DEFAULT 'pending',

  -- Réponses auto-évaluation (JSON : { competency_key: score, comments: text })
  self_answers    jsonb DEFAULT '{}',
  self_submitted_at timestamptz,

  -- Réponses manager (JSON : { competency_key: score, comments: text, global_comment: text })
  manager_answers jsonb DEFAULT '{}',
  manager_submitted_at timestamptz,

  -- Synthèse automatique (calculée lors de la validation)
  synthesis       jsonb DEFAULT '{}',
  -- Contient : pulse_avg_score, pulse_period_days, feedback360_avg, feedback360_campaign_count,
  --            okr_completion_rate, okr_count, generated_at

  -- Décision finale du manager
  overall_rating  text CHECK (overall_rating IN ('insuffisant','a_ameliorer','satisfaisant','bien','excellent')),
  final_comment   text,

  validated_at    timestamptz,
  archived_at     timestamptz,
  created_at      timestamptz DEFAULT now(),

  UNIQUE(cycle_id, evaluatee_id)
);

-- ─── 4. INDEX ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_review_cycles_status      ON review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_review_cycles_service     ON review_cycles(service_id);
CREATE INDEX IF NOT EXISTS idx_review_evals_cycle        ON review_evaluations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_evals_evaluatee    ON review_evaluations(evaluatee_id);
CREATE INDEX IF NOT EXISTS idx_review_evals_evaluator    ON review_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_review_evals_status       ON review_evaluations(status);

-- ─── 5. RLS ──────────────────────────────────────────────────
ALTER TABLE review_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_evaluations ENABLE ROW LEVEL SECURITY;

-- review_templates : lecture pour tous, écriture pour admin/managers
CREATE POLICY "review_templates_select_all" ON review_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "review_templates_insert_managers" ON review_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- review_cycles : lecture pour tous, écriture pour managers
CREATE POLICY "review_cycles_select_all" ON review_cycles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "review_cycles_insert_managers" ON review_cycles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

CREATE POLICY "review_cycles_update_managers" ON review_cycles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- review_evaluations : collaborateur voit ses propres évaluations
CREATE POLICY "review_evals_select_own" ON review_evaluations
  FOR SELECT USING (
    evaluatee_id = auth.uid()
    OR evaluator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

CREATE POLICY "review_evals_insert_managers" ON review_evaluations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

CREATE POLICY "review_evals_update_all" ON review_evaluations
  FOR UPDATE USING (
    evaluatee_id = auth.uid()
    OR evaluator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- ─── 6. FEATURE FLAG ─────────────────────────────────────────
-- Ajouter review_cycles_enabled dans le JSON modules de app_settings
DO $$
DECLARE
  current_modules jsonb;
BEGIN
  SELECT value INTO current_modules
  FROM app_settings
  WHERE key = 'modules';

  IF current_modules IS NOT NULL THEN
    UPDATE app_settings
    SET value = current_modules || '{"review_cycles_enabled": false}'::jsonb
    WHERE key = 'modules';
  ELSE
    INSERT INTO app_settings (key, value)
    VALUES ('modules', '{"review_cycles_enabled": false}'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;

-- ─── 7. TEMPLATE PAR DÉFAUT (5 compétences NITA) ─────────────
INSERT INTO review_templates (name, description, frequency, is_default, questions)
VALUES (
  'Grille Standard NITA',
  'Modèle d''évaluation annuel standard — 5 compétences clés',
  'annual',
  true,
  '[
    {"key":"quality",        "label":"Qualité du travail",       "description":"Précision, soin, absence d''erreurs",        "weight":25},
    {"key":"deadlines",      "label":"Respect des délais",       "description":"Ponctualité, respect des engagements",        "weight":20},
    {"key":"communication",  "label":"Communication",            "description":"Clarté, écoute, partage d''information",     "weight":20},
    {"key":"teamwork",       "label":"Esprit d''équipe",         "description":"Collaboration, entraide, cohésion",          "weight":20},
    {"key":"initiative",     "label":"Initiative & Proactivité", "description":"Force de proposition, autonomie, créativité","weight":15}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;
