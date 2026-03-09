// ============================================================
// APEX RH — hooks/useMessages.js
// Session S65 — Communication Interne
// CRUD messages + Realtime subscription par canal
// ============================================================
import { useEffect } from 'react'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PAGE_SIZE = 40

// ─── MESSAGES D'UN CANAL (infinite scroll vers le haut) ──────

export function useMessages(channelId) {
  const { profile } = useAuth()

  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    enabled: !!channelId,
    staleTime: 5_000,
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined
      return lastPage[lastPage.length - 1]?.created_at
    },
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('communication_messages')
        .select(`
          *,
          author:users!communication_messages_author_id_fkey(
            id, first_name, last_name, avatar_url, role
          ),
          reply_to:communication_messages!communication_messages_reply_to_id_fkey(
            id, content, author_id,
            reply_author:users!communication_messages_author_id_fkey(first_name, last_name)
          )
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        q = q.lt('created_at', pageParam)
      }

      const { data, error } = await q
      if (error) throw error

      // Remettre dans l'ordre chronologique
      return (data || []).reverse()
    },
  })
}

// ─── ENVOYER UN MESSAGE ──────────────────────────────────────

export function useSendMessage() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ channelId, content, replyToId = null, attachments = [] }) => {
      const { data, error } = await supabase
        .from('communication_messages')
        .insert({
          channel_id: channelId,
          organization_id: profile.organization_id,
          author_id: profile.id,
          content: content.trim(),
          reply_to_id: replyToId,
          attachments,
          read_by: [profile.id],
        })
        .select(`
          *,
          author:users!communication_messages_author_id_fkey(
            id, first_name, last_name, avatar_url, role
          )
        `)
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ channelId, content, replyToId }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['messages', channelId] })
      const prev = qc.getQueryData(['messages', channelId])

      const tempMsg = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        content,
        reply_to_id: replyToId,
        author_id: profile.id,
        author: {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
        },
        reactions: {},
        read_by: [profile.id],
        created_at: new Date().toISOString(),
        _optimistic: true,
      }

      qc.setQueryData(['messages', channelId], (old) => {
        if (!old) return old
        const newPages = [...old.pages]
        const lastPage = [...(newPages[newPages.length - 1] || [])]
        lastPage.push(tempMsg)
        newPages[newPages.length - 1] = lastPage
        return { ...old, pages: newPages }
      })

      return { prev }
    },
    onError: (_, { channelId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['messages', channelId], ctx.prev)
    },
    onSuccess: (data, { channelId }) => {
      qc.invalidateQueries({ queryKey: ['messages', channelId] })
      qc.invalidateQueries({ queryKey: ['communication-channels'] })
      qc.invalidateQueries({ queryKey: ['communication-unread'] })
    },
  })
}

// ─── MODIFIER UN MESSAGE ─────────────────────────────────────

export function useEditMessage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, content }) => {
      const { data, error } = await supabase
        .from('communication_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['messages', data.channel_id] })
    },
  })
}

// ─── SUPPRIMER UN MESSAGE (soft delete) ──────────────────────

export function useDeleteMessage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, channelId }) => {
      const { error } = await supabase
        .from('communication_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)

      if (error) throw error
      return { messageId, channelId }
    },
    onSuccess: ({ channelId }) => {
      qc.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })
}

// ─── RÉACTIONS ───────────────────────────────────────────────

export function useToggleReaction() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, emoji, channelId }) => {
      // Récupérer les réactions actuelles
      const { data: msg } = await supabase
        .from('communication_messages')
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
      if (newUsers.length === 0) {
        delete newReactions[emoji]
      } else {
        newReactions[emoji] = newUsers
      }

      const { data, error } = await supabase
        .from('communication_messages')
        .update({ reactions: newReactions })
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error
      return { ...data, channelId }
    },
    onSuccess: ({ channelId }) => {
      qc.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })
}

// ─── MARQUER COMME LU ────────────────────────────────────────

export function useMarkAsRead() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (channelId) => {
      // Marquer tous les messages non lus du canal
      const { error } = await supabase.rpc('mark_channel_messages_read', {
        p_channel_id: channelId,
        p_user_id: profile.id,
      })

      // Fallback si la fonction RPC n'existe pas encore
      if (error) {
        const { data: unread } = await supabase
          .from('communication_messages')
          .select('id, read_by')
          .eq('channel_id', channelId)
          .not('read_by', 'cs', `{${profile.id}}`)
          .is('deleted_at', null)
          .limit(100)

        if (unread?.length) {
          for (const msg of unread) {
            await supabase
              .from('communication_messages')
              .update({ read_by: [...(msg.read_by || []), profile.id] })
              .eq('id', msg.id)
          }
        }
      }

      return channelId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-unread'] })
    },
  })
}

// ─── REALTIME : messages d'un canal ──────────────────────────

export function useMessagesRealtime(channelId) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communication_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        // Si c'est notre propre message on skip (optimistic update déjà là)
        if (payload.new?.author_id === profile?.id) return

        qc.invalidateQueries({ queryKey: ['messages', channelId] })
        qc.invalidateQueries({ queryKey: ['communication-unread'] })
        qc.invalidateQueries({ queryKey: ['communication-channels'] })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'communication_messages',
        filter: `channel_id=eq.${channelId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['messages', channelId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId, qc, profile?.id])
}

// ─── UPLOAD PIÈCE JOINTE ─────────────────────────────────────

export async function uploadAttachment(file, orgId) {
  const ext  = file.name.split('.').pop()
  const path = `${orgId}/communication/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(path)

  return {
    name: file.name,
    url: urlData.publicUrl,
    type: file.type,
    size: file.size,
  }
}
