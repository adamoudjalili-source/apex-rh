-- ============================================================
-- APEX RH — Migration S58 : Compensation & Benchmark Salarial
-- Session 58 — 07/03/2026
-- Tables : salary_grades, compensation_records,
--          salary_benchmarks, compensation_reviews, bonus_records
-- ============================================================

-- ── 1. ENUMS ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE compensation_currency AS ENUM ('XOF', 'EUR', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_reason AS ENUM (
    'annuelle', 'promotion', 'revalorisation', 'correction', 'recrutement', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM (
    'propose', 'valide', 'applique', 'rejete'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bonus_type AS ENUM (
    'performance', 'anciennete', 'projet', 'exceptionnel', 'astreinte', 'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bonus_status AS ENUM (
    'propose', 'valide', 'paye', 'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. GRILLES SALARIALES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_grades (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code             TEXT NOT NULL,                    -- ex: 'G1', 'G2', 'M1', 'M2', 'C1'
  label            TEXT NOT NULL,                    -- ex: 'Agent d'exécution', 'Cadre supérieur'
  category         TEXT,                             -- 'agent', 'technicien', 'cadre', 'direction'
  min_salary       NUMERIC(14,2) NOT NULL,
  mid_salary       NUMERIC(14,2),
  max_salary       NUMERIC(14,2) NOT NULL,
  currency         compensation_currency NOT NULL DEFAULT 'XOF',
  description      TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_grades_org ON salary_grades(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_grades_active ON salary_grades(is_active);

ALTER TABLE salary_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY salary_grades_org ON salary_grades
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 3. DOSSIERS DE RÉMUNÉRATION ───────────────────────────────

CREATE TABLE IF NOT EXISTS compensation_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_id         UUID REFERENCES salary_grades(id) ON DELETE SET NULL,
  base_salary      NUMERIC(14,2) NOT NULL,
  variable_salary  NUMERIC(14,2) DEFAULT 0,          -- part variable annuelle target
  benefits_value   NUMERIC(14,2) DEFAULT 0,          -- avantages en nature (logement, véhicule…)
  currency         compensation_currency NOT NULL DEFAULT 'XOF',
  effective_date   DATE NOT NULL,
  end_date         DATE,                             -- NULL = courant
  is_current       BOOLEAN DEFAULT TRUE,
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_records_org  ON compensation_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_comp_records_user ON compensation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_records_cur  ON compensation_records(is_current) WHERE is_current = TRUE;

ALTER TABLE compensation_records ENABLE ROW LEVEL SECURITY;

-- Collaborateur : voit uniquement ses propres données
-- Manager/Admin : voit les données de leur org
CREATE POLICY comp_records_own ON compensation_records
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = compensation_records.organization_id
        AND u.role IN ('administrateur', 'directeur', 'chef_division', 'chef_service')
    )
  );

CREATE POLICY comp_records_admin_write ON compensation_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = compensation_records.organization_id
        AND u.role IN ('administrateur', 'directeur')
    )
  );

-- ── 4. BENCHMARKS MARCHÉ ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_benchmarks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_family       TEXT NOT NULL,                    -- famille de métier
  job_title        TEXT,                             -- intitulé de poste
  level            TEXT NOT NULL,                   -- 'junior', 'confirme', 'senior', 'expert'
  sector           TEXT,                             -- secteur d'activité
  region           TEXT DEFAULT 'Dakar',
  currency         compensation_currency NOT NULL DEFAULT 'XOF',
  p25              NUMERIC(14,2),                    -- 25e percentile
  p50              NUMERIC(14,2) NOT NULL,           -- médiane
  p75              NUMERIC(14,2),                    -- 75e percentile
  p90              NUMERIC(14,2),                    -- 90e percentile
  sample_size      INTEGER,                          -- nombre de données source
  source           TEXT,                             -- ex: 'Étude CNAEM 2025', 'Tower Watson'
  reference_year   INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_org    ON salary_benchmarks(organization_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_family ON salary_benchmarks(job_family, level);
CREATE INDEX IF NOT EXISTS idx_benchmarks_year   ON salary_benchmarks(reference_year);

ALTER TABLE salary_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY benchmarks_org ON salary_benchmarks
  FOR ALL USING (organization_id = auth_user_organization_id());

-- ── 5. RÉVISIONS SALARIALES ──────────────────────────────────

CREATE TABLE IF NOT EXISTS compensation_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by      UUID REFERENCES users(id),
  validated_by     UUID REFERENCES users(id),
  review_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  reason           review_reason NOT NULL DEFAULT 'annuelle',
  status           review_status NOT NULL DEFAULT 'propose',
  old_base_salary  NUMERIC(14,2) NOT NULL,
  new_base_salary  NUMERIC(14,2) NOT NULL,
  increase_amount  NUMERIC(14,2) GENERATED ALWAYS AS (new_base_salary - old_base_salary) STORED,
  increase_pct     NUMERIC(7,4)  GENERATED ALWAYS AS (
    CASE WHEN old_base_salary > 0
    THEN ROUND(((new_base_salary - old_base_salary) / old_base_salary) * 100, 4)
    ELSE 0 END
  ) STORED,
  new_grade_id     UUID REFERENCES salary_grades(id),
  justification    TEXT,
  effective_date   DATE,
  applied_at       TIMESTAMPTZ,
  currency         compensation_currency NOT NULL DEFAULT 'XOF',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_reviews_org    ON compensation_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_comp_reviews_user   ON compensation_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_reviews_status ON compensation_reviews(status);
CREATE INDEX IF NOT EXISTS idx_comp_reviews_date   ON compensation_reviews(review_date);

ALTER TABLE compensation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY comp_reviews_read ON compensation_reviews
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = compensation_reviews.organization_id
        AND u.role IN ('administrateur', 'directeur', 'chef_division', 'chef_service')
    )
  );

