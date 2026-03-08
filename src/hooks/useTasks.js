// APEX RH — useTasks.js
// Session 18 — Ajout task_key_results + project_tasks dans useTask()
// Session 16 fix — tâches liées aux projets de l'utilisateur visibles dans le module Tâches
// Session 19 bis — Fix useUpdateTaskStatus : invalide aussi ['task', taskId]
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAudit } from '../lib/auditLog'

const TASK_SELECT = `
  *,
  creator:users!tasks_created_by_fkey(id, first_name, last_name),
  task_assignees(
    id, user_id, assigned_at,
    users!task_assignees_user_id_fkey(id, first_name, last_name)
  ),
  task_checklists(
    id, title, position,
    task_checklist_items(id, content, is_done, done_by, done_at, position)
  ),
  task_comments(id),
  task_attachments(id),
  services(id, name),
  divisions(id, name),
  directions(id, name)
`

// ─── FETCH ALL TASKS ───────────────────────────────────────
export function useTasks(filters = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['tasks', filters, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('is_archived', false)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (filters.status)      query = query.eq('status', filters.status)
      if (filters.priority)    query = query.eq('priority', filters.priority)
      if (filters.service_id)  query = query.eq('service_id', filters.service_id)
      if (filters.division_id) query = query.eq('division_id', filters.division_id)
      if (filters.search)      query = query.ilike('title', `%${filters.search}%`)

      if (filters.due_date_from) query = query.gte('due_date', filters.due_date_from)
      if (filters.due_date_to)   query = query.lte('due_date', filters.due_date_to)

      if (filters.parent_task_id !== undefined) {
        if (filters.parent_task_id === null) {
          query = query.is('parent_task_id', null)
        } else {
          query = query.eq('parent_task_id', filters.parent_task_id)
        }
      }

      const { data, error } = await query
      if (error) throw error

      let result = data || []

      if (filters.assignee_id) {
        result = result.filter(task =>
          task.task_assignees?.some(a => a.user_id === filters.assignee_id)
        )
      }

      // Filtrage par rôle : chaque utilisateur voit ses tâches + celles à valider + celles de ses projets
      if (profile && profile.role !== 'administrateur') {
        const userId = profile.id

        // Récupérer les IDs de tâches liées aux projets où l'utilisateur est membre
        let myProjectTaskIds = new Set()
        try {
          // 1. Trouver les projets de l'utilisateur
          const { data: myProjects } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', userId)

          if (myProjects && myProjects.length > 0) {
            const projectIds = myProjects.map(p => p.project_id)
            // 2. Trouver les tâches liées à ces projets
            const { data: linkedTasks } = await supabase
              .from('project_tasks')
              .select('task_id')
              .in('project_id', projectIds)

            if (linkedTasks) {
              myProjectTaskIds = new Set(linkedTasks.map(lt => lt.task_id))
            }
          }
        } catch (e) {
          console.error('Erreur récupération tâches projets:', e)
        }

        result = result.filter(task => {
          const isCreator = task.created_by === userId
          const isAssignee = task.task_assignees?.some(a => a.user_id === userId)
          const isMine = isCreator || isAssignee

          // Mes propres tâches → toujours visibles
          if (isMine) return true

          // Tâches liées à mes projets → visibles
          if (myProjectTaskIds.has(task.id)) return true

          // Tâches du périmètre en attente de validation → visibles pour les chefs
          if (task.status === 'en_revue') {
            if (profile.role === 'chef_service' && task.service_id === profile.service_id) return true
            if (profile.role === 'chef_division' && task.division_id === profile.division_id) return true
            if (profile.role === 'directeur' && task.direction_id === profile.direction_id) return true
          }

          // Les autres tâches (terminées, etc.) des collaborateurs → pas visibles
          return false
        })
      }

      return result
    },
    staleTime: 30000,
    enabled: !!profile,
  })
}

