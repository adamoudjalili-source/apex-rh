-- ============================================================
-- APEX RH — Migration S61 : IA dans le Recrutement
-- Session 61 — 07/03/2026
-- Tables  : ai_candidate_scores, ai_job_requirements
-- MVs     : mv_ai_recruitment_ranking
-- Enums   : ai_hiring_recommendation
-- ============================================================

-- ── 1. ENUM ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE ai_hiring_recommendation AS ENUM (
    'strongly_recommend',
    'recommend',
    'neutral',
    'not_recommend',
    'strong_reject'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. TABLE ai_job_requirements ──────────────────────────────

CREATE TABLE IF NOT EXISTS ai_job_requirements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_posting_id      UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,

  required_skills     JSONB DEFAULT '[]',
  nice_to_have_skills JSONB DEFAULT '[]',

  min_experience_years  INT  DEFAULT 0,
  preferred_experience  INT,
  education_level       TEXT,

  key_competencies      JSONB DEFAULT '[]',
  role_summary          TEXT,
  key_responsibilities  JSONB DEFAULT '[]',

  parsed_at             TIMESTAMPTZ DEFAULT NOW(),
  model_version         TEXT DEFAULT 'claude-sonnet-4-20250514',

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_posting_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_job_requirements_org     ON ai_job_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_job_requirements_posting ON ai_job_requirements(job_posting_id);

-- ── 3. TABLE ai_candidate_scores ──────────────────────────────

CREATE TABLE IF NOT EXISTS ai_candidate_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_application_id  UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  job_posting_id      UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,

  overall_score       SMALLINT CHECK (overall_score BETWEEN 0 AND 100),
  score_breakdown     JSONB DEFAULT '{}',
  strengths           JSONB DEFAULT '[]',
  gaps                JSONB DEFAULT '[]',
  key_highlights      JSONB DEFAULT '[]',

  recommendation      ai_hiring_recommendation NOT NULL DEFAULT 'neutral',
  ai_summary          TEXT,
  percentile_rank     SMALLINT,

  analyzed_at         TIMESTAMPTZ DEFAULT NOW(),
  model_version       TEXT DEFAULT 'claude-sonnet-4-20250514',
  analysis_version    INT DEFAULT 1,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_application_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_candidate_scores_org         ON ai_candidate_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_candidate_scores_application ON ai_candidate_scores(job_application_id);
CREATE INDEX IF NOT EXISTS idx_ai_candidate_scores_posting     ON ai_candidate_scores(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_ai_candidate_scores_score       ON ai_candidate_scores(overall_score DESC);

-- ── 4. TRIGGER updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_job_requirements_updated ON ai_job_requirements;
CREATE TRIGGER trg_ai_job_requirements_updated
  BEFORE UPDATE ON ai_job_requirements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_candidate_scores_updated ON ai_candidate_scores;
CREATE TRIGGER trg_ai_candidate_scores_updated
  BEFORE UPDATE ON ai_candidate_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. VUE MATÉRIALISÉE : mv_ai_recruitment_ranking ───────────

DROP MATERIALIZED VIEW IF EXISTS mv_ai_recruitment_ranking;

CREATE MATERIALIZED VIEW mv_ai_recruitment_ranking AS
SELECT
  jp.id                   AS job_posting_id,
  jp.organization_id,
  jp.title                AS job_title,
  ja.id                   AS application_id,
  ja.candidate_name,
  ja.candidate_email,
  ja.status               AS application_status,
  ja.is_internal,
  acs.overall_score,
  acs.recommendation,
  acs.score_breakdown,
  acs.strengths,
  acs.gaps,
  acs.ai_summary,
  acs.analyzed_at,
  RANK() OVER (
    PARTITION BY jp.id
    ORDER BY acs.overall_score DESC NULLS LAST
  )                       AS rank_in_posting,
  COUNT(ja.id) OVER (
    PARTITION BY jp.id
  )                       AS total_candidates
FROM job_postings jp
JOIN job_applications ja  ON ja.job_id = jp.id
LEFT JOIN ai_candidate_scores acs ON acs.job_application_id = ja.id
WHERE ja.status NOT IN ('retire', 'refuse')
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ai_ranking_application
  ON mv_ai_recruitment_ranking(application_id);
CREATE INDEX IF NOT EXISTS idx_mv_ai_ranking_posting
  ON mv_ai_recruitment_ranking(job_posting_id, overall_score DESC NULLS LAST);

-- ── 6. RLS ────────────────────────────────────────────────────

ALTER TABLE ai_job_requirements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_candidate_scores  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_job_requirements_select" ON ai_job_requirements;
CREATE POLICY "ai_job_requirements_select" ON ai_job_requirements
  FOR SELECT USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "ai_job_requirements_insert" ON ai_job_requirements;
CREATE POLICY "ai_job_requirements_insert" ON ai_job_requirements
  FOR INSERT WITH CHECK (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "ai_job_requirements_update" ON ai_job_requirements;
CREATE POLICY "ai_job_requirements_update" ON ai_job_requirements
  FOR UPDATE USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "ai_candidate_scores_select" ON ai_candidate_scores;
CREATE POLICY "ai_candidate_scores_select" ON ai_candidate_scores
  FOR SELECT USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "ai_candidate_scores_insert" ON ai_candidate_scores;
CREATE POLICY "ai_candidate_scores_insert" ON ai_candidate_scores
  FOR INSERT WITH CHECK (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "ai_candidate_scores_update" ON ai_candidate_scores;
CREATE POLICY "ai_candidate_scores_update" ON ai_candidate_scores
  FOR UPDATE USING (organization_id = auth_user_organization_id());

-- ── 7. NOTIFICATION TYPES ─────────────────────────────────────

DO $outer$
BEGIN
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ai_candidate_analyzed';
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ai_bulk_analysis_done';
  EXCEPTION WHEN others THEN NULL;
  END;
END;
$outer$;

-- ── 8. pg_cron : refresh MV chaque nuit ───────────────────────

SELECT cron.schedule(
  'refresh-ai-recruitment-ranking-nightly',
  '15 3 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_recruitment_ranking;$$
);

-- ── 9. MODULE KEY dans app_settings ───────────────────────────

INSERT INTO app_settings (key, value)
VALUES ('ai_recruitment_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- ── 10. FONCTION helper : refresh IA views ────────────────────

CREATE OR REPLACE FUNCTION refresh_ai_recruitment_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_recruitment_ranking;
END;
$$;

-- ── FIN DE MIGRATION ──────────────────────────────────────────
-- SELECT COUNT(*) FROM ai_candidate_scores;   → 0
-- SELECT COUNT(*) FROM ai_job_requirements;   → 0
-- \d mv_ai_recruitment_ranking                → MV OK