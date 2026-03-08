// ============================================================
// APEX RH — src/hooks/useDevelopmentPlan.js
// Session 41 — "Mon Développement" + PDI
// Plan de Développement Individuel :
//   • useMyPlan()          — plan courant (ou null)
//   • usePlanActions()     — actions d'un plan
//   • useUpsertPlan()      — créer ou mettre à jour un plan
//   • useCreateAction()    — ajouter une action
//   • useUpdateAction()    — modifier une action (statut, titre…)
//   • useDeleteAction()    — supprimer une action
//   • COMPETENCY_OPTIONS   — 6 axes de compétences
//   • computePdiProgress() — % d'avancement global
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const COMPETENCY_OPTIONS = [
  { key: 'quality',        label: 'Qualité du travail',       icon: '⭐', color: '#4F46E5' },
  { key: 'deadlines',      label: 'Respect des délais',       icon: '⏱️', color: '#3B82F6' },
  { key: 'communication',  label: 'Communication',            icon: '💬', color: '#10B981' },
  { key: 'teamwork',       label: 'Esprit d\'équipe',         icon: '🤝', color: '#F59E0B' },
  { key: 'initiative',     label: 'Initiative & Proactivité', icon: '🚀', color: '#EC4899' },
  { key: 'other',          label: 'Autre / Transversal',      icon: '📌', color: '#6B7280' },
]

export const ACTION_STATUS_LABELS = {
  todo:        'À faire',
  in_progress: 'En cours',
  done:        'Réalisé',
}

export const ACTION_STATUS_COLORS = {
  todo:        '#6B7280',
  in_progress: '#F59E0B',
  done:        '#10B981',
}

export const ACTION_PRIORITY_LABELS = {
  low:    'Faible',
  medium: 'Normale',
  high:   'Prioritaire',
}

export const ACTION_PRIORITY_COLORS = {
  low:    '#6B7280',
  medium: '#3B82F6',
  high:   '#EF4444',
}

export const CURRENT_PERIOD = () => String(new Date().getFullYear())

// ─── UTILITAIRES ─────────────────────────────────────────────

/**
 * Calcule le % d'avancement global du PDI
 */
export function computePdiProgress(actions = []) {
  if (!actions.length) return 0
  const done = actions.filter(a => a.status === 'done').length
  return Math.round((done / actions.length) * 100)
}

/**
 * Groupe les actions par compétence
 */
export function groupActionsByCompetency(actions = []) {
  const groups = {}
  for (const comp of COMPETENCY_OPTIONS) {
    groups[comp.key] = []
  }
  for (const action of actions) {
    const key = action.competency_key || 'other'
    if (!groups[key]) groups[key] = []
    groups[key].push(action)
  }
  return groups
}

// ─── QUERIES ─────────────────────────────────────────────────

/**
 * Plan de développement courant de l'utilisateur connecté
 */
export function useMyPlan(periodLabel) {
  const { profile } = useAuth()
  const period = periodLabel ?? CURRENT_PERIOD()

  return useQuery({
    queryKey: ['development-plan', profile?.id, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('development_plans')
        .select('*')
        .eq('user_id', profile.id)
        .eq('period_label', period)
        .maybeSingle()

      if (error) throw error
      return data  // null si pas encore créé
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

/**
 * Toutes les actions d'un plan PDI
 */
export function usePlanActions(planId) {
  return useQuery({
    queryKey: ['pdi-actions', planId],
    queryFn: async () => {
      if (!planId) return []
      const { data, error } = await supabase
        .from('pdi_actions')
        .select(`
          *,
          review_cycle:review_cycles(id, title, frequency, period_start, period_end)
        `)
        .eq('plan_id', planId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!planId,
    staleTime: 30_000,
  })
}

/**
 * Actions PDI de l'utilisateur (toutes périodes, pour boucle fermée)
 */
export function useAllMyActions() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pdi-actions-all', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdi_actions')
        .select(`
          *,
          plan:development_plans(id, period_label, title),
          review_cycle:review_cycles(id, title, frequency)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  })
}

// ─── MUTATIONS ───────────────────────────────────────────────

/**
 * Créer ou mettre à jour un plan PDI
 */
export function useUpsertPlan() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ period_label, title, objectives, notes }) => {
      const period = period_label ?? CURRENT_PERIOD()

      const { data, error } = await supabase
        .from('development_plans')
        .upsert(
          {
            user_id:      profile.id,
            period_label: period,
            title:        title || 'Mon Plan de Développement',
            objectives:   objectives ?? null,
            notes:        notes ?? null,
            updated_at:   new Date().toISOString(),
          },
          { onConflict: 'user_id,period_label', ignoreDuplicates: false }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['development-plan', profile?.id] })
    },
  })
}

/**
 * Créer une action PDI
 */
export function useCreateAction() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({
      plan_id,
      competency_key = 'other',
      title,
      description,
      due_date,
      status = 'todo',
      priority = 'medium',
      review_cycle_id,
    }) => {
      const { data, error } = await supabase
        .from('pdi_actions')
        .insert({
          plan_id,
          user_id:        profile.id,
          competency_key,
          title,
          description:    description ?? null,
          due_date:       due_date ?? null,
          status,
          priority,
          review_cycle_id: review_cycle_id ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pdi-actions', vars.plan_id] })
      qc.invalidateQueries({ queryKey: ['pdi-actions-all', profile?.id] })
    },
  })
}

/**
 * Mettre à jour une action PDI
 */
export function useUpdateAction() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, plan_id, ...fields }) => {
      // Si on passe à "done", enregistrer la date
      if (fields.status === 'done') {
        fields.completed_at = new Date().toISOString()
      } else if (fields.status && fields.status !== 'done') {
        fields.completed_at = null
      }

      const { data, error } = await supabase
        .from('pdi_actions')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...data, plan_id }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pdi-actions', data.plan_id] })
      qc.invalidateQueries({ queryKey: ['pdi-actions-all', profile?.id] })
    },
  })
}

/**
 * Supprimer une action PDI
 */
export function useDeleteAction() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, plan_id }) => {
      const { error } = await supabase
        .from('pdi_actions')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { plan_id }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pdi-actions', vars.plan_id] })
      qc.invalidateQueries({ queryKey: ['pdi-actions-all', profile?.id] })
    },
  })
}
