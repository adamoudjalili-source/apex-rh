// S69 — ADMIN_ROLES remplacé par canAdmin
// ============================================================
// APEX RH — OkrPeriodSelector.jsx
// Session 10 — Sélecteur + gestion des périodes OKR
// ============================================================
import { useState } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, X, Check } from 'lucide-react'
import { useOkrPeriods, useCreatePeriod, useDeletePeriod } from '../../hooks/useOkrPeriods'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateFr } from '../../lib/objectiveHelpers'
import { ROLES } from '../../utils/constants'

export default function OkrPeriodSelector({ selectedPeriodId, onSelect }) {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canAdmin = can('performance', 'okr_cycle', 'admin')
  const { data: periods = [], isLoading } = useOkrPeriods()
  const createPeriod = useCreatePeriod()
  const deletePeriod = useDeletePeriod()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' })

  const canManage = canAdmin

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.start_date || !form.end_date) return
    try {
      const result = await createPeriod.mutateAsync(form)
      onSelect(result.id)
      setShowForm(false)
      setForm({ name: '', start_date: '', end_date: '' })
    } catch (err) {
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette période et tous ses objectifs ?')) return
    try {
      await deletePeriod.mutateAsync(id)
      if (selectedPeriodId === id) onSelect(null)
    } catch (err) {
    }
  }

  const now = new Date()
  const isActive = (p) =>
    new Date(p.start_date) <= now && now <= new Date(p.end_date) && p.is_active

  return (
    <div className="space-y-3">
      {/* Liste des périodes */}
      <div className="flex flex-wrap gap-2">
        {isLoading && <p className="text-white/30 text-sm">Chargement…</p>}

        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedPeriodId === p.id
                ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            <Calendar size={14} />
            <span>{p.name}</span>
            {isActive(p) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {canManage && profile?.role === ROLES.ADMINISTRATEUR && (
              <span
                onClick={(e) => handleDelete(p.id, e)}
                className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
              >
                <X size={12} />
              </span>
            )}
          </button>
        ))}

        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all duration-200 border border-dashed border-white/10 hover:border-indigo-500/30"
          >
            <Plus size={14} />
            Nouvelle période
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden"
          >
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-white/40 mb-1">Nom de la période</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: T1 2026, Année 2026…"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Fin</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createPeriod.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Check size={14} />
                Créer
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
              >
                Annuler
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Info période sélectionnée */}
      {selectedPeriodId && periods.length > 0 && (
        <div className="text-xs text-white/30">
          {(() => {
            const p = periods.find((x) => x.id === selectedPeriodId)
            if (!p) return null
            return `${formatDateFr(p.start_date)} → ${formatDateFr(p.end_date)}`
          })()}
        </div>
      )}
    </div>
  )
}
