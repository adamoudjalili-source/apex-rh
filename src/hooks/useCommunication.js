// ============================================================
// APEX RH — hooks/useCommunication.js
// Session S65 — Communication Interne
// Gestion des canaux + compteur non-lus global (badge Sidebar)
// ============================================================
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../utils/constants'

// ─── CANAUX ──────────────────────────────────────────────────

export function useChannels() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['communication-channels', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_channels')
        .select(`
          *,
          author:users!communication_channels_created_by_fkey(
            id, first_name, last_name, avatar_url
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_archived', false)
        .order('last_msg_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      return data || []
    },
  })
}

export function useChannel(channelId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['communication-channel', channelId],
    enabled: !!channelId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_channels')
        .select('*')
        .eq('id', channelId)
        .single()

      if (error) throw error
      return data
    },
  })
}

export function useCreateChannel() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, description, type = 'thematic', members = [], color, is_private = false }) => {
      const { data, error } = await supabase
        .from('communication_channels')
        .insert({
          organization_id: profile.organization_id,
          name,
          description,
          type,
          members: is_private ? members : [],
          color: color || '#06B6D4',
          is_private,
          created_by: profile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-channels'] })
    },
  })
}

export function useUpdateChannel() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('communication_channels')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['communication-channels'] })
      qc.invalidateQueries({ queryKey: ['communication-channel', data.id] })
    },
  })
}

// ─── BADGE NON-LUS GLOBAL ────────────────────────────────────

export function useUnreadCount() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const userId = profile?.id

  return useQuery({
    queryKey: ['communication-unread', userId],
    enabled: !!userId && !!orgId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Compte les messages non lus dans tous les canaux accessibles
      const { count, error } = await supabase
        .from('communication_messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .not('author_id', 'eq', userId)
        .not('read_by', 'cs', `{${userId}}`)

      if (error) return 0
      return count || 0
    },
  })
}

// ─── REALTIME : subscriptions canaux ─────────────────────────

export function useChannelsRealtime() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel('communication-channels-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'communication_channels',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['communication-channels', orgId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, qc])
}

// ─── STATUT UTILISATEUR ──────────────────────────────────────

export function useUserStatus(userId) {
  return useQuery({
    queryKey: ['user-status', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('communication_user_status')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      return data
    },
  })
}

export function useSetMyStatus() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ status, status_msg = '' }) => {
      const { data, error } = await supabase
        .from('communication_user_status')
        .upsert({
          user_id: profile.id,
          organization_id: profile.organization_id,
          status,
          status_msg,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-status', profile?.id] })
    },
  })
}

// ─── RECHERCHE ───────────────────────────────────────────────

export function useSearch(query) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['communication-search', query],
    enabled: !!query && query.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('search_communication', {
          p_organization_id: profile.organization_id,
          p_query: query,
          p_limit: 20,
        })

      if (error) throw error
      return data || []
    },
  })
}

// ─── RÉSUMÉ IA ───────────────────────────────────────────────

export function useAISummary(channelId) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['communication-ai-summary', channelId],
    enabled: !!channelId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('communication_ai_summaries')
        .select('*')
        .eq('channel_id', channelId)
        .eq('organization_id', profile.organization_id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return data
    },
  })
}

export function useGenerateAISummary() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ channelId, messages }) => {
      // Appel Edge Function pour génération IA
      const { data, error } = await supabase.functions.invoke('generate-ai-response', {
        body: {
          type: 'communication_summary',
          channel_id: channelId,
          organization_id: profile.organization_id,
          messages: messages.map(m => ({
            author: `${m.author?.first_name} ${m.author?.last_name}`,
            content: m.content,
            at: m.created_at,
          })),
        },
      })

      if (error) throw error

      // Sauvegarder le résumé en BDD
      const summary = data?.summary || 'Résumé non disponible'
      const { data: saved, error: saveErr } = await supabase
        .from('communication_ai_summaries')
        .insert({
          channel_id: channelId,
          organization_id: profile.organization_id,
          summary,
          msg_count: messages.length,
          from_date: messages[0]?.created_at,
          to_date: messages[messages.length - 1]?.created_at,
        })
        .select()
        .single()

      if (saveErr) throw saveErr
      return saved
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['communication-ai-summary', data.channel_id] })
    },
  })
}

// ─── Fusionné depuis useCommunicationS87 ─────────────────────────────────────────

// ─── STATS DE LECTURE D'UNE ANNONCE ──────────────────────────
// Retourne total_recipients, read_count, read_pct, last_read_at

export function useAnnouncementStats(announcementId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['announcement-stats', announcementId],
    enabled: !!announcementId && !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_announcement_stats')
        .select('*')
        .eq('announcement_id', announcementId)
        .single()

      if (error) throw error
      return data
    },
  })
}

// ─── MARQUER UNE ANNONCE COMME LUE ───────────────────────────

export function useMarkAnnouncementRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (announcementId) => {
      const { error } = await supabase
        .rpc('mark_announcement_read', { p_announcement_id: announcementId })
      if (error) throw error
    },
    onSuccess: (_, announcementId) => {
      qc.invalidateQueries({ queryKey: ['announcement-stats', announcementId] })
      qc.invalidateQueries({ queryKey: ['announcement-receipts', announcementId] })
      qc.invalidateQueries({ queryKey: ['annonces'] })
    },
  })
}

// ─── ACCUSÉS DE LECTURE (adminOnly) ──────────────────────────
// Utilise la RPC get_announcement_recipients pour avoir qui a lu / pas lu

export function useReadReceipts(announcementId) {
  const { profile } = useAuth()
  const isAdmin = [ROLES.ADMINISTRATEUR, ROLES.DIRECTEUR].includes(profile?.role)

  return useQuery({
    queryKey: ['announcement-receipts', announcementId],
    enabled: !!announcementId && isAdmin,
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_announcement_recipients', { p_announcement_id: announcementId })
      if (error) throw error
      return data || []
    },
  })
}

// ─── ANNONCE CIBLÉE ──────────────────────────────────────────
// Envoyer une annonce avec targeting_rules + flag important

export function useCreateTargetedAnnouncement() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      title,
      content,
      targeting_rules = { type: 'all' },
      important = false,
      pinned = false,
      expires_at,
      cover_image_url,
      // Backward compat: si target_roles passés, on les met dans targeting_rules
      target_roles = [],
    }) => {
      // Normaliser targeting_rules
      let rules = targeting_rules
      if (target_roles.length > 0 && rules.type === 'all') {
        rules = { type: 'roles', roles: target_roles }
      }

      const excerpt = content.replace(/<[^>]+>/g, '').slice(0, 300)

      const { data, error } = await supabase
        .from('communication_announcements')
        .insert({
          organization_id: profile.organization_id,
          title,
          content,
          excerpt,
          author_id:       profile.id,
          targeting_rules: rules,
          // Garder target_roles pour compat S65 RLS
          target_roles:    rules.type === 'roles' ? (rules.roles || []) : [],
          important,
          pinned,
          expires_at:      expires_at || null,
          cover_image_url: cover_image_url || null,
        })
        .select()
        .single()

      if (error) throw error

      // Si annonce importante → dispatcher une notification S86
      if (important && data?.id) {
        await supabase.rpc('dispatch_notification', {
          p_org_id:       profile.organization_id,
          p_event_type:   'announcement_important',
          p_reference_id: data.id,
          p_data: {
            title:        `📢 ${title}`,
            details:      excerpt,
            priority:     'high',
            reference_type: 'announcement',
          },
        }).then(() => {}).catch(() => {}) // silencieux
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annonces'] })
    },
  })
}

// ─── METTRE À JOUR UNE ANNONCE CIBLÉE ────────────────────────

export function useUpdateTargetedAnnouncement() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, targeting_rules, target_roles = [], important, ...rest }) => {
      let rules = targeting_rules
      if (!rules && target_roles.length > 0) {
        rules = { type: 'roles', roles: target_roles }
      }

      const payload = {
        ...rest,
        ...(rules && {
          targeting_rules: rules,
          target_roles: rules.type === 'roles' ? (rules.roles || []) : [],
        }),
        ...(important !== undefined && { important }),
      }

      const { data, error } = await supabase
        .from('communication_announcements')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annonces'] })
    },
  })
}

// ─── ANNONCES IMPORTANTES NON LUES ───────────────────────────
// Badge / rappel : annonces importantes que l'user n'a pas encore lues

export function useUnreadImportantCount() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const userId = profile?.id

  return useQuery({
    queryKey: ['unread-important-announcements', userId],
    enabled: !!userId && !!orgId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      // Annonces importantes de l'org non expirées
      const { data: importantAnn, error: annErr } = await supabase
        .from('communication_announcements')
        .select('id, target_roles')
        .eq('organization_id', orgId)
        .eq('important', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

      if (annErr || !importantAnn?.length) return 0

      // Filtrer par rôle
      const role = profile?.role
      const relevant = importantAnn.filter(a =>
        !a.target_roles?.length || a.target_roles.includes(role)
      )
      if (!relevant.length) return 0

      // Celles déjà lues
      const { data: read } = await supabase
        .from('announcement_read_receipts')
        .select('announcement_id')
        .eq('user_id', userId)
        .in('announcement_id', relevant.map(a => a.id))

      const readIds = new Set((read || []).map(r => r.announcement_id))
      return relevant.filter(a => !readIds.has(a.id)).length
    },
  })
}
