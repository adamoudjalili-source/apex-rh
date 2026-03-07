-- ============================================================
-- APEX RH — migration_s68_offboarding.sql
-- Session 68 — Offboarding
-- Tables : offboarding_processes, offboarding_templates,
--          offboarding_checklists, offboarding_interviews,
--          offboarding_knowledge
-- ============================================================

-- ─── 1. OFFBOARDING_PROCESSES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS offboarding_processes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_by         UUID NOT NULL REFERENCES users(id),
  status               TEXT NOT NULL DEFAULT 'in_progress'
                         CHECK (status IN ('in_progress','completed','cancelled')),
  exit_date            DATE,
  exit_reason          TEXT,
  -- Solde de tout compte
  paid_leave_balance   NUMERIC NOT NULL DEFAULT 0,
  rtt_balance          NUMERIC NOT NULL DEFAULT 0,
  salary_advance       NUMERIC NOT NULL DEFAULT 0,
  final_amount         NUMERIC NOT NULL DEFAULT 0,
  final_amount_paid_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_processes_org    ON offboarding_processes(organization_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_processes_user   ON offboarding_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_processes_status ON offboarding_processes(organization_id, status);

-- ─── 2. OFFBOARDING_TEMPLATES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS offboarding_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  steps           JSONB NOT NULL DEFAULT '[]',
  -- [{title, category, assignee_role, days_before_exit}]
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_templates_org ON offboarding_templates(organization_id);

-- ─── 3. OFFBOARDING_CHECKLISTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS offboarding_checklists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID NOT NULL REFERENCES offboarding_processes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'admin'
                    CHECK (category IN ('admin','it','hr','manager','finance')),
  assigned_to     UUID REFERENCES users(id),
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','done','blocked')),
  notes           TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_checklists_process ON offboarding_checklists(process_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_checklists_org     ON offboarding_checklists(organization_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_checklists_status  ON offboarding_checklists(process_id, status);

-- ─── 4. OFFBOARDING_INTERVIEWS ────────────────────────────────
CREATE TABLE IF NOT EXISTS offboarding_interviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id         UUID NOT NULL REFERENCES offboarding_processes(id) ON DELETE CASCADE,
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  interviewer_id     UUID REFERENCES users(id),
  scheduled_at       TIMESTAMPTZ,
  conducted_at       TIMESTAMPTZ,
  satisfaction_score SMALLINT CHECK (satisfaction_score BETWEEN 1 AND 10),
  would_recommend    BOOLEAN,
  main_reason        TEXT,
  feedback           TEXT,
  improvements       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_interviews_process ON offboarding_interviews(process_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_interviews_org     ON offboarding_interviews(organization_id);

-- ─── 5. OFFBOARDING_KNOWLEDGE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS offboarding_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID NOT NULL REFERENCES offboarding_processes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  topic           TEXT NOT NULL,
  description     TEXT,
  transferred_to  UUID REFERENCES users(id),
  attachment_url  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','done')),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_knowledge_process ON offboarding_knowledge(process_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_knowledge_org     ON offboarding_knowledge(organization_id);

-- ─── 6. TRIGGERS updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trig_offboarding_processes_updated_at
    BEFORE UPDATE ON offboarding_processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trig_offboarding_templates_updated_at
    BEFORE UPDATE ON offboarding_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trig_offboarding_checklists_updated_at
    BEFORE UPDATE ON offboarding_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trig_offboarding_interviews_updated_at
    BEFORE UPDATE ON offboarding_interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trig_offboarding_knowledge_updated_at
    BEFORE UPDATE ON offboarding_knowledge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 7. TRIGGER progression checklist → process ───────────────
CREATE OR REPLACE FUNCTION trig_offboarding_checklist_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total   INT;
  v_done    INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
  INTO v_total, v_done
  FROM offboarding_checklists
  WHERE process_id = COALESCE(NEW.process_id, OLD.process_id);

  UPDATE offboarding_processes SET updated_at = now()
  WHERE id = COALESCE(NEW.process_id, OLD.process_id);

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trig_offboarding_checklist_after_update
    AFTER INSERT OR UPDATE OR DELETE ON offboarding_checklists
    FOR EACH ROW EXECUTE FUNCTION trig_offboarding_checklist_progress();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 8. RLS ───────────────────────────────────────────────────
ALTER TABLE offboarding_processes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_knowledge  ENABLE ROW LEVEL SECURITY;

-- offboarding_processes
CREATE POLICY "offboarding_processes_select" ON offboarding_processes FOR SELECT
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur','direction','chef_division','chef_service')
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "offboarding_processes_insert" ON offboarding_processes FOR INSERT
  WITH CHECK (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur')
  );

CREATE POLICY "offboarding_processes_update" ON offboarding_processes FOR UPDATE
  USING (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur')
  );

-- offboarding_templates
CREATE POLICY "offboarding_templates_select" ON offboarding_templates FOR SELECT
  USING (organization_id = auth_user_organization_id());

CREATE POLICY "offboarding_templates_insert" ON offboarding_templates FOR INSERT
  WITH CHECK (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur')
  );

CREATE POLICY "offboarding_templates_update" ON offboarding_templates FOR UPDATE
  USING (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur')
  );

CREATE POLICY "offboarding_templates_delete" ON offboarding_templates FOR DELETE
  USING (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur')
  );

-- offboarding_checklists
CREATE POLICY "offboarding_checklists_select" ON offboarding_checklists FOR SELECT
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur','direction','chef_division','chef_service')
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "offboarding_checklists_insert" ON offboarding_checklists FOR INSERT
  WITH CHECK (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur','chef_division','chef_service')
  );

CREATE POLICY "offboarding_checklists_update" ON offboarding_checklists FOR UPDATE
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur','chef_division','chef_service')
      OR assigned_to = auth.uid()
    )
  );

-- offboarding_interviews
CREATE POLICY "offboarding_interviews_select" ON offboarding_interviews FOR SELECT
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur','direction')
      OR interviewer_id = auth.uid()
    )
  );

