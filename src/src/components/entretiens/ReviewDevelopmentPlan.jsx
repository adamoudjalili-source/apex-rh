// ============================================================
// APEX RH — components/entretiens/ReviewDevelopmentPlan.jsx
// Session 80 — Plan de développement individuel (PDI)
// ============================================================
import { useState, useEffect } from 'react'
import {
  BookOpen, Plus, Trash2, CheckCircle, Circle,
  ChevronDown, ChevronUp, Save, Loader2, Calendar,
} from 'lucide-react'
import {
  useReviewDevelopmentPlan,
  useUpsertDevelopmentPlan,
} from '../../hooks/useAnnualReviews'

const GOAL_CATEGORIES = [
  { value: 'competence',  label: 'Compétence technique',  color: '#3B82F6' },
  { value: 'leadership',  label: 'Leadership',             color: '#8B5CF6' },
  { value: 'mobilite',    label: 'Mobilité / Évolution',   color: '#F59E0B' },
  { value: 'formation',   label: 'Formation',              color: '#10B981' },
  { value: 'autre',       label: 'Autre',                  color: '#6B7280' },
]

const GOAL_STATUS = [
  { value: 'pending',     label: 'En attente',  color: '#6B7280' },
  { value: 'in_progress', label: 'En cours',    color: '#F59E0B' },
  { value: 'completed',   label: 'Complété',    color: '#10B981' },
  { value: 'abandoned',   label: 'Abandonné',   color: '#EF4444' },
]

function statusColor(s) { return GOAL_STATUS.find(x => x.value === s)?.color ?? '#6B7280' }
function catColor(c)    { return GOAL_CATEGORIES.find(x => x.value === c)?.color ?? '#6B7280' }
function catLabel(c)    { return GOAL_CATEGORIES.find(x => x.value === c)?.label ?? c }

// ─── GoalCard ─────────────────────────────────────────────────

