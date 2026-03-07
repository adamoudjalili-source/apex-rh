// ============================================================
// APEX RH — usePulseAlerts.js
// ✅ Session 22 — Hook alertes intelligentes PULSE (Phase B)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  getTodayString,
  isJournalDeadlinePassed,
  isBriefDeadlinePassed,
} from '../lib/pulseHelpers'

import { MANAGER_ROLES } from '../lib/roles'

// ─── TYPES D'ALERTES ─────────────────────────────────────────
export const ALERT_TYPES = {
  BRIEF_MISSING:      'brief_missing',        // Brief non soumis après l'heure limite
  LOG_MISSING:        'log_missing',          // Journal non soumis après l'heure limite
  LOG_LATE:           'log_late',             // Journal soumis en retard
  SCORE_DECLINING:    'score_declining',      // Score en baisse significative (–15pts)
  SCORE_CRITICAL:     'score_critical',       // Score < 40 sur 3 jours consécutifs
  CORRECTION_PENDING: 'correction_pending',   // Journal en attente de correction par l'agent
  REVIEW_PENDING:     'review_pending',       // Journal soumis, pas encore évalué
}

export const ALERT_SEVERITY = {
  info:     { label: 'Info',     color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  warning:  { label: 'Attention', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  critical: { label: 'Critique', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
}

// ─── ALERTES DE L'ÉQUIPE (manager) ───────────────────────────
/**
 * Génère les alertes temps réel pour le manager en se basant
 * sur l'état des logs/plans du jour + les performance_alerts en base.
 */
export function useTeamAlerts(settings) {
  const { profile } = useAuth()
  const today = getTodayString()

  return useQuery({
    queryKey: ['pulse', 'team-alerts', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return []

      const alerts = []

      // 1. Alertes en base (performance_alerts)
      const { data: dbAlerts } = await supabase
        .from('performance_alerts')
        .select(`
          *,
          user:users!performance_alerts_user_id_fkey(id, first_name, last_name)
        `)
        .eq('alert_date', today)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })

      if (dbAlerts?.length) {
        dbAlerts.forEach(a => {
          alerts.push({
            id: a.id,
            source: 'db',
            type: a.alert_type,
            severity: a.severity || 'warning',
            userId: a.user_id,
            userName: a.user
              ? `${a.user.first_name} ${a.user.last_name}`
              : 'Inconnu',
            message: a.message,
            createdAt: a.created_at,
            isResolved: a.is_resolved,
          })
        })
      }

      // 2. Alertes calculées à la volée (non-soumissions)
      if (isBriefDeadlinePassed(settings)) {
        // Qui n'a pas soumis son brief ?
        const { data: plans } = await supabase
          .from('morning_plans')
          .select('user_id')
          .eq('plan_date', today)
          .eq('status', 'submitted')

        const { data: allUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('is_active', true)
          .eq('role', 'collaborateur')

        const submittedPlanIds = new Set(plans?.map(p => p.user_id) || [])
        const missing = (allUsers || []).filter(u => !submittedPlanIds.has(u.id))
        missing.forEach(u => {
          alerts.push({
            id: `brief-missing-${u.id}`,
            source: 'realtime',
            type: ALERT_TYPES.BRIEF_MISSING,
            severity: 'warning',
            userId: u.id,
            userName: `${u.first_name} ${u.last_name}`,
            message: `Brief matinal non soumis (deadline dépassée)`,
            createdAt: new Date().toISOString(),
            isResolved: false,
          })
        })
      }

      if (isJournalDeadlinePassed(settings)) {
        // Qui n'a pas soumis son journal ?
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('user_id')
          .eq('log_date', today)
          .in('status', ['submitted', 'validated', 'rejected'])

        const { data: allUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('is_active', true)
          .eq('role', 'collaborateur')

        const submittedLogIds = new Set(logs?.map(l => l.user_id) || [])
        const missing = (allUsers || []).filter(u => !submittedLogIds.has(u.id))
        missing.forEach(u => {
          alerts.push({
            id: `log-missing-${u.id}`,
            source: 'realtime',
            type: ALERT_TYPES.LOG_MISSING,
            severity: 'critical',
            userId: u.id,
            userName: `${u.first_name} ${u.last_name}`,
            message: `Journal du soir non soumis (deadline dépassée)`,
            createdAt: new Date().toISOString(),
            isResolved: false,
          })
        })
      }

      // 3. Journaux en attente d'évaluation (review_pending)
      const { data: pendingLogs } = await supabase
        .from('daily_logs')
        .select(`
          id, user_id,
          user:users!daily_logs_user_id_fkey(id, first_name, last_name)
        `)
        .eq('log_date', today)
        .eq('status', 'submitted')

      ;(pendingLogs || []).forEach(log => {
        alerts.push({
          id: `review-pending-${log.id}`,
          source: 'realtime',
          type: ALERT_TYPES.REVIEW_PENDING,
          severity: 'info',
          userId: log.user_id,
          logId: log.id,
          userName: log.user
            ? `${log.user.first_name} ${log.user.last_name}`
            : 'Inconnu',
          message: `Journal en attente de votre évaluation`,
          createdAt: new Date().toISOString(),
          isResolved: false,
        })
      })

      return alerts
    },
    enabled: !!profile?.id && MANAGER_ROLES.includes(profile?.role),
    staleTime: 60000,
    refetchInterval: 120000, // refresh toutes les 2 min
  })
}

// ─── ALERTES PERSONNELLES (collaborateur) ────────────────────
/**
 * Alertes pour le collaborateur connecté :
 * - correction_pending : le manager a demandé une correction
 */
export function useMyAlerts() {
  const { profile } = useAuth()
  const today = getTodayString()

  return useQuery({
    queryKey: ['pulse', 'my-alerts', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── RÉSOUDRE UNE ALERTE ─────────────────────────────────────
export function useResolveAlert() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async (alertId) => {
      const { error } = await supabase
        .from('performance_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'team-alerts', profile?.id, today] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'my-alerts', profile?.id, today] })
    },
  })
}

// ─── COMPTEUR D'ALERTES (pour badge sidebar) ─────────────────
/**
 * Retourne le nombre total d'alertes non résolues.
 * Sert à alimenter AlertBadge dans la sidebar.
 */
export function useAlertCount(settings) {
  const { profile } = useAuth()
  const today = getTodayString()
  const isManager = MANAGER_ROLES.includes(profile?.role)

  const { data: teamAlerts = [] } = useTeamAlerts(isManager ? settings : null)
  const { data: myAlerts = [] } = useMyAlerts()

  if (isManager) {
    return teamAlerts.filter(a => !a.isResolved).length
  }
  return myAlerts.filter(a => !a.is_resolved).length
}
