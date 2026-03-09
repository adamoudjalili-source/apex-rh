// ============================================================
// APEX RH — useTaskAdvanced.js  ·  S125-D
// Dépendances · Suivi de temps · Charge équipe · Gantt
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── TASK DEPENDENCIES ────────────────────────────────────
export function useTaskDependencies(taskId) {
  return useQuery({
    queryKey: ['task-deps', taskId],
    queryFn: async () => {
      if (!taskId) return { dependsOn: [], blockedBy: [] }
      const { data: blocking, error: e1 } = await supabase
        .from('task_dependencies')
        .select('id, dependency_type, depends_on_id, task:tasks!depends_on_id(id,title,status,priority)')
        .eq('task_id', taskId)
      if (e1) throw e1

      const { data: blockedBy, error: e2 } = await supabase
        .from('task_dependencies')
        .select('id, dependency_type, task_id, task:tasks!task_id(id,title,status,priority)')
        .eq('depends_on_id', taskId)
      if (e2) throw e2

      return { dependsOn: blocking || [], blockedBy: blockedBy || [] }
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
        task_id: taskId, depends_on_id: dependsOnId,
        dependency_type: dependencyType, created_by: profile.id,
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

// ─── TIME TRACKING (task_time_tracking — log manuel) ──────
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
        task_id: taskId, user_id: profile.id,
        minutes_spent: minutesSpent, note,
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

// ─── TEAM WORKLOAD ────────────────────────────────────────
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

// ─── GANTT DATA ───────────────────────────────────────────
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
