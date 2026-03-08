// ============================================================
// APEX RH — src/hooks/useOffboarding.js
// Session 68 — Offboarding
// Hooks : processus, templates, checklist, interview, knowledge, stats
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ───────────────────────────────────────────────

export const OFFBOARDING_STATUS_LABELS = {
  in_progress: 'En cours',
  completed:   'Terminé',
  cancelled:   'Annulé',
}

export const OFFBOARDING_STATUS_COLORS = {
  in_progress: '#F59E0B',
  completed:   '#10B981',
  cancelled:   '#6B7280',
}

export const CHECKLIST_CATEGORY_LABELS = {
  admin:   'Administration',
  it:      'IT',
  hr:      'RH',
  manager: 'Manager',
  finance: 'Finance',
}

export const CHECKLIST_CATEGORY_COLORS = {
  admin:   '#6366F1',
  it:      '#06B6D4',
  hr:      '#8B5CF6',
  manager: '#3B82F6',
  finance: '#10B981',
}

export const CHECKLIST_STATUS_LABELS = {
  pending:     'À faire',
  in_progress: 'En cours',
  done:        'Terminé',
  blocked:     'Bloqué',
}

export const CHECKLIST_STATUS_COLORS = {
  pending:     '#6B7280',
  in_progress: '#F59E0B',
  done:        '#10B981',
  blocked:     '#EF4444',
}

export const EXIT_REASON_LABELS = {
  resignation:        'Démission',
  end_of_contract:    'Fin de contrat',
  dismissal:          'Licenciement',
  mutual_termination: 'Rupture conventionnelle',
  retirement:         'Retraite',
  other:              'Autre',
}

export const KNOWLEDGE_STATUS_LABELS = {
  pending:     'À transférer',
  in_progress: 'En cours',
  done:        'Transféré',
}

// ─── PROCESSUS D'OFFBOARDING ──────────────────────────────────

export function useOffboardingProcesses() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_processes', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .select(`
          *,
          user:users!offboarding_processes_user_id_fkey(id, first_name, last_name, email, role),
          triggered_by_user:users!offboarding_processes_triggered_by_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useOffboardingProcess(id) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_process', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .select(`
          *,
          user:users!offboarding_processes_user_id_fkey(id, first_name, last_name, email, role, service_id),
          triggered_by_user:users!offboarding_processes_triggered_by_fkey(id, first_name, last_name)
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id && !!orgId,
  })
}

export function useCreateOffboardingProcess() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .insert({ ...payload, organization_id: orgId, triggered_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding_processes', orgId] }),
  })
}

export function useUpdateOffboardingProcess() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_processes', orgId] })
      qc.invalidateQueries({ queryKey: ['offboarding_process', vars.id] })
    },
  })
}

export function useCancelOffboarding() {
  const update = useUpdateOffboardingProcess()
  return useMutation({
    mutationFn: ({ id }) => update.mutateAsync({ id, status: 'cancelled' }),
  })
}

// ─── TEMPLATES ────────────────────────────────────────────────

export function useOffboardingTemplates() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_templates', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_templates')
        .select('*')
        .eq('organization_id', orgId)
        .order('is_default', { ascending: false })
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })
}

export function useCreateTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('offboarding_templates')
        .insert({ ...payload, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding_templates', orgId] }),
  })
}

export function useUpdateTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('offboarding_templates')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding_templates', orgId] }),
  })
}

export function useDeleteTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('offboarding_templates')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding_templates', orgId] }),
  })
}

// ─── CHECKLIST ────────────────────────────────────────────────

