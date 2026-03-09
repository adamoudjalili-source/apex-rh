// ============================================================
// APEX RH — RiskRegister.jsx
// Session 11 — Registre des risques projet
// ⚠️ probability et impact sont des ENUM risk_level (pas des nombres)
// ⚠️ Pas de colonne "level" — on calcule le score via probability × impact
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Check, X, ShieldAlert } from 'lucide-react'
import { useCreateRisk, useUpdateRisk, useDeleteRisk } from '../../hooks/useProjects'
import {
  getRiskLevelInfo, getRiskStatusInfo, getRiskScore, getRiskScoreColor, getUserFullName,
  RISK_LEVEL, RISK_STATUS,
} from '../../lib/projectHelpers'

const EMPTY_FORM = {
  title: '', description: '', probability: 'moyen', impact: 'moyen',
  status: 'identifie', mitigation: '', owner_id: '',
}

export default function RiskRegister({ risks = [], members = [], projectId, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const createRisk = useCreateRisk()
  const updateRisk = useUpdateRisk()
  const deleteRisk = useDeleteRisk()

  const resetForm = () => {
    setForm({ ...EMPTY_FORM })
    setShowForm(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    try {
      await createRisk.mutateAsync({
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        probability: form.probability,
        impact: form.impact,
        status: form.status,
        mitigation: form.mitigation.trim() || null,
        owner_id: form.owner_id || null,
      })
      resetForm()
    } catch (err) { }
  }

  const handleEdit = (r) => {
    setEditingId(r.id)
    setForm({
      title: r.title,
      description: r.description || '',
      probability: r.probability,
      impact: r.impact,
      status: r.status,
      mitigation: r.mitigation || '',
      owner_id: r.owner_id || '',
    })
  }

  const handleUpdate = async () => {
    if (!form.title.trim()) return
    try {
      await updateRisk.mutateAsync({
        id: editingId,
        updates: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          probability: form.probability,
          impact: form.impact,
          status: form.status,
          mitigation: form.mitigation.trim() || null,
          owner_id: form.owner_id || null,
        },
        projectId,
      })
      resetForm()
    } catch (err) { }
  }

  const handleDelete = async (r) => {
    if (!confirm(`Supprimer le risque "${r.title}" ?`)) return
    try { await deleteRisk.mutateAsync({ id: r.id, projectId }) } catch (err) { }
  }

  // Trier par score décroissant
  const sorted = [...risks].sort((a, b) =>
    getRiskScore(b.probability, b.impact) - getRiskScore(a.probability, a.impact)
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldAlert size={14} className="text-amber-400" />
          Risques ({risks.length})
        </h3>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Plus size={12} /> Ajouter
          </button>
        )}
      </div>

      {/* Formulaire */}
      <AnimatePresence>
        {(showForm || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <input
                type="text"
                placeholder="Titre du risque *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                autoFocus
              />
              <textarea
                placeholder="Description du risque"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Probabilité</label>
                  <select
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: e.target.value })}
                    className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                  >
                    {Object.entries(RISK_LEVEL).map(([key, info]) => (
                      <option key={key} value={key} className="bg-[#1a1a35]">{info.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-0.5 block">Impact</label>
                  <select
                    value={form.impact}
                    onChange={(e) => setForm({ ...form, impact: e.target.value })}
                    className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                  >
                    {Object.entries(RISK_LEVEL).map(([key, info]) => (
                      <option key={key} value={key} className="bg-[#1a1a35]">{info.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  {Object.entries(RISK_STATUS).map(([key, info]) => (
                    <option key={key} value={key} className="bg-[#1a1a35]">{info.label}</option>
                  ))}
                </select>
                <select
                  value={form.owner_id}
                  onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                  className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a35]">Responsable</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id} className="bg-[#1a1a35]">
                      {getUserFullName(m.user)}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Plan d'atténuation"
                value={form.mitigation}
                onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5"><X size={14} /></button>
                <button onClick={editingId ? handleUpdate : handleCreate} className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10"><Check size={14} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste */}
      {sorted.length === 0 && !showForm && (
        <p className="text-xs text-white/20 text-center py-6">Aucun risque identifié</p>
      )}

      <div className="space-y-1">
        {sorted.map((r) => {
          const probInfo = getRiskLevelInfo(r.probability)
          const impactInfo = getRiskLevelInfo(r.impact)
          const statusInfo = getRiskStatusInfo(r.status)
          const score = getRiskScore(r.probability, r.impact)
          const scoreColor = getRiskScoreColor(score)
          const owner = r.risk_owner

          return (
            <div
              key={r.id}
              className="p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <div className="flex items-start gap-3">
                {/* Score badge */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: `${scoreColor}20`, color: scoreColor }}
                  title={`Score: ${score}/16`}
                >
                  {score}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-white/80 truncate">{r.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusInfo.bg || ''} ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-white/20">
                    <span className={probInfo.text}>P: {probInfo.label}</span>
                    <span>×</span>
                    <span className={impactInfo.text}>I: {impactInfo.label}</span>
                    {owner && <span>👤 {getUserFullName(owner)}</span>}
                  </div>
                  {r.mitigation && (
                    <p className="text-[10px] text-white/15 mt-1 line-clamp-1">💡 {r.mitigation}</p>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(r)} className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5"><Pencil size={11} /></button>
                    <button onClick={() => handleDelete(r)} className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/5"><Trash2 size={11} /></button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
