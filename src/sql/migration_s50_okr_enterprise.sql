-- ============================================================
-- APEX RH — migration_s50_okr_enterprise.sql
-- Session 50 — OKR Enterprise : cascade parent-enfant + KPI custom
-- ============================================================
-- ⚠️  Exécuter dans Supabase SQL Editor (Dashboard > SQL Editor)
-- ⚠️  Ordre : 1-colonnes → 2-vues → 3-trigger → 4-kpis → 5-rls
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 1. COLONNES objectives (parent_id + weight)
-- ══════════════════════════════════════════════════════════════

-- parent_id : FK auto-référente, nullable, cascade SET NULL
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES objectives(id) ON DELETE SET NULL;

-- weight : poids de cet objectif dans le calcul du parent (défaut 1.0)
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) NOT NULL DEFAULT 1.0
    CONSTRAINT weight_positive CHECK (weight > 0);

-- Index pour les lookups parent→enfants (très fréquents)
CREATE INDEX IF NOT EXISTS idx_objectives_parent_id
  ON objectives(parent_id)
  WHERE parent_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════
-- 2. VUE v_okr_cascade — arbre complet par racine
-- ══════════════════════════════════════════════════════════════
-- Retourne chaque nœud avec son chemin complet depuis la racine
-- depth = 0 pour les objectifs racine (sans parent)

DROP VIEW IF EXISTS v_okr_cascade CASCADE;

CREATE OR REPLACE VIEW v_okr_cascade AS
WITH RECURSIVE okr_tree AS (
  -- Racines : objectifs sans parent
  SELECT
    o.id,
    o.title,
    o.level,
    o.status,
    o.progress_score,
    o.weight,
    o.parent_id,
    o.owner_id,
    o.period_id,
    o.direction_id,
    o.division_id,
    o.service_id,
    0 AS depth,
    ARRAY[o.id] AS path,
    o.id AS root_id
  FROM objectives o
  WHERE o.parent_id IS NULL

  UNION ALL

  -- Enfants récursifs
  SELECT
    child.id,
    child.title,
    child.level,
    child.status,
    child.progress_score,
    child.weight,
    child.parent_id,
    child.owner_id,
    child.period_id,
    child.direction_id,
    child.division_id,
    child.service_id,
    parent.depth + 1,
    parent.path || child.id,
    parent.root_id
  FROM objectives child
  INNER JOIN okr_tree parent ON child.parent_id = parent.id
  WHERE NOT child.id = ANY(parent.path) -- protection anti-cycle
)
SELECT
  ot.*,
  u.first_name || ' ' || u.last_name AS owner_name,
  u.role AS owner_role
FROM okr_tree ot
LEFT JOIN users u ON u.id = ot.owner_id;


-- ══════════════════════════════════════════════════════════════
-- 3. VUE v_okr_alignment — progress_score parent ← enfants pondérés
-- ══════════════════════════════════════════════════════════════
-- Pour chaque parent, calcule le progress_score attendu
-- basé sur la moyenne pondérée de ses enfants directs

DROP VIEW IF EXISTS v_okr_alignment CASCADE;

CREATE OR REPLACE VIEW v_okr_alignment AS
SELECT
  p.id                                                     AS parent_id,
  p.title                                                  AS parent_title,
  p.level                                                  AS parent_level,
  p.progress_score                                         AS parent_progress_score,
  COUNT(c.id)                                              AS children_count,
  ROUND(
    SUM(c.progress_score * c.weight) / NULLIF(SUM(c.weight), 0)
  ::NUMERIC, 4)                                            AS weighted_progress,
  -- Gap : différence entre score actuel et score calculé depuis enfants
  ROUND(
    p.progress_score - SUM(c.progress_score * c.weight) / NULLIF(SUM(c.weight), 0)
  ::NUMERIC, 4)                                            AS alignment_gap,
  -- Score d'alignement : 1.0 = parfaitement aligné, < 0.8 = désaligné
  CASE
    WHEN COUNT(c.id) = 0 THEN 1.0
    WHEN ABS(p.progress_score - SUM(c.progress_score * c.weight) / NULLIF(SUM(c.weight), 0)) < 0.05
      THEN 1.0
    WHEN ABS(p.progress_score - SUM(c.progress_score * c.weight) / NULLIF(SUM(c.weight), 0)) < 0.15
      THEN 0.8
    ELSE 0.5
  END                                                      AS alignment_score
