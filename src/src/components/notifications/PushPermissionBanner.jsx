// ============================================================
// APEX RH — PushPermissionBanner.jsx
// Session 56 — Bannière demande permission Web Push
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, BellOff, Smartphone, ArrowRight } from 'lucide-react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

// ─── RAISONS D'ACTIVER ───────────────────────────────────────
const PUSH_REASONS = [
  { icon: '📋', text: 'Nouvelles tâches assignées' },
  { icon: '📊', text: 'Alertes de performance' },
  { icon: '🎯', text: 'Cycles d\'évaluation ouverts' },
]

// ─── BANNIÈRE FLOTTANTE ──────────────────────────────────────
export default function PushPermissionBanner() {
  const {
    supported,
    vapidAvailable,
    showBanner,
    permission,
    isLoading,
    enablePush,
    dismissBanner,
  } = usePushNotifications()

  const [activating, setActivating] = useState(false)
  const [success, setSuccess] = useState(false)

  // Ne pas afficher si : non supporté, pas de VAPID, déjà accordé, déjà refusé
  if (!supported || !vapidAvailable || !showBanner || permission === 'denied') {
    return null
  }

  const handleEnable = async () => {
    setActivating(true)
    const ok = await enablePush()
    setActivating(false)
    if (ok) {
      setSuccess(true)
      setTimeout(() => dismissBanner(), 2000)
    }
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{    opacity: 0, y: 80, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] w-full max-w-sm px-4"
        >
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              background:    'linear-gradient(135deg, #1a1a3e 0%, #12122a 100%)',
              border:        '1px solid rgba(79, 70, 229, 0.3)',
              boxShadow:     '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,70,229,0.1)',
            }}
          >
            {/* Glow accent */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #4F46E5, transparent)' }}
            />

            {success ? (
              // État succès
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                >
                  <Bell size={18} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Notifications activées ✓</p>
                  <p className="text-xs text-white/45 mt-0.5">Vous recevrez les alertes importantes</p>
                </div>
              </motion.div>
            ) : (
              <div className="p-4">
                {/* En-tête */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79,70,229,0.25)' }}
                    >
                      <Smartphone size={16} style={{ color: '#818CF8' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Activer les notifications</p>
                      <p className="text-[11px] text-white/40">Restez informé en temps réel</p>
                    </div>
                  </div>
                  <button
                    onClick={dismissBanner}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Raisons */}
                <div className="space-y-1.5 mb-4">
                  {PUSH_REASONS.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm">{r.icon}</span>
                      <span className="text-[11px] text-white/50">{r.text}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleEnable}
                    disabled={activating || isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                    style={{
                      background: activating
                        ? 'rgba(79, 70, 229, 0.3)'
                        : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      boxShadow: activating ? 'none' : '0 4px 16px rgba(79,70,229,0.4)',
                    }}
                  >
                    {activating ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Bell size={13} />
                        Activer
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                  <button
                    onClick={dismissBanner}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors"
                  >
                    <BellOff size={13} />
                  </button>
                </div>

                {/* Note RGPD */}
                <p className="text-[9px] text-white/15 mt-2 text-center">
                  Révocable à tout moment dans Paramètres → Notifications
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── BADGE STATUT PUSH (pour les paramètres) ─────────────────
export function PushStatusBadge({ onClick }) {
  const { supported, isSubscribed, permission } = usePushNotifications()

  if (!supported) {
    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(107,114,128,0.15)', color: '#6B7280' }}
      >
        Non supporté
      </span>
    )
  }

  if (isSubscribed) {
    return (
      <button onClick={onClick} className="flex items-center gap-1 group">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#10B981', boxShadow: '0 0 4px #10B981' }}
        />
        <span
          className="text-[10px] px-2 py-0.5 rounded-full group-hover:opacity-80 transition-opacity"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
        >
          Activées
        </span>
      </button>
    )
  }

  if (permission === 'denied') {
    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
      >
        Bloquées navigateur
      </span>
    )
  }

  return (
    <button onClick={onClick} className="flex items-center gap-1 group">
      <span
        className="text-[10px] px-2 py-0.5 rounded-full group-hover:opacity-80 transition-opacity"
        style={{ background: 'rgba(79,70,229,0.15)', color: '#818CF8' }}
      >
        Désactivées
      </span>
    </button>
  )
}
