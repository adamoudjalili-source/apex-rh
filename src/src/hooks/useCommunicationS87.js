// ============================================================
// APEX RH — hooks/useCommunicationS87.js
// Session S87 — Communication : Ciblage avancé + accusés lecture
// ⚠️ NE PAS ÉCRASER useCommunication.js (S65)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
  const isAdmin = ['administrateur', 'directeur'].includes(profile?.role)

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
