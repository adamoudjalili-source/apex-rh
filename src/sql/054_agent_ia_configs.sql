-- ============================================================
-- APEX RH — Migration 054 · S136
-- Table agent_ia_configs — configuration des agents IA
-- ============================================================
SET search_path = public;

CREATE TABLE public.agent_ia_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name       text NOT NULL,
  is_active        boolean DEFAULT false,
  level            text DEFAULT 'N1',
  schedule         text,
  max_tokens_day   integer DEFAULT 5000,
  tokens_used_today integer DEFAULT 0,
  config           jsonb DEFAULT '{}',
  system_prompt    text,
  last_run_at      timestamptz,
  last_error       text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX ON agent_ia_configs(organization_id, agent_name);

ALTER TABLE agent_ia_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_configs_org ON agent_ia_configs
  USING (organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
