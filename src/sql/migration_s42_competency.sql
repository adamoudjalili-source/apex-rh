-- ============================================================
-- APEX RH — Migration Session 42
-- Référentiel Compétences + Conduite du Changement
-- Tables : job_families, competency_frameworks,
--          performance_comments, manager_eval_notes
-- ============================================================

-- ─── 1. FAMILLES DE MÉTIERS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS job_families (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text NOT NULL UNIQUE,        -- ex: 'agent_transfert', 'commercial', 'manager'
  label       text NOT NULL,               -- ex: 'Agent de Transfert'
  description text,
  icon        text DEFAULT '💼',
  color       text DEFAULT '#4F46E5',
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Données initiales NITA
INSERT INTO job_families (code, label, description, icon, color) VALUES
  ('agent_transfert', 'Agent de Transfert', 'Opérations de transfert d''argent au guichet', '💳', '#4F46E5'),
  ('agent_commercial', 'Agent Commercial', 'Développement commercial et acquisition client', '🤝', '#10B981'),
  ('superviseur',      'Superviseur',       'Encadrement d''une équipe opérationnelle',       '👥', '#F59E0B'),
  ('manager',          'Manager',           'Gestion d''un service ou d''une division',       '🏆', '#C9A227'),
  ('support_rh',       'Support RH',        'Ressources humaines et administration',          '📋', '#8B5CF6')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. RÉFÉRENTIEL COMPÉTENCES ──────────────────────────────

CREATE TABLE IF NOT EXISTS competency_frameworks (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_family_id    uuid REFERENCES job_families(id) ON DELETE CASCADE,
  competency_key   text NOT NULL
                   CHECK (competency_key IN
                     ('quality','deadlines','communication','teamwork','initiative')),
  label_override   text,           -- si différent du label par défaut
  weight           integer DEFAULT 20 CHECK (weight BETWEEN 0 AND 100),
  target_score     integer DEFAULT 7 CHECK (target_score BETWEEN 0 AND 10),
  description      text,           -- ce qu'on attend sur cette compétence pour ce métier
  examples         text[],         -- exemples de comportements attendus
  is_priority      boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(job_family_id, competency_key)
);

-- Référentiel par défaut pour agent_transfert
DO $$
DECLARE fid uuid;
BEGIN
  SELECT id INTO fid FROM job_families WHERE code = 'agent_transfert';
  IF fid IS NOT NULL THEN
    INSERT INTO competency_frameworks (job_family_id, competency_key, weight, target_score, description, is_priority)
    VALUES
      (fid, 'quality',        25, 8, 'Précision des opérations, zéro erreur de transaction', true),
      (fid, 'deadlines',      25, 8, 'Rapidité de traitement, respect des SLA agence', true),
      (fid, 'communication',  20, 7, 'Accueil client, clarté des explications', false),
      (fid, 'teamwork',       15, 7, 'Relève de poste, entraide entre agents', false),
      (fid, 'initiative',     15, 6, 'Signalement proactif des incidents', false)
    ON CONFLICT (job_family_id, competency_key) DO NOTHING;
  END IF;
END $$;

-- ─── 3. COMMENTAIRES DE PERFORMANCE (Droit de commentaire) ──

CREATE TABLE IF NOT EXISTS performance_comments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  dimension       text NOT NULL              -- 'pulse', 'okr', 'feedback360', 'nita', 'surveys', 'general'
                  CHECK (dimension IN ('pulse','okr','feedback360','nita','surveys','general')),
  period_label    text NOT NULL,             -- ex: '2025-06', '2025-Q2'
  comment         text NOT NULL,
  visibility      text DEFAULT 'manager'     -- 'manager' | 'public'
                  CHECK (visibility IN ('manager','public')),
  is_resolved     boolean DEFAULT false,     -- manager a pris en compte
  manager_reply   text,
  replied_by      uuid REFERENCES users(id),
  replied_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_comments_user_period
  ON performance_comments(user_id, period_label);

-- ─── 4. NOTES MANAGER SUR ÉVALUATIONS ────────────────────────

CREATE TABLE IF NOT EXISTS manager_eval_notes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id   uuid REFERENCES review_evaluations(id) ON DELETE CASCADE,
  manager_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  employee_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  note_type       text DEFAULT 'observation'
                  CHECK (note_type IN ('observation','action_plan','risk','strength','other')),
  content         text NOT NULL,
  is_private      boolean DEFAULT true,     -- true = manager seul | false = visible par l'employé si transparency ON
  is_shared       boolean DEFAULT false,    -- manager a décidé de partager avec l'employé
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_notes_eval
  ON manager_eval_notes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_manager_notes_employee
  ON manager_eval_notes(employee_id);

-- ─── 5. PARAMÈTRE TRANSPARENCY MODE ─────────────────────────
-- Ajout dans app_settings via INSERT (si la table existe déjà)

INSERT INTO app_settings (key, value) VALUES
  ('transparency_mode', 'false'),
  ('employee_comments_enabled', 'true'),
  ('competency_framework_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ─── 6. RLS ──────────────────────────────────────────────────

ALTER TABLE job_families            ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_frameworks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_eval_notes      ENABLE ROW LEVEL SECURITY;

-- job_families : lecture par tous, écriture admin
DROP POLICY IF EXISTS "jf_select_all"  ON job_families;
DROP POLICY IF EXISTS "jf_admin_write" ON job_families;

CREATE POLICY "jf_select_all"  ON job_families FOR SELECT USING (true);
CREATE POLICY "jf_admin_write" ON job_families FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrateur'));

-- competency_frameworks : lecture par tous, écriture admin
DROP POLICY IF EXISTS "cf_select_all"  ON competency_frameworks;
DROP POLICY IF EXISTS "cf_admin_write" ON competency_frameworks;

CREATE POLICY "cf_select_all"  ON competency_frameworks FOR SELECT USING (true);
CREATE POLICY "cf_admin_write" ON competency_frameworks FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrateur'));

-- performance_comments : chacun ses propres, managers lisent leur équipe
DROP POLICY IF EXISTS "pc_select_own"     ON performance_comments;
DROP POLICY IF EXISTS "pc_insert_own"     ON performance_comments;
DROP POLICY IF EXISTS "pc_update_own"     ON performance_comments;
DROP POLICY IF EXISTS "pc_delete_own"     ON performance_comments;
DROP POLICY IF EXISTS "pc_manager_read"   ON performance_comments;
DROP POLICY IF EXISTS "pc_manager_reply"  ON performance_comments;

CREATE POLICY "pc_select_own" ON performance_comments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "pc_insert_own" ON performance_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "pc_update_own" ON performance_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "pc_delete_own" ON performance_comments
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "pc_manager_read" ON performance_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users m
      WHERE m.id = auth.uid()
        AND m.role IN ('administrateur','directeur','chef_division','chef_service')
        AND EXISTS (
          SELECT 1 FROM users e
          WHERE e.id = performance_comments.user_id
            AND (e.service_id = m.service_id OR e.division_id = m.division_id
                 OR e.direction_id = m.direction_id OR m.role = 'administrateur')
        )
    )
  );

