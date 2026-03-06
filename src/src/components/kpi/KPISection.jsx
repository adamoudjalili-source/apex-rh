// ============================================================
// APEX RH — KPISection.jsx
// Session 50 — Section KPI custom réutilisable
// Utilisé dans MonEspace.jsx (mes KPIs) et MonEquipe.jsx (KPIs équipe)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gauge, Plus, Pencil, Archive, X, Check, ChevronDown, ChevronUp,
  TrendingUp, Target, AlertCircle
} from 'lucide-react'
import {
  useMyCustomKPIs, useUserCustomKPIs,
  useCreateCustomKPI, useUpdateCustomKPI, useUpdateKPIValue, useArchiveCustomKPI,
  KPI_FREQUENCIES, KPI_STATUS, KPI_COLORS,
  kpiProgress, kpiProgressColor,
} from '../../hooks/useCustomKPIs'
import EmptyState from '../ui/EmptyState'

// ─── Formulaire KPI (création / édition) ────────────────────

function KPIForm({ kpi, onSave, onCancel }) {
  const [form, setForm] = useState({
    label: kpi?.label || '',
    description: kpi?.description || '',
    target_value: kpi?.target_value ?? 100,
    current_value: kpi?.current_value ?? 0,
    unit: kpi?.unit || '%',
    frequency: kpi?.frequency || 'mensuel',
    color: kpi?.color || KPI_COLORS[0],
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.label.trim()) return
    onSave({
      ...form,
      target_value: parseFloat(form.target_value) || 100,
      current_value: parseFloat(form.current_value) || 0,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="p-4 rounded-xl border border-indigo-500/25"
      style={{ background: 'rgba(79,70,229,0.08)' }}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Label */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-white/40 mb-1">Nom du KPI *</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="ex: Taux de satisfaction, Chiffre d'affaires…"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Valeur cible */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Valeur cible</label>
            <input
              type="number"
              value={form.target_value}
              onChange={(e) => setForm({ ...form, target_value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Valeur actuelle */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Valeur actuelle</label>
            <input
              type="number"
              value={form.current_value}
              onChange={(e) => setForm({ ...form, current_value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Unité */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Unité</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="%, pts, FCFA…"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Fréquence */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1">Fréquence</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/40"
            >
              {Object.entries(KPI_FREQUENCIES).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#1a1a35]">{v.label}</option>
              ))}
            </select>
          </div>

          {/* Couleur */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-white/40 mb-1">Couleur</label>
            <div className="flex items-center gap-2">
              {KPI_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 border-2"
                  style={{
                    background: c,
                    borderColor: form.color === c ? '#fff' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!form.label.trim()}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {kpi ? 'Modifier' : 'Créer le KPI'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Carte KPI individuelle ──────────────────────────────────

function KPICard({ kpi, onEdit, onArchive, showOwner = false }) {
  const [editValue, setEditValue] = useState(null)
  const updateValue = useUpdateKPIValue()

  const progress = kpiProgress(kpi)
  const pct = Math.round(progress * 100)
  const color = kpi.color || kpiProgressColor(progress)
  const freq = KPI_FREQUENCIES[kpi.frequency]?.short || kpi.frequency

  const handleValueBlur = async () => {
    if (editValue === null) return
    const val = parseFloat(editValue)
    if (!isNaN(val) && val !== kpi.current_value) {
      await updateValue.mutateAsync({ id: kpi.id, current_value: val, target_value: kpi.target_value })
    }
    setEditValue(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative p-4 rounded-xl border border-white/[0.06] hover:border-white/10 transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.025)' }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ background: color }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/85 truncate">{kpi.label}</p>
            {showOwner && kpi.owner && (
              <p className="text-[10px] text-white/30">
                {kpi.owner.first_name} {kpi.owner.last_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(kpi)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onArchive(kpi.id)}
            className="p-1 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
          >
            <Archive size={11} />
          </button>
        </div>
      </div>

      {/* Valeurs */}
      <div className="flex items-end justify-between mb-2.5">
        <div>
          {editValue !== null ? (
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleValueBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleValueBlur() }}
              autoFocus
              className="w-20 px-2 py-1 rounded-lg bg-white/10 border border-indigo-500/40 text-white text-lg font-bold focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setEditValue(String(kpi.current_value))}
              className="text-xl font-black hover:text-white transition-colors"
              style={{ color }}
              title="Cliquer pour modifier"
            >
              {kpi.current_value?.toLocaleString('fr-FR')}{kpi.unit}
            </button>
          )}
          <span className="text-[11px] text-white/30 ml-1">/ {kpi.target_value?.toLocaleString('fr-FR')}{kpi.unit}</span>
        </div>

        <div className="text-right">
          <span className="text-lg font-bold" style={{ color: kpiProgressColor(progress) }}>
            {pct}%
          </span>
          <p className="text-[10px] text-white/25">{freq}</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>

      {/* Badge statut atteint */}
      {kpi.status === 'atteint' && (
        <div className="mt-2 flex items-center gap-1">
          <Check size={10} className="text-emerald-400" />
          <span className="text-[10px] text-emerald-400">Objectif atteint</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Composant principal : section KPI ──────────────────────
// mode='mine'  → pour MonEspace (mes KPIs)
// mode='team'  → pour MonEquipe (KPIs d'un membre sélectionné)

export default function KPISection({ mode = 'mine', userId = null, className = '' }) {
  const [showForm, setShowForm] = useState(false)
  const [editingKpi, setEditingKpi] = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  const { data: myKpis = [], isLoading: loadingMine } = useMyCustomKPIs()
  const { data: userKpis = [], isLoading: loadingUser } = useUserCustomKPIs(userId)

  const kpis = mode === 'mine' ? myKpis : userKpis
  const isLoading = mode === 'mine' ? loadingMine : loadingUser

  const createKpi = useCreateCustomKPI()
  const updateKpi = useUpdateCustomKPI()
  const archiveKpi = useArchiveCustomKPI()

  const handleSave = async (formData) => {
    if (editingKpi) {
      await updateKpi.mutateAsync({ id: editingKpi.id, updates: formData })
    } else {
      await createKpi.mutateAsync({
        ...formData,
        owner_id: mode === 'team' ? userId : undefined,
      })
    }
    setShowForm(false)
    setEditingKpi(null)
  }

  const handleEdit = (kpi) => {
    setEditingKpi(kpi)
    setShowForm(true)
  }

  const handleArchive = async (id) => {
    if (!confirm('Archiver ce KPI ?')) return
    await archiveKpi.mutateAsync(id)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingKpi(null)
  }

  // Stats rapides
  const totalKpis = kpis.length
  const atteintCount = kpis.filter(k => k.status === 'atteint').length
  const avgProgress = totalKpis
    ? Math.round(kpis.reduce((sum, k) => sum + kpiProgress(k), 0) / totalKpis * 100)
    : 0

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.25)' }}>
            <Gauge size={14} className="text-indigo-400" />
          </div>
          <span className="text-sm font-semibold text-white/70 group-hover:text-white/90 transition-colors">
            KPI Personnalisés
          </span>
          {totalKpis > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              {totalKpis}
            </span>
          )}
          {collapsed ? <ChevronDown size={14} className="text-white/30" /> : <ChevronUp size={14} className="text-white/30" />}
        </button>

        {!collapsed && mode === 'mine' && (
          <button
            onClick={() => { setEditingKpi(null); setShowForm(!showForm) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-md"
            style={{ background: 'rgba(79,70,229,0.2)', color: '#A5B4FC', border: '1px solid rgba(79,70,229,0.3)' }}
          >
            <Plus size={12} />
            Ajouter
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-3">
          {/* Formulaire */}
          <AnimatePresence>
            {showForm && (
              <KPIForm
                kpi={editingKpi}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}
          </AnimatePresence>

          {/* Stats rapides (si KPIs présents) */}
          {totalKpis > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total',   value: totalKpis,     color: '#4F46E5' },
                { label: 'Atteints', value: atteintCount, color: '#10B981' },
                { label: 'Avg',     value: `${avgProgress}%`, color: avgProgress >= 70 ? '#10B981' : avgProgress >= 40 ? '#F59E0B' : '#EF4444' },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[10px] text-white/30">{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Liste KPIs */}
          {isLoading ? (
            <div className="py-6 text-center text-white/25 text-xs">Chargement…</div>
          ) : kpis.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="Aucun KPI défini"
              description={mode === 'mine'
                ? "Créez vos indicateurs personnalisés pour suivre vos objectifs clés."
                : "Cet agent n'a pas encore défini de KPI."
              }
              action={mode === 'mine' ? { label: 'Créer un KPI', onClick: () => setShowForm(true) } : undefined}
              variant="compact"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kpis.map(kpi => (
                <KPICard
                  key={kpi.id}
                  kpi={kpi}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  showOwner={mode === 'team'}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
