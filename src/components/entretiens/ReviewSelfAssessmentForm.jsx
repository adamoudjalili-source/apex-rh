// ============================================================
// APEX RH — components/entretiens/ReviewSelfAssessmentForm.jsx
// Session 80 — Formulaire auto-évaluation structurée
// ============================================================
import { useState, useEffect } from 'react'
import {
  CheckCircle, Save, Loader2, ChevronRight, ChevronLeft,
  Star, MessageSquare, Target, BookOpen, AlertCircle,
} from 'lucide-react'
import {
  useReviewSelfAssessment,
  useSubmitSelfAssessment,
} from '../../hooks/useAnnualReviews'

// ─── Constantes ───────────────────────────────────────────────

const COMPETENCES = [
  { key: 'qualite',        label: 'Qualité du travail' },
  { key: 'delais',         label: 'Respect des délais' },
  { key: 'communication',  label: 'Communication' },
  { key: 'travail_equipe', label: 'Esprit d\'équipe' },
  { key: 'initiative',     label: 'Initiative & Proactivité' },
  { key: 'adaptabilite',   label: 'Adaptabilité' },
]

const RATING_LABELS = ['', 'Insuffisant', 'À améliorer', 'Satisfaisant', 'Bien', 'Excellent']
const RATING_COLORS = ['', '#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#10B981']

const STEPS = [
  { id: 'bilan',         label: 'Bilan',          icon: MessageSquare },
  { id: 'competences',   label: 'Compétences',     icon: Star },
  { id: 'objectifs',     label: 'Objectifs N+1',   icon: Target },
  { id: 'developpement', label: 'Développement',   icon: BookOpen },
]

// ─── StarRating ───────────────────────────────────────────────

function StarRating({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onClick={() => !disabled && onChange(n)}
          disabled={disabled}
          className="transition-transform hover:scale-110"
          title={RATING_LABELS[n]}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={n <= (value || 0) ? RATING_COLORS[value || 0] : 'transparent'}
              stroke={n <= (value || 0) ? RATING_COLORS[value || 0] : 'rgba(255,255,255,0.2)'}
              strokeWidth="1.5"
            />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs ml-1" style={{ color: RATING_COLORS[value] }}>
          {RATING_LABELS[value]}
        </span>
      )}
    </div>
  )
}

// ─── Objectif item ────────────────────────────────────────────