CREATE POLICY "pc_manager_reply" ON performance_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users m
      WHERE m.id = auth.uid()
        AND m.role IN ('administrateur','directeur','chef_division','chef_service')
    )
  );

-- manager_eval_notes : manager voit les siennes, admin tout
DROP POLICY IF EXISTS "men_manager_own"  ON manager_eval_notes;
DROP POLICY IF EXISTS "men_employee_shared" ON manager_eval_notes;

CREATE POLICY "men_manager_own" ON manager_eval_notes
  FOR ALL USING (manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrateur'));

-- L'employé voit les notes partagées qui le concernent
CREATE POLICY "men_employee_shared" ON manager_eval_notes
  FOR SELECT USING (
    employee_id = auth.uid() AND is_shared = true
  );

-- ─── 7. TRIGGERS updated_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_families_updated_at ON job_families;
CREATE TRIGGER trg_job_families_updated_at
  BEFORE UPDATE ON job_families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_competency_frameworks_updated_at ON competency_frameworks;
CREATE TRIGGER trg_competency_frameworks_updated_at
  BEFORE UPDATE ON competency_frameworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_perf_comments_updated_at ON performance_comments;
CREATE TRIGGER trg_perf_comments_updated_at
  BEFORE UPDATE ON performance_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_manager_notes_updated_at ON manager_eval_notes;
CREATE TRIGGER trg_manager_notes_updated_at
  BEFORE UPDATE ON manager_eval_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── DONE ────────────────────────────────────────────────────
-- Supabase → SQL Editor → Coller et exécuter ce fichier
-- Puis activer dans Settings → Modules → "Référentiel Compétences"
