-- ============================================================
-- APEX RH — s88_fixes.sql
-- Session 88 — Corrections bugs S70→S87
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ FIX S88-1 — BUG-C3 : S86 role enum cast (2 occurrences)│
-- │ dispatch_notification + process_notification_escalations │
-- └─────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION dispatch_notification(
  p_org_id       uuid,
  p_event_type   text,
  p_reference_id uuid DEFAULT NULL,
  p_data         jsonb DEFAULT '{}'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule          notification_rules%ROWTYPE;
  v_user          RECORD;
  v_title         text;
  v_body          text;
  v_employee_name text;
  v_event_date    text;
  v_details       text;
  v_count         integer := 0;
BEGIN
  v_employee_name := coalesce(p_data->>'employee_name', 'Employé');
  v_event_date    := coalesce(p_data->>'event_date', to_char(now(), 'DD/MM/YYYY'));
  v_details       := coalesce(p_data->>'details', '');

  FOR v_rule IN
    SELECT * FROM notification_rules
    WHERE organization_id = p_org_id
      AND trigger_event   = p_event_type
      AND is_active       = true
  LOOP
    v_title := coalesce(p_data->>'title', 'Notification APEX RH');
    v_body  := v_rule.message_template;
    v_body  := replace(v_body, '{{employee_name}}', v_employee_name);
    v_body  := replace(v_body, '{{event_date}}',    v_event_date);
    v_body  := replace(v_body, '{{details}}',       v_details);

    -- FIX S88 : role::text pour comparaison avec text[]
    FOR v_user IN
      SELECT id FROM users
      WHERE organization_id = p_org_id
        AND role::text = ANY(v_rule.target_roles)
        AND id != coalesce((p_data->>'exclude_user_id')::uuid, '00000000-0000-0000-0000-000000000000')
    LOOP
      INSERT INTO notification_inbox (
        organization_id, user_id, rule_id, title, body,
        event_type, reference_id, reference_type, priority
      ) VALUES (
        p_org_id, v_user.id, v_rule.id, v_title, v_body,
        p_event_type, p_reference_id,
        coalesce(p_data->>'reference_type', p_event_type),
        coalesce(p_data->>'priority', 'normal')
      );
      v_count := v_count + 1;
    END LOOP;

    IF p_data->>'target_user_id' IS NOT NULL THEN
      INSERT INTO notification_inbox (
        organization_id, user_id, rule_id, title, body,
        event_type, reference_id, reference_type, priority
      ) VALUES (
        p_org_id,
        (p_data->>'target_user_id')::uuid,
        v_rule.id, v_title, v_body,
        p_event_type, p_reference_id,
        coalesce(p_data->>'reference_type', p_event_type),
        coalesce(p_data->>'priority', 'normal')
      )
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END IF;

  END LOOP;

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;

-- FIX S88 : process_notification_escalations — role::text
CREATE OR REPLACE FUNCTION process_notification_escalations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif RECORD;
  v_user  RECORD;
  v_count integer := 0;
BEGIN
  FOR v_notif IN
    SELECT ni.*, nr.escalate_after_days, nr.escalate_to_role, nr.message_template,
           nr.organization_id as org_id
    FROM notification_inbox ni
    JOIN notification_rules nr ON nr.id = ni.rule_id
    WHERE ni.read_at IS NULL
      AND ni.archived_at IS NULL
      AND ni.escalated_at IS NULL
      AND nr.escalate_after_days IS NOT NULL
      AND nr.escalate_to_role    IS NOT NULL
      AND ni.created_at < now() - (nr.escalate_after_days || ' days')::interval
  LOOP
    -- FIX S88 : role::text pour comparaison avec text
    FOR v_user IN
      SELECT id FROM users
      WHERE organization_id = v_notif.org_id
        AND role::text = v_notif.escalate_to_role
    LOOP
      INSERT INTO notification_inbox (
        organization_id, user_id, rule_id, title, body,
        event_type, reference_id, reference_type, priority, escalated_from
      ) VALUES (
        v_notif.org_id, v_user.id, v_notif.rule_id,
        '[ESCALADE] ' || v_notif.title,
        'Notification non lue depuis ' || v_notif.escalate_after_days || ' jours : ' || v_notif.body,
        v_notif.event_type, v_notif.reference_id, v_notif.reference_type,
        'urgent', v_notif.id
      );
      v_count := v_count + 1;
    END LOOP;

    UPDATE notification_inbox
    SET escalated_at = now()
    WHERE id = v_notif.id;
  END LOOP;

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;


-- ┌─────────────────────────────────────────────────────────┐
-- │ FIX S88-2 — BUG-M3 : Seed règle announcement_important  │
-- │ À adapter selon les orgs existantes                      │
-- └─────────────────────────────────────────────────────────┘

-- Insérer la règle pour chaque organisation existante
-- qui n'en a pas encore
INSERT INTO notification_rules (
  organization_id,
  name,
  trigger_event,
  target_roles,
  message_template,
  is_active
)
SELECT
  o.id,
  'Annonce importante',
  'announcement_important',
  ARRAY['collaborateur', 'chef_service', 'chef_division', 'administrateur', 'directeur'],
  'Une annonce importante a été publiée : {{details}}',
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM notification_rules nr
  WHERE nr.organization_id = o.id
    AND nr.trigger_event = 'announcement_important'
);