CREATE POLICY "offboarding_interviews_insert" ON offboarding_interviews FOR INSERT
  WITH CHECK (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur','chef_division','chef_service')
  );

CREATE POLICY "offboarding_interviews_update" ON offboarding_interviews FOR UPDATE
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur')
      OR interviewer_id = auth.uid()
    )
  );

-- offboarding_knowledge
CREATE POLICY "offboarding_knowledge_select" ON offboarding_knowledge FOR SELECT
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur','direction','chef_division','chef_service')
      OR transferred_to = auth.uid()
    )
  );

CREATE POLICY "offboarding_knowledge_insert" ON offboarding_knowledge FOR INSERT
  WITH CHECK (
    organization_id = auth_user_organization_id()
    AND current_user_role() IN ('administrateur','directeur','chef_division','chef_service')
  );

CREATE POLICY "offboarding_knowledge_update" ON offboarding_knowledge FOR UPDATE
  USING (
    organization_id = auth_user_organization_id()
    AND (
      current_user_role() IN ('administrateur','directeur','chef_division','chef_service')
      OR transferred_to = auth.uid()
    )
  );

-- ─── 9. TEMPLATES PAR DÉFAUT ──────────────────────────────────
INSERT INTO offboarding_templates (organization_id, name, description, steps, is_default)
SELECT
  id,
  'Template Standard',
  'Checklist de départ standard pour tous les collaborateurs',
  '[
    {"title": "Entretien de départ planifié", "category": "hr", "assignee_role": "administrateur", "days_before_exit": 30},
    {"title": "Notification équipe IT révocation accès", "category": "it", "assignee_role": "administrateur", "days_before_exit": 5},
    {"title": "Révocation accès applicatifs", "category": "it", "assignee_role": "administrateur", "days_before_exit": 1},
    {"title": "Récupération matériel (PC, badges, téléphone)", "category": "it", "assignee_role": "manager", "days_before_exit": 1},
    {"title": "Transfert de connaissances documenté", "category": "manager", "assignee_role": "chef_service", "days_before_exit": 14},
    {"title": "Passation des dossiers en cours", "category": "manager", "assignee_role": "chef_service", "days_before_exit": 7},
    {"title": "Calcul solde de tout compte", "category": "finance", "assignee_role": "administrateur", "days_before_exit": 14},
    {"title": "Paiement solde de tout compte", "category": "finance", "assignee_role": "administrateur", "days_before_exit": 0},
    {"title": "Archivage dossier RH", "category": "hr", "assignee_role": "administrateur", "days_before_exit": 0},
    {"title": "Mise à jour organigramme", "category": "admin", "assignee_role": "administrateur", "days_before_exit": 0}
  ]'::jsonb,
  true
FROM organizations
ON CONFLICT DO NOTHING;

-- ─── 10. ACTIVATION MODULE ────────────────────────────────────
UPDATE app_settings
SET value = value || '{"offboarding_enabled": true}'::jsonb
WHERE key = 'modules';
