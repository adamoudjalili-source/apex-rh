// ============================================================
// APEX RH — DeliverableList.jsx
// Session 11 — CRUD livrables dans le détail projet
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Check, X, FileCheck } from 'lucide-react'
import { useCreateDeliverable, useUpdateDeliverable, useDeleteDeliverable } from '../../hooks/useProjects'
import { getDeliverableStatusInfo, formatDateFr, getUserFullName } from '../../lib/projectHelpers'

export default function DeliverableList({ deliverables = [], milestones = [], members = [], projectId, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', status: 'a_faire', due_date: '', milestone_id: '', assignee_id: '' })

  const createDel = useCreateDeliverable()
  const updateDel = useUpdateDeliverable()
  const deleteDel = useDeleteDeliverable()

  const resetForm = () => {
    setForm({ title: '', description: '', status: 'a_faire', due_date: '', milestone_id: '', assignee_id: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    try {
      await createDel.mutateAsync({
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        due_date: form.due_date || null,
        milestone_id: form.milestone_id || null,
        assignee_id: form.assignee_id || null,
      })
      resetForm()
    } catch (err) { }
  }

  const handleEdit = (d) => {
    setEditingId(d.id)
    setForm({
      title: d.title,
      description: d.description || '',
      status: d.status,
      due_date: d.due_date || '',
      milestone_id: d.milestone_id || '',
      assignee_id: d.assignee?.id || '',
    })
  }

  const handleUpdate = async () => {
    if (!form.title.trim()) return
    try {
      await updateDel.mutateAsync({
        id: editingId,
        updates: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          due_date: form.due_date || null,
          milestone_id: form.milestone_id || null,
          assignee_id: form.assignee_id || null,
        },
        projectId,
      })
      resetForm()
    } catch (err) { }
  }

  const handleDelete = async (d) => {
    if (!confirm(`Supprimer le livrable "${d.title}" ?`)) return
    try { await deleteDel.mutateAsync({ id: d.id, projectId }) } catch (err) { }
  }

  // Grouper par jalon
  const grouped = milestones.reduce((acc, ms) => {
    acc[ms.id] = { milestone: ms, items: deliverables.filter((d) => d.milestone_id === ms.id) }
    return acc
  }, {})
  const unlinked = deliverables.filter((d) => !d.milestone_id)

  // Aplatir la liste pour affichage simple
  const allItems = [...deliverables].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileCheck size={14} className="text-violet-400" />
          Livrables ({deliverables.length})
        </h3>
        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-violet-400 hover:bg-violet-500/10 transition-colors"
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
                placeholder="Titre du livrable *"
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
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="a_faire" className="bg-[#1a1a35]">À faire</option>
                  <option value="en_cours" className="bg-[#1a1a35]">En cours</option>
                  <option value="soumis" className="bg-[#1a1a35]">Soumis</option>
                  <option value="valide" className="bg-[#1a1a35]">Validé</option>
                  <option value="rejete" className="bg-[#1a1a35]">Rejeté</option>
                </select>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.milestone_id}
                  onChange={(e) => setForm({ ...form, milestone_id: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a35]">Sans jalon</option>
                  {milestones.map((ms) => (
                    <option key={ms.id} value={ms.id} className="bg-[#1a1a35]">{ms.title}</option>
                  ))}
                </select>
                <select
                  value={form.assignee_id}
                  onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a35]">Non assigné</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id} className="bg-[#1a1a35]">
                      {getUserFullName(m.user)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5">
                  <X size={14} />
                </button>
                <button
                  onClick={editingId ? handleUpdate : handleCreate}
                  className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/10"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste */}
      {allItems.length === 0 && !showForm && (
        <p className="text-xs text-white/20 text-center py-6">Aucun livrable défini</p>
      )}

      <div className="space-y-1">
        {allItems.map((d) => {
          const statusInfo = getDeliverableStatusInfo(d.status)
          const ms = milestones.find((m) => m.id === d.milestone_id)
          const assignee = d.assignee

          return (
            <div
              key={d.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusInfo.color }} />

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">{d.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/20">
                  {ms && <span>📍 {ms.title}</span>}
                  {assignee && <span>👤 {getUserFullName(assignee)}</span>}
                  {d.due_date && <span>{formatDateFr(d.due_date)}</span>}
                </div>
              </div>

              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.label}
              </span>

              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(d)}
                    className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
