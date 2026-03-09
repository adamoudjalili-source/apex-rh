// ============================================================
// APEX RH — NotificationBell.jsx
// Session 86 — Cloche de notifications avec badge count
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useUnreadCountS86 } from '../hooks/useNotifications'
import NotificationInbox from './NotificationInbox'

export default function NotificationBell({ collapsed = false }) {
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useUnreadCountS86()
  const ref = useRef(null)

  // Fermer en cliquant ailleurs
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className={`
          relative flex items-center justify-center rounded-lg transition-all duration-200
          ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}
          ${open
            ? 'bg-indigo-500/20 text-indigo-300'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.06]'
          }
        `}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
            style={{ background: 'linear-gradient(135deg, #EF4444, #C9A227)' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationInbox onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
