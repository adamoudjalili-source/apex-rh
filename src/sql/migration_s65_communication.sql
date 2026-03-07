-- ============================================================
-- APEX RH — migration_s65_communication.sql
-- Session S65 — Module Communication Interne
-- Messagerie temps réel, annonces, fils contextuels
-- ============================================================

-- ─── EXTENSION ───────────────────────────────────────────────
-- pg_trgm pour la recherche full-text fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── CANAUX ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'general'
                CHECK (type IN ('general','team','division','direct','thematic','private')),
  icon          TEXT,                          -- emoji ou nom d'icône
  color         TEXT DEFAULT '#06B6D4',
  created_by    UUID REFERENCES profiles(id)  ON DELETE SET NULL,
  members       UUID[]  DEFAULT '{}',          -- null = ouvert à tous
  is_private    BOOLEAN DEFAULT false,
  is_archived   BOOLEAN DEFAULT false,
  pinned_msg_id UUID,                          -- FK ajoutée après creation_messages
  last_msg_at   TIMESTAMPTZ,
  last_msg_preview TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Canaux par défaut pour chaque org (créés via trigger)
-- 'general' : ouvert à tous
-- 'annonces' : direction/rh seulement (écriture)
-- 'rh' : lecture tous, écriture RH
-- 'direction' : privé direction

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES communication_channels(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  content_type  TEXT DEFAULT 'text' CHECK (content_type IN ('text','system','ai_summary')),
  attachments   JSONB DEFAULT '[]',           -- [{name, url, type, size}]
  reply_to_id   UUID REFERENCES communication_messages(id) ON DELETE SET NULL,
  reactions     JSONB DEFAULT '{}',           -- {"👍": ["user_id1","user_id2"]}
  read_by       UUID[] DEFAULT '{}',
  edited_at     TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,                  -- soft delete
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- FK pinned_msg sur channels (ajout après création table messages)
ALTER TABLE communication_channels
  ADD CONSTRAINT fk_pinned_msg
  FOREIGN KEY (pinned_msg_id) REFERENCES communication_messages(id) ON DELETE SET NULL;

-- ─── ANNONCES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,               -- rich text (HTML sanitized)
  excerpt         TEXT,                        -- auto-généré (300 chars)
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_roles    TEXT[] DEFAULT '{}',         -- [] = tous les rôles
  target_divisions UUID[] DEFAULT '{}',        -- [] = toutes les divisions
  cover_image_url TEXT,
  attachments     JSONB DEFAULT '[]',
  pinned          BOOLEAN DEFAULT false,
  reactions       JSONB DEFAULT '{}',
  views           UUID[] DEFAULT '{}',         -- qui l'a vue
  published_at    TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Commentaires sur annonces
CREATE TABLE IF NOT EXISTS communication_announcement_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id  UUID NOT NULL REFERENCES communication_announcements(id) ON DELETE CASCADE,
  author_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content          TEXT NOT NULL,
  reactions        JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── FILS CONTEXTUELS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_threads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL
               CHECK (entity_type IN ('project','objective','campaign','review','task')),
  entity_id    UUID NOT NULL,
  channel_id   UUID REFERENCES communication_channels(id) ON DELETE CASCADE,
  title        TEXT,                           -- titre optionnel
  created_by   UUID REFERENCES profiles(id)  ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Messages dans les fils contextuels
CREATE TABLE IF NOT EXISTS communication_thread_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES communication_threads(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  reactions   JSONB DEFAULT '{}',
  read_by     UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── RÉSUMÉS IA ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_ai_summaries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID REFERENCES communication_channels(id) ON DELETE CASCADE,
  thread_id   UUID REFERENCES communication_threads(id)  ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  msg_count   INT DEFAULT 0,
  from_date   TIMESTAMPTZ,
  to_date     TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── STATUTS UTILISATEUR ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_user_status (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'online' CHECK (status IN ('online','away','busy','offline')),
  status_msg   TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_channels_org       ON communication_channels(org_id);
CREATE INDEX IF NOT EXISTS idx_channels_type      ON communication_channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_members   ON communication_channels USING gin(members);

CREATE INDEX IF NOT EXISTS idx_messages_channel   ON communication_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_org       ON communication_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_author    ON communication_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply     ON communication_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_by   ON communication_messages USING gin(read_by);
-- Recherche full-text sur messages
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON communication_messages
  USING gin(content gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_annonces_org       ON communication_announcements(org_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_annonces_pinned    ON communication_announcements(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_annonces_roles     ON communication_announcements USING gin(target_roles);
-- Recherche full-text sur annonces
CREATE INDEX IF NOT EXISTS idx_annonces_title_trgm   ON communication_announcements
  USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_annonces_content_trgm ON communication_announcements
  USING gin(content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_threads_entity     ON communication_threads(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_threads_org        ON communication_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_thread_msgs_thread ON communication_thread_messages(thread_id, created_at DESC);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='set_channels_updated_at'
  ) THEN
    CREATE TRIGGER set_channels_updated_at
      BEFORE UPDATE ON communication_channels
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='set_annonces_updated_at'
  ) THEN
    CREATE TRIGGER set_annonces_updated_at
      BEFORE UPDATE ON communication_announcements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── TRIGGER : last_msg_at sur channels ──────────────────────
CREATE OR REPLACE FUNCTION update_channel_last_msg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communication_channels
  SET
    last_msg_at      = NEW.created_at,
    last_msg_preview = LEFT(NEW.content, 80)
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trig_channel_last_msg'
  ) THEN
    CREATE TRIGGER trig_channel_last_msg
      AFTER INSERT ON communication_messages
      FOR EACH ROW EXECUTE FUNCTION update_channel_last_msg();
  END IF;
END $$;

-- ─── TRIGGER : canaux par défaut à la création d'une org ─────
CREATE OR REPLACE FUNCTION create_default_channels()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO communication_channels (org_id, name, description, type, color, is_private)
  VALUES
    (NEW.id, 'Général',   'Canal ouvert à tous les collaborateurs', 'general',   '#06B6D4', false),
    (NEW.id, 'Annonces',  'Annonces officielles RH et direction',   'thematic',  '#C9A227', false),
    (NEW.id, 'RH',        'Informations et actualités RH',          'thematic',  '#10B981', false),
    (NEW.id, 'Direction', 'Canal privé direction',                  'direction', '#EF4444', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trig_default_channels'
  ) THEN
    CREATE TRIGGER trig_default_channels
      AFTER INSERT ON organizations
      FOR EACH ROW EXECUTE FUNCTION create_default_channels();
  END IF;
END $$;

-- ─── MODULE SETTING ──────────────────────────────────────────
UPDATE app_settings
SET value = jsonb_set(
  COALESCE(value::jsonb, '{}'),
  '{communication_enabled}',
  'true'
)
WHERE key = 'modules'
  AND NOT (COALESCE(value::jsonb, '{}') ? 'communication_enabled');

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE communication_channels              ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_threads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_thread_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_ai_summaries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_user_status           ENABLE ROW LEVEL SECURITY;

-- Channels : membres de l'org peuvent voir les canaux publics + leurs canaux privés
CREATE POLICY "channels_select" ON communication_channels FOR SELECT
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (
      is_private = false
      OR auth.uid() = ANY(members)
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "channels_insert" ON communication_channels FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "channels_update" ON communication_channels FOR UPDATE
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (created_by = auth.uid()
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrateur','directeur'))
  );

-- Messages : membres du canal peuvent lire/écrire
CREATE POLICY "messages_select" ON communication_messages FOR SELECT
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
    AND channel_id IN (
      SELECT id FROM communication_channels
      WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        AND (is_private = false OR auth.uid() = ANY(members))
    )
  );

CREATE POLICY "messages_insert" ON communication_messages FOR INSERT
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "messages_update" ON communication_messages FOR UPDATE
  USING (author_id = auth.uid());

-- Annonces : tous peuvent lire, admins/directeurs peuvent créer
CREATE POLICY "annonces_select" ON communication_announcements FOR SELECT
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      array_length(target_roles, 1) IS NULL
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(target_roles)
    )
  );

CREATE POLICY "annonces_insert" ON communication_announcements FOR INSERT
  WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrateur','directeur','chef_division','chef_service')
  );

CREATE POLICY "annonces_update" ON communication_announcements FOR UPDATE
  USING (
    author_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrateur','directeur')
  );

-- Commentaires annonces
CREATE POLICY "ann_comments_select" ON communication_announcement_comments FOR SELECT
  USING (announcement_id IN (SELECT id FROM communication_announcements
    WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "ann_comments_insert" ON communication_announcement_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Fils contextuels
CREATE POLICY "threads_select" ON communication_threads FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "threads_insert" ON communication_threads FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "thread_msgs_select" ON communication_thread_messages FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "thread_msgs_insert" ON communication_thread_messages FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND author_id = auth.uid());

-- Résumés IA
CREATE POLICY "ai_summaries_select" ON communication_ai_summaries FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Statuts utilisateurs
CREATE POLICY "user_status_select" ON communication_user_status FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "user_status_upsert" ON communication_user_status FOR ALL
  USING (user_id = auth.uid());

-- ─── FONCTION RECHERCHE FULL-TEXT ────────────────────────────
CREATE OR REPLACE FUNCTION search_communication(
  p_org_id  UUID,
  p_query   TEXT,
  p_limit   INT DEFAULT 20
)
RETURNS TABLE (
  result_type TEXT,
  result_id   UUID,
  title       TEXT,
  excerpt     TEXT,
  author_id   UUID,
  created_at  TIMESTAMPTZ,
  relevance   REAL
) AS $$
BEGIN
  RETURN QUERY
    -- Messages
    SELECT
      'message'::TEXT,
      m.id,
      c.name AS title,
      LEFT(m.content, 150) AS excerpt,
      m.author_id,
      m.created_at,
      similarity(m.content, p_query) AS relevance
    FROM communication_messages m
    JOIN communication_channels c ON c.id = m.channel_id
    WHERE m.org_id = p_org_id
      AND m.deleted_at IS NULL
      AND m.content ILIKE '%' || p_query || '%'
    UNION ALL
    -- Annonces
    SELECT
      'announcement'::TEXT,
      a.id,
      a.title,
      LEFT(a.content, 150),
      a.author_id,
      a.created_at,
      similarity(a.title || ' ' || a.content, p_query)
    FROM communication_announcements a
    WHERE a.org_id = p_org_id
      AND (a.title ILIKE '%' || p_query || '%'
        OR a.content ILIKE '%' || p_query || '%')
    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
