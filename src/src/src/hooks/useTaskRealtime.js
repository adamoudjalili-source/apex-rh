// ============================================================
// APEX RH — useTaskRealtime.js
// Debounce + ignore pendant mutations pour éviter le flicker D&D
// ============================================================
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTaskRealtime() {
  const qc = useQueryClient()
  const debounceRef = useRef(null)

  useEffect(() => {
    function handleChange() {
      // Annuler le debounce précédent
      if (debounceRef.current) clearTimeout(debounceRef.current)

      // Attendre 800ms puis vérifier s'il y a des mutations en cours
      debounceRef.current = setTimeout(() => {
        // Vérifier AU MOMENT de l'exécution (pas dans une closure)
        const mutating = qc.isMutating()
        if (mutating > 0) return // Mutation en cours → l'optimistic update gère

        qc.invalidateQueries({ queryKey: ['tasks'] })
      }, 800)
    }

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, handleChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_assignees',
      }, handleChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_checklist_items',
      }, handleChange)
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [qc])
}

export function useTaskDetailRealtime(taskId) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!taskId) return

    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['task-comments', taskId] })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_activity_log',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['task-activity', taskId] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId, qc])
}