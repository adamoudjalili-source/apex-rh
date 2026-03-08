// ============================================================
// APEX RH — useNotifications.js
// ✅ Session 12 — Notifications in-app + temps réel
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── FETCH NOTIFICATIONS ─────────────────────────────────────
export function useNotifications(limit = 20) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notifications', profile?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })
}

// ─── COMPTEUR NON LUES ───────────────────────────────────────
export function useUnreadCount() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notifications', 'unread-count', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    },
    enabled: !!profile?.id,
    staleTime: 15000,
  })
}

// ─── MARQUER COMME LUE ──────────────────────────────────────
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ─── MARQUER TOUTES COMME LUES ───────────────────────────────
export function useMarkAllAsRead() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ─── SUPPRIMER UNE NOTIFICATION ──────────────────────────────
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ─── SUPPRIMER TOUTES LES LUES ──────────────────────────────
export function useClearReadNotifications() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id)
        .eq('is_read', true)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ─── PRÉFÉRENCES NOTIFICATIONS ───────────────────────────────
export function useNotificationPreferences() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notification-preferences', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (error) throw error

      // Retourner les défauts si pas de préférences
      return data || {
        email_task_assigned: true,
        email_task_overdue: true,
        email_task_completed: false,
        email_task_comment: true,
        email_objective_evaluation: true,
        email_project_member: true,
        email_project_milestone: true,
      }
    },
    enabled: !!profile?.id,
    staleTime: 300000,
  })
}

export function useUpdateNotificationPreferences() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (prefs) => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: profile.id, ...prefs, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}

// ─── SOUSCRIPTION REALTIME ───────────────────────────────────
export function useNotificationRealtime() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, queryClient])
}
