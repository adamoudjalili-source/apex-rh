// ============================================================
// APEX RH — useDashboard.js
// ✅ Session 12 — Hook dashboard dynamique (5 profils)
// ✅ Session 19 — Fix alignement stats dashboard sur logique modules
//    useTaskStats : ajout filtrage côté client (même logique que useTasks.js)
//    useProjectStats : ajout projets par membership (même logique que RLS)
//    useTeamStats : fix champ active redondant
// ✅ Session 19 bis — Fix useRecentActivity : même filtrage que les modules
// Requêtes adaptées au rôle : admin = tout, autres = périmètre
// ✅ Session 24 — Ajout usePulseSnapshot() (Phase F)
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── HELPER : filtre hiérarchique selon le rôle ─────────────
function applyScope(query, profile, table = '') {
  const prefix = table ? `${table}.` : ''
  const role = profile?.role

  if (role === 'administrateur') return query // Tout voir
  if (role === 'directeur' && profile.direction_id) {
    return query.eq(`${prefix}direction_id`, profile.direction_id)
  }
  if (role === 'chef_division' && profile.division_id) {
    return query.eq(`${prefix}division_id`, profile.division_id)
  }
  if (role === 'chef_service' && profile.service_id) {
    return query.eq(`${prefix}service_id`, profile.service_id)
  }
  // collaborateur → seulement ses données (géré par RLS)
  return query
}

