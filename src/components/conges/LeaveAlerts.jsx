// ============================================================
// APEX RH — src/components/conges/LeaveAlerts.jsx
// Session 70 — Alertes proactives congés
// Solde faible · Demande en attente · Expiration report
// ============================================================
import { useState } from 'react'
import { AlertTriangle, Clock, TrendingDown, CalendarX, Bell, RefreshCw } from 'lucide-react'
import { useLeaveAlerts } from '../../hooks/useConges'
import { useAuth } from '../../contexts/AuthContext'

const ALERT_ICONS = {
  pending:     Clock,
  low_balance: TrendingDown,
  expiry:      CalendarX,
}
const ALERT_COLORS = {
  high:   { text: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
  medium: { text: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  low:    { text: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)' },
}
const ALERT_TYPE_LABELS = {
  pending:     'En attente',
  low_balance: 'Solde faible',
  expiry:      'Expiration',
}

export default function LeaveAlerts() {
  const { profile }  = useAuth()
  const { data: alerts = [], isLoading, refetch } = useLeaveAlerts()
  const [filter, setFilter] = useState('all') // 'all' | 'high' | 'medium' | 'low'
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.severity !== filter) return false
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    return true
  })

  const countHigh   = alerts.filter(a => a.severity === 'high').length
  const countMedium = alerts.filter(a => a.severity === 'medium').length

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)' }}/>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Bell size={16} className="text-orange-400"/>
            Alertes proactives
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:'rgba(239,68,68,0.15)', color:'#EF4444' }}>
                {alerts.length}
              </span>
            )}
          </h3>
          {countHigh > 0 && (
            <p className="text-[11px] text-red-400/70 mt-0.5">
              {countHigh} alerte{countHigh>1?'s':''} critique{countHigh>1?'s':''} à traiter
            </p>
          )}
        </div>
        <button onClick={() => refetch()}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
          <RefreshCw size={13}/>
        </button>
      </div>

      {/* Filtres */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.04)' }}>
            {[
              { key:'all',    label:`Tout (${alerts.length})` },
              { key:'high',   label:`Critique (${countHigh})` },
              { key:'medium', label:`Modéré (${countMedium})` },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === f.key ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/50'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.04)' }}>
            {[
              { key:'all',         label:'Tous types' },
              { key:'pending',     label:'En attente' },
              { key:'low_balance', label:'Soldes'    },
              { key:'expiry',      label:'Expirations'},
            ].map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${typeFilter === f.key ? 'bg-white/10 text-white/80' : 'text-white/30 hover:text-white/50'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste alertes */}
      {alerts.length === 0 ? (
        <div className="rounded-2xl py-12 text-center"
          style={{ background:'rgba(16,185,129,0.03)', border:'1px dashed rgba(16,185,129,0.12)' }}>
          <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background:'rgba(16,185,129,0.1)' }}>
            <Bell size={18} className="text-emerald-400"/>
          </div>
          <p className="text-sm text-emerald-400/60 font-medium">Aucune alerte en cours</p>
          <p className="text-[11px] text-white/25 mt-1">Toutes les demandes sont à jour</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          Aucune alerte pour ce filtre
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const Icon   = ALERT_ICONS[alert.type] || AlertTriangle
            const colors = ALERT_COLORS[alert.severity]
            return (
              <div key={alert.id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border"
                style={{ background: colors.bg, borderColor: colors.border }}>

                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${colors.text}20` }}>
                  <Icon size={15} style={{ color: colors.text }}/>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white/85 truncate">{alert.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background:`${colors.text}15`, color: colors.text }}>
                      {ALERT_TYPE_LABELS[alert.type]}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 truncate">{alert.description}</p>
                </div>

                {/* Indicateur sévérité */}
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors.text }}/>
              </div>
            )
          })}
        </div>
      )}

      {/* Légende */}
      <div className="flex items-center gap-4 text-[10px] text-white/25">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/70 inline-block"/> Critique</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/70 inline-block"/> Modéré</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70 inline-block"/> Information</span>
      </div>
    </div>
  )
}
