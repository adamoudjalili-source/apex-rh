-- ============================================================
-- APEX RH — s87_communication_advanced.sql
-- Session S87 — Communication : Ciblage avancé + accusés lecture
-- ============================================================

-- ─── 1. ALTER communication_announcements ────────────────────
-- Ajout des colonnes ciblage avancé et flag important

ALTER TABLE communication_announcements
  ADD COLUMN IF NOT EXISTS targeting_rules JSONB DEFAULT '{"type":"all"}',
  ADD COLUMN IF NOT EXISTS important        BOOLEAN DEFAULT false;

-- Commentaires colonnes
COMMENT ON COLUMN communication_announcements.targeting_rules IS
  'Règles de ciblage : {"type":"all|roles|departments|manual","roles":[],"department_ids":[],"user_ids":[]}';
COMMENT ON COLUMN communication_announcements.important IS
  'Marqué important → relance automatique aux non-lus';

-- ─── 2. TABLE : announcement_read_receipts ───────────────────
-- Suivi précis par utilisateur (remplace le tableau views[])

CREATE TABLE IF NOT EXISTS announcement_read_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES communication_announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

COMMENT ON TABLE announcement_read_receipts IS
  'S87 — Accusés de lecture par annonce et par utilisateur';

-- ─── 3. INDEX ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_read_receipts_announcement
  ON announcement_read_receipts(announcement_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user
  ON announcement_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_org
  ON announcement_read_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_announcements_important
  ON communication_announcements(important) WHERE important = true;
CREATE INDEX IF NOT EXISTS idx_announcements_targeting
  ON communication_announcements USING gin(targeting_rules);

-- ─── 4. VUE : v_announcement_stats ───────────────────────────
-- Statistiques de lecture par annonce

CREATE OR REPLACE VIEW v_announcement_stats AS
SELECT
  a.id                                  AS announcement_id,
  a.organization_id,
  a.title,
  a.important,
  a.targeting_rules,
  a.published_at,
  -- Total destinataires ciblés (estimation: membres org si "all")
  (
    SELECT COUNT(*)
    FROM users u
    WHERE u.organization_id = a.organization_id
      AND u.is_active = true
      AND (
        a.targeting_rules->>'type' = 'all'
        OR (
          a.targeting_rules->>'type' = 'roles'
          AND u.role::text = ANY(ARRAY(
            SELECT jsonb_array_elements_text(a.targeting_rules->'roles')
          ))
        )
        OR (
          a.targeting_rules->>'type' = 'manual'
          AND u.id = ANY(ARRAY(
            SELECT (jsonb_array_elements_text(a.targeting_rules->'user_ids'))::uuid
          ))
        )
      )
  )                                     AS total_recipients,
  -- Nombre de lectures effectives
  COUNT(r.id)                           AS read_count,
  -- Taux de lecture (0–100)
  CASE
    WHEN (
      SELECT COUNT(*) FROM users u
      WHERE u.organization_id = a.organization_id AND u.is_active = true
    ) = 0 THEN 0
    ELSE ROUND(
      COUNT(r.id)::NUMERIC /
      NULLIF((
        SELECT COUNT(*) FROM users u
        WHERE u.organization_id = a.organization_id AND u.is_active = true
      ), 0) * 100,
      1
    )
  END                                   AS read_pct,
  MAX(r.read_at)                        AS last_read_at
FROM communication_announcements a
LEFT JOIN announcement_read_receipts r ON r.announcement_id = a.id
GROUP BY a.id, a.organization_id, a.title, a.important, a.targeting_rules, a.published_at;

-- ─── 5. FONCTION : mark_announcement_read ────────────────────
-- Enregistre ou ignore (ON CONFLICT) la lecture d'une annonce

CREATE OR REPLACE FUNCTION mark_announcement_read(p_announcement_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM communication_announcements
  WHERE id = p_announcement_id;

  IF v_org_id IS NULL THEN RETURN; END IF;

  INSERT INTO announcement_read_receipts (organization_id, announcement_id, user_id)
  VALUES (v_org_id, p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
END;
$$;

-- ─── 6. FONCTION : get_announcement_recipients ───────────────
-- Retourne la liste des destinataires d'une annonce selon targeting_rules

CREATE OR REPLACE FUNCTION get_announcement_recipients(p_announcement_id UUID)
RETURNS TABLE (
  user_id        UUID,
  first_name     TEXT,
  last_name      TEXT,
  role           TEXT,
  has_read       BOOLEAN,
  read_at        TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ann   RECORD;
BEGIN
  SELECT a.organization_id, a.targeting_rules
  INTO v_ann
  FROM communication_announcements a
  WHERE a.id = p_announcement_id;

  IF v_ann IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.role,
    (r.id IS NOT NULL)         AS has_read,
    r.read_at
  FROM users u
  LEFT JOIN announcement_read_receipts r
    ON r.announcement_id = p_announcement_id AND r.user_id = u.id
  WHERE u.organization_id = v_ann.organization_id
    AND u.is_active = true
    AND (
      -- Tous
      v_ann.targeting_rules->>'type' = 'all'
      -- Par rôle
      OR (
        v_ann.targeting_rules->>'type' = 'roles'
        AND u.role::text = ANY(ARRAY(
          SELECT jsonb_array_elements_text(v_ann.targeting_rules->'roles')
        ))
      )
      -- Manuel (user_ids)
      OR (
        v_ann.targeting_rules->>'type' = 'manual'
        AND u.id = ANY(ARRAY(
          SELECT (jsonb_array_elements_text(v_ann.targeting_rules->'user_ids'))::uuid
        ))
      )
    )
  ORDER BY has_read ASC, u.last_name, u.first_name;
END;
$$;

-- ─── 7. RLS ───────────────────────────────────────────────────
ALTER TABLE announcement_read_receipts ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur peut voir ses propres accusés + admins voient tout
CREATE POLICY "read_receipts_select" ON announcement_read_receipts FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('administrateur','directeur')
    )
  );

-- Insertion : uniquement soi-même (via RPC mark_announcement_read)
CREATE POLICY "read_receipts_insert" ON announcement_read_receipts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ─── 8. GRANT fonctions ───────────────────────────────────────
GRANT EXECUTE ON FUNCTION mark_announcement_read(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION get_announcement_recipients(UUID)      TO authenticated;

-- ─── 9. Accès vue ─────────────────────────────────────────────
GRANT SELECT ON v_announcement_stats TO authenticated;