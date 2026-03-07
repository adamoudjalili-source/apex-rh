-- ============================================================
-- APEX RH — migration_s60_entretiens_annuels.sql
-- Session 60 — Entretiens annuels & Évaluation avancée
-- Tables : annual_review_campaigns, annual_reviews, annual_review_signatures
-- MVs    : mv_annual_campaign_stats, mv_employee_review_history
-- Enums  : annual_review_status, salary_recommendation, review_section_type
-- pg_cron: refresh MVs chaque nuit à 3h00
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE annual_review_status AS ENUM (
    'pending',        -- Créée, pas encore commencée
    'self_in_progress', -- Auto-évaluation en cours
    'self_submitted', -- Auto-évaluation soumise, attend manager
    'meeting_scheduled', -- Entretien planifié
    'manager_in_progress', -- Manager en train de remplir
    'completed',      -- Entretien complété, signature en attente
    'signed',         -- Signé des deux parties
    'archived'        -- Archivé
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM (
    'draft',
    'active',
    'in_progress',
    'completed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE salary_recommendation AS ENUM (
    'maintien',
    'augmentation_merite',
    'augmentation_promotion',
    'revision_exceptionnelle',
    'gel'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TABLE : annual_review_campaigns ─────────────────────────

CREATE TABLE IF NOT EXISTS annual_review_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  year            SMALLINT NOT NULL CHECK (year >= 2020 AND year <= 2099),
  status          campaign_status NOT NULL DEFAULT 'draft',

  -- Dates
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  self_eval_deadline      DATE,
  manager_eval_deadline   DATE,
  meeting_deadline        DATE,

  -- Template configurable (sections JSON)
  -- Structure : [{id, title, type, description, questions:[{key,label,type,required}]}]
  template_sections       JSONB NOT NULL DEFAULT '[]',

  -- Options
  include_pulse_synthesis     BOOLEAN NOT NULL DEFAULT true,
  include_okr_synthesis       BOOLEAN NOT NULL DEFAULT true,
  include_f360_synthesis      BOOLEAN NOT NULL DEFAULT true,
  require_dual_signature      BOOLEAN NOT NULL DEFAULT true,
  allow_employee_comment      BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annual_review_campaigns_org
  ON annual_review_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_annual_review_campaigns_year
  ON annual_review_campaigns(organization_id, year, status);

-- ─── TABLE : annual_reviews ───────────────────────────────────

CREATE TABLE IF NOT EXISTS annual_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  campaign_id     UUID REFERENCES annual_review_campaigns(id) ON DELETE CASCADE NOT NULL,

  -- Parties
  employee_id     UUID REFERENCES users(id) NOT NULL,
  manager_id      UUID REFERENCES users(id) NOT NULL,

  -- Statut
  status          annual_review_status NOT NULL DEFAULT 'pending',

  -- Auto-évaluation (employee)
  self_eval       JSONB,  -- {section_id: {answers, comments}}
  self_comment    TEXT,   -- Commentaire libre final du collaborateur
  self_submitted_at TIMESTAMPTZ,

  -- Évaluation manager
  manager_eval    JSONB,  -- {section_id: {scores, comments}}
  manager_comment TEXT,   -- Commentaire global manager
  manager_submitted_at TIMESTAMPTZ,

  -- Résultat global
  overall_rating          TEXT CHECK (overall_rating IN ('insuffisant','a_ameliorer','satisfaisant','bien','excellent')),
  salary_recommendation   salary_recommendation,
  salary_increase_pct     NUMERIC(5,2),
  salary_increase_amount  NUMERIC(15,2),

  -- Sections structurées
  strengths       TEXT,
  improvement_areas TEXT,
  objectives_next_year JSONB, -- [{title, description, indicator, target, deadline}]
  development_plan     JSONB, -- [{action, type, timeline, support}]

  -- Synthèse automatique (calculée au moment de soumission)
  auto_synthesis  JSONB,  -- {pulse_avg, okr_rate, f360_avg, ...}

  -- Meeting
  meeting_date    TIMESTAMPTZ,
  meeting_location TEXT,
  meeting_notes   TEXT,

  -- Signatures
  employee_signed_at  TIMESTAMPTZ,
  manager_signed_at   TIMESTAMPTZ,
  employee_comment_on_review TEXT, -- Commentaire du collab après lecture eval manager

  -- Dates
  completed_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte : un seul entretien par collaborateur par campagne
  UNIQUE(campaign_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_annual_reviews_org
  ON annual_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_annual_reviews_campaign
  ON annual_reviews(campaign_id);
CREATE INDEX IF NOT EXISTS idx_annual_reviews_employee
  ON annual_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_annual_reviews_manager
  ON annual_reviews(manager_id);
CREATE INDEX IF NOT EXISTS idx_annual_reviews_status
  ON annual_reviews(organization_id, status);

-- ─── TABLE : annual_review_signatures ────────────────────────

CREATE TABLE IF NOT EXISTS annual_review_signatures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID REFERENCES annual_reviews(id) ON DELETE CASCADE NOT NULL,
  signer_id   UUID REFERENCES users(id) NOT NULL,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('employee', 'manager')),
  signed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT,
  user_agent  TEXT,
  -- Hash : SHA256(review_id || signer_id || signed_at)
  signature_hash TEXT,

  UNIQUE(review_id, signer_type)
);

CREATE INDEX IF NOT EXISTS idx_annual_review_signatures_review
  ON annual_review_signatures(review_id);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE annual_review_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_review_signatures ENABLE ROW LEVEL SECURITY;

-- annual_review_campaigns : tous voient les campagnes actives de leur org
DROP POLICY IF EXISTS "annual_review_campaigns_select" ON annual_review_campaigns;
CREATE POLICY "annual_review_campaigns_select" ON annual_review_campaigns
  FOR SELECT USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "annual_review_campaigns_insert" ON annual_review_campaigns;
CREATE POLICY "annual_review_campaigns_insert" ON annual_review_campaigns
  FOR INSERT WITH CHECK (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "annual_review_campaigns_update" ON annual_review_campaigns;
CREATE POLICY "annual_review_campaigns_update" ON annual_review_campaigns
  FOR UPDATE USING (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "annual_review_campaigns_delete" ON annual_review_campaigns;
CREATE POLICY "annual_review_campaigns_delete" ON annual_review_campaigns
  FOR DELETE USING (organization_id = auth_user_organization_id());

-- annual_reviews : employee voit la sienne, manager voit son équipe
DROP POLICY IF EXISTS "annual_reviews_select" ON annual_reviews;
CREATE POLICY "annual_reviews_select" ON annual_reviews
  FOR SELECT USING (
    organization_id = auth_user_organization_id()
    AND (
      employee_id = auth.uid()
      OR manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
          AND u.role IN ('administrateur', 'directeur')
          AND u.organization_id = auth_user_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS "annual_reviews_insert" ON annual_reviews;
CREATE POLICY "annual_reviews_insert" ON annual_reviews
  FOR INSERT WITH CHECK (organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "annual_reviews_update" ON annual_reviews;
CREATE POLICY "annual_reviews_update" ON annual_reviews
  FOR UPDATE USING (
    organization_id = auth_user_organization_id()
    AND (
      employee_id = auth.uid()
      OR manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
          AND u.role IN ('administrateur', 'directeur')
          AND u.organization_id = auth_user_organization_id()
      )
    )
  );

DROP POLICY IF EXISTS "annual_reviews_delete" ON annual_reviews;
CREATE POLICY "annual_reviews_delete" ON annual_reviews
  FOR DELETE USING (organization_id = auth_user_organization_id());

-- annual_review_signatures : pareil
DROP POLICY IF EXISTS "annual_review_signatures_all" ON annual_review_signatures;
CREATE POLICY "annual_review_signatures_all" ON annual_review_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM annual_reviews ar
      WHERE ar.id = annual_review_signatures.review_id
        AND ar.organization_id = auth_user_organization_id()
    )
  );

-- ─── VUES MATÉRIALISÉES ───────────────────────────────────────

-- MV 1 : Statistiques par campagne
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_annual_campaign_stats AS
SELECT
  c.id                AS campaign_id,
  c.organization_id,
  c.title,
  c.year,
  c.status            AS campaign_status,
  c.start_date,
  c.end_date,
  COUNT(r.id)         AS total_reviews,
  COUNT(r.id) FILTER (WHERE r.status = 'pending')            AS pending_count,
  COUNT(r.id) FILTER (WHERE r.status = 'self_in_progress')   AS self_in_progress_count,
  COUNT(r.id) FILTER (WHERE r.status = 'self_submitted')     AS self_submitted_count,
  COUNT(r.id) FILTER (WHERE r.status = 'meeting_scheduled')  AS meeting_scheduled_count,
  COUNT(r.id) FILTER (WHERE r.status IN ('manager_in_progress','completed')) AS manager_in_progress_count,
  COUNT(r.id) FILTER (WHERE r.status = 'signed')             AS signed_count,
  COUNT(r.id) FILTER (WHERE r.status = 'archived')           AS archived_count,
  ROUND(
    COUNT(r.id) FILTER (WHERE r.status IN ('completed','signed','archived'))::numeric
    / NULLIF(COUNT(r.id), 0) * 100, 1
  )                   AS completion_rate,
  -- Répartition des notes
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'excellent')    AS rating_excellent,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'bien')         AS rating_bien,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'satisfaisant') AS rating_satisfaisant,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'a_ameliorer')  AS rating_a_ameliorer,
  COUNT(r.id) FILTER (WHERE r.overall_rating = 'insuffisant')  AS rating_insuffisant,
  -- Reco salariales
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'augmentation_merite')    AS aug_merite_count,
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'augmentation_promotion') AS aug_promotion_count,
  COUNT(r.id) FILTER (WHERE r.salary_recommendation = 'maintien')               AS maintien_count,
  ROUND(AVG(r.salary_increase_pct) FILTER (WHERE r.salary_increase_pct > 0), 2) AS avg_increase_pct,
  now() AS refreshed_at
