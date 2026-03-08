// ============================================================
// APEX RH — OKRCheckinForm.jsx
// Session 78 — Formulaire de check-in pour un Key Result
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Send } from 'lucide-react'
import { useCreateCheckin } from '../../hooks/useObjectives'

const CONFIDENCE_OPTIONS = [
  { value: 'high',    label: 'Confiant',   icon: TrendingUp,   color: 'text-green-400',  bg: 'bg-green-900/30',  border: 'border-green-500/50' },
  { value: 'medium',  label: 'Modéré',     icon: Minus,        color: 'text-amber-400',  bg: 'bg-amber-900/30',  border: 'border-amber-500/50' },
  { value: 'low',     label: 'Incertain',  icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-500/50' },
  { value: 'at_risk', label: 'En risque',  icon: AlertTriangle, color: 'text-rose-400',  bg: 'bg-rose-900/30',   border: 'border-rose-500/50' },
]

export default function OKRCheckinForm({ keyResult, onClose, onSuccess }) {
  const [progress, setProgress] = useState(keyResult?.current_value ?? 0)
  const [confidence, setConfidence] = useState(keyResult?.confidence_level ?? 'medium')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const createCheckin = useCreateCheckin()

  const delta = progress - (keyResult?.current_value ?? 0)
  const deltaColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-rose-400' : 'text-gray-400'

  async function handleSubmit() {
    if (createCheckin.isPending) return
    await createCheckin.mutateAsync({
      key_result_id: keyResult.id,
      progress_value: progress,
      confidence,
      note: note.trim() || null,
    })
    setSaved(true)
    setTimeout(() => { onSuccess?.(); onClose?.() }, 800)
  }

  if (saved) return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center">
        <CheckCircle className="w-6 h-6 text-green-400" />
      </div>
      <p className="text-sm text-green-300 font-medium">Check-in enregistré !</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* KR Info */}
      <div className="bg-gray-800/60 rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-1">Key Result</p>
        <p className="text-sm text-white font-medium">{keyResult?.title}</p>
        {keyResult?.target_value != null && (
          <p className="text-xs text-gray-500 mt-1">
            Cible : {keyResult.target_value}{keyResult.unit ? ` ${keyResult.unit}` : '%'}
          </p>
        )}
      </div>

      {/* Slider progression */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-400 font-medium">Progression actuelle</label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
            {delta !== 0 && (
              <span className={`text-xs font-medium ${deltaColor}`}>
                {delta > 0 ? '+' : ''}{Math.round(delta)}%
              </span>
            )}
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500"
          style={{
            background: `linear-gradient(to right, #6366f1 ${progress}%, #374151 ${progress}%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Niveau de confiance */}
      <div>
        <label className="block text-xs text-gray-400 font-medium mb-2">Niveau de confiance</label>
        <div className="grid grid-cols-2 gap-2">
          {CONFIDENCE_OPTIONS.map(({ value, label, icon: Icon, color, bg, border }) => (
            <button
              key={value}
              onClick={() => setConfidence(value)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                confidence === value
                  ? `${bg} ${border} ${color}`
                  : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${confidence === value ? color : ''}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs text-gray-400 font-medium mb-2">Note (optionnel)</label>
        <textarea
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Contexte, blocages, prochaines étapes…"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={createCheckin.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {createCheckin.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Send className="w-4 h-4" /> Enregistrer</>
          )}
        </button>
      </div>
    </div>
  )
}
