-- ============================================================
-- APEX RH — S72 : Recrutement — Pipeline structuré + scoring
-- Date : 08/03/2026
-- ============================================================

-- ─── 1. COLONNES job_applications ────────────────────────────

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS match_score      NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS stage_order      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_notes   TEXT,
  ADD COLUMN IF NOT EXISTS source           TEXT DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_reason  TEXT;

-- Index pour performance pipeline
CREATE INDEX IF NOT EXISTS idx_job_apps_job_status    ON job_applications(job_id, status);
CREATE INDEX IF NOT EXISTS idx_job_apps_match_score   ON job_applications(match_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_job_apps_stage_order   ON job_applications(job_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_job_apps_source        ON job_applications(source);

-- ─── 2. COLONNES recruitment_stages ──────────────────────────

ALTER TABLE recruitment_stages
  ADD COLUMN IF NOT EXISTS color            TEXT DEFAULT '#6B7280',
  ADD COLUMN IF NOT EXISTS is_terminal      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_notify      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS terminal_outcome TEXT;  -- 'hired' | 'rejected' | NULL

-- ─── 3. TABLE pipeline_actions (actions rapides) ─────────────
-- Historique des actions effectuées depuis le pipeline

CREATE TABLE IF NOT EXISTS pipeline_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL, -- 'stage_move' | 'interview_scheduled' | 'note_added' | 'rejected' | 'archived' | 'score_updated'
  action_data   JSONB DEFAULT '{}',
  performed_by  UUID REFERENCES users(id),
  performed_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_actions_app  ON pipeline_actions(application_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_actions_org  ON pipeline_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_actions_date ON pipeline_actions(performed_at DESC);

-- RLS pipeline_actions
ALTER TABLE pipeline_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_actions_org ON pipeline_actions;
CREATE POLICY pipeline_actions_org ON pipeline_actions
  USING (organization_id = auth_user_organization_id());

-- ─── 4. TABLE recruitment_metrics (cache métriques recrutement) ──

CREATE TABLE IF NOT EXISTS recruitment_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  job_id          UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  computed_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_to_hire_days   NUMERIC(6,1),
  avg_stage_days      JSONB DEFAULT '{}',  -- {stage: avg_days}
  conversion_rates    JSONB DEFAULT '{}',  -- {from_stage: to_stage: rate}
  source_breakdown    JSONB DEFAULT '{}',  -- {source: count}
  total_applicants    INT DEFAULT 0,
  active_applicants   INT DEFAULT 0,
  hired_count         INT DEFAULT 0,
  rejected_count      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recruitment_metrics_org  ON recruitment_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_metrics_job  ON recruitment_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_metrics_date ON recruitment_metrics(computed_at DESC);

ALTER TABLE recruitment_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recruitment_metrics_org ON recruitment_metrics;
CREATE POLICY recruitment_metrics_org ON recruitment_metrics
  USING (organization_id = auth_user_organization_id());

-- ─── 5. DONNÉES INITIALES recruitment_stages ─────────────────
-- Insérer les étapes standards si la table est vide pour l'organisation

-- Note : à exécuter après connexion en tant qu'admin organisation
-- Les organisations doivent disposer d'étapes par défaut

-- ─── 6. COLONNES job_postings (enrichissement S72) ──────────

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS required_skills    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_experience_years INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scoring_criteria   JSONB DEFAULT '{}';
  -- scoring_criteria = {skills_weight: 0.4, experience_weight: 0.3, motivation_weight: 0.3}

-- ─── 7. FONCTION calcul score matching ───────────────────────

CREATE OR REPLACE FUNCTION compute_application_score(
  p_application_id UUID
) RETURNS NUMERIC(4,1)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app         job_applications%ROWTYPE;
  v_job         job_postings%ROWTYPE;
  v_avg_score   NUMERIC;
  v_score       NUMERIC := 0;
BEGIN
  SELECT * INTO v_app FROM job_applications WHERE id = p_application_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_job FROM job_postings WHERE id = v_app.job_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Score basé sur les feedbacks entretien (overall_score SMALLINT 1-10)
  SELECT AVG(f.overall_score::NUMERIC)
    INTO v_avg_score
    FROM interview_schedules s
    JOIN interview_feedback   f ON f.interview_id = s.id
   WHERE s.application_id = p_application_id;

  IF v_avg_score IS NOT NULL THEN
    -- Normaliser sur 100
    v_score := LEAST(100, ROUND((v_avg_score / 10.0) * 100, 1));
  ELSE
    -- Score de base si pas encore d'entretien : 50 par défaut
    v_score := 50.0;
  END IF;

  -- Bonus interne
  IF v_app.is_internal THEN
    v_score := LEAST(100, v_score + 5);
  END IF;

  RETURN v_score;
END;
$$;

-- ─── 8. Vue matérialisée pipeline par offre ───────────────────

DROP MATERIALIZED VIEW IF EXISTS mv_pipeline_by_job CASCADE;
CREATE MATERIALIZED VIEW mv_pipeline_by_job AS
SELECT
  ja.job_id,
  jp.title                         AS job_title,
  jp.contract_type,
  jp.is_published,
  ja.status,
  COUNT(*)                         AS cnt,
  AVG(ja.match_score)              AS avg_score,
  MIN(ja.applied_at)               AS oldest_application,
  MAX(ja.applied_at)               AS newest_application,
  COUNT(*) FILTER (WHERE ja.match_score >= 75) AS high_score_count,
  jp.organization_id
FROM job_applications ja
JOIN job_postings     jp ON jp.id = ja.job_id
WHERE ja.archived_at IS NULL
GROUP BY ja.job_id, jp.title, jp.contract_type, jp.is_published, ja.status, jp.organization_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_pipeline_by_job_pk
  ON mv_pipeline_by_job(job_id, status);
CREATE INDEX IF NOT EXISTS mv_pipeline_by_job_org
  ON mv_pipeline_by_job(organization_id);

-- Révocation accès API direct (sécurité)
REVOKE ALL ON mv_pipeline_by_job FROM anon, authenticated;
GRANT SELECT ON mv_pipeline_by_job TO authenticated;

-- ─── 9. Vue recrutement global enrichi ───────────────────────

DROP MATERIALIZED VIEW IF EXISTS mv_recruitment_dashboard CASCADE;
CREATE MATERIALIZED VIEW mv_recruitment_dashboard AS
WITH hired_apps AS (
  SELECT
    ja.job_id,
    ja.id,
    EXTRACT(DAY FROM (ja.hired_at - ja.applied_at)) AS days_to_hire
  FROM job_applications ja
  WHERE ja.status = 'accepte' AND ja.hired_at IS NOT NULL
),
stage_transitions AS (
  SELECT
    pa.application_id,
    ja.job_id,
    pa.action_data->>'from_stage' AS from_stage,
    pa.action_data->>'to_stage'   AS to_stage,
    pa.performed_at,
    LAG(pa.performed_at) OVER (PARTITION BY pa.application_id ORDER BY pa.performed_at) AS prev_at
  FROM pipeline_actions pa
  JOIN job_applications ja ON ja.id = pa.application_id
  WHERE pa.action_type = 'stage_move'
)
SELECT
  jp.organization_id,
  jp.id                                    AS job_id,
  jp.title                                 AS job_title,
  jp.contract_type,
  jp.published_at,
  jp.closed_at,
  COUNT(DISTINCT ja.id)                    AS total_applicants,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.status NOT IN ('refuse','retire','accepte')) AS active_applicants,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.status = 'accepte')    AS hired_count,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.status = 'refuse')     AS rejected_count,
  AVG(h.days_to_hire)                      AS avg_time_to_hire_days,
  AVG(ja.match_score)                      AS avg_match_score,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.source = 'linkedin')   AS source_linkedin,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.source = 'site_web')   AS source_site_web,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.source = 'referral')   AS source_referral,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.source = 'jobboard')   AS source_jobboard,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.source = 'spontanee')  AS source_spontanee,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.source = 'autre' OR ja.source IS NULL) AS source_autre
FROM job_postings     jp
LEFT JOIN job_applications ja ON ja.job_id = jp.id AND ja.archived_at IS NULL
LEFT JOIN hired_apps       h  ON h.id = ja.id
GROUP BY jp.id, jp.organization_id, jp.title, jp.contract_type, jp.published_at, jp.closed_at;

CREATE UNIQUE INDEX IF NOT EXISTS mv_recruitment_dashboard_pk
  ON mv_recruitment_dashboard(job_id);
CREATE INDEX IF NOT EXISTS mv_recruitment_dashboard_org
  ON mv_recruitment_dashboard(organization_id);

REVOKE ALL ON mv_recruitment_dashboard FROM anon, authenticated;
GRANT SELECT ON mv_recruitment_dashboard TO authenticated;

-- ─── 10. REFRESH FUNCTION ─────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_recruitment_mvs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pipeline_by_job;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recruitment_dashboard;
END;
$$;
