// ============================================================
// APEX RH — pages/reconnaissances/Reconnaissances.jsx
// S100 — Phase C RBAC — Page Reconnaissances (vue manager/admin)
// Guard can('reconnaissances', 'team', 'read') via usePermission() V2
// Wraps EngagementHub avec contexte élargi pour managers
// ============================================================
import { Shield } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import EngagementHub from '../engagement/EngagementHub'

export default function Reconnaissances() {
  const { can } = usePermission()

  // Les collaborateurs accèdent à leurs propres reconnaissances
  // via /mes-reconnaissances → MesReconnaissances → EngagementHub
  // Cette route /reconnaissances est réservée aux managers et admins
  if (!can('reconnaissances', 'team', 'read') && !can('reconnaissances', 'admin', 'read')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Shield size={36} className="text-white/10" />
        <p className="text-white/30 text-sm">Accès réservé aux responsables et administrateurs.</p>
      </div>
    )
  }

  return <EngagementHub />
}
