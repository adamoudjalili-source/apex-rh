-- ============================================================
-- APEX RH — migration_s52_FINAL.sql
-- Version définitive — gère tous les cas (table partielle, vues existantes)
-- EXÉCUTER EN UNE SEULE FOIS dans Supabase SQL Editor
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 1 : DROP de tout ce qui peut bloquer
-- (vues d'abord, puis tables)
-- ══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_direction_okr_strategiques CASCADE;
DROP VIEW IF EXISTS v_direction_trend_12m        CASCADE;
DROP VIEW IF EXISTS v_direction_scorecard        CASCADE;
DROP VIEW IF EXISTS v_drh_global_kpis            CASCADE;
DROP VIEW IF EXISTS v_division_nita_monthly      CASCADE;
DROP VIEW IF EXISTS v_division_monthly_summary   CASCADE;
DROP VIEW IF EXISTS v_nita_trend_3m              CASCADE;
DROP VIEW IF EXISTS v_user_correlation_monthly   CASCADE;
DROP VIEW IF EXISTS v_user_pulse_monthly         CASCADE;
DROP VIEW IF EXISTS v_user_nita_monthly          CASCADE;
DROP VIEW IF EXISTS v_service_monthly_pulse      CASCADE;
DROP VIEW IF EXISTS v_user_okr_summary           CASCADE;
DROP VIEW IF EXISTS v_pulse_trend_3m             CASCADE;
DROP VIEW IF EXISTS v_pulse_monthly_scores       CASCADE;
DROP VIEW IF EXISTS v_okr_alignment              CASCADE;
DROP VIEW IF EXISTS v_okr_cascade                CASCADE;
DROP VIEW IF EXISTS v_talent_ninebox             CASCADE;

DROP TABLE IF EXISTS super_admins  CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 2 : Créer la table organizations (complète)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'enterprise'
             CHECK (plan IN ('trial','starter','professional','enterprise')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  max_users  INTEGER DEFAULT 500,
  domain     TEXT,
  logo_url   TEXT,
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

CREATE INDEX idx_organizations_slug   ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = TRUE;

CREATE TABLE super_admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 3 : Ajouter organization_id sur les tables core
-- ══════════════════════════════════════════════════════════════

ALTER TABLE users               ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE directions          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE divisions           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE services            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE objectives          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE performance_scores  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE agent_activity_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE feedback_requests   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE survey_responses    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE tasks               ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE key_positions       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE custom_kpis         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_organization               ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_directions_organization          ON directions(organization_id);
CREATE INDEX IF NOT EXISTS idx_divisions_organization           ON divisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization            ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_objectives_organization          ON objectives(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_scores_organization  ON performance_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_logs_organization ON agent_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_organization   ON feedback_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_organization    ON survey_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization               ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_key_positions_organization       ON key_positions(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_kpis_organization         ON custom_kpis(organization_id);

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 4 : Insérer org NITA + migrer toutes les données
-- ══════════════════════════════════════════════════════════════

INSERT INTO organizations (id, name, slug, plan, is_active, max_users, domain, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'NITA', 'nita', 'enterprise', true, 1000, 'nita.tg',
  '{"locale":"fr","timezone":"Africa/Lome","currency":"XOF"}'::jsonb
);

DO $$
DECLARE nita_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  UPDATE users               SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE directions          SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE divisions           SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE services            SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE objectives          SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE performance_scores  SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE agent_activity_logs SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE feedback_requests   SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE survey_responses    SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE tasks               SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE key_positions       SET organization_id = nita_id WHERE organization_id IS NULL;
  UPDATE custom_kpis         SET organization_id = nita_id WHERE organization_id IS NULL;
  RAISE NOTICE 'Migration NITA OK';
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 5 : Fonctions RLS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auth_user_organization_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM super_admins WHERE user_id = auth.uid())
$$;

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 6 : Politiques RLS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs_super_admin_all" ON organizations FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "orgs_member_read" ON organizations FOR SELECT TO authenticated
  USING (id = auth_user_organization_id());

DROP POLICY IF EXISTS "users_same_org" ON users;
CREATE POLICY "users_same_org" ON users FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "objectives_same_org" ON objectives;
CREATE POLICY "objectives_same_org" ON objectives FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "perf_scores_same_org" ON performance_scores;
CREATE POLICY "perf_scores_same_org" ON performance_scores FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "activity_logs_same_org" ON agent_activity_logs;
CREATE POLICY "activity_logs_same_org" ON agent_activity_logs FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "key_positions_same_org"      ON key_positions;
DROP POLICY IF EXISTS "key_positions_read_managers" ON key_positions;
DROP POLICY IF EXISTS "key_positions_write_admin"   ON key_positions;
CREATE POLICY "key_positions_same_org" ON key_positions FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "custom_kpis_same_org" ON custom_kpis;
CREATE POLICY "custom_kpis_same_org" ON custom_kpis FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

DROP POLICY IF EXISTS "tasks_same_org" ON tasks;
CREATE POLICY "tasks_same_org" ON tasks FOR ALL TO authenticated
  USING (is_super_admin() OR organization_id = auth_user_organization_id());

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 7 : Recréer toutes les vues
-- Statuts objectives : brouillon | actif | en_evaluation | valide | archive
-- Levels objectives   : strategique | division | service | individuel
-- ══════════════════════════════════════════════════════════════

-- S33
CREATE VIEW v_pulse_monthly_scores AS
SELECT
  ps.user_id,
  ps.organization_id,
  DATE_TRUNC('month', ps.score_date::date)::date AS month_start,
  TO_CHAR(ps.score_date::date, 'YYYY-MM')         AS month_key,
  ROUND(AVG(ps.score_total))::integer             AS avg_total,
  ROUND(AVG(ps.score_delivery))::integer          AS avg_delivery,
  ROUND(AVG(ps.score_quality))::integer           AS avg_quality,
  COUNT(*)::integer                               AS nb_jours
FROM performance_scores ps
WHERE ps.score_total IS NOT NULL
GROUP BY ps.user_id, ps.organization_id,
         DATE_TRUNC('month', ps.score_date::date),
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

CREATE VIEW v_pulse_trend_3m AS
SELECT
  ps.user_id,
  ps.organization_id,
  TO_CHAR(ps.score_date::date, 'YYYY-MM') AS month_key,
  ROUND(AVG(ps.score_total))::integer     AS avg_total
FROM performance_scores ps
WHERE ps.score_date >= CURRENT_DATE - INTERVAL '3 months'
  AND ps.score_total IS NOT NULL
GROUP BY ps.user_id, ps.organization_id,
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

CREATE VIEW v_user_okr_summary AS
SELECT
  o.owner_id        AS user_id,
  o.organization_id,
  o.period_id,
  COUNT(*)::integer                                              AS total_objectives,
  COUNT(*) FILTER (WHERE o.status = 'valide')::integer          AS valide,
  COUNT(*) FILTER (WHERE o.status = 'actif')::integer           AS actif,
  COUNT(*) FILTER (WHERE o.status = 'en_evaluation')::integer   AS en_evaluation,
  ROUND(AVG(o.progress_score))::integer                         AS avg_progress
FROM objectives o
WHERE o.status NOT IN ('brouillon', 'archive')
GROUP BY o.owner_id, o.organization_id, o.period_id;

CREATE VIEW v_service_monthly_pulse AS
SELECT
  s.id   AS service_id,
  s.name AS service_name,
  ps.organization_id,
  TO_CHAR(ps.score_date::date, 'YYYY-MM') AS month_key,
  COUNT(DISTINCT ps.user_id)::integer     AS nb_agents,
  ROUND(AVG(ps.score_total))::integer     AS avg_pulse
FROM services s
JOIN users u ON u.service_id = s.id AND u.is_active = TRUE
JOIN performance_scores ps ON ps.user_id = u.id AND ps.score_total IS NOT NULL
GROUP BY s.id, s.name, ps.organization_id,
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

-- S46
CREATE VIEW v_user_nita_monthly AS
SELECT
  user_id,
  organization_id,
  DATE_TRUNC('month', date::date)::date  AS month_start,
  TO_CHAR(date::date, 'YYYY-MM')         AS month_key,
  ROUND(AVG(resilience_score))::integer  AS avg_resilience,
  ROUND(AVG(reliability_score))::integer AS avg_reliability,
  ROUND(AVG(endurance_score))::integer   AS avg_endurance,
  ROUND(
    AVG(resilience_score)  * 0.35 +
    AVG(reliability_score) * 0.40 +
    AVG(endurance_score)   * 0.25
  )::integer AS avg_nita_composite,
  COUNT(*)::integer AS days_logged
FROM agent_activity_logs
WHERE resilience_score IS NOT NULL
   OR reliability_score IS NOT NULL
   OR endurance_score   IS NOT NULL
GROUP BY user_id, organization_id,
         DATE_TRUNC('month', date::date),
         TO_CHAR(date::date, 'YYYY-MM');

CREATE VIEW v_user_pulse_monthly AS
SELECT
  ps.user_id,
  ps.organization_id,
  DATE_TRUNC('month', ps.score_date::date)::date AS month_start,
  TO_CHAR(ps.score_date::date, 'YYYY-MM')         AS month_key,
  ROUND(AVG(ps.score_total))::integer             AS avg_pulse,
  ROUND(AVG(ps.score_delivery))::integer          AS avg_delivery,
  ROUND(AVG(ps.score_quality))::integer           AS avg_quality,
  COUNT(*)::integer                               AS days_logged
FROM performance_scores ps
WHERE ps.score_total IS NOT NULL
GROUP BY ps.user_id, ps.organization_id,
         DATE_TRUNC('month', ps.score_date::date),
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

CREATE VIEW v_user_correlation_monthly AS
SELECT
  p.user_id,
  p.organization_id,
  p.month_key,
  p.avg_pulse,
  p.avg_delivery,
  p.avg_quality,
  n.avg_nita_composite,
  n.avg_resilience,
  n.avg_reliability,
  n.avg_endurance
FROM v_user_pulse_monthly p
LEFT JOIN v_user_nita_monthly n
  ON n.user_id = p.user_id AND n.month_key = p.month_key;

CREATE VIEW v_nita_trend_3m AS
SELECT
  user_id,
  organization_id,
  TO_CHAR(date::date, 'YYYY-MM') AS month_key,
  ROUND(AVG(
    resilience_score  * 0.35 +
    reliability_score * 0.40 +
    endurance_score   * 0.25
  ))::integer AS avg_nita_composite
FROM agent_activity_logs
WHERE date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY user_id, organization_id, TO_CHAR(date::date, 'YYYY-MM');

-- S47
CREATE VIEW v_division_monthly_summary AS
SELECT
  d.id   AS division_id,
  d.name AS division_name,
  u.organization_id,
  TO_CHAR(ps.score_date::date, 'YYYY-MM') AS month_key,
  COUNT(DISTINCT u.id)::integer           AS nb_agents,
  ROUND(AVG(ps.score_total))::integer     AS avg_pulse,
  ROUND(AVG(ps.score_delivery))::integer  AS avg_delivery,
  ROUND(AVG(ps.score_quality))::integer   AS avg_quality,
  COUNT(DISTINCT ps.user_id)::integer     AS agents_with_pulse
FROM divisions d
JOIN users u ON u.division_id = d.id AND u.is_active = TRUE
JOIN performance_scores ps ON ps.user_id = u.id AND ps.score_total IS NOT NULL
GROUP BY d.id, d.name, u.organization_id,
         TO_CHAR(ps.score_date::date, 'YYYY-MM');

CREATE VIEW v_division_nita_monthly AS
SELECT
  d.id   AS division_id,
  d.name AS division_name,
  u.organization_id,
  TO_CHAR(aal.date::date, 'YYYY-MM')           AS month_key,
  ROUND(AVG(aal.resilience_score))::integer    AS avg_resilience,
  ROUND(AVG(aal.reliability_score))::integer   AS avg_reliability,
  ROUND(AVG(aal.endurance_score))::integer     AS avg_endurance,
  ROUND(
    AVG(aal.resilience_score)  * 0.35 +
    AVG(aal.reliability_score) * 0.40 +
    AVG(aal.endurance_score)   * 0.25
  )::integer AS avg_nita_composite,
  COUNT(DISTINCT aal.user_id)::integer         AS agents_with_nita
FROM divisions d
JOIN users u ON u.division_id = d.id AND u.is_active = TRUE
JOIN agent_activity_logs aal ON aal.user_id = u.id
GROUP BY d.id, d.name, u.organization_id,
         TO_CHAR(aal.date::date, 'YYYY-MM');

CREATE VIEW v_drh_global_kpis AS
SELECT
  u.organization_id,
  TO_CHAR(NOW(), 'YYYY-MM')               AS month_key,
  COUNT(DISTINCT u.id)::integer           AS total_actifs,
  ROUND(AVG(ps.score_total))::integer     AS avg_pulse_global,
  ROUND(AVG(
    aal.resilience_score  * 0.35 +
    aal.reliability_score * 0.40 +
    aal.endurance_score   * 0.25
  ))::integer AS avg_nita_global,
  COUNT(DISTINCT CASE
    WHEN ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
    THEN ps.user_id END)::integer AS agents_actifs_30j
FROM users u
LEFT JOIN performance_scores ps
  ON ps.user_id = u.id
  AND ps.score_date >= CURRENT_DATE - INTERVAL '90 days'
LEFT JOIN agent_activity_logs aal
  ON aal.user_id = u.id
  AND aal.date >= CURRENT_DATE - INTERVAL '90 days'
WHERE u.is_active = TRUE
  AND u.role NOT IN ('administrateur', 'directeur')
GROUP BY u.organization_id;

-- S48
CREATE VIEW v_direction_scorecard AS
SELECT
  u.organization_id,
  TO_CHAR(NOW(), 'YYYY-MM')               AS month_key,
  ROUND(AVG(ps.score_total))::integer     AS avg_pulse,
  ROUND(AVG(
    aal.resilience_score  * 0.35 +
    aal.reliability_score * 0.40 +
    aal.endurance_score   * 0.25
  ))::integer AS avg_nita,
  CASE
    WHEN ROUND(AVG(ps.score_total)) >= 75 THEN 'green'
    WHEN ROUND(AVG(ps.score_total)) >= 55 THEN 'amber'
    ELSE 'red'
  END AS rag_status
FROM users u
LEFT JOIN performance_scores ps
  ON ps.user_id = u.id
  AND ps.score_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN agent_activity_logs aal
  ON aal.user_id = u.id
  AND aal.date >= CURRENT_DATE - INTERVAL '30 days'
WHERE u.is_active = TRUE
GROUP BY u.organization_id;

CREATE VIEW v_direction_trend_12m AS
SELECT
  p.organization_id,
  p.month_key,
  p.avg_pulse,
  n.avg_nita_composite AS avg_nita,
  COUNT(DISTINCT p.user_id)::integer AS agents_actifs
FROM v_user_pulse_monthly p
LEFT JOIN v_user_nita_monthly n
  ON n.user_id = p.user_id AND n.month_key = p.month_key
WHERE p.month_key >= TO_CHAR(NOW() - INTERVAL '12 months', 'YYYY-MM')
GROUP BY p.organization_id, p.month_key, p.avg_pulse, n.avg_nita_composite;

CREATE VIEW v_direction_okr_strategiques AS
SELECT
  o.organization_id,
  o.id,
  o.title,
  o.progress_score,
  o.status,
  CASE
    WHEN o.progress_score >= 70 THEN 'green'
    WHEN o.progress_score >= 40 THEN 'amber'
    ELSE 'red'
  END AS health_status
FROM objectives o
WHERE o.level = 'strategique'
  AND o.status NOT IN ('brouillon', 'archive');

-- S50
CREATE VIEW v_okr_cascade AS
WITH RECURSIVE cascade AS (
  SELECT id, title, level, status, progress_score, owner_id,
         parent_id, weight, organization_id, 0 AS depth
  FROM objectives WHERE parent_id IS NULL
  UNION ALL
  SELECT o.id, o.title, o.level, o.status, o.progress_score, o.owner_id,
         o.parent_id, o.weight, o.organization_id, c.depth + 1
  FROM objectives o
  JOIN cascade c ON o.parent_id = c.id
)
SELECT * FROM cascade;

CREATE VIEW v_okr_alignment AS
SELECT
  p.id AS parent_id,
  p.title AS parent_title,
  p.progress_score AS parent_progress,
  p.organization_id,
  ROUND(SUM(c.progress_score * COALESCE(c.weight, 1.0)) /
        NULLIF(SUM(COALESCE(c.weight, 1.0)), 0))::integer AS weighted_child_progress,
  ABS(p.progress_score - ROUND(SUM(c.progress_score * COALESCE(c.weight, 1.0)) /
        NULLIF(SUM(COALESCE(c.weight, 1.0)), 0))::integer) AS gap,
  CASE
    WHEN ABS(p.progress_score - ROUND(SUM(c.progress_score * COALESCE(c.weight, 1.0)) /
         NULLIF(SUM(COALESCE(c.weight, 1.0)), 0))::integer) <= 5  THEN 1.0
    WHEN ABS(p.progress_score - ROUND(SUM(c.progress_score * COALESCE(c.weight, 1.0)) /
         NULLIF(SUM(COALESCE(c.weight, 1.0)), 0))::integer) <= 15 THEN 0.8
    ELSE 0.5
  END AS alignment_score
FROM objectives p
JOIN objectives c ON c.parent_id = p.id
GROUP BY p.id, p.title, p.progress_score, p.organization_id;

-- S51
CREATE VIEW v_talent_ninebox AS
WITH pulse_perf AS (
  SELECT
    ps.user_id,
    ROUND(AVG(ps.score_total))::integer AS avg_pulse_3m
  FROM performance_scores ps
  WHERE ps.score_date >= CURRENT_DATE - INTERVAL '3 months'
    AND ps.score_total IS NOT NULL
  GROUP BY ps.user_id
),
okr_score AS (
  SELECT
    o.owner_id AS user_id,
    ROUND(AVG(o.progress_score))::integer AS avg_okr
  FROM objectives o
  WHERE o.status NOT IN ('brouillon', 'archive')
  GROUP BY o.owner_id
),
f360_score AS (
  SELECT
    fr.evaluated_id AS user_id,
    COUNT(fr.id) AS nb_feedbacks
  FROM feedback_requests fr
  WHERE fr.status = 'completed'
  GROUP BY fr.evaluated_id
),
anciennete AS (
  SELECT
    u.id AS user_id,
    EXTRACT(YEAR FROM AGE(NOW(), u.created_at))::integer AS annees
  FROM users u
)
SELECT
  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.role,
  u.organization_id,
  COALESCE(pp.avg_pulse_3m, 50)::integer AS performance_score,
  LEAST(
    ROUND(
      COALESCE(ok.avg_okr, 50) * 0.40 +
      LEAST(COALESCE(f3.nb_feedbacks, 0) * 10, 40) +
      GREATEST(20 - COALESCE(an.annees, 0) * 2, 0)
    ), 100
  )::integer AS potentiel_score,
  CASE
    WHEN COALESCE(pp.avg_pulse_3m, 50) >= 70 AND LEAST(ROUND(COALESCE(ok.avg_okr,50)*0.40+LEAST(COALESCE(f3.nb_feedbacks,0)*10,40)+GREATEST(20-COALESCE(an.annees,0)*2,0)),100) >= 70 THEN '9'
    WHEN COALESCE(pp.avg_pulse_3m, 50) >= 70 AND LEAST(ROUND(COALESCE(ok.avg_okr,50)*0.40+LEAST(COALESCE(f3.nb_feedbacks,0)*10,40)+GREATEST(20-COALESCE(an.annees,0)*2,0)),100) >= 40 THEN '8'
    WHEN COALESCE(pp.avg_pulse_3m, 50) >= 70 THEN '7'
    WHEN COALESCE(pp.avg_pulse_3m, 50) >= 40 AND LEAST(ROUND(COALESCE(ok.avg_okr,50)*0.40+LEAST(COALESCE(f3.nb_feedbacks,0)*10,40)+GREATEST(20-COALESCE(an.annees,0)*2,0)),100) >= 70 THEN '6'
    WHEN COALESCE(pp.avg_pulse_3m, 50) >= 40 AND LEAST(ROUND(COALESCE(ok.avg_okr,50)*0.40+LEAST(COALESCE(f3.nb_feedbacks,0)*10,40)+GREATEST(20-COALESCE(an.annees,0)*2,0)),100) >= 40 THEN '5'
    WHEN COALESCE(pp.avg_pulse_3m, 50) >= 40 THEN '4'
    WHEN LEAST(ROUND(COALESCE(ok.avg_okr,50)*0.40+LEAST(COALESCE(f3.nb_feedbacks,0)*10,40)+GREATEST(20-COALESCE(an.annees,0)*2,0)),100) >= 70 THEN '3'
    WHEN LEAST(ROUND(COALESCE(ok.avg_okr,50)*0.40+LEAST(COALESCE(f3.nb_feedbacks,0)*10,40)+GREATEST(20-COALESCE(an.annees,0)*2,0)),100) >= 40 THEN '2'
    ELSE '1'
  END AS ninebox_cell
FROM users u
LEFT JOIN pulse_perf pp ON pp.user_id = u.id
LEFT JOIN okr_score  ok ON ok.user_id = u.id
LEFT JOIN f360_score f3 ON f3.user_id = u.id
LEFT JOIN anciennete an ON an.user_id = u.id
WHERE u.is_active = TRUE
  AND u.role NOT IN ('administrateur', 'directeur');

-- ══════════════════════════════════════════════════════════════
-- VÉRIFICATIONS FINALES
-- ══════════════════════════════════════════════════════════════
-- SELECT id, name, slug FROM organizations;
-- SELECT organization_id, COUNT(*) FROM users GROUP BY organization_id;
-- SELECT viewname FROM pg_views WHERE viewname LIKE 'v_%' ORDER BY viewname;
-- SELECT auth_user_organization_id();