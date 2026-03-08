// ============================================================
// APEX RH — components/compensation/CycleRevision.jsx
// S74 — Cycles de révision annuelle
// Création, suivi d'avancement, clôture
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, Lock, Unlock, TrendingUp, Users, CheckCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useCompensationCycles, useCreateCycle, useUpdateCycle, useDeleteCycle,
  useCyclesProgress, useRevisionBudgetSimulation, useRefreshCompensationMVs,
  CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS, formatSalary, formatSalaryShort
} from '../../hooks/useCompensation'

// ─── Badge statut cycle ───────────────────────────────────────
function CycleBadge({ status }) {
  const label = CYCLE_STATUS_LABELS[status] ?? status
  const color = CYCLE_STATUS_COLORS[status] ?? '#6B7280'
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

// ─── Barre progression ────────────────────────────────────────
function ProgressBar({ value, max, color = '#6366F1' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="rounded-full overflow-hidden h-1.5 w-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── Simulation budget mini ───────────────────────────────────
function BudgetSimulationWidget({ cycleId, envelope, currency }) {
  const { data: sim } = useRevisionBudgetSimulation(cycleId)
  if (!sim || sim.count === 0) return null

  const pct = envelope > 0 ? Math.min(100, (sim.totalImpact / envelope) * 100) : 0
  const over = envelope > 0 && sim.totalImpact > envelope

  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">Impact masse salariale</span>
        {over && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>
            ⚠ Dépassement budget
          </span>
        )}
      </div>
      <div className="flex items-end gap-2 mb-1.5">
        <span className="text-base font-bold" style={{ color: over ? '#F87171' : '#10B981' }}>
          +{formatSalaryShort(sim.totalImpact)}
        </span>
        {envelope > 0 && (
          <span className="text-xs text-white/30">/ {formatSalaryShort(envelope)} enveloppe</span>
        )}
        <span className="text-xs text-white/30 ml-auto">+{sim.avgPct?.toFixed(1)}% moy.</span>
      </div>
      {envelope > 0 && (
        <ProgressBar value={sim.totalImpact} max={envelope} color={over ? '#EF4444' : '#10B981'} />
      )}
    </div>
  )
}

// ─── Carte cycle ──────────────────────────────────────────────
function CycleCard({ cycle, progress, onEdit, onClose, canAdmin }) {
  const totalValidated = (progress?.nb_valides ?? 0) + (progress?.nb_appliques ?? 0)

  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Calendar size={16} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <div className="font-semibold text-sm text-white">{cycle.name}</div>
            <div className="text-xs text-white/40">Année {cycle.year}</div>
          </div>
        </div>
        <CycleBadge status={cycle.status} />
      </div>

      {/* Dates */}
      {(cycle.start_date || cycle.end_date) && (
        <div className="mt-2 flex gap-3 text-xs text-white/35">
          {cycle.start_date && <span>Début : {new Date(cycle.start_date).toLocaleDateString('fr-FR')}</span>}
          {cycle.end_date && <span>Fin : {new Date(cycle.end_date).toLocaleDateString('fr-FR')}</span>}
        </div>
      )}

      {/* Stats avancement */}
      {progress && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Total',    value: progress.total_reviews ?? 0,   color: '#6366F1' },
            { label: 'Validées', value: totalValidated,                color: '#10B981' },
            { label: 'Appliq.', value: progress.nb_appliques ?? 0,    color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-white/35">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Barre progression */}
      {progress && progress.total_reviews > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-white/35 mb-1">
            <span>Avancement validation</span>
            <span>{progress.pct_valides}%</span>
          </div>
          <ProgressBar value={progress.pct_valides} max={100} color="#6366F1" />
        </div>
      )}

      {/* Simulation budget */}
      <BudgetSimulationWidget
        cycleId={cycle.id}
        envelope={cycle.budget_envelope}
        currency={cycle.currency} />

      {/* Actions admin */}
      {canAdmin && cycle.status !== 'cloture' && (
        <div className="mt-3 flex gap-2">
          {cycle.status === 'ouvert' && (
            <button onClick={() => onEdit({ ...cycle, status: 'en_cours' })}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.2)' }}>
              Démarrer le cycle
            </button>
          )}
          {cycle.status === 'en_cours' && (
            <button onClick={() => onClose(cycle)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(107,114,128,0.15)', color: '#9CA3AF', border: '1px solid rgba(107,114,128,0.2)' }}>
              <Lock size={12} className="inline mr-1" />Clôturer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Modal création cycle ─────────────────────────────────────
function CreateCycleModal({ onClose, onSubmit }) {
  const currentYear = new Date().getFullYear()
  const [form, setForm] = useState({
    name: `Révision salariale ${currentYear}`,
    year: currentYear,
    start_date: '',
    end_date: '',
    status: 'ouvert',
    budget_envelope: '',
    currency: 'XOF',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">Nouveau cycle de révision</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-lg">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Nom du cycle *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Année *</label>
              <input type="number" value={form.year} onChange={e => set('year', Number(e.target.value))}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Enveloppe budget</label>
              <input type="number" value={form.budget_envelope} onChange={e => set('budget_envelope', e.target.value)}
                placeholder="F CFA"
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Date début</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Date limite</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-white/50"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            Annuler
          </button>
          <button onClick={() => { if (form.name) onSubmit({ ...form, budget_envelope: form.budget_envelope ? Number(form.budget_envelope) : null }) }}
            disabled={!form.name}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#6366F1', color: '#fff', opacity: !form.name ? 0.5 : 1 }}>
            Créer le cycle
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function CycleRevision() {
  const { canAdmin } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const { data: cycles = [] }   = useCompensationCycles()
  const { data: progress = [] } = useCyclesProgress()
  const createMut  = useCreateCycle()
  const updateMut  = useUpdateCycle()
  const refreshMut = useRefreshCompensationMVs()

  const progressById = Object.fromEntries((progress).map(p => [p.cycle_id, p]))

  const handleClose = async (cycle) => {
    if (window.confirm(`Clôturer le cycle "${cycle.name}" ?`)) {
      await updateMut.mutateAsync({ id: cycle.id, status: 'cloture' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Cycles de révision</h2>
          <p className="text-xs text-white/35 mt-0.5">{cycles.length} cycle{cycles.length > 1 ? 's' : ''} créé{cycles.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {canAdmin && (
            <button onClick={() => refreshMut.mutate()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
              <RefreshCw size={13} className={refreshMut.isPending ? 'animate-spin' : ''} />
              Refresh MV
            </button>
          )}
          {canAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Plus size={14} /> Nouveau cycle
            </button>
          )}
        </div>
      </div>

      {/* Liste cycles */}
      {cycles.length === 0 ? (
        <div className="rounded-xl p-10 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Calendar size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm text-white/30">Aucun cycle de révision créé</p>
          {canAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}>
              Créer le premier cycle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cycles.map(c => (
            <CycleCard key={c.id} cycle={c}
              progress={progressById[c.id]}
              onEdit={(payload) => updateMut.mutateAsync(payload)}
              onClose={handleClose}
              canAdmin={canAdmin} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCycleModal onClose={() => setShowCreate(false)}
          onSubmit={async (data) => { await createMut.mutateAsync(data); setShowCreate(false) }} />
      )}
    </div>
  )
}
