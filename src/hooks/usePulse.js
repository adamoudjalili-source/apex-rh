// ============================================================
// APEX RH — usePulse.js
// ✅ Session 21 — Hook principal PULSE : morning_plans + daily_logs
// 🐛 Session 23 — Fix : created_by ajouté au select de useMyActiveTasks
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getTodayString } from '../lib/pulseHelpers'

// ─── TÂCHES ACTIVES DE L'UTILISATEUR (pour le brief) ─────────
/**
 * Tâches assignées ou créées par l'utilisateur, non archivées, non terminées
 */
export function useMyActiveTasks() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'active-tasks', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      // Tâches assignées à l'utilisateur (avec created_by pour le filtre)
      const { data: assignedTasks, error: e1 } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date, created_by,
          services(id, name)
        `)
        .eq('is_archived', false)
        .not('status', 'in', '(terminee)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (e1) throw e1

      // Filtrer côté client : tâches créées par moi OU assignées à moi
      const { data: myAssignments } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', profile.id)

      const assignedIds = new Set(myAssignments?.map(a => a.task_id) || [])

      return (assignedTasks || []).filter(t =>
        t.created_by === profile.id || assignedIds.has(t.id)
      )
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── MORNING PLAN DU JOUR ────────────────────────────────────
export function useTodayMorningPlan() {
  const { profile } = useAuth()
  const today = getTodayString()

  return useQuery({
    queryKey: ['pulse', 'morning-plan', profile?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('morning_plans')
        .select('*')
        .eq('user_id', profile.id)
        .eq('plan_date', today)
        .maybeSingle()
      if (error) throw error
      return data  // null si pas encore créé
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })
}

// ─── DAILY LOG DU JOUR ───────────────────────────────────────
export function useTodayLog() {
  const { profile } = useAuth()
  const today = getTodayString()

  return useQuery({
    queryKey: ['pulse', 'daily-log', profile?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          daily_log_entries(
            *,
            task:tasks(id, title, status, due_date, priority)
          ),
          manager_reviews(*)
        `)
        .eq('user_id', profile.id)
        .eq('log_date', today)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })
}

