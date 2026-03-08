-- ============================================================
-- APEX RH — SQL S70 — Congés & Absences — Moteur de règles
-- Session 70 — Enrichissement tables sans nouvelle table
-- ============================================================

-- ─── 1. Enrichir leave_types ─────────────────────────────────

ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS accrual_rate        NUMERIC(5,2)  DEFAULT 2.08,  -- jours/mois acquis
  ADD COLUMN IF NOT EXISTS accrual_enabled     BOOLEAN       DEFAULT FALSE, -- acquisition auto activée
  ADD COLUMN IF NOT EXISTS contract_types      TEXT[]        DEFAULT ARRAY['CDI','CDD','essai'],
  ADD COLUMN IF NOT EXISTS carry_over_policy   TEXT          DEFAULT 'capped'
    CHECK (carry_over_policy IN ('none','capped','full')),
  ADD COLUMN IF NOT EXISTS carry_over_max_days INTEGER       DEFAULT 5;

COMMENT ON COLUMN leave_types.accrual_rate      IS 'Jours acquis par mois (ex: 2.08 = 25j/an)';
COMMENT ON COLUMN leave_types.accrual_enabled   IS 'TRUE = calcul acquisition auto activé';
COMMENT ON COLUMN leave_types.contract_types    IS 'Types de contrat éligibles : CDI, CDD, essai';
COMMENT ON COLUMN leave_types.carry_over_policy IS 'none=pas de report | capped=plafonné | full=total';
COMMENT ON COLUMN leave_types.carry_over_max_days IS 'Plafond jours reportables (si policy=capped)';

-- ─── 2. Enrichir leave_balances ──────────────────────────────

ALTER TABLE leave_balances
  ADD COLUMN IF NOT EXISTS accrued_days   NUMERIC(8,2) DEFAULT 0,  -- jours acquis mois courant
  ADD COLUMN IF NOT EXISTS carried_over   NUMERIC(8,2) DEFAULT 0,  -- jours reportés N-1
  ADD COLUMN IF NOT EXISTS expiry_date    DATE;                     -- date expiration solde

COMMENT ON COLUMN leave_balances.accrued_days IS 'Jours acquis automatiquement (moteur accrual)';
COMMENT ON COLUMN leave_balances.carried_over IS 'Jours reportés depuis année N-1';
COMMENT ON COLUMN leave_balances.expiry_date  IS 'Date limite utilisation solde reporté';

-- ─── 3. Enrichir leave_settings ──────────────────────────────

ALTER TABLE leave_settings
  ADD COLUMN IF NOT EXISTS public_holidays        JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS carry_over_deadline    DATE,
  ADD COLUMN IF NOT EXISTS low_balance_threshold  INTEGER DEFAULT 2,   -- seuil alerte solde faible (jours)
  ADD COLUMN IF NOT EXISTS pending_alert_hours    INTEGER DEFAULT 48,  -- seuil alerte demande en attente
  ADD COLUMN IF NOT EXISTS accrual_day            INTEGER DEFAULT 1;   -- jour du mois acquisition

COMMENT ON COLUMN leave_settings.public_holidays       IS 'Liste jours fériés [{date,name,is_fixed}]';
COMMENT ON COLUMN leave_settings.carry_over_deadline   IS 'Date limite utilisation jours reportés';
COMMENT ON COLUMN leave_settings.low_balance_threshold IS 'Seuil solde faible en jours pour alertes';
COMMENT ON COLUMN leave_settings.pending_alert_hours   IS 'Heures avant alerte demande en attente';
COMMENT ON COLUMN leave_settings.accrual_day           IS 'Jour du mois où l''acquisition est calculée';

-- ─── 4. Index utiles ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year
  ON leave_balances(organization_id, user_id, year);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status_created
  ON leave_requests(organization_id, status, created_at);

-- ─── 5. Jours fériés sénégalais par défaut (insert initial) ──
-- À exécuter pour chaque organisation existante via UPDATE

-- Format public_holidays :
-- [{"date": "2026-01-01", "name": "Nouvel An", "is_fixed": true, "is_active": true},...]

-- NOTE : l'insertion se fait depuis l'interface (PublicHolidaysManager)
-- Ce script crée uniquement la structure.