// ─── FETCH SINGLE TASK ─────────────────────────────────────
// ✅ Session 18 — Ajout liaison KR (task_key_results) et projets (project_tasks)
// Requêtes séparées pour éviter les ambiguïtés FK PostgREST
export function useTask(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      // 1. Requête principale avec sous-tâches
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          ${TASK_SELECT},
          subtasks:tasks!parent_task_id(
            id, title, status, priority,
            task_assignees(user_id, users!task_assignees_user_id_fkey(id, first_name, last_name))
          )
        `)
        .eq('id', taskId)
        .single()
      if (error) throw error

      // 2. Récupérer les KR liés via task_key_results (requêtes séparées pour éviter ambiguïtés FK)
      let linkedKrs = []
      try {
        const { data: tkrData, error: tkrError } = await supabase
          .from('task_key_results')
          .select('id, key_result_id')
          .eq('task_id', taskId)

        if (!tkrError && tkrData && tkrData.length > 0) {
          const krIds = tkrData.map(tkr => tkr.key_result_id)
          const { data: krsData } = await supabase
            .from('key_results')
            .select('id, title, score, target_value, current_value, start_value, kr_type, unit, status, objective_id')
            .in('id', krIds)

          if (krsData && krsData.length > 0) {
            // Récupérer les objectifs parents
            const objIds = [...new Set(krsData.map(kr => kr.objective_id).filter(Boolean))]
            let objectivesMap = {}
            if (objIds.length > 0) {
              const { data: objData } = await supabase
                .from('objectives')
                .select('id, title, level')
                .in('id', objIds)
              if (objData) {
                objData.forEach(obj => { objectivesMap[obj.id] = obj })
              }
            }

            // Assembler les données
            linkedKrs = krsData.map(kr => ({
              ...kr,
              objective: objectivesMap[kr.objective_id] || null,
              tkr_id: tkrData.find(t => t.key_result_id === kr.id)?.id,
            }))
          }
        }
      } catch (e) {
        console.error('Erreur récupération KR liés:', e)
      }

      // 3. Récupérer les projets liés via project_tasks (requête séparée)
      let linkedProjects = []
      try {
        const { data: ptData, error: ptError } = await supabase
          .from('project_tasks')
          .select('id, project_id')
          .eq('task_id', taskId)

        if (!ptError && ptData && ptData.length > 0) {
          const projIds = ptData.map(pt => pt.project_id)
          const { data: projData } = await supabase
            .from('projects')
            .select('id, name, status, priority, progress')
            .in('id', projIds)

          if (projData) {
            linkedProjects = projData.map(proj => ({
              ...proj,
              pt_id: ptData.find(pt => pt.project_id === proj.id)?.id,
            }))
          }
        }
      } catch (e) {
        console.error('Erreur récupération projets liés:', e)
      }

      // 4. Attacher les données enrichies au résultat
      return {
        ...data,
        linked_key_results: linkedKrs,
        linked_projects: linkedProjects,
      }
    },
    enabled: !!taskId,
  })
}

// ─── FETCH COMMENTS ────────────────────────────────────────
export function useTaskComments(taskId) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`*, users!task_comments_user_id_fkey(id, first_name, last_name)`)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId,
  })
}

// ─── FETCH ACTIVITY LOG ────────────────────────────────────
export function useTaskActivity(taskId) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity_log')
        .select(`*, users!task_activity_log_user_id_fkey(id, first_name, last_name)`)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId,
  })
}

// ─── FETCH ASSIGNABLE USERS (selon hiérarchie de l'appelant) ──
export function useAllUsers() {
  return useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assignable_users')
      if (error) throw error
      return data || []
    },
    staleTime: 60000,
  })
}

// ─── CREATE TASK ───────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskData, assigneeIds = [] }) => {
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', taskData.status || 'backlog')
        .eq('is_archived', false)

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: profile.id,
          position: (count || 0) + 1,
        })
        .select()
        .single()
      if (error) throw error

      if (assigneeIds.length > 0) {
        const assignees = assigneeIds.map(uid => ({
          task_id: task.id,
          user_id: uid,
          assigned_by: profile.id,
        }))
        await supabase.from('task_assignees').insert(assignees)
      }

      await supabase.from('task_activity_log').insert({
        task_id: task.id,
        user_id: profile.id,
        action: 'created',
        new_value: task.title,
      })

      return task
    },
    onSuccess: (task) => {
      logAudit('task_created', 'task', task.id, { title: task.title })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ─── UPDATE TASK ───────────────────────────────────────────
export function useUpdateTask() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskId, updates, logAction, logOld, logNew }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error

      if (logAction) {
        await supabase.from('task_activity_log').insert({
          task_id: taskId,
          user_id: profile.id,
          action: logAction,
          old_value: logOld,
          new_value: logNew,
        })
      }

      return data
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

// ─── UPDATE STATUS ─────────────────────────────────────────
export function useUpdateTaskStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, newStatus, oldStatus, rejectionReason }) => {
      // Si c'est une approbation/refus, utiliser la RPC dédiée
      if (oldStatus === 'en_revue' && (newStatus === 'terminee' || newStatus === 'en_cours')) {
        const { error } = await supabase.rpc('approve_or_reject_task', {
          target_task_id: taskId,
          new_status: newStatus,
          rejection_reason_text: rejectionReason || null,
        })
        if (error) throw error
      } else {
        // Sinon, utiliser la RPC générale
        const { error } = await supabase.rpc('update_task_status', {
          target_task_id: taskId,
          new_status: newStatus,
          old_status: oldStatus,
        })
        if (error) throw error
      }
    },
    // Optimistic update : mettre à jour le cache immédiatement
    onMutate: async ({ taskId, newStatus }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previousQueries = qc.getQueriesData({ queryKey: ['tasks'] })
      qc.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      })
      return { previousQueries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }
    },
    // ✅ Session 19 bis — Invalide aussi le cache du détail de la tâche
    onSettled: (_data, _err, { taskId }) => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['task', taskId] })
      }, 1000)
    },
  })
}

// ─── DELETE TASK ───────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (taskId) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      logAudit('task_deleted', 'task', taskId)
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ─── UPDATE ASSIGNEES ──────────────────────────────────────
export function useUpdateAssignees() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskId, newAssigneeIds }) => {
      await supabase.from('task_assignees').delete().eq('task_id', taskId)

      if (newAssigneeIds.length > 0) {
        const rows = newAssigneeIds.map(uid => ({
          task_id: taskId,
          user_id: uid,
          assigned_by: profile.id,
        }))
        const { error } = await supabase.from('task_assignees').insert(rows)
        if (error) throw error
      }

      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: profile.id,
        action: 'assigned',
        new_value: newAssigneeIds.join(','),
      })
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

// ─── CHECKLIST MUTATIONS ───────────────────────────────────
export function useChecklistMutations(taskId) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  const addChecklist = useMutation({
    mutationFn: async (title) => {
      const { error } = await supabase
        .from('task_checklists')
        .insert({ task_id: taskId, title })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const addItem = useMutation({
    mutationFn: async ({ checklistId, content }) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .insert({ checklist_id: checklistId, content })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, isDone }) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .update({
          is_done: isDone,
          done_by: isDone ? profile.id : null,
          done_at: isDone ? new Date().toISOString() : null,
        })
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const deleteItem = useMutation({
    mutationFn: async (itemId) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const deleteChecklist = useMutation({
    mutationFn: async (checklistId) => {
      const { error } = await supabase
        .from('task_checklists')
        .delete()
        .eq('id', checklistId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  return { addChecklist, addItem, toggleItem, deleteItem, deleteChecklist }
}

// ─── COMMENT MUTATIONS ─────────────────────────────────────
export function useCommentMutations(taskId) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  const addComment = useMutation({
    mutationFn: async (content) => {
      const { error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, user_id: profile.id, content })
      if (error) throw error

      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: profile.id,
        action: 'comment_added',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
      qc.invalidateQueries({ queryKey: ['task-activity', taskId] })
    },
  })

  const deleteComment = useMutation({
    mutationFn: async (commentId) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
  })

  return { addComment, deleteComment }
}
// ─── S77 ──────────────────────────────────────────────────────────────────────

// ─── TASK DEPENDENCIES ────────────────────────────────────────────────────────
export function useTaskDependencies(taskId) {
  return useQuery({
    queryKey: ['task-deps', taskId],
    queryFn: async () => {
      if (!taskId) return []
      // Récupérer les tâches que cette tâche bloque (elle dépend de depends_on_id)
      const { data: blocking, error: e1 } = await supabase
        .from('task_dependencies')
        .select('id, dependency_type, depends_on_id, task:tasks!depends_on_id(id,title,status,priority)')
        .eq('task_id', taskId)
      if (e1) throw e1

      // Récupérer les tâches bloquées par cette tâche
      const { data: blockedBy, error: e2 } = await supabase
        .from('task_dependencies')
        .select('id, dependency_type, task_id, task:tasks!task_id(id,title,status,priority)')
        .eq('depends_on_id', taskId)
      if (e2) throw e2

      return {
        dependsOn: blocking || [],   // cette tâche dépend de ces tâches
        blockedBy: blockedBy || [],  // ces tâches dépendent de cette tâche
      }
    },
    enabled: !!taskId,
  })
}

export function useCreateDependency() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ taskId, dependsOnId, dependencyType = 'blocks' }) => {
      const { error } = await supabase.from('task_dependencies').insert({
        organization_id: profile.organization_id,
        task_id: taskId,
        depends_on_id: dependsOnId,
        dependency_type: dependencyType,
        created_by: profile.id,
      })
      if (error) throw error
    },
    onSuccess: (_, { taskId, dependsOnId }) => {
      qc.invalidateQueries({ queryKey: ['task-deps', taskId] })
      qc.invalidateQueries({ queryKey: ['task-deps', dependsOnId] })
    },
  })
}

export function useDeleteDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ depId, taskId, dependsOnId }) => {
      const { error } = await supabase.from('task_dependencies').delete().eq('id', depId)
      if (error) throw error
      return { taskId, dependsOnId }
    },
    onSuccess: (_, { taskId, dependsOnId }) => {
      qc.invalidateQueries({ queryKey: ['task-deps', taskId] })
      qc.invalidateQueries({ queryKey: ['task-deps', dependsOnId] })
    },
  })
}

// ─── TASK RECURRENCE ──────────────────────────────────────────────────────────
export function useTaskRecurrence(taskId) {
  return useQuery({
    queryKey: ['task-recur', taskId],
    queryFn: async () => {
      if (!taskId) return null
      const { data, error } = await supabase
        .from('task_recurrences')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!taskId,
  })
}

export function useCreateRecurrence() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from('task_recurrences').insert({
        ...payload,
        organization_id: profile.organization_id,
      })
      if (error) throw error
    },
    onSuccess: (_, payload) => qc.invalidateQueries({ queryKey: ['task-recur', payload.task_id] }),
  })
}

export function useUpdateRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskId, ...updates }) => {
      const { error } = await supabase.from('task_recurrences').update(updates).eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => qc.invalidateQueries({ queryKey: ['task-recur', taskId] }),
  })
}

export function useDeleteRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskId }) => {
      const { error } = await supabase.from('task_recurrences').delete().eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => qc.invalidateQueries({ queryKey: ['task-recur', taskId] }),
  })
}

// ─── TIME TRACKING ────────────────────────────────────────────────────────────
export function useTimeTracking(taskId) {
  return useQuery({
    queryKey: ['task-time', taskId],
    queryFn: async () => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from('task_time_tracking')
        .select('*, user:users(id, full_name)')
        .eq('task_id', taskId)
        .order('logged_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId,
  })
}

export function useLogTime() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ taskId, minutesSpent, note = null }) => {
      const { error } = await supabase.from('task_time_tracking').insert({
        organization_id: profile.organization_id,
        task_id: taskId,
        user_id: profile.id,
        minutes_spent: minutesSpent,
        note,
      })
      if (error) throw error
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['task-time', taskId] })
      qc.invalidateQueries({ queryKey: ['team-workload'] })
    },
  })
}

export function useDeleteTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskId }) => {
      const { error } = await supabase.from('task_time_tracking').delete().eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => qc.invalidateQueries({ queryKey: ['task-time', taskId] }),
  })
}

// ─── TEAM WORKLOAD ────────────────────────────────────────────────────────────
export function useTeamWorkload() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['team-workload', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_workload', {
        p_organization_id: profile.organization_id,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── GANTT DATA ───────────────────────────────────────────────────────────────
export function useGanttData(startDate, endDate) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['gantt', profile?.organization_id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_gantt_tasks', {
        p_organization_id: profile.organization_id,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id && !!startDate && !!endDate,
  })
}
