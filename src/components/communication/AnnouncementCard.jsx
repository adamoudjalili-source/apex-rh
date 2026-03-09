// ============================================================
// APEX RH — components/communication/AnnouncementCard.jsx
// Session S65 — base | S87 — badge important + stats lecture + auto-mark read
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pin, MessageSquare, Eye, ChevronDown, ChevronUp, Trash2, Edit2, Send, AlertCircle, BarChart2 } from 'lucide-react'
import { useToggleAnnonceReaction, useAnnonceComments, useAddComment, useDeleteAnnonce, useTogglePin } from '../../hooks/useAnnonces'
import { useMarkAnnouncementRead } from '../../hooks/useCommunication'
import MessageStats from './MessageStats'
import { useAuth } from '../../contexts/AuthContext'

const EMOJIS = ['👍','❤️','😮','🎉','👏','🙏']

const ROLE_LABELS = {
  administrateur: 'Administrateur', directeur: 'Directeur',
  chef_division: 'Chef de Division', chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}
const ROLE_COLORS = {
  administrateur: '#EF4444', directeur: '#C9A227',
  chef_division: '#8B5CF6',  chef_service: '#3B82F6', collaborateur: '#10B981',
}

function Avatar({ user, size = 36 }) {
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('')
  const color = ROLE_COLORS[user?.role] || '#06B6D4'
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt="" className="rounded-full object-cover"
      style={{ width: size, height: size }}/>
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials || '?'}
    </div>
  )
}

