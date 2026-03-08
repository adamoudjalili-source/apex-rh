// ============================================================
// APEX RH — components/admin/UserRoleSelector.jsx
// S100 — Phase C RBAC — Composant natif usePermission() V2
// Sélecteur de rôle avec audit RBAC et guard can()
// ============================================================
import { useState } from 'react'
import { ChevronDown, Shield, AlertTriangle, Check } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLog'

const ROLE_CONFIG = {
  collaborateur:  { label: 'Collaborateur',     color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)' },
  chef_service:   { label: 'Chef de Service',   color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)' },
  chef_division:  { label: 'Chef de Division',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  directeur:      { label: 'Directeur',         color: '#A855F7', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.25)' },
  administrateur: { label: 'Administrateur',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
}

const ROLES_ORDER = ['collaborateur', 'chef_service', 'chef_division', 'directeur', 'administrateur']

// ─── AccessDenied ─────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
      <Shield size={13} className="text-red-400/60" />
      <span className="text-xs text-red-400/60">Droits insuffisants</span>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
/**
 * UserRoleSelector — Sélecteur de rôle utilisateur avec garde RBAC et audit.
 *
 * @param {string}   userId      — ID de l'utilisateur cible
 * @param {string}   currentRole — Rôle actuel
 * @param {string}   userName    — Nom affiché dans l'audit log
 * @param {Function} onSuccess   — Callback après changement réussi (role) => void
 * @param {boolean}  compact     — Mode compact (inline)
 */
export default function UserRoleSelector({ userId, currentRole, userName = '', onSuccess, compact = false }) {
  const { can } = usePermission()
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)

  // Guard RBAC V2 — can() uniquement
  if (!can('admin', 'role', 'update')) return <AccessDenied />

  const cfg = ROLE_CONFIG[currentRole] || ROLE_CONFIG.collaborateur

  const handleSelect = async (newRole) => {
    if (newRole === currentRole) { setOpen(false); return }
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (err) {
      setError('Erreur lors de la mise à jour du rôle.')
      setSaving(false)
      return
    }

    // Audit avec category: 'rbac' obligatoire sur changement de rôle
    logAudit('role_changed', 'user', userId, {
      old_role: currentRole,
      new_role: newRole,
      user_name: userName,
      category: 'rbac',
    })

    setSaving(false)
    setSuccess(true)
    setOpen(false)
    setTimeout(() => setSuccess(false), 2000)
    onSuccess?.(newRole)
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        {success ? (
          <Check size={12} />
        ) : (
          <Shield size={12} />
        )}
        <span>{ROLE_CONFIG[currentRole]?.label ?? currentRole}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-xl overflow-hidden shadow-2xl"
            style={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)' }}>
            {ROLES_ORDER.map(role => {
              const rc = ROLE_CONFIG[role]
              const isActive = role === currentRole
              return (
                <button
                  key={role}
                  onClick={() => handleSelect(role)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left transition-colors hover:bg-white/[0.04]"
                  style={{ color: isActive ? rc.color : 'rgba(255,255,255,0.55)' }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: isActive ? rc.color : 'rgba(255,255,255,0.1)' }} />
                  {rc.label}
                  {isActive && <Check size={11} className="ml-auto" style={{ color: rc.color }} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="absolute left-0 top-full mt-1 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', whiteSpace: 'nowrap' }}>
          <AlertTriangle size={11} />
          {error}
        </div>
      )}
    </div>
  )
}
