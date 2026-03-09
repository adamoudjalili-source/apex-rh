// ============================================================
// APEX RH — useTaskAnalytics.js  ·  S131
// Analytics comportementales sur task_activity_log
// Métriques : délai moyen, taux validation, top bloqués,
//             personnes surchargées, évolution mensuelle
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

/**
 * useTaskActivityAnalytics
 * Données brutes du journal d'activité + calculs client-side.
 * Filtrable par serviceId et période (30j par défaut).
 */
export function useTaskActivityAnalytics({ serviceId = null, days = 30 } = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['task_activity_analytics', profile?.organization_id, serviceId, days],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)

      // 1. Journal d'activité sur la période
      let logQ = supabase
        .from('task_activity_log')
        .select(`
          id, task_id, action, old_value, new_value, created_at,
          user:users!task_activity_log_user_id_fkey(id, first_name, last_name),
          task:tasks!task_activity_log_task_id_fkey(id, title, priority, service_id,
            task_assignees(user_id))
        `)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      if (serviceId) logQ = logQ.eq('task.service_id', serviceId)

      const { data: logs, error: logErr } = await logQ
      if (logErr) throw logErr
      const allLogs = logs || []

      // 2. Tâches terminées sur la période (pour délai moyen)
      let taskQ = supabase
        .from('tasks')
        .select('id, title, priority, created_at, service_id')
        .eq('status', 'terminee')
        .gte('updated_at', since.toISOString())
        .eq('is_archived', false)

      const { data: completedTasks } = await taskQ
      const completed = completedTasks || []

      // ─── Calculs ───────────────────────────────────────────

      // A. Délai moyen de complétion (création → terminée)
      const completionDelays = []
      for (const task of completed) {
        const termLog = allLogs.find(l =>
          l.task_id === task.id && l.action === 'status_changed' && l.new_value === 'terminee'
        )
        if (termLog) {
          const hours = (new Date(termLog.created_at) - new Date(task.created_at)) / (1000 * 60 * 60)
          completionDelays.push({ taskId: task.id, title: task.title, priority: task.priority, hours })
        }
      }
      const avgCompletionHours = completionDelays.length > 0
        ? Math.round(completionDelays.reduce((s, d) => s + d.hours, 0) / completionDelays.length)
        : null

      // B. Délai moyen de validation (en_revue → terminee)
      const validationDelays = []
      const reviewLogs = allLogs.filter(l =>
        l.action === 'status_changed' && l.new_value === 'en_revue'
      )
      for (const rev of reviewLogs) {
        const termLog = allLogs.find(l =>
          l.task_id === rev.task_id && l.action === 'status_changed' &&
          l.new_value === 'terminee' && l.created_at > rev.created_at
        )
        if (termLog) {
          const hours = (new Date(termLog.created_at) - new Date(rev.created_at)) / (1000 * 60 * 60)
          validationDelays.push(hours)
        }
      }
      const avgValidationHours = validationDelays.length > 0
        ? Math.round(validationDelays.reduce((s, h) => s + h, 0) / validationDelays.length)
        : null

      // C. Tâches les plus souvent bloquées/refusées
      const blockCount = {}
      for (const log of allLogs) {
        if (log.action === 'status_changed' && ['bloquee','en_cours'].includes(log.new_value)
            && log.old_value === 'en_revue') {
          // refusée
          if (!blockCount[log.task_id]) blockCount[log.task_id] = { task: log.task, count: 0, type: 'refus' }
          blockCount[log.task_id].count++
        }
        if (log.action === 'status_changed' && log.new_value === 'bloquee') {
          if (!blockCount[log.task_id]) blockCount[log.task_id] = { task: log.task, count: 0, type: 'blocage' }
          blockCount[log.task_id].count++
        }
      }
      const topBlocked = Object.values(blockCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // D. Utilisateurs avec le plus d'activité (potentiellement surchargés)
      const userActivity = {}
      for (const log of allLogs) {
        if (!log.user) continue
        const uid = log.user.id
        if (!userActivity[uid]) userActivity[uid] = { user: log.user, actions: 0, completions: 0, blocks: 0 }
        userActivity[uid].actions++
        if (log.action === 'status_changed' && log.new_value === 'terminee') userActivity[uid].completions++
        if (log.action === 'status_changed' && log.new_value === 'bloquee')  userActivity[uid].blocks++
      }
      const userActivityList = Object.values(userActivity)
        .sort((a, b) => b.actions - a.actions)
        .slice(0, 10)

      // E. Évolution mensuelle des completions (7 derniers jours groupés)
      const dailyCompletions = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        dailyCompletions[key] = 0
      }
      for (const log of allLogs) {
        if (log.action === 'status_changed' && log.new_value === 'terminee') {
          const day = log.created_at.split('T')[0]
          if (dailyCompletions[day] !== undefined) dailyCompletions[day]++
        }
      }
      const dailySeries = Object.entries(dailyCompletions).map(([date, count]) => ({
        date, count,
        label: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      }))

      // F. Taux de respect des délais
      const tasksWithDueDate = allLogs
        .filter(l => l.action === 'status_changed' && l.new_value === 'terminee' && l.task?.due_date)
      const onTime = tasksWithDueDate.filter(l => l.created_at <= l.task.due_date + 'T23:59:59').length
      const onTimeRate = tasksWithDueDate.length > 0
        ? Math.round((onTime / tasksWithDueDate.length) * 100)
        : null

      return {
        period:             days,
        totalLogs:          allLogs.length,
        completedCount:     completed.length,
        avgCompletionHours,
        avgValidationHours,
        topBlocked,
        userActivityList,
        dailySeries,
        onTimeRate,
        completionDelays:   completionDelays.slice(0, 10),
      }
    },
    enabled:   !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  })
}