CREATE POLICY comp_reviews_write ON compensation_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = compensation_reviews.organization_id
        AND u.role IN ('administrateur', 'directeur')
    )
  );

-- ── 6. PRIMES & BONUS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bonus_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES users(id),
  validated_by     UUID REFERENCES users(id),
  type             bonus_type NOT NULL DEFAULT 'performance',
  label            TEXT,                             -- libellé personnalisé
  amount           NUMERIC(14,2) NOT NULL,
  currency         compensation_currency NOT NULL DEFAULT 'XOF',
  period           TEXT,                             -- ex: 'T4 2025', 'Année 2025'
  reference_date   DATE DEFAULT CURRENT_DATE,
  paid_at          DATE,
  status           bonus_status NOT NULL DEFAULT 'propose',
  justification    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonus_org    ON bonus_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_bonus_user   ON bonus_records(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_status ON bonus_records(status);

ALTER TABLE bonus_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY bonus_read ON bonus_records
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = bonus_records.organization_id
        AND u.role IN ('administrateur', 'directeur', 'chef_division', 'chef_service')
    )
  );

CREATE POLICY bonus_write ON bonus_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = bonus_records.organization_id
        AND u.role IN ('administrateur', 'directeur')
    )
  );

-- ── 7. VUES MATÉRIALISÉES ─────────────────────────────────────

-- Stats rémunération par user
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_compensation_stats AS
SELECT
  cr.organization_id,
  cr.user_id,
  u.first_name,
  u.last_name,
  u.role,
  u.service_id,
  u.division_id,
  cr.base_salary,
  cr.variable_salary,
  cr.benefits_value,
  (cr.base_salary + COALESCE(cr.variable_salary, 0) + COALESCE(cr.benefits_value, 0)) AS total_comp,
  cr.currency,
  cr.grade_id,
  sg.code  AS grade_code,
  sg.label AS grade_label,
  sg.min_salary AS grade_min,
  sg.mid_salary AS grade_mid,
  sg.max_salary AS grade_max,
  -- Compa-ratio : salaire / milieu de fourchette
  CASE WHEN sg.mid_salary > 0
    THEN ROUND((cr.base_salary / sg.mid_salary) * 100, 2)
    ELSE NULL
  END AS compa_ratio,
  -- Position dans la fourchette (0–100%)
  CASE WHEN sg.max_salary > sg.min_salary
    THEN ROUND(((cr.base_salary - sg.min_salary) / (sg.max_salary - sg.min_salary)) * 100, 2)
    ELSE NULL
  END AS range_position,
  -- Nombre de révisions appliquées
  (SELECT COUNT(*) FROM compensation_reviews rev
    WHERE rev.user_id = cr.user_id AND rev.status = 'applique') AS reviews_count,
  -- Nombre de bonus payés cette année
  (SELECT COUNT(*) FROM bonus_records br
    WHERE br.user_id = cr.user_id AND br.status = 'paye'
      AND EXTRACT(YEAR FROM br.paid_at) = EXTRACT(YEAR FROM NOW())) AS bonuses_this_year,
  -- Total bonus payés cette année
  (SELECT COALESCE(SUM(br.amount), 0) FROM bonus_records br
    WHERE br.user_id = cr.user_id AND br.status = 'paye'
      AND EXTRACT(YEAR FROM br.paid_at) = EXTRACT(YEAR FROM NOW())) AS total_bonus_this_year
FROM compensation_records cr
JOIN users u ON cr.user_id = u.id
LEFT JOIN salary_grades sg ON cr.grade_id = sg.id
WHERE cr.is_current = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_comp_stats_user
  ON mv_compensation_stats(organization_id, user_id);

-- Analyse benchmark par famille de métier et niveau
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_benchmark_analysis AS
SELECT
  sb.organization_id,
  sb.job_family,
  sb.level,
  sb.currency,
  sb.p25,
  sb.p50,
  sb.p75,
  sb.p90,
  sb.source,
  sb.reference_year,
  -- Stats réelles internes pour comparaison
  COUNT(cr.id)           AS internal_count,
  MIN(cr.base_salary)    AS internal_min,
  AVG(cr.base_salary)    AS internal_avg,
  MAX(cr.base_salary)    AS internal_max,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cr.base_salary) AS internal_median,
  -- Taux au-dessous du P50 marché
  ROUND(
    COUNT(CASE WHEN cr.base_salary < sb.p50 THEN 1 END)::NUMERIC
    / NULLIF(COUNT(cr.id), 0) * 100, 2
  ) AS pct_below_market_median
