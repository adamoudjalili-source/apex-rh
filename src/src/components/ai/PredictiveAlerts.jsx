// ============================================================
// APEX RH — src/components/ai/PredictiveAlerts.jsx
// Session 43 — Alertes RH prédictives calculées côté client
// Affiche les risques détectés dans l'équipe (départ, surcharge, désengagement)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, TrendingDown, Flame, Star, ChevronDown, RefreshCw } from 'lucide-react'
import { usePredictiveAlerts } from '../../hooks/useGenerativeAI'

const SEVERITY_CONFIG = {
  critical : { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  badge: 'CRITIQUE' },
  high     : { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', badge: 'ÉLEVÉ'   },
  medium   : { color: '#F97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.2)', badge: 'MOYEN'   },
  low      : { color: '#10B981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)', badge: 'INFO'    },
}

const TYPE_ICONS = {
  departure_risk : { icon: TrendingDown, label: 'Risque départ'      },
  overload       : { icon: Flame,        label: 'Surcharge'          },
  disengagement  : { icon: AlertTriangle,label: 'Désengagement'      },
  high_performer : { icon: Star,         label: 'Haute performance'  },
}

function AlertCard({ alert }) {
  const sev  = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium
  const type = TYPE_ICONS[alert.type] ?? { icon: AlertTriangle, label: alert.type }
  const Icon = type.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
      style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${sev.color}15` }}>
        <Icon size={13} style={{ color: sev.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-white/80">{alert.name}</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${sev.color}20`, color: sev.color }}>
            {type.label}
          </span>
        </div>
        <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{alert.message}</p>
      </div>
      <span className="text-xl flex-shrink-0 mt-0.5">{alert.icon}</span>
    </motion.div>
  )
}

export default function PredictiveAlerts({ serviceId }) {
  const [expanded, setExpanded] = useState(true)
  const { data: alerts = [], isLoading, refetch, isFetching } = usePredictiveAlerts(serviceId)

  const critical    = alerts.filter(a => a.severity === 'critical')
  const high        = alerts.filter(a => a.severity === 'high')
  const actionable  = alerts.filter(a => a.type !== 'high_performer')
  const positive    = alerts.filter(a => a.type === 'high_performer')

  if (!serviceId) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(245,158,11,0.15))' }}>
            <AlertTriangle size={14} className="text-orange-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Alertes Prédictives IA</p>
            <p className="text-[10px] text-white/30">
              {isLoading
                ? 'Analyse en cours…'
                : alerts.length === 0
                  ? 'Aucune alerte détectée'
                  : `${actionable.length} alerte${actionable.length > 1 ? 's' : ''}${positive.length > 0 ? ` · ${positive.length} performer${positive.length > 1 ? 's' : ''}` : ''}`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Badges compteurs */}
          {critical.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              {critical.length} critique{critical.length > 1 ? 's' : ''}
            </span>
          )}
          {high.length > 0 && critical.length === 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
              {high.length} élevé{high.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); refetch() }}
            disabled={isFetching}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-all disabled:opacity-40"
            title="Recalculer les alertes"
          >
            <RefreshCw size={11} className={`text-white/30 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <ChevronDown size={13} className={`text-white/25 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Contenu */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05] pt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-white/30">Analyse des données en cours…</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-xs text-white/35">Aucun signal d'alerte détecté dans votre équipe.</p>
                  <p className="text-[10px] text-white/20 mt-1">Données calculées sur les 30 derniers jours.</p>
                </div>
              ) : (
                <>
                  {/* Alertes actionnables */}
                  {actionable.length > 0 && (
                    <div className="space-y-2">
                      {actionable.map((alert, i) => (
                        <AlertCard key={`${alert.userId}_${alert.type}_${i}`} alert={alert} />
                      ))}
                    </div>
                  )}

                  {/* Séparateur si les deux types */}
                  {actionable.length > 0 && positive.length > 0 && (
                    <div className="border-t border-white/[0.05] pt-2" />
                  )}

                  {/* Haute performance */}
                  {positive.length > 0 && (
                    <div className="space-y-2">
                      {positive.map((alert, i) => (
                        <AlertCard key={`${alert.userId}_${alert.type}_pos_${i}`} alert={alert} />
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-white/15 pt-1">
                    Calculé automatiquement · PULSE + NITA · Mise à jour toutes les 30 min
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