FROM annual_review_campaigns c
LEFT JOIN annual_reviews r ON r.campaign_id = c.id
GROUP BY c.id, c.organization_id, c.title, c.year, c.status, c.start_date, c.end_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_annual_campaign_stats_campaign
  ON mv_annual_campaign_stats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mv_annual_campaign_stats_org
  ON mv_annual_campaign_stats(organization_id);

-- MV 2 : Historique des évaluations par employé
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employee_review_history AS
SELECT
  r.employee_id,
  r.organization_id,
  COUNT(r.id)    AS total_reviews,
  MAX(c.year)    AS last_review_year,
  AVG(
    CASE r.overall_rating
      WHEN 'excellent'   THEN 5
      WHEN 'bien'        THEN 4
      WHEN 'satisfaisant' THEN 3
      WHEN 'a_ameliorer' THEN 2
      WHEN 'insuffisant' THEN 1
    END
  )              AS avg_rating_score,
  -- Dernière campagne signée
  (SELECT c2.title FROM annual_reviews r2
   JOIN annual_review_campaigns c2 ON c2.id = r2.campaign_id
   WHERE r2.employee_id = r.employee_id
   ORDER BY c2.year DESC LIMIT 1) AS last_campaign_title,
  (SELECT r2.overall_rating FROM annual_reviews r2
   JOIN annual_review_campaigns c2 ON c2.id = r2.campaign_id
   WHERE r2.employee_id = r.employee_id
     AND r2.status IN ('completed','signed','archived')
   ORDER BY c2.year DESC LIMIT 1) AS last_rating,
  now() AS refreshed_at
