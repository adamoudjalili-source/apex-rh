-- ============================================================
-- APEX RH — S71 — Gestion des Temps — Règles heures sup
-- Migration : enrichissement time_settings + time_sheets
-- ============================================================

-- ─── 1. time_settings : colonnes moteur HS ──────────────────

ALTER TABLE time_settings
  ADD COLUMN IF NOT EXISTS daily_threshold_hours    NUMERIC(4,1) DEFAULT 8,
  ADD COLUMN IF NOT EXISTS weekly_threshold_hours   NUMERIC(5,1) DEFAULT 40,
  ADD COLUMN IF NOT EXISTS ot_rate_25_after         NUMERIC(4,1) DEFAULT 8,
  ADD COLUMN IF NOT EXISTS ot_rate_50_after         NUMERIC(4,1) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ot_rate_100_after        NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submission_deadline_days INTEGER      DEFAULT 3,
  ADD COLUMN IF NOT EXISTS alert_enabled            BOOLEAN      DEFAULT true,
  ADD COLUMN IF NOT EXISTS overtime_requires_approval BOOLEAN    DEFAULT true,
  ADD COLUMN IF NOT EXISTS overtime_calc_mode       TEXT         DEFAULT 'weekly'
    CHECK (overtime_calc_mode IN ('daily','weekly','both'));

COMMENT ON COLUMN time_settings.daily_threshold_hours    IS 'Seuil journalier déclenchant les HS (défaut 8h)';
COMMENT ON COLUMN time_settings.weekly_threshold_hours   IS 'Seuil hebdomadaire déclenchant les HS (défaut 40h)';
COMMENT ON COLUMN time_settings.ot_rate_25_after         IS 'Heures à partir desquelles taux 25% s applique';
COMMENT ON COLUMN time_settings.ot_rate_50_after         IS 'Heures à partir desquelles taux 50% s applique';
COMMENT ON COLUMN time_settings.ot_rate_100_after        IS 'Heures à partir desquelles taux 100% s applique (optionnel)';
COMMENT ON COLUMN time_settings.submission_deadline_days IS 'Délai max (jours) après fin semaine pour soumettre';
COMMENT ON COLUMN time_settings.alert_enabled            IS 'Alertes proactives HS activées';
COMMENT ON COLUMN time_settings.overtime_requires_approval IS 'Les HS nécessitent validation manager';
COMMENT ON COLUMN time_settings.overtime_calc_mode       IS 'Mode calcul HS : journalier, hebdo, ou les deux';

-- ─── 2. time_sheets : colonnes HS ───────────────────────────

ALTER TABLE time_sheets
  ADD COLUMN IF NOT EXISTS regular_hours       NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_25_hours         NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_50_hours         NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_100_hours        NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_approved   BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS overtime_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overtime_rejected_reason TEXT;

COMMENT ON COLUMN time_sheets.regular_hours    IS 'Heures normales (≤ seuil)';
COMMENT ON COLUMN time_sheets.ot_25_hours      IS 'Heures sup à taux 25%';
COMMENT ON COLUMN time_sheets.ot_50_hours      IS 'Heures sup à taux 50%';
COMMENT ON COLUMN time_sheets.ot_100_hours     IS 'Heures sup à taux 100%';
COMMENT ON COLUMN time_sheets.overtime_approved IS 'HS validées par le manager';
COMMENT ON COLUMN time_sheets.overtime_approved_by IS 'Manager ayant validé les HS';

-- ─── 3. Index ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_time_sheets_overtime
  ON time_sheets(organization_id, overtime_approved, week_start);

-- ─── 4. Vue matérialisée mensuelle paie ─────────────────────
-- (exécutable manuellement — doit être rafraîchie)

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_overtime_monthly_summary AS
SELECT
  ts.organization_id,
  ts.user_id,
  u.first_name,
  u.last_name,
  u.service_id,
  DATE_TRUNC('month', ts.week_start::date)::date AS pay_month,
  SUM(ts.total_hours)   AS total_hours,
  SUM(ts.regular_hours) AS regular_hours,
  SUM(ts.ot_25_hours)   AS ot_25_hours,
  SUM(ts.ot_50_hours)   AS ot_50_hours,
  SUM(ts.ot_100_hours)  AS ot_100_hours,
  SUM(ts.overtime_hours) AS overtime_hours,
  COUNT(*)               AS weeks_count,
  COUNT(*) FILTER (WHERE ts.status = 'hr_approved') AS approved_weeks
FROM time_sheets ts
JOIN users u ON u.id = ts.user_id
GROUP BY 1,2,3,4,5,6
WITH NO DATA;

-- REVOKE accès API (sécurité conforme hotfix S70)
REVOKE SELECT ON mv_overtime_monthly_summary FROM anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_overtime_monthly
  ON mv_overtime_monthly_summary(organization_id, user_id, pay_month);

-- ─── 5. Commentaires finaux ──────────────────────────────────

COMMENT ON TABLE time_settings IS 'S71 — Config temps : seuils HS, taux majoration, alertes, délais soumission';
COMMENT ON MATERIALIZED VIEW mv_overtime_monthly_summary IS 'S71 — Synthèse mensuelle HS par collaborateur pour export paie';