FROM objectives p
LEFT JOIN objectives c ON c.parent_id = p.id
GROUP BY p.id, p.title, p.level, p.progress_score;


-- ══════════════════════════════════════════════════════════════
-- 4. TRIGGER — mise à jour automatique progress_score parent
-- ══════════════════════════════════════════════════════════════

-- Fonction trigger
CREATE OR REPLACE FUNCTION fn_update_parent_okr_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id  UUID;
  v_weighted   NUMERIC;
BEGIN
  -- Détermine le parent impacté
  v_parent_id := COALESCE(NEW.parent_id, OLD.parent_id);

  IF v_parent_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalcule la moyenne pondérée des enfants
  SELECT ROUND(
    SUM(progress_score * weight) / NULLIF(SUM(weight), 0)::NUMERIC,
    4
  )
  INTO v_weighted
  FROM objectives
  WHERE parent_id = v_parent_id;

  -- Met à jour le parent (uniquement si valeur change)
  IF v_weighted IS NOT NULL THEN
    UPDATE objectives
    SET progress_score = v_weighted
    WHERE id = v_parent_id
      AND progress_score IS DISTINCT FROM v_weighted;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprime l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_update_parent_okr_progress ON objectives;

-- Crée le trigger sur INSERT, UPDATE et DELETE
CREATE TRIGGER trg_update_parent_okr_progress
  AFTER INSERT OR UPDATE OF progress_score, weight, parent_id OR DELETE
  ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_parent_okr_progress();


-- ══════════════════════════════════════════════════════════════
-- 5. TABLE custom_kpis — KPI personnalisés par utilisateur
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS custom_kpis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  description   TEXT,
  target_value  NUMERIC(12,2) NOT NULL DEFAULT 100,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT '%',
  frequency     TEXT NOT NULL DEFAULT 'mensuel'  -- hebdomadaire | mensuel | trimestriel | annuel
    CONSTRAINT kpi_frequency_check CHECK (frequency IN ('hebdomadaire','mensuel','trimestriel','annuel')),
  status        TEXT NOT NULL DEFAULT 'actif'    -- actif | atteint | archive
    CONSTRAINT kpi_status_check CHECK (status IN ('actif','atteint','archive')),
  color         TEXT DEFAULT '#4F46E5',
  period_id     UUID REFERENCES okr_periods(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_custom_kpis_owner   ON custom_kpis(owner_id);
CREATE INDEX IF NOT EXISTS idx_custom_kpis_status  ON custom_kpis(status) WHERE status = 'actif';
CREATE INDEX IF NOT EXISTS idx_custom_kpis_period  ON custom_kpis(period_id) WHERE period_id IS NOT NULL;

-- Updated_at auto
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_kpis_updated_at ON custom_kpis;
CREATE TRIGGER trg_custom_kpis_updated_at
  BEFORE UPDATE ON custom_kpis
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- 6. RLS custom_kpis
-- ══════════════════════════════════════════════════════════════

ALTER TABLE custom_kpis ENABLE ROW LEVEL SECURITY;

-- Un utilisateur voit ses propres KPIs
CREATE POLICY "kpi_select_own" ON custom_kpis
  FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role::text IN ('administrateur','directeur','direction','chef_division','chef_service')
    )
  );

-- Un utilisateur ne peut modifier que ses propres KPIs (ou admin)
CREATE POLICY "kpi_insert_own" ON custom_kpis
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role::text = 'administrateur')
  );

CREATE POLICY "kpi_update_own" ON custom_kpis
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role::text = 'administrateur')
  );

CREATE POLICY "kpi_delete_own" ON custom_kpis
  FOR DELETE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role::text = 'administrateur')
  );


-- ══════════════════════════════════════════════════════════════
-- 7. VÉRIFICATION (à exécuter après migration)
-- ══════════════════════════════════════════════════════════════
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'objectives' AND column_name IN ('parent_id','weight');
-- SELECT COUNT(*) FROM v_okr_cascade;
-- SELECT COUNT(*) FROM v_okr_alignment;
-- SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_objectives%' OR indexname LIKE 'idx_custom_kpis%';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'custom_kpis';