FROM annual_reviews r
JOIN annual_review_campaigns c ON c.id = r.campaign_id
WHERE r.status IN ('completed', 'signed', 'archived')
GROUP BY r.employee_id, r.organization_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_employee_review_history_emp
  ON mv_employee_review_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_mv_employee_review_history_org
  ON mv_employee_review_history(organization_id);

-- ─── FONCTION REFRESH ────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_annual_review_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_annual_campaign_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_review_history;
END;
$$;

-- ─── TRIGGERS updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION update_annual_review_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_annual_review_campaigns_updated_at ON annual_review_campaigns;
CREATE TRIGGER trg_annual_review_campaigns_updated_at
  BEFORE UPDATE ON annual_review_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_annual_review_updated_at();

DROP TRIGGER IF EXISTS trg_annual_reviews_updated_at ON annual_reviews;
CREATE TRIGGER trg_annual_reviews_updated_at
  BEFORE UPDATE ON annual_reviews
  FOR EACH ROW EXECUTE FUNCTION update_annual_review_updated_at();

-- ─── app_settings : module entretiens_annuels ────────────────

INSERT INTO app_settings (key, value)
VALUES ('entretiens_annuels_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- ─── EXTENSION notification_type ─────────────────────────────

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'annual_review_opened';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'annual_review_self_reminder';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'annual_review_submitted';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'annual_review_completed';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'annual_review_signed';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─── pg_cron : refresh MVs ────────────────────────────────────

SELECT cron.schedule(
  'refresh-annual-review-views-nightly',
  '0 3 * * *',
  $outer$SELECT refresh_annual_review_views();$outer$
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

-- ─── DONNÉES INITIALES : template par défaut ─────────────────
-- (inséré uniquement si la table est vide)

-- Template standard pour entretien annuel
-- (les campagnes l'utiliseront comme base)

-- ─── VÉRIFICATION FINALE ─────────────────────────────────────

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.tables
    WHERE table_name IN ('annual_review_campaigns','annual_reviews','annual_review_signatures')) = 3,
    'Tables S60 manquantes';
  RAISE NOTICE 'Migration S60 OK — Entretiens annuels & Évaluation avancée';
END $$;