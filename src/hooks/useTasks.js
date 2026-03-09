// ============================================================
// APEX RH — useTasks.js  ·  S125-D (refactorisé < 300L)
// CRUD principal + barrel re-exports depuis sous-hooks
// Tous les 24 exports d'origine sont conservés
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase }    from '../lib/supabase'
import { useAuth }     from '../contexts/AuthContext'
import { logAudit }    from '../lib/auditLog'
import { ROLES, TASK_STATUS } from '../utils/constants'

// ─── Re-exports sous-hooks (compatibilité totale) ─────────
export { useAllUsers, useUpdateAssignees }                       from './useTaskRelations'
export { useTaskComments, useTaskActivity, useChecklistMutations,
         useCommentMutations, useTaskRecurrence, useCreateRecurrence,
         useUpdateRecurrence, useDeleteRecurrence }              from './useTaskFeatures'
export { useTaskDependencies, useCreateDependency, useDeleteDependency,
         useTimeTracking, useLogTime, useDeleteTimeLog,
         useTeamWorkload, useGanttData }                         from './useTaskAdvanced'
export { useTaskDashboard }                                      from './useTaskStats'

// ─── SELECT principal ─────────────────────────────────────
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

// ─── FETCH ALL TASKS ──────────────────────────────────────
export function useTasks(filters = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['tasks', filters, profile?.id],
    queryFn: async () => {
      let query = supabase.from('tasks')
        .select(TASK_SELECT)
        .eq('is_archived', false)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (filters.status)       query = query.eq('status', filters.status)
      if (filters.priority)     query = query.eq('priority', filters.priority)
      if (filters.service_id)   query = query.eq('service_id', filters.service_id)
      if (filters.division_id)  query = query.eq('division_id', filters.division_id)
      if (filters.search)       query = query.ilike('title', `%${filters.search}%`)
      if (filters.due_date_from)query = query.gte('due_date', filters.due_date_from)
      if (filters.due_date_to)  query = query.lte('due_date', filters.due_date_to)
      if (filters.parent_task_id !== undefined) {
        query = filters.parent_task_id === null
          ? query.is('parent_task_id', null)
          : query.eq('parent_task_id', filters.parent_task_id)
      }

      const { data, error } = await query
      if (error) throw error
      let result = data || []

      if (filters.assignee_id)
        result = result.filter(t => t.task_assignees?.some(a => a.user_id === filters.assignee_id))

      // ✅ S125 — filtre "En retard"
      if (filters.overdue_only) {
        const now = new Date()
        result = result.filter(t =>
          t.due_date && new Date(t.due_date) < now && !['terminee','annule'].includes(t.status)
        )
      }

      // ✅ S125 — filtre par tag
      if (filters.tag_id) {
        const { data: tagLinks } = await supabase
          .from('task_tag_links').select('task_id').eq('tag_id', filters.tag_id)
        const tagTaskIds = new Set((tagLinks||[]).map(l => l.task_id))
        result = result.filter(t => tagTaskIds.has(t.id))
      }

      // Filtrage par rôle
      if (profile && profile.role !== ROLES.ADMINISTRATEUR) {
        const userId = profile.id
        let myProjectTaskIds = new Set()
        try {
          const { data: myProjects } = await supabase
            .from('project_members').select('project_id').eq('user_id', userId)
          if (myProjects?.length) {
            const projectIds = myProjects.map(p => p.project_id)
            const { data: linkedTasks } = await supabase
              .from('project_tasks').select('task_id').in('project_id', projectIds)
            if (linkedTasks) myProjectTaskIds = new Set(linkedTasks.map(lt => lt.task_id))
          }
        } catch (_) {}
        result = result.filter(task => {
          const isCreator  = task.created_by === userId
          const isAssignee = task.task_assignees?.some(a => a.user_id === userId)
          if (isCreator || isAssignee) return true
          if (myProjectTaskIds.has(task.id)) return true
          if (task.status === 'en_revue') {
            if (profile.role === ROLES.CHEF_SERVICE && task.service_id === profile.service_id) return true
            if (profile.role === ROLES.CHEF_DIVISION && task.division_id === profile.division_id) return true
            if (profile.role === ROLES.DIRECTEUR && task.direction_id === profile.direction_id) return true
          }
          return false
        })
      }
      return result
    },
    staleTime: 30000,
    enabled: !!profile,
  })
}

