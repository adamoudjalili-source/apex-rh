// ============================================================
// APEX RH — useNotifications.js
// ✅ Session 12 — Notifications in-app + temps réel
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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

// ─── Fusionné depuis useNotificationsS86 ─────────────────────────────────────────

// ─── S86 ─────────────────────────────────────────────────────

// Clés de cache
const INBOX_KEY   = (uid) => ['notif-inbox-s86',  uid]
const UNREAD_KEY  = (uid) => ['notif-unread-s86',  uid]
const RULES_KEY   = (oid) => ['notif-rules-s86',   oid]

// ─── useNotificationInbox ─────────────────────────────────────
// Retourne les notifications non archivées de l'utilisateur (récentes en premier)
export function useNotificationInbox({ limit = 30, onlyUnread = false } = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: [...INBOX_KEY(profile?.id), { limit, onlyUnread }],
    queryFn: async () => {
      let q = supabase
        .from('notification_inbox')
        .select('*')
        .eq('user_id', profile.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (onlyUnread) q = q.is('read_at', null)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 15000,
  })
}

// ─── useUnreadCountS86 ────────────────────────────────────────
export function useUnreadCountS86() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: UNREAD_KEY(profile?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification_inbox')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('read_at', null)
        .is('archived_at', null)

      if (error) throw error
      return count || 0
    },
    enabled: !!profile?.id,
    staleTime: 10000,
    refetchInterval: 30000,
  })

  // Realtime : re-fetch à chaque INSERT dans notification_inbox
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel(`notif-inbox-realtime-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_inbox',
          filter: `user_id=eq.${profile.id}`,
        },
        () => query.refetch()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return query
}

// ─── useMarkRead ──────────────────────────────────────────────
export function useMarkRead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId) => {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNREAD_KEY(profile?.id) })
      qc.invalidateQueries({ queryKey: INBOX_KEY(profile?.id) })
    },
  })
}

// ─── useMarkAllRead ───────────────────────────────────────────
export function useMarkAllRead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read', {
        p_org_id: profile.organization_id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNREAD_KEY(profile?.id) })
      qc.invalidateQueries({ queryKey: INBOX_KEY(profile?.id) })
    },
  })
}

// ─── useArchiveNotification ───────────────────────────────────
export function useArchiveNotification() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId) => {
      const { error } = await supabase
        .from('notification_inbox')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY(profile?.id) })
      qc.invalidateQueries({ queryKey: UNREAD_KEY(profile?.id) })
    },
  })
}

// ─── useNotificationRules ─────────────────────────────────────
export function useNotificationRules() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: RULES_KEY(profile?.organization_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.organization_id,
    staleTime: 60000,
  })
}

// ─── useUpsertRule ────────────────────────────────────────────
export function useUpsertRule() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (rule) => {
      const payload = {
        ...rule,
        organization_id: profile.organization_id,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('notification_rules')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RULES_KEY(profile?.organization_id) })
    },
  })
}

// ─── useDeleteRule ────────────────────────────────────────────
export function useDeleteRule() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (ruleId) => {
      const { error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', ruleId)
        .eq('organization_id', profile.organization_id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RULES_KEY(profile?.organization_id) })
    },
  })
}

// ─── useDispatchNotification ──────────────────────────────────
// Utilitaire pour déclencher une notification depuis un composant
export function useDispatchNotification() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventType, referenceId = null, data = {} }) => {
      const { data: result, error } = await supabase.rpc('dispatch_notification', {
        p_org_id:        profile.organization_id,
        p_event_type:    eventType,
        p_reference_id:  referenceId,
        p_data:          data,
      })
      if (error) throw error
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNREAD_KEY(profile?.id) })
      qc.invalidateQueries({ queryKey: INBOX_KEY(profile?.id) })
    },
  })
}
