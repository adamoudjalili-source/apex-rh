// ============================================================
// APEX RH — components/admin/ModuleToggle.jsx
// S100 — Phase C RBAC — Composant natif usePermission() V2
// Toggle activation/désactivation d'un module avec guard can()
// ============================================================
import { useState } from 'react'
import { Shield, Check, AlertTriangle } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLog'
import { useAuth } from '../../contexts/AuthContext'

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

// ─── Toggle visuel ────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        background: checked ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)',
        border: checked ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.15)',
        width: '40px',
        height: '22px',
      }}
      title={checked ? 'Désactiver' : 'Activer'}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-transform duration-200 shadow-sm"
        style={{
          width: '16px',
          height: '16px',
          transform: checked ? 'translateX(20px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────
/**
 * ModuleToggle — Toggle d'activation de module avec garde RBAC et audit.
 *
 * @param {string}   moduleKey   — Clé du module (ex: 'compensation_enabled')
 * @param {string}   moduleLabel — Label affiché
 * @param {boolean}  enabled     — État actuel
 * @param {Function} onToggle    — Callback après changement (newValue: boolean) => void
 */
export default function ModuleToggle({ moduleKey, moduleLabel, enabled = false, onToggle }) {
  const { can } = usePermission()
  const { profile } = useAuth()
  const [saving, setSaving]     = useState(false)
  const [localEnabled, setLocal] = useState(enabled)
  const [error, setError]        = useState(null)
  const [success, setSuccess]    = useState(false)

  // Guard RBAC V2
  if (!can('admin', 'modules', 'admin')) return <AccessDenied />

  const handleToggle = async () => {
    const newValue = !localEnabled
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('org_module_settings')
      .upsert({
        organization_id: profile?.organization_id,
        module_key: moduleKey,
        is_enabled: newValue,
      }, { onConflict: 'organization_id,module_key' })

    if (err) {
      setError('Erreur lors de la mise à jour.')
      setSaving(false)
      return
    }

    logAudit('module_toggled', 'org_module_settings', moduleKey, {
      module: moduleKey,
      enabled: newValue,
      category: 'admin',
    })

    setLocal(newValue)
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 1500)
    onToggle?.(newValue)
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3">
        {success && <Check size={13} className="text-green-400 flex-shrink-0" />}
        <span className="text-sm text-white/80 font-medium">{moduleLabel}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          localEnabled
            ? 'text-green-400 bg-green-500/10 border border-green-500/20'
            : 'text-white/30 bg-white/5 border border-white/10'
        }`}>
          {localEnabled ? 'Actif' : 'Inactif'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle size={11} />
            {error}
          </div>
        )}
        <Toggle checked={localEnabled} onChange={handleToggle} disabled={saving} />
      </div>
    </div>
  )
}
