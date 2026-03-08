-- ============================================================
-- APEX RH — Migration S63 : Parsing IA automatique des CVs
-- Session 63 — 07/03/2026
-- Tables  : cv_parse_results
-- Storage : bucket cv-uploads (créer manuellement dans Supabase)
-- pg_cron : cleanup CVs orphelins > 30 jours
-- ============================================================

-- ── 1. TABLE cv_parse_results ─────────────────────────────────

CREATE TABLE IF NOT EXISTS cv_parse_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_application_id  UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  job_posting_id      UUID REFERENCES job_postings(id)    ON DELETE SET NULL,

  -- Fichier
  file_name           TEXT NOT NULL,
  file_path           TEXT NOT NULL,           -- Supabase Storage path
  file_size_bytes     INT,

  -- Parsing
  parsing_status      TEXT NOT NULL DEFAULT 'pending'
                      CHECK (parsing_status IN ('pending','processing','completed','failed')),
  error_message       TEXT,

  -- Données extraites (structure complète)
  parsed_data         JSONB NOT NULL DEFAULT '{}',
  -- {
  --   full_name, email, phone, location, linkedin_url, summary,
  --   total_experience_years,
  --   skills: [],
  --   languages: [{language, level}],
  --   experience: [{title, company, location, start_date, end_date, is_current, description, technologies:[]}],
  --   education:  [{degree, institution, field, year_start, year_end}],
  --   certifications: [{name, issuer, year}]
  -- }

  -- Meta IA
  ai_model            TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used         INT,

  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. INDEX ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cvparse_org        ON cv_parse_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_cvparse_application ON cv_parse_results(job_application_id);
CREATE INDEX IF NOT EXISTS idx_cvparse_posting     ON cv_parse_results(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_cvparse_status      ON cv_parse_results(parsing_status);
CREATE INDEX IF NOT EXISTS idx_cvparse_created_by  ON cv_parse_results(created_by);
CREATE INDEX IF NOT EXISTS idx_cvparse_created_at  ON cv_parse_results(created_at DESC);

-- Index GIN pour recherche dans parsed_data (nom, email, compétences)
CREATE INDEX IF NOT EXISTS idx_cvparse_parsed_data_gin
  ON cv_parse_results USING GIN (parsed_data);

-- ── 3. TRIGGER updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_cv_parse_results_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cvparse_updated_at ON cv_parse_results;
CREATE TRIGGER trg_cvparse_updated_at
  BEFORE UPDATE ON cv_parse_results
  FOR EACH ROW EXECUTE FUNCTION update_cv_parse_results_updated_at();

-- ── 4. RLS ────────────────────────────────────────────────────

ALTER TABLE cv_parse_results ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'organisation
CREATE POLICY "cvparse_select_org" ON cv_parse_results
  FOR SELECT USING (organization_id = auth_user_organization_id());

-- Insertion : membres de l'organisation
CREATE POLICY "cvparse_insert_org" ON cv_parse_results
  FOR INSERT WITH CHECK (organization_id = auth_user_organization_id());

-- Mise à jour : admins + directeurs + créateur
CREATE POLICY "cvparse_update_org" ON cv_parse_results
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('administrateur','directeur')
        AND organization_id = auth_user_organization_id()
      )
      OR created_by = auth.uid()
    )
  );

-- Suppression : admins + créateur
CREATE POLICY "cvparse_delete_org" ON cv_parse_results
  FOR DELETE USING (
    organization_id = auth_user_organization_id()
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('administrateur','directeur')
        AND organization_id = auth_user_organization_id()
      )
      OR created_by = auth.uid()
    )
  );

-- ── 5. STORAGE BUCKET cv-uploads ─────────────────────────────
-- NOTE : Créer le bucket "cv-uploads" dans Supabase Dashboard > Storage
-- avec les paramètres :
--   - Public : NON (privé)
--   - Max file size : 10MB
--   - Allowed MIME types : application/pdf, application/msword,
--     application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Policies Storage (à exécuter dans Storage > Policies si bucket créé)
-- INSERT : membres authentifiés de l'org
-- SELECT : membres authentifiés de l'org
-- DELETE : admins + créateur

-- ── 6. FONCTION HELPER : résumé parsing ──────────────────────

CREATE OR REPLACE FUNCTION get_cv_parse_summary(p_org_id UUID)
RETURNS TABLE (
  total_parsed    BIGINT,
  completed       BIGINT,
  failed          BIGINT,
  pending         BIGINT,
  linked_to_app   BIGINT,
  avg_skills_count NUMERIC
)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    COUNT(*)                                               AS total_parsed,
    COUNT(*) FILTER (WHERE parsing_status = 'completed')  AS completed,
    COUNT(*) FILTER (WHERE parsing_status = 'failed')     AS failed,
    COUNT(*) FILTER (WHERE parsing_status IN ('pending','processing')) AS pending,
    COUNT(*) FILTER (WHERE job_application_id IS NOT NULL) AS linked_to_app,
    ROUND(AVG(
      CASE WHEN parsing_status = 'completed'
      THEN jsonb_array_length(COALESCE(parsed_data->'skills', '[]'::jsonb))
      END
    ), 1)                                                  AS avg_skills_count
  FROM cv_parse_results
  WHERE organization_id = p_org_id;
$$;

-- ── 7. pg_cron : nettoyage CVs orphelins > 30 jours ──────────

SELECT cron.schedule(
  'cv-parse-cleanup-monthly',
  '0 4 * * 0',   -- chaque dimanche à 4h00
  $outer$
    DELETE FROM cv_parse_results
    WHERE parsing_status IN ('failed','pending')
      AND created_at < NOW() - INTERVAL '30 days';
  $outer$
);

-- ── 8. Vérification ───────────────────────────────────────────

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_name = 'cv_parse_results') THEN
    RAISE NOTICE '✅ S63 — Table cv_parse_results créée avec succès';
  END IF;
END;
$outer$;

-- ─────────────────────────────────────────────────────────────
-- INSTRUCTIONS POST-MIGRATION :
-- 1. Créer le bucket "cv-uploads" dans Supabase Dashboard > Storage
-- 2. Déployer l'Edge Function ai-cv-parser
-- 3. Vérifier RLS : SELECT * FROM cv_parse_results; (doit retourner 0)
-- 4. SELECT get_cv_parse_summary('<org_id>'); pour tester la fonction
-- ─────────────────────────────────────────────────────────────
