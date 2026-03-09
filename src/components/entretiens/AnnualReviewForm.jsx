// ============================================================
// APEX RH — components/entretiens/AnnualReviewForm.jsx
// Session 60 — Formulaire entretien annuel
// Deux modes : auto-évaluation (employee) + évaluation manager
// ============================================================
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, ChevronRight, ChevronLeft, Save, Send,
  Star, MessageSquare, Target, TrendingUp, BookOpen,
  AlertCircle, Clock, User, Calendar, MapPin,
  BarChart2, Loader2, Edit3, Lock,
} from 'lucide-react'
import { useAuth }           from '../../contexts/AuthContext'
import {
  useSaveAutoEval, useSubmitAutoEval, useSaveManagerEval, useSubmitManagerEval,
  useScheduleMeeting, useSignReview, useManagerSignReview,
  DEFAULT_TEMPLATE_SECTIONS,
  OVERALL_RATING_LABELS, OVERALL_RATING_COLORS,
  SALARY_RECOMMENDATION_LABELS, SALARY_RECOMMENDATION_COLORS,
  computeSelfScore, getReviewProgress,
  isDeadlineSoon, isDeadlineOverdue,
} from '../../hooks/useAnnualReviews'

// ─── Composants utilitaires ───────────────────────────────────

function ProgressBar({ value, color = '#4F46E5' }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

function SectionBadge({ index, total, active, completed }) {
  let bg = 'rgba(255,255,255,0.06)'
  let color = '#ffffff40'
  if (completed) { bg = 'rgba(16,185,129,0.2)'; color = '#10B981' }
  if (active) { bg = 'rgba(79,70,229,0.25)'; color = '#818CF8' }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
      style={{ background: bg, color, border: `1px solid ${active ? '#4F46E5' : 'transparent'}` }}>
      {completed ? <CheckCircle size={14}/> : index + 1}
    </div>
  )
}

