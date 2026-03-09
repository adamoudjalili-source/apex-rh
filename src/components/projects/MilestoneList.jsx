// ============================================================
// APEX RH — MilestoneList.jsx
// Session 11 — CRUD jalons dans le détail projet
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Check, X, Milestone, CheckCircle2 } from 'lucide-react'
import { useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '../../hooks/useProjects'
import { getMilestoneStatusInfo, formatDateFr } from '../../lib/projectHelpers'
import { TASK_STATUS } from '../../utils/constants'

export default function MilestoneList({ milestones = [], projectId, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', status: 'en_attente' })

  const createMs = useCreateMilestone()
  const updateMs = useUpdateMilestone()
  const deleteMs = useDeleteMilestone()

  const sorted = [...milestones].sort((a, b) => (a.position || 0) - (b.position || 0))

  const resetForm = () => {
    setForm({ title: '', description: '', due_date: '', status: 'en_attente' })
    setShowForm(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    try {
      await createMs.mutateAsync({
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        status: form.status,
        position: milestones.length + 1,
      })
      resetForm()
    } catch (err) { }
  }

  const handleEdit = (ms) => {
    setEditingId(ms.id)
    setForm({
      title: ms.title,
      description: ms.description || '',
      due_date: ms.due_date || '',
      status: ms.status,
    })
  }

  const handleUpdate = async () => {
    if (!form.title.trim()) return
    try {
      const updates = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        status: form.status,
      }
      if (form.status === 'atteint') updates.completed_at = new Date().toISOString()
      else updates.completed_at = null

      await updateMs.mutateAsync({ id: editingId, updates, projectId })
      resetForm()
    } catch (err) { }
  }

  const handleDelete = async (ms) => {
    if (!confirm(`Supprimer le jalon "${ms.title}" ?`)) return
    try {
      await deleteMs.mutateAsync({ id: ms.id, projectId })
    } catch (err) { }
  }

  const toggleComplete = async (ms) => {
    const newStatus = ms.status === 'atteint' ? 'en_attente' : 'atteint'
    const updates = { status: newStatus }
    if (newStatus === 'atteint') updates.completed_at = new Date().toISOString()
    else updates.completed_at = null
    try {
      await updateMs.mutateAsync({ id: ms.id, updates, projectId })
    } catch (err) { }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Milestone size={14} className="text-indigo-400" />
          Jalons ({sorted.length})
        </h3>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            <Plus size={12} /> Ajouter
          </button>
        )}
      </div>

      {/* Formulaire inline */}
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
                placeholder="Titre du jalon *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                autoFocus
              />
              <textarea
                placeholder="Description (optionnel)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="en_attente" className="bg-[#1a1a35]">En attente</option>
                  <option value={TASK_STATUS.EN_COURS} className="bg-[#1a1a35]">En cours</option>
                  <option value="atteint" className="bg-[#1a1a35]">Atteint</option>
                  <option value="en_retard" className="bg-[#1a1a35]">En retard</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5">
                  <X size={14} />
                </button>
                <button
                  onClick={editingId ? handleUpdate : handleCreate}
                  className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des jalons */}
      {sorted.length === 0 && !showForm && (
        <p className="text-xs text-white/20 text-center py-6">Aucun jalon défini</p>
      )}

      <div className="space-y-1">
        {sorted.map((ms, idx) => {
          const statusInfo = getMilestoneStatusInfo(ms.status)
          const isDone = ms.status === 'atteint'

          return (
            <motion.div
              key={ms.id}
              layout
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              {/* Checkbox */}
              {canEdit && (
                <button
                  onClick={() => toggleComplete(ms)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {isDone && <CheckCircle2 size={12} />}
                </button>
              )}

              {/* Numéro */}
              <span className="text-[10px] text-white/15 font-mono w-4">{idx + 1}</span>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isDone ? 'text-white/30 line-through' : 'text-white/80'}`}>
                  {ms.title}
                </p>
                {ms.due_date && (
                  <p className="text-[10px] text-white/20">{formatDateFr(ms.due_date)}</p>
                )}
              </div>

              {/* Badge statut */}
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.label}
              </span>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(ms)}
                    className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(ms)}
                    className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
