// ============================================================
// APEX RH — TaskDetailTabComments.jsx  ·  S125-C
// Commentaires enrichis avec @mentions
// ============================================================
import { useState, useRef } from 'react'
import { useAuth }            from '../../contexts/AuthContext'
import { useTaskComments, useCommentMutations, useAllUsers } from '../../hooks/useTasks'
import { getUserInitials, getUserFullName }  from '../../lib/taskHelpers'

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = (new Date() - new Date(dateStr)) / 1000
  if (diff < 60)    return "À l'instant"
  if (diff < 3600)  return `Il y a ${Math.floor(diff/60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff/3600)} h`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })
}

// Transforme "@[Prénom Nom](userId)" en badges colorés
function renderContent(content) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/)
    if (m) {
      return (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/20 text-indigo-300">
          @{m[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── Composant mention picker ─────────────────────────────────
function MentionPicker({ users, query, onSelect }) {
  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6)

  if (!filtered.length) return null

  return (
    <div className="absolute bottom-full left-0 mb-1 z-20 w-52 bg-[#1a1a35] border border-white/10 rounded-xl shadow-xl overflow-hidden">
      {filtered.map(u => (
        <button key={u.id} onMouseDown={e => { e.preventDefault(); onSelect(u) }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left transition-colors">
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
            {getUserInitials(u)}
          </div>
          <span className="text-xs text-gray-200">{getUserFullName(u)}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function TaskDetailTabComments({ taskId }) {
  const { profile }                          = useAuth()
  const { data: comments = [], isLoading }   = useTaskComments(taskId)
  const { addComment, deleteComment }        = useCommentMutations(taskId)
  const { data: allUsers = [] }              = useAllUsers()
  const [text, setText]                      = useState('')
  const [submitting, setSubmitting]          = useState(false)
  const [mentionQuery, setMentionQuery]      = useState(null) // null = fermé
  const inputRef                             = useRef(null)

  // Détecte @ dans l'input
  function handleChange(e) {
    const val = e.target.value
    setText(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1)
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        setMentionQuery(afterAt)
        return
      }
    }
    setMentionQuery(null)
  }

  function handleMentionSelect(user) {
    const lastAt = text.lastIndexOf('@')
    const before = text.slice(0, lastAt)
    const token  = `@[${getUserFullName(user)}](${user.id}) `
    setText(before + token)
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await addComment.mutateAsync(text.trim())
      setText('')
      setMentionQuery(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-xs text-gray-500">Chargement...</div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Aucun commentaire. Soyez le premier !</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {getUserInitials(comment.users)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-200">{getUserFullName(comment.users)}</span>
                  <span className="text-[10px] text-gray-500">{timeAgo(comment.created_at)}</span>
                  {comment.user_id === profile?.id && (
                    <button onClick={() => deleteComment.mutate(comment.id)}
                      className="ml-auto text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-300 bg-white/5 rounded-lg px-3 py-2 border border-white/5 leading-relaxed">
                  {renderContent(comment.content)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {getUserInitials(profile)}
        </div>
        <div className="flex-1 flex gap-2 relative">
          {mentionQuery !== null && (
            <MentionPicker users={allUsers} query={mentionQuery} onSelect={handleMentionSelect} />
          )}
          <input ref={inputRef} type="text" value={text} onChange={handleChange}
            onKeyDown={e => e.key === 'Escape' && setMentionQuery(null)}
            placeholder="Écrire un commentaire... (@ pour mentionner)"
            className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          <button type="submit" disabled={!text.trim() || submitting}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
