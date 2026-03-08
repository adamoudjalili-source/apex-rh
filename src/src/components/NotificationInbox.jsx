// ============================================================
// APEX RH — NotificationInbox.jsx
// Session 86 — Panneau inbox slide-in avec filtres et actions
// ============================================================
import { useState } from 'react'
import {
  X, CheckCheck, Archive, Bell, BellOff,
  AlertTriangle, CheckCircle, Info, Zap,
  ChevronRight,
} from 'lucide-react'
import {
  useNotificationInbox,
  useMarkRead,
  useMarkAllRead,
  useArchiveNotification,
} from '../hooks/useNotificationsS86'

// ─── Couleurs et icônes par event_type ────────────────────────
const EVENT_CONFIG = {
  leave_refused:        { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: BellOff,      label: 'Congé refusé' },
  leave_approved:       { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle,  label: 'Congé approuvé' },
  departure_registered: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: AlertTriangle, label: 'Départ' },
  onboarding_overdue:   { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: AlertTriangle, label: 'Onboarding' },
  offboarding_alert:    { color: '#EC4899', bg: 'rgba(236,72,153,0.12)',  icon: AlertTriangle, label: 'Offboarding' },
  review_due:           { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: Info,          label: 'Entretien' },
  feedback360_due:      { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   icon: Info,          label: 'Feedback 360' },
  settlement_applied:   { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle,   label: 'Solde appliqué' },
  default:              { color: '#C9A227', bg: 'rgba(201,162,39,0.12)',   icon: Bell,          label: 'Notification' },
}

const PRIORITY_DOT = {
  urgent: '#EF4444',
  high:   '#F59E0B',
  normal: '#3B82F6',
  low:    '#6B7280',
}

function getConfig(eventType) {
  return EVENT_CONFIG[eventType] || EVENT_CONFIG.default
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

// ─── Composant item ────────────────────────────────────────────
function NotifItem({ notif, onMarkRead, onArchive }) {
  const cfg = getConfig(notif.event_type)
  const IconComp = cfg.icon
  const isUnread = !notif.read_at
  const isEscalated = !!notif.escalated_from

  return (
    <div
      className={`group relative flex gap-3 px-4 py-3 border-b border-white/[0.04] transition-all cursor-default ${
        isUnread ? 'bg-white/[0.025]' : ''
      } hover:bg-white/[0.04]`}
    >
      {/* Icône */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.bg }}
      >
        <IconComp size={15} style={{ color: cfg.color }} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-tight truncate ${isUnread ? 'text-white font-semibold' : 'text-white/70'}`}>
            {notif.title}
          </p>
          <span className="text-[10px] text-white/30 flex-shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
        </div>
        <p className="text-xs text-white/45 mt-0.5 line-clamp-2 leading-relaxed">
          {notif.body}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {isEscalated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-400">
              ESCALADE
            </span>
          )}
          {/* Dot priorité */}
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: PRIORITY_DOT[notif.priority] || PRIORITY_DOT.normal }}
          />
        </div>
      </div>

      {/* Actions hover */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {isUnread && (
          <button
            onClick={() => onMarkRead(notif.id)}
            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-green-400 hover:bg-green-400/10 transition-colors"
            title="Marquer comme lu"
          >
            <CheckCheck size={13} />
          </button>
        )}
        <button
          onClick={() => onArchive(notif.id)}
          className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
          title="Archiver"
        >
          <Archive size={13} />
        </button>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
          style={{ background: cfg.color }} />
      )}
    </div>
  )
}

// ─── Composant principal ────────────────────────────────────────
export default function NotificationInbox({ onClose }) {
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'urgent'

  const { data: allNotifs = [], isLoading } = useNotificationInbox({ limit: 50 })
  const { mutate: markRead }  = useMarkRead()
  const { mutate: markAll }   = useMarkAllRead()
  const { mutate: archive }   = useArchiveNotification()

  const filtered = allNotifs.filter(n => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'urgent') return n.priority === 'urgent' || !!n.escalated_from
    return true
  })

  const unreadCount = allNotifs.filter(n => !n.read_at).length

  return (
    <div
      className="absolute left-full top-0 ml-2 z-50 w-80 rounded-xl overflow-hidden shadow-2xl border border-white/[0.08]"
      style={{ background: 'linear-gradient(180deg, #0f0f2e 0%, #080818 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-indigo-400" />
          <span className="text-sm font-semibold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #C9A227)' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAll()}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-indigo-500/10"
            >
              Tout lire
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.04]">
        {[
          { key: 'all',    label: 'Toutes' },
          { key: 'unread', label: 'Non lues' },
          { key: 'urgent', label: 'Urgentes' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full transition-all font-medium ${
              filter === f.key
                ? 'text-white bg-indigo-500/30 border border-indigo-500/40'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={28} className="text-white/10" />
            <p className="text-xs text-white/30">
              {filter === 'unread' ? 'Tout est lu ✓' : 'Aucune notification'}
            </p>
          </div>
        ) : (
          filtered.map(n => (
            <NotifItem
              key={n.id}
              notif={n}
              onMarkRead={markRead}
              onArchive={archive}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] text-white/25">{filtered.length} notification(s)</span>
          <button className="flex items-center gap-1 text-[11px] text-indigo-400/70 hover:text-indigo-400 transition-colors">
            Voir tout <ChevronRight size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