function GoalCard({ goal, idx, onChange, onRemove, editable }) {
  const [expanded, setExpanded] = useState(false)

  function toggleAction(ai) {
    const actions = [...(goal.actions || [])]
    actions[ai] = { ...actions[ai], done: !actions[ai].done }
    onChange({ ...goal, actions })
  }
  function addAction() {
    onChange({ ...goal, actions: [...(goal.actions || []), { text: '', done: false }] })
  }
  function updateAction(ai, text) {
    const actions = [...(goal.actions || [])]
    actions[ai] = { ...actions[ai], text }
    onChange({ ...goal, actions })
  }
  function removeAction(ai) {
    onChange({ ...goal, actions: (goal.actions || []).filter((_, i) => i !== ai) })
  }

  const doneActions = (goal.actions || []).filter(a => a.done).length
  const totalActions = (goal.actions || []).length

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header goal */}
      <div className="flex items-start gap-3 p-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
          style={{ background: `${catColor(goal.category)}20`, color: catColor(goal.category) }}>
          {idx + 1}
        </div>

        <div className="flex-1 min-w-0">
          {editable ? (
            <input
              value={goal.title || ''}
              onChange={e => onChange({ ...goal, title: e.target.value })}
              placeholder="Titre de l'objectif de développement..."
              className="w-full bg-transparent text-sm font-semibold text-white placeholder-white/25 outline-none border-b pb-1"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            />
          ) : (
            <p className="text-sm font-semibold text-white truncate">{goal.title || 'Sans titre'}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {/* Catégorie */}
            {editable ? (
              <select
                value={goal.category || 'autre'}
                onChange={e => onChange({ ...goal, category: e.target.value })}
                className="text-xs rounded-full px-2 py-0.5 outline-none"
                style={{ background: `${catColor(goal.category || 'autre')}15`, color: catColor(goal.category || 'autre'), border: `1px solid ${catColor(goal.category || 'autre')}40` }}>
                {GOAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            ) : (
              <span className="text-xs rounded-full px-2 py-0.5"
                style={{ background: `${catColor(goal.category)}15`, color: catColor(goal.category) }}>
                {catLabel(goal.category)}
              </span>
            )}

            {/* Statut */}
            {editable ? (
              <select
                value={goal.status || 'pending'}
                onChange={e => onChange({ ...goal, status: e.target.value })}
                className="text-xs rounded-full px-2 py-0.5 outline-none"
                style={{ background: `${statusColor(goal.status)}15`, color: statusColor(goal.status), border: `1px solid ${statusColor(goal.status)}40` }}>
                {GOAL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            ) : (
              <span className="text-xs rounded-full px-2 py-0.5"
                style={{ background: `${statusColor(goal.status)}15`, color: statusColor(goal.status) }}>
                {GOAL_STATUS.find(s => s.value === goal.status)?.label}
              </span>
            )}

            {/* Deadline */}
            {editable ? (
              <input
                type="date" value={goal.deadline || ''}
                onChange={e => onChange({ ...goal, deadline: e.target.value })}
                className="text-xs bg-transparent outline-none text-white/40"
              />
            ) : goal.deadline && (
              <span className="text-xs text-white/35 flex items-center gap-1">
                <Calendar size={10}/> {new Date(goal.deadline).toLocaleDateString('fr-FR')}
              </span>
            )}

            {/* Actions progress */}
            {totalActions > 0 && (
              <span className="text-xs text-white/35">{doneActions}/{totalActions} actions</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setExpanded(e => !e)} className="text-white/30 hover:text-white/60 transition-colors">
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          {editable && (
            <button onClick={onRemove} className="text-red-400/40 hover:text-red-400 transition-colors">
              <Trash2 size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Description */}
          {editable ? (
            <textarea
              value={goal.description || ''}
              onChange={e => onChange({ ...goal, description: e.target.value })}
              placeholder="Description détaillée..."
              rows={2}
              className="w-full text-xs text-white/60 placeholder-white/20 bg-transparent outline-none resize-none"
            />
          ) : goal.description && (
            <p className="text-xs text-white/50">{goal.description}</p>
          )}

          {/* Actions */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/40 font-medium">Actions concrètes</p>
            {(goal.actions || []).map((action, ai) => (
              <div key={ai} className="flex items-start gap-2">
                <button onClick={() => editable && toggleAction(ai)} className="mt-0.5 flex-shrink-0">
                  {action.done
                    ? <CheckCircle size={14} style={{ color: '#10B981' }}/>
                    : <Circle size={14} className="text-white/25"/>
                  }
                </button>
                {editable ? (
                  <input
                    value={action.text}
                    onChange={e => updateAction(ai, e.target.value)}
                    placeholder="Action à mener..."
                    className="flex-1 text-xs bg-transparent outline-none text-white/70 placeholder-white/20"
                    style={{ textDecoration: action.done ? 'line-through' : 'none' }}
                  />
                ) : (
                  <span className="flex-1 text-xs text-white/60" style={{ textDecoration: action.done ? 'line-through' : 'none' }}>
                    {action.text}
                  </span>
                )}
                {editable && (
                  <button onClick={() => removeAction(ai)} className="text-red-400/30 hover:text-red-400 transition-colors">
                    <Trash2 size={10}/>
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button onClick={addAction}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                <Plus size={11}/> Ajouter une action
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────

export default function ReviewDevelopmentPlan({ review, editable = false }) {
  const { data: plan, isLoading } = useReviewDevelopmentPlan(review?.id)
  const upsert = useUpsertDevelopmentPlan()

  const [goals, setGoals]         = useState([])
  const [nextCheck, setNextCheck] = useState('')
  const [planStatus, setPlanStatus] = useState('pending')
  const [managerComment, setManagerComment] = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (plan) {
      setGoals(plan.goals ?? [])
      setNextCheck(plan.next_check_date ?? '')
      setPlanStatus(plan.status ?? 'pending')
      setManagerComment(plan.manager_comment ?? '')
    }
  }, [plan])

  function addGoal() {
    setGoals(g => [...g, { title: '', category: 'competence', status: 'pending', description: '', deadline: '', actions: [] }])
  }

  async function save() {
    setSaving(true)
    try {
      await upsert.mutateAsync({
        review_id: review.id,
        goals,
        next_check_date: nextCheck || null,
        status: planStatus,
        manager_comment: managerComment || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const completedGoals = goals.filter(g => g.status === 'completed').length

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-white/30"/></div>
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} style={{ color: '#818CF8' }}/>
          <h3 className="text-sm font-bold text-white">Plan de Développement Individuel</h3>
        </div>
        {goals.length > 0 && (
          <span className="text-xs text-white/40">{completedGoals}/{goals.length} complétés</span>
        )}
      </div>

      {/* Barre de progression globale */}
      {goals.length > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Progression globale</span>
            <span>{Math.round(completedGoals / goals.length * 100)}%</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-1.5 rounded-full transition-all"
              style={{ width: `${Math.round(completedGoals / goals.length * 100)}%`, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }}/>
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2">
          <BookOpen size={28} className="text-white/10"/>
          <p className="text-sm text-white/30">Aucun objectif de développement défini.</p>
          {editable && (
            <p className="text-xs text-white/20">Ajoutez des objectifs pour construire le PDI.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map((g, i) => (
            <GoalCard
              key={i} goal={g} idx={i}
              onChange={v => setGoals(arr => arr.map((x, j) => j === i ? v : x))}
              onRemove={() => setGoals(arr => arr.filter((_, j) => j !== i))}
              editable={editable}
            />
          ))}
        </div>
      )}

      {editable && (
        <button onClick={addGoal}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', color: '#818CF8' }}>
          + Ajouter un objectif de développement
        </button>
      )}

      {/* Méta PDI */}
      <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Prochain point de suivi</label>
          {editable ? (
            <input
              type="date" value={nextCheck}
              onChange={e => setNextCheck(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none rounded-lg px-3 py-2"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            />
          ) : (
            <p className="text-sm text-white">{nextCheck ? new Date(nextCheck).toLocaleDateString('fr-FR') : '—'}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Statut du PDI</label>
          {editable ? (
            <select
              value={planStatus}
              onChange={e => setPlanStatus(e.target.value)}
              className="w-full text-sm outline-none rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: statusColor(planStatus) }}>
              {GOAL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) : (
            <p className="text-sm" style={{ color: statusColor(planStatus) }}>
              {GOAL_STATUS.find(s => s.value === planStatus)?.label}
            </p>
          )}
        </div>
      </div>

      {editable && (
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Commentaire manager</label>
          <textarea
            value={managerComment}
            onChange={e => setManagerComment(e.target.value)}
            rows={2}
            placeholder="Points d'attention, encouragements, ajustements..."
            className="w-full text-sm text-white placeholder-white/20 rounded-xl px-3 py-2.5 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
      )}

      {editable && (
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
          {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
          Enregistrer le PDI
        </button>
      )}
    </div>
  )
}