// ─── LOG PAR ID ──────────────────────────────────────────────
export function useLog(logId) {
  return useQuery({
    queryKey: ['pulse', 'log', logId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          daily_log_entries(
            *,
            task:tasks(id, title, status, due_date, priority)
          ),
          manager_reviews(*),
          user:users!daily_logs_user_id_fkey(id, first_name, last_name)
        `)
        .eq('id', logId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!logId,
    staleTime: 30000,
  })
}

// ─── MUTATIONS MORNING PLAN ───────────────────────────────────
/**
 * Sauvegarder un brouillon de brief matinal (upsert)
 */
export function useSaveMorningPlan() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async ({ plannedTaskIds, availableHours, note }) => {
      const { data, error } = await supabase
        .from('morning_plans')
        .upsert({
          user_id: profile.id,
          plan_date: today,
          planned_task_ids: plannedTaskIds || [],
          available_hours: availableHours ?? 8.0,
          note: note || null,
          status: 'draft',
        }, { onConflict: 'user_id,plan_date' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'morning-plan', profile.id, today] })
    },
  })
}

/**
 * Soumettre le brief matinal (passe en 'submitted')
 */
export function useSubmitMorningPlan() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async ({ plannedTaskIds, availableHours, note }) => {
      const { data, error } = await supabase
        .from('morning_plans')
        .upsert({
          user_id: profile.id,
          plan_date: today,
          planned_task_ids: plannedTaskIds || [],
          available_hours: availableHours ?? 8.0,
          note: note || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'user_id,plan_date' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'morning-plan', profile.id, today] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'today-status', profile.id] })
    },
  })
}

// ─── MUTATIONS DAILY LOG ─────────────────────────────────────
/**
 * Créer ou récupérer le daily_log du jour en brouillon
 */
export function useEnsureTodayLog() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async () => {
      // Essayer d'abord de le trouver
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('log_date', today)
        .maybeSingle()

      if (existing) return existing

      // Sinon créer en draft
      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          user_id: profile.id,
          log_date: today,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'daily-log', profile.id, today] })
    },
  })
}

/**
 * Mettre à jour les champs globaux du log (overall_note, satisfaction_level)
 */
export function useUpdateLog() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async ({ logId, updates }) => {
      const { data, error } = await supabase
        .from('daily_logs')
        .update(updates)
        .eq('id', logId)
        .eq('user_id', profile.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'daily-log', profile.id, today] })
    },
  })
}

/**
 * Soumettre le journal du soir
 */
export function useSubmitLog() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async ({ logId, deadlineMissed = false, overallNote, satisfactionLevel }) => {
      const { data, error } = await supabase
        .from('daily_logs')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          deadline_missed: deadlineMissed,
          overall_note: overallNote || null,
          satisfaction_level: satisfactionLevel || null,
        })
        .eq('id', logId)
        .eq('user_id', profile.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'daily-log', profile.id, today] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'today-status', profile.id] })
    },
  })
}

// ─── MUTATIONS LOG ENTRIES ────────────────────────────────────
/**
 * Ajouter une entrée dans le log
 */
export function useAddLogEntry() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async ({ logId, taskId, progressBefore = 0 }) => {
      const { data, error } = await supabase
        .from('daily_log_entries')
        .insert({
          log_id: logId,
          task_id: taskId,
          progress_before: progressBefore,
          progress_after: progressBefore,
          time_spent_min: 0,
          task_status: 'en_cours',
        })
        .select(`
          *,
          task:tasks(id, title, status, due_date, priority)
        `)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'daily-log', profile.id, today] })
    },
  })
}

/**
 * Mettre à jour une entrée du log
 */
export function useUpdateLogEntry() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async ({ entryId, updates }) => {
      const { data, error } = await supabase
        .from('daily_log_entries')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'daily-log', profile.id, today] })
    },
  })
}

/**
 * Supprimer une entrée du log
 */
export function useDeleteLogEntry() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async (entryId) => {
      const { error } = await supabase
        .from('daily_log_entries')
        .delete()
        .eq('id', entryId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'daily-log', profile.id, today] })
    },
  })
}

// ─── SCORE DU JOUR ───────────────────────────────────────────
/**
 * Lance le calcul du score via RPC et récupère le résultat
 */
export function useCalculateDailyScore() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const today = getTodayString()

  return useMutation({
    mutationFn: async (date = today) => {
      const { data, error } = await supabase.rpc('calculate_daily_score', {
        p_user_id: profile.id,
        p_date: date,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'score', profile.id] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'today-status', profile.id] })
    },
  })
}

/**
 * Récupère le score du jour (performance_scores)
 */
export function useTodayScore() {
  const { profile } = useAuth()
  const today = getTodayString()

  return useQuery({
    queryKey: ['pulse', 'score', profile?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_scores')
        .select('*')
        .eq('user_id', profile.id)
        .eq('score_date', today)
        .eq('score_period', 'daily')
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ============================================================
// S76 — Performance PULSE : Alertes proactives + Calibration
// ============================================================

// ─── ALERTES ─────────────────────────────────────────────────

/** Mes alertes actives (vue collaborateur) */
export function usePulseAlerts() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 's76', 'alerts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('pulse_alerts')
        .select('*, rule:pulse_alert_rules(name, alert_type)')
        .eq('user_id', profile.id)
        .order('triggered_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

/** Alertes actives de l'équipe (manager/rh/admin) */
export function useTeamPulseAlerts() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 's76', 'team-alerts', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return []
      const { data, error } = await supabase
        .from('pulse_alerts')
        .select(`
          *,
          rule:pulse_alert_rules(name, alert_type),
          user:users(id, full_name, role, manager_id)
        `)
        .eq('organization_id', profile.organization_id)
        .in('status', ['active', 'acknowledged'])
        .order('triggered_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 30000,
  })
}

/** Règles d'alerte de l'organisation */
export function usePulseAlertRules() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 's76', 'alert-rules', profile?.organization_id],
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
  })
}

/** Créer une règle d'alerte */
export function useCreateAlertRule() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('pulse_alert_rules')
        .insert({ ...payload, organization_id: profile.organization_id, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76', 'alert-rules'] })
    },
  })
}

/** Mettre à jour une règle d'alerte */
export function useUpdateAlertRule() {
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
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76', 'alert-rules'] })
    },
  })
}

/** Supprimer une règle d'alerte */
export function useDeleteAlertRule() {
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
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76', 'alert-rules'] })
    },
  })
}

/** Acquitter (acknowledge) une alerte */
export function useAcknowledgeAlert() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status = 'acknowledged', resolution_note = null }) => {
      const { data, error } = await supabase
        .from('pulse_alerts')
        .update({
          status,
          acknowledged_by: profile.id,
          acknowledged_at: new Date().toISOString(),
          resolution_note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76'] })
    },
  })
}

// ─── CALIBRATION ─────────────────────────────────────────────

/** Config calibration de l'organisation */
export function usePulseCalibration() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 's76', 'calibration', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return []
      const { data, error } = await supabase
        .from('pulse_calibration')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('dimension')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
  })
}

/** Mettre à jour la calibration */
export function useUpdateCalibration() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dimension, ...payload }) => {
      const { data, error } = await supabase
        .from('pulse_calibration')
        .upsert({
          organization_id: profile.organization_id,
          dimension,
          ...payload,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id,dimension' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 's76', 'calibration'] })
    },
  })
}

// ─── TENDANCES (MV mv_pulse_trends) ──────────────────────────

/** Tendances d'un utilisateur (7j / 30j) */
export function usePulseTrends(userId = null) {
  const { profile } = useAuth()
  const targetId = userId || profile?.id

  return useQuery({
    queryKey: ['pulse', 's76', 'trends', targetId],
    queryFn: async () => {
      if (!targetId) return null
      const { data, error } = await supabase
        .rpc('get_pulse_trends_for_user', { p_user_id: targetId })
        .maybeSingle()
      // Fallback: requête directe sur performance_scores si la RPC n'existe pas
      if (error) {
        const { data: scores } = await supabase
          .from('performance_scores')
          .select('score_date, total_score')
          .eq('user_id', targetId)
          .eq('score_period', 'daily')
          .gte('score_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
          .order('score_date', { ascending: true })
        return scores || []
      }
      return data
    },
    enabled: !!targetId,
    staleTime: 300000,
  })
}

/** Tendances de toute l'équipe (pour la heatmap) */
export function useTeamPulseTrends() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 's76', 'team-trends', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return []
      // On charge les scores des 30 derniers jours pour toute l'org
      const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('performance_scores')
        .select(`
          user_id, score_date, total_score,
          user:users!inner(id, full_name, organization_id, manager_id)
        `)
        .eq('user.organization_id', profile.organization_id)
        .eq('score_period', 'daily')
        .gte('score_date', since)
        .order('score_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 300000,
  })
}

/** Rafraîchir les MVs PULSE S76 */
export function useRefreshPulseTrendsMV() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_pulse_trends_mv')
      if (error) throw error
    },
  })
}
