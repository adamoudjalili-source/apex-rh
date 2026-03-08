// ============================================================
// APEX RH — ProjectBudgetPanel.jsx
// Session 79 — Budget projet : catégories, planifié vs réel, variance
// ============================================================
import { useState } from 'react'
import {
  DollarSign, Plus, Pencil, Trash2, Check, X,
  TrendingUp, TrendingDown, AlertTriangle,
} from 'lucide-react'
import {
  useProjectBudget, useUpsertBudgetLine, useDeleteBudgetLine,
} from '../../hooks/useProjects'

const CATEGORIES = [
  { value: 'ressources_humaines', label: 'Ressources humaines', color: '#6366F1' },
  { value: 'materiel', label: 'Matériel', color: '#F59E0B' },
  { value: 'logiciel', label: 'Logiciel', color: '#10B981' },
  { value: 'formation', label: 'Formation', color: '#3B82F6' },
  { value: 'autre', label: 'Autre', color: '#8B5CF6' },
]

function getCategoryInfo(cat) {
  return CATEGORIES.find((c) => c.value === cat) || { label: cat, color: '#6B7280' }
}

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(Math.round(n))
}

function fmtFull(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0)
}

// Barre de progression comparée planifié / réel
function BudgetBar({ planned, actual, color }) {
  const max = Math.max(planned, actual, 1)
  const plannedPct = (planned / max) * 100
  const actualPct = (actual / max) * 100
  const over = actual > planned

  return (
    <div className="space-y-1">
      {/* Planifié */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/40 w-14 shrink-0">Planifié</span>
        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${plannedPct}%`, backgroundColor: color, opacity: 0.5 }}
          />
        </div>
        <span className="text-[10px] text-white/50 w-16 text-right">{fmt(planned)}</span>
      </div>
      {/* Réel */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/40 w-14 shrink-0">Réel</span>
        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${actualPct}%`, backgroundColor: over ? '#EF4444' : color }}
          />
        </div>
        <span
          className="text-[10px] w-16 text-right font-medium"
          style={{ color: over ? '#EF4444' : '#10B981' }}
        >
          {fmt(actual)}
        </span>
      </div>
    </div>
  )
}

const EMPTY_FORM = { category: 'ressources_humaines', label: '', amount_planned: '', amount_actual: '', note: '' }

export default function ProjectBudgetPanel({ projectId, canEdit = false }) {
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: lines = [], isLoading } = useProjectBudget(projectId)
  const upsert = useUpsertBudgetLine()
  const deleteLine = useDeleteBudgetLine()

  const totalPlanned = lines.reduce((s, l) => s + (l.amount_planned || 0), 0)
  const totalActual = lines.reduce((s, l) => s + (l.amount_actual || 0), 0)
  const variance = totalPlanned - totalActual
  const pctUsed = totalPlanned > 0 ? Math.min(150, (totalActual / totalPlanned) * 100) : 0
  const isOver = totalActual > totalPlanned

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
  }

  const openEdit = (line) => {
    setForm({
      category: line.category,
      label: line.label,
      amount_planned: String(line.amount_planned),
      amount_actual: String(line.amount_actual),
      note: line.note || '',
    })
    setEditingId(line.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) return
    try {
      await upsert.mutateAsync({
        id: editingId || undefined,
        projectId,
        category: form.category,
        label: form.label,
        amount_planned: parseFloat(form.amount_planned) || 0,
        amount_actual: parseFloat(form.amount_actual) || 0,
        note: form.note,
      })
      resetForm()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette ligne budget ?')) return
    try { await deleteLine.mutateAsync({ id, projectId }) } catch (err) { console.error(err) }
  }

  // Groupement par catégorie
  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    lines: lines.filter((l) => l.category === cat.value),
    planned: lines.filter((l) => l.category === cat.value).reduce((s, l) => s + (l.amount_planned || 0), 0),
    actual: lines.filter((l) => l.category === cat.value).reduce((s, l) => s + (l.amount_actual || 0), 0),
  })).filter((cat) => cat.lines.length > 0 || showForm)

  return (
    <div className="space-y-4">
      {/* Header + KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Budget projet</span>
        </div>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ligne budget
          </button>
        )}
      </div>

      {/* Résumé global */}
      {(lines.length > 0 || isLoading) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xs text-white/50 mb-1">Planifié</p>
            <p className="text-base font-bold text-white">{fmt(totalPlanned)}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xs text-white/50 mb-1">Réel</p>
            <p className={`text-base font-bold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
              {fmt(totalActual)}
            </p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${isOver ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <p className="text-xs text-white/50 mb-1">Variance</p>
            <div className="flex items-center justify-center gap-1">
              {isOver
                ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                : <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              }
              <p className={`text-base font-bold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                {isOver ? '-' : '+'}{fmt(Math.abs(variance))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Barre globale */}
      {lines.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Consommation budget</span>
            <span className={isOver ? 'text-red-400' : 'text-white/70'}>{Math.round(pctUsed)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pctUsed}%`,
                background: isOver
                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                  : 'linear-gradient(90deg, #10B981, #3B82F6)',
              }}
            />
          </div>
          {isOver && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Dépassement budget de {fmtFull(totalActual - totalPlanned)}
            </div>
          )}
        </div>
      )}

      {/* Formulaire ajout/édition */}
      {showForm && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white">{editingId ? 'Modifier la ligne' : 'Nouvelle ligne budget'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Libellé *</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ex : Salaires Q1"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Montant planifié</label>
              <input
                type="number"
                value={form.amount_planned}
                onChange={(e) => setForm({ ...form, amount_planned: e.target.value })}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Montant réel</label>
              <input
                type="number"
                value={form.amount_actual}
                onChange={(e) => setForm({ ...form, amount_actual: e.target.value })}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Note (optionnel)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Détails…"
              className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!form.label.trim() || upsert.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {upsert.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Lignes par catégorie */}
      {isLoading ? (
        <div className="text-sm text-white/40 text-center py-4">Chargement…</div>
      ) : lines.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-white/10">
          <DollarSign className="w-8 h-8 text-white/20 mb-2" />
          <p className="text-sm text-white/40">Aucune ligne budget</p>
          {canEdit && <p className="text-xs text-white/25 mt-1">Ajoutez des lignes pour suivre le budget</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {byCategory.map((cat) => {
            if (cat.lines.length === 0) return null
            const catInfo = getCategoryInfo(cat.value)
            return (
              <div key={cat.value} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catInfo.color }} />
                  <span className="text-xs font-semibold text-white/80">{catInfo.label}</span>
                  <span className="ml-auto text-xs text-white/50">
                    {fmt(cat.planned)} planifié / {fmt(cat.actual)} réel
                  </span>
                </div>
                <div className="px-3 py-2">
                  <BudgetBar planned={cat.planned} actual={cat.actual} color={catInfo.color} />
                </div>
                <div className="divide-y divide-white/5">
                  {cat.lines.map((line) => (
                    <div key={line.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{line.label}</p>
                        {line.note && <p className="text-xs text-white/40 truncate">{line.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/50">{fmtFull(line.amount_planned)}</p>
                        <p className={`text-xs font-medium ${line.amount_actual > line.amount_planned ? 'text-red-400' : 'text-emerald-400'}`}>
                          {fmtFull(line.amount_actual)}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(line)} className="p-1 rounded text-white/40 hover:text-white">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(line.id)} className="p-1 rounded text-white/40 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
