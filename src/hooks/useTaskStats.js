// ============================================================
// APEX RH — useTaskStats.js  ·  S125-B
// Hook tableau de bord Manager : KPIs + score productivité
// Formule : terminées / (assignées - annulées) × 100
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * useTaskDashboard
 * Retourne :
 *  - summary   : { total, en_cours, en_retard, terminee, annule }
 *  - leaderboard : [{ user, assigned, done, late, score }] trié par score desc
 *  - overdue   : tâches en retard (max 10, avec assignees)
 *  - byStatus  : { [status]: count } pour donut
 */
export function useTaskDashboard({ serviceId = null } = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['task_dashboard', profile?.organization_id, serviceId],
    queryFn: async () => {
      // 1. Récupération de toutes les tâches actives
      let q = supabase
        .from('tasks')
        .select(`
          id, status, priority, due_date, title,
          task_assignees(
            user_id,
            users!task_assignees_user_id_fkey(id, first_name, last_name)
          )
        `)
        .eq('is_archived', false)

      if (serviceId) q = q.eq('service_id', serviceId)

      const { data: tasks, error } = await q
      if (error) throw error
      const list = tasks || []

      const now = new Date()

      // 2. Calcul summary global
      const summary = {
        total:     list.length,
        en_cours:  list.filter(t => t.status === 'en_cours').length,
        en_retard: list.filter(t =>
          t.due_date && new Date(t.due_date) < now &&
          !['terminee', 'annule'].includes(t.status)
        ).length,
        terminee:  list.filter(t => t.status === 'terminee').length,
        annule:    list.filter(t => t.status === 'annule').length,
      }

      // 3. Répartition par statut (donut)
      const byStatus = list.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {})

      // 4. Leaderboard productivité par utilisateur
      const userMap = {}
      for (const task of list) {
        for (const a of (task.task_assignees || [])) {
          const u = a.users
          if (!u) continue
          if (!userMap[u.id]) {
            userMap[u.id] = {
              user:     u,
              assigned: 0,
              done:     0,
              late:     0,
            }
          }
          const entry = userMap[u.id]
          if (task.status !== 'annule') entry.assigned++
          if (task.status === 'terminee') entry.done++
          if (
            task.due_date && new Date(task.due_date) < now &&
            !['terminee', 'annule'].includes(task.status)
          ) entry.late++
        }
      }

      const leaderboard = Object.values(userMap)
        .map(e => ({
          ...e,
          score: e.assigned === 0
            ? 0
            : Math.max(0, Math.round((e.done / e.assigned) * 100) - e.late * 2),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)

      // 5. Top 10 tâches en retard
      const overdue = list
        .filter(t =>
          t.due_date && new Date(t.due_date) < now &&
          !['terminee', 'annule'].includes(t.status)
        )
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 10)

      return { summary, leaderboard, overdue, byStatus }
    },
    enabled:   !!profile?.organization_id,
    staleTime: 2 * 60 * 1000,
  })
}
