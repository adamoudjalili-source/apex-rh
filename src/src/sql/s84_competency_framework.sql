-- ============================================================
-- APEX RH — s84_competency_framework.sql  ·  Session 84
-- Référentiel Compétences — Cartographie + gaps
-- Tables : competency_categories, competencies,
--          role_competency_requirements, user_competency_assessments
-- MV     : mv_competency_coverage
-- RPC    : get_competency_gaps(p_org_id, p_user_id?)
--          refresh_competency_coverage_mv()
-- ============================================================

-- ─── 1. CATÉGORIES DE COMPÉTENCES ────────────────────────────
CREATE TABLE IF NOT EXISTS competency_categories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  color            text NOT NULL DEFAULT '#4F46E5',
  icon             text NOT NULL DEFAULT '🎯',
  order_index      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- ─── 2. COMPÉTENCES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competencies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id      uuid REFERENCES competency_categories(id) ON DELETE SET NULL,
  name             text NOT NULL,
  description      text,
  -- levels : [{level:1, label:'Débutant', descriptor:'...'}]
  levels           jsonb NOT NULL DEFAULT '[]',
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- ─── 3. EXIGENCES PAR RÔLE / POSTE ───────────────────────────
CREATE TABLE IF NOT EXISTS role_competency_requirements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- role_name OU position_id, l'un des deux
  role_name        text,
  position_id      uuid REFERENCES key_positions(id) ON DELETE CASCADE,
  competency_id    uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  required_level   integer NOT NULL CHECK (required_level BETWEEN 1 AND 5),
  weight           numeric(4,2) NOT NULL DEFAULT 1.0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, role_name, competency_id),
  UNIQUE (organization_id, position_id, competency_id),
  CHECK (role_name IS NOT NULL OR position_id IS NOT NULL)
);

-- ─── 4. ÉVALUATIONS INDIVIDUELLES ────────────────────────────
CREATE TABLE IF NOT EXISTS user_competency_assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id    uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  assessed_level   integer NOT NULL CHECK (assessed_level BETWEEN 1 AND 5),
  assessed_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  assessed_at      timestamptz NOT NULL DEFAULT now(),
  source           text NOT NULL DEFAULT 'manager'
                   CHECK (source IN ('manager','self','360','import')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, competency_id, source)
);

-- ─── 5. INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_competency_categories_org ON competency_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_competencies_org          ON competencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_competencies_category     ON competencies(category_id);
CREATE INDEX IF NOT EXISTS idx_role_req_org              ON role_competency_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_req_position         ON role_competency_requirements(position_id);
CREATE INDEX IF NOT EXISTS idx_uca_org_user              ON user_competency_assessments(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_uca_competency            ON user_competency_assessments(competency_id);

-- ─── 6. RLS ──────────────────────────────────────────────────
ALTER TABLE competency_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_competency_requirements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_competency_assessments   ENABLE ROW LEVEL SECURITY;

-- competency_categories
CREATE POLICY "org_read_categories" ON competency_categories
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "admin_write_categories" ON competency_categories
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

-- competencies
CREATE POLICY "org_read_competencies" ON competencies
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "admin_write_competencies" ON competencies
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

-- role_competency_requirements
CREATE POLICY "org_read_role_req" ON role_competency_requirements
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "admin_write_role_req" ON role_competency_requirements
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

-- user_competency_assessments — manager/admin peut écrire, tout le monde peut lire la sienne
CREATE POLICY "org_read_assessments" ON user_competency_assessments
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "manager_write_assessments" ON user_competency_assessments
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('chef_service','chef_division','administrateur','directeur')
  );

-- ─── 7. VUE MATÉRIALISÉE : COUVERTURE COMPÉTENCES ────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_competency_coverage AS
SELECT
  uca.organization_id,
  uca.user_id,
  u.first_name || ' ' || u.last_name                        AS user_name,
  u.role::text                                                   AS user_role,
  uca.competency_id,
  c.name                                                     AS competency_name,
  cat.name                                                   AS category_name,
  cat.color                                                  AS category_color,
  MAX(uca.assessed_level)                                    AS best_level,
  -- Niveau exigé selon rôle
  MAX(rcr.required_level)                                    AS required_level,
  -- Gap = required - best (négatif = dépassé)
  COALESCE(MAX(rcr.required_level), 3) - MAX(uca.assessed_level) AS gap
FROM user_competency_assessments uca
JOIN users u        ON u.id = uca.user_id
JOIN competencies c ON c.id = uca.competency_id
LEFT JOIN competency_categories cat ON cat.id = c.category_id
LEFT JOIN role_competency_requirements rcr
       ON rcr.competency_id = uca.competency_id
      AND rcr.organization_id = uca.organization_id
      AND rcr.role_name = u.role::text
GROUP BY
  uca.organization_id, uca.user_id, u.first_name, u.last_name, u.role::text,
  uca.competency_id, c.name, cat.name, cat.color
WITH DATA;

REVOKE ALL ON mv_competency_coverage FROM PUBLIC;
REVOKE ALL ON mv_competency_coverage FROM anon;
REVOKE ALL ON mv_competency_coverage FROM authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_competency_coverage_pk
  ON mv_competency_coverage(organization_id, user_id, competency_id);

-- ─── 8. RPC : GET_COMPETENCY_GAPS ────────────────────────────
CREATE OR REPLACE FUNCTION get_competency_gaps(
  p_org_id  uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id        uuid,
  user_name      text,
  user_role      text,
  competency_id  uuid,
  competency_name text,
  category_name  text,
  category_color text,
  best_level     integer,
  required_level integer,
  gap            integer
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Vérification org
  IF (SELECT organization_id FROM users WHERE id = auth.uid()) <> p_org_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    mv.user_id,
    mv.user_name,
    mv.user_role,
    mv.competency_id,
    mv.competency_name,
    mv.category_name,
    mv.category_color,
    mv.best_level::integer,
    mv.required_level::integer,
    mv.gap::integer
  FROM mv_competency_coverage mv
  WHERE mv.organization_id = p_org_id
    AND (p_user_id IS NULL OR mv.user_id = p_user_id)
  ORDER BY mv.gap DESC, mv.user_name, mv.competency_name;
END;
$$;

-- ─── 9. RPC : REFRESH MV ─────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_competency_coverage_mv()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT role FROM users WHERE id = auth.uid()) NOT IN ('administrateur','directeur') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_competency_coverage;
END;
$$;

-- ─── 10. DONNÉES AMORCE (catégories par défaut) ──────────────
-- À exécuter manuellement par org si nécessaire :
-- INSERT INTO competency_categories (organization_id, name, color, icon, order_index)
-- VALUES
--   (:org_id, 'Techniques',       '#4F46E5', '⚙️',  1),
--   (:org_id, 'Comportementales', '#10B981', '🤝',  2),
--   (:org_id, 'Managériales',     '#F59E0B', '👥',  3),
--   (:org_id, 'Transversales',    '#8B5CF6', '🔗',  4);