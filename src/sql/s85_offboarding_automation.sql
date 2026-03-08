-- ============================================================
-- APEX RH — s85_offboarding_automation.sql
-- Session 85 — Offboarding : Automatisation + solde auto
-- Ajouts :
--   • offboarding_processes.departure_id (FK → employee_departures)
--   • offboarding_processes.auto_triggered (bool)
--   • offboarding_processes.overdue_count (computed via view)
--   • RPC auto_create_offboarding(p_departure_id)
--   • RPC calculate_final_settlement(p_user_id, p_org_id)
--   • Trigger trg_auto_offboarding sur employee_departures INSERT
--   • Vue v_offboarding_dashboard (processus + alertes retard)
-- ============================================================

-- ─── 1. ENRICHIR offboarding_processes ───────────────────────
ALTER TABLE offboarding_processes
  ADD COLUMN IF NOT EXISTS departure_id    UUID REFERENCES employee_departures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_triggered  BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_offboarding_processes_departure
  ON offboarding_processes(departure_id)
  WHERE departure_id IS NOT NULL;

-- ─── 2. VUE v_offboarding_dashboard ──────────────────────────
-- Vue consolidée : processus en cours avec comptage des tâches en retard
DROP VIEW IF EXISTS v_offboarding_dashboard;
CREATE VIEW v_offboarding_dashboard AS
SELECT
  op.id,
  op.organization_id,
  op.user_id,
  op.status,
  op.exit_date,
  op.exit_reason,
  op.auto_triggered,
  op.departure_id,
  op.final_amount,
  op.final_amount_paid_at,
  op.created_at,
  -- Comptage tâches
  COUNT(oc.id)                                                            AS total_tasks,
  COUNT(oc.id) FILTER (WHERE oc.status = 'done')                        AS done_tasks,
  COUNT(oc.id) FILTER (
    WHERE oc.status NOT IN ('done','blocked')
      AND oc.due_date < CURRENT_DATE
  )                                                                       AS overdue_tasks,
  -- Utilisateur
  u.first_name,
  u.last_name,
  u.email,
  u.role     AS user_role,
  -- Jours restants avant départ
  (op.exit_date - CURRENT_DATE)                                          AS days_until_exit
FROM offboarding_processes op
LEFT JOIN offboarding_checklists oc ON oc.process_id = op.id
JOIN users u ON u.id = op.user_id
GROUP BY op.id, u.first_name, u.last_name, u.email, u.role;

