// ============================================================
// APEX RH — MobileFeedbackCard.jsx  ·  Session 39
// Feedback 360° mobile — notation rapide 1 clic par compétence
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronRight } from 'lucide-react'
import { useSubmitFeedback, FEEDBACK_QUESTIONS } from '../../hooks/useFeedback360'

const QUICK_SCORES = [
  { value: 2,  emoji: '😟', label: 'Faible',    color: '#EF4444' },
  { value: 5,  emoji: '😐', label: 'Moyen',     color: '#F59E0B' },
  { value: 8,  emoji: '🙂', label: 'Bien',      color: '#3B82F6' },
  { value: 10, emoji: '🌟', label: 'Excellent', color: '#10B981' },
]

export default function MobileFeedbackCard({ request, onDone }) {
  const submitFeedback = useSubmitFeedback()

  const [scores, setScores]   = useState({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [step, setStep]       = useState(0) // 0 = quick mode, 1 = confirm

  const questions = FEEDBACK_QUESTIONS || [
    { key: 'quality',       label: 'Qualité du travail' },
    { key: 'deadlines',     label: 'Respect des délais' },
    { key: 'communication', label: 'Communication' },
    { key: 'teamwork',      label: 'Esprit d\'équipe' },
    { key: 'initiative',    label: 'Initiative' },
  ]

  const currentQ  = questions[step < questions.length ? step : questions.length - 1]
  const allScored = questions.every(q => scores[q.key] !== undefined)
  const progress  = Object.keys(scores).length / questions.length

  function selectScore(key, val) {
    const newScores = { ...scores, [key]: val }
    setScores(newScores)
    // Auto-advance to next question
    const nextIdx = questions.findIndex(q => newScores[q.key] === undefined)
    if (nextIdx >= 0) {
      setTimeout(() => setStep(nextIdx), 200)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const responses = questions.map(q => ({
        question_key: q.key,
        score:        scores[q.key] ?? 5,
        comment:      q.key === questions[questions.length - 1].key ? comment : null,
      }))
      await submitFeedback.mutateAsync({
        requestId: request.id,
        responses,
      })
      setDone(true)
      setTimeout(() => onDone?.(), 1200)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-10 gap-3">
        <CheckCircle size={48} className="text-green-400" />
        <p className="text-base font-bold text-white">Feedback envoyé !</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Feedback pour</p>
        <h3 className="text-lg font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          {request?.evaluated_name || 'Collègue'}
        </h3>
        <p className="text-sm text-white/40">{request?.campaign_title}</p>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-white/40">
          <span>{Object.keys(scores).length} / {questions.length} compétences</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question active */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="rounded-2xl p-4 space-y-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-base font-semibold text-white">{currentQ?.label}</p>

          <div className="grid grid-cols-4 gap-2">
            {QUICK_SCORES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => selectScore(currentQ?.key, s.value)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95"
                style={{
                  background: scores[currentQ?.key] === s.value
                    ? `${s.color}20`
                    : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${scores[currentQ?.key] === s.value ? s.color : 'transparent'}`,
                }}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-[10px] font-medium" style={{
                  color: scores[currentQ?.key] === s.value ? s.color : 'rgba(255,255,255,0.4)'
                }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation manuelle des questions */}
      <div className="flex gap-2 flex-wrap">
        {questions.map((q, i) => (
          <button
            key={q.key}
            type="button"
            onClick={() => setStep(i)}
            className="w-8 h-8 rounded-full text-xs font-bold transition-all"
            style={{
              background: scores[q.key] !== undefined
                ? '#10B981'
                : step === i
                ? 'rgba(99,102,241,0.3)'
                : 'rgba(255,255,255,0.08)',
              color: scores[q.key] !== undefined ? '#fff' : step === i ? '#6366F1' : 'rgba(255,255,255,0.3)',
              border: step === i ? '2px solid #6366F1' : '2px solid transparent',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Commentaire optionnel */}
      {allScored && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)..."
            rows={2}
            className="w-full text-sm text-white placeholder-white/30 rounded-xl px-4 py-3 resize-none outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </motion.div>
      )}

      {/* Submit */}
      {allScored && (
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        >
          <CheckCircle size={18} />
          {loading ? 'Envoi...' : 'Envoyer le feedback'}
        </motion.button>
      )}
    </div>
  )
}
