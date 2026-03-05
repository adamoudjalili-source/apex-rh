// ============================================================
// APEX RH — src/pages/pulse/ReviewCycles.jsx
// Session 32 — Module Review Cycles Formels
// Workflow 3 étapes : Auto-évaluation → Évaluation manager → Validation & Archivage
// Fréquences : Trimestrielle, Semestrielle, Annuelle
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
  REVIEW_COMPETENCIES,
  CYCLE_FREQUENCY_LABELS,
  EVAL_STATUS_LABELS,
  EVAL_STATUS_COLORS,
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  CYCLE_STATUS_LABELS,
  isManagerRole,
  computeAverageScore,
  formatCyclePeriod,
  countEvalStatuses,
  useActiveCycles,
  useAllCycles,
  useMyEvaluations,
  useCycleEvaluations,
  useManagerPendingEvals,
  useCollaboratorSynthesis,
  useCreateCycle,
  useActivateCycle,
  useStartReviewPhase,
  useCloseCycle,
  useSubmitSelfEvaluation,
  useSubmitManagerEvaluation,
  useValidateEvaluation,
  useArchiveEvaluation,
  useReviewTemplates,
} from '../../hooks/useReviewCycles'

// ─── HELPERS ─────────────────────────────────────────────────

function scoreColor(score) {
  if (score == null) return '#6B7280'
  if (score >= 7.5) return '#10B981'
  if (score >= 5)   return '#F59E0B'
  return '#EF4444'
}

function pulseScoreColor(score) {
  if (score == null) return '#6B7280'
  if (score >= 75) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── COMPOSANTS UI ───────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{children}</h3>
      {action}
    </div>
  )
}

function Badge({ label, color }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

function ScoreBar({ score, max = 10, color }) {
  const pct = Math.round((score / max) * 100)
  const c = color || scoreColor(score)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color: c }}>
        {score != null ? score : '—'}
      </span>
    </div>
  )
}

