// ============================================================
// APEX RH — hooks/useAnnonces.js
// Session S65 — Communication Interne
// CRUD annonces + réactions + commentaires
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── LISTE ANNONCES ──────────────────────────────────────────

export function useAnnonces({ pinned, limit = 20 } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.org_id
  const role  = profile?.role

  return useQuery({
    queryKey: ['annonces', orgId, pinned],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('communication_announcements')
        .select(`
          *,
          author:profiles!communication_announcements_author_id_fkey(
            id, first_name, last_name, avatar_url, role
          ),
          comments:communication_announcement_comments(count)
        `)
        .eq('org_id', orgId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(limit)

      if (pinned !== undefined) q = q.eq('pinned', pinned)

      const { data, error } = await q
      if (error) throw error

      // Filtrer par rôle côté client (double sécurité, RLS fait le vrai filtrage)
      return (data || []).filter(a =>
        !a.target_roles?.length || a.target_roles.includes(role)
      )
    },
  })
}

export function useAnnonce(id) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['annonce', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_announcements')
        .select(`
          *,
          author:profiles!communication_announcements_author_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Enregistrer la vue
      if (profile?.id && !data.views?.includes(profile.id)) {
        await supabase
          .from('communication_announcements')
          .update({ views: [...(data.views || []), profile.id] })
          .eq('id', id)
      }

      return data
    },
  })
}

// ─── CRÉER UNE ANNONCE ───────────────────────────────────────

export function useCreateAnnonce() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      title, content, target_roles = [], target_divisions = [],
      cover_image_url, pinned = false, expires_at,
    }) => {
      const excerpt = content.replace(/<[^>]+>/g, '').slice(0, 300)

      const { data, error } = await supabase
        .from('communication_announcements')
        .insert({
          org_id: profile.org_id,
          title,
          content,
          excerpt,
          author_id: profile.id,
          target_roles,
          target_divisions,
          cover_image_url,
          pinned,
          expires_at: expires_at || null,
        })
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

// ─── MODIFIER UNE ANNONCE ────────────────────────────────────

export function useUpdateAnnonce() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      if (updates.content) {
        updates.excerpt = updates.content.replace(/<[^>]+>/g, '').slice(0, 300)
      }
      const { data, error } = await supabase
        .from('communication_announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['annonces'] })
      qc.invalidateQueries({ queryKey: ['annonce', data.id] })
    },
  })
}

// ─── SUPPRIMER UNE ANNONCE ───────────────────────────────────

export function useDeleteAnnonce() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('communication_announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annonces'] })
    },
  })
}

// ─── RÉACTIONS SUR ANNONCES ──────────────────────────────────

export function useToggleAnnonceReaction() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ annonceId, emoji }) => {
      const { data: ann } = await supabase
        .from('communication_announcements')
        .select('reactions')
        .eq('id', annonceId)
        .single()

      const reactions = ann?.reactions || {}
      const users = reactions[emoji] || []
      const hasReacted = users.includes(profile.id)

      const newUsers = hasReacted
        ? users.filter(id => id !== profile.id)
        : [...users, profile.id]

      const newReactions = { ...reactions }
      if (newUsers.length === 0) delete newReactions[emoji]
      else newReactions[emoji] = newUsers

      const { error } = await supabase
        .from('communication_announcements')
        .update({ reactions: newReactions })
        .eq('id', annonceId)

      if (error) throw error
      return annonceId
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['annonces'] })
      qc.invalidateQueries({ queryKey: ['annonce', id] })
    },
  })
}

// ─── COMMENTAIRES ────────────────────────────────────────────

export function useAnnonceComments(annonceId) {
  return useQuery({
    queryKey: ['annonce-comments', annonceId],
    enabled: !!annonceId,
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_announcement_comments')
        .select(`
          *,
          author:profiles!communication_announcement_comments_author_id_fkey(
            id, first_name, last_name, avatar_url
          )
        `)
        .eq('announcement_id', annonceId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    },
  })
}

export function useAddComment() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ annonceId, content }) => {
      const { data, error } = await supabase
        .from('communication_announcement_comments')
        .insert({
          announcement_id: annonceId,
          author_id: profile.id,
          content,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['annonce-comments', data.announcement_id] })
      qc.invalidateQueries({ queryKey: ['annonces'] })
    },
  })
}

// ─── TOGGLE ÉPINGLE ──────────────────────────────────────────

export function useTogglePin() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { data, error } = await supabase
        .from('communication_announcements')
        .update({ pinned })
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
