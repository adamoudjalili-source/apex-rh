// ============================================================
// APEX RH — NotificationCenter.jsx
// ✅ Session 56 — Enrichi : nouveaux types + catégories + push
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckSquare, Target, FolderKanban, Users,
  Check, CheckCheck, Trash2, X, MessageSquare,
  AlertTriangle, Award, Settings, Brain, Calendar,
  Star, TrendingUp, Filter,
} from 'lucide-react'
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useClearReadNotifications,
  useNotificationRealtime,
} from '../../hooks/useNotifications'

// ─── CONFIG TYPES S12 + S56 ──────────────────────────────────
const TYPE_CONFIG = {
  task_assigned:                 { icon: CheckSquare,   color: '#3B82F6', label: 'Tâche assignée',       cat: 'work' },
  task_overdue:                  { icon: AlertTriangle, color: '#EF4444', label: 'Tâche en retard',      cat: 'work' },
  task_completed:                { icon: Check,         color: '#10B981', label: 'Tâche terminée',       cat: 'work' },
  task_comment:                  { icon: MessageSquare, color: '#8B5CF6', label: 'Commentaire',           cat: 'work' },
  objective_evaluation:          { icon: Target,        color: '#C9A227', label: 'Évaluation OKR',        cat: 'perf' },
  objective_validated:           { icon: Award,         color: '#10B981', label: 'Objectif validé',       cat: 'perf' },
  project_member_added:          { icon: Users,         color: '#3B82F6', label: 'Ajout au projet',       cat: 'work' },
  project_milestone_reached:     { icon: FolderKanban,  color: '#8B5CF6', label: 'Jalon atteint',         cat: 'work' },
  project_deliverable_due:       { icon: AlertTriangle, color: '#F59E0B', label: 'Livrable dû',           cat: 'work' },
  system:                        { icon: Bell,          color: '#6B7280', label: 'Système',               cat: 'system' },
  calibration_session_opened:    { icon: Star,          color: '#C9A227', label: 'Calibration ouverte',   cat: 'perf' },
  calibration_override_approved: { icon: Award,         color: '#10B981', label: 'Override approuvé',     cat: 'perf' },
  calibration_override_rejected: { icon: AlertTriangle, color: '#EF4444', label: 'Override rejeté',       cat: 'perf' },
  enps_survey_available:         { icon: MessageSquare, color: '#8B5CF6', label: 'Survey disponible',     cat: 'engage' },
  performance_alert:             { icon: TrendingUp,    color: '#F59E0B', label: 'Alerte performance',    cat: 'perf' },
  behavioral_alert:              { icon: Brain,         color: '#EC4899', label: 'Alerte comportementale',cat: 'engage' },
  succession_nominated:          { icon: Star,          color: '#C9A227', label: 'Nomination succession',  cat: 'perf' },
  career_opportunity:            { icon: TrendingUp,    color: '#10B981', label: 'Opportunité carrière',   cat: 'perf' },
  review_cycle_started:          { icon: Calendar,      color: '#4F46E5', label: 'Cycle évaluation',       cat: 'perf' },
  review_evaluation_due:         { icon: Calendar,      color: '#F59E0B', label: 'Évaluation à rendre',    cat: 'perf' },
  onboarding_reminder:           { icon: Bell,          color: '#4F46E5', label: 'Rappel onboarding',      cat: 'system' },
}