-- ─── 3. RPC calculate_final_settlement ───────────────────────
-- Calcule automatiquement le solde de tout compte depuis :
--   • leave_balances (solde congés payés + RTT de l'année courante)
--   • compensation_records (salaire journalier = salaire_mensuel / 21.67)
-- Retourne un JSONB avec le détail du calcul
CREATE OR REPLACE FUNCTION calculate_final_settlement(
  p_user_id UUID,
  p_org_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_year        INT  := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_monthly_salary      NUMERIC := 0;
  v_daily_rate          NUMERIC := 0;
  v_cp_balance          NUMERIC := 0;  -- Congés Payés restants
  v_rtt_balance         NUMERIC := 0;  -- RTT restants
  v_cp_amount           NUMERIC := 0;
  v_rtt_amount          NUMERIC := 0;
  v_total               NUMERIC := 0;
  v_cp_type_id          UUID;
  v_rtt_type_id         UUID;
BEGIN
  -- Vérification organisation
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Salaire mensuel brut (is_current = true)
  SELECT COALESCE(salary_amount, 0)
  INTO v_monthly_salary
  FROM compensation_records
  WHERE employee_id = p_user_id
    AND organization_id = p_org_id
    AND is_current = true
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Taux journalier = salaire mensuel / 21.67 (jours ouvrés moyens)
  v_daily_rate := ROUND(v_monthly_salary / 21.67, 2);

  -- Type de congés : 'Congés Payés' (CP)
  SELECT id INTO v_cp_type_id
  FROM leave_types
  WHERE organization_id = p_org_id
    AND LOWER(name) LIKE '%congé%pay%'
  LIMIT 1;

  -- Type de congés : 'RTT'
  SELECT id INTO v_rtt_type_id
  FROM leave_types
  WHERE organization_id = p_org_id
    AND LOWER(name) LIKE '%rtt%'
  LIMIT 1;

  -- Solde CP restant (initial + carried_over - used - pending)
  IF v_cp_type_id IS NOT NULL THEN
    SELECT GREATEST(0,
      COALESCE(initial_days, 0)
      + COALESCE(carried_over, 0)
      - COALESCE(used_days, 0)
      - COALESCE(pending_days, 0)
    )
    INTO v_cp_balance
    FROM leave_balances
    WHERE user_id       = p_user_id
      AND organization_id = p_org_id
      AND leave_type_id = v_cp_type_id
      AND year          = v_current_year
    LIMIT 1;
  END IF;

  -- Solde RTT restant
  IF v_rtt_type_id IS NOT NULL THEN
    SELECT GREATEST(0,
      COALESCE(initial_days, 0)
      + COALESCE(carried_over, 0)
      - COALESCE(used_days, 0)
      - COALESCE(pending_days, 0)
    )
    INTO v_rtt_balance
    FROM leave_balances
    WHERE user_id       = p_user_id
      AND organization_id = p_org_id
      AND leave_type_id = v_rtt_type_id
      AND year          = v_current_year
    LIMIT 1;
  END IF;

  -- Indemnités congés
  v_cp_amount  := ROUND(COALESCE(v_cp_balance, 0)  * v_daily_rate, 2);
  v_rtt_amount := ROUND(COALESCE(v_rtt_balance, 0) * v_daily_rate, 2);
  v_total      := v_cp_amount + v_rtt_amount;

  RETURN jsonb_build_object(
    'monthly_salary',  v_monthly_salary,
    'daily_rate',      v_daily_rate,
    'cp_balance',      COALESCE(v_cp_balance, 0),
    'rtt_balance',     COALESCE(v_rtt_balance, 0),
    'cp_amount',       v_cp_amount,
    'rtt_amount',      v_rtt_amount,
    'total_amount',    v_total,
    'computed_at',     now()
  );
END;
$$;

-- ─── 4. RPC auto_create_offboarding ──────────────────────────
-- Crée automatiquement un processus d'offboarding depuis un employee_departure
-- • Vérifie qu'il n'en existe pas déjà un pour cet utilisateur
-- • Prend le template par défaut de l'org
-- • Génère la checklist avec dates calculées depuis departure_date
CREATE OR REPLACE FUNCTION auto_create_offboarding(
  p_departure_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dep           RECORD;
  v_process_id    UUID;
  v_template      RECORD;
  v_step          JSONB;
  v_due_date      DATE;
BEGIN
  -- Lire le départ
  SELECT * INTO v_dep
  FROM employee_departures
  WHERE id = p_departure_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found: %', p_departure_id;
  END IF;

  -- Vérifier qu'un processus n'existe pas déjà pour cet utilisateur
  IF EXISTS (
    SELECT 1 FROM offboarding_processes
    WHERE user_id = v_dep.user_id
      AND organization_id = v_dep.organization_id
      AND status = 'in_progress'
  ) THEN
    -- Retourner l'ID existant
    SELECT id INTO v_process_id
    FROM offboarding_processes
    WHERE user_id = v_dep.user_id
      AND organization_id = v_dep.organization_id
      AND status = 'in_progress'
    LIMIT 1;
    -- Mettre à jour departure_id si absent
    UPDATE offboarding_processes
    SET departure_id = p_departure_id
    WHERE id = v_process_id AND departure_id IS NULL;
    RETURN v_process_id;
  END IF;

  -- Créer le processus
  INSERT INTO offboarding_processes (
    organization_id,
    user_id,
    triggered_by,
    departure_id,
    status,
    exit_date,
    exit_reason,
    auto_triggered
  )
  VALUES (
    v_dep.organization_id,
    v_dep.user_id,
    v_dep.user_id,  -- self-triggered par le système
    p_departure_id,
    'in_progress',
    v_dep.departure_date,
    v_dep.reason,
    true
  )
  RETURNING id INTO v_process_id;

  -- Récupérer le template par défaut
  SELECT * INTO v_template
  FROM offboarding_templates
  WHERE organization_id = v_dep.organization_id
    AND is_default = true
  LIMIT 1;

  -- Si template trouvé, générer la checklist
  IF FOUND AND v_template.steps IS NOT NULL THEN
    FOR v_step IN SELECT * FROM jsonb_array_elements(v_template.steps)
    LOOP
      -- Calculer due_date depuis exit_date - days_before_exit
      IF v_dep.departure_date IS NOT NULL
         AND (v_step->>'days_before_exit') IS NOT NULL
      THEN
        v_due_date := v_dep.departure_date
          - ((v_step->>'days_before_exit')::INT);
      ELSE
        v_due_date := NULL;
      END IF;

      INSERT INTO offboarding_checklists (
        process_id,
        organization_id,
        title,
        category,
        due_date,
        status
      ) VALUES (
        v_process_id,
        v_dep.organization_id,
        v_step->>'title',
        COALESCE(v_step->>'category', 'admin'),
        v_due_date,
        'pending'
      );
    END LOOP;
  END IF;

  RETURN v_process_id;
END;
$$;

-- ─── 5. TRIGGER sur employee_departures ──────────────────────
-- Déclenche auto_create_offboarding à chaque nouvel enregistrement
CREATE OR REPLACE FUNCTION trg_fn_auto_offboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_process_id UUID;
BEGIN
  BEGIN
    SELECT auto_create_offboarding(NEW.id) INTO v_process_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ne pas bloquer l'insertion si la création échoue
    RAISE WARNING 'auto_create_offboarding failed for departure %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_offboarding ON employee_departures;
CREATE TRIGGER trg_auto_offboarding
  AFTER INSERT ON employee_departures
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_auto_offboarding();

-- ─── 6. RLS sur la vue (pas nécessaire pour les vues, accès via RLS des tables sous-jacentes) ─
-- La vue v_offboarding_dashboard hérite du RLS de offboarding_processes et users

-- ─── 7. GRANTS ───────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION calculate_final_settlement(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_create_offboarding(UUID) TO authenticated;

-- ─── 8. Indexes supplémentaires ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_offboarding_checklists_due_overdue
  ON offboarding_checklists(process_id, due_date)
  WHERE status NOT IN ('done', 'blocked') AND due_date IS NOT NULL;