// ─── FETCH SINGLE TASK ────────────────────────────────────
export function useTask(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks')
        .select(`${TASK_SELECT}, subtasks:tasks!parent_task_id(id,title,status,priority,task_assignees(user_id,users!task_assignees_user_id_fkey(id,first_name,last_name)))`)
        .eq('id', taskId).single()
      if (error) throw error

      // KR liés (S18)
      let linkedKrs = []
      try {
        const { data: tkrData } = await supabase.from('task_key_results').select('id,key_result_id').eq('task_id', taskId)
        if (tkrData?.length) {
          const krIds = tkrData.map(t => t.key_result_id)
          const { data: krsData } = await supabase.from('key_results')
            .select('id,title,score,target_value,current_value,start_value,kr_type,unit,status,objective_id').in('id', krIds)
          if (krsData?.length) {
            const objIds = [...new Set(krsData.map(kr => kr.objective_id).filter(Boolean))]
            let objectivesMap = {}
            if (objIds.length) {
              const { data: objData } = await supabase.from('objectives').select('id,title,level').in('id', objIds)
              objData?.forEach(obj => { objectivesMap[obj.id] = obj })
            }
            linkedKrs = krsData.map(kr => ({
              ...kr, objective: objectivesMap[kr.objective_id] || null,
              tkr_id: tkrData.find(t => t.key_result_id === kr.id)?.id,
            }))
          }
        }
      } catch (_) {}

      // Projets liés (S18)
      let linkedProjects = []
      try {
        const { data: ptData } = await supabase.from('project_tasks').select('id,project_id').eq('task_id', taskId)
        if (ptData?.length) {
          const projIds = ptData.map(pt => pt.project_id)
          const { data: projData } = await supabase.from('projects')
            .select('id,name,status,priority,progress').in('id', projIds)
          if (projData) linkedProjects = projData.map(proj => ({ ...proj, pt_id: ptData.find(pt => pt.project_id === proj.id)?.id }))
        }
      } catch (_) {}

      return { ...data, linked_key_results: linkedKrs, linked_projects: linkedProjects }
    },
    enabled: !!taskId,
  })
}

// ─── CREATE TASK ──────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskData, assigneeIds = [] }) => {
      const { count } = await supabase.from('tasks')
        .select('id', { count:'exact', head:true })
        .eq('status', taskData.status || 'backlog').eq('is_archived', false)
      const { data: task, error } = await supabase.from('tasks')
        .insert({ ...taskData, created_by: profile.id, position: (count||0)+1 })
        .select().single()
      if (error) throw error
      if (assigneeIds.length) {
        await supabase.from('task_assignees').insert(
          assigneeIds.map(uid => ({ task_id: task.id, user_id: uid, assigned_by: profile.id }))
        )
      }
      await supabase.from('task_activity_log').insert({
        task_id: task.id, user_id: profile.id, action:'created', new_value: task.title,
      })
      return task
    },
    onSuccess: (task) => {
      logAudit('task_created', 'task', task.id, { title: task.title })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ─── UPDATE TASK ──────────────────────────────────────────
export function useUpdateTask() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskId, updates, logAction, logOld, logNew }) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single()
      if (error) throw error
      if (logAction) {
        await supabase.from('task_activity_log').insert({
          task_id: taskId, user_id: profile.id, action: logAction, old_value: logOld, new_value: logNew,
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

// ─── UPDATE STATUS ────────────────────────────────────────
export function useUpdateTaskStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, newStatus, oldStatus, rejectionReason }) => {
      if (oldStatus === 'en_revue' && (newStatus === 'terminee' || newStatus === 'en_cours')) {
        const { error } = await supabase.rpc('approve_or_reject_task', {
          target_task_id: taskId, new_status: newStatus, rejection_reason_text: rejectionReason || null,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.rpc('update_task_status', {
          target_task_id: taskId, new_status: newStatus, old_status: oldStatus,
        })
        if (error) throw error
      }
    },
    onMutate: async ({ taskId, newStatus }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previousQueries = qc.getQueriesData({ queryKey: ['tasks'] })
      qc.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!Array.isArray(old)) return old
        return old.map(task => task.id === taskId ? { ...task, status: newStatus } : task)
      })
      return { previousQueries }
    },
    onError: (_err, _vars, context) => {
      context?.previousQueries?.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data))
    },
    onSettled: (_data, _err, { taskId }) => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['task', taskId] })
      }, 1000)
    },
  })
}

// ─── DELETE TASK ──────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      logAudit('task_deleted', 'task', taskId)
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
