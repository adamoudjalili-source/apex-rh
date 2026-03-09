// ============================================================
// APEX RH — src/hooks/useAICoach.js
// Session 30 — Module IA Coach — Hook TanStack Query
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, useFeedback360.js
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const AI_COACH_AXES = [
  {
    key:   'performance',
    label: 'Performance',
    icon:  '🎯',
    color: '#4F46E5',
    bg:    'rgba(79, 70, 229, 0.1)',
    desc:  'Suggestions pour améliorer l\'efficacité opérationnelle',
  },
  {
    key:   'wellbeing',
    label: 'Bien-être',
    icon:  '💚',
    color: '#10B981',
    bg:    'rgba(16, 185, 129, 0.1)',
    desc:  'Observations sur l\'énergie et la charge de travail',
  },
  {
    key:   'blockers',
    label: 'Blocages',
    icon:  '🔓',
    color: '#F59E0B',
    bg:    'rgba(245, 158, 11, 0.1)',
    desc:  'Freins détectés et pistes de résolution',
  },
]

// ─── HELPERS ────────────────────────────────────────────────

import { MANAGER_ROLES } from '../lib/roles'
import { ROLES } from '../utils/constants'

export function isManagerRole(role) {
  return MANAGER_ROLES.includes(role)
}

export function formatAnalysisDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatPeriod(start, end) {
  if (!start || !end) return ''
  const s = new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const e = new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} → ${e}`
}

// ─── MES ANALYSES (collaborateur connecté) ──────────────────

/**
 * Dernières analyses IA pour le collaborateur connecté (5 max)
 */
export function useMyAICoachAnalyses() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['ai-coach', 'my-analyses', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('ai_coach_analyses')
        .select('*')
        .eq('user_id', profile.id)
        .eq('analysis_type', 'individual')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Dernière analyse individuelle (la plus récente)
 */
export function useLatestMyAnalysis() {
  const { data: analyses = [], ...rest } = useMyAICoachAnalyses()
  return { data: analyses[0] ?? null, ...rest }
}

// ─── ANALYSES ÉQUIPE (managers) ──────────────────────────────

/**
 * Analyses d'équipe pour un service (managers)
 */
export function useTeamAICoachAnalyses(serviceId) {
  return useQuery({
    queryKey: ['ai-coach', 'team-analyses', serviceId],
    queryFn: async () => {
      if (!serviceId) return []

      const { data, error } = await supabase
        .from('ai_coach_analyses')
        .select('*')
        .eq('analysis_type', 'team')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data ?? []
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Analyses individuelles de tous les membres d'un service (managers)
 */
export function useServiceMemberAnalyses(serviceId) {
  return useQuery({
    queryKey: ['ai-coach', 'member-analyses', serviceId],
    queryFn: async () => {
      if (!serviceId) return []

      // Récupérer les collaborateurs du service
      const { data: members, error: membersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('service_id', serviceId)
        .eq('role', ROLES.COLLABORATEUR)
        .eq('is_active', true)

      if (membersErr) throw membersErr
      if (!members || members.length === 0) return []

      const memberIds = members.map(m => m.id)

      // Dernière analyse pour chaque membre
      const { data: analyses, error: analysesErr } = await supabase
        .from('ai_coach_analyses')
        .select('*')
        .in('user_id', memberIds)
        .eq('analysis_type', 'individual')
        .order('created_at', { ascending: false })

      if (analysesErr) throw analysesErr

      // Garder uniquement la dernière analyse par utilisateur
      const latestByUser = new Map()
      for (const a of analyses ?? []) {
        if (!latestByUser.has(a.user_id)) {
          latestByUser.set(a.user_id, a)
        }
      }

      // Merger avec les infos utilisateur
      return members.map(m => ({
        ...m,
        latestAnalysis: latestByUser.get(m.id) ?? null,
      }))
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── MUTATIONS ───────────────────────────────────────────────

/**
 * Déclencher une analyse individuelle (collaborateur ou manager pour un collab)
 * Appelle la Edge Function generate-ai-coach
 */
export function useGenerateIndividualAnalysis() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ userId, periodDays = 7 } = {}) => {
      const targetUserId = userId ?? profile?.id
      if (!targetUserId) throw new Error('user_id requis')

      const { data, error } = await supabase.functions.invoke('generate-ai-coach', {
        body: { type: 'individual', user_id: targetUserId, period_days: periodDays },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Erreur Edge Function')
      return data
    },
    onSuccess: (_, { userId } = {}) => {
      const targetId = userId ?? profile?.id
      queryClient.invalidateQueries({ queryKey: ['ai-coach', 'my-analyses', targetId] })
      queryClient.invalidateQueries({ queryKey: ['ai-coach', 'member-analyses'] })
    },
  })
}

/**
 * Déclencher une analyse d'équipe (managers)
 */
export function useGenerateTeamAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceId, periodDays = 7 } = {}) => {
      if (!serviceId) throw new Error('service_id requis')

      const { data, error } = await supabase.functions.invoke('generate-ai-coach', {
        body: { type: 'team', service_id: serviceId, period_days: periodDays },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Erreur Edge Function')
      return data
    },
    onSuccess: (_, { serviceId } = {}) => {
      queryClient.invalidateQueries({ queryKey: ['ai-coach', 'team-analyses', serviceId] })
    },
  })
}
