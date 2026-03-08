// ============================================================
// APEX RH — components/feedback360/Feedback360Form.jsx
// Session 81 — Formulaire évaluation 360° par compétences
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, ChevronRight, ChevronLeft, CheckCircle, Save,
  MessageSquare, User, AlertCircle, Loader2, Send,
} from 'lucide-react'
import { useSubmitFeedback360Advanced, useSaveFeedback360Draft } from '../../hooks/useFeedback360'

// Labels relation
const RELATIONSHIP_LABELS = {
  manager:       'Responsable hiérarchique',
  peer:          'Collègue / Pair',
  direct_report: 'Collaborateur direct',
  self:          'Auto-évaluation',
}

const RATING_LABELS = ['', 'Insuffisant', 'À améliorer', 'Satisfaisant', 'Bien', 'Excellent']
const RATING_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981']

// ─── Étoile de rating ────────────────────────────────────────

function StarRating({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange && onChange(n)}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 disabled:cursor-default"
        >
          <Star
            size={22}
            fill={(hover || value) >= n ? RATING_COLORS[(hover || value)] : 'transparent'}
            stroke={(hover || value) >= n ? RATING_COLORS[(hover || value)] : 'rgba(255,255,255,0.2)'}
          />
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className="text-xs ml-1" style={{ color: RATING_COLORS[hover || value] }}>
          {RATING_LABELS[hover || value]}
        </span>
      )}
    </div>
  )
}

// ─── Section compétence ──────────────────────────────────────

function CompetenceSection({ competence, answers, onChange }) {
  const compAnswers = answers?.competences?.[competence.key] ?? {}

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <h3 className="text-sm font-semibold text-white mb-4">{competence.label}</h3>
      <div className="flex flex-col gap-4">
        {(competence.questions ?? []).map(q => {
          const qAnswer = compAnswers[q.key] ?? {}
          return (
            <div key={q.key}>
              <p className="text-xs text-white/60 mb-2">{q.label}</p>
              {q.type === 'text' ? (
                <textarea
                  value={qAnswer.comment ?? ''}
                  onChange={e => onChange(competence.key, q.key, { ...qAnswer, comment: e.target.value })}
                  placeholder="Votre commentaire…"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <StarRating
                    value={qAnswer.rating ?? 0}
                    onChange={v => onChange(competence.key, q.key, { ...qAnswer, rating: v })}
                  />
                  {(qAnswer.rating ?? 0) > 0 && (
                    <textarea
                      value={qAnswer.comment ?? ''}
                      onChange={e => onChange(competence.key, q.key, { ...qAnswer, comment: e.target.value })}
                      placeholder="Commentaire optionnel…"
                      rows={1}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 resize-none mt-1"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────

export default function Feedback360Form({ request, onDone }) {
  // request: { id, evaluatee, relationship, cycle, answers }
  const competences = request?.cycle?.template?.competences ?? []
  const [step, setStep]       = useState(0)  // 0..N-1 compétences + step finale (commentaire global)
  const [answers, setAnswers] = useState(request?.answers ?? { competences: {}, overall_comment: '' })
  const [saved, setSaved]     = useState(false)

  const submit = useSubmitFeedback360Advanced()
  const draft  = useSaveFeedback360Draft()

  const totalSteps = competences.length + 1  // +1 pour commentaire global
  const isLastStep = step === totalSteps - 1

  useEffect(() => {
    if (request?.answers) setAnswers(request.answers)
  }, [request?.id])

  function handleCompAnswer(compKey, qKey, val) {
    setAnswers(prev => ({
      ...prev,
      competences: {
        ...prev.competences,
        [compKey]: { ...prev.competences?.[compKey], [qKey]: val },
      },
    }))
    setSaved(false)
  }

  async function handleSaveDraft() {
    await draft.mutateAsync({ requestId: request.id, answers })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSubmit() {
    await submit.mutateAsync({ requestId: request.id, answers })
    onDone?.()
  }

  // Vérifier si la compétence courante est complète
  function isCompComplete(comp) {
    const compA = answers.competences?.[comp.key] ?? {}
    return (comp.questions ?? []).every(q => {
      if (q.type === 'text') return true
      return (compA[q.key]?.rating ?? 0) > 0
    })
  }

  const currentComp = competences[step]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* En-tête */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <User size={16} style={{ color: '#818CF8' }}/>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Évaluation de {request?.evaluatee?.first_name} {request?.evaluatee?.last_name}
            </p>
            <p className="text-xs text-white/40">
              {RELATIONSHIP_LABELS[request?.relationship] ?? request?.relationship} · {request?.cycle?.title}
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-2 mb-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: i < step ? '100%' : i === step ? '50%' : '0%',
                  background: i <= step ? '#818CF8' : 'transparent',
                }}/>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 text-right">
          Étape {step + 1} / {totalSteps}
        </p>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

            {isLastStep ? (
              /* Commentaire global */
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={16} style={{ color: '#818CF8' }}/>
                  <h3 className="text-sm font-semibold text-white">Commentaire général</h3>
                </div>
                <p className="text-xs text-white/50 mb-3">
                  Un retour global sur les points forts et axes d'amélioration de {request?.evaluatee?.first_name}.
                </p>
                <textarea
                  value={answers.overall_comment ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, overall_comment: e.target.value }))}
                  placeholder="Points forts, points d'amélioration, observations générales…"
                  rows={5}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <p className="text-xs text-white/25 mt-2 flex items-center gap-1">
                  <AlertCircle size={11}/>
                  Votre évaluation est {request?.is_anonymous ? 'anonyme' : 'non anonyme'}.
                </p>
              </div>
            ) : currentComp ? (
              <CompetenceSection
                competence={currentComp}
                answers={answers}
                onChange={handleCompAnswer}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 flex items-center justify-between pt-4 mt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <ChevronLeft size={14}/> Précédent
            </button>
          )}
          <button onClick={handleSaveDraft} disabled={draft.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: saved ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>
            {draft.isPending ? <Loader2 size={13} className="animate-spin"/> : saved ? <CheckCircle size={13}/> : <Save size={13}/>}
            {saved ? 'Enregistré' : 'Brouillon'}
          </button>
        </div>

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submit.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            {submit.isPending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
            Soumettre l'évaluation
          </button>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!isLastStep && currentComp && !isCompComplete(currentComp)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.3)' }}>
            Suivant <ChevronRight size={14}/>
          </button>
        )}
      </div>
    </div>
  )
}
