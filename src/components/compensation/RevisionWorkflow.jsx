// ============================================================
// APEX RH — components/compensation/RevisionWorkflow.jsx
// S74 — Workflow révision salariale
// Demande (manager) + Validation (manager → RH) + Application
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, Clock, AlertCircle, ChevronRight,
  Plus, DollarSign, User, MessageSquare, TrendingUp, RefreshCw
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  usePendingReviews, useAllReviews, useTeamRevisionWorkflow,
  useCreateRevision, useApproveRevision, useRefuseRevision, useApplyRevision,
  useRevisionStats, useCompensationCycles,
  REVIEW_WORKFLOW_STATUS_LABELS, REVIEW_WORKFLOW_STATUS_COLORS,
  REVIEW_REASON_WORKFLOW_LABELS, formatSalary
} from '../../hooks/useCompensation'
import { useUsersList } from '../../hooks/useSettings'

// ─── Badge statut ────────────────────────────────────────────
function StatusBadge({ status }) {
  const label = REVIEW_WORKFLOW_STATUS_LABELS[status] ?? status
  const color = REVIEW_WORKFLOW_STATUS_COLORS[status] ?? '#6B7280'
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

// ─── Étapes workflow ──────────────────────────────────────────
const STEPS = [
  { key: 'soumis',         label: 'Soumis',            icon: Clock       },
  { key: 'valide_manager', label: 'Validé manager',    icon: CheckCircle },
  { key: 'valide_rh',      label: 'Validé RH',         icon: CheckCircle },
  { key: 'applique',       label: 'Appliqué',          icon: TrendingUp  },
]

function WorkflowStepper({ status }) {
  const currentIdx = STEPS.findIndex(s => s.key === status)
  const isRefused = status === 'refuse'
  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const done = !isRefused && i <= currentIdx
        const active = !isRefused && i === currentIdx
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: done ? (active ? '#6366F1' : '#10B981') + '33' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${done ? (active ? '#6366F1' : '#10B981') : 'rgba(255,255,255,0.1)'}`,
                }}>
                <Icon size={12} style={{ color: done ? (active ? '#6366F1' : '#10B981') : 'rgba(255,255,255,0.2)' }} />
              </div>
              <span className="text-[9px] whitespace-nowrap" style={{ color: done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-6 h-px mb-3" style={{ background: done && i < currentIdx ? '#10B981' : 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
        )
      })}
      {isRefused && (
        <div className="flex items-center gap-1 ml-2">
          <XCircle size={14} style={{ color: '#EF4444' }} />
          <span className="text-xs" style={{ color: '#EF4444' }}>Refusé</span>
        </div>
      )}
    </div>
  )
}

// ─── Carte révision ───────────────────────────────────────────
function RevisionCard({ review, onApprove, onRefuse, onApply, showActions }) {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [refuseReason, setRefuseReason] = useState('')
  const [action, setAction] = useState(null) // 'approve' | 'refuse'

  const emp = review.employee ?? {}
  const diff = (review.new_salary ?? 0) - (review.current_salary ?? 0)
  const pct  = review.current_salary > 0 ? ((diff / review.current_salary) * 100).toFixed(1) : 0

  const canApprove = showActions && ['soumis', 'valide_manager'].includes(review.status)
  const canApply   = showActions && review.status === 'valide_rh'

  return (
    <div className="rounded-xl p-4 transition-all hover:bg-white/[0.03]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <User size={16} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <div className="font-semibold text-sm text-white">{emp.full_name ?? '—'}</div>
            <div className="text-xs text-white/40">{emp.job_title ?? ''} · {emp.department ?? ''}</div>
          </div>
        </div>
        <StatusBadge status={review.status} />
      </div>

      {/* Salaires */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-[10px] text-white/35 mb-0.5">Actuel</div>
          <div className="text-xs font-bold text-white">{formatSalary(review.current_salary)}</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(16,185,129,0.06)' }}>
          <div className="text-[10px] text-white/35 mb-0.5">Proposé</div>
          <div className="text-xs font-bold" style={{ color: '#10B981' }}>{formatSalary(review.new_salary)}</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(99,102,241,0.06)' }}>
          <div className="text-[10px] text-white/35 mb-0.5">Hausse</div>
          <div className="text-xs font-bold" style={{ color: diff >= 0 ? '#6366F1' : '#EF4444' }}>
            +{pct}%
          </div>
        </div>
      </div>

      {/* Motif + cycle */}
      <div className="mt-2 flex flex-wrap gap-2">
        {review.review_reason && (
          <span className="px-2 py-0.5 rounded text-[10px]"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
            {REVIEW_REASON_WORKFLOW_LABELS[review.review_reason] ?? review.review_reason}
          </span>
        )}
        {review.cycle?.name && (
          <span className="px-2 py-0.5 rounded text-[10px]"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>
            {review.cycle.name}
          </span>
        )}
      </div>

      {/* Notes */}
      {review.review_notes && (
        <p className="mt-2 text-xs text-white/40 italic">"{review.review_notes}"</p>
      )}
      {review.refused_reason && (
        <p className="mt-2 text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171' }}>
          Motif refus : {review.refused_reason}
        </p>
      )}

      {/* Stepper */}
      {review.status !== 'brouillon' && <WorkflowStepper status={review.status} />}

      {/* Actions */}
      {(canApprove || canApply) && !action && (
        <div className="mt-3 flex gap-2">
          {canApprove && (
            <>
              <button onClick={() => setAction('approve')}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: '#10B981', color: '#fff' }}>
                ✓ Valider
              </button>
              <button onClick={() => setAction('refuse')}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                ✗ Refuser
              </button>
            </>
          )}
          {canApply && (
            <button onClick={() => onApply(review)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}>
              Appliquer
            </button>
          )}
        </div>
      )}

      {/* Formulaire validation */}
      {action === 'approve' && (
        <div className="mt-3 space-y-2">
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)…"
            className="w-full rounded-lg px-3 py-2 text-xs text-white/80 resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            rows={2} />
          <div className="flex gap-2">
            <button onClick={() => { onApprove(review, comment); setAction(null) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#10B981', color: '#fff' }}>
              Confirmer la validation
            </button>
            <button onClick={() => setAction(null)} className="px-3 py-1.5 rounded-lg text-xs text-white/50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {action === 'refuse' && (
        <div className="mt-3 space-y-2">
          <input value={refuseReason} onChange={e => setRefuseReason(e.target.value)}
            placeholder="Motif du refus (obligatoire)…"
            className="w-full rounded-lg px-3 py-2 text-xs text-white/80"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.3)' }} />
          <div className="flex gap-2">
            <button onClick={() => { if (refuseReason) { onRefuse(review, refuseReason); setAction(null) } }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', opacity: refuseReason ? 1 : 0.5 }}>
              Confirmer le refus
            </button>
            <button onClick={() => setAction(null)} className="px-3 py-1.5 rounded-lg text-xs text-white/50">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal création révision ──────────────────────────────────
function CreateRevisionModal({ cycles, onClose, onSubmit }) {
  const { data: orgUsers } = useUsersList()
  const [form, setForm] = useState({
    employee_id: '', review_reason: 'annuelle', current_salary: '', new_salary: '',
    currency: 'XOF', review_notes: '', review_cycle_id: '',
  })

  const employees = (orgUsers ?? []).filter(u => u.role !== 'admin')
  const diff = Number(form.new_salary || 0) - Number(form.current_salary || 0)
  const pct  = form.current_salary > 0 ? ((diff / form.current_salary) * 100).toFixed(1) : '—'

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">Nouvelle demande de révision</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-lg">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Collaborateur *</label>
            <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">— Sélectionner —</option>
              {employees.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Motif *</label>
            <select value={form.review_reason} onChange={e => set('review_reason', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {Object.entries(REVIEW_REASON_WORKFLOW_LABELS).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Salaire actuel (F CFA)</label>
              <input type="number" value={form.current_salary} onChange={e => set('current_salary', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Nouveau salaire</label>
              <input type="number" value={form.new_salary} onChange={e => set('new_salary', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          {form.current_salary && form.new_salary && (
            <div className="rounded-lg p-3 text-center"
              style={{ background: diff >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
              <span className="text-sm font-bold" style={{ color: diff >= 0 ? '#10B981' : '#EF4444' }}>
                {diff >= 0 ? '+' : ''}{formatSalary(diff)} ({pct}%)
              </span>
            </div>
          )}

          {cycles?.length > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Cycle de révision (optionnel)</label>
              <select value={form.review_cycle_id} onChange={e => set('review_cycle_id', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">— Aucun cycle —</option>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-white/50 mb-1 block">Commentaire</label>
            <textarea value={form.review_notes} onChange={e => set('review_notes', e.target.value)}
              placeholder="Justification…"
              className="w-full rounded-lg px-3 py-2 text-sm text-white resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              rows={2} />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            Annuler
          </button>
          <button
            onClick={() => {
              if (!form.employee_id || !form.new_salary || !form.current_salary) return
              onSubmit({ ...form, new_salary: Number(form.new_salary), current_salary: Number(form.current_salary) })
            }}
            disabled={!form.employee_id || !form.new_salary || !form.current_salary}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#6366F1', color: '#fff', opacity: (!form.employee_id || !form.new_salary || !form.current_salary) ? 0.5 : 1 }}>
            Soumettre la demande
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function RevisionWorkflow() {
  const { canAdmin, canValidate, canManageTeam } = useAuth()
  const [subTab, setSubTab] = useState(canAdmin || canValidate ? 'pending' : 'team')
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const { data: pending = [] }   = usePendingReviews()
  const { data: allReviews = [] } = useAllReviews({ status: filterStatus || undefined })
  const { data: teamReviews = [] } = useTeamRevisionWorkflow()
  const { data: stats }           = useRevisionStats()
  const { data: cycles = [] }     = useCompensationCycles()

  const createMut  = useCreateRevision()
  const approveMut = useApproveRevision()
  const refuseMut  = useRefuseRevision()
  const applyMut   = useApplyRevision()

  const handleApprove = async (review, comment) => {
    await approveMut.mutateAsync({ id: review.id, comment })
  }
  const handleRefuse = async (review, reason) => {
    await refuseMut.mutateAsync({ id: review.id, reason })
  }
  const handleApply = async (review) => {
    await applyMut.mutateAsync({
      id: review.id,
      employee_id: review.employee_id,
      new_salary: review.new_salary,
      salary_grade_id: review.salary_grade_id,
      currency: review.currency,
      review_reason: review.review_reason,
      effective_date: review.effective_date,
    })
  }

  const SUBTABS = [
    ...(canAdmin || canValidate ? [{ id: 'pending', label: `À valider (${pending.length})` }] : []),
    ...(canAdmin ? [{ id: 'all', label: 'Toutes les révisions' }] : []),
    ...(canManageTeam ? [{ id: 'team', label: 'Mon équipe' }] : []),
  ]

  const displayedReviews = subTab === 'pending' ? pending
    : subTab === 'all' ? allReviews
    : teamReviews

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total révisions',  value: stats.total,            color: '#6366F1' },
            { label: 'En attente',       value: (stats.nb_soumis ?? 0) + (stats.nb_valide_manager ?? 0), color: '#F59E0B' },
            { label: 'Appliquées',       value: stats.nb_applique ?? 0, color: '#10B981' },
            { label: 'Hausse moy.',      value: `+${(stats.avg_increase_pct ?? 0).toFixed(1)}%`, color: '#8B5CF6' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {SUBTABS.map(st => (
            <button key={st.id} onClick={() => setSubTab(st.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: subTab === st.id ? 'rgba(99,102,241,0.25)' : 'transparent', color: subTab === st.id ? '#818CF8' : 'rgba(255,255,255,0.4)' }}>
              {st.label}
            </button>
          ))}
        </div>
        {(canAdmin || canManageTeam) && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Plus size={14} /> Nouvelle révision
          </button>
        )}
      </div>

      {/* Filtre statut (vue all) */}
      {subTab === 'all' && (
        <div className="flex flex-wrap gap-2">
          {['', 'soumis', 'valide_manager', 'valide_rh', 'applique', 'refuse'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{
                background: filterStatus === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                color: filterStatus === s ? '#818CF8' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${filterStatus === s ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              {s === '' ? 'Toutes' : (REVIEW_WORKFLOW_STATUS_LABELS[s] ?? s)}
            </button>
          ))}
        </div>
      )}

      {/* Liste révisions */}
      <div className="flex flex-col gap-3">
        {displayedReviews.length === 0 ? (
          <div className="rounded-xl p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CheckCircle size={28} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm text-white/30">Aucune révision dans cette vue</p>
          </div>
        ) : (
          displayedReviews.map(r => (
            <RevisionCard key={r.id} review={r}
              onApprove={handleApprove}
              onRefuse={handleRefuse}
              onApply={handleApply}
              showActions={canAdmin || canValidate} />
          ))
        )}
      </div>

      {/* Modal création */}
      {showCreate && (
        <CreateRevisionModal cycles={cycles.filter(c => c.status !== 'cloture')}
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            await createMut.mutateAsync(data)
            setShowCreate(false)
          }} />
      )}
    </div>
  )
}