function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Auto-évaluation' },
    { n: 2, label: 'Évaluation manager' },
    { n: 3, label: 'Validation & Archivage' },
  ]
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                current >= s.n
                  ? 'text-white'
                  : 'bg-white/5 text-gray-600 border border-white/10'
              }`}
              style={current >= s.n ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}
            >
              {current > s.n ? '✓' : s.n}
            </div>
            <span className={`text-[10px] mt-1 text-center w-20 ${current >= s.n ? 'text-indigo-300' : 'text-gray-600'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-14 mx-1 mb-5 ${current > s.n ? 'bg-indigo-500' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
}

// ─── SYNTHÈSE CARD (PULSE + F360 + OKRs) ────────────────────

function SynthesisCard({ synthesis, periodStart, periodEnd }) {
  if (!synthesis) return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-center text-gray-600 text-sm">
      Calcul de la synthèse en cours…
    </div>
  )

  const hasPulse = synthesis.pulse_avg_score != null
  const hasF360  = synthesis.feedback360_avg != null
  const hasOkr   = synthesis.okr_completion_rate != null

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Synthèse automatique</span>
        <span className="text-gray-600 text-[10px]">{formatCyclePeriod(periodStart, periodEnd)}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* PULSE */}
        <div className={`rounded-lg p-3 border ${hasPulse ? 'border-green-500/20 bg-green-500/5' : 'border-white/8 bg-white/3'}`}>
          <div className="text-[10px] text-gray-500 mb-1">📊 Score PULSE moyen</div>
          {hasPulse ? (
            <>
              <div className="text-xl font-bold" style={{ color: pulseScoreColor(synthesis.pulse_avg_score) }}>
                {synthesis.pulse_avg_score}/100
              </div>
              <div className="text-[10px] text-gray-600">{synthesis.pulse_period_days} jours enregistrés</div>
            </>
          ) : (
            <div className="text-sm text-gray-600">Non disponible</div>
          )}
        </div>

        {/* Feedback 360° */}
        <div className={`rounded-lg p-3 border ${hasF360 ? 'border-violet-500/20 bg-violet-500/5' : 'border-white/8 bg-white/3'}`}>
          <div className="text-[10px] text-gray-500 mb-1">💬 Feedback 360° moyen</div>
          {hasF360 ? (
            <>
              <div className="text-xl font-bold" style={{ color: scoreColor(synthesis.feedback360_avg) }}>
                {synthesis.feedback360_avg}/10
              </div>
              <div className="text-[10px] text-gray-600">{synthesis.feedback360_response_count} réponses</div>
            </>
          ) : (
            <div className="text-sm text-gray-600">Non disponible</div>
          )}
        </div>

        {/* OKRs */}
        <div className={`rounded-lg p-3 border ${hasOkr ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/8 bg-white/3'}`}>
          <div className="text-[10px] text-gray-500 mb-1">🎯 OKRs complétés</div>
          {hasOkr ? (
            <>
              <div className="text-xl font-bold" style={{ color: synthesis.okr_completion_rate >= 70 ? '#10B981' : '#F59E0B' }}>
                {synthesis.okr_completion_rate}%
              </div>
              <div className="text-[10px] text-gray-600">{synthesis.okr_completed_count}/{synthesis.okr_count} objectifs</div>
            </>
          ) : (
            <div className="text-sm text-gray-600">Non disponible</div>
          )}
        </div>
      </div>

      {/* Détail F360 par compétence */}
      {hasF360 && synthesis.feedback360_by_competency && (
        <div className="pt-2 border-t border-white/8">
          <div className="text-[10px] text-gray-500 mb-2">Feedback 360° — détail par compétence</div>
          <div className="space-y-1.5">
            {REVIEW_COMPETENCIES.map(c => {
              const s = synthesis.feedback360_by_competency[c.key]
              return (
                <div key={c.key} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 w-36">{c.icon} {c.label}</span>
                  <div className="flex-1">
                    <ScoreBar score={s ?? null} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FORMULAIRE AUTO-ÉVALUATION ──────────────────────────────

function SelfEvalForm({ evaluation, cycle, onClose }) {
  const [answers, setAnswers] = useState({})
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const submit = useSubmitSelfEvaluation()

  // Questions depuis le template du cycle, ou compétences par défaut
  const questions = cycle?.template?.questions?.length > 0
    ? cycle.template.questions
    : REVIEW_COMPETENCIES

  const allAnswered = questions.every(q => answers[q.key] != null)

  async function handleSubmit() {
    if (!allAnswered) return
    setSaving(true)
    try {
      await submit.mutateAsync({
        evaluation_id: evaluation.id,
        self_answers: { ...answers, general_comment: comments },
      })
      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Auto-évaluation</h3>
        <p className="text-xs text-gray-500">Évaluez vos compétences honnêtement sur la période du cycle.</p>
      </div>

      <StepIndicator current={1} />

      {/* Info cycle */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-center gap-3">
        <div className="text-2xl">🔄</div>
        <div>
          <div className="text-sm font-medium text-white">{cycle?.title}</div>
          <div className="text-xs text-gray-500">
            {CYCLE_FREQUENCY_LABELS[cycle?.frequency]} — {formatCyclePeriod(cycle?.period_start, cycle?.period_end)}
          </div>
        </div>
      </div>

      {/* Compétences */}
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
              <div
                className="text-lg font-bold ml-4"
                style={{ color: answers[q.key] != null ? scoreColor(answers[q.key]) : '#4B5563' }}
              >
                {answers[q.key] != null ? `${answers[q.key]}/10` : '—'}
              </div>
            </div>
            {/* Slider */}
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={answers[q.key] ?? 5}
              onChange={e => setAnswers(prev => ({ ...prev, [q.key]: parseFloat(e.target.value) }))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>0 — Insuffisant</span><span>5 — Moyen</span><span>10 — Excellent</span>
            </div>
          </div>
        ))}
      </div>

      {/* Commentaire général */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Commentaire libre (facultatif)</label>
        <textarea
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
          placeholder="Ajoutez un commentaire sur vos accomplissements, difficultés rencontrées…"
          value={comments}
          onChange={e => setComments(e.target.value)}
        />
      </div>

      {/* Boutons */}
      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
        >
          {saving ? <Spinner /> : success ? '✓ Envoyé !' : 'Soumettre mon auto-évaluation'}
        </button>
      </div>
    </div>
  )
}

// ─── FORMULAIRE ÉVALUATION MANAGER ───────────────────────────

function ManagerEvalForm({ evaluation, cycle, onClose }) {
  const [answers, setAnswers] = useState({})
  const [globalComment, setGlobalComment] = useState('')
  const [overallRating, setOverallRating] = useState('')
  const [finalComment, setFinalComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const submitManager = useSubmitManagerEvaluation()

  const { data: synthesis } = useCollaboratorSynthesis(
    evaluation?.evaluatee?.id,
    cycle?.period_start,
    cycle?.period_end
  )

  const questions = cycle?.template?.questions?.length > 0
    ? cycle.template.questions
    : REVIEW_COMPETENCIES

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
    } catch {
      setSaving(false)
    }
  }

  const evaluateeName = evaluation?.evaluatee
    ? `${evaluation.evaluatee.first_name} ${evaluation.evaluatee.last_name}`
    : '—'

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Évaluation manager</h3>
        <p className="text-xs text-gray-500">Évaluez <strong className="text-indigo-300">{evaluateeName}</strong> pour ce cycle.</p>
      </div>

      <StepIndicator current={2} />

      {/* Synthèse automatique */}
      <SynthesisCard synthesis={synthesis} periodStart={cycle?.period_start} periodEnd={cycle?.period_end} />

      {/* Compétences : auto-éval vs manager côte à côte */}
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
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={answers[q.key] ?? 5}
                onChange={e => setAnswers(prev => ({ ...prev, [q.key]: parseFloat(e.target.value) }))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                <span>0 — Insuffisant</span><span>5 — Moyen</span><span>10 — Excellent</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Commentaire manager */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Commentaire sur les compétences</label>
        <textarea
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
          placeholder="Commentaires sur les points forts et axes d'amélioration…"
          value={globalComment}
          onChange={e => setGlobalComment(e.target.value)}
        />
      </div>

      {/* Note globale */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Note de performance globale</label>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(OVERALL_RATING_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setOverallRating(key)}
              className={`rounded-lg p-2.5 text-xs font-medium border transition-all text-center ${
                overallRating === key
                  ? 'border-transparent text-white'
                  : 'border-white/10 bg-white/3 text-gray-500 hover:border-white/20'
              }`}
              style={overallRating === key ? {
                background: OVERALL_RATING_COLORS[key],
                borderColor: OVERALL_RATING_COLORS[key],
              } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Commentaire final (visible par le collaborateur) */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Commentaire final <span className="text-indigo-400">(visible par le collaborateur)</span></label>
        <textarea
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
          placeholder="Message de bilan et d'encouragement transmis au collaborateur…"
          value={finalComment}
          onChange={e => setFinalComment(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
        >
          {saving ? <Spinner /> : success ? '✓ Soumis !' : 'Soumettre l\'évaluation'}
        </button>
      </div>
    </div>
  )
}

// ─── MODAL ───────────────────────────────────────────────────

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className={`relative rounded-2xl border border-white/10 overflow-y-auto max-h-[90vh] ${wide ? 'w-full max-w-3xl' : 'w-full max-w-xl'}`}
        style={{ background: '#0F1117' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 sticky top-0 bg-[#0F1117] z-10">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </motion.div>
    </div>
  )
}

// ─── CRÉER UN CYCLE (managers) ───────────────────────────────

function CreateCycleForm({ onClose }) {
  const { profile } = useAuth()
  const { data: templates = [] } = useReviewTemplates()
  const createCycle = useCreateCycle()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const defaultTemplate = templates.find(t => t.is_default)

  const [form, setForm] = useState({
    title: '',
    frequency: 'annual',
    period_start: '',
    period_end: '',
    template_id: defaultTemplate?.id || '',
  })

  // Quand les templates chargent, pré-sélectionner le défaut
  useEffect(() => {
    if (defaultTemplate && !form.template_id) {
      setForm(prev => ({ ...prev, template_id: defaultTemplate.id }))
    }
  }, [defaultTemplate?.id])

  const valid = form.title && form.period_start && form.period_end && form.frequency

  async function handleSubmit() {
    if (!valid) return
    setSaving(true)
    try {
      await createCycle.mutateAsync({
        ...form,
        template_id: form.template_id || null,
        collaborator_ids: [],
      })
      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    } catch {
      setSaving(false)
    }
  }

  const Field = ({ label, children }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-indigo-500/50"

  return (
    <div className="space-y-4">
      <Field label="Titre du cycle *">
        <input
          className={inputCls}
          placeholder="Ex : Revue annuelle 2025 — Service Commercial"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Fréquence *">
          <select
            className={inputCls}
            value={form.frequency}
            onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
          >
            {Object.entries(CYCLE_FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Date début *">
          <input type="date" className={inputCls} value={form.period_start}
            onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} />
        </Field>
        <Field label="Date fin *">
          <input type="date" className={inputCls} value={form.period_end}
            onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} />
        </Field>
      </div>

      {templates.length > 0 && (
        <Field label="Grille d'évaluation">
          <select
            className={inputCls}
            value={form.template_id}
            onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}
          >
            <option value="">— Grille standard (5 compétences) —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Défaut)' : ''}</option>
            ))}
          </select>
        </Field>
      )}

      <p className="text-xs text-gray-600">
        💡 Le cycle sera créé en brouillon. Vous pourrez y ajouter des collaborateurs puis l'activer.
      </p>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!valid || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
        >
          {saving ? <Spinner /> : success ? '✓ Créé !' : 'Créer le cycle'}
        </button>
      </div>
    </div>
  )
}

// ─── RÉSULTAT D'UNE ÉVALUATION (vue collaborateur) ───────────

function EvalResultCard({ evaluation }) {
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
            <Badge
              label={EVAL_STATUS_LABELS[evaluation.status]}
              color={EVAL_STATUS_COLORS[evaluation.status]}
            />
          </div>
          <div className="text-xs text-gray-500">
            {CYCLE_FREQUENCY_LABELS[cycle?.frequency]} · {formatCyclePeriod(cycle?.period_start, cycle?.period_end)}
          </div>
        </div>
        {evaluation.overall_rating && (
          <div
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: `${OVERALL_RATING_COLORS[evaluation.overall_rating]}22`,
              color: OVERALL_RATING_COLORS[evaluation.overall_rating],
            }}
          >
            {OVERALL_RATING_LABELS[evaluation.overall_rating]}
          </div>
        )}
      </div>

      {/* Scores résumés */}
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

      {/* Commentaire final visible */}
      {evaluation.final_comment && (
        <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="text-[10px] text-indigo-400 mb-1">Message de votre manager</div>
          <p className="text-sm text-gray-300">{evaluation.final_comment}</p>
        </div>
      )}

      {/* Expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        {expanded ? '▲ Masquer le détail' : '▼ Voir le détail par compétence'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
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

// ─── VUE COLLABORATEUR ───────────────────────────────────────

function CollaborateurView() {
  const { data: activeCycles = [] } = useActiveCycles()
  const { data: myEvals = [], isLoading } = useMyEvaluations()
  const [modalEval, setModalEval] = useState(null)
  const [modalCycle, setModalCycle] = useState(null)

  // Évaluations en attente de mon action
  const pendingSelf = myEvals.filter(e => e.status === 'pending' || e.status === 'self_submitted')
  const pastEvals   = myEvals.filter(e => ['manager_submitted', 'validated', 'archived'].includes(e.status))

  if (isLoading) return (
    <div className="flex justify-center py-12"><Spinner /></div>
  )

  return (
    <div className="space-y-6">
      {/* En attente de mon action */}
      <div>
        <SectionTitle>À compléter</SectionTitle>
        {pendingSelf.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm text-gray-500">Aucune évaluation en attente</div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSelf.map(ev => {
              const cycle = ev.cycle
              const isSelfDone = ev.status === 'self_submitted'
              return (
                <Card key={ev.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{cycle?.title}</span>
                        <Badge
                          label={EVAL_STATUS_LABELS[ev.status]}
                          color={EVAL_STATUS_COLORS[ev.status]}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {CYCLE_FREQUENCY_LABELS[cycle?.frequency]} · {formatCyclePeriod(cycle?.period_start, cycle?.period_end)}
                      </div>
                    </div>
                    {!isSelfDone ? (
                      <button
                        onClick={() => { setModalEval(ev); setModalCycle(cycle) }}
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                        style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
                      >
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

      {/* Historique */}
      {pastEvals.length > 0 && (
        <div>
          <SectionTitle>Mes évaluations passées</SectionTitle>
          <div className="space-y-3">
            {pastEvals.map(ev => <EvalResultCard key={ev.id} evaluation={ev} />)}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modalEval && (
          <Modal title="Auto-évaluation" onClose={() => setModalEval(null)} wide>
            <SelfEvalForm
              evaluation={modalEval}
              cycle={modalCycle}
              onClose={() => setModalEval(null)}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── VUE MANAGER ─────────────────────────────────────────────

function ManagerView() {
  const { data: allCycles = [], isLoading } = useAllCycles()
  const { data: pendingEvals = [] } = useManagerPendingEvals()
  const [activeTab, setActiveTab] = useState('cycles')
  const [selectedCycleId, setSelectedCycleId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalEval, setModalEval] = useState(null)
  const [modalCycle, setModalCycle] = useState(null)
  const activateCycle   = useActivateCycle()
  const startReview     = useStartReviewPhase()
  const closeCycle      = useCloseCycle()
  const validateEval    = useValidateEvaluation()
  const archiveEval     = useArchiveEvaluation()
  const [actionMsg, setActionMsg] = useState('')

  const selectedCycle = allCycles.find(c => c.id === selectedCycleId)
  const { data: cycleEvals = [] } = useCycleEvaluations(selectedCycleId)

  function notify(msg) { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2000) }

  async function handleActivate(cycleId) {
    await activateCycle.mutateAsync(cycleId); notify('Cycle activé ✓')
  }
  async function handleStartReview(cycleId) {
    await startReview.mutateAsync(cycleId); notify('Phase révision lancée ✓')
  }
  async function handleClose(cycleId) {
    if (!window.confirm('Clôturer ce cycle ? Cette action est définitive.')) return
    await closeCycle.mutateAsync(cycleId); notify('Cycle clôturé ✓')
  }
  async function handleValidate(evalId) {
    await validateEval.mutateAsync(evalId); notify('Évaluation validée ✓')
  }
  async function handleArchive(evalId) {
    await archiveEval.mutateAsync(evalId); notify('Évaluation archivée ✓')
  }

  const tabs = [
    { id: 'cycles',     label: 'Cycles', count: allCycles.length },
    { id: 'pending',    label: 'À évaluer', count: pendingEvals.length, badge: pendingEvals.length > 0 },
    { id: 'validation', label: 'Validation', count: cycleEvals.filter(e => e.status === 'manager_submitted').length },
  ]

  const statusColors = { draft: '#6B7280', active: '#10B981', in_review: '#3B82F6', closed: '#9CA3AF' }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}
          >
            {t.label}
            {t.badge && t.count > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {actionMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-2"
        >
          {actionMsg}
        </motion.div>
      )}

      {/* ── Onglet Cycles ─────────────────────────────────── */}
      {activeTab === 'cycles' && (
        <div>
          <SectionTitle
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
              >
                + Nouveau cycle
              </button>
            }
          >
            Tous les cycles
          </SectionTitle>

          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : allCycles.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🔄</div>
                <div className="text-sm text-gray-500 mb-4">Aucun cycle créé</div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
                >
                  Créer le premier cycle
                </button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {allCycles.map(cycle => {
                const stats = countEvalStatuses([])
                const isSelected = selectedCycleId === cycle.id
                return (
                  <Card key={cycle.id} className={isSelected ? 'border-indigo-500/30' : ''}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">{cycle.title}</span>
                          <Badge label={CYCLE_STATUS_LABELS[cycle.status]} color={statusColors[cycle.status]} />
                          <Badge label={CYCLE_FREQUENCY_LABELS[cycle.frequency]} color="#6366F1" />
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCyclePeriod(cycle.period_start, cycle.period_end)}
                          {cycle.service?.name && ` · ${cycle.service.name}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Actions selon statut */}
                        {cycle.status === 'draft' && (
                          <button
                            onClick={() => handleActivate(cycle.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600/80 hover:bg-green-500"
                          >
                            Activer
                          </button>
                        )}
                        {cycle.status === 'active' && (
                          <button
                            onClick={() => handleStartReview(cycle.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600/80 hover:bg-blue-500"
                          >
                            Lancer révision
                          </button>
                        )}
                        {cycle.status === 'in_review' && (
                          <button
                            onClick={() => handleClose(cycle.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-600/80 hover:bg-gray-500"
                          >
                            Clôturer
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedCycleId(isSelected ? null : cycle.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                        >
                          {isSelected ? 'Masquer' : 'Voir évals'}
                        </button>
                      </div>
                    </div>

                    {/* Évaluations du cycle */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <CycleEvalsList
                            cycleId={cycle.id}
                            cycle={cycle}
                            onManagerEval={(ev) => { setModalEval(ev); setModalCycle(cycle) }}
                            onValidate={handleValidate}
                            onArchive={handleArchive}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet À évaluer ─────────────────────────────── */}
      {activeTab === 'pending' && (
        <div>
          <SectionTitle>Auto-évaluations soumises — à traiter</SectionTitle>
          {pendingEvals.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm text-gray-500">Aucune évaluation en attente de votre part</div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingEvals.map(ev => {
                const evaluateeName = ev.evaluatee ? `${ev.evaluatee.first_name} ${ev.evaluatee.last_name}` : '—'
                return (
                  <Card key={ev.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white mb-0.5">{evaluateeName}</div>
                        <div className="text-xs text-gray-500">
                          {ev.cycle?.title} · Soumis le {fmtDate(ev.self_submitted_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setModalEval(ev)
                          setModalCycle(ev.cycle)
                        }}
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
                      >
                        Évaluer →
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Validation ───────────────────────────── */}
      {activeTab === 'validation' && (
        <div>
          <SectionTitle>Évaluations à valider</SectionTitle>
          <div className="mb-3">
            <select
              className="rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-indigo-500/50"
              value={selectedCycleId || ''}
              onChange={e => setSelectedCycleId(e.target.value || null)}
            >
              <option value="">— Sélectionner un cycle —</option>
              {allCycles.filter(c => ['active', 'in_review'].includes(c.status)).map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          {selectedCycleId && (
            <div className="space-y-3">
              {cycleEvals.filter(e => e.status === 'manager_submitted').map(ev => {
                const name = ev.evaluatee ? `${ev.evaluatee.first_name} ${ev.evaluatee.last_name}` : '—'
                return (
                  <Card key={ev.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white mb-0.5">{name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {ev.overall_rating && (
                            <span
                              className="font-medium"
                              style={{ color: OVERALL_RATING_COLORS[ev.overall_rating] }}
                            >
                              {OVERALL_RATING_LABELS[ev.overall_rating]}
                            </span>
                          )}
                          · Soumis le {fmtDate(ev.manager_submitted_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleValidate(ev.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600/80 hover:bg-green-500"
                        >
                          ✓ Valider
                        </button>
                      </div>
                    </div>
                    {ev.final_comment && (
                      <p className="mt-2 text-xs text-gray-500 bg-white/3 rounded-lg px-3 py-2">
                        « {ev.final_comment} »
                      </p>
                    )}
                  </Card>
                )
              })}
              {cycleEvals.filter(e => e.status === 'manager_submitted').length === 0 && (
                <div className="text-center text-sm text-gray-600 py-6">Aucune évaluation en attente de validation pour ce cycle</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal title="Nouveau cycle d'évaluation" onClose={() => setShowCreateModal(false)} wide>
            <CreateCycleForm onClose={() => setShowCreateModal(false)} />
          </Modal>
        )}
        {modalEval && modalCycle && (
          <Modal title={`Évaluation — ${modalEval.evaluatee?.first_name} ${modalEval.evaluatee?.last_name}`} onClose={() => setModalEval(null)} wide>
            <ManagerEvalForm
              evaluation={modalEval}
              cycle={modalCycle}
              onClose={() => setModalEval(null)}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── LISTE DES ÉVALS D'UN CYCLE ──────────────────────────────

function CycleEvalsList({ cycleId, cycle, onManagerEval, onValidate, onArchive }) {
  const { data: evals = [], isLoading } = useCycleEvaluations(cycleId)

  if (isLoading) return <div className="pt-3 flex justify-center"><Spinner /></div>

  if (evals.length === 0) return (
    <div className="pt-3 text-xs text-gray-600 text-center py-4 border-t border-white/8 mt-3">
      Aucun collaborateur ajouté à ce cycle. Utilisez la section «&nbsp;Ajouter collaborateurs&nbsp;» dans les paramètres.
    </div>
  )

  const stats = countEvalStatuses(evals)

  return (
    <div className="mt-4 pt-4 border-t border-white/8">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${stats.completion_rate}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{stats.completion_rate}% validées ({stats.validated + stats.archived}/{stats.total})</span>
      </div>

      <div className="space-y-2">
        {evals.map(ev => {
          const name = ev.evaluatee ? `${ev.evaluatee.first_name} ${ev.evaluatee.last_name}` : '—'
          return (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/3 border border-white/8 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 font-semibold">
                  {ev.evaluatee?.first_name?.[0]}{ev.evaluatee?.last_name?.[0]}
                </div>
                <span className="text-sm text-white">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={EVAL_STATUS_LABELS[ev.status]} color={EVAL_STATUS_COLORS[ev.status]} />
                {ev.status === 'self_submitted' && (
                  <button
                    onClick={() => onManagerEval(ev)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-indigo-600/80 hover:bg-indigo-500"
                  >
                    Évaluer
                  </button>
                )}
                {ev.status === 'manager_submitted' && (
                  <button
                    onClick={() => onValidate(ev.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-green-600/80 hover:bg-green-500"
                  >
                    Valider
                  </button>
                )}
                {ev.status === 'validated' && (
                  <button
                    onClick={() => onArchive(ev.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-400 border border-white/10 hover:border-white/20"
                  >
                    Archiver
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function ReviewCycles() {
  const { profile } = useAuth()
  const isManager = isManagerRole(profile?.role)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div
        className="rounded-2xl p-5 border border-white/8"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.10) 100%)',
          borderColor: 'rgba(79,70,229,0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
          >
            🔄
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Review Cycles Formels</h2>
            <p className="text-xs text-gray-500">Évaluations trimestrielles, semestrielles et annuelles</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {isManager
            ? 'Créez et gérez des cycles d\'évaluation structurés. Synthèse automatique PULSE + Feedback 360° + OKRs.'
            : 'Consultez vos cycles d\'évaluation, soumettez votre auto-évaluation et accédez à vos résultats.'}
        </p>
      </div>

      {/* Contenu selon rôle */}
      {isManager ? <ManagerView /> : <CollaborateurView />}
    </div>
  )
}
