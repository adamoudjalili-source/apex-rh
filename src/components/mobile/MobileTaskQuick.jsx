// ============================================================
// APEX RH — MobileTaskQuick.jsx  ·  Session 39
// Création rapide de tâche en mobile — bottom sheet
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, CheckCircle } from 'lucide-react'
import { useCreateTask } from '../../hooks/useTasks'
import { useAuth } from '../../contexts/AuthContext'

const PRIORITIES = [
  { value: 'normale',  label: '📋 Normale',  color: '#6B7280' },
  { value: 'haute',    label: '⚡ Haute',    color: '#F59E0B' },
  { value: 'urgente',  label: '🔴 Urgente',  color: '#EF4444' },
]

export default function MobileTaskQuick({ onClose }) {
  const { profile } = useAuth()
  const createTask   = useCreateTask()

  const [title,    setTitle]    = useState('')
  const [priority, setPriority] = useState('normale')
  const [dueDate,  setDueDate]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const taskData = {
        title:        title.trim(),
        priority,
        due_date:     dueDate || null,
        status:       'backlog',
        service_id:   profile?.service_id || null,
        division_id:  profile?.division_id || null,
        direction_id: profile?.direction_id || null,
      }
      await createTask.mutateAsync({ taskData, assigneeIds: [profile?.id].filter(Boolean) })
      setDone(true)
      setTimeout(() => onClose?.(), 1000)
    } catch(e) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          className="w-full rounded-t-3xl p-6 space-y-5"
          style={{ background: '#1A1A35', border: '1px solid rgba(255,255,255,0.1)' }}
          initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle size={48} className="text-green-400" />
              <p className="text-white font-bold">Tâche créée !</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Nouvelle tâche
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X size={16} className="text-white/60" />
                </button>
              </div>

              {/* Titre */}
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titre de la tâche..."
                autoFocus
                className="w-full text-base font-medium text-white placeholder-white/30 rounded-2xl px-4 py-4 outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />

              {/* Priorité */}
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className="py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: priority === p.value ? `${p.color}20` : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${priority === p.value ? p.color : 'transparent'}`,
                      color: priority === p.value ? p.color : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Date */}
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-sm text-white/70 rounded-xl px-4 py-3 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />

              {/* Submit */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim() || loading}
                className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
              >
                <Plus size={20} />
                {loading ? 'Création...' : 'Créer la tâche'}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
