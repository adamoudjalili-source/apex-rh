-- ============================================================
-- APEX RH — migration_s44_reporting.sql
-- Session 44 — Reporting Automatisé IA
-- Table : ai_reports
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_reports (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES users(id) ON DELETE CASCADE,     -- NULL si rapport équipe
  service_id    uuid        REFERENCES services(id) ON DELETE CASCADE,  -- NULL si rapport individuel
  report_type   text        NOT NULL
    CHECK (report_type IN ('monthly_individual','monthly_team','weekly_team')),
  period_label  text        NOT NULL,  -- ex: "Mars 2026", "Semaine 10 — 2026"
  year          integer     NOT NULL,
  month         integer,               -- NULL si hebdo
  week          integer,               -- NULL si mensuel
  status        text        DEFAULT 'generating'
    CHECK (status IN ('generating','ready','error')),

  -- Données calculées
  stats         jsonb       DEFAULT '{}',  -- métriques clés (avg PULSE, taux soumission, etc.)
  ai_summary    text,                      -- résumé narratif généré par Claude
  highlights    jsonb       DEFAULT '[]',  -- points clés structurés [{type,label,value,trend}]
  recommendations jsonb     DEFAULT '[]',  -- recommandations [{priority,text}]

  generated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, report_type, year, month, week),
  UNIQUE(service_id, report_type, year, month, week)
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_user
  ON ai_reports(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_service
  ON ai_reports(service_id, generated_at DESC);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Collaborateur : lit ses propres rapports individuels
CREATE POLICY "ai_reports_self_read" ON ai_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Manager : lit les rapports de son service
CREATE POLICY "ai_reports_manager_read" ON ai_reports
  FOR SELECT USING (
    service_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur')
        AND (u.service_id = service_id OR u.role IN ('directeur','administrateur'))
    )
  );

-- Ecriture : managers et service_role (Edge Functions)
CREATE POLICY "ai_reports_write" ON ai_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('chef_service','chef_division','directeur','administrateur','collaborateur')
    )
  );

GRANT ALL ON ai_reports TO service_role;
