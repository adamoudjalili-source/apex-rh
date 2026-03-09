// ============================================================
// APEX RH — components/compensation/CompensationAdminPanel.jsx
// Session 58 — Administration RH : grilles + révisions + benchmarks
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Edit2, Trash2, CheckCircle2, XCircle,
  Loader2, BarChart3, Users, TrendingUp, Award,
  ChevronDown, ChevronUp, Save, X, AlertTriangle,
} from 'lucide-react'
import {
  useSalaryGrades, useCreateGrade, useUpdateGrade, useDeleteGrade,
  useBenchmarks, useCreateBenchmark, useUpdateBenchmark, useDeleteBenchmark,
  useTeamReviews, useUpdateReview, useApplyReview,
  useTeamBonuses, useCreateBonus, useUpdateBonus,
  useOrgCompensationStats,
  formatSalary, REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS,
  REVIEW_REASON_LABELS, BONUS_TYPE_LABELS, BONUS_STATUS_LABELS,
  GRADE_CATEGORY_LABELS,
} from '../../hooks/useCompensation'

// ── Modal grille ──────────────────────────────────────────────
function GradeModal({ grade, onClose }) {
  const createGrade = useCreateGrade()
  const updateGrade = useUpdateGrade()
  const isEdit = !!grade?.id

  const [form, setForm] = useState({
    code:        grade?.code        || '',
    label:       grade?.label       || '',
    category:    grade?.category    || 'cadre',
    min_salary:  grade?.min_salary  || '',
    mid_salary:  grade?.mid_salary  || '',
    max_salary:  grade?.max_salary  || '',
    currency:    grade?.currency    || 'XOF',
    description: grade?.description || '',
    sort_order:  grade?.sort_order  || 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.code || !form.label || !form.min_salary || !form.max_salary) {
      setError('Code, libellé, salaire min et max sont requis.'); return
    }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        min_salary: parseFloat(form.min_salary),
        mid_salary: form.mid_salary ? parseFloat(form.mid_salary) : null,
        max_salary: parseFloat(form.max_salary),
        sort_order: parseInt(form.sort_order) || 0,
      }
      if (isEdit) await updateGrade.mutateAsync({ id: grade.id, ...payload })
      else        await createGrade.mutateAsync(payload)
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const fields = [
    { key: 'code',       label: 'Code *',         type: 'text',   placeholder: 'G1, C2, D1…' },
    { key: 'label',      label: 'Libellé *',       type: 'text',   placeholder: 'Cadre confirmé' },
    { key: 'min_salary', label: 'Salaire min *',   type: 'number', placeholder: '0' },
    { key: 'mid_salary', label: 'Point médian',    type: 'number', placeholder: '' },
    { key: 'max_salary', label: 'Salaire max *',   type: 'number', placeholder: '0' },
    { key: 'sort_order', label: 'Ordre affichage', type: 'number', placeholder: '0' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-semibold text-white">{isEdit ? 'Modifier la grille' : 'Nouvelle grille salariale'}</h2>
          <button onClick={onClose}><X size={16} className="text-white/40 hover:text-white/70"/></button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Catégorie */}
          <div>
            <label className="text-[11px] text-white/45 block mb-1">Catégorie</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white/70 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {Object.entries(GRADE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Champs texte/number */}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key} className={key === 'label' ? 'col-span-2' : ''}>
                <label className="text-[11px] text-white/45 block mb-1">{label}</label>
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white/70 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}/>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] text-white/45 block mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Description optionnelle"
              className="w-full px-3 py-2 rounded-lg text-sm text-white/70 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}/>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: 'rgba(99,102,241,0.6)' }}>
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Section grilles ───────────────────────────────────────────
function GradesSection() {
  const { data: grades = [], isLoading } = useSalaryGrades()
  const deleteGrade = useDeleteGrade()
  const [modal, setModal] = useState(null) // null | 'new' | grade object

  const CATEGORIES = [...new Set(grades.map(g => g.category).filter(Boolean))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">Grilles salariales ({grades.filter(g => g.is_active).length} actives)</h3>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Plus size={12}/> Nouvelle grille
        </button>
      </div>

      {isLoading && <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-white/30"/></div>}

      {CATEGORIES.map(cat => (
        <div key={cat}>
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2">{GRADE_CATEGORY_LABELS[cat] || cat}</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {grades.filter(g => g.category === cat && g.is_active).map((grade, idx, arr) => (
              <div key={grade.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="flex-shrink-0">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                    style={{ background: 'rgba(201,162,39,0.15)', color: '#C9A227' }}>{grade.code}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/75 truncate">{grade.label}</p>
                  <p className="text-[11px] text-white/30">
                    {formatSalary(grade.min_salary)} → {formatSalary(grade.max_salary)}
                    {grade.mid_salary && ` · Médian ${formatSalary(grade.mid_salary)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setModal(grade)}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors">
                    <Edit2 size={12}/>
                  </button>
                  <button onClick={() => deleteGrade.mutate(grade.id)}
                    className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {grades.filter(g => !g.category).length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {grades.filter(g => !g.category && g.is_active).map((grade, idx, arr) => (
            <div key={grade.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                style={{ background: 'rgba(201,162,39,0.15)', color: '#C9A227' }}>{grade.code}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/75 truncate">{grade.label}</p>
                <p className="text-[11px] text-white/30">{formatSalary(grade.min_salary)} → {formatSalary(grade.max_salary)}</p>
              </div>
              <button onClick={() => setModal(grade)} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 transition-colors">
                <Edit2 size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && <GradeModal grade={modal === 'new' ? null : modal} onClose={() => setModal(null)}/>}
    </div>
  )
}

// ── Section révisions (validation admin) ─────────────────────
function ReviewsAdminSection() {
  const { data: reviews = [], isLoading } = useTeamReviews()
  const updateReview = useUpdateReview()
  const applyReview  = useApplyReview()

  const pending = reviews.filter(r => ['propose', 'valide'].includes(r.status))

  async function handleAction(review, action) {
    if (action === 'validate') {
      await updateReview.mutateAsync({ id: review.id, status: 'valide', validated_by: null })
    } else if (action === 'apply') {
      await applyReview.mutateAsync({ reviewId: review.id, review })
    } else if (action === 'reject') {
      await updateReview.mutateAsync({ id: review.id, status: 'rejete' })
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/70">
        Révisions en attente ({pending.length})
      </h3>
      {isLoading && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-white/30"/></div>}
      {!isLoading && pending.length === 0 && (
        <div className="py-8 text-center">
          <CheckCircle2 size={24} className="mx-auto text-green-500/30 mb-2"/>
          <p className="text-white/25 text-sm">Aucune révision en attente</p>
        </div>
      )}
      <div className="space-y-2">
        {pending.map(rev => (
          <div key={rev.id} className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-white/80">
                  {rev.employee?.first_name} {rev.employee?.last_name}
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {REVIEW_REASON_LABELS[rev.reason]} · {new Date(rev.review_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: Number(rev.increase_pct) >= 0 ? '#10B981' : '#EF4444' }}>
                  {Number(rev.increase_pct) >= 0 ? '+' : ''}{Number(rev.increase_pct).toFixed(2)}%
                </p>
                <p className="text-[11px] text-white/40">{formatSalary(rev.old_base_salary)} → {formatSalary(rev.new_base_salary)}</p>
              </div>
            </div>
            {rev.justification && <p className="text-xs text-white/30 mb-3 italic">"{rev.justification}"</p>}
            <div className="flex gap-2">
              {rev.status === 'propose' && (
                <button onClick={() => handleAction(rev, 'validate')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <CheckCircle2 size={11}/> Valider
                </button>
              )}
              {rev.status === 'valide' && (
                <button onClick={() => handleAction(rev, 'apply')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle2 size={11}/> Appliquer
                </button>
              )}
              <button onClick={() => handleAction(rev, 'reject')}
                className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
                <XCircle size={11}/> Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stats org ─────────────────────────────────────────────────
function OrgStatsSection() {
  const { data: stats, isLoading } = useOrgCompensationStats()
  if (isLoading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-white/30"/></div>
  if (!stats) return <p className="text-white/25 text-sm text-center py-4">Aucune donnée disponible</p>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { label: 'Effectif rémunéré',    value: stats.count,                                           color: '#6366F1' },
        { label: 'Masse salariale',       value: formatSalary(stats.total_mass),                        color: '#3B82F6' },
        { label: 'Salaire moyen',         value: formatSalary(stats.avg_base),                          color: '#10B981' },
        { label: 'Salaire médian',        value: formatSalary(stats.median_base),                       color: '#C9A227' },
        { label: 'Sous le min grille',    value: stats.below_grade_min,                                 color: stats.below_grade_min > 0 ? '#EF4444' : '#10B981' },
        { label: 'Au-dessus du max',      value: stats.above_grade_max,                                 color: stats.above_grade_max > 0 ? '#F59E0B' : '#10B981' },
      ].map(({ label, value, color }) => (
        <div key={label} className="rounded-xl p-3.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] text-white/35 mb-1">{label}</p>
          <p className="text-base font-bold" style={{ color }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────
export default function CompensationAdminPanel() {
  const [activeTab, setActiveTab] = useState('stats')

  const TABS = [
    { id: 'stats',   label: 'Vue globale' },
    { id: 'grades',  label: 'Grilles salariales' },
    { id: 'reviews', label: 'Révisions' },
  ]

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
            style={activeTab === t.id
              ? { background: 'rgba(201,162,39,0.2)', color: '#C9A227' }
              : { color: 'rgba(255,255,255,0.35)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'stats'   && <OrgStatsSection/>}
      {activeTab === 'grades'  && <GradesSection/>}
      {activeTab === 'reviews' && <ReviewsAdminSection/>}
    </div>
  )
}
