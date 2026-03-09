// ============================================================
// APEX RH — components/communication/MessageThread.jsx
// Session S65 — Fil de messages d'une conversation
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CornerDownRight, Edit2, Trash2, SmilePlus, BrainCircuit,
  Loader2, ChevronUp, Pin, AlertTriangle,
} from 'lucide-react'
import { useMessages, useMessagesRealtime, useToggleReaction,
         useDeleteMessage, useMarkAsRead } from '../../hooks/useMessages'
import { useAISummary, useGenerateAISummary } from '../../hooks/useCommunication'
import { useAuth } from '../../contexts/AuthContext'
import MessageInput from './MessageInput'

const EMOJIS = ['👍','❤️','😂','😮','😢','🎉','👏','🔥']

function Avatar({ user, size = 32 }) {
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('')
  const colors = ['#06B6D4','#8B5CF6','#10B981','#F59E0B','#EF4444','#3B82F6']
  const color  = colors[(user?.id?.charCodeAt(0) || 0) % colors.length]

  if (user?.avatar_url) {
    return (
      <img src={user.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}/>
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials || '?'}
    </div>
  )
}

function ReactionPill({ emoji, users, onToggle, myId }) {
  const mine = users.includes(myId)
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
        mine
          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
          : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70'
      }`}>
      <span>{emoji}</span>
      <span className="font-medium">{users.length}</span>
    </button>
  )
}

function MessageBubble({ msg, isOwn, onReply, onEdit, onDelete, onReact, myId }) {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })

  const reactions = msg.reactions || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : ''} ${msg._optimistic ? 'opacity-60' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false) }}>

      {/* Avatar */}
      {!isOwn && <Avatar user={msg.author} size={28}/>}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[72%]`}>
        {/* Nom + heure */}
        {!isOwn && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-semibold text-white/70">
              {msg.author?.first_name} {msg.author?.last_name}
            </span>
            <span className="text-[10px] text-white/30">{time}</span>
            {msg.edited_at && <span className="text-[10px] text-white/20 italic">modifié</span>}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div className="flex items-start gap-1.5 mb-1 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] max-w-full">
            <CornerDownRight size={11} className="text-white/30 flex-shrink-0 mt-0.5"/>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white/50 truncate">
                {msg.reply_to?.reply_author?.first_name}
              </p>
              <p className="text-[10px] text-white/30 truncate">{msg.reply_to?.content}</p>
            </div>
          </div>
        )}

        {/* Bulle */}
        <div className={`relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
          isOwn
            ? 'text-white rounded-tr-sm'
            : 'text-white/85 rounded-tl-sm'
        }`}
          style={isOwn
            ? { background: 'linear-gradient(135deg,#0891B2,#0E7490)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {msg.deleted_at ? (
            <span className="italic text-white/30 text-xs flex items-center gap-1">
              <Trash2 size={11}/> Message supprimé
            </span>
          ) : (
            <>
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>

              {/* Pièces jointes */}
              {msg.attachments?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.attachments.map((att, i) => (
                    <a key={att.url || i} href={att.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-xs text-white/70">
                      📎 {att.name}
                      <span className="text-white/30 ml-auto">
                        {att.size > 1024*1024
                          ? `${(att.size/1024/1024).toFixed(1)} Mo`
                          : `${Math.round(att.size/1024)} Ko`}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Heure pour les messages own */}
        {isOwn && (
          <div className="flex items-center gap-1.5 mt-0.5 px-1">
            <span className="text-[10px] text-white/25">{time}</span>
            {msg.edited_at && <span className="text-[10px] text-white/20 italic">modifié</span>}
          </div>
        )}

        {/* Réactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactions).map(([emoji, users]) => (
              <ReactionPill
                key={emoji} emoji={emoji} users={users} myId={myId}
                onToggle={() => onReact(msg.id, emoji)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions au survol */}
      <AnimatePresence>
        {showActions && !msg.deleted_at && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.1 }}
            className={`self-start flex items-center gap-0.5 px-1.5 py-1 rounded-xl border border-white/[0.08] bg-[#0a0a24] mt-1 ${isOwn ? 'mr-2' : 'ml-2'}`}>

            {/* Emoji picker */}
            <div className="relative">
              <button onClick={() => setShowEmojiPicker(o => !o)}
                className="p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <SmilePlus size={13}/>
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute bottom-full mb-1 left-0 flex gap-1 p-1.5 rounded-xl border border-white/[0.1] bg-[#0d0d2b] shadow-xl z-50">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => { onReact(msg.id, e); setShowEmojiPicker(false) }}
                        className="w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-white/[0.1] transition-colors">
                        {e}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => onReply(msg)}
              className="p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
              title="Répondre">
              <CornerDownRight size={13}/>
            </button>

            {isOwn && (
              <>
                <button onClick={() => onEdit(msg)}
                  className="p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                  title="Modifier">
                  <Edit2 size={13}/>
                </button>
                <button onClick={() => onDelete(msg)}
                  className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Supprimer">
                  <Trash2 size={13}/>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── DATE SEPARATOR ──────────────────────────────────────────
function DateSeparator({ date }) {
  const label = (() => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
    if (d.toDateString() === yesterday.toDateString()) return 'Hier'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  })()

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/[0.06]"/>
      <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]"/>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

export default function MessageThread({ channel }) {
  const { profile } = useAuth()
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)
  const [replyTo, setReplyTo]   = useState(null)
  const [editMsg, setEditMsg]   = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [autoScroll, setAutoScroll]   = useState(true)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(channel?.id)
  const { data: aiSummary }  = useAISummary(channel?.id)
  const generateSummary      = useGenerateAISummary()
  const toggleReaction       = useToggleReaction()
  const deleteMessage        = useDeleteMessage()
  const markAsRead           = useMarkAsRead()

  useMessagesRealtime(channel?.id)

  // Flatten pages
  const messages = data?.pages?.flat() || []

  // Grouper par date
  const grouped = messages.reduce((acc, msg) => {
    const date = msg.created_at?.split('T')[0]
    if (!acc.length || acc[acc.length - 1].date !== date) {
      acc.push({ date, messages: [msg] })
    } else {
      acc[acc.length - 1].messages.push(msg)
    }
    return acc
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, autoScroll])

  // Marquer lu à l'ouverture
  useEffect(() => {
    if (channel?.id) {
      markAsRead.mutate(channel.id)
    }
  }, [channel?.id, markAsRead])

  // Scroll handler
  const handleScroll = useCallback((e) => {
    const el = e.target
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAutoScroll(atBottom)

    // Load more quand on scroll en haut
    if (el.scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
      const prevScrollHeight = el.scrollHeight
      fetchNextPage().then(() => {
        el.scrollTop = el.scrollHeight - prevScrollHeight
      })
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleReact = useCallback((msgId, emoji) => {
    toggleReaction.mutate({ messageId: msgId, emoji, channelId: channel?.id })
  }, [toggleReaction, channel?.id])

  const handleDelete = useCallback((msg) => {
    if (window.confirm('Supprimer ce message ?')) {
      deleteMessage.mutate({ messageId: msg.id, channelId: channel?.id })
    }
  }, [deleteMessage, channel?.id])

  const handleGenerateSummary = useCallback(async () => {
    if (messages.length < 5) return
    await generateSummary.mutateAsync({ channelId: channel.id, messages })
    setShowSummary(true)
  }, [generateSummary, channel?.id, messages])

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircleIcon size={40} className="mx-auto mb-3 text-white/15"/>
          <p className="text-sm text-white/30">Sélectionnez un canal pour commencer</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header canal */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-white font-semibold"># {channel.name}</span>
          {channel.description && (
            <span className="text-xs text-white/30 border-l border-white/[0.08] pl-2.5">
              {channel.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateSummary}
            disabled={generateSummary.isPending || messages.length < 5}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 border border-white/[0.08] hover:border-purple-500/30 hover:bg-purple-500/10 transition-all disabled:opacity-40"
            title="Résumé IA de la conversation">
            {generateSummary.isPending
              ? <Loader2 size={12} className="animate-spin"/>
              : <BrainCircuit size={12}/>}
            Résumé IA
          </button>
        </div>
      </div>

      {/* Résumé IA */}
      <AnimatePresence>
        {showSummary && aiSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 my-2 p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 mb-1.5">
                <BrainCircuit size={13} style={{ color: '#A78BFA' }}/>
                <span className="text-xs font-semibold text-purple-300">Résumé IA</span>
                <span className="text-[10px] text-white/30">
                  {aiSummary.msg_count} messages analysés
                </span>
              </div>
              <button onClick={() => setShowSummary(false)} className="text-white/30 hover:text-white/60">
                ✕
              </button>
            </div>
            <p className="text-xs text-white/65 leading-relaxed">{aiSummary.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0">

        {/* Loader pagination */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-white/30"/>
          </div>
        )}

        {messages.length === 0 && !isFetchingNextPage && (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <span className="text-3xl">#</span>
            </div>
            <h3 className="text-sm font-semibold text-white/60 mb-1">
              Début de {channel.name}
            </h3>
            <p className="text-xs text-white/30">
              C'est le tout début de ce canal. Soyez le premier à écrire !
            </p>
          </div>
        )}

        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date}>
            <DateSeparator date={date}/>
            <div className="space-y-1">
              {dayMsgs.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.author_id === profile?.id}
                  myId={profile?.id}
                  onReply={setReplyTo}
                  onEdit={setEditMsg}
                  onDelete={handleDelete}
                  onReact={handleReact}
                />
              ))}
            </div>
          </div>
        ))}

        <div ref={bottomRef}/>
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-20 right-8 z-10">
            <button
              onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg transition-colors">
              <ChevronUp size={12} className="rotate-180"/>
              Nouveaux messages
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <MessageInput
          channelId={channel.id}
          channelName={channel.name}
          replyTo={replyTo}
          editMsg={editMsg}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditMsg(null)}
          onSent={() => { setReplyTo(null); setEditMsg(null); setAutoScroll(true) }}
        />
      </div>
    </div>
  )
}

// Icon placeholder
function MessageCircleIcon({ size, className }) {
  return <span className={className} style={{ fontSize: size }}>💬</span>
}
