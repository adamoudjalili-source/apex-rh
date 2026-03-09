// ============================================================
// APEX RH — src/components/offboarding/KnowledgeTransferPanel.jsx
// Session 68 — Transfert de connaissances
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Check, Clock, AlertCircle, User, Link, ChevronDown, ChevronUp } from 'lucide-react'
import {
  useOffboardingKnowledge, useAddKnowledgeItem, useUpdateKnowledgeItem,
  KNOWLEDGE_STATUS_LABELS,
} from '../../hooks/useOffboarding'

const STATUS_ICONS  = { pending: AlertCircle, in_progress: Clock, done: Check }
const STATUS_COLORS = { pending: '#F59E0B', in_progress: '#3B82F6', done: '#10B981' }

function KnowledgeItem({ item, processId, readOnly }) {
  const [expanded, setExpanded] = useState(false)
  const updateItem = useUpdateKnowledgeItem()
  const Icon  = STATUS_ICONS[item.status] || Clock
  const color = STATUS_COLORS[item.status] || '#6B7280'

  const cycleStatus = () => {
    if (readOnly) return
    const next = { pending: 'in_progress', in_progress: 'done', done: 'pending' }
    updateItem.mutate({ id: item.id, processId, status: next[item.status] || 'pending' })
  }

  return (
    <motion.div layout
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: item.status === 'done' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
        background:  item.status === 'done' ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
      }}>
      <div className="flex items-center gap-3 p-3">
        <button onClick={cycleStatus} disabled={readOnly || updateItem.isPending}
          className="flex-shrink-0 p-1 rounded-lg transition-all hover:scale-110"
          style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }}/>
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-white/30' : 'text-white/80'}`}>
            {item.topic}
          </p>
          {item.transferred_to_user && (
            <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
              <User size={9}/>
              {item.transferred_to_user.first_name} {item.transferred_to_user.last_name}
            </p>
          )}
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ color, background: `${color}15` }}>
          {KNOWLEDGE_STATUS_LABELS[item.status]}
        </span>
        <button onClick={() => setExpanded(e => !e)} className="text-white/20 hover:text-white/50">
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/[0.05]">
            <div className="p-3 space-y-2">
              {item.description && (
                <p className="text-xs text-white/50">{item.description}</p>
              )}
              {item.attachment_url && (
                <a href={item.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                  <Link size={10}/> Voir la pièce jointe
                </a>
              )}
              {item.completed_at && (
                <p className="text-[10px] text-emerald-400/60">
                  Transféré le {new Date(item.completed_at).toLocaleDateString('fr-FR')}
                </p>
              )}
              {!readOnly && (
                <div className="flex gap-1.5 pt-1">
                  {Object.entries(KNOWLEDGE_STATUS_LABELS).map(([st, label]) => (
                    <button key={st}
                      onClick={() => updateItem.mutate({ id: item.id, processId, status: st })}
                      className="text-[10px] px-2 py-0.5 rounded-full border transition-all"
                      style={{
                        borderColor: item.status === st ? STATUS_COLORS[st] : 'rgba(255,255,255,0.1)',
                        color:       item.status === st ? STATUS_COLORS[st] : 'rgba(255,255,255,0.3)',
                        background:  item.status === st ? `${STATUS_COLORS[st]}15` : 'transparent',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AddKnowledgeForm({ processId, onClose }) {
  const [form, setForm]  = useState({ topic: '', description: '', attachment_url: '' })
  const addItem = useAddKnowledgeItem()

  const submit = async () => {
    if (!form.topic.trim()) return
    await addItem.mutateAsync({ process_id: processId, ...form, status: 'pending' })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="rounded-xl border border-white/[0.1] p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <input autoFocus value={form.topic}
        onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
        placeholder="Sujet à transférer *"
        className="w-full bg-transparent text-sm text-white placeholder-white/20 border-b border-white/[0.08] pb-2 outline-none"/>
      <textarea value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Description (optionnel)"
        rows={2}
        className="w-full bg-transparent text-sm text-white/70 placeholder-white/20 outline-none resize-none"/>
      <input value={form.attachment_url}
        onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value }))}
        placeholder="URL de document (optionnel)"
        className="w-full bg-transparent text-xs text-white/50 placeholder-white/15 outline-none"/>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="text-xs px-3 py-1 rounded-lg text-white/30 hover:text-white/60 transition-colors">
          Annuler
        </button>
        <button onClick={submit} disabled={!form.topic.trim() || addItem.isPending}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
          Ajouter
        </button>
      </div>
    </motion.div>
  )
}

export default function KnowledgeTransferPanel({ processId, readOnly = false }) {
  const { data: items = [], isLoading } = useOffboardingKnowledge(processId)
  const [adding, setAdding] = useState(false)

  const done  = items.filter(i => i.status === 'done').length
  const total = items.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-400"/>
          <span className="text-sm font-medium text-white/70">Transferts de connaissances</span>
          {total > 0 && (
            <span className="text-xs text-white/30">{done}/{total}</span>
          )}
        </div>
        {!readOnly && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-indigo-400 hover:bg-indigo-400/10">
            <Plus size={12}/> Ajouter
          </button>
        )}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500 bg-indigo-500"
            style={{ width: `${Math.round((done / total) * 100)}%` }}/>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {adding && (
          <AddKnowledgeForm processId={processId} onClose={() => setAdding(false)}/>
        )}
      </AnimatePresence>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-white/20 text-sm">
          Aucun transfert de connaissances
          {!readOnly && <span className="block text-xs mt-1">Ajoutez des sujets à documenter et transmettre</span>}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map(item => (
              <KnowledgeItem key={item.id} item={item} processId={processId} readOnly={readOnly}/>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
