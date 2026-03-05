-- ============================================================
-- APEX RH — migration_s42_competences.sql
-- Session 42 — Référentiel Compétences + Conduite du Changement
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ─── 1. FAMILLES DE MÉTIERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_families (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  code        text UNIQUE,             -- ex: 'CAISSE', 'BACK_OFFICE', 'MANAGEMENT'
  color       text DEFAULT '#4F46E5', -- couleur badge
  icon        text DEFAULT '💼',
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ─── 2. RÉFÉRENTIEL COMPÉTENCES PAR FAMILLE ────────────────────
CREATE TABLE IF NOT EXISTS competency_frameworks (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_family_id  uuid REFERENCES job_families(id) ON DELETE CASCADE,
  competency_key text NOT NULL,         -- 'quality','deadlines','communication','teamwork','initiative'
  label          text NOT NULL,
  description    text,
  weight         integer DEFAULT 20 CHECK (weight BETWEEN 0 AND 100),
  level_1_desc   text,                 -- Insuffisant
  level_2_desc   text,                 -- À améliorer
  level_3_desc   text,                 -- Satisfaisant
  level_4_desc   text,                 -- Bien
  level_5_desc   text,                 -- Excellent
  is_active      boolean DEFAULT true,
  sort_order     integer DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(job_family_id, competency_key)
);

-- ─── 3. COMMENTAIRES PERFORMANCE (droit de réponse employé) ─────
CREATE TABLE IF NOT EXISTS performance_comments (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES users(id) ON DELETE CASCADE,
  dimension_key  text NOT NULL,         -- 'delivery','quality','regularity','bonus','nita_resilience'…
  period_key     text NOT NULL,         -- ex: '2025-03' (YYYY-MM)
  comment        text NOT NULL,
  visibility     text DEFAULT 'manager_only'
                 CHECK (visibility IN ('manager_only','public')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, dimension_key, period_key)
);

-- ─── 4. NOTES MANAGER ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manager_notes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  employee_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  period_key   text NOT NULL,           -- 'YYYY-MM'
  note_text    text NOT NULL,
  note_type    text DEFAULT 'general'
               CHECK (note_type IN ('general','positive','concern','action_plan')),
  is_shared    boolean DEFAULT false,   -- partagé avec l'employé (transparency)
  review_id    uuid,                    -- lien optionnel vers une évaluation
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ─── 5. ASSIGNATION FAMILLE MÉTIER SUR USERS ──────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_family_id uuid REFERENCES job_families(id);

-- ─── 6. RLS ──────────────────────────────────────────────────

-- job_families — visible de tous, éditable par admin
ALTER TABLE job_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_families_read" ON job_families FOR SELECT USING (true);
CREATE POLICY "job_families_write" ON job_families FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrateur'));

-- competency_frameworks — visible de tous, éditable par admin
ALTER TABLE competency_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competency_frameworks_read" ON competency_frameworks FOR SELECT USING (true);
CREATE POLICY "competency_frameworks_write" ON competency_frameworks FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrateur'));

-- performance_comments — employé voit/modifie les siennes ; manager voit celles de son équipe
ALTER TABLE performance_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perf_comments_own" ON performance_comments FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "perf_comments_manager_read" ON performance_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN users emp ON emp.id = performance_comments.user_id
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
        AND (emp.service_id = u.service_id OR emp.division_id = u.division_id
             OR u.role IN ('directeur','administrateur'))
    )
  );

-- manager_notes — manager voit/modifie ses propres notes ; employé voit les notes partagées
ALTER TABLE manager_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_notes_manager" ON manager_notes FOR ALL
  USING (manager_id = auth.uid());
CREATE POLICY "manager_notes_employee_shared" ON manager_notes FOR SELECT
  USING (employee_id = auth.uid() AND is_shared = true);

-- ─── 7. DONNÉES PAR DÉFAUT — FAMILLES MÉTIER NITA ─────────────
INSERT INTO job_families (name, description, code, color, icon) VALUES
  ('Agent de Caisse',       'Agents en contact direct avec la clientèle pour les opérations de transfert', 'CAISSE',      '#10B981', '🏦'),
  ('Back Office',           'Agents traitant les opérations de contrôle et de réconciliation',             'BACK_OFFICE',  '#3B82F6', '🖥️'),
  ('Superviseur / Manager', 'Encadrement des équipes opérationnelles NITA',                                'MANAGEMENT',   '#8B5CF6', '👔'),
  ('Compliance & Audit',    'Agents en charge de la conformité réglementaire et du contrôle interne',      'COMPLIANCE',   '#F59E0B', '⚖️'),
  ('IT & Systèmes',         'Équipes techniques et support informatique',                                  'IT',           '#EC4899', '💻')
ON CONFLICT (code) DO NOTHING;

-- ─── 8. RÉFÉRENTIELS COMPÉTENCES PAR DÉFAUT (Agent de Caisse) ─
WITH fam AS (SELECT id FROM job_families WHERE code = 'CAISSE' LIMIT 1)
INSERT INTO competency_frameworks (job_family_id, competency_key, label, description, weight, level_1_desc, level_3_desc, level_5_desc, sort_order)
SELECT
  fam.id,
  v.competency_key, v.label, v.description, v.weight, v.l1, v.l3, v.l5, v.ord
FROM fam, (VALUES
  ('quality',       'Qualité des opérations',       'Précision et conformité des transactions NITA',     25, 'Erreurs fréquentes, non-conformités',         'Opérations correctes dans l''ensemble',       'Zéro erreur, référent qualité de l''équipe',   1),
  ('deadlines',     'Rapidité de traitement',        'Respect des délais de traitement des transferts',   20, 'Délais régulièrement dépassés',               'Délais respectés dans les cas standards',     'Traitement ultra-rapide, gestion des pics',    2),
  ('communication', 'Relation client',               'Qualité de la communication et accueil client',     20, 'Communication difficile, plaintes fréquentes', 'Accueil correct, peu de plaintes',            'Excellent accueil, ambassadeur NITA',          3),
  ('teamwork',      'Cohésion d''équipe',            'Entraide et contribution à l''ambiance collective', 20, 'Peu impliqué dans la vie d''équipe',          'Bonne intégration dans l''équipe',            'Moteur de l''équipe, fort esprit collectif',   4),
  ('initiative',    'Proactivité & Adaptabilité',    'Capacité à gérer les situations non-standard',      15, 'Attend toujours les instructions',            'S''adapte aux situations courantes',          'Force de proposition, gestion des imprévus',  5)
) AS v(competency_key, label, description, weight, l1, l3, l5, ord)
ON CONFLICT (job_family_id, competency_key) DO NOTHING;

-- ─── 9. APP_SETTINGS — nouveaux paramètres S42 ────────────────
INSERT INTO app_settings (key, value) VALUES
  ('transparency_mode',              'false'),
  ('transparency_delay_days',        '3'),
  ('employee_comment_enabled',       'true'),
  ('manager_notes_enabled',          'true'),
  ('competency_framework_enabled',   'true')
ON CONFLICT (key) DO NOTHING;

-- ─── 10. TRIGGER updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_families_updated_at
  BEFORE UPDATE ON job_families
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER competency_frameworks_updated_at
  BEFORE UPDATE ON competency_frameworks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER performance_comments_updated_at
  BEFORE UPDATE ON performance_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER manager_notes_updated_at
  BEFORE UPDATE ON manager_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
