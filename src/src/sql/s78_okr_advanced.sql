-- ============================================================
-- APEX RH — s78_okr_advanced.sql
-- Session 78 — OKR : Cycles + Check-ins + Lien évaluation
-- ============================================================
-- Exécuter dans Supabase SQL Editor (Dashboard > SQL Editor)
-- Ordre : 1-enums → 2-colonnes → 3-tables → 4-index → 5-rls → 6-rpc
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE okr_cycle_status AS ENUM ('draft', 'active', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE okr_cycle_cadence AS ENUM ('quarterly', 'semestrial', 'annual', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kr_confidence_level AS ENUM ('high', 'medium', 'low', 'at_risk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. TABLE okr_cycles
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS okr_cycles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  cadence          okr_cycle_cadence NOT NULL DEFAULT 'quarterly',
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  status           okr_cycle_status NOT NULL DEFAULT 'draft',
  description      text,
  created_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  closed_at        timestamptz,
  closed_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT okr_cycles_dates_check CHECK (end_date > start_date)
);

-- ══════════════════════════════════════════════════════════════
-- 3. TABLE okr_checkins
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS okr_checkins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_result_id    uuid NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_value   numeric(5,2) NOT NULL CHECK (progress_value >= 0 AND progress_value <= 100),
  confidence       kr_confidence_level NOT NULL DEFAULT 'medium',
  note             text,
  checked_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 4. COLONNES sur objectives + key_results
-- ══════════════════════════════════════════════════════════════

-- objectives : lien cycle + alignement
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS cycle_id          uuid REFERENCES okr_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_objective_id uuid REFERENCES objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alignment_score   numeric(5,2) DEFAULT 0;

-- key_results : niveau de confiance
ALTER TABLE key_results
  ADD COLUMN IF NOT EXISTS confidence_level  kr_confidence_level DEFAULT 'medium';

-- ══════════════════════════════════════════════════════════════
-- 5. INDEX
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_okr_cycles_org        ON okr_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_okr_cycles_status     ON okr_cycles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_okr_checkins_kr       ON okr_checkins(key_result_id);
CREATE INDEX IF NOT EXISTS idx_okr_checkins_user     ON okr_checkins(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_okr_checkins_date     ON okr_checkins(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_objectives_cycle      ON objectives(cycle_id) WHERE cycle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_objectives_parent_obj ON objectives(parent_objective_id) WHERE parent_objective_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

-- okr_cycles
ALTER TABLE okr_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "okr_cycles_select" ON okr_cycles;
CREATE POLICY "okr_cycles_select" ON okr_cycles
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "okr_cycles_insert" ON okr_cycles;
CREATE POLICY "okr_cycles_insert" ON okr_cycles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur', 'directeur')
  );

DROP POLICY IF EXISTS "okr_cycles_update" ON okr_cycles;
CREATE POLICY "okr_cycles_update" ON okr_cycles
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur', 'directeur')
  );

DROP POLICY IF EXISTS "okr_cycles_delete" ON okr_cycles;
CREATE POLICY "okr_cycles_delete" ON okr_cycles
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'administrateur'
  );

-- okr_checkins
ALTER TABLE okr_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "okr_checkins_select" ON okr_checkins;
CREATE POLICY "okr_checkins_select" ON okr_checkins
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "okr_checkins_insert" ON okr_checkins;
CREATE POLICY "okr_checkins_insert" ON okr_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "okr_checkins_delete" ON okr_checkins;
CREATE POLICY "okr_checkins_delete" ON okr_checkins
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- 7. FONCTIONS RPC
-- ══════════════════════════════════════════════════════════════

-- get_okr_cycle_stats : statistiques d'un cycle (objectifs, KRs, progression)
CREATE OR REPLACE FUNCTION get_okr_cycle_stats(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_result jsonb;
BEGIN
  -- Vérifier appartenance organisation
  SELECT organization_id INTO v_org_id FROM okr_cycles WHERE id = p_cycle_id;
  IF v_org_id IS DISTINCT FROM (SELECT organization_id FROM users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_objectives',    COUNT(DISTINCT o.id),
    'total_key_results',   COUNT(DISTINCT kr.id),
    'avg_progress',        ROUND(AVG(COALESCE(kr.current_value, 0))::numeric, 1),
    'at_risk_count',       COUNT(DISTINCT kr.id) FILTER (WHERE kr.confidence_level = 'at_risk'),
    'completed_count',     COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'valide'),
    'by_level',            jsonb_object_agg(
      COALESCE(o.level, 'individuel'),
      jsonb_build_object(
        'count', COUNT(DISTINCT o.id),
        'avg_progress', ROUND(AVG(COALESCE(o.progress_score, 0))::numeric, 1)
      )
    )
  ) INTO v_result
  FROM objectives o
  LEFT JOIN key_results kr ON kr.objective_id = o.id
  WHERE o.cycle_id = p_cycle_id;

  RETURN v_result;
END;
$$;

-- get_okr_alignment_tree : arbre d'alignement des objectifs d'un cycle
CREATE OR REPLACE FUNCTION get_okr_alignment_tree(p_cycle_id uuid)
RETURNS TABLE (
  id            uuid,
  title         text,
  level         text,
  status        text,
  progress_score numeric,
  owner_name    text,
  parent_objective_id uuid,
  depth         int,
  child_count   int
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM okr_cycles WHERE id = p_cycle_id;
  IF v_org_id IS DISTINCT FROM (SELECT organization_id FROM users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT
      o.id, o.title, o.level::text, o.status::text,
      o.progress_score, o.parent_objective_id,
      0 AS depth
    FROM objectives o
    WHERE o.cycle_id = p_cycle_id AND o.parent_objective_id IS NULL

    UNION ALL

    SELECT
      o.id, o.title, o.level::text, o.status::text,
      o.progress_score, o.parent_objective_id,
      t.depth + 1
    FROM objectives o
    JOIN tree t ON o.parent_objective_id = t.id
    WHERE o.cycle_id = p_cycle_id
  )
  SELECT
    t.id,
    t.title,
    t.level,
    t.status,
    t.progress_score,
    COALESCE(u.first_name || ' ' || u.last_name, '') AS owner_name,
    t.parent_objective_id,
    t.depth,
    (SELECT COUNT(*)::int FROM objectives c WHERE c.parent_objective_id = t.id AND c.cycle_id = p_cycle_id) AS child_count
  FROM tree t
  LEFT JOIN objectives obj ON obj.id = t.id
  LEFT JOIN users u ON u.id = obj.owner_id
  ORDER BY t.depth, t.title;
END;
$$;

-- Trigger updated_at sur okr_cycles
CREATE OR REPLACE FUNCTION update_okr_cycles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_okr_cycles_updated_at ON okr_cycles;
CREATE TRIGGER trg_okr_cycles_updated_at
  BEFORE UPDATE ON okr_cycles
  FOR EACH ROW EXECUTE FUNCTION update_okr_cycles_updated_at();
