// ============================================================
// APEX RH — src/components/offboarding/OffboardingChecklist.jsx
// Session 68 — Checklist tâches par catégorie
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronUp,
  Plus, X, User, Calendar,
} from 'lucide-react'
import {
  useOffboardingChecklist, useUpdateChecklistItem, useAddChecklistItem,
  CHECKLIST_CATEGORY_LABELS, CHECKLIST_CATEGORY_COLORS,
  CHECKLIST_STATUS_LABELS, CHECKLIST_STATUS_COLORS,
} from '../../hooks/useOffboarding'

const STATUS_ICONS = {
  pending:     Circle,
  in_progress: Clock,
  done:        CheckCircle2,
  blocked:     AlertCircle,
}

function ChecklistItem({ item, processId, readOnly }) {
  const [expanded, setExpanded] = useState(false)
  const updateItem = useUpdateChecklistItem()

  const Icon = STATUS_ICONS[item.status] || Circle
  const color = CHECKLIST_STATUS_COLORS[item.status] || '#6B7280'

  const cycleStatus = () => {
    if (readOnly) return
    const cycle = { pending: 'in_progress', in_progress: 'done', done: 'pending', blocked: 'pending' }
    updateItem.mutate({ id: item.id, processId, status: cycle[item.status] || 'pending' })
  }

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/[0.06] overflow-hidden"
      style={{ background: item.status === 'done' ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-3 p-3">
        <button onClick={cycleStatus} disabled={readOnly || updateItem.isPending}
          className="flex-shrink-0 transition-transform hover:scale-110">
          <Icon size={18} style={{ color }}/>
        </button>
        <span
          className={`flex-1 text-sm cursor-pointer ${item.status === 'done' ? 'line-through text-white/30' : 'text-white/80'}`}
          onClick={() => setExpanded(e => !e)}>
          {item.title}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {item.due_date && (
            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
              <Calendar size={9}/> {new Date(item.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {item.assignee && (
            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
              <User size={9}/> {item.assignee.first_name}
            </span>
          )}
          <button onClick={() => setExpanded(e => !e)} className="text-white/20 hover:text-white/50">
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/[0.05]">
            <div className="p-3 space-y-2">
              {/* Status selector */}
              {!readOnly && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CHECKLIST_STATUS_LABELS).map(([st, label]) => (
                    <button key={st}
                      onClick={() => updateItem.mutate({ id: item.id, processId, status: st })}
                      className="text-[10px] px-2 py-0.5 rounded-full border transition-all"
                      style={{
                        borderColor: item.status === st ? CHECKLIST_STATUS_COLORS[st] : 'rgba(255,255,255,0.1)',
                        color: item.status === st ? CHECKLIST_STATUS_COLORS[st] : 'rgba(255,255,255,0.4)',
                        background: item.status === st ? `${CHECKLIST_STATUS_COLORS[st]}15` : 'transparent',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {item.notes && (
                <p className="text-xs text-white/40">{item.notes}</p>
              )}
              {item.completed_at && (
                <p className="text-[10px] text-emerald-400/60">
                  Terminé le {new Date(item.completed_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AddItemRow({ processId, category, onClose }) {
  const [title, setTitle] = useState('')
  const addItem = useAddChecklistItem()

  const submit = async () => {
    if (!title.trim()) return
    await addItem.mutateAsync({ process_id: processId, title: title.trim(), category, status: 'pending' })
    onClose()
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-white/[0.1]"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
        placeholder="Titre de la tâche..."
        className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"/>
      <button onClick={submit} disabled={!title.trim() || addItem.isPending}
        className="text-xs px-2 py-1 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors">
        Ajouter
      </button>
      <button onClick={onClose} className="text-white/30 hover:text-white/60">
        <X size={14}/>
      </button>
    </div>
  )
}

export default function OffboardingChecklist({ processId, readOnly = false }) {
  const { data: items = [], isLoading } = useOffboardingChecklist(processId)
  const [addingCategory, setAddingCategory] = useState(null)

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'admin'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const categories = Object.keys(CHECKLIST_CATEGORY_LABELS)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
        ))}
      </div>
    )
  }

  if (items.length === 0 && readOnly) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        Aucune tâche dans la checklist
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {categories.map(cat => {
        const catItems = grouped[cat] || []
        const color    = CHECKLIST_CATEGORY_COLORS[cat]
        const label    = CHECKLIST_CATEGORY_LABELS[cat]
        const done     = catItems.filter(i => i.status === 'done').length
        const isAdding = addingCategory === cat

        if (catItems.length === 0 && !isAdding && readOnly) return null

        return (
          <div key={cat}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                {label}
              </span>
              <span className="text-xs text-white/25 ml-1">
                {done}/{catItems.length}
              </span>
              {catItems.length > 0 && (
                <div className="flex-1 h-px ml-1" style={{ background: `${color}20` }}/>
              )}
              {!readOnly && (
                <button onClick={() => setAddingCategory(isAdding ? null : cat)}
                  className="ml-auto text-white/20 hover:text-white/60 transition-colors">
                  <Plus size={14}/>
                </button>
              )}
            </div>

            <div className="space-y-1.5 pl-4">
              <AnimatePresence>
                {catItems.map(item => (
                  <ChecklistItem key={item.id} item={item} processId={processId} readOnly={readOnly}/>
                ))}
                {isAdding && (
                  <motion.div key="add-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AddItemRow processId={processId} category={cat} onClose={() => setAddingCategory(null)}/>
                  </motion.div>
                )}
              </AnimatePresence>
              {catItems.length === 0 && !isAdding && !readOnly && (
                <button onClick={() => setAddingCategory(cat)}
                  className="text-xs text-white/20 hover:text-white/40 transition-colors flex items-center gap-1 py-1">
                  <Plus size={11}/> Ajouter une tâche
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
