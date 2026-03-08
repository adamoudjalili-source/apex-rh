// ============================================================
// APEX RH — src/components/formation/FormationBudget.jsx
// Session 73 — Budget formation par organisation/division/année
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Trash2, Edit3, CheckCircle, X, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react'
import {
  useTrainingBudgets, useCreateOrUpdateBudget, useDeleteBudget, useBudgetConsumed,
} from '../../hooks/useFormations'
import { usePermission } from '../../hooks/usePermission'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))

function BudgetBar({ allocated, consumed }) {
  const pct = allocated > 0 ? Math.min((consumed / allocated) * 100, 100) : 0
  const overBudget = consumed > allocated
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/50">
        <span>{fmt(consumed)} FCFA consommé</span>
        <span className={overBudget ? 'text-red-400' : ''}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: overBudget ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981',
          }}
        />
      </div>
      <p className="text-xs text-white/30">Budget alloué : {fmt(allocated)} FCFA</p>
    </div>
  )
}

function BudgetForm({ initial, year, onSave, onCancel }) {
  const [label, setLabel]   = useState(initial?.label || '')
  const [total, setTotal]   = useState(initial?.total_amount || '')
  const [notes, setNotes]   = useState(initial?.notes || '')
  const { mutateAsync, isPending } = useCreateOrUpdateBudget()

  const handleSubmit = async () => {
    if (!label.trim() || !total) return
    await mutateAsync({ id: initial?.id, year, label: label.trim(), total_amount: parseFloat(total), notes })
    onSave()
  }

  return (
    <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <p className="text-sm font-semibold text-indigo-300">{initial ? 'Modifier le budget' : 'Nouveau budget'}</p>
      <input
        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        placeholder="Libellé (ex: Budget Formation RH 2026)"
        value={label} onChange={e => setLabel(e.target.value)}
      />
      <input
        type="number" min="0"
        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        placeholder="Montant total (FCFA)"
        value={total} onChange={e => setTotal(e.target.value)}
      />
      <textarea
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none resize-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        placeholder="Notes (optionnel)"
        value={notes} onChange={e => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={isPending || !label.trim() || !total}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40 transition"
          style={{ background: 'rgba(99,102,241,0.6)' }}>
          <CheckCircle size={14}/>{isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button onClick={onCancel}
          className="px-4 rounded-lg text-sm text-white/40 hover:text-white transition"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <X size={14}/>
        </button>
      </div>
    </div>
  )
}

export default function FormationBudget() {
  const { can } = usePermission()
  const canAdmin = can('developpement', 'budget', 'admin')
  const currentYear = new Date().getFullYear()
  const [year, setYear]       = useState(currentYear)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)

  const { data: budgets = [], isLoading } = useTrainingBudgets(year)
  const { data: consumed = 0 }           = useBudgetConsumed(year)
  const { mutateAsync: deleteBudget }    = useDeleteBudget()

  const totalAllocated = budgets.reduce((s, b) => s + (b.total_amount || 0), 0)
  const globalBudget   = budgets.find(b => !b.division_id)
  const divBudgets     = budgets.filter(b => b.division_id)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign size={18} style={{ color: '#10B981' }}/>
          <h2 className="text-base font-bold text-white">Budget Formation</h2>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {canAdmin && !showForm && (
            <button onClick={() => { setEditing(null); setShowForm(true) }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-white transition"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <PlusCircle size={14}/> Nouveau budget
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs globaux ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Budget alloué', value: `${fmt(totalAllocated)} FCFA`, color: '#6366F1', icon: DollarSign },
          { label: 'Consommé', value: `${fmt(consumed)} FCFA`, color: '#10B981', icon: TrendingUp },
          { label: 'Solde disponible', value: `${fmt(totalAllocated - consumed)} FCFA`, color: totalAllocated - consumed < 0 ? '#EF4444' : '#F59E0B', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Icon size={16} className="mx-auto mb-2" style={{ color }}/>
            <p className="text-sm font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Formulaire ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <BudgetForm
              initial={editing}
              year={year}
              onSave={() => { setShowForm(false); setEditing(null) }}
              onCancel={() => { setShowForm(false); setEditing(null) }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Budget global ── */}
      {globalBudget ? (
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{globalBudget.label}</p>
              <p className="text-xs text-white/30 mt-0.5">Budget organisation — {year}</p>
            </div>
            {canAdmin && (
              <div className="flex gap-1">
                <button onClick={() => { setEditing(globalBudget); setShowForm(true) }}
                  className="p-1.5 rounded-lg text-white/30 hover:text-indigo-300 transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Edit3 size={13}/>
                </button>
                <button onClick={() => deleteBudget({ id: globalBudget.id, year })}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            )}
          </div>
          <BudgetBar allocated={globalBudget.total_amount} consumed={consumed}/>
          {globalBudget.notes && <p className="text-xs text-white/30 italic">{globalBudget.notes}</p>}
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
          <DollarSign size={24} className="mx-auto mb-2 text-white/15"/>
          <p className="text-sm text-white/30">Aucun budget global défini pour {year}</p>
          {canAdmin && (
            <button onClick={() => { setEditing(null); setShowForm(true) }}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition">
              + Créer un budget
            </button>
          )}
        </div>
      )}

      {/* ── Budgets par division ── */}
      {divBudgets.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Par division</p>
          {divBudgets.map(b => (
            <div key={b.id} className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{b.label}</p>
                  <p className="text-xs text-white/30 mt-0.5">{fmt(b.total_amount)} FCFA alloués</p>
                </div>
                {canAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(b); setShowForm(true) }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-indigo-300 transition"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Edit3 size={13}/>
                    </button>
                    <button onClick={() => deleteBudget({ id: b.id, year })}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )}
              </div>
              <BudgetBar allocated={b.total_amount} consumed={b.consumed_amount || 0}/>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-white/20 text-sm">Chargement...</div>
      )}
    </div>
  )
}
