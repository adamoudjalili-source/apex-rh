// ============================================================
// APEX RH — components/communication/MessageInput.jsx
// Session S65 — Zone de saisie messages + pièces jointes + emoji
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, SmilePlus, X, CornerDownRight, Edit2, Loader2, File } from 'lucide-react'
import { useSendMessage, useEditMessage, uploadAttachment } from '../../hooks/useMessages'
import { useAuth } from '../../contexts/AuthContext'

const EMOJIS_PICKER = [
  '😀','😂','😍','🥰','😎','🤔','😮','😢','😡','👍','👎','❤️',
  '🎉','🔥','✅','❌','⭐','💡','📌','🚀','💪','👋','🙏','👏',
]

export default function MessageInput({
  channelId,
  channelName = 'ce canal',
  replyTo,
  editMsg,
  onCancelReply,
  onCancelEdit,
  onSent,
}) {
  const { profile } = useAuth()
  const [text, setText]               = useState('')
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading]     = useState(false)
  const [showEmoji, setShowEmoji]     = useState(false)
  const textareaRef                   = useRef(null)
  const fileInputRef                  = useRef(null)

  const sendMessage = useSendMessage()
  const editMessage = useEditMessage()

  // Pre-fill on edit
  useEffect(() => {
    if (editMsg) {
      setText(editMsg.content || '')
      textareaRef.current?.focus()
    }
  }, [editMsg?.id])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content && attachments.length === 0) return

    if (editMsg) {
      await editMessage.mutateAsync({ messageId: editMsg.id, content })
    } else {
      await sendMessage.mutateAsync({
        channelId,
        content,
        replyToId: replyTo?.id || null,
        attachments,
      })
    }

    setText('')
    setAttachments([])
    onSent?.()
  }, [text, attachments, editMsg, replyTo, channelId, sendMessage, editMessage, onSent])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      if (editMsg) onCancelEdit?.()
      if (replyTo) onCancelReply?.()
      setShowEmoji(false)
    }
  }, [handleSend, editMsg, replyTo, onCancelEdit, onCancelReply])

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      const uploaded = await Promise.all(
        files.map(f => uploadAttachment(f, profile.org_id))
      )
      setAttachments(prev => [...prev, ...uploaded])
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [profile?.org_id])

  const removeAttachment = useCallback((idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const insertEmoji = useCallback((emoji) => {
    const ta = textareaRef.current
    const start = ta?.selectionStart ?? text.length
    const end   = ta?.selectionEnd   ?? text.length
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    setShowEmoji(false)
    setTimeout(() => {
      ta?.focus()
      ta?.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }, [text])

  const isLoading = sendMessage.isPending || editMessage.isPending || uploading
  const canSend   = (text.trim().length > 0 || attachments.length > 0) && !isLoading

  return (
    <div className="relative">
      {/* Reply / Edit indicator */}
      <AnimatePresence>
        {(replyTo || editMsg) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 mb-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03]">
            {replyTo
              ? <CornerDownRight size={13} className="text-cyan-400 flex-shrink-0"/>
              : <Edit2 size={13} className="text-amber-400 flex-shrink-0"/>}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/50">
                {replyTo ? `Répondre à ${replyTo.author?.first_name}` : 'Modifier le message'}
              </p>
              <p className="text-[11px] text-white/30 truncate">
                {replyTo?.content || editMsg?.content}
              </p>
            </div>
            <button
              onClick={replyTo ? onCancelReply : onCancelEdit}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <X size={13}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div key={i}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] text-xs text-white/70">
              <File size={11}/>
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button onClick={() => removeAttachment(i)}
                className="text-white/30 hover:text-red-400 ml-1">
                <X size={10}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-2 rounded-2xl border transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}>

        {/* Emoji */}
        <div className="relative flex-shrink-0 self-end pb-0.5">
          <button
            onClick={() => setShowEmoji(o => !o)}
            className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
            <SmilePlus size={16}/>
          </button>
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.13 }}
                className="absolute bottom-full mb-2 left-0 p-2 rounded-2xl border border-white/[0.1] bg-[#0d0d2b] shadow-2xl z-50 w-64">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS_PICKER.map(e => (
                    <button key={e} onClick={() => insertEmoji(e)}
                      className="w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-white/[0.1] transition-colors">
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message dans #${channelName}…`}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none focus:outline-none py-2 leading-relaxed"
          style={{ maxHeight: 160 }}
        />

        {/* Pièce jointe */}
        <div className="flex-shrink-0 self-end pb-0.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors disabled:opacity-40">
            {uploading ? <Loader2 size={16} className="animate-spin"/> : <Paperclip size={16}/>}
          </button>
        </div>

        {/* Envoyer */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-shrink-0 self-end mb-0.5 p-2 rounded-xl font-medium transition-all disabled:opacity-30"
          style={canSend
            ? { background: 'linear-gradient(135deg,#0891B2,#0E7490)', color: 'white' }
            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
          {isLoading
            ? <Loader2 size={16} className="animate-spin"/>
            : <Send size={16}/>}
        </button>
      </div>

      {/* Tip */}
      <p className="text-[10px] text-white/20 mt-1.5 pl-2">
        Entrée pour envoyer · Maj+Entrée pour sauter une ligne
      </p>
    </div>
  )
}