const CATEGORIES = [
  { key: 'all',    label: 'Toutes' },
  { key: 'unread', label: 'Non lues' },
  { key: 'perf',   label: 'Performance' },
  { key: 'work',   label: 'Travail' },
  { key: 'engage', label: 'Engagement' },
]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return "À l'instant"
  if (min < 60) return `Il y a ${min}min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationCenter() {
  const [isOpen,   setIsOpen]   = useState(false)
  const [filter,   setFilter]   = useState('all')
  const [showCats, setShowCats] = useState(false)
  const navigate = useNavigate()

  const { data: notifications = [], isLoading } = useNotifications()
  const { data: unreadCount   = 0 }             = useUnreadCount()
  const markAsRead  = useMarkAsRead()
  const markAllRead = useMarkAllAsRead()
  const clearRead   = useClearReadNotifications()

  useNotificationRealtime()

  const displayed = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read
    const cfg = TYPE_CONFIG[n.type]
    if (['perf','work','engage','system'].includes(filter)) return cfg?.cat === filter
    return true
  })

  const handleClick = (notif) => {
    if (!notif.is_read) markAsRead.mutate(notif.id)
    if (notif.link) { navigate(notif.link); setIsOpen(false) }
  }

  const unreadPerCat = (cat) =>
    notifications.filter(n => !n.is_read && TYPE_CONFIG[n.type]?.cat === cat).length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all relative"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 0 8px rgba(79,70,229,0.6)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-96 rounded-xl overflow-hidden z-50"
            style={{ background: '#0D0D24', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
          >
            {/* En-tête */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white">Notifications</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowCats(!showCats)}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                    style={{ color: showCats ? '#818CF8' : 'rgba(255,255,255,0.3)' }}
                    title="Filtrer par catégorie"
                  >
                    <Filter size={11} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded-full hover:bg-indigo-500/10 transition-colors"
                    >
                      <CheckCheck size={12} className="inline mr-0.5" />Tout lire
                    </button>
                  )}
                  {notifications.some(n => n.is_read) && (
                    <button
                      onClick={() => clearRead.mutate()}
                      className="text-[10px] text-white/20 hover:text-red-400 px-2 py-0.5 rounded-full hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={10} className="inline mr-0.5" />Vider
                    </button>
                  )}
                </div>
              </div>

              {/* Filtres */}
              <div className="flex flex-wrap gap-1">
                {(showCats ? CATEGORIES : CATEGORIES.slice(0, 2)).map((cat) => {
                  const count = cat.key === 'all' ? notifications.length
                              : cat.key === 'unread' ? unreadCount
                              : unreadPerCat(cat.key)
                  return (
                    <FilterTab
                      key={cat.key}
                      label={cat.label}
                      active={filter === cat.key}
                      onClick={() => setFilter(cat.key)}
                      count={count}
                    />
                  )
                })}
              </div>
            </div>

            {/* Liste */}
            <div className="max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {isLoading ? (
                <div className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : displayed.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={28} className="mx-auto mb-2 text-white/8" />
                  <p className="text-xs text-white/25">
                    {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {displayed.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onClick={() => handleClick(notif)}
                      onMarkRead={(id) => markAsRead.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {displayed.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] text-white/20">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => { navigate('/admin/settings'); setIsOpen(false) }}
                  className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
                >
                  <Settings size={10} />Préférences
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterTab({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors"
      style={{ background: active ? 'rgba(79, 70, 229, 0.15)' : 'transparent', color: active ? '#818CF8' : 'rgba(255,255,255,0.3)' }}
    >
      {label}
      {count > 0 && (
        <span className="ml-1 px-1.5 py-0 rounded-full text-[9px]" style={{ background: active ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255,255,255,0.05)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

function NotificationItem({ notification, onClick, onMarkRead }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system
  const Icon   = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${
        notification.is_read ? 'hover:bg-white/[0.02]' : 'bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08]'
      }`}
      onClick={onClick}
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${config.color}15` }}>
        <Icon size={12} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-[11px] font-semibold leading-tight ${notification.is_read ? 'text-white/50' : 'text-white/80'}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id) }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex-shrink-0"
              title="Marquer comme lu"
            >
              <Check size={10} />
            </button>
          )}
        </div>
        {notification.message && (
          <p className={`text-[10px] leading-relaxed mt-0.5 line-clamp-2 ${notification.is_read ? 'text-white/25' : 'text-white/40'}`}>
            {notification.message}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[9px] text-white/15">{timeAgo(notification.created_at)}</p>
          <span className="text-[9px] px-1.5 py-0 rounded-full" style={{ background: `${config.color}10`, color: `${config.color}80` }}>
            {config.label}
          </span>
        </div>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#4F46E5', boxShadow: '0 0 6px rgba(79,70,229,0.5)' }} />
      )}
    </motion.div>
  )
}
