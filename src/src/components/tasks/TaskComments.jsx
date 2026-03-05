// ============================================================
// APEX RH — TaskComments.jsx
// ✅ Session 9 — Corrigé : user→profile pour initiales et nom
// ============================================================
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTaskComments, useCommentMutations } from '../../hooks/useTasks'
import { getUserInitials, getUserFullName } from '../../lib/taskHelpers'

export default function TaskComments({ taskId }) {
  // ✅ FIX Bug 1 : utiliser `profile` pour les infos utilisateur (first_name, last_name)
  const { profile } = useAuth()
  const { data: comments = [], isLoading } = useTaskComments(taskId)
  const { addComment, deleteComment } = useCommentMutations(taskId)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await addComment.mutateAsync(text.trim())
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return 'À l\'instant'
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-xs text-gray-500">Chargement...</div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Aucun commentaire pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {getUserInitials(comment.users)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-200">
                    {getUserFullName(comment.users)}
                  </span>
                  <span className="text-[10px] text-gray-500">{formatTime(comment.created_at)}</span>
                  {/* ✅ FIX : comparer avec profile.id */}
                  {comment.user_id === profile?.id && (
                    <button
                      onClick={() => deleteComment.mutate(comment.id)}
                      className="ml-auto text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-300 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                  {comment.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {/* ✅ FIX Bug 1 : profile au lieu de user pour les initiales */}
          {getUserInitials(profile)}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Écrire un commentaire..."
            className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
