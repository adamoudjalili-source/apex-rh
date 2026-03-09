// ============================================================
// APEX RH — src/components/behavioral/BehavioralAlerts.jsx
// Session 54 — Alertes comportementales (vue manager)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle, Clock, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'
import {
  useBehavioralAlerts,
  useAcknowledgeAlert,
  useMarkAlertRead,
  useRefreshBehavioralScores,
  ALERT_TYPE_CONFIG,
  RISK_CONFIG,
} from '../../hooks/useBehavioralIntelligence'
import { usePermission } from '../../hooks/usePermission'
import { CRITICALITY } from '../../utils/constants'

const SEVERITY_CONFIG = {
  info:     { label: 'Info',    color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  medium:   { label: 'Modéré', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  high:     { label: 'Élevé',  color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  critical: { label: 'Critique', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

function AlertItem({ alert, onAcknowledge, onRead }) {
  const [expanded, setExpanded] = useState(false)
  const typeCfg = ALERT_TYPE_CONFIG[alert.alert_type] || ALERT_TYPE_CONFIG.attrition_risk
  const sevCfg  = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium
  const user    = alert.user

  const timeAgo = (() => {
    const diff = (Date.now() - new Date(alert.created_at)) / 1000
    if (diff < 3600) return `${Math.round(diff / 60)}m`
    if (diff < 86400) return `${Math.round(diff / 3600)}h`
    return `${Math.round(diff / 86400)}j`
  })()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: alert.is_read ? 'rgba(255,255,255,0.02)' : `${sevCfg.bg}`,
        border: `1px solid ${alert.is_read ? 'rgba(255,255,255,0.06)' : sevCfg.color + '40'}`,
      }}
      onClick={() => {
        setExpanded(v => !v)
        if (!alert.is_read) onRead(alert.id)
      }}
    >
      <div className="flex items-start gap-3 p-3 cursor-pointer">
        {/* Icône type */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
          style={{ background: typeCfg.bg }}
        >
          {typeCfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {!alert.is_read && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 align-middle"
                  style={{ background: sevCfg.color }}
                />
              )}
              <span className="text-sm font-semibold text-white">{alert.title}</span>
            </div>
            <span className="text-[10px] text-white/30 flex-shrink-0 mt-0.5 flex items-center gap-0.5">
              <Clock size={9} />
              {timeAgo}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {user && (
              <span className="text-xs text-white/50">
                {user.first_name} {user.last_name}
                {user.divisions?.name && ` · ${user.divisions.name}`}
              </span>
            )}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${sevCfg.color}20`, color: sevCfg.color }}
            >
              {sevCfg.label}
            </span>
            {alert.risk_score && (
              <span className="text-[10px] text-white/30">
                Score : {Math.round(alert.risk_score)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={14}
          className={`text-white/30 flex-shrink-0 transition-transform mt-1 ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 pt-1 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {alert.message && (
                <p className="text-xs text-white/50 mb-3">{alert.message}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id) }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <CheckCircle size={12} />
                  Acquitter
                </button>
                <p className="text-[10px] text-white/25">
                  L'alerte disparaîtra de la liste après acquittement
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function BehavioralAlerts({ compact = false }) {
  const { can } = usePermission()
  const isAdmin = can('intelligence', 'succession', 'admin')
  const isDirecteur = can('intelligence', 'overview', 'read')
  const [filter, setFilter] = useState('all')
  const { data: alerts = [], isLoading, refetch } = useBehavioralAlerts({
    severity: filter !== 'all' ? filter : undefined,
  })
  const acknowledge = useAcknowledgeAlert()
  const markRead    = useMarkAlertRead()
  const refresh     = useRefreshBehavioralScores()

  const filtered = filter === 'unread'
    ? alerts.filter(a => !a.is_read)
    : alerts

  const unreadCount = alerts.filter(a => !a.is_read).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-white">
              Alertes comportementales
            </h3>
            {unreadCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}
              >
                {unreadCount} nouvelles
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {[
          { id: 'all',      label: 'Toutes' },
          { id: 'unread',   label: 'Non lues' },
          { id: CRITICALITY.CRITICAL, label: 'Critique' },
          { id: 'high',     label: 'Élevé' },
          { id: 'medium',   label: 'Modéré' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
              filter === f.id
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste alertes */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle size={32} className="mx-auto mb-3 text-green-400/40" />
          <p className="text-sm text-white/40">Aucune alerte active</p>
          <p className="text-xs text-white/25 mt-1">Votre équipe est au vert !</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered
              .slice(0, compact ? 5 : undefined)
              .map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => acknowledge.mutate(id)}
                  onRead={(id) => markRead.mutate(id)}
                />
              ))}
          </AnimatePresence>
        </div>
      )}

      {compact && filtered.length > 5 && (
        <p className="text-xs text-center text-white/30">
          + {filtered.length - 5} autres alertes — voir l'onglet Alertes
        </p>
      )}

      {/* Info recalcul */}
      {(isAdmin || isDirecteur) && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/30">
            Les scores sont recalculés automatiquement chaque dimanche à 02h00. 
            Cliquez sur « Actualiser » pour un recalcul immédiat.
          </p>
        </div>
      )}
    </div>
  )
}
