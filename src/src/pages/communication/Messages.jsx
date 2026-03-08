// ============================================================
// APEX RH — pages/communication/Messages.jsx
// Session S65 — Messagerie temps réel — canaux + 1:1
// ============================================================
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Plus, Hash, Users, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useChannels, useUnreadCount, useChannelsRealtime, useCreateChannel,
} from '../../hooks/useCommunication'
import ConversationList from '../../components/communication/ConversationList'
import MessageThread    from '../../components/communication/MessageThread'
import { useAuth }      from '../../contexts/AuthContext'

// ─── MODAL NOUVEAU CANAL ─────────────────────────────────────

function CreateChannelModal({ onClose }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'thematic', color: '#06B6D4', is_private: false })
  const createChannel   = useCreateChannel()
  const [err, setErr]   = useState('')

  const COLORS = ['#06B6D4','#8B5CF6','#10B981','#F59E0B','#EF4444','#3B82F6','#C9A227']

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr('Le nom est requis'); return }
    await createChannel.mutateAsync(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: '#090920', border: '1px solid rgba(255,255,255,0.1)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
            Nouveau canal
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Nom *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">#</span>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s/g, '-') }))}
                placeholder="nom-du-canal"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-7 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Description</label>
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="À quoi sert ce canal ?"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'thematic', label: 'Thématique', icon: Hash },
                { value: 'team',     label: 'Équipe',     icon: Users },
                { value: 'division', label: 'Division',   icon: Users },
                { value: 'private',  label: 'Privé',      icon: Lock },
              ].map(t => {
                const Icon = t.icon
                return (
                  <button key={t.value} onClick={() => setForm(p => ({ ...p, type: t.value }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-all ${
                      form.type === t.value
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/70'
                    }`}>
                    <Icon size={12}/> {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Couleur */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: c,
                    border: form.color === c ? `3px solid white` : `2px solid transparent`,
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                  }}/>
              ))}
            </div>
          </div>

          {err && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={createChannel.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0891B2,#0E7490)' }}>
            {createChannel.isPending ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            Créer le canal
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function MessagesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: channels = [], isLoading } = useChannels()
  const { data: unreadTotal = 0 }          = useUnreadCount()
  const [activeChannel, setActiveChannel]  = useState(null)
  const [showCreate, setShowCreate]        = useState(false)
  const [mobileSidebar, setMobileSidebar]  = useState(true)

  useChannelsRealtime()

  // Sélectionner le canal général par défaut
  const defaultChannel = channels.find(c => c.type === 'general') || channels[0]
  const currentChannel = activeChannel || defaultChannel

  // Unread par canal (placeholder — idéalement depuis un hook dédié)
  const unreadCounts = {}

  const handleSelectChannel = useCallback((channel) => {
    setActiveChannel(channel)
    setMobileSidebar(false)
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar canaux */}
      <div className={`flex-shrink-0 border-r border-white/[0.06] transition-all overflow-hidden ${
        mobileSidebar ? 'w-full md:w-60' : 'hidden md:flex md:w-60'
      }`}
        style={{ background: 'rgba(255,255,255,0.01)' }}>

        {/* Back button (mobile) */}
        <div className="md:hidden flex items-center gap-2 px-4 pt-3 pb-1">
          <button onClick={() => navigate('/communication')}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={13}/> Communication
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={16} className="animate-spin text-white/30"/>
          </div>
        ) : (
          <ConversationList
            channels={channels}
            activeChannelId={currentChannel?.id}
            onSelectChannel={handleSelectChannel}
            onCreateChannel={() => setShowCreate(true)}
            unreadCounts={unreadCounts}
          />
        )}
      </div>

      {/* Zone messages */}
      <div className={`flex-1 flex flex-col min-w-0 relative ${mobileSidebar ? 'hidden md:flex' : 'flex'}`}>
        {/* Header mini (mobile) */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] flex-shrink-0">
          <button onClick={() => setMobileSidebar(true)} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={14}/>
          </button>
          {currentChannel && (
            <span className="text-sm font-semibold text-white"># {currentChannel.name}</span>
          )}
        </div>

        {currentChannel ? (
          <MessageThread channel={currentChannel}/>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={40} className="mx-auto mb-3 text-white/15"/>
              <p className="text-sm font-semibold text-white/40 mb-1">Aucun canal sélectionné</p>
              <p className="text-xs text-white/25">Choisissez un canal dans la liste</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal création canal */}
      <AnimatePresence>
        {showCreate && <CreateChannelModal onClose={() => setShowCreate(false)}/>}
      </AnimatePresence>
    </div>
  )
}