function RatingStars({ value, onChange, max = 5, disabled = false, label }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value ?? 0
  const LABELS = ['', 'Insuffisant', 'À améliorer', 'Satisfaisant', 'Bien', 'Excellent']
  const COLORS = ['', '#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#10B981']
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs text-white/60">{label}</p>}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <button key={i}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHovered(i + 1)}
            onMouseLeave={() => !disabled && setHovered(null)}
            onClick={() => !disabled && onChange?.(i + 1)}
            className="transition-all duration-150"
            style={{ transform: display > i ? 'scale(1.1)' : 'scale(1)' }}>
            <Star size={22}
              fill={display > i ? COLORS[display] : 'transparent'}
              style={{ color: display > i ? COLORS[display] : 'rgba(255,255,255,0.15)' }}/>
          </button>
        ))}
        {display > 0 && (
          <span className="ml-2 text-xs font-medium" style={{ color: COLORS[display] }}>
            {LABELS[display]}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Section : Bilan ─────────────────────────────────────────

function SectionBilan({ data, onChange, disabled }) {
  const fields = [
    { key: 'accomplissements', label: 'Vos principales réalisations de l\'année', rows: 4 },
    { key: 'points_forts',     label: 'Vos points forts',                          rows: 3 },
    { key: 'difficultes',      label: 'Difficultés rencontrées',                   rows: 3 },
    { key: 'apprentissages',   label: 'Principaux apprentissages',                 rows: 3 },
  ]
  return (
    <div className="space-y-4">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-white/70 mb-1.5">{f.label}</label>
          <textarea rows={f.rows} disabled={disabled}
            value={data?.[f.key] ?? ''}
            onChange={e => onChange({ ...data, [f.key]: e.target.value })}
            placeholder={disabled ? '—' : 'Votre réponse…'}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Section : Compétences ────────────────────────────────────

function SectionCompetences({ data, onChange, disabled, managerData, showComparison }) {
  const COMPETENCIES = [
    { key: 'qualite',        label: 'Qualité du travail',       desc: 'Précision, soin, conformité aux standards' },
    { key: 'delais',         label: 'Respect des délais',       desc: 'Ponctualité, gestion du temps, engagements tenus' },
    { key: 'communication',  label: 'Communication',            desc: 'Clarté, écoute active, transmission d\'information' },
    { key: 'travail_equipe', label: 'Esprit d\'équipe',         desc: 'Collaboration, entraide, cohésion collective' },
    { key: 'initiative',     label: 'Initiative & Proactivité', desc: 'Force de proposition, autonomie, créativité' },
    { key: 'adaptabilite',   label: 'Adaptabilité',             desc: 'Flexibilité face aux changements et imprévus' },
  ]
  return (
    <div className="space-y-5">
      {showComparison && (
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"/>Auto-évaluation</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>Évaluation manager</span>
        </div>
      )}
      {COMPETENCIES.map(comp => (
        <div key={comp.key} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-sm font-semibold text-white">{comp.label}</p>
              <p className="text-xs text-white/40 mt-0.5">{comp.desc}</p>
            </div>
          </div>
          {showComparison && managerData?.[comp.key] ? (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-indigo-400 mb-1">Auto-évaluation</p>
                <RatingStars value={data?.[comp.key]} disabled max={5}/>
              </div>
              <div>
                <p className="text-xs text-emerald-400 mb-1">Évaluation manager</p>
                <RatingStars value={managerData[comp.key]} disabled max={5}/>
              </div>
            </div>
          ) : (
            <RatingStars
              value={data?.[comp.key]}
              onChange={v => onChange({ ...data, [comp.key]: v })}
              disabled={disabled}
              max={5}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Section : Objectifs N+1 ──────────────────────────────────

function SectionObjectives({ data, onChange, disabled }) {
  const objectives = data?.objectifs ?? []
  const addObjective = () => {
    if (disabled) return
    onChange({ ...data, objectifs: [...objectives, { title: '', indicator: '', target: '', deadline: '' }] })
  }
  const updateObj = (i, field, val) => {
    const updated = objectives.map((o, idx) => idx === i ? { ...o, [field]: val } : o)
    onChange({ ...data, objectifs: updated })
  }
  const removeObj = (i) => {
    onChange({ ...data, objectifs: objectives.filter((_, idx) => idx !== i) })
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-white/50">Définissez 3 à 5 objectifs SMART pour la prochaine année</p>
      {objectives.map((obj, i) => (
        <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-400">Objectif {i + 1}</span>
            {!disabled && (
              <button onClick={() => removeObj(i)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Supprimer</button>
            )}
          </div>
          <div className="space-y-2.5">
            {[
              { field: 'title',     label: 'Intitulé de l\'objectif', placeholder: 'Ex: Améliorer le taux de satisfaction client à 92%' },
              { field: 'indicator', label: 'Indicateur de succès',    placeholder: 'Ex: Score CSAT mesuré mensuellement' },
              { field: 'target',    label: 'Cible',                    placeholder: 'Ex: ≥ 92% sur 6 mois consécutifs' },
              { field: 'deadline',  label: 'Échéance',                 placeholder: 'Ex: Décembre 2026' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs text-white/50 mb-1">{f.label}</label>
                <input type="text" disabled={disabled}
                  value={obj[f.field] ?? ''}
                  onChange={e => updateObj(i, f.field, e.target.value)}
                  placeholder={disabled ? '—' : f.placeholder}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white/90"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {!disabled && objectives.length < 5 && (
        <button onClick={addObjective}
          className="w-full rounded-xl py-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          style={{ border: '1px dashed rgba(99,102,241,0.3)' }}>
          + Ajouter un objectif
        </button>
      )}
    </div>
  )
}

// ─── Section : Développement ──────────────────────────────────

function SectionDeveloppement({ data, onChange, disabled }) {
  const fields = [
    { key: 'besoins_formation',  label: 'Besoins de formation identifiés', rows: 3,
      placeholder: 'Ex: Formation Power BI, certification PMP, perfectionnement en anglais…' },
    { key: 'souhaits_evolution', label: 'Souhaits d\'évolution professionnelle', rows: 3,
      placeholder: 'Ex: Évoluer vers un poste de management, prendre en charge un projet transverse…' },
    { key: 'actions_dev',        label: 'Actions de développement prioritaires', rows: 3,
      placeholder: 'Ex: Mentorat par un expert senior, participation à des conférences sectorielles…' },
  ]
  return (
    <div className="space-y-4">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-white/70 mb-1.5">{f.label}</label>
          <textarea rows={f.rows} disabled={disabled}
            value={data?.[f.key] ?? ''}
            onChange={e => onChange({ ...data, [f.key]: e.target.value })}
            placeholder={disabled ? '—' : f.placeholder}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Section : Synthèse auto ──────────────────────────────────

function AutoSynthesisBlock({ synthesis }) {
  if (!synthesis) return null
  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={15} style={{ color: '#C9A227' }}/>
        <span className="text-xs font-semibold text-amber-400">Synthèse automatique de l'année</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {synthesis.pulse_avg_score != null && (
          <div className="text-center">
            <p className="text-lg font-bold text-white">{synthesis.pulse_avg_score}<span className="text-xs text-white/40">/100</span></p>
            <p className="text-xs text-white/40 mt-0.5">Score PULSE moyen</p>
          </div>
        )}
        {synthesis.okr_completion_rate != null && (
          <div className="text-center">
            <p className="text-lg font-bold text-white">{synthesis.okr_completion_rate}<span className="text-xs text-white/40">%</span></p>
            <p className="text-xs text-white/40 mt-0.5">Taux complétion OKR</p>
          </div>
        )}
        {synthesis.feedback360_avg != null && (
          <div className="text-center">
            <p className="text-lg font-bold text-white">{synthesis.feedback360_avg}<span className="text-xs text-white/40">/5</span></p>
            <p className="text-xs text-white/40 mt-0.5">Score Feedback 360°</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

const SECTION_ICONS = {
  bilan:        MessageSquare,
  competences:  Star,
  objectifs:    Target,
  developpement: BookOpen,
  commentaires: Edit3,
}

export default function AnnualReviewForm({ review, mode = 'self', onClose }) {
  // mode: 'self' | 'manager' | 'view'
  const { profile } = useAuth()

  const campaign = review?.campaign
  const sections = campaign?.template_sections ?? DEFAULT_TEMPLATE_SECTIONS

  const [currentSection, setCurrentSection] = useState(0)
  const [formData, setFormData] = useState({})
  const [selfComment, setSelfComment] = useState('')
  const [managerFormData, setManagerFormData] = useState({})
  const [managerComment, setManagerComment] = useState('')
  const [overallRating, setOverallRating] = useState('')
  const [salaryReco, setSalaryReco] = useState('')
  const [salaryPct, setSalaryPct] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [signComment, setSignComment] = useState('')
  const [showSignConfirm, setShowSignConfirm] = useState(false)
  const [success, setSuccess] = useState('')

  const saveAutoEval    = useSaveAutoEval()
  const submitAutoEval  = useSubmitAutoEval()
  const saveManagerEval = useSaveManagerEval()
  const submitManagerEval = useSubmitManagerEval()
  const scheduleMeeting = useScheduleMeeting()
  const signReview      = useSignReview()
  const managerSign     = useManagerSignReview()

  // Init form from review data
  useEffect(() => {
    if (review) {
      if (review.self_eval) setFormData(review.self_eval)
      if (review.self_comment) setSelfComment(review.self_comment)
      if (review.manager_eval) setManagerFormData(review.manager_eval)
      if (review.manager_comment) setManagerComment(review.manager_comment)
      if (review.overall_rating) setOverallRating(review.overall_rating)
      if (review.salary_recommendation) setSalaryReco(review.salary_recommendation)
      if (review.salary_increase_pct) setSalaryPct(String(review.salary_increase_pct))
      if (review.strengths) setStrengths(review.strengths)
      if (review.improvement_areas) setImprovements(review.improvement_areas)
    }
  }, [review?.id])

  const isDisabled = mode === 'view' || (mode === 'self' && ['self_submitted','meeting_scheduled','manager_in_progress','completed','signed','archived'].includes(review?.status))
  const canSubmitSelf = mode === 'self' && !isDisabled
  const canSubmitManager = mode === 'manager' && ['self_submitted','meeting_scheduled','manager_in_progress'].includes(review?.status)
  const canSign = mode === 'self' && review?.status === 'completed' && !review?.employee_signed_at

  const getSectionData = (sId) => {
    if (mode === 'manager') return managerFormData[sId]
    return formData[sId]
  }
  const setSectionData = (sId, val) => {
    if (mode === 'manager') setManagerFormData(prev => ({ ...prev, [sId]: val }))
    else setFormData(prev => ({ ...prev, [sId]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mode === 'self') {
        await saveAutoEval.mutateAsync({ review_id: review.id, self_eval: formData, self_comment: selfComment })
      } else if (mode === 'manager') {
        await saveManagerEval.mutateAsync({
          review_id: review.id, manager_eval: managerFormData, manager_comment: managerComment,
          overall_rating: overallRating, salary_recommendation: salaryReco,
          salary_increase_pct: salaryPct ? parseFloat(salaryPct) : null,
          strengths, improvement_areas: improvements,
          objectives_next_year: managerFormData.objectifs_finaux ?? null,
          development_plan: managerFormData.plan_dev ?? null,
        })
      }
      setSuccess('Brouillon sauvegardé')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) { }
    setSaving(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (mode === 'self') {
        await submitAutoEval.mutateAsync({ review_id: review.id, self_eval: formData, self_comment: selfComment })
        setSuccess('Auto-évaluation soumise !')
      } else if (mode === 'manager') {
        await submitManagerEval.mutateAsync({
          review_id: review.id, manager_eval: managerFormData, manager_comment: managerComment,
          overall_rating: overallRating, salary_recommendation: salaryReco,
          salary_increase_pct: salaryPct ? parseFloat(salaryPct) : null,
          strengths, improvement_areas: improvements,
          objectives_next_year: formData.objectifs ?? null,
          development_plan: formData.developpement ?? null,
        })
        setSuccess('Entretien complété !')
      }
      setTimeout(() => onClose?.(), 1500)
    } catch (e) { }
    setSubmitting(false)
  }

  const handleSign = async () => {
    setSubmitting(true)
    try {
      await signReview.mutateAsync({ review_id: review.id, employee_comment_on_review: signComment })
      setSuccess('Entretien signé électroniquement !')
      setTimeout(() => onClose?.(), 1500)
    } catch (e) { }
    setSubmitting(false)
  }

  const handleManagerSign = async () => {
    setSubmitting(true)
    try {
      await managerSign.mutateAsync({ review_id: review.id })
      setSuccess('Signature manager enregistrée !')
      setTimeout(() => onClose?.(), 1500)
    } catch (e) { }
    setSubmitting(false)
  }

  const handleScheduleMeeting = async () => {
    if (!meetingDate) return
    setSaving(true)
    try {
      await scheduleMeeting.mutateAsync({ review_id: review.id, meeting_date: meetingDate, meeting_location: meetingLocation })
      setShowMeetingForm(false)
      setSuccess('Réunion planifiée !')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) { }
    setSaving(false)
  }

  const section = sections[currentSection]
  const sectionId = section?.id

  const renderSection = () => {
    const sData = getSectionData(sectionId)
    const selfComp = formData.competences
    const mgrComp = managerFormData.competences
    const showComp = mode === 'view' && selfComp && mgrComp

    if (sectionId === 'bilan') return (
      <SectionBilan data={sData} onChange={v => setSectionData(sectionId, v)} disabled={isDisabled && mode !== 'manager'}/>
    )
    if (sectionId === 'competences') return (
      <SectionCompetences
        data={mode === 'manager' ? mgrComp ?? {} : selfComp ?? {}}
        onChange={v => setSectionData(sectionId, v)}
        disabled={isDisabled && mode !== 'manager'}
        managerData={mgrComp}
        showComparison={showComp}
      />
    )
    if (sectionId === 'objectifs') return (
      <SectionObjectives data={sData} onChange={v => setSectionData(sectionId, v)} disabled={isDisabled && mode !== 'manager'}/>
    )
    if (sectionId === 'developpement') return (
      <SectionDeveloppement data={sData} onChange={v => setSectionData(sectionId, v)} disabled={isDisabled && mode !== 'manager'}/>
    )
    // commentaires
    return (
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Commentaire libre</label>
        <textarea rows={5}
          disabled={isDisabled && mode !== 'manager'}
          value={getSectionData(sectionId)?.commentaire_libre ?? ''}
          onChange={e => setSectionData(sectionId, { commentaire_libre: e.target.value })}
          placeholder="Vos observations, suggestions, questions pour votre manager…"
          className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
        />
      </div>
    )
  }

  const SectionIcon = SECTION_ICONS[sectionId] ?? MessageSquare

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">
              {mode === 'self' ? 'Mon auto-évaluation' : mode === 'manager' ? 'Évaluation manager' : 'Consultation entretien'}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {review?.campaign?.title} · {review?.campaign?.year}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-white/40">Progression</div>
            <div className="text-sm font-bold text-white">{getReviewProgress(review)}%</div>
          </div>
        </div>

        {review?.auto_synthesis && <AutoSynthesisBlock synthesis={review.auto_synthesis}/>}

        {/* Navigation sections */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-0.5 scrollbar-none">
          {sections.map((s, i) => {
            const SIcon = SECTION_ICONS[s.id] ?? MessageSquare
            const isCompleted = i < currentSection
            const isActive = i === currentSection
            return (
              <button key={s.id} onClick={() => setCurrentSection(i)}
                className="flex items-center gap-1.5 flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs transition-all"
                style={{
                  background: isActive ? 'rgba(79,70,229,0.2)' : isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : isCompleted ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: isActive ? '#818CF8' : isCompleted ? '#10B981' : '#ffffff50',
                }}>
                <SIcon size={13}/>
                <span className="hidden sm:inline">{s.title}</span>
                <span className="inline sm:hidden">{i + 1}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu section */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div key={currentSection}
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <SectionIcon size={15} style={{ color: '#818CF8' }}/>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{section?.title}</h3>
                <p className="text-xs text-white/40">{section?.description}</p>
              </div>
            </div>
            {renderSection()}
          </motion.div>
        </AnimatePresence>

        {/* Commentaire final + Note globale (dernière section OU mode manager) */}
        {(currentSection === sections.length - 1 || mode === 'manager') && (
          <div className="mt-6 space-y-4">
            {mode === 'self' && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Commentaire global</label>
                <textarea rows={3} disabled={isDisabled}
                  value={selfComment}
                  onChange={e => setSelfComment(e.target.value)}
                  placeholder="Votre ressenti global sur cette année, vos attentes pour la suite…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                />
              </div>
            )}

            {mode === 'manager' && (
              <div className="space-y-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 className="text-sm font-semibold text-white/80">Conclusion manager</h4>

                {/* Note globale */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Note globale</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(OVERALL_RATING_LABELS).map(([key, label]) => (
                      <button key={key}
                        onClick={() => setOverallRating(key)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          background: overallRating === key ? `${OVERALL_RATING_COLORS[key]}20` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${overallRating === key ? OVERALL_RATING_COLORS[key] : 'rgba(255,255,255,0.08)'}`,
                          color: overallRating === key ? OVERALL_RATING_COLORS[key] : '#ffffff50',
                        }}>{label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reco salariale */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Recommandation salariale</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SALARY_RECOMMENDATION_LABELS).map(([key, label]) => (
                      <button key={key}
                        onClick={() => setSalaryReco(key)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          background: salaryReco === key ? `${SALARY_RECOMMENDATION_COLORS[key]}20` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${salaryReco === key ? SALARY_RECOMMENDATION_COLORS[key] : 'rgba(255,255,255,0.08)'}`,
                          color: salaryReco === key ? SALARY_RECOMMENDATION_COLORS[key] : '#ffffff50',
                        }}>{label}
                      </button>
                    ))}
                  </div>
                </div>

                {(salaryReco === 'augmentation_merite' || salaryReco === 'augmentation_promotion' || salaryReco === 'revision_exceptionnelle') && (
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">% d'augmentation proposée</label>
                    <input type="number" min={0} max={100} step={0.5}
                      value={salaryPct} onChange={e => setSalaryPct(e.target.value)}
                      placeholder="Ex: 5.5"
                      className="w-32 rounded-lg px-3 py-2 text-sm text-white/90"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    />
                  </div>
                )}

                {[
                  { label: 'Points forts', val: strengths, set: setStrengths },
                  { label: 'Axes d\'amélioration', val: improvements, set: setImprovements },
                  { label: 'Commentaire global', val: managerComment, set: setManagerComment },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs text-white/50 mb-1.5">{f.label}</label>
                    <textarea rows={3} value={f.val} onChange={e => f.set(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Planning réunion */}
        {mode === 'manager' && review?.status === 'self_submitted' && (
          <div className="mt-4">
            {!showMeetingForm ? (
              <button onClick={() => setShowMeetingForm(true)}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                <Calendar size={15}/> Planifier l'entretien
              </button>
            ) : (
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-sm font-medium text-white/80">Planifier l'entretien annuel</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Date et heure</label>
                    <input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white/90"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Lieu / Lien</label>
                    <input type="text" placeholder="Salle A / Teams…" value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white/90"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleScheduleMeeting} disabled={saving || !meetingDate}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'rgba(79,70,229,0.8)' }}>
                    {saving ? <Loader2 size={14} className="animate-spin"/> : <Calendar size={14}/>}
                    Confirmer
                  </button>
                  <button onClick={() => setShowMeetingForm(false)} className="text-sm text-white/40 hover:text-white/60 transition-colors px-3 py-2">Annuler</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature employee */}
        {canSign && (
          <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} style={{ color: '#10B981' }}/>
              <p className="text-sm font-medium text-emerald-400">Votre entretien est complété — Signature requise</p>
            </div>
            <textarea rows={2} value={signComment} onChange={e => setSignComment(e.target.value)}
              placeholder="Commentaire optionnel avant signature…"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white/90 resize-none mb-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
            />
            <button onClick={handleSign} disabled={submitting}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              {submitting ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
              Signer électroniquement
            </button>
          </div>
        )}

        {/* Signature manager */}
        {mode === 'manager' && review?.status === 'completed' && !review?.manager_signed_at && (
          <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} style={{ color: '#10B981' }}/>
              <p className="text-sm font-medium text-emerald-400">Entretien complété — Votre signature manager est requise</p>
            </div>
            <button onClick={handleManagerSign} disabled={submitting}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              {submitting ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
              Signer en tant que manager
            </button>
          </div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
            <CheckCircle size={15}/>{success}
          </motion.div>
        )}
      </div>

      {/* Footer navigation */}
      {!isDisabled && (
        <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-2">
            <button onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
              disabled={currentSection === 0}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white/80 disabled:opacity-30 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <ChevronLeft size={15}/> Précédent
            </button>
            {currentSection < sections.length - 1 && (
              <button onClick={() => setCurrentSection(s => s + 1)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/80 hover:text-white transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                Suivant <ChevronRight size={15}/>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white/80 transition-all disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
              Sauvegarder
            </button>
            {(canSubmitSelf || canSubmitManager) && currentSection === sections.length - 1 && (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                {submitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                {mode === 'self' ? 'Soumettre' : 'Finaliser'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