export function useOffboardingChecklist(processId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_checklist', processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_checklists')
        .select(`
          *,
          assignee:users!offboarding_checklists_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('process_id', processId)
        .eq('organization_id', orgId)
        .order('due_date', { nullsFirst: false })
        .order('category')
      if (error) throw error
      return data || []
    },
    enabled: !!processId && !!orgId,
  })
}

export function useUpdateChecklistItem() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, processId, ...payload }) => {
      // Auto-set completed_at
      if (payload.status === 'done' && !payload.completed_at) {
        payload.completed_at = new Date().toISOString()
      } else if (payload.status !== 'done') {
        payload.completed_at = null
      }
      const { data, error } = await supabase
        .from('offboarding_checklists')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_checklist', vars.processId] })
      qc.invalidateQueries({ queryKey: ['offboarding_process', vars.processId] })
    },
  })
}

export function useCreateChecklistFromTemplate() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ processId, templateId, exitDate }) => {
      // Get template
      const { data: tpl, error: tplErr } = await supabase
        .from('offboarding_templates')
        .select('steps')
        .eq('id', templateId)
        .single()
      if (tplErr) throw tplErr

      const steps = tpl.steps || []
      const items = steps.map(step => {
        let dueDate = null
        if (exitDate && step.days_before_exit !== undefined) {
          const d = new Date(exitDate)
          d.setDate(d.getDate() - step.days_before_exit)
          dueDate = d.toISOString().split('T')[0]
        }
        return {
          process_id:      processId,
          organization_id: orgId,
          title:           step.title,
          category:        step.category || 'admin',
          due_date:        dueDate,
          status:          'pending',
        }
      })

      const { error } = await supabase
        .from('offboarding_checklists')
        .insert(items)
      if (error) throw error
      return items
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_checklist', vars.processId] })
    },
  })
}

export function useAddChecklistItem() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('offboarding_checklists')
        .insert({ ...payload, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_checklist', vars.process_id] })
    },
  })
}

// ─── ENTRETIEN DE SORTIE ──────────────────────────────────────

export function useOffboardingInterview(processId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_interview', processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_interviews')
        .select(`
          *,
          interviewer:users!offboarding_interviews_interviewer_id_fkey(id, first_name, last_name)
        `)
        .eq('process_id', processId)
        .eq('organization_id', orgId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!processId && !!orgId,
  })
}

export function useCreateInterview() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('offboarding_interviews')
        .insert({ ...payload, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_interview', vars.process_id] })
      qc.invalidateQueries({ queryKey: ['offboarding_stats'] })
    },
  })
}

export function useUpdateInterview() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, processId, ...payload }) => {
      const { data, error } = await supabase
        .from('offboarding_interviews')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_interview', vars.processId] })
      qc.invalidateQueries({ queryKey: ['offboarding_stats'] })
    },
  })
}

// ─── TRANSFERT DE CONNAISSANCES ───────────────────────────────

export function useOffboardingKnowledge(processId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_knowledge', processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_knowledge')
        .select(`
          *,
          transferred_to_user:users!offboarding_knowledge_transferred_to_fkey(id, first_name, last_name)
        `)
        .eq('process_id', processId)
        .eq('organization_id', orgId)
        .order('created_at')
      if (error) throw error
      return data || []
    },
    enabled: !!processId && !!orgId,
  })
}

export function useAddKnowledgeItem() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('offboarding_knowledge')
        .insert({ ...payload, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_knowledge', vars.process_id] })
    },
  })
}

export function useUpdateKnowledgeItem() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, processId, ...payload }) => {
      if (payload.status === 'done' && !payload.completed_at) {
        payload.completed_at = new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('offboarding_knowledge')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding_knowledge', vars.processId] })
    },
  })
}

// ─── STATS ────────────────────────────────────────────────────

export function useOffboardingStats() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_stats', orgId],
    queryFn: async () => {
      // Processus
      const { data: processes } = await supabase
        .from('offboarding_processes')
        .select('id, status, exit_reason, created_at')
        .eq('organization_id', orgId)

      // Interviews avec scores
      const { data: interviews } = await supabase
        .from('offboarding_interviews')
        .select('satisfaction_score, would_recommend, main_reason')
        .eq('organization_id', orgId)
        .not('satisfaction_score', 'is', null)

      // Checklists pour taux completion
      const { data: checklists } = await supabase
        .from('offboarding_checklists')
        .select('status')
        .eq('organization_id', orgId)

      const total     = processes?.length || 0
      const inProgress = processes?.filter(p => p.status === 'in_progress').length || 0
      const completed  = processes?.filter(p => p.status === 'completed').length || 0

      // Taux completion checklist global
      const totalItems = checklists?.length || 0
      const doneItems  = checklists?.filter(c => c.status === 'done').length || 0
      const completionRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

      // Score satisfaction moyen
      const scores = interviews?.map(i => i.satisfaction_score).filter(Boolean) || []
      const avgScore = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null

      // eNPS sortie
      const recommends = interviews?.filter(i => i.would_recommend !== null) || []
      const promoters  = recommends.filter(i => i.would_recommend === true).length
      const detractors = recommends.filter(i => i.would_recommend === false).length
      const exitEnps   = recommends.length > 0
        ? Math.round(((promoters - detractors) / recommends.length) * 100)
        : null

      // Motifs de départ
      const reasonCounts = {}
      processes?.forEach(p => {
        if (p.exit_reason) {
          reasonCounts[p.exit_reason] = (reasonCounts[p.exit_reason] || 0) + 1
        }
      })

      return {
        total, inProgress, completed,
        completionRate, avgScore, exitEnps,
        reasonCounts,
        interviewCount: scores.length,
      }
    },
    enabled: !!orgId,
  })
}
