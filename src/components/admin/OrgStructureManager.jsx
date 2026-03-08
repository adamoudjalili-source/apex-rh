// ============================================================
// APEX RH — components/admin/OrgStructureManager.jsx
// S100 — Phase C RBAC — Composant natif usePermission() V2
// Gestion de la structure organisationnelle avec guard can()
// Affiche le résumé hiérarchique Direction → Division → Service
// ============================================================
import { useEffect, useState } from 'react'
import { Building2, ChevronRight, Users, RefreshCw, Shield, AlertTriangle } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── AccessDenied ─────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3"
      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '12px' }}>
      <Shield size={28} className="text-red-400/40" />
      <p className="text-sm text-red-400/50">Accès réservé aux administrateurs.</p>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
/**
 * OrgStructureManager — Vue condensée de la structure organisationnelle.
 * Affiche les compteurs Direction / Division / Service / Collaborateur.
 * Utilisé comme widget récapitulatif dans l'onglet Organisation.
 */
export default function OrgStructureManager() {
  const { can } = usePermission()
  const { profile } = useAuth()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  // Guard RBAC V2
  if (!can('admin', 'organisation', 'read')) return <AccessDenied />

  const orgId = profile?.organization_id

  const fetchStats = async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)

    const [dirs, divs, svcs, users] = await Promise.all([
      supabase.from('directions').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
      supabase.from('divisions').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    ])

    if (dirs.error || divs.error || svcs.error || users.error) {
      setError('Erreur lors du chargement.')
    } else {
      setStats({
        directions: dirs.count ?? 0,
        divisions:  divs.count ?? 0,
        services:   svcs.count ?? 0,
        users:      users.count ?? 0,
      })
    }
    setLoading(false)
  }

  useEffect(() => { fetchStats() }, [orgId])

  const items = [
    { label: 'Directions',   value: stats?.directions, color: '#A855F7', icon: Building2 },
    { label: 'Divisions',    value: stats?.divisions,  color: '#3B82F6', icon: Building2 },
    { label: 'Services',     value: stats?.services,   color: '#06B6D4', icon: Building2 },
    { label: 'Collaborateurs actifs', value: stats?.users, color: '#10B981', icon: Users },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Building2 size={14} className="text-indigo-400" />
          Structure organisationnelle
        </h3>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
          title="Actualiser"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Hiérarchie visuelle */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ color: '#A855F7' }} className="font-medium">🏛️ Direction</span>
        <ChevronRight size={10} className="text-white/20" />
        <span style={{ color: '#3B82F6' }} className="font-medium">🗂️ Division</span>
        <ChevronRight size={10} className="text-white/20" />
        <span style={{ color: '#06B6D4' }} className="font-medium">⚙️ Service</span>
        <ChevronRight size={10} className="text-white/20" />
        <span style={{ color: '#10B981' }} className="font-medium">👤 Collaborateur</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(({ label, value, color, icon: Icon }) => (
          <div key={label}
            className="flex flex-col gap-1 px-4 py-3 rounded-xl"
            style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
            <Icon size={14} style={{ color: `${color}99` }} />
            <span className="text-xl font-bold" style={{ color }}>
              {loading ? '—' : (value ?? 0)}
            </span>
            <span className="text-[11px] text-white/35">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