FROM salary_benchmarks sb
LEFT JOIN users u ON u.organization_id = sb.organization_id
LEFT JOIN compensation_records cr ON cr.user_id = u.id AND cr.is_current = TRUE
WHERE sb.is_active = TRUE
GROUP BY sb.id, sb.organization_id, sb.job_family, sb.level, sb.currency,
         sb.p25, sb.p50, sb.p75, sb.p90, sb.source, sb.reference_year;

CREATE INDEX IF NOT EXISTS idx_mv_benchmark_org
  ON mv_benchmark_analysis(organization_id, job_family);

-- ── 8. REFRESH FUNCTION ──────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_compensation_views()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_compensation_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_benchmark_analysis;
END;
$$;

-- ── 9. PG_CRON : refresh nightly ─────────────────────────────

DO $outer$
BEGIN
  PERFORM cron.unschedule('refresh-compensation-views-nightly');
EXCEPTION WHEN others THEN NULL;
END;
$outer$;

SELECT cron.schedule(
  'refresh-compensation-views-nightly',
  '30 2 * * *',
  'SELECT refresh_compensation_views();'
);

-- ── 10. EXTENSION NOTIFICATION TYPE ─────────────────────────

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'salary_review_proposed';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'salary_review_validated';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'salary_review_applied';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'bonus_proposed';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'bonus_validated';
EXCEPTION WHEN others THEN NULL; END $$;

-- ── 11. APP SETTINGS : activation module ─────────────────────

INSERT INTO app_settings (key, value)
VALUES ('compensation_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- ── 12. SEED DÉMO : grilles salariales ───────────────────────

DO $outer$
DECLARE
  v_org_id UUID;
BEGIN
  -- Récupérer la première organisation active
  SELECT id INTO v_org_id FROM organizations WHERE is_active = TRUE LIMIT 1;

  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO salary_grades (organization_id, code, label, category, min_salary, mid_salary, max_salary, currency, sort_order)
  VALUES
    (v_org_id, 'A1', 'Agent d''exécution',     'agent',      150000,  185000,  220000, 'XOF', 1),
    (v_org_id, 'A2', 'Agent qualifié',          'agent',      220000,  270000,  320000, 'XOF', 2),
    (v_org_id, 'T1', 'Technicien',              'technicien', 300000,  380000,  460000, 'XOF', 3),
    (v_org_id, 'T2', 'Technicien supérieur',    'technicien', 450000,  575000,  700000, 'XOF', 4),
    (v_org_id, 'C1', 'Cadre débutant',          'cadre',      650000,  800000,  950000, 'XOF', 5),
    (v_org_id, 'C2', 'Cadre confirmé',          'cadre',      900000, 1150000, 1400000, 'XOF', 6),
    (v_org_id, 'C3', 'Cadre supérieur',         'cadre',     1300000, 1700000, 2100000, 'XOF', 7),
    (v_org_id, 'D1', 'Directeur adjoint',       'direction', 1800000, 2400000, 3000000, 'XOF', 8),
    (v_org_id, 'D2', 'Directeur',               'direction', 2800000, 3700000, 4600000, 'XOF', 9)
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Données benchmark marché
  INSERT INTO salary_benchmarks (organization_id, job_family, job_title, level, region, currency, p25, p50, p75, p90, source, reference_year)
  VALUES
    (v_org_id, 'Finance & Comptabilité', 'Comptable',              'junior',   'Dakar', 'XOF',  280000,  360000,  450000,  550000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Finance & Comptabilité', 'Responsable comptable',  'confirme', 'Dakar', 'XOF',  600000,  780000,  980000, 1200000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Finance & Comptabilité', 'DAF',                    'senior',   'Dakar', 'XOF', 1500000, 2000000, 2700000, 3500000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Ressources Humaines',    'Chargé RH',              'junior',   'Dakar', 'XOF',  250000,  320000,  420000,  530000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Ressources Humaines',    'Responsable RH',         'confirme', 'Dakar', 'XOF',  550000,  720000,  920000, 1150000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Ressources Humaines',    'DRH',                    'senior',   'Dakar', 'XOF', 1400000, 1850000, 2500000, 3200000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Informatique & IT',      'Développeur web',        'junior',   'Dakar', 'XOF',  350000,  450000,  580000,  720000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Informatique & IT',      'Développeur senior',     'senior',   'Dakar', 'XOF',  800000, 1050000, 1400000, 1800000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Commercial & Ventes',    'Commercial',             'junior',   'Dakar', 'XOF',  200000,  300000,  420000,  560000, 'Étude Salariale WAEMU 2025', 2025),
    (v_org_id, 'Commercial & Ventes',    'Responsable commercial', 'confirme', 'Dakar', 'XOF',  600000,  800000, 1050000, 1350000, 'Étude Salariale WAEMU 2025', 2025)
  ON CONFLICT DO NOTHING;

END;
$outer$;

-- ── FIN MIGRATION S58 ─────────────────────────────────────────