// ─── STATISTIQUES TÂCHES ─────────────────────────────────────
// ✅ Session 19 — Aligné sur la logique de filtrage de useTasks.js
export function useTaskStats() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['dashboard', 'task-stats', profile?.id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('id, status, priority, due_date, created_at, created_by, service_id, division_id, direction_id, task_assignees(user_id)')
        .eq('is_archived', false)

      query = applyScope(query, profile)
      const { data, error } = await query
      if (error) throw error

      let tasks = data || []

      // ── Filtrage côté client aligné sur useTasks.js ──
      if (profile && profile.role !== 'administrateur') {
        const userId = profile.id

        let myProjectTaskIds = new Set()
        try {
          const { data: myProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', userId)

          if (myProjects && myProjects.length > 0) {
            const projectIds = myProjects.map(p => p.project_id)
            const { data: linkedTasks } = await supabase
              .from('project_tasks')
              .select('task_id')
              .in('project_id', projectIds)

            if (linkedTasks) {
              myProjectTaskIds = new Set(linkedTasks.map(lt => lt.task_id))
            }
          }
        } catch (e) {
          console.error('Erreur récupération tâches projets (dashboard):', e)
        }

        tasks = tasks.filter(task => {
          const isCreator = task.created_by === userId
          const isAssignee = task.task_assignees?.some(a => a.user_id === userId)
          const isMine = isCreator || isAssignee

          if (isMine) return true
          if (myProjectTaskIds.has(task.id)) return true

          if (task.status === 'en_revue') {
            if (profile.role === 'chef_service' && task.service_id === profile.service_id) return true
            if (profile.role === 'chef_division' && task.division_id === profile.division_id) return true
            if (profile.role === 'directeur' && task.direction_id === profile.direction_id) return true
          }

          return false
        })
      }

      // ── Calcul des stats ──
      const today = new Date().toISOString().split('T')[0]

      const byStatus = {}
      const byPriority = {}
      let overdue = 0
      let dueToday = 0
      let createdThisWeek = 0

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      tasks.forEach(t => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1

        if (t.due_date) {
          if (t.due_date < today && t.status !== 'terminee') overdue++
          if (t.due_date === today) dueToday++
        }
        if (t.created_at && new Date(t.created_at) >= weekAgo) createdThisWeek++
      })

      const total = tasks.length
      const completed = byStatus['terminee'] || 0
      const inProgress = byStatus['en_cours'] || 0
      const active = total - completed - (byStatus['bloquee'] || 0)

      return {
        total,
        active,
        completed,
        inProgress,
        overdue,
        dueToday,
        createdThisWeek,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        byStatus,
        byPriority,
      }
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── STATISTIQUES OKR ────────────────────────────────────────
export function useOkrStats() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['dashboard', 'okr-stats', profile?.id, profile?.role],
    queryFn: async () => {
      const { data: activePeriod } = await supabase
        .from('okr_periods')
        .select('id, name')
        .eq('is_active', true)
        .maybeSingle()

      if (!activePeriod) {
        return {
          periodName: null,
          total: 0,
          byLevel: {},
          byStatus: {},
          avgScore: 0,
          objectives: [],
        }
      }

      let query = supabase
        .from('objectives')
        .select('id, title, level, status, progress_score, evaluation_status, final_score, owner_id, direction_id, division_id, service_id')
        .eq('period_id', activePeriod.id)

      query = applyScope(query, profile)
      const { data, error } = await query
      if (error) throw error

      const objectives = data || []
      const byLevel = {}
      const byStatus = {}
      let totalScore = 0
      let scoredCount = 0

      objectives.forEach(obj => {
        byLevel[obj.level] = (byLevel[obj.level] || 0) + 1
        byStatus[obj.status] = (byStatus[obj.status] || 0) + 1
        if (obj.progress_score > 0) {
          totalScore += obj.progress_score
          scoredCount++
        }
      })

      const avgScore = scoredCount > 0 ? totalScore / scoredCount : 0

      return {
        periodName: activePeriod.name,
        total: objectives.length,
        byLevel,
        byStatus,
        avgScore: Math.round(avgScore * 100) / 100,
        objectives,
      }
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── STATISTIQUES PROJETS ────────────────────────────────────
// ✅ Session 19 — Aligné sur la logique de filtrage du module Projets
export function useProjectStats() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['dashboard', 'project-stats', profile?.id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name, status, priority, progress, budget, budget_spent, start_date, end_date, direction_id, division_id, service_id')
        .eq('is_archived', false)

      query = applyScope(query, profile)
      const { data, error } = await query
      if (error) throw error

      let projects = data || []

      // ── Ajouter les projets par membership (aligné sur RLS) ──
      if (profile && profile.role !== 'administrateur') {
        try {
          const { data: memberProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', profile.id)

          if (memberProjects && memberProjects.length > 0) {
            const memberProjectIds = new Set(memberProjects.map(p => p.project_id))
            const existingIds = new Set(projects.map(p => p.id))
            const missingIds = [...memberProjectIds].filter(id => !existingIds.has(id))

            if (missingIds.length > 0) {
              const { data: extraProjects } = await supabase
                .from('projects')
                .select('id, name, status, priority, progress, budget, budget_spent, start_date, end_date')
                .in('id', missingIds)
                .eq('is_archived', false)

              if (extraProjects) {
                projects = [...projects, ...extraProjects]
              }
            }
          }
        } catch (e) {
          console.error('Erreur récupération projets membership (dashboard):', e)
        }
      }

      // ── Calcul des stats ──
      const byStatus = {}
      let totalBudget = 0
      let totalSpent = 0
      let totalProgress = 0

      projects.forEach(p => {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1
        totalBudget += p.budget || 0
        totalSpent += p.budget_spent || 0
        totalProgress += p.progress || 0
      })

      const activeCount = (byStatus['en_cours'] || 0) + (byStatus['planifie'] || 0)
      const avgProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0

      return {
        total: projects.length,
        active: activeCount,
        completed: byStatus['termine'] || 0,
        byStatus,
        avgProgress,
        totalBudget,
        totalSpent,
        budgetUsage: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      }
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── ACTIVITÉ RÉCENTE ────────────────────────────────────────
// ✅ Session 19 bis — Alignement filtrage sur logique des modules
export function useRecentActivity() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['dashboard', 'recent-activity', profile?.id, profile?.role],
    queryFn: async () => {
      // ── Tâches récentes ──
      let taskQuery = supabase
        .from('tasks')
        .select('id, title, status, priority, updated_at, created_by, service_id, division_id, direction_id, task_assignees(user_id)')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(20) // On récupère plus pour filtrer ensuite

      taskQuery = applyScope(taskQuery, profile)
      const { data: rawTasks } = await taskQuery

      let recentTasks = rawTasks || []

      // Filtrage côté client (même logique que useTaskStats)
      if (profile && profile.role !== 'administrateur') {
        const userId = profile.id

        let myProjectTaskIds = new Set()
        try {
          const { data: myProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', userId)

          if (myProjects && myProjects.length > 0) {
            const projectIds = myProjects.map(p => p.project_id)
            const { data: linkedTasks } = await supabase
              .from('project_tasks')
              .select('task_id')
              .in('project_id', projectIds)

            if (linkedTasks) {
              myProjectTaskIds = new Set(linkedTasks.map(lt => lt.task_id))
            }
          }
        } catch (e) {
          console.error('Erreur récupération tâches projets (recent activity):', e)
        }

        recentTasks = recentTasks.filter(task => {
          const isCreator = task.created_by === userId
          const isAssignee = task.task_assignees?.some(a => a.user_id === userId)
          if (isCreator || isAssignee) return true
          if (myProjectTaskIds.has(task.id)) return true
          if (task.status === 'en_revue') {
            if (profile.role === 'chef_service' && task.service_id === profile.service_id) return true
            if (profile.role === 'chef_division' && task.division_id === profile.division_id) return true
            if (profile.role === 'directeur' && task.direction_id === profile.direction_id) return true
          }
          return false
        })
      }

      // Garder seulement les 5 plus récentes après filtrage, nettoyer les champs internes
      recentTasks = recentTasks.slice(0, 5).map(({ task_assignees, created_by, service_id, division_id, direction_id, ...rest }) => rest)

      // ── Objectifs récents ──
      let objQuery = supabase
        .from('objectives')
        .select('id, title, level, status, progress_score, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5)

      objQuery = applyScope(objQuery, profile)
      const { data: recentObjectives } = await objQuery

      // ── Projets récents (avec membership) ──
      let projQuery = supabase
        .from('projects')
        .select('id, name, status, progress, updated_at, direction_id, division_id, service_id')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(10)

      projQuery = applyScope(projQuery, profile)
      const { data: rawProjects } = await projQuery

      let recentProjects = rawProjects || []

      // Ajouter les projets par membership (même logique que useProjectStats)
      if (profile && profile.role !== 'administrateur') {
        try {
          const { data: memberProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', profile.id)

          if (memberProjects && memberProjects.length > 0) {
            const memberProjectIds = new Set(memberProjects.map(p => p.project_id))
            const existingIds = new Set(recentProjects.map(p => p.id))
            const missingIds = [...memberProjectIds].filter(id => !existingIds.has(id))

            if (missingIds.length > 0) {
              const { data: extraProjects } = await supabase
                .from('projects')
                .select('id, name, status, progress, updated_at')
                .in('id', missingIds)
                .eq('is_archived', false)
                .order('updated_at', { ascending: false })
                .limit(5)

              if (extraProjects) {
                recentProjects = [...recentProjects, ...extraProjects]
              }
            }
          }
        } catch (e) {
          console.error('Erreur récupération projets membership (recent activity):', e)
        }
      }

      // Trier par updated_at et garder les 5 plus récents
      recentProjects = recentProjects
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5)
        .map(({ direction_id, division_id, service_id, ...rest }) => rest)

      return {
        tasks: recentTasks,
        objectives: recentObjectives || [],
        projects: recentProjects,
      }
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── STATISTIQUES ÉQUIPE (managers uniquement) ───────────────
// ✅ Session 19 — Fix : supprimé le filtre .eq('is_active', true) pour que
//    le champ `active` devienne utile (avant : active === total systématiquement)
export function useTeamStats() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['dashboard', 'team-stats', profile?.id, profile?.role],
    queryFn: async () => {
      const role = profile?.role
      if (role === 'collaborateur') return { total: 0, active: 0, byRole: {} }

      // Session 19 : on récupère TOUS les utilisateurs (actifs + inactifs)
      // pour que total et active soient des métriques distinctes
      let query = supabase
        .from('users')
        .select('id, role, is_active')

      if (role === 'directeur' && profile.direction_id) {
        query = query.eq('direction_id', profile.direction_id)
      } else if (role === 'chef_division' && profile.division_id) {
        query = query.eq('division_id', profile.division_id)
      } else if (role === 'chef_service' && profile.service_id) {
        query = query.eq('service_id', profile.service_id)
      }
      // admin voit tout

      const { data, error } = await query
      if (error) throw error

      const users = data || []
      const byRole = {}
      users.forEach(u => {
        byRole[u.role] = (byRole[u.role] || 0) + 1
      })

      return {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        byRole,
      }
    },
    enabled: !!profile?.id && profile?.role !== 'collaborateur',
    staleTime: 120000,
  })
}
// ─── PULSE SNAPSHOT (Session 24 — Phase F) ───────────────────
// Note : ce hook n'est pas utilisé directement dans Dashboard.jsx
// car PulseSnapshot.jsx gère ses propres données via usePulse.js.
// Ce hook est fourni pour usage éventuel dans d'autres composants.
// ✅ Session 24 — usePulseSnapshot()
import { useTodayMorningPlan, useTodayLog, useTodayScore } from './usePulse'

/**
 * Expose un snapshot rapide PULSE pour le Dashboard.
 * Retourne { morningPlan, dailyLog, todayScore, isLoading }
 * Guard externe requis : utiliser isPulseEnabled(settings) avant de monter ce hook.
 */
export function usePulseSnapshot() {
  const { data: morningPlan, isLoading: l1 } = useTodayMorningPlan()
  const { data: dailyLog,    isLoading: l2 } = useTodayLog()
  const { data: todayScore,  isLoading: l3 } = useTodayScore()

  return {
    morningPlan,
    dailyLog,
    todayScore,
    isLoading: l1 || l2 || l3,
  }
}
