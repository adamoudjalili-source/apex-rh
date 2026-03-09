// ============================================================
// APEX RH — ExportButton.jsx
// ✅ Session 12 — Bouton export Excel réutilisable
// ============================================================
import { useState } from 'react'
import { Download, Check, Loader2 } from 'lucide-react'

export default function ExportButton({ onExport, label = 'Exporter', disabled = false }) {
  const [state, setState] = useState('idle') // idle | loading | done

  const handleClick = async () => {
    if (state !== 'idle' || disabled) return
    setState('loading')
    try {
      await Promise.resolve(onExport())
      setState('done')
      setTimeout(() => setState('idle'), 2000)
    } catch (err) {
      setState('idle')
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all duration-200 ${
        state === 'done'
          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
          : disabled
          ? 'border-white/5 text-white/15 cursor-not-allowed'
          : 'border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5'
      }`}
    >
      {state === 'loading' ? (
        <Loader2 size={13} className="animate-spin" />
      ) : state === 'done' ? (
        <Check size={13} />
      ) : (
        <Download size={13} />
      )}
      {state === 'done' ? 'Exporté !' : label}
    </button>
  )
}
