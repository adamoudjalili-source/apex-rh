// ============================================================
// APEX RH — ConfirmModal.jsx (S112d)
// Dialog de confirmation standardisé — remplace les confirms inline
//
// Usage :
//   const [confirmId, setConfirmId] = useState(null)
//   <ConfirmModal
//     isOpen={!!confirmId}
//     onClose={() => setConfirmId(null)}
//     onConfirm={() => { doDelete(confirmId); setConfirmId(null) }}
//     title="Supprimer ?"
//     message="Cette action est irréversible."
//     confirmLabel="Supprimer"      // optionnel, défaut "Confirmer"
//     danger                        // optionnel, bouton rouge
//   />
// ============================================================

import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title        = 'Confirmer ?',
  message      = 'Cette action est irréversible.',
  confirmLabel = 'Confirmer',
  cancelLabel  = 'Annuler',
  danger       = false,
  loading      = false,
}) {
  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="relative rounded-2xl p-6 max-w-sm w-full space-y-4"
            style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              {message && <p className="text-xs text-white/40 mt-1">{message}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 rounded-lg border border-white/[0.07] text-sm text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  danger
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                }`}
              >
                {loading ? '…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
