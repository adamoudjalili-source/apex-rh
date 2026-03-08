// ============================================================
// APEX RH — pages/admin/Notifications.jsx
// S100 — Phase C RBAC — Page admin Notifications
// Guard can('admin', 'notifications', 'read') via usePermission() V2
// Wraps NotificationRulesAdmin
// ============================================================
import { Shield } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import NotificationRulesAdmin from '../../components/NotificationRulesAdmin'

export default function NotificationsAdmin() {
  const { can } = usePermission()

  if (!can('admin', 'notifications', 'read')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Shield size={36} className="text-white/10" />
        <p className="text-white/30 text-sm">Accès réservé aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 py-4">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          Règles de notifications
        </h1>
        <p className="text-sm text-white/35 mt-1">
          Configurez les événements déclencheurs et les destinataires des notifications.
        </p>
      </div>
      <NotificationRulesAdmin />
    </div>
  )
}