function ObjectifItem({ obj, idx, onChange, onRemove, disabled }) {
  return (
    <div className="rounded-xl p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start gap-2">
        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}>
          {idx + 1}
        </span>
        <div className="flex-1 space-y-2">
          <input
            value={obj.title || ''}
            onChange={e => onChange({ ...obj, title: e.target.value })}
            disabled={disabled}
            placeholder="Titre de l'objectif..."
            className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none border-b pb-1"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          />
          <textarea
            value={obj.description || ''}
            onChange={e => onChange({ ...obj, description: e.target.value })}
            disabled={disabled}
            placeholder="Description (optionnel)..."
            rows={2}
            className="w-full bg-transparent text-xs text-white/60 placeholder-white/20 outline-none resize-none"
          />
          <input
            type="date"
            value={obj.deadline || ''}
            onChange={e => onChange({ ...obj, deadline: e.target.value })}
            disabled={disabled}
            className="bg-transparent text-xs text-white/50 outline-none"
          />
        </div>
        {!disabled && (
          <button onClick={onRemove} className="text-red-400/50 hover:text-red-400 transition-colors text-xs">
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────

export default function ReviewSelfAssessmentForm({ review, onClose, readOnly = false }) {
  const { data: existing, isLoading } = useReviewSelfAssessment(review?.id)
  const submit = useSubmitSelfAssessment()

  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState({
    bilan: { accomplissements: '', points_forts: '', difficultes: '', apprentissages: '' },
    competences: {},
    objectifs_proposes: [],
    developpement: { besoins_formation: '', souhaits_evolution: '', actions_dev: '' },
    commentaire_libre: '',
  })

  // Pré-remplir depuis existing
  useEffect(() => {
    if (existing?.answers) {
      setAnswers(prev => ({ ...prev, ...existing.answers }))
    }
  }, [existing])

  const isSubmitted = !!existing?.submitted_at
  const disabled = readOnly || isSubmitted

  function patchBilan(key, val) {
    setAnswers(a => ({ ...a, bilan: { ...a.bilan, [key]: val } }))
  }
  function patchComp(key, val) {
    setAnswers(a => ({ ...a, competences: { ...a.competences, [key]: val } }))
  }
  function patchDev(key, val) {
    setAnswers(a => ({ ...a, developpement: { ...a.developpement, [key]: val } }))
  }
  function addObjectif() {
    setAnswers(a => ({
      ...a,
      objectifs_proposes: [...(a.objectifs_proposes || []), { title: '', description: '', deadline: '' }],
    }))
  }
  function updateObjectif(idx, val) {
    setAnswers(a => {
      const list = [...(a.objectifs_proposes || [])]
      list[idx] = val
      return { ...a, objectifs_proposes: list }
    })
  }
  function removeObjectif(idx) {
    setAnswers(a => ({
      ...a,
      objectifs_proposes: (a.objectifs_proposes || []).filter((_, i) => i !== idx),
    }))
  }

  async function handleSave(submitFinal = false) {
    setSaving(true)
    try {
      await submit.mutateAsync({ review_id: review.id, answers, submit: submitFinal })
      if (submitFinal && onClose) onClose()
    } finally {
      setSaving(false)
    }
  }

  const compAvg = (() => {
    const vals = Object.values(answers.competences || {}).filter(v => typeof v === 'number' && v > 0)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  })()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-white/30"/>
      </div>
    )
  }

  const StepIcon = STEPS[step].icon

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <StepIcon size={15} style={{ color: '#818CF8' }}/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Auto-évaluation</h3>
            <p className="text-xs text-white/40">{STEPS[step].label} — Étape {step + 1}/{STEPS.length}</p>
          </div>
        </div>
        {isSubmitted && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
            <CheckCircle size={12}/> Soumise
          </div>
        )}
        {!isSubmitted && compAvg && (
          <div className="text-xs text-white/40">
            Moy. compétences : <span className="text-white font-semibold">{compAvg}/5</span>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = i === step
          const done = i < step
          return (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all flex-1 justify-center"
              style={{
                background: active ? 'rgba(99,102,241,0.15)' : done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                color: active ? '#818CF8' : done ? '#10B981' : '#ffffff40',
                border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              <Icon size={11}/>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenu étape */}
      <div className="flex-1 overflow-y-auto space-y-4">

        {/* Étape 0 — Bilan */}
        {step === 0 && (
          <div className="space-y-4">
            {[
              { key: 'accomplissements', label: 'Principales réalisations', required: true, placeholder: 'Décrivez vos accomplissements majeurs de l\'année...' },
              { key: 'points_forts',     label: 'Points forts',             required: true, placeholder: 'Quels sont vos points forts observés cette année ?' },
              { key: 'difficultes',      label: 'Difficultés rencontrées',  required: false, placeholder: 'Quels obstacles avez-vous rencontrés ?' },
              { key: 'apprentissages',   label: 'Principaux apprentissages', required: false, placeholder: 'Qu\'avez-vous appris de significatif ?' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 flex items-center gap-1">
                  {f.label}
                  {f.required && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  value={answers.bilan?.[f.key] || ''}
                  onChange={e => patchBilan(f.key, e.target.value)}
                  disabled={disabled}
                  rows={3}
                  placeholder={f.placeholder}
                  className="w-full text-sm text-white placeholder-white/20 rounded-xl px-3 py-2.5 outline-none resize-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Étape 1 — Compétences */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-white/40">Évaluez honnêtement vos compétences sur une échelle de 1 à 5.</p>
            {COMPETENCES.map(c => (
              <div key={c.key} className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm text-white/80">{c.label}</span>
                <StarRating
                  value={answers.competences?.[c.key] || 0}
                  onChange={v => patchComp(c.key, v)}
                  disabled={disabled}
                />
              </div>
            ))}
            {compAvg && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3 mt-2"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="text-sm font-semibold text-white/80">Moyenne globale</span>
                <span className="text-lg font-bold" style={{ color: RATING_COLORS[Math.round(parseFloat(compAvg))] || '#818CF8' }}>
                  {compAvg}/5
                </span>
              </div>
            )}
          </div>
        )}

        {/* Étape 2 — Objectifs N+1 */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-white/40">Proposez vos objectifs pour la prochaine période.</p>
            {(answers.objectifs_proposes || []).map((obj, i) => (
              <ObjectifItem
                key={obj.id || `obj-${i}`} obj={obj} idx={i}
                onChange={v => updateObjectif(i, v)}
                onRemove={() => removeObjectif(i)}
                disabled={disabled}
              />
            ))}
            {!disabled && (
              <button
                onClick={addObjectif}
                className="w-full rounded-xl py-3 text-sm font-medium transition-colors"
                style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', color: '#818CF8' }}>
                + Ajouter un objectif
              </button>
            )}
            {(answers.objectifs_proposes || []).length === 0 && (
              <div className="flex flex-col items-center py-8 gap-2">
                <Target size={28} className="text-white/10"/>
                <p className="text-xs text-white/30">Aucun objectif proposé pour l'instant.</p>
              </div>
            )}
          </div>
        )}

        {/* Étape 3 — Développement */}
        {step === 3 && (
          <div className="space-y-4">
            {[
              { key: 'besoins_formation',  label: 'Besoins de formation',          placeholder: 'Quelles formations seraient utiles à votre développement ?' },
              { key: 'souhaits_evolution', label: 'Souhaits d\'évolution',          placeholder: 'Quelles évolutions de poste ou responsabilités souhaitez-vous ?' },
              { key: 'actions_dev',        label: 'Actions prioritaires',           placeholder: 'Quelles actions concrètes souhaitez-vous mener pour vous développer ?' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">{f.label}</label>
                <textarea
                  value={answers.developpement?.[f.key] || ''}
                  onChange={e => patchDev(f.key, e.target.value)}
                  disabled={disabled}
                  rows={3}
                  placeholder={f.placeholder}
                  className="w-full text-sm text-white placeholder-white/20 rounded-xl px-3 py-2.5 outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Commentaire libre</label>
              <textarea
                value={answers.commentaire_libre || ''}
                onChange={e => setAnswers(a => ({ ...a, commentaire_libre: e.target.value }))}
                disabled={disabled}
                rows={3}
                placeholder="Tout autre commentaire ou remarque à partager avec votre manager..."
                className="w-full text-sm text-white placeholder-white/20 rounded-xl px-3 py-2.5 outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation + actions */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#ffffff80' }}>
          <ChevronLeft size={14}/> Préc.
        </button>

        <div className="flex items-center gap-2">
          {!disabled && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#ffffff70' }}>
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
              Sauvegarder
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
              Suivant <ChevronRight size={14}/>
            </button>
          ) : !disabled ? (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-opacity"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
              Soumettre l'auto-évaluation
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
