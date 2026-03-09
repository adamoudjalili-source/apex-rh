// ============================================================
// APEX RH — src/components/temps/OvertimeAlerts.jsx
// Session 71 — Alertes proactives heures supplémentaires
// Dépassement seuil · Feuille non soumise · HS en attente
// ============================================================
import { useState } from 'react'
import { AlertTriangle, Clock, TrendingUp, CheckCircle, RefreshCw, BellOff } from 'lucide-react'
import { useOvertimeAlerts } from '../../hooks/useTemps'
import { CRITICALITY } from '../../utils/constants'

// ─── Config alertes ───────────────────────────────────────────
const ALERT_CONFIG = {
  late_submission: {
    label:  'Retard soumission',
    icon:   Clock,
    colors: { critical: '#EF4444', warning: '#F59E0B', info: '#3B82F6' },
  },
  overtime_pending: {
    label:  'HS en attente',
    icon:   AlertTriangle,
    colors: { critical: '#EF4444', warning: '#F59E0B', info: '#3B82F6' },
  },
  overtime_high: {
    label:  'Volume HS élevé',
    icon:   TrendingUp,
    colors: { critical: '#EF4444', warning: '#F59E0B', info: '#3B82F6' },
  },
}

const SEVERITY_ORDER  = { critical: 0, warning: 1, info: 2 }
const SEVERITY_LABELS = { critical: 'Critique', warning: 'Avertissement', info: 'Info' }

// ─── Carte alerte ─────────────────────────────────────────────
function AlertCard({ alert }) {
  const config = ALERT_CONFIG[alert.type] || {}
  const Icon   = config.icon || AlertTriangle
  const color  = (config.colors || {})[alert.severity] || '#6B7280'

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border transition-all hover:border-white/15"
      style={{
        background:   color + '0d',
        border:       `1px solid ${color}25`,
      }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color + '20' }}>
        <Icon className="w-4 h-4" style={{ color }}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-xs font-semibold text-white truncate">{alert.userName}</p>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: color + '20', color }}>
            {SEVERITY_LABELS[alert.severity] || alert.severity}
          </span>
        </div>
        <p className="text-xs text-white/60">{alert.message}</p>
        <p className="text-xs text-white/30 mt-0.5">
          Semaine du {new Date(alert.weekStart + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
        </p>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function OvertimeAlerts() {
  const { data: alerts = [], isLoading, refetch, isFetching } = useOvertimeAlerts()
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter,     setTypeFilter]     = useState('all')

  const filtered = alerts.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false
    if (typeFilter     !== 'all' && a.type     !== typeFilter)     return false
    return true
  })

  const criticalCount = alerts.filter(a => a.severity === CRITICALITY.CRITICAL).length
  const warningCount  = alerts.filter(a => a.severity === 'warning').length

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
            <AlertTriangle className="w-4 h-4 text-white"/>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Alertes proactives</h3>
            <p className="text-xs text-white/40">Heures supplémentaires et soumissions</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50
                     hover:text-white/70 border border-white/10 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`}/>
          Actualiser
        </button>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',         val: alerts.length,  color: '#A78BFA' },
          { label: 'Critiques',     val: criticalCount,  color: '#EF4444' },
          { label: 'Avertissements',val: warningCount,   color: '#F59E0B' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] px-4 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          {['all', CRITICALITY.CRITICAL, 'warning', 'info'].map(sev => (
            <button key={sev} onClick={() => setSeverityFilter(sev)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={severityFilter === sev ? {
                background: 'rgba(124,58,237,0.3)', color: '#C4B5FD'
              } : { color: 'rgba(255,255,255,0.35)' }}>
              {sev === 'all' ? 'Toutes' : SEVERITY_LABELS[sev]}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          {[
            { key: 'all',              label: 'Tous types' },
            { key: 'late_submission',  label: 'Retard' },
            { key: 'overtime_pending', label: 'HS en attente' },
            { key: 'overtime_high',    label: 'Volume élevé' },
          ].map(t => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={typeFilter === t.key ? {
                background: 'rgba(124,58,237,0.3)', color: '#C4B5FD'
              } : { color: 'rgba(255,255,255,0.35)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste alertes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          {alerts.length === 0
            ? <><CheckCircle className="w-10 h-10 text-green-500/40"/>
                <p className="text-sm text-white/50">Aucune alerte active</p>
                <p className="text-xs text-white/30">Tout est en ordre !</p></>
            : <><BellOff className="w-10 h-10 text-white/20"/>
                <p className="text-sm text-white/40">Aucune alerte pour ces filtres</p></>
          }
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert}/>
          ))}
        </div>
      )}
    </div>
  )
}
