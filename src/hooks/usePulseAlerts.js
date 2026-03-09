// ============================================================
// APEX RH — usePulseAlerts.js
// ✅ Session 22 — Hook alertes intelligentes PULSE (Phase B)
// 🐛 Session 88 — Fix : performance_alerts → pulse_alerts, colonnes corrigées
// 🆕 Session 89 — Fix colonnes (status, triggered_at, context_json, organization_id)
//                + usePulseAlertRules CRUD complet + useGeneratePulseAlerts (WARN-2)
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
import { CRITICALITY, ROLES } from '../utils/constants'

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

// Types natifs pulse_alerts (enum pulse_alert_type)
export const PULSE_ALERT_TYPES = {
  DECROCHAGE:  'decrochage',   // score bas plusieurs jours consécutifs
  ABSENCE:     'absence',      // brief/journal manquant plusieurs jours
  STAGNATION:  'stagnation',   // score stable à un niveau bas
  PIC_NEGATIF: 'pic_negatif',  // chute brutale du score en 1 journée
}

export const PULSE_ALERT_STATUS = {
  ACTIVE:       'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED:     'resolved',
  DISMISSED:    'dismissed',
}

export const ALERT_SEVERITY = {
  info:     { label: 'Info',     color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  warning:  { label: 'Attention', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  critical: { label: 'Critique', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
}

// ─── Helper : message lisible depuis alert_type + context_json ─
function buildAlertMessage(alertType, contextJson = {}) {
  const ctx = contextJson || {}
  switch (alertType) {
    case 'decrochage':
      return `Score en décrochage : ${ctx.avg_score ?? '—'} pts sur ${ctx.days ?? '?'} jours consécutifs`
    case 'absence':
      return `Absences répétées : ${ctx.missing_days ?? '?'} jours sans brief/journal`
    case 'stagnation':
      return `Score stagnant à ${ctx.avg_score ?? '—'} pts depuis ${ctx.days ?? '?'} jours`
    case 'pic_negatif':
      return `Chute brutale du score : −${ctx.drop_pct ?? '?'}% en 1 journée`
    case 'brief_missing':
      return 'Brief matinal non soumis (deadline dépassée)'
    case 'log_missing':
      return 'Journal du soir non soumis (deadline dépassée)'
    case 'review_pending':
      return 'Journal en attente de votre évaluation'
    default:
      return ctx.message ?? `Alerte de type ${alertType}`
  }
}

// ─── ALERTES DE L'ÉQUIPE (manager) ───────────────────────────
/**
 * Génère les alertes temps réel pour le manager :
 * - alertes en base (pulse_alerts) non résolues
 * - alertes calculées à la volée (non-soumissions)
 *
 * ✅ Fix S89 : pulse_alerts, status enum, triggered_at, organization_id, context_json
 */
export function useTeamAlerts(settings) {
  const { profile } = useAuth()
  const today = getTodayString()

  return useQuery({
    queryKey: ['pulse', 'team-alerts', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id || !profile?.organization_id) return []

      const alerts = []

      // 1. Alertes en base (pulse_alerts) — statut actif ou acquitté
      const { data: dbAlerts } = await supabase
        .from('pulse_alerts')
        .select(`
          *,
          rule:pulse_alert_rules(name, alert_type),
          user:users!pulse_alerts_user_id_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', profile.organization_id)
        .gte('triggered_at', `${today}T00:00:00.000Z`)
        .lte('triggered_at', `${today}T23:59:59.999Z`)
        .in('status', ['active', 'acknowledged'])
        .order('triggered_at', { ascending: false })

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
            message: buildAlertMessage(a.alert_type, a.context_json),
            createdAt: a.triggered_at,
            status: a.status,
            isResolved: a.status === 'resolved' || a.status === 'dismissed',
            contextJson: a.context_json,
            ruleName: a.rule?.name ?? null,
          })
        })
      }

      // 2. Alertes calculées à la volée (non-soumissions)
      if (isBriefDeadlinePassed(settings)) {
        const { data: plans } = await supabase
          .from('morning_plans')
          .select('user_id')
          .eq('plan_date', today)
          .eq('status', 'submitted')

        const { data: allUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true)
          .eq('role', ROLES.COLLABORATEUR)

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
            message: buildAlertMessage('brief_missing'),
            createdAt: new Date().toISOString(),
            status: 'active',
            isResolved: false,
          })
        })
      }

      if (isJournalDeadlinePassed(settings)) {
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('user_id')
          .eq('log_date', today)
          .in('status', ['submitted', 'validated', 'rejected'])

        const { data: allUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true)
          .eq('role', ROLES.COLLABORATEUR)

        const submittedLogIds = new Set(logs?.map(l => l.user_id) || [])
        const missing = (allUsers || []).filter(u => !submittedLogIds.has(u.id))
        missing.forEach(u => {
          alerts.push({
            id: `log-missing-${u.id}`,
            source: 'realtime',
            type: ALERT_TYPES.LOG_MISSING,
            severity: CRITICALITY.CRITICAL,
            userId: u.id,
            userName: `${u.first_name} ${u.last_name}`,
            message: buildAlertMessage('log_missing'),
            createdAt: new Date().toISOString(),
            status: 'active',
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
          message: buildAlertMessage('review_pending'),
          createdAt: new Date().toISOString(),
          status: 'active',
          isResolved: false,
        })
      })

      return alerts
    },
    enabled: !!profile?.id && MANAGER_ROLES.includes(profile?.role),
    staleTime: 60000,
    refetchInterval: 120000,
  })
}

// ─── ALERTES PERSONNELLES (collaborateur) ────────────────────
/**
 * Alertes pour le collaborateur connecté.
 * ✅ Fix S89 : pulse_alerts, status enum, organization_id
 */
export function useMyAlerts() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'my-alerts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('pulse_alerts')
        .select('*, rule:pulse_alert_rules(name, alert_type)')
        .eq('user_id', profile.id)
        .in('status', ['active', 'acknowledged'])
        .order('triggered_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── RÉSOUDRE / ACQUITTER UNE ALERTE ─────────────────────────
/**
 * ✅ Fix S89 : pulse_alerts, status enum (acknowledged/resolved/dismissed),
 *              acknowledged_by + acknowledged_at au lieu de is_resolved + resolved_at
 */
export function useResolveAlert() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ alertId, newStatus = 'resolved', resolutionNote = null }) => {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({
          status: newStatus,
          acknowledged_by: profile.id,
          acknowledged_at: new Date().toISOString(),
          resolution_note: resolutionNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'team-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'my-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76'] })
    },
  })
}

// Raccourci : dismiss (ignorer volontairement)
export function useDismissAlert() {
  const resolve = useResolveAlert()
  return {
    ...resolve,
    mutate: (alertId) => resolve.mutate({ alertId, newStatus: 'dismissed' }),
    mutateAsync: (alertId) => resolve.mutateAsync({ alertId, newStatus: 'dismissed' }),
  }
}

// ─── COMPTEUR D'ALERTES (pour badge sidebar) ─────────────────
/**
 * Retourne le nombre total d'alertes non résolues.
 * ✅ Fix S89 : utilise status au lieu de is_resolved
 */
export function useAlertCount(settings) {
  const { profile } = useAuth()
  const isManager = MANAGER_ROLES.includes(profile?.role)

  const { data: teamAlerts = [] } = useTeamAlerts(isManager ? settings : null)
  const { data: myAlerts = [] } = useMyAlerts()

  if (isManager) {
    return teamAlerts.filter(a => !a.isResolved).length
  }
  return myAlerts.filter(a =>
    a.status !== 'resolved' && a.status !== 'dismissed'
  ).length
}

// ════════════════════════════════════════════════════════════════
// ─── PULSE ALERT RULES — CRUD complet ───────────────────────
// 🆕 Session 89 — Résolution WARN-2 S88 : pulse_alert_rules consommé
// ════════════════════════════════════════════════════════════════

/**
 * Lecture des règles d'alerte de l'organisation.
 */
export function usePulseAlertRules() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'alert-rules', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return []
      const { data, error } = await supabase
        .from('pulse_alert_rules')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 120000,
  })
}

/**
 * Créer une règle d'alerte.
 * Payload : { name, description?, alert_type, threshold_score?, consecutive_days?,
 *             drop_pct?, applies_to_dimension?, is_active? }
 */
export function useCreatePulseAlertRule() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('pulse_alert_rules')
        .insert({
          ...payload,
          organization_id: profile.organization_id,
          created_by: profile.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'alert-rules'] })
    },
  })
}

/**
 * Mettre à jour une règle d'alerte.
 * Payload : { id, ...champs à modifier }
 */
export function useUpdatePulseAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('pulse_alert_rules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'alert-rules'] })
    },
  })
}

/**
 * Activer / désactiver une règle d'alerte.
 */
export function useTogglePulseAlertRule() {
  const { data: rules = [] } = usePulseAlertRules()
  const update = useUpdatePulseAlertRule()

  return useMutation({
    mutationFn: async (id) => {
      const rule = rules.find(r => r.id === id)
      if (!rule) throw new Error('Règle introuvable')
      return update.mutateAsync({ id, is_active: !rule.is_active })
    },
  })
}

/**
 * Supprimer une règle d'alerte.
 */
export function useDeletePulseAlertRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('pulse_alert_rules')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'alert-rules'] })
    },
  })
}

// ─── GÉNÉRATION AUTOMATIQUE D'ALERTES ─────────────────────────
/**
 * 🆕 Session 89 — Résolution WARN-2 S88
 *
 * Évalue les règles actives de l'organisation contre les scores récents
 * et insère dans pulse_alerts les alertes déclenchées (si pas déjà en base).
 *
 * À appeler dans un useEffect périodique (ex: PulseDashboard, chaque 5 min)
 * ou via un bouton "Vérifier les alertes".
 *
 * Algorithme :
 *  - Pour chaque règle active :
 *    - 'decrochage'  : N derniers jours de score_total < threshold_score → insert
 *    - 'absence'     : N derniers jours sans morning_plan/daily_log → insert
 *    - 'stagnation'  : score_total stable entre threshold_score et threshold_score+10 sur N jours
 *    - 'pic_negatif' : chute > drop_pct% entre avant-hier et hier
 *  - Vérifie qu'aucune alerte 'active' du même user+rule+type n'existe déjà aujourd'hui
 */
export function useGeneratePulseAlerts() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error('Organization manquante')

      // 1. Charger les règles actives
      const { data: rules, error: rulesErr } = await supabase
        .from('pulse_alert_rules')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
      if (rulesErr) throw rulesErr
      if (!rules?.length) return { generated: 0 }

      // 2. Charger les collaborateurs actifs
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
      if (usersErr) throw usersErr
      if (!users?.length) return { generated: 0 }

      const userIds = users.map(u => u.id)
      const today = getTodayString()
      const maxDays = Math.max(...rules.map(r => r.consecutive_days ?? 3), 7)

      // 3. Charger les scores récents (N derniers jours)
      const since = new Date()
      since.setDate(since.getDate() - maxDays)
      const sinceStr = since.toISOString().split('T')[0]

      const { data: scores, error: scoresErr } = await supabase
        .from('performance_scores')
        .select('user_id, score_date, score_total, dimension')
        .eq('score_period', 'daily')
        .in('user_id', userIds)
        .gte('score_date', sinceStr)
        .order('score_date', { ascending: false })
      if (scoresErr) throw scoresErr

      // 4. Charger les alertes actives d'aujourd'hui (anti-doublon)
      const { data: existing } = await supabase
        .from('pulse_alerts')
        .select('user_id, rule_id, alert_type')
        .eq('organization_id', profile.organization_id)
        .gte('triggered_at', `${today}T00:00:00.000Z`)
        .in('status', ['active', 'acknowledged'])

      const existingKey = new Set(
        (existing || []).map(a => `${a.user_id}:${a.rule_id}:${a.alert_type}`)
      )

      // 5. Grouper les scores par user
      const scoresByUser = {}
      for (const s of scores || []) {
        if (!scoresByUser[s.user_id]) scoresByUser[s.user_id] = []
        scoresByUser[s.user_id].push(s)
      }

      // 6. Évaluer chaque règle pour chaque user
      const toInsert = []

      for (const rule of rules) {
        const n = rule.consecutive_days ?? 3
        const threshold = rule.threshold_score ?? 40
        const dropPct = rule.drop_pct ?? 15

        for (const userId of userIds) {
          const key = `${userId}:${rule.id}:${rule.alert_type}`
          if (existingKey.has(key)) continue

          const userScores = (scoresByUser[userId] || [])
            .filter(s =>
              rule.applies_to_dimension === 'global'
                ? true
                : s.dimension === rule.applies_to_dimension
            )
            .sort((a, b) => b.score_date.localeCompare(a.score_date))
            .slice(0, n)

          if (!userScores.length) continue

          let triggered = false
          let contextJson = {}

          if (rule.alert_type === 'decrochage') {
            // N derniers jours sous threshold
            if (userScores.length >= n) {
              const allLow = userScores.every(s => s.score_total < threshold)
              if (allLow) {
                const avg = Math.round(
                  userScores.reduce((sum, s) => sum + s.score_total, 0) / userScores.length
                )
                triggered = true
                contextJson = { avg_score: avg, days: n, threshold, dimension: rule.applies_to_dimension }
              }
            }
          } else if (rule.alert_type === 'stagnation') {
            if (userScores.length >= n) {
              const avg = userScores.reduce((sum, s) => sum + s.score_total, 0) / userScores.length
              const allNearAvg = userScores.every(s =>
                Math.abs(s.score_total - avg) < 5
              )
              if (allNearAvg && avg < threshold + 10 && avg >= threshold - 10) {
                triggered = true
                contextJson = { avg_score: Math.round(avg), days: n, dimension: rule.applies_to_dimension }
              }
            }
          } else if (rule.alert_type === 'pic_negatif') {
            if (userScores.length >= 2) {
              const latest = userScores[0].score_total
              const prev = userScores[1].score_total
              if (prev > 0) {
                const drop = ((prev - latest) / prev) * 100
                if (drop >= dropPct) {
                  triggered = true
                  contextJson = {
                    drop_pct: Math.round(drop),
                    prev_score: prev,
                    curr_score: latest,
                    dimension: rule.applies_to_dimension,
                  }
                }
              }
            }
          }
          // 'absence' → évalué par les alertes realtime dans useTeamAlerts

          if (triggered) {
            toInsert.push({
              organization_id: profile.organization_id,
              rule_id: rule.id,
              user_id: userId,
              alert_type: rule.alert_type,
              status: 'active',
              severity: contextJson.avg_score < 30 ? CRITICALITY.CRITICAL : 'warning',
              triggered_at: new Date().toISOString(),
              context_json: contextJson,
            })
          }
        }
      }

      // 7. Insérer en batch
      if (toInsert.length) {
        const { error: insertErr } = await supabase
          .from('pulse_alerts')
          .insert(toInsert)
        if (insertErr) throw insertErr
      }

      return { generated: toInsert.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'team-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76'] })
    },
  })
}