function ReactionBar({ annonceId, reactions = {}, myId }) {
  const toggle = useToggleAnnonceReaction()
  const [showPicker, setShowPicker] = useState(false)
  const activeEmojis = Object.entries(reactions).filter(([, users]) => users.length > 0)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {activeEmojis.map(([emoji, users]) => (
        <button key={emoji}
          onClick={() => toggle.mutate({ annonceId, emoji })}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
            users.includes(myId)
              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
              : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20'
          }`}>
          {emoji} <span>{users.length}</span>
        </button>
      ))}
      <div className="relative">
        <button onClick={() => setShowPicker(o => !o)}
          className="px-2 py-0.5 rounded-full text-xs border border-white/10 bg-white/[0.03] text-white/30 hover:text-white/60 hover:border-white/20 transition-all">
          + Réagir
        </button>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="absolute bottom-full mb-1 left-0 flex gap-1 p-1.5 rounded-xl border border-white/[0.1] bg-[#0d0d2b] shadow-xl z-20">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { toggle.mutate({ annonceId, emoji: e }); setShowPicker(false) }}
                className="w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-white/[0.1] transition-colors">
                {e}
              </button>
            ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function CommentsSection({ annonceId }) {
  const { data: comments = [], isLoading } = useAnnonceComments(annonceId)
  const addComment = useAddComment()
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const handleSubmit = async () => {
    if (!text.trim()) return
    await addComment.mutateAsync({ annonceId, content: text.trim() })
    setText('')
  }
  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <p className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">
        Commentaires ({comments.length})
      </p>
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1,2].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded-lg"/>)}
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar user={c.author} size={26}/>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-white/70">
                    {c.author?.first_name} {c.author?.last_name}
                  </span>
                  <span className="text-[10px] text-white/25">
                    {new Date(c.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Avatar user={profile} size={26}/>
        <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="Ajouter un commentaire..."
            className="flex-1 bg-transparent text-xs text-white placeholder-white/25 focus:outline-none"
          />
          <button onClick={handleSubmit} disabled={!text.trim() || addComment.isPending}
            className="text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors">
            <Send size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementCard({ annonce, onEdit }) {
  const { profile } = useAuth()
  const [expanded, setExpanded]         = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showStats, setShowStats]       = useState(false)
  const deleteAnnonce = useDeleteAnnonce()
  const togglePin     = useTogglePin()
  const markRead      = useMarkAnnouncementRead()

  const isAdmin   = ['administrateur', 'directeur'].includes(profile?.role)
  const isAuthor  = annonce.author_id === profile?.id
  const canManage = isAdmin || isAuthor
  const isImportant = annonce.important === true

  // S87 — Auto-mark read après 2s
  useEffect(() => {
    if (!annonce?.id || !profile?.id) return
    const t = setTimeout(() => markRead.mutate(annonce.id), 2000)
    return () => clearTimeout(t)
  }, [annonce?.id, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pubDate = new Date(annonce.published_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const commentCount = annonce.comments?.[0]?.count || 0
  const viewCount    = annonce.views?.length || 0
  const needsExpand  = annonce.content?.length > 400

  // Ciblage rôles : S87 targeting_rules OU S65 target_roles
  const targetRoles = annonce.targeting_rules?.roles?.length
    ? annonce.targeting_rules.roles
    : (annonce.target_roles || [])

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: isImportant
          ? 'linear-gradient(135deg,rgba(239,68,68,0.05),rgba(255,255,255,0.02))'
          : annonce.pinned
            ? 'linear-gradient(135deg,rgba(201,162,39,0.06),rgba(255,255,255,0.02))'
            : 'rgba(255,255,255,0.02)',
        border: isImportant
          ? '1px solid rgba(239,68,68,0.25)'
          : annonce.pinned
            ? '1px solid rgba(201,162,39,0.25)'
            : '1px solid rgba(255,255,255,0.07)',
      }}>

      {/* S87 — Bandeau important */}
      {isImportant && (
        <div className="flex items-center gap-2 px-5 py-2"
          style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle size={12} style={{ color: '#EF4444' }}/>
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
            Annonce importante — accusé de lecture requis
          </span>
        </div>
      )}

      {annonce.cover_image_url && (
        <img src={annonce.cover_image_url} alt="" className="w-full h-40 object-cover"/>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar user={annonce.author} size={38}/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white/80">
                {annonce.author?.first_name} {annonce.author?.last_name}
              </span>
              {annonce.author?.role && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    color: ROLE_COLORS[annonce.author.role],
                    background: `${ROLE_COLORS[annonce.author.role]}18`,
                    border: `1px solid ${ROLE_COLORS[annonce.author.role]}30`,
                  }}>
                  {ROLE_LABELS[annonce.author.role]}
                </span>
              )}
              {annonce.pinned && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400">
                  <Pin size={9}/> Épinglée
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/30">{pubDate}</p>
          </div>

          {canManage && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {isAdmin && (
                <button onClick={() => setShowStats(o => !o)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showStats ? 'text-emerald-400 bg-emerald-400/10' : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-400/10'
                  }`}
                  title="Statistiques de lecture">
                  <BarChart2 size={13}/>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => togglePin.mutate({ id: annonce.id, pinned: !annonce.pinned })}
                  className={`p-1.5 rounded-lg transition-colors text-sm ${
                    annonce.pinned ? 'text-amber-400 bg-amber-400/10' : 'text-white/30 hover:text-amber-400 hover:bg-amber-400/10'
                  }`}
                  title={annonce.pinned ? 'Désépingler' : 'Épingler'}>
                  <Pin size={13}/>
                </button>
              )}
              <button onClick={() => onEdit?.(annonce)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <Edit2 size={13}/>
              </button>
              <button onClick={() => window.confirm('Supprimer cette annonce ?') && deleteAnnonce.mutate(annonce.id)}
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={13}/>
              </button>
            </div>
          )}
        </div>

        {/* S87 — Stats panel */}
        <AnimatePresence>
          {showStats && isAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden">
              <MessageStats announcementId={annonce.id} announcementTitle={annonce.title}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ciblage */}
        {targetRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {targetRoles.map(r => (
              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40 border border-white/[0.08]">
                {ROLE_LABELS[r] || r}
              </span>
            ))}
          </div>
        )}

        <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "'Syne',sans-serif" }}>
          {annonce.title}
        </h3>

        <div className={`text-sm text-white/65 leading-relaxed overflow-hidden transition-all ${
          !expanded && needsExpand ? 'max-h-24 relative' : ''
        }`} style={{ position: 'relative' }}>
          <div dangerouslySetInnerHTML={{ __html: annonce.content }}/>
          {!expanded && needsExpand && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0a0a20] to-transparent"/>
          )}
        </div>

        {needsExpand && (
          <button onClick={() => setExpanded(o => !o)}
            className="flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            {expanded ? <><ChevronUp size={12}/> Réduire</> : <><ChevronDown size={12}/> Lire la suite</>}
          </button>
        )}

        <div className="flex items-center justify-between mt-4">
          <ReactionBar annonceId={annonce.id} reactions={annonce.reactions} myId={profile?.id}/>
          <div className="flex items-center gap-3 text-[11px] text-white/25">
            <span className="flex items-center gap-1"><Eye size={11}/> {viewCount}</span>
            <button
              onClick={() => setShowComments(o => !o)}
              className="flex items-center gap-1 hover:text-white/50 transition-colors">
              <MessageSquare size={11}/> {commentCount}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}>
              <CommentsSection annonceId={annonce.id}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}
