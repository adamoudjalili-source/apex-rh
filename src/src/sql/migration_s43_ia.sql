-- ============================================================
-- APEX RH — migration_s43_ia.sql
-- Session 43 — IA Générative + Coach Prédictif
-- Tables : ai_chat_messages, ai_pdi_suggestions, ai_predictive_alerts
-- ============================================================

-- ── 1. Historique des chats IA ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES users(id) ON DELETE CASCADE,
  context_key text        NOT NULL,  -- ex: 'developpement', 'equipe:uuid', 'coach'
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_context
  ON ai_chat_messages(user_id, context_key, created_at DESC);

-- ── 2. Suggestions PDI générées par IA ───────────────────────
CREATE TABLE IF NOT EXISTS ai_pdi_suggestions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        REFERENCES users(id) ON DELETE CASCADE,
  competency_key   text        NOT NULL
    CHECK (competency_key IN ('quality','deadlines','communication','teamwork','initiative')),
  suggested_action text        NOT NULL,
  rationale        text,
  priority         text        DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  generated_at     timestamptz DEFAULT now(),
  accepted         boolean     DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ai_pdi_suggestions_user
  ON ai_pdi_suggestions(user_id, generated_at DESC);

-- ── 3. Alertes prédictives (calculées côté client, persistées optionnellement) ──
CREATE TABLE IF NOT EXISTS ai_predictive_alerts (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES users(id) ON DELETE CASCADE,
  service_id   uuid        REFERENCES services(id) ON DELETE CASCADE,
  alert_type   text        NOT NULL
    CHECK (alert_type IN ('departure_risk','overload','disengagement','high_performer')),
  severity     text        DEFAULT 'medium'
    CHECK (severity IN ('critical','high','medium','low')),
  message      text        NOT NULL,
  data         jsonb       DEFAULT '{}',
  computed_at  timestamptz DEFAULT now(),
  resolved_at  timestamptz,
  UNIQUE(user_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_predictive_alerts_service
  ON ai_predictive_alerts(service_id, computed_at DESC);

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE ai_chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pdi_suggestions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictive_alerts ENABLE ROW LEVEL SECURITY;

-- ai_chat_messages : chaque utilisateur lit/écrit ses propres messages
CREATE POLICY "ai_chat_self" ON ai_chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- ai_pdi_suggestions : chaque utilisateur lit ses propres suggestions ; managers lisent leur service
CREATE POLICY "ai_pdi_self" ON ai_pdi_suggestions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ai_pdi_manager_read" ON ai_pdi_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN users target ON target.id = user_id
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
        AND (u.service_id = target.service_id OR u.role IN ('directeur','administrateur'))
    )
  );

-- ai_predictive_alerts : managers lisent les alertes de leur service
CREATE POLICY "ai_alerts_manager_read" ON ai_predictive_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
        AND (u.service_id = service_id OR u.role IN ('directeur','administrateur'))
    )
  );

CREATE POLICY "ai_alerts_service_write" ON ai_predictive_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
    )
  );

-- ── Grant service_role (Edge Functions) ──────────────────────
GRANT ALL ON ai_chat_messages     TO service_role;
GRANT ALL ON ai_pdi_suggestions   TO service_role;
GRANT ALL ON ai_predictive_alerts TO service_role;
