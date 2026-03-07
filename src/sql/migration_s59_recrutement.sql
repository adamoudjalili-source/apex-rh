-- ============================================================
-- APEX RH — Migration S59 : Portail Candidats & Recrutement Light
-- Session 59 — 07/03/2026
-- Tables : job_postings, job_applications, interview_schedules,
--          interview_feedback, recruitment_stages
-- MVs    : mv_recruitment_stats, mv_pipeline_stats
-- Enums  : contract_type, application_status, interview_type,
--          interview_status, job_source
-- ============================================================

-- ── 1. ENUMS ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM (
    'cdi', 'cdd', 'stage', 'freelance', 'apprentissage', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'nouveau', 'en_revue', 'telephone', 'entretien', 'test', 'offre', 'accepte', 'refuse', 'retire'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interview_type AS ENUM (
    'telephone', 'visio', 'presentiel', 'technique', 'rh', 'direction'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM (
    'planifie', 'confirme', 'realise', 'annule', 'reporte'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_source AS ENUM (
    'site_web', 'linkedin', 'referral', 'jobboard', 'spontanee', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. OFFRES D'EMPLOI ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_postings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  reference_code    TEXT,
  division_id       UUID REFERENCES divisions(id),
  service_id        UUID REFERENCES services(id),
  job_family        TEXT,
  contract_type     contract_type NOT NULL DEFAULT 'cdi',
  location          TEXT DEFAULT 'Dakar',
  is_remote         BOOLEAN DEFAULT FALSE,
  salary_min        NUMERIC(12,2),
  salary_max        NUMERIC(12,2),
  currency          compensation_currency DEFAULT 'XOF',
  description       TEXT NOT NULL,
  requirements      TEXT,
  benefits          TEXT,
  skills_required   TEXT[],
  experience_years  SMALLINT,
  education_level   TEXT,
  nb_positions      SMALLINT DEFAULT 1,
  is_published      BOOLEAN DEFAULT FALSE,
  is_internal       BOOLEAN DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  deadline          DATE,
  closed_at         TIMESTAMPTZ,
  hiring_manager_id UUID REFERENCES users(id),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_org        ON job_postings(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_published  ON job_postings(is_published, deadline);
CREATE INDEX IF NOT EXISTS idx_job_postings_manager    ON job_postings(hiring_manager_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_division   ON job_postings(division_id);

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_postings_org ON job_postings;
CREATE POLICY job_postings_org ON job_postings
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 3. CANDIDATURES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id             UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_user_id  UUID REFERENCES users(id),
  candidate_name     TEXT NOT NULL,
  candidate_email    TEXT NOT NULL,
  candidate_phone    TEXT,
  candidate_linkedin TEXT,
  resume_url         TEXT,
  cover_letter       TEXT,
  status             application_status NOT NULL DEFAULT 'nouveau',
  source             job_source DEFAULT 'site_web',
  referrer_id        UUID REFERENCES users(id),
  is_internal        BOOLEAN GENERATED ALWAYS AS (applicant_user_id IS NOT NULL) STORED,
  overall_score      SMALLINT CHECK(overall_score BETWEEN 1 AND 5),
  recruiter_notes    TEXT,
  rejection_reason   TEXT,
  applied_at         TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at        TIMESTAMPTZ,
  hired_at           TIMESTAMPTZ,
  assigned_to        UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_email)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_org    ON job_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job    ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_user   ON job_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_email  ON job_applications(candidate_email);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_applications_self ON job_applications;
CREATE POLICY job_applications_self ON job_applications
  FOR SELECT USING (
    applicant_user_id = auth.uid()
    OR organization_id = auth_user_organization_id()
  );

DROP POLICY IF EXISTS job_applications_org_write ON job_applications;
CREATE POLICY job_applications_org_write ON job_applications
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 4. ENTRETIENS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interview_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id   UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  interviewer_id   UUID NOT NULL REFERENCES users(id),
  type             interview_type NOT NULL DEFAULT 'presentiel',
  status           interview_status NOT NULL DEFAULT 'planifie',
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_min     SMALLINT DEFAULT 60,
  location         TEXT,
  meeting_link     TEXT,
  notes_prep       TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_schedules_org         ON interview_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_app         ON interview_schedules(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_interviewer ON interview_schedules(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interview_schedules_date        ON interview_schedules(scheduled_at);

ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_schedules_org ON interview_schedules;
CREATE POLICY interview_schedules_org ON interview_schedules
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 5. FEEDBACK ENTRETIENS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS interview_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  interview_id      UUID NOT NULL REFERENCES interview_schedules(id) ON DELETE CASCADE,
  reviewer_id       UUID NOT NULL REFERENCES users(id),
  overall_score     SMALLINT NOT NULL CHECK(overall_score BETWEEN 1 AND 5),
  skills_scores     JSONB DEFAULT '{}',
  strengths         TEXT,
  weaknesses        TEXT,
  notes             TEXT,
  recommendation    TEXT CHECK(recommendation IN ('fort_oui', 'oui', 'neutre', 'non', 'fort_non')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(interview_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_feedback_org       ON interview_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview ON interview_feedback(interview_id);

ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_feedback_org ON interview_feedback;
CREATE POLICY interview_feedback_org ON interview_feedback
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 6. ÉTAPES PIPELINE PERSONNALISÉES ────────────────────────

CREATE TABLE IF NOT EXISTS recruitment_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status_mapped   application_status,
  color           TEXT DEFAULT '#6B7280',
  sort_order      SMALLINT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_stages_org ON recruitment_stages(organization_id);

ALTER TABLE recruitment_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruitment_stages_org ON recruitment_stages;
CREATE POLICY recruitment_stages_org ON recruitment_stages
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 7. VUES MATÉRIALISÉES ─────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_recruitment_stats AS
SELECT
  jp.organization_id,
  COUNT(DISTINCT jp.id)                                                        AS total_postings,
  COUNT(DISTINCT jp.id) FILTER(WHERE jp.is_published
    AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE))                  AS active_postings,
  COUNT(DISTINCT ja.id)                                                        AS total_applications,
  COUNT(DISTINCT ja.id) FILTER(WHERE ja.status = 'nouveau')                   AS new_applications,
  COUNT(DISTINCT ja.id) FILTER(WHERE ja.status = 'entretien')                 AS in_interview,
  COUNT(DISTINCT ja.id) FILTER(WHERE ja.status = 'accepte')                   AS hired,
  COUNT(DISTINCT ja.id) FILTER(WHERE ja.status = 'refuse')                    AS rejected,
  COUNT(DISTINCT ja.id) FILTER(WHERE ja.is_internal)                          AS internal_applications,
  ROUND(
    CASE WHEN COUNT(DISTINCT ja.id) > 0
    THEN COUNT(DISTINCT ja.id) FILTER(WHERE ja.status = 'accepte')::NUMERIC
       / COUNT(DISTINCT ja.id)::NUMERIC * 100
    ELSE 0 END, 1
  )                                                                            AS conversion_rate,
  AVG(
    CASE WHEN ja.hired_at IS NOT NULL
    THEN EXTRACT(DAY FROM ja.hired_at - ja.applied_at)
    END
  )::NUMERIC(6,1)                                                              AS avg_days_to_hire,
  NOW()                                                                        AS refreshed_at
FROM job_postings jp
LEFT JOIN job_applications ja ON ja.job_id = jp.id
GROUP BY jp.organization_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_recruitment_stats_org
  ON mv_recruitment_stats(organization_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pipeline_stats AS
SELECT
  jp.id                                                          AS job_id,
  jp.organization_id,
  jp.title,
  jp.contract_type,
  jp.is_published,
  jp.deadline,
  jp.hiring_manager_id,
  COUNT(ja.id)                                                   AS total_applications,
  COUNT(ja.id) FILTER(WHERE ja.status = 'nouveau')               AS nb_nouveau,
  COUNT(ja.id) FILTER(WHERE ja.status = 'en_revue')              AS nb_en_revue,
  COUNT(ja.id) FILTER(WHERE ja.status = 'telephone')             AS nb_telephone,
  COUNT(ja.id) FILTER(WHERE ja.status = 'entretien')             AS nb_entretien,
  COUNT(ja.id) FILTER(WHERE ja.status = 'test')                  AS nb_test,
  COUNT(ja.id) FILTER(WHERE ja.status = 'offre')                 AS nb_offre,
  COUNT(ja.id) FILTER(WHERE ja.status = 'accepte')               AS nb_accepte,
  COUNT(ja.id) FILTER(WHERE ja.status = 'refuse')                AS nb_refuse,
  AVG(ja.overall_score)::NUMERIC(3,1)                            AS avg_score,
  MAX(ja.applied_at)                                             AS last_application_at,
  NOW()                                                          AS refreshed_at
FROM job_postings jp
LEFT JOIN job_applications ja ON ja.job_id = jp.id
GROUP BY jp.id, jp.organization_id, jp.title, jp.contract_type,
         jp.is_published, jp.deadline, jp.hiring_manager_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pipeline_stats_job
  ON mv_pipeline_stats(job_id);
CREATE INDEX IF NOT EXISTS idx_mv_pipeline_stats_org
  ON mv_pipeline_stats(organization_id);
CREATE INDEX IF NOT EXISTS idx_mv_pipeline_stats_manager
  ON mv_pipeline_stats(hiring_manager_id);

-- ── 8. FONCTION REFRESH ──────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_recruitment_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recruitment_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pipeline_stats;
END;
$$;

-- ── 9. EXTENSION notification_type ───────────────────────────

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_application';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_status_changed';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'interview_scheduled';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'interview_reminder';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'offer_extended';
EXCEPTION WHEN others THEN NULL; END $$;

-- ── 10. pg_cron NIGHTLY REFRESH ──────────────────────────────

SELECT cron.schedule(
  'refresh-recruitment-views-nightly',
  '45 2 * * *',
  $outer$SELECT refresh_recruitment_views();$outer$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-recruitment-views-nightly'
);

-- ── 11. ACTIVATION MODULE dans app_settings ──────────────────
-- app_settings est une table clé/valeur (key TEXT, value JSONB)

INSERT INTO app_settings (key, value)
VALUES ('recrutement_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ── FIN MIGRATION S59 ────────────────────────────────────────