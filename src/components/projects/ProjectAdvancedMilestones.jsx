// ============================================================
// APEX RH — ProjectAdvancedMilestones.jsx
// Session 79 — Jalons avancés : timeline SVG, lien KR optionnel
// ============================================================
import { useState } from 'react'
import {
  Diamond, Plus, Pencil, Trash2, Check, X,
  Flag, CheckCircle2, Clock, Link2,
} from 'lucide-react'
import {
  useAdvancedMilestones, useCreateAdvancedMilestone,
  useUpdateAdvancedMilestone, useDeleteAdvancedMilestone,
} from '../../hooks/useProjects'

function formatDateFr(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(d) {
  if (!d) return null
  const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

// Timeline mini SVG — positions relatives sur une ligne
function MilestoneTimeline({ milestones }) {
  if (!milestones.length) return null

  const dates = milestones.map((m) => new Date(m.due_date).getTime())
  const minD = Math.min(...dates)
  const maxD = Math.max(...dates)
  const span = maxD - minD || 1

  const W = 340, H = 40, PAD = 20
  const innerW = W - PAD * 2
  const today = Date.now()
  const todayX = PAD + ((Math.min(today, maxD) - minD) / span) * innerW

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="block">
        {/* Ligne de base */}
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />

        {/* Aujourd'hui */}
        {today >= minD && today <= maxD && (
          <line x1={todayX} y1={8} x2={todayX} y2={H - 8} stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3,2" />
        )}

        {/* Jalons */}
        {milestones.map((m) => {
          const x = PAD + ((new Date(m.due_date).getTime() - minD) / span) * innerW
          const color = m.is_reached ? '#10B981' : daysLeft(m.due_date) < 0 ? '#EF4444' : '#F59E0B'
          return (
            <g key={m.id}>
              {m.is_reached ? (
                <circle cx={x} cy={H / 2} r={5} fill={color} />
              ) : (
                <polygon
                  points={`${x},${H / 2 - 6} ${x + 6},${H / 2} ${x},${H / 2 + 6} ${x - 6},${H / 2}`}
                  fill={color}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const EMPTY_FORM = { title: '', description: '', due_date: '', key_result_id: '' }

export default function ProjectAdvancedMilestones({ projectId, canEdit = false, keyResults = [] }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: milestones = [], isLoading } = useAdvancedMilestones(projectId)
  const createMs = useCreateAdvancedMilestone()
  const updateMs = useUpdateAdvancedMilestone()
  const deleteMs = useDeleteAdvancedMilestone()

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
  }

  const openEdit = (ms) => {
    setForm({
      title: ms.title,
      description: ms.description || '',
      due_date: ms.due_date,
      key_result_id: ms.key_result_id || '',
    })
    setEditingId(ms.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.due_date) return
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        due_date: form.due_date,
        key_result_id: form.key_result_id || null,
        project_id: projectId,
      }
      if (editingId) {
        await updateMs.mutateAsync({ id: editingId, projectId, ...payload })
      } else {
        await createMs.mutateAsync(payload)
      }
      resetForm()
    } catch (err) { console.error(err) }
  }

  const toggleReached = async (ms) => {
    try {
      await updateMs.mutateAsync({
        id: ms.id,
        projectId,
        is_reached: !ms.is_reached,
        reached_at: !ms.is_reached ? new Date().toISOString() : null,
      })
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (ms) => {
    if (!confirm(`Supprimer le jalon "${ms.title}" ?`)) return
    try { await deleteMs.mutateAsync({ id: ms.id, projectId }) } catch (err) { console.error(err) }
  }

  const sorted = [...milestones].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Diamond className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Jalons avancés</span>
          {milestones.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {milestones.filter((m) => m.is_reached).length}/{milestones.length} atteints
            </span>
          )}
        </div>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Jalon
          </button>
        )}
      </div>

      {/* Timeline */}
      {sorted.length > 1 && <MilestoneTimeline milestones={sorted} />}

      {/* Formulaire */}
      {showForm && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white">{editingId ? 'Modifier le jalon' : 'Nouveau jalon'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-white/50 mb-1 block">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ex : Livraison prototype"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Date limite *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            {keyResults.length > 0 && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">Lier à un KR (optionnel)</label>
                <select
                  value={form.key_result_id}
                  onChange={(e) => setForm({ ...form, key_result_id: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">— Aucun —</option>
                  {keyResults.map((kr) => (
                    <option key={kr.id} value={kr.id}>{kr.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs text-white/50 mb-1 block">Description (optionnel)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Détails…"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.due_date || createMs.isPending || updateMs.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Sauvegarder
            </button>
            <button onClick={resetForm} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors">
              <X className="w-3.5 h-3.5" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="text-sm text-white/40 text-center py-4">Chargement…</div>
      ) : sorted.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-white/10">
          <Diamond className="w-8 h-8 text-white/20 mb-2" />
          <p className="text-sm text-white/40">Aucun jalon défini</p>
          {canEdit && <p className="text-xs text-white/25 mt-1">Ajoutez des jalons pour structurer les livrables clés</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((ms) => {
            const days = daysLeft(ms.due_date)
            const isLate = !ms.is_reached && days !== null && days < 0
            const isSoon = !ms.is_reached && days !== null && days >= 0 && days <= 7

            return (
              <div
                key={ms.id}
                className={`rounded-xl border p-3 flex items-start gap-3 group transition-colors ${
                  ms.is_reached
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : isLate
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {/* Toggle atteint */}
                <button
                  onClick={() => canEdit && toggleReached(ms)}
                  className={`mt-0.5 shrink-0 transition-colors ${canEdit ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}`}
                >
                  {ms.is_reached ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isLate ? (
                    <Clock className="w-5 h-5 text-red-400" />
                  ) : (
                    <Diamond className={`w-5 h-5 ${isSoon ? 'text-amber-400' : 'text-white/40'}`} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${ms.is_reached ? 'line-through text-white/50' : 'text-white'}`}>
                      {ms.title}
                    </p>
                    {ms.key_result && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        <Link2 className="w-2.5 h-2.5" />
                        {ms.key_result.title}
                      </span>
                    )}
                  </div>
                  {ms.description && (
                    <p className="text-xs text-white/40 mt-0.5">{ms.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-white/50">
                      <Flag className="w-3 h-3" />
                      {formatDateFr(ms.due_date)}
                    </span>
                    {!ms.is_reached && days !== null && (
                      <span className={`text-xs font-medium ${isLate ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-white/40'}`}>
                        {isLate ? `${Math.abs(days)}j de retard` : days === 0 ? "Aujourd'hui" : `J-${days}`}
                      </span>
                    )}
                    {ms.is_reached && ms.reached_at && (
                      <span className="text-xs text-emerald-400">
                        Atteint le {formatDateFr(ms.reached_at)}
                      </span>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(ms)} className="p-1 rounded text-white/40 hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(ms)} className="p-1 rounded text-white/40 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