-- ┌─────────────────────────────────────────────────────────┐
-- │ FIX S88-3 — BUG-C2 : S65 FKs profiles→users            │
-- │ ATTENTION : exécuter uniquement si les tables existent   │
-- │ et que les données ont été insérées avec des user IDs    │
-- │ valides dans la table users (pas profiles).              │
-- └─────────────────────────────────────────────────────────┘

-- communication_announcements : author_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%communication_announcements_author_id%'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE communication_announcements
      DROP CONSTRAINT IF EXISTS communication_announcements_author_id_fkey;
    ALTER TABLE communication_announcements
      ADD CONSTRAINT communication_announcements_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- communication_announcements : created_by
ALTER TABLE communication_announcements
  DROP CONSTRAINT IF EXISTS communication_announcements_created_by_fkey;
ALTER TABLE communication_announcements
  ADD CONSTRAINT communication_announcements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- communication_channels : created_by
ALTER TABLE communication_channels
  DROP CONSTRAINT IF EXISTS communication_channels_created_by_fkey;
ALTER TABLE communication_channels
  ADD CONSTRAINT communication_channels_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- communication_messages : author_id
ALTER TABLE communication_messages
  DROP CONSTRAINT IF EXISTS communication_messages_author_id_fkey;
ALTER TABLE communication_messages
  ADD CONSTRAINT communication_messages_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- communication_fil_posts : author_id
ALTER TABLE communication_fil_posts
  DROP CONSTRAINT IF EXISTS communication_fil_posts_author_id_fkey;
ALTER TABLE communication_fil_posts
  ADD CONSTRAINT communication_fil_posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- communication_announcement_comments : author_id
ALTER TABLE communication_announcement_comments
  DROP CONSTRAINT IF EXISTS communication_announcement_comments_author_id_fkey;
ALTER TABLE communication_announcement_comments
  ADD CONSTRAINT communication_announcement_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- communication_user_presence : user_id
ALTER TABLE communication_user_presence
  DROP CONSTRAINT IF EXISTS communication_user_presence_user_id_fkey;
ALTER TABLE communication_user_presence
  ADD CONSTRAINT communication_user_presence_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Corriger les policies RLS S65 (org_id → organization_id)
-- communication_announcements
DROP POLICY IF EXISTS "announcements_select" ON communication_announcements;
CREATE POLICY "announcements_select" ON communication_announcements
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "announcements_insert" ON communication_announcements;
CREATE POLICY "announcements_insert" ON communication_announcements
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "announcements_update" ON communication_announcements;
CREATE POLICY "announcements_update" ON communication_announcements
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "announcements_delete" ON communication_announcements;
CREATE POLICY "announcements_delete" ON communication_announcements
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );


-- ┌─────────────────────────────────────────────────────────┐
-- │ FIX S88-4 — BUG-M4 : Wrapper views RLS mat views S82    │
-- └─────────────────────────────────────────────────────────┘

-- Vue sécurisée headcount (S82)
CREATE OR REPLACE VIEW v_headcount_stats_secure AS
  SELECT * FROM mv_headcount_stats
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());

-- Vue sécurisée turnover (S82)
CREATE OR REPLACE VIEW v_turnover_stats_secure AS
  SELECT * FROM mv_turnover_stats
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());

-- Vue sécurisée absenteeism (S82)
CREATE OR REPLACE VIEW v_absenteeism_stats_secure AS
  SELECT * FROM mv_absenteeism_stats
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());

-- Vue sécurisée succession coverage (S83)
CREATE OR REPLACE VIEW v_succession_coverage_secure AS
  SELECT * FROM mv_succession_coverage
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());

-- Vue sécurisée competency coverage (S84)
CREATE OR REPLACE VIEW v_competency_coverage_secure AS
  SELECT * FROM mv_competency_coverage
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());

-- Activer RLS sur les vues (Supabase)
GRANT SELECT ON v_headcount_stats_secure    TO authenticated;
GRANT SELECT ON v_turnover_stats_secure     TO authenticated;
GRANT SELECT ON v_absenteeism_stats_secure  TO authenticated;
GRANT SELECT ON v_succession_coverage_secure TO authenticated;
GRANT SELECT ON v_competency_coverage_secure TO authenticated;


-- ┌─────────────────────────────────────────────────────────┐
-- │ FIX S88-5 — WARN-4 : WITH CHECK manquant feedback360    │
-- └─────────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS "feedback360_cycles_insert" ON feedback360_cycles;
CREATE POLICY "feedback360_cycles_insert" ON feedback360_cycles
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "feedback360_cycles_update" ON feedback360_cycles;
CREATE POLICY "feedback360_cycles_update" ON feedback360_cycles
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );


-- ┌─────────────────────────────────────────────────────────┐
-- │ GRANTS finaux                                           │
-- └─────────────────────────────────────────────────────────┘
GRANT EXECUTE ON FUNCTION dispatch_notification(uuid, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION process_notification_escalations() TO authenticated;
