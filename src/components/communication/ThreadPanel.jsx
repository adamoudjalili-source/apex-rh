// ============================================================
// APEX RH — components/communication/ThreadPanel.jsx
// Session S65 — Fil de discussion contextuel (projet, objectif…)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'
import {
  useEntityThread, useCreateThread, useThreadMessages,
  useThreadRealtime, useSendThreadMessage, useToggleThreadReaction,
  ENTITY_TYPE_LABELS, ENTITY_TYPE_COLORS,
} from '../../hooks/useFils'
import { useAuth } from '../../contexts/AuthContext'

const EMOJIS = ['👍','❤️','😂','🎉','👏','✅']

function Avatar({ user, size = 28 }) {
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('')
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}/>
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
      style={{ width: size, height: size, background: '#06B6D4' }}>
      {initials || '?'}
    </div>
  )
}

function ThreadMessage({ msg, myId, threadId }) {
  const toggle = useToggleThreadReaction()
  const [showEmoji, setShowEmoji] = useState(false)
  const isOwn = msg.author_id === myId
  const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const reactions = msg.reactions || {}

  return (
    <div className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar user={msg.author} size={26}/>
      <div className={`flex flex-col max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-white/60">{msg.author?.first_name}</span>
            <span className="text-[10px] text-white/25">{time}</span>
          </div>
        )}
        <div
          className="px-3 py-2 rounded-xl text-xs leading-relaxed break-words"
          style={isOwn
            ? { background: 'linear-gradient(135deg,#0891B2,#0E7490)', color: 'white' }
            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {msg.content}
        </div>
        {isOwn && <span className="text-[9px] text-white/25 mt-0.5">{time}</span>}

        {/* Réactions */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactions).filter(([,u]) => u.length).map(([emoji, users]) => (
              <button key={emoji}
                onClick={() => toggle.mutate({ messageId: msg.id, emoji, threadId })}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                  users.includes(myId)
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-white/10 bg-white/[0.04] text-white/40'
                }`}>
                {emoji} {users.length}
              </button>
            ))}
          </div>
        )}

        {/* Emoji hover */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
          <button onClick={() => setShowEmoji(o => !o)}
            className="text-[10px] px-1.5 py-0.5 rounded text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            + 😊
          </button>
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-full mb-1 left-0 flex gap-1 p-1.5 rounded-xl border border-white/[0.1] bg-[#0d0d2b] shadow-xl z-20">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { toggle.mutate({ messageId: msg.id, emoji: e, threadId }); setShowEmoji(false) }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/[0.1] transition-colors text-sm">
                    {e}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

export default function ThreadPanel({
  entityType,
  entityId,
  entityTitle,
  onClose,
  className = '',
}) {
  const { profile } = useAuth()
  const [text, setText] = useState('')

  const { data: thread, isLoading: loadingThread } = useEntityThread(entityType, entityId)
  const createThread  = useCreateThread()
  const { data: messages = [], isLoading: loadingMsgs } = useThreadMessages(thread?.id)
  const sendMessage   = useSendThreadMessage()

  useThreadRealtime(thread?.id)

  const color = ENTITY_TYPE_COLORS[entityType] || '#06B6D4'
  const label = ENTITY_TYPE_LABELS[entityType] || 'Discussion'

  const handleSend = async () => {
    if (!text.trim()) return

    let threadId = thread?.id
    if (!threadId) {
      const created = await createThread.mutateAsync({ entityType, entityId, title: entityTitle })
      threadId = created.id
    }

    await sendMessage.mutateAsync({ threadId, content: text.trim() })
    setText('')
  }

  const isLoading = sendMessage.isPending || createThread.isPending

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${className}`}
      style={{ background: '#090920', border: '1px solid rgba(255,255,255,0.09)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0"
        style={{ background: `linear-gradient(135deg,${color}10,transparent)` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <MessageSquare size={13} style={{ color }}/>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">{entityTitle || 'Discussion'}</p>
            <p className="text-[10px] text-white/30">{label}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {(loadingThread || loadingMsgs) ? (
          <div className="flex justify-center py-8">
            <Loader2 size={16} className="animate-spin text-white/30"/>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10">
            <MessageSquare size={28} className="mb-3 text-white/15"/>
            <p className="text-xs text-white/30 text-center">
              Pas encore de discussion.<br/>Soyez le premier à commenter.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <ThreadMessage key={msg.id} msg={msg} myId={profile?.id} threadId={thread?.id}/>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2 flex-shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ajouter un commentaire..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/30 transition-colors"
        />
        <button onClick={handleSend} disabled={!text.trim() || isLoading}
          className="p-2 rounded-xl transition-all disabled:opacity-30 flex-shrink-0"
          style={{ background: isLoading || !text.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#0891B2,#0E7490)' }}>
          {isLoading
            ? <Loader2 size={14} className="animate-spin text-white"/>
            : <Send size={14} className="text-white"/>}
        </button>
      </div>
    </div>
  )
}
