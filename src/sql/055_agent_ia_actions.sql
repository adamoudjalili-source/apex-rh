-- ============================================================
-- APEX RH — Migration 055 · S136
-- Table agent_ia_actions — journal immuable des actions agents
-- ============================================================
SET search_path = public;

CREATE TABLE public.agent_ia_actions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name       text NOT NULL,
  action_type      text NOT NULL,
  target_table     text,
  target_id        uuid,
  payload          jsonb DEFAULT '{}',
  result           jsonb DEFAULT '{}',
  status           text DEFAULT 'pending',
  approved_by      uuid REFERENCES public.users(id),
  approved_at      timestamptz,
  llm_tokens_used  integer DEFAULT 0,
  execution_ms     integer,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX ON agent_ia_actions(organization_id, agent_name, created_at DESC);
CREATE INDEX ON agent_ia_actions(organization_id, status) WHERE status = 'pending';

ALTER TABLE agent_ia_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_actions_org ON agent_ia_actions
  USING (organization_id = (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
