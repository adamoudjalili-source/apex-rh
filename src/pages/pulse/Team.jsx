// ============================================================
// APEX RH — Team.jsx
// ✅ Session 22 — Vue équipe manager PULSE (Phase B)
// ✅ Session 25 — Phase G : Navigate + Link /pulse → /tasks (fusion UI)
// ============================================================

// 1. React hooks
import { useState } from 'react'
// 2. Librairies externes
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ChevronLeft, Calendar, AlertCircle, Activity } from 'lucide-react'
// 3. React Router
import { Navigate, Link } from 'react-router-dom'
// 4. Contexts
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
// 5. Hooks projet
import { useTeamMembers } from '../../hooks/useManagerReview'
import { useTeamAlerts } from '../../hooks/usePulseAlerts'
// 6. Helpers
import {
  isPulseEnabled,
  formatDateFr,
  getTodayString,
  PULSE_COLORS,
} from '../../lib/pulseHelpers'
// 7. Composants enfants
import TeamDayView from '../../components/pulse/TeamDayView'
import ManagerReviewPanel from '../../components/pulse/ManagerReviewPanel'
import AlertBadge from '../../components/pulse/AlertBadge'

import { MANAGER_ROLES } from '../../lib/roles'

export default function Team() {
  const { profile } = useAuth()
  const { data: settings, isLoading: settingsLoading } = useAppSettings()
  const { data: teamMembers = [] } = useTeamMembers()
  const { data: alerts = [] } = useTeamAlerts(settings)

  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [selectedLog, setSelectedLog] = useState(null) // log ouvert dans le panneau

  // ─── Guards ───────────────────────────────────────────────
  if (!settingsLoading && !isPulseEnabled(settings)) {
    return <Navigate to="/dashboard" replace />
  }
  if (!settingsLoading && !MANAGER_ROLES.includes(profile?.role)) {
    return <Navigate to="/tasks" replace />
  }

  const today = getTodayString()
  const isToday = selectedDate === today
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.isResolved)
  const warningAlerts  = alerts.filter(a => a.severity === 'warning' && !a.isResolved)
  const pendingAlerts  = alerts.filter(a => a.type === 'review_pending' && !a.isResolved)

  return (
    <div className="flex h-full">
      {/* Contenu principal */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 transition-all ${selectedLog ? 'mr-96' : ''}`}>

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/tasks"
              className="p-2 rounded-lg text-white/30 hover:text-white/70 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <ChevronLeft size={16} />
            </Link>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.2)' }}
            >
              <Users size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1
                className="text-2xl font-black text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Mon Équipe
              </h1>
              <p className="text-sm text-white/30">
                {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} · PULSE
              </p>
            </div>
          </div>

          {/* Badges alertes */}
          <div className="flex items-center gap-2">
            {criticalAlerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={12} className="text-red-400" />
                <span className="text-xs font-medium text-red-400">{criticalAlerts.length} critique{criticalAlerts.length > 1 ? 's' : ''}</span>
              </div>
            )}
            {pendingAlerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Activity size={12} className="text-amber-400" />
                <span className="text-xs font-medium text-amber-400">{pendingAlerts.length} à évaluer</span>
              </div>
            )}
          </div>
        </div>

        {/* Sélecteur de date */}
        <div className="flex items-center gap-3">
          <Calendar size={15} className="text-white/30" />
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              colorScheme: 'dark',
            }}
          />
          <span className="text-sm text-white/30">{formatDateFr(selectedDate)}</span>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Revenir à aujourd'hui
            </button>
          )}
        </div>

        {/* Alertes actives (si date = aujourd'hui) */}
        {isToday && (criticalAlerts.length > 0 || warningAlerts.length > 0) && (
          <AlertsPanel
            criticalAlerts={criticalAlerts}
            warningAlerts={warningAlerts}
            onSelectLog={log => setSelectedLog(log)}
          />
        )}

        {/* Vue équipe */}
        <TeamDayView
          date={selectedDate}
          teamMembers={teamMembers}
          onSelectLog={(log) => setSelectedLog(log)}
        />
      </div>

      {/* Panneau d'évaluation (drawer latéral) */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-96 border-l overflow-hidden z-40"
            style={{
              background: 'rgb(12, 12, 18)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <ManagerReviewPanel
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay quand panneau ouvert */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
            className="fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── PANNEAU D'ALERTES ────────────────────────────────────────
function AlertsPanel({ criticalAlerts, warningAlerts, onSelectLog }) {
  const [open, setOpen] = useState(true)
  const all = [...criticalAlerts, ...warningAlerts]

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-sm font-semibold text-red-400">
            {all.length} alerte{all.length > 1 ? 's' : ''} active{all.length > 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-xs text-white/30">{open ? 'Masquer' : 'Afficher'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {all.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onAction={alert.logId ? () => onSelectLog?.({ id: alert.logId }) : null}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function AlertRow({ alert, onAction }) {
  const colors = {
    critical: { text: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
    warning:  { text: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    info:     { text: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  }
  const { text, bg } = colors[alert.severity] || colors.warning

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
      style={{ background: bg }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: text }}>
          {alert.userName}
        </p>
        <p className="text-[10px] text-white/30 truncate">{alert.message}</p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="text-xs px-2 py-1 rounded flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: 'rgba(79,70,229,0.2)', color: '#818CF8' }}
        >
          Évaluer
        </button>
      )}
    </div>
  )
}
