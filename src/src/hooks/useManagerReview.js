// ============================================================
// APEX RH — useManagerReview.js
// ✅ Session 22 — Hook évaluations managériales PULSE (Phase B)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getTodayString } from '../lib/pulseHelpers'

import { MANAGER_ROLES } from '../lib/roles'

// ─── LOGS DE L'ÉQUIPE POUR UNE DATE ──────────────────────────
/**
 * Récupère tous les daily_logs de l'équipe gérée par le manager connecté
 * pour une date donnée (default = aujourd'hui).
 *
 * La hiérarchie RLS côté Supabase filtre déjà les données.
 * On fait un filtre additionnel côté client selon le scope du manager.
 */
export function useTeamDailyLogs(date) {
  const { profile } = useAuth()
  const targetDate = date || getTodayString()

  return useQuery({
    queryKey: ['pulse', 'team-logs', profile?.id, targetDate],
    queryFn: async () => {
      if (!profile?.id) return []

      // Récupère les logs + brief + review pour la date cible
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          user:users!daily_logs_user_id_fkey(
            id, first_name, last_name, role,
            service_id, division_id, direction_id,
            services(id, name),
            divisions(id, name)
          ),
          daily_log_entries(
            id, task_id, time_spent_min, progress_before, progress_after,
            task_status, block_type, block_note,
            task:tasks(id, title, status, due_date, priority)
          ),
          manager_reviews(
            id, quality_rating, comment, review_status, reviewed_at,
            reviewer:users!manager_reviews_reviewer_id_fkey(id, first_name, last_name)
          )
        `)
        .eq('log_date', targetDate)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Récupère aussi les morning_plans pour la même date
      const userIds = (data || []).map(l => l.user_id)
      let plans = []
      if (userIds.length > 0) {
        const { data: plansData } = await supabase
          .from('morning_plans')
          .select('*')
          .eq('plan_date', targetDate)
          .in('user_id', userIds)
        plans = plansData || []
      }

      // Fusionne plans dans les logs
      const plansMap = Object.fromEntries(plans.map(p => [p.user_id, p]))
      return (data || []).map(log => ({
        ...log,
        morning_plan: plansMap[log.user_id] || null,
      }))
    },
    enabled: !!profile?.id && MANAGER_ROLES.includes(profile?.role),
    staleTime: 30000,
    refetchInterval: 60000, // actualisation automatique toutes les 60s
  })
}

// ─── LISTE DES AGENTS DE L'ÉQUIPE ────────────────────────────
/**
 * Récupère tous les utilisateurs actifs visibles par le manager.
 * Utile pour détecter les agents qui n'ont pas encore soumis de log.
 */
export function useTeamMembers() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'team-members', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, role,
          service_id, division_id, direction_id,
          services(id, name),
          divisions(id, name)
        `)
        .eq('is_active', true)
        .not('role', 'eq', 'administrateur')
        .order('first_name')

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id && MANAGER_ROLES.includes(profile?.role),
    staleTime: 300000,
  })
}

// ─── REVIEW D'UN LOG ─────────────────────────────────────────
/**
 * Récupère la manager_review pour un daily_log donné
 */
export function useLogReview(logId) {
  return useQuery({
    queryKey: ['pulse', 'review', logId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_reviews')
        .select(`
          *,
          reviewer:users!manager_reviews_reviewer_id_fkey(id, first_name, last_name)
        `)
        .eq('log_id', logId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!logId,
    staleTime: 30000,
  })
}

// ─── SOUMETTRE UNE ÉVALUATION ────────────────────────────────
/**
 * Créer ou mettre à jour une évaluation manager (upsert).
 * review_status : 'approved' | 'rejected' | 'correction_requested'
 */
export function useSubmitReview() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      logId,
      qualityRating,   // 1-5
      comment,
      reviewStatus,    // 'approved' | 'rejected' | 'correction_requested'
    }) => {
      // Upsert la review
      const { data, error } = await supabase
        .from('manager_reviews')
        .upsert({
          log_id: logId,
          reviewer_id: profile.id,
          quality_rating: qualityRating,
          comment: comment || null,
          review_status: reviewStatus,
          reviewed_at: new Date().toISOString(),
        }, { onConflict: 'log_id' })
        .select()
        .single()

      if (error) throw error

      // Met aussi à jour le statut du daily_log
      const logStatus = reviewStatus === 'approved' ? 'validated' : 'rejected'
      await supabase
        .from('daily_logs')
        .update({ status: logStatus })
        .eq('id', logId)

      return data
    },
    onSuccess: (_data, { logId }) => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'review', logId] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'team-logs', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'log', logId] })
    },
  })
}

// ─── STATS ÉQUIPE DU JOUR ────────────────────────────────────
/**
 * Calcule les métriques de soumission de l'équipe pour une date donnée.
 * Utilisé par TeamDayView pour l'en-tête de synthèse.
 */
export function useTeamDayStats(date) {
  const { profile } = useAuth()
  const targetDate = date || getTodayString()

  return useQuery({
    queryKey: ['pulse', 'team-day-stats', profile?.id, targetDate],
    queryFn: async () => {
      if (!profile?.id) return null

      const { data: members } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true)
        .not('role', 'eq', 'administrateur')

      const memberCount = members?.length || 0

      const { data: plans } = await supabase
        .from('morning_plans')
        .select('user_id, status')
        .eq('plan_date', targetDate)
        .eq('status', 'submitted')

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('user_id, status')
        .eq('log_date', targetDate)
        .in('status', ['submitted', 'validated', 'rejected'])

      return {
        total: memberCount,
        briefsSubmitted: plans?.length || 0,
        logsSubmitted: logs?.length || 0,
        logsValidated: logs?.filter(l => l.status === 'validated').length || 0,
        logsRejected: logs?.filter(l => l.status === 'rejected').length || 0,
      }
    },
    enabled: !!profile?.id && MANAGER_ROLES.includes(profile?.role),
    staleTime: 30000,
    refetchInterval: 60000,
  })
}
