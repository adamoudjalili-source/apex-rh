// ============================================================
// APEX RH — MobileBriefForm.jsx  ·  Session 39
// Brief matinal mobile — 3 taps maximum
// Étape 1: Humeur + dispo  |  Étape 2: Tâches  |  Étape 3: Submit
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { useMyActiveTasks, useSaveMorningPlan, useSubmitMorningPlan } from '../../hooks/usePulse'
import { useAuth } from '../../contexts/AuthContext'

const MOODS = [
  { value: 5, emoji: '🔥', label: 'En feu',      color: '#EF4444' },
  { value: 4, emoji: '💪', label: 'Motivé',      color: '#F59E0B' },
  { value: 3, emoji: '😊', label: 'Bien',         color: '#10B981' },
  { value: 2, emoji: '😐', label: 'Neutre',       color: '#6B7280' },
  { value: 1, emoji: '😴', label: 'Fatigué',      color: '#8B5CF6' },
]

const AVAILABILITY = [
  { value: 8,  label: '8h',   color: '#10B981' },
  { value: 6,  label: '6h',   color: '#3B82F6' },
  { value: 4,  label: '4h',   color: '#F59E0B' },
  { value: 2,  label: '2h',   color: '#EF4444' },
]

export default function MobileBriefForm({ onSuccess, onCancel }) {
  const { profile } = useAuth()
  const { data: activeTasks = [] } = useMyActiveTasks()
  const savePlan   = useSaveMorningPlan()
  const submitPlan = useSubmitMorningPlan()

  const [step, setStep]             = useState(0) // 0=humeur 1=tâches 2=confirm
  const [mood, setMood]             = useState(null)
  const [availability, setAvail]    = useState(null)
  const [selectedTasks, setSel]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)

  const topTasks = activeTasks.slice(0, 8) // max 8 tâches affichées

  function toggleTask(id) {
    setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit() {
    if (!mood || !availability) return
    setLoading(true)
    try {
      // 1. Sauvegarder le plan
      await savePlan.mutateAsync({
        availableHours:  availability,
        plannedTaskIds:  selectedTasks,
        note: selectedTasks.length > 0
          ? topTasks.filter(t => selectedTasks.includes(t.id)).map(t => t.title).join(', ')
          : '',
      })
      // 2. Soumettre
      await submitPlan.mutateAsync()
      setDone(true)
      setTimeout(() => onSuccess?.(), 1200)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981' }}
        >
          <CheckCircle size={40} className="text-green-400" />
        </motion.div>
        <p className="text-lg font-bold text-white">Brief envoyé ✓</p>
        <p className="text-sm text-white/40">Bonne journée !</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6 px-4 pt-4">
        {[0,1,2].map(s => (
          <div
            key={s}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ background: s <= step ? '#6366F1' : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>

      <div className="flex-1 px-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ÉTAPE 0 — Humeur + disponibilité */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Comment tu te sens ?
                </h2>
                <p className="text-sm text-white/40">Tap pour sélectionner</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: mood === m.value ? `${m.color}20` : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${mood === m.value ? m.color : 'transparent'}`,
                    }}
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <span className="text-[10px] text-white/60 font-medium">{m.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-3">Disponibilité aujourd'hui</h3>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABILITY.map(a => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAvail(a.value)}
                      className="py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                      style={{
                        background: availability === a.value ? `${a.color}20` : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${availability === a.value ? a.color : 'transparent'}`,
                        color: availability === a.value ? a.color : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 1 — Sélection des tâches */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Tâches du jour
                </h2>
                <p className="text-sm text-white/40">{selectedTasks.length} sélectionnée{selectedTasks.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-2">
                {topTasks.length === 0 && (
                  <p className="text-sm text-white/30 text-center py-6">Aucune tâche en cours</p>
                )}
                {topTasks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
                    style={{
                      background: selectedTasks.includes(t.id) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selectedTasks.includes(t.id) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        background: selectedTasks.includes(t.id) ? '#6366F1' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      {selectedTasks.includes(t.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.title}</p>
                      {t.due_date && (
                        <p className="text-xs text-white/30">Échéance : {t.due_date}</p>
                      )}
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                    >
                      {t.priority}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 2 — Confirmation */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Prêt à envoyer ?
                </h2>
                <p className="text-sm text-white/40">Résumé de ton brief</p>
              </div>

              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Humeur</span>
                  <span className="text-2xl">{MOODS.find(m => m.value === mood)?.emoji}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Disponibilité</span>
                  <span className="text-sm font-bold text-white">{availability}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Tâches planifiées</span>
                  <span className="text-sm font-bold text-indigo-400">{selectedTasks.length}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-6 pt-4 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center justify-center w-12 h-12 rounded-2xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={20} className="text-white/60" />
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && (!mood || !availability)}
            className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}
          >
            Continuer
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}
          >
            {loading ? 'Envoi...' : '✓ Envoyer le brief'}
          </button>
        )}
      </div>
    </div>
  )
}
