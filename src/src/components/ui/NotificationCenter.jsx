// ============================================================
// APEX RH — NotificationCenter.jsx
// ✅ Session 12 — Centre de notifications in-app
// ============================================================
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckSquare, Target, FolderKanban, Users,
  Check, CheckCheck, Trash2, X, MessageSquare,
  AlertTriangle, Award, Settings,
} from 'lucide-react'
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useClearReadNotifications,
  useNotificationRealtime,
} from '../../hooks/useNotifications'

// ─── CONFIG TYPES ────────────────────────────────────────────
const TYPE_CONFIG = {
  task_assigned: { icon: CheckSquare, color: '#3B82F6', label: 'Tâche assignée' },
  task_overdue: { icon: AlertTriangle, color: '#EF4444', label: 'Tâche en retard' },
  task_completed: { icon: Check, color: '#10B981', label: 'Tâche terminée' },
  task_comment: { icon: MessageSquare, color: '#8B5CF6', label: 'Commentaire' },
  objective_evaluation: { icon: Target, color: '#C9A227', label: 'Évaluation OKR' },
  objective_validated: { icon: Award, color: '#10B981', label: 'Objectif validé' },
  project_member_added: { icon: Users, color: '#3B82F6', label: 'Ajout au projet' },
  project_milestone_reached: { icon: FolderKanban, color: '#8B5CF6', label: 'Jalon atteint' },
  project_deliverable_due: { icon: AlertTriangle, color: '#F59E0B', label: 'Livrable dû' },
  system: { icon: Bell, color: '#6B7280', label: 'Système' },
}

// ─── TEMPS RELATIF ───────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'À l\'instant'
  if (min < 60) return `Il y a ${min}min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Il y a ${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const navigate = useNavigate()

  // Données
  const { data: notifications = [], isLoading } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const clearRead = useClearReadNotifications()

  // Temps réel
  useNotificationRealtime()

  // Filtrage
  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  // Navigation + marquer comme lu
  const handleClick = (notif) => {
    if (!notif.is_read) {
      markAsRead.mutate(notif.id)
    }
    if (notif.link) {
      navigate(notif.link)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      {/* Bouton cloche */}
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
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              boxShadow: '0 0 8px rgba(79,70,229,0.6)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-96 rounded-xl overflow-hidden z-50"
            style={{
              background: '#0D0D24',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* En-tête */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white">Notifications</p>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded-full hover:bg-indigo-500/10 transition-colors"
                      title="Tout marquer comme lu"
                    >
                      <CheckCheck size={12} className="inline mr-0.5" />
                      Tout lire
                    </button>
                  )}
                  {notifications.some(n => n.is_read) && (
                    <button
                      onClick={() => clearRead.mutate()}
                      className="text-[10px] text-white/20 hover:text-red-400 px-2 py-0.5 rounded-full hover:bg-red-500/10 transition-colors"
                      title="Supprimer les lues"
                    >
                      <Trash2 size={10} className="inline mr-0.5" />
                      Vider
                    </button>
                  )}
                </div>
              </div>

              {/* Filtres */}
              <div className="flex gap-1">
                <FilterTab
                  label="Toutes"
                  active={filter === 'all'}
                  onClick={() => setFilter('all')}
                  count={notifications.length}
                />
                <FilterTab
                  label="Non lues"
                  active={filter === 'unread'}
                  onClick={() => setFilter('unread')}
                  count={unreadCount}
                />
              </div>
            </div>

            {/* Liste */}
            <div
              className="max-h-[400px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
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
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ONGLET DE FILTRE ────────────────────────────────────────
function FilterTab({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors"
      style={{
        background: active ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
        color: active ? '#818CF8' : 'rgba(255,255,255,0.3)',
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="ml-1 px-1.5 py-0 rounded-full text-[9px]"
          style={{
            background: active ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255,255,255,0.05)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ─── ITEM DE NOTIFICATION ────────────────────────────────────
function NotificationItem({ notification, onClick }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${
        notification.is_read
          ? 'hover:bg-white/[0.02]'
          : 'bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08]'
      }`}
      onClick={onClick}
    >
      {/* Icône */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${config.color}15` }}
      >
        <Icon size={12} style={{ color: config.color }} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold leading-tight ${
          notification.is_read ? 'text-white/50' : 'text-white/80'
        }`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className={`text-[10px] leading-relaxed mt-0.5 line-clamp-2 ${
            notification.is_read ? 'text-white/25' : 'text-white/40'
          }`}>
            {notification.message}
          </p>
        )}
        <p className="text-[9px] text-white/15 mt-1">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Point non lu */}
      {!notification.is_read && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ background: '#4F46E5', boxShadow: '0 0 6px rgba(79,70,229,0.5)' }}
        />
      )}
    </motion.div>
  )
}
