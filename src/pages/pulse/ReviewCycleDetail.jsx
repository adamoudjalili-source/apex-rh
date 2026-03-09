// ============================================================
// APEX RH — ReviewCycleDetail.jsx
// S123 — Vue collaborateur : auto-évaluation, résultats, forms
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  REVIEW_COMPETENCIES,
  CYCLE_FREQUENCY_LABELS,
  EVAL_STATUS_LABELS,
  EVAL_STATUS_COLORS,
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  computeAverageScore,
  formatCyclePeriod,
  useMyEvaluations,
  useCollaboratorSynthesis,
  useSubmitSelfEvaluation,
  useSubmitManagerEvaluation,
} from '../../hooks/useReviewCycles'
import { REVIEW_STATUS } from '../../utils/constants'
import { scoreColor, StepIndicator, ScoreBar, SynthesisCard, Modal, Spinner, Card, Badge } from './ReviewCycleStats'

export function SelfEvalForm({ evaluation, cycle, onClose }) {
  const [answers, setAnswers] = useState({})
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const submit = useSubmitSelfEvaluation()

  const questions = cycle?.template?.questions?.length > 0 ? cycle.template.questions : REVIEW_COMPETENCIES
  const allAnswered = questions.every(q => answers[q.key] != null)

  async function handleSubmit() {
    if (!allAnswered) return
    setSaving(true)
    try {
      await submit.mutateAsync({ evaluation_id: evaluation.id, self_answers: { ...answers, general_comment: comments } })
      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    } catch { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Auto-évaluation</h3>
        <p className="text-xs text-gray-500">Évaluez vos compétences honnêtement sur la période du cycle.</p>
      </div>
      <StepIndicator current={1} />

      <div className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-center gap-3">
        <div className="text-2xl">🔄</div>
        <div>
          <div className="text-sm font-medium text-white">{cycle?.title}</div>
          <div className="text-xs text-gray-500">
            {CYCLE_FREQUENCY_LABELS[cycle?.frequency]} — {formatCyclePeriod(cycle?.period_start, cycle?.period_end)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map(q => (
          <div key={q.key} className="rounded-xl border border-white/8 bg-white/3 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-white">
                  {REVIEW_COMPETENCIES.find(c => c.key === q.key)?.icon || '📌'} {q.label}
                </div>
                {q.description && <div className="text-xs text-gray-600 mt-0.5">{q.description}</div>}
              </div>
              <div className="text-lg font-bold ml-4" style={{ color: answers[q.key] != null ? scoreColor(answers[q.key]) : '#4B5563' }}>
                {answers[q.key] != null ? `${answers[q.key]}/10` : '—'}
              </div>
            </div>
            <input type="range" min="0" max="10" step="0.5" value={answers[q.key] ?? 5}
              onChange={e => setAnswers(prev => ({ ...prev, [q.key]: parseFloat(e.target.value) }))}
              className="w-full accent-indigo-500 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>0 — Insuffisant</span><span>5 — Moyen</span><span>10 — Excellent</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Commentaire libre (facultatif)</label>
        <textarea rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
          placeholder="Ajoutez un commentaire sur vos accomplissements, difficultés rencontrées…"
          value={comments} onChange={e => setComments(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">Annuler</button>
        <button onClick={handleSubmit} disabled={!allAnswered || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          {saving ? <Spinner /> : success ? '✓ Envoyé !' : 'Soumettre mon auto-évaluation'}
        </button>
      </div>
    </div>
  )
}

export function ManagerEvalForm({ evaluation, cycle, onClose }) {
  const [answers, setAnswers] = useState({})
  const [globalComment, setGlobalComment] = useState('')
  const [overallRating, setOverallRating] = useState('')
  const [finalComment, setFinalComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const submitManager = useSubmitManagerEvaluation()

  const { data: synthesis } = useCollaboratorSynthesis(
    evaluation?.evaluatee?.id, cycle?.period_start, cycle?.period_end
  )

  const questions = cycle?.template?.questions?.length > 0 ? cycle.template.questions : REVIEW_COMPETENCIES
  const selfAnswers = evaluation?.self_answers || {}
  const allAnswered = questions.every(q => answers[q.key] != null) && overallRating !== ''

  async function handleSubmit() {
    if (!allAnswered) return
    setSaving(true)
    try {
      await submitManager.mutateAsync({
        evaluation_id: evaluation.id,
        manager_answers: { ...answers, global_comment: globalComment },
        synthesis: synthesis || {},
        overall_rating: overallRating,
        final_comment: finalComment,
      })
      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    } catch { setSaving(false) }
  }

  const evaluateeName = evaluation?.evaluatee
    ? `${evaluation.evaluatee.first_name} ${evaluation.evaluatee.last_name}` : '—'

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Évaluation manager</h3>
        <p className="text-xs text-gray-500">Évaluez <strong className="text-indigo-300">{evaluateeName}</strong> pour ce cycle.</p>
      </div>
      <StepIndicator current={2} />
      <SynthesisCard synthesis={synthesis} periodStart={cycle?.period_start} periodEnd={cycle?.period_end} />

      <div className="space-y-4">
        {questions.map(q => {
          const selfScore = selfAnswers[q.key]
          const mgrScore  = answers[q.key]
          const comp = REVIEW_COMPETENCIES.find(c => c.key === q.key)
          return (
            <div key={q.key} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-white">{comp?.icon || '📌'} {q.label}</div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Auto-éval: <strong style={{ color: selfScore != null ? scoreColor(selfScore) : '#6B7280' }}>{selfScore != null ? `${selfScore}/10` : '—'}</strong></span>
                  <span>Vous: <strong style={{ color: mgrScore != null ? scoreColor(mgrScore) : '#4B5563' }}>{mgrScore != null ? `${mgrScore}/10` : '—'}</strong></span>
                </div>
              </div>
              <input type="range" min="0" max="10" step="0.5" value={answers[q.key] ?? 5}
                onChange={e => setAnswers(prev => ({ ...prev, [q.key]: parseFloat(e.target.value) }))}
                className="w-full accent-indigo-500 cursor-pointer" />
              <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                <span>0 — Insuffisant</span><span>5 — Moyen</span><span>10 — Excellent</span>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Commentaire sur les compétences</label>
        <textarea rows={2} className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
          placeholder="Commentaires sur les points forts et axes d'amélioration…"
          value={globalComment} onChange={e => setGlobalComment(e.target.value)} />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">Note de performance globale</label>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(OVERALL_RATING_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setOverallRating(key)}
              className={`rounded-lg p-2.5 text-xs font-medium border transition-all text-center ${
                overallRating === key ? 'border-transparent text-white' : 'border-white/10 bg-white/3 text-gray-500 hover:border-white/20'
              }`}
              style={overallRating === key ? { background: OVERALL_RATING_COLORS[key], borderColor: OVERALL_RATING_COLORS[key] } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Commentaire final <span className="text-indigo-400">(visible par le collaborateur)</span></label>
        <textarea rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
          placeholder="Message de bilan et d'encouragement transmis au collaborateur…"
          value={finalComment} onChange={e => setFinalComment(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">Annuler</button>
        <button onClick={handleSubmit} disabled={!allAnswered || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          {saving ? <Spinner /> : success ? '✓ Soumis !' : "Soumettre l'évaluation"}
        </button>
      </div>
    </div>
  )
}

export function EvalResultCard({ evaluation }) {
  const [expanded, setExpanded] = useState(false)
  const cycle = evaluation.cycle
  const questions = REVIEW_COMPETENCIES

  const selfAvg = computeAverageScore(
    Object.fromEntries(questions.map(q => [q.key, evaluation.self_answers?.[q.key]]).filter(([, v]) => v != null))
  )
  const mgrAvg = computeAverageScore(
    Object.fromEntries(questions.map(q => [q.key, evaluation.manager_answers?.[q.key]]).filter(([, v]) => v != null))
  )

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">{cycle?.title}</span>
            <Badge label={EVAL_STATUS_LABELS[evaluation.status]} color={EVAL_STATUS_COLORS[evaluation.status]} />
          </div>
          <div className="text-xs text-gray-500">
            {CYCLE_FREQUENCY_LABELS[cycle?.frequency]} · {formatCyclePeriod(cycle?.period_start, cycle?.period_end)}
          </div>
        </div>
        {evaluation.overall_rating && (
          <div className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: `${OVERALL_RATING_COLORS[evaluation.overall_rating]}22`, color: OVERALL_RATING_COLORS[evaluation.overall_rating] }}>
            {OVERALL_RATING_LABELS[evaluation.overall_rating]}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-lg bg-white/3 border border-white/8 p-3">
          <div className="text-[10px] text-gray-500 mb-1">Mon auto-évaluation</div>
          <div className="text-lg font-bold" style={{ color: selfAvg != null ? scoreColor(selfAvg) : '#6B7280' }}>
            {selfAvg != null ? `${selfAvg}/10` : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-white/3 border border-white/8 p-3">
          <div className="text-[10px] text-gray-500 mb-1">Évaluation manager</div>
          <div className="text-lg font-bold" style={{ color: mgrAvg != null ? scoreColor(mgrAvg) : '#6B7280' }}>
            {mgrAvg != null ? `${mgrAvg}/10` : '—'}
          </div>
        </div>
      </div>

      {evaluation.final_comment && (
        <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="text-[10px] text-indigo-400 mb-1">Message de votre manager</div>
          <p className="text-sm text-gray-300">{evaluation.final_comment}</p>
        </div>
      )}

      <button onClick={() => setExpanded(e => !e)} className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
        {expanded ? '▲ Masquer le détail' : '▼ Voir le détail par compétence'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-2 pt-3 border-t border-white/8">
              {questions.map(q => (
                <div key={q.key} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 w-36">{q.icon} {q.label}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <ScoreBar score={evaluation.self_answers?.[q.key] ?? null} />
                    <ScoreBar score={evaluation.manager_answers?.[q.key] ?? null} color="#7C3AED" />
                  </div>
                </div>
              ))}
              <div className="flex text-[10px] text-gray-600 gap-2 justify-end mt-1">
                <span>— Moi</span><span style={{ color: '#7C3AED' }}>— Manager</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export function CollaborateurView() {
  const { data: myEvals = [], isLoading } = useMyEvaluations()
  const [modalEval, setModalEval] = useState(null)
  const [modalCycle, setModalCycle] = useState(null)

  const pendingSelf = myEvals.filter(e => e.status === 'pending' || e.status === REVIEW_STATUS.SELF_SUBMITTED)
  const pastEvals   = myEvals.filter(e => ['manager_submitted', 'validated', 'archived'].includes(e.status))

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">À compléter</h3>
        </div>
        {pendingSelf.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm text-gray-500">Aucune évaluation en attente</div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSelf.map(ev => {
              const cycle = ev.cycle
              const isSelfDone = ev.status === REVIEW_STATUS.SELF_SUBMITTED
              return (
                <Card key={ev.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{cycle?.title}</span>
                        <Badge label={EVAL_STATUS_LABELS[ev.status]} color={EVAL_STATUS_COLORS[ev.status]} />
                      </div>
                      <div className="text-xs text-gray-500">
                        {CYCLE_FREQUENCY_LABELS[cycle?.frequency]} · {formatCyclePeriod(cycle?.period_start, cycle?.period_end)}
                      </div>
                    </div>
                    {!isSelfDone ? (
                      <button onClick={() => { setModalEval(ev); setModalCycle(cycle) }}
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                        style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                        Commencer mon auto-évaluation →
                      </button>
                    ) : (
                      <div className="text-xs text-amber-400 flex items-center gap-1">
                        ⏳ En attente de l'évaluation manager
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {pastEvals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Mes évaluations passées</h3>
          </div>
          <div className="space-y-3">
            {pastEvals.map(ev => <EvalResultCard key={ev.id} evaluation={ev} />)}
          </div>
        </div>
      )}

      <AnimatePresence>
        {modalEval && (
          <Modal title="Auto-évaluation" onClose={() => setModalEval(null)} wide>
            <SelfEvalForm evaluation={modalEval} cycle={modalCycle} onClose={() => setModalEval(null)} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
