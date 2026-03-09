// ============================================================
// APEX RH — NotificationToast.jsx
// Session 56 — Toast snackbar temps réel (nouvelles notifications)
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, CheckSquare, Target, FolderKanban, Users,
  AlertTriangle, Award, MessageSquare, Bell,
  Brain, Calendar, Star, TrendingUp,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── CONFIG TYPES (S12 + S56) ────────────────────────────────
const TYPE_CONFIG = {
  task_assigned:                 { icon: CheckSquare, color: '#3B82F6',  label: 'Tâche assignée' },
  task_overdue:                  { icon: AlertTriangle, color: '#EF4444', label: 'Tâche en retard' },
  task_completed:                { icon: CheckSquare, color: '#10B981',  label: 'Tâche terminée' },
  task_comment:                  { icon: MessageSquare, color: '#8B5CF6', label: 'Commentaire' },
  objective_evaluation:          { icon: Target, color: '#C9A227',       label: 'Évaluation OKR' },
  objective_validated:           { icon: Award, color: '#10B981',        label: 'Objectif validé' },
  project_member_added:          { icon: Users, color: '#3B82F6',        label: 'Ajout au projet' },
  project_milestone_reached:     { icon: FolderKanban, color: '#8B5CF6', label: 'Jalon atteint' },
  project_deliverable_due:       { icon: AlertTriangle, color: '#F59E0B',label: 'Livrable dû' },
  calibration_session_opened:    { icon: Star, color: '#C9A227',         label: 'Calibration ouverte' },
  calibration_override_approved: { icon: Award, color: '#10B981',        label: 'Override approuvé' },
  calibration_override_rejected: { icon: AlertTriangle, color: '#EF4444',label: 'Override rejeté' },
  enps_survey_available:         { icon: MessageSquare, color: '#8B5CF6',label: 'Survey disponible' },
  performance_alert:             { icon: TrendingUp, color: '#F59E0B',   label: 'Alerte performance' },
  behavioral_alert:              { icon: Brain, color: '#EC4899',        label: 'Alerte comportementale' },
  succession_nominated:          { icon: Star, color: '#C9A227',         label: 'Nomination succession' },
  career_opportunity:            { icon: TrendingUp, color: '#10B981',   label: 'Opportunité carrière' },
  review_cycle_started:          { icon: Calendar, color: '#4F46E5',     label: 'Cycle évaluation' },
  review_evaluation_due:         { icon: Calendar, color: '#F59E0B',     label: 'Évaluation à rendre' },
  onboarding_reminder:           { icon: Bell, color: '#4F46E5',         label: 'Rappel onboarding' },
  system:                        { icon: Bell, color: '#6B7280',         label: 'Système' },
}

const MAX_TOASTS   = 3
const AUTO_DISMISS = 5000 // ms

// ─── COMPOSANT TOAST INDIVIDUEL ──────────────────────────────
function Toast({ toast, onClose }) {
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.system
  const Icon = cfg.icon

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), AUTO_DISMISS)
    return () => clearTimeout(t)
  }, [toast.id, onClose])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{    opacity: 0, x: 80, scale: 0.9 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-start gap-3 w-80 px-4 py-3 rounded-xl cursor-pointer"
      style={{
        background:    'rgba(13, 13, 36, 0.97)',
        border:        `1px solid ${cfg.color}25`,
        boxShadow:     `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}10`,
        backdropFilter:'blur(20px)',
      }}
      onClick={() => onClose(toast.id)}
    >
      {/* Barre couleur gauche */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ background: cfg.color }}
      />

      {/* Icône */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${cfg.color}18` }}
      >
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/90 leading-tight truncate">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[11px] text-white/45 mt-0.5 line-clamp-2 leading-relaxed">
            {toast.message}
          </p>
        )}
        <p className="text-[10px] mt-1" style={{ color: `${cfg.color}99` }}>
          {cfg.label}
        </p>
      </div>

      {/* Fermer */}
      <button
        className="w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors flex-shrink-0 mt-0.5"
        onClick={(e) => { e.stopPropagation(); onClose(toast.id) }}
      >
        <X size={11} />
      </button>

      {/* Barre de progression auto-dismiss */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] rounded-full"
        style={{ background: cfg.color, originX: 0 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: AUTO_DISMISS / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function NotificationToast() {
  const { profile } = useAuth()
  const [toasts, setToasts] = useState([])
  const seenIds = useRef(new Set())
  const isFirst = useRef(true)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((notif) => {
    if (seenIds.current.has(notif.id)) return
    seenIds.current.add(notif.id)

    setToasts(prev => {
      const next = [{ ...notif, toastId: notif.id }, ...prev]
      return next.slice(0, MAX_TOASTS)
    })
  }, [])

  // Écoute Supabase Realtime pour les nouvelles notifs
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`toast-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          // Ignorer la première salve au montage (notifs existantes)
          if (isFirst.current) {
            isFirst.current = false
            return
          }
          if (payload.new) addToast(payload.new)
        }
      )
      .subscribe()

    // Après montage, plus d'ignorance des nouvelles notifs
    setTimeout(() => { isFirst.current = false }, 1000)

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, addToast])

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto relative">
            <Toast toast={toast} onClose={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

// Export du config types pour réutilisation
export { TYPE_CONFIG }
