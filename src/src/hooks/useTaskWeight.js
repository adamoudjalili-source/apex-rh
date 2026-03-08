// ============================================================
// APEX RH — useTaskWeight.js  ·  Session 39
// Pondération des tâches : 4 critères × 1–5
// Recalcul PULSE Delivery pondéré
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Critères de pondération
export const WEIGHT_CRITERIA = [
  {
    key:   'weight_complexity',
    label: 'Complexité',
    icon:  '🔧',
    desc:  'Difficulté technique ou organisationnelle',
    color: '#8B5CF6',
  },
  {
    key:   'weight_impact',
    label: 'Impact',
    icon:  '💥',
    desc:  'Effet sur les résultats de l\'entreprise',
    color: '#EF4444',
  },
  {
    key:   'weight_urgency',
    label: 'Urgence',
    icon:  '⚡',
    desc:  'Nécessité d\'agir rapidement',
    color: '#F59E0B',
  },
  {
    key:   'weight_strategic',
    label: 'Stratégique',
    icon:  '🎯',
    desc:  'Alignement avec les priorités de la direction',
    color: '#10B981',
  },
]

// Labels pour chaque niveau 1–5
export const WEIGHT_LEVEL_LABELS = {
  1: 'Minimal',
  2: 'Faible',
  3: 'Moyen',
  4: 'Élevé',
  5: 'Critique',
}

/**
 * Calcule le score de pondération d'une tâche (0–100)
 * Formule : (complexity + impact + urgency + strategic) / 20 * 100
 */
export function computeWeightScore(task) {
  const c = task?.weight_complexity ?? 1
  const i = task?.weight_impact     ?? 1
  const u = task?.weight_urgency    ?? 1
  const s = task?.weight_strategic  ?? 1
  return Math.round(((c + i + u + s) / 20) * 100)
}

/**
 * Retourne le label qualitatif du score de pondération
 */
export function getWeightLabel(score100) {
  if (score100 >= 80) return { label: 'Tâche critique',    color: '#EF4444', emoji: '🔴' }
  if (score100 >= 60) return { label: 'Tâche prioritaire', color: '#F59E0B', emoji: '🟠' }
  if (score100 >= 40) return { label: 'Tâche standard',    color: '#3B82F6', emoji: '🔵' }
  return                     { label: 'Tâche légère',      color: '#6B7280', emoji: '⚪' }
}

/**
 * Met à jour les critères de pondération d'une tâche
 */
export function useUpdateTaskWeight() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, weights }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          weight_complexity: weights.weight_complexity ?? 1,
          weight_impact:     weights.weight_impact     ?? 1,
          weight_urgency:    weights.weight_urgency    ?? 1,
          weight_strategic:  weights.weight_strategic  ?? 1,
        })
        .eq('id', taskId)
        .select('id, weight_complexity, weight_impact, weight_urgency, weight_strategic')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['pulse', 'weighted-delivery'] })
    },
  })
}

/**
 * Récupère le score Delivery pondéré d'un utilisateur
 */
export function useWeightedDelivery(userId) {
  return useQuery({
    queryKey: ['pulse', 'weighted-delivery', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pulse_weighted_delivery')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 60000,
  })
}

/**
 * Récupère les scores pondérés de toute l'équipe
 */
export function useTeamWeightedDelivery(serviceId) {
  return useQuery({
    queryKey: ['pulse', 'weighted-delivery', 'team', serviceId],
    queryFn: async () => {
      let query = supabase
        .from('v_pulse_weighted_delivery')
        .select('*')
        .order('delivery_score_weighted', { ascending: false })

      if (serviceId) query = query.eq('service_id', serviceId)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: true,
    staleTime: 60000,
  })
}

/**
 * Calcule le score Delivery pondéré côté client
 * à partir d'une liste de tâches (avec weight_* et status)
 */
export function computeWeightedDeliveryClient(tasks = []) {
  if (!tasks.length) return 0

  let weightedCompleted = 0
  let weightedTotal = 0

  for (const t of tasks) {
    const w = (t.weight_complexity ?? 1) +
              (t.weight_impact     ?? 1) +
              (t.weight_urgency    ?? 1) +
              (t.weight_strategic  ?? 1)
    weightedTotal += w
    if (t.status === 'terminee') weightedCompleted += w
  }

  if (weightedTotal === 0) return 0
  return Math.round((weightedCompleted / weightedTotal) * 100)
}
