// ============================================================
// APEX RH — useTaskFeatures.js  ·  S125-D
// Checklists · Commentaires · Activité · Récurrence
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── COMMENTS ─────────────────────────────────────────────
export function useTaskComments(taskId) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*, users!task_comments_user_id_fkey(id, first_name, last_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId,
  })
}

// ─── ACTIVITY LOG ─────────────────────────────────────────
export function useTaskActivity(taskId) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity_log')
        .select('*, users!task_activity_log_user_id_fkey(id, first_name, last_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!taskId,
  })
}

// ─── CHECKLIST MUTATIONS ───────────────────────────────────
export function useChecklistMutations(taskId) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  const addChecklist = useMutation({
    mutationFn: async (title) => {
      const { error } = await supabase.from('task_checklists').insert({ task_id: taskId, title })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const addItem = useMutation({
    mutationFn: async ({ checklistId, content }) => {
      const { error } = await supabase.from('task_checklist_items').insert({ checklist_id: checklistId, content })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, isDone }) => {
      const { error } = await supabase.from('task_checklist_items').update({
        is_done: isDone, done_by: isDone ? profile.id : null,
        done_at: isDone ? new Date().toISOString() : null,
      }).eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const deleteItem = useMutation({
    mutationFn: async (itemId) => {
      const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const deleteChecklist = useMutation({
    mutationFn: async (checklistId) => {
      const { error } = await supabase.from('task_checklists').delete().eq('id', checklistId)
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
      const { error } = await supabase.from('task_comments')
        .insert({ task_id: taskId, user_id: profile.id, content })
      if (error) throw error
      await supabase.from('task_activity_log').insert({
        task_id: taskId, user_id: profile.id, action: 'comment_added',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
      qc.invalidateQueries({ queryKey: ['task-activity', taskId] })
    },
  })

  const deleteComment = useMutation({
    mutationFn: async (commentId) => {
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
  })

  return { addComment, deleteComment }
}

// ─── TASK RECURRENCE ──────────────────────────────────────
export function useTaskRecurrence(taskId) {
  return useQuery({
    queryKey: ['task-recur', taskId],
    queryFn: async () => {
      if (!taskId) return null
      const { data, error } = await supabase.from('task_recurrences')
        .select('*').eq('task_id', taskId).maybeSingle()
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
      const { error } = await supabase.from('task_recurrences')
        .insert({ ...payload, organization_id: profile.organization_id })
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
