// ============================================================
// APEX RH — useTaskAutomations.js  ·  S130
// Automations : CRUD règles + lecture logs
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

const QK = (orgId) => ['task_automation_rules', orgId]

// ─── Définitions des événements déclencheurs ──────────────
export const AUTOMATION_TRIGGERS = [
  {
    id:          'task_completed',
    label:       'Tâche terminée',
    icon:        '✅',
    description: 'Déclenché quand une tâche passe au statut "Terminée"',
    actions:     ['notify_manager', 'notify_creator'],
  },
  {
    id:          'task_overdue',
    label:       'Tâche en retard',
    icon:        '⚠️',
    description: 'Déclenché chaque jour pour les tâches dont l\'échéance est dépassée',
    actions:     ['notify_assignees', 'notify_manager'],
    config:      [{ key: 'overdue_hours', label: 'Délai avant notification (h)', default: 0 }],
  },
  {
    id:          'review_timeout',
    label:       'Validation en attente',
    icon:        '⏳',
    description: 'Déclenché si une tâche "En revue" n\'est pas traitée dans le délai imparti',
    actions:     ['notify_manager', 'notify_creator'],
    config:      [{ key: 'timeout_hours', label: 'Délai max sans action (h)', default: 48 }],
  },
  {
    id:          'task_blocked',
    label:       'Tâche bloquée',
    icon:        '🚫',
    description: 'Déclenché quand une tâche passe au statut "Bloquée"',
    actions:     ['notify_manager', 'notify_assignees'],
  },
]

export const AUTOMATION_ACTIONS = {
  notify_manager:   { label: 'Notifier le manager',    icon: '👤' },
  notify_assignees: { label: 'Notifier les assignés',  icon: '👥' },
  notify_creator:   { label: 'Notifier le créateur',   icon: '✍️' },
  change_status:    { label: 'Changer le statut',      icon: '🔄' },
}

// ─── Lecture des règles ───────────────────────────────────
export function useTaskAutomationRules() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: QK(profile?.organization_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_automation_rules')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
  })
}

// ─── Lecture des logs récents ─────────────────────────────
export function useTaskAutomationLogs({ limit = 50 } = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['task_automation_logs', profile?.organization_id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_automation_logs')
        .select(`
          *,
          rule:task_automation_rules(name, trigger_event),
          task:tasks(id, title)
        `)
        .eq('organization_id', profile.organization_id)
        .order('executed_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    enabled:   !!profile?.organization_id,
    staleTime: 60 * 1000,
  })
}

// ─── Création ─────────────────────────────────────────────
export function useCreateAutomationRule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (rule) => {
      const { data, error } = await supabase
        .from('task_automation_rules')
        .insert({
          organization_id: profile.organization_id,
          name:            rule.name,
          trigger_event:   rule.trigger_event,
          trigger_config:  rule.trigger_config  || {},
          action_type:     rule.action_type,
          action_config:   rule.action_config   || {},
          is_active:       rule.is_active       ?? true,
          created_by:      profile.id,
        })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(profile?.organization_id) }),
  })
}

// ─── Mise à jour ──────────────────────────────────────────
export function useUpdateAutomationRule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase
        .from('task_automation_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(profile?.organization_id) }),
  })
}

// ─── Toggle actif/inactif ─────────────────────────────────
export function useToggleAutomationRule() {
  const updateRule = useUpdateAutomationRule()
  return useMutation({
    mutationFn: ({ id, is_active }) => updateRule.mutateAsync({ id, updates: { is_active } }),
  })
}

// ─── Suppression ─────────────────────────────────────────
export function useDeleteAutomationRule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('task_automation_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(profile?.organization_id) }),
  })
}
