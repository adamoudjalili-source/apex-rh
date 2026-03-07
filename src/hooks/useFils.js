// ============================================================
// APEX RH — hooks/useFils.js
// Session S65 — Communication Interne
// Fils de discussion contextuels (projet, objectif, campagne)
// ============================================================
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── FILS D'UNE ENTITÉ ───────────────────────────────────────

export function useEntityThread(entityType, entityId) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['thread', entityType, entityId],
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('communication_threads')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      return data
    },
  })
}

// ─── LISTE DES FILS (vue admin/manager) ──────────────────────

export function useFils({ entityType } = {}) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['fils', orgId, entityType],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('communication_threads')
        .select(`
          *,
          creator:users!communication_threads_created_by_fkey(
            id, first_name, last_name, avatar_url
          ),
          messages:communication_thread_messages(count)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (entityType) q = q.eq('entity_type', entityType)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

// ─── CRÉER UN FIL ────────────────────────────────────────────

export function useCreateThread() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ entityType, entityId, title, channelId }) => {
      // Vérifier si un fil existe déjà
      const { data: existing } = await supabase
        .from('communication_threads')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', profile.organization_id)
        .maybeSingle()

      if (existing) return existing

      const { data, error } = await supabase
        .from('communication_threads')
        .insert({
          organization_id: profile.organization_id,
          entity_type: entityType,
          entity_id: entityId,
          title,
          channel_id: channelId || null,
          created_by: profile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fils'] })
    },
  })
}

// ─── MESSAGES D'UN FIL ───────────────────────────────────────

export function useThreadMessages(threadId) {
  return useQuery({
    queryKey: ['thread-messages', threadId],
    enabled: !!threadId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_thread_messages')
        .select(`
          *,
          author:users!communication_thread_messages_author_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    },
  })
}

// ─── ENVOYER UN MESSAGE DANS UN FIL ──────────────────────────

export function useSendThreadMessage() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ threadId, content, attachments = [] }) => {
      // S'assurer que le fil existe
      const { data: thread } = await supabase
        .from('communication_threads')
        .select('id')
        .eq('id', threadId)
        .single()

      if (!thread) throw new Error('Thread not found')

      const { data, error } = await supabase
        .from('communication_thread_messages')
        .insert({
          thread_id: threadId,
          organization_id: profile.organization_id,
          author_id: profile.id,
          content,
          attachments,
          read_by: [profile.id],
        })
        .select(`
          *,
          author:users!communication_thread_messages_author_id_fkey(
            id, first_name, last_name, avatar_url
          )
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['thread-messages', data.thread_id] })
      qc.invalidateQueries({ queryKey: ['fils'] })
    },
  })
}

// ─── RÉACTIONS SUR MESSAGES DE FIL ───────────────────────────

export function useToggleThreadReaction() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, emoji, threadId }) => {
      const { data: msg } = await supabase
        .from('communication_thread_messages')
        .select('reactions')
        .eq('id', messageId)
        .single()

      const reactions = msg?.reactions || {}
      const users = reactions[emoji] || []
      const hasReacted = users.includes(profile.id)

      const newUsers = hasReacted
        ? users.filter(id => id !== profile.id)
        : [...users, profile.id]

      const newReactions = { ...reactions }
      if (newUsers.length === 0) delete newReactions[emoji]
      else newReactions[emoji] = newUsers

      const { error } = await supabase
        .from('communication_thread_messages')
        .update({ reactions: newReactions })
        .eq('id', messageId)

      if (error) throw error
      return threadId
    },
    onSuccess: (threadId) => {
      qc.invalidateQueries({ queryKey: ['thread-messages', threadId] })
    },
  })
}

// ─── REALTIME FILS ───────────────────────────────────────────

export function useThreadRealtime(threadId) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!threadId) return

    const channel = supabase
      .channel(`thread:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communication_thread_messages',
        filter: `thread_id=eq.${threadId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['thread-messages', threadId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [threadId, qc])
}

// ─── ENTITÉS DISPONIBLES ─────────────────────────────────────

export const ENTITY_TYPE_LABELS = {
  project:   'Projet',
  objective: 'Objectif OKR',
  campaign:  'Campagne d\'entretiens',
  review:    'Entretien annuel',
  task:      'Tâche',
}

export const ENTITY_TYPE_COLORS = {
  project:   '#06B6D4',
  objective: '#8B5CF6',
  campaign:  '#F59E0B',
  review:    '#10B981',
  task:      '#3B82F6',
}
