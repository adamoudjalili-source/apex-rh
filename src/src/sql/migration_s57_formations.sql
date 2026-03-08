-- ============================================================
-- APEX RH — Migration S57 : Module Formation & Certifications
-- Session 57 — 07/03/2026
-- Tables : training_catalog, training_enrollments,
--          certifications, training_plans, training_plan_items
-- ============================================================

-- ── 1. ENUMS ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE training_type AS ENUM (
    'presentiel', 'e-learning', 'blended', 'webinar', 'coaching', 'conference'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM (
    'inscrit', 'en_cours', 'termine', 'annule', 'abandonne'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_priority AS ENUM ('haute', 'moyenne', 'basse');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_item_status AS ENUM (
    'planifie', 'inscrit', 'en_cours', 'termine', 'reporte', 'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. CATALOGUE FORMATIONS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS training_catalog (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  type             training_type NOT NULL DEFAULT 'e-learning',
  provider         TEXT,
  duration_hours   NUMERIC(6,1),
  max_seats        INTEGER,
  price_xof        NUMERIC(12,2),
  skills_covered   TEXT[],           -- compétences développées
  level            TEXT CHECK(level IN ('debutant','intermediaire','avance')),
  language         TEXT DEFAULT 'fr',
  is_active        BOOLEAN DEFAULT TRUE,
  is_mandatory     BOOLEAN DEFAULT FALSE,
  link_url         TEXT,
  cover_image_url  TEXT,
  tags             TEXT[],
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_catalog_org ON training_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_catalog_type ON training_catalog(type);
CREATE INDEX IF NOT EXISTS idx_training_catalog_active ON training_catalog(is_active);

ALTER TABLE training_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_catalog_org ON training_catalog
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 3. INSCRIPTIONS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_enrollments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_id      UUID NOT NULL REFERENCES training_catalog(id) ON DELETE CASCADE,
  status           enrollment_status NOT NULL DEFAULT 'inscrit',
  enrolled_at      TIMESTAMPTZ DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  progress_pct     SMALLINT DEFAULT 0 CHECK(progress_pct BETWEEN 0 AND 100),
  score            NUMERIC(5,2),          -- note obtenue (si évaluation)
  feedback_rating  SMALLINT CHECK(feedback_rating BETWEEN 1 AND 5),
  feedback_comment TEXT,
  enrolled_by      UUID REFERENCES users(id), -- manager ou RH si inscription externe
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, training_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_org ON training_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON training_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_training ON training_enrollments(training_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON training_enrollments(status);

ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollments_org ON training_enrollments
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 4. CERTIFICATIONS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  issuer           TEXT NOT NULL,
  obtained_at      DATE NOT NULL,
  expires_at       DATE,
  credential_id    TEXT,              -- numéro de certificat
  credential_url   TEXT,              -- lien de vérification
  document_url     TEXT,              -- document uploadé
  training_id      UUID REFERENCES training_catalog(id), -- lié à une formation ?
  skills_validated TEXT[],
  is_verified      BOOLEAN DEFAULT FALSE,
  verified_by      UUID REFERENCES users(id),
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user ON certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expires ON certifications(expires_at);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY certifications_org ON certifications
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 5. PLANS DE FORMATION ────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id       UUID REFERENCES users(id),
  year             SMALLINT NOT NULL,
  budget_xof       NUMERIC(12,2),
  hours_target     NUMERIC(6,1),
  status           TEXT DEFAULT 'brouillon' CHECK(status IN ('brouillon','valide','en_cours','cloture')),
  notes            TEXT,
  validated_at     TIMESTAMPTZ,
  validated_by     UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_training_plans_org ON training_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user ON training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_manager ON training_plans(manager_id);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_plans_org ON training_plans
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 6. ITEMS DU PLAN ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_plan_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  training_id      UUID REFERENCES training_catalog(id) ON DELETE SET NULL,
  free_title       TEXT,              -- si formation hors catalogue
  priority         plan_priority NOT NULL DEFAULT 'moyenne',
  target_date      DATE,
  status           plan_item_status NOT NULL DEFAULT 'planifie',
  budget_xof       NUMERIC(12,2),
  notes            TEXT,
  completed_at     DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (training_id IS NOT NULL OR free_title IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON training_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_training ON training_plan_items(training_id);

ALTER TABLE training_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_items_via_plan ON training_plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_plans tp
      WHERE tp.id = plan_id
        AND tp.organization_id = auth_user_organization_id()
    )
  );

-- ── 7. VUE MATÉRIALISÉE : STATS FORMATION PAR USER ────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_training_stats AS
SELECT
  te.user_id,
  te.organization_id,
  COUNT(*) FILTER (WHERE te.status = 'inscrit')     AS enrollments_pending,
  COUNT(*) FILTER (WHERE te.status = 'en_cours')    AS enrollments_in_progress,
  COUNT(*) FILTER (WHERE te.status = 'termine')     AS enrollments_completed,
  COALESCE(SUM(tc.duration_hours) FILTER (WHERE te.status = 'termine'), 0) AS hours_completed,
  ROUND(AVG(te.feedback_rating) FILTER (WHERE te.feedback_rating IS NOT NULL), 1) AS avg_rating,
  COUNT(c.id) AS certifications_count,
  MAX(te.completed_at) AS last_training_date
FROM training_enrollments te
LEFT JOIN training_catalog tc ON tc.id = te.training_id
LEFT JOIN certifications c ON c.user_id = te.user_id AND c.organization_id = te.organization_id
GROUP BY te.user_id, te.organization_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_training_stats
  ON mv_user_training_stats(user_id, organization_id);

-- ── 8. VUE MATÉRIALISÉE : POPULARITÉ FORMATIONS ───────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_training_popularity AS
SELECT
  te.training_id,
  te.organization_id,
  COUNT(*) FILTER (WHERE te.status != 'annule') AS total_enrollments,
  COUNT(*) FILTER (WHERE te.status = 'termine') AS completions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE te.status = 'termine')
    / NULLIF(COUNT(*) FILTER (WHERE te.status != 'annule'), 0), 1
  ) AS completion_rate,
  ROUND(AVG(te.feedback_rating) FILTER (WHERE te.feedback_rating IS NOT NULL), 1) AS avg_rating,
  ROUND(AVG(te.score) FILTER (WHERE te.score IS NOT NULL), 1) AS avg_score
FROM training_enrollments te
GROUP BY te.training_id, te.organization_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_training_popularity
  ON mv_training_popularity(training_id, organization_id);

-- ── 9. FONCTION REFRESH ──────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_training_views()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_training_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_training_popularity;
END;
$$;

-- ── 10. TRIGGERS updated_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER tr_training_catalog_updated
    BEFORE UPDATE ON training_catalog
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_training_enrollments_updated
    BEFORE UPDATE ON training_enrollments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_certifications_updated
    BEFORE UPDATE ON certifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tr_training_plans_updated
    BEFORE UPDATE ON training_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 11. EXTENSION ENUM notification_type ─────────────────────

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_enrolled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'certification_expiring';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_plan_validated';

-- ── 12. ACTIVATION MODULE FORMATIONS dans app_settings ───────
-- app_settings est une table clé/valeur (key TEXT, value JSONB)

INSERT INTO app_settings (key, value)
VALUES ('formations_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- ── 13. DONNÉES DE DÉMONSTRATION ─────────────────────────────
-- (à adapter selon l'organization_id réel)

-- Formation démo 1
INSERT INTO training_catalog (
  id, organization_id, title, description, type,
  provider, duration_hours, price_xof,
  skills_covered, level, is_active, tags
)
SELECT
  gen_random_uuid(),
  o.id,
  'Excel Avancé : Tableaux de Bord & Power Query',
  'Maîtrisez les fonctionnalités avancées d''Excel pour créer des tableaux de bord dynamiques et automatiser vos analyses de données.',
  'e-learning',
  'Microsoft Learn',
  16.0,
  85000,
  ARRAY['Analyse de données','Reporting','Excel'],
  'intermediaire',
  TRUE,
  ARRAY['bureautique','données','excel']
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM training_catalog tc WHERE tc.organization_id = o.id LIMIT 1
);

-- Formation démo 2
INSERT INTO training_catalog (
  id, organization_id, title, description, type,
  provider, duration_hours, price_xof,
  skills_covered, level, is_active, is_mandatory, tags
)
SELECT
  gen_random_uuid(),
  o.id,
  'Management & Leadership Situationnel',
  'Développez vos compétences managériales avec le modèle SLII : adapter votre style de leadership selon la maturité de vos collaborateurs.',
  'presentiel',
  'Cegos Afrique',
  24.0,
  350000,
  ARRAY['Leadership','Management','Communication'],
  'avance',
  TRUE,
  TRUE,
  ARRAY['management','leadership','soft-skills']
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM training_catalog tc
  WHERE tc.organization_id = o.id AND tc.type = 'presentiel'
  LIMIT 1
);

-- Formation démo 3
INSERT INTO training_catalog (
  id, organization_id, title, description, type,
  provider, duration_hours, price_xof,
  skills_covered, level, is_active, tags
)
SELECT
  gen_random_uuid(),
  o.id,
  'Sécurité Informatique & Bonnes Pratiques',
  'Sensibilisation aux risques cyber, phishing, gestion des mots de passe et protection des données personnelles (RGPD).',
  'e-learning',
  'ANFR Formation',
  4.0,
  25000,
  ARRAY['Cybersécurité','RGPD','Sécurité'],
  'debutant',
  TRUE,
  ARRAY['securite','informatique','compliance']
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM training_catalog tc
  WHERE tc.organization_id = o.id AND tc.type = 'e-learning' AND tc.duration_hours < 10
  LIMIT 1
);

-- ── 14. pg_cron : refresh MVs chaque nuit à 2h ───────────────

SELECT cron.schedule(
  'refresh-training-views-nightly',
  '0 2 * * *',
  $outer$SELECT refresh_training_views();$outer$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-training-views-nightly'
);

-- ── FIN MIGRATION S57 ─────────────────────────────────────────