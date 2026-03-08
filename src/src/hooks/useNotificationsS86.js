// ============================================================
// APEX RH — useNotificationsS86.js
// Session 86 — Moteur de règles + escalade + inbox
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
