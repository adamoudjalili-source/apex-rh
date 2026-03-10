// ============================================================
// APEX RH — useAgentIA.js · S136
// Hooks React Query pour les Agents IA (configs + actions)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── Configs ────────────────────────────────────────────────

export function useAgentConfigs() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['agent_ia_configs', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_ia_configs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('agent_name')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
  })
}

// ─── Actions (journal) ─────────────────────────────────────

export function useAgentActions(filters = {}) {
  const { profile } = useAuth()
  const { agentName, status, limit = 50 } = filters

  return useQuery({
    queryKey: ['agent_ia_actions', profile?.organization_id, filters],
    queryFn: async () => {
      let q = supabase
        .from('agent_ia_actions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (agentName) q = q.eq('agent_name', agentName)
      if (status)    q = q.eq('status', status)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
  })
}

// ─── Toggle agent (activer / désactiver) ────────────────────

export function useToggleAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { data, error } = await supabase
        .from('agent_ia_configs')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_ia_configs'] }),
  })
}

// ─── Approuver une suggestion N2 ────────────────────────────

export function useApproveAgentAction() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { data, error } = await supabase
        .from('agent_ia_actions')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_ia_actions'] }),
  })
}

// ─── Rejeter une suggestion N2 ──────────────────────────────

export function useRejectAgentAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { data, error } = await supabase
        .from('agent_ia_actions')
        .update({ status: 'rejected' })
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_ia_actions'] }),
  })
}

// ─── Stats agrégées ─────────────────────────────────────────

export function useAgentStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['agent_ia_stats', profile?.organization_id],
    queryFn: async () => {
      const { data: configs } = await supabase
        .from('agent_ia_configs')
        .select('agent_name, is_active, tokens_used_today, max_tokens_day, last_run_at, last_error')
        .eq('organization_id', profile.organization_id)

      const { data: actions } = await supabase
        .from('agent_ia_actions')
        .select('status')
        .eq('organization_id', profile.organization_id)

      const total    = actions?.length || 0
      const executed = actions?.filter(a => a.status === 'executed').length || 0
      const errors   = actions?.filter(a => a.status === 'error').length || 0
      const pending  = actions?.filter(a => a.status === 'pending').length || 0
      const tokensToday = (configs || []).reduce((s, c) => s + (c.tokens_used_today || 0), 0)

      return {
        configs: configs || [],
        totalActions: total,
        executedActions: executed,
        errorActions: errors,
        pendingActions: pending,
        successRate: total > 0 ? Math.round((executed / total) * 100) : 0,
        tokensToday,
      }
    },
    enabled: !!profile?.organization_id,
  })
}
