// ============================================================
// APEX RH — useTaskRelations.js  ·  S125-D
// Assignés + utilisateurs assignables
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── FETCH ASSIGNABLE USERS ────────────────────────────────
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

// ─── UPDATE ASSIGNEES ──────────────────────────────────────
export function useUpdateAssignees() {
  const qc      = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ taskId, newAssigneeIds }) => {
      await supabase.from('task_assignees').delete().eq('task_id', taskId)

      if (newAssigneeIds.length > 0) {
        const rows = newAssigneeIds.map(uid => ({
          task_id: taskId, user_id: uid, assigned_by: profile.id,
        }))
        const { error } = await supabase.from('task_assignees').insert(rows)
        if (error) throw error
      }

      await supabase.from('task_activity_log').insert({
        task_id: taskId, user_id: profile.id,
        action: 'assigned', new_value: newAssigneeIds.join(','),
      })
    },
    onSuccess: (_, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}
