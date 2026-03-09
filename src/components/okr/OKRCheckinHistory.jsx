// ============================================================
// APEX RH — OKRCheckinHistory.jsx
// Session 78 — Historique des check-ins + sparkline SVG
// ============================================================
import { useMemo } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Minus, User, MessageSquare } from 'lucide-react'
import { useOKRCheckins } from '../../hooks/useOkrCycles'

const CONFIDENCE_CONFIG = {
  high:    { icon: TrendingUp,   color: 'text-green-400',  label: 'Confiant' },
  medium:  { icon: Minus,        color: 'text-amber-400',  label: 'Modéré' },
  low:     { icon: TrendingDown, color: 'text-orange-400', label: 'Incertain' },
  at_risk: { icon: AlertTriangle, color: 'text-rose-400',  label: 'En risque' },
}

function Sparkline({ data, width = 200, height = 40 }) {
  if (!data || data.length < 2) return null

  const values = data.map(d => d.progress_value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 100)
  const range = max - min || 1

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  })

  const lastVal = values[values.length - 1]
  const lastX = width
  const lastY = height - ((lastVal - min) / range) * height

  const areaPath = `M${pts.join('L')} L${width},${height} L0,${height} Z`
  const linePath = `M${pts.join('L')}`

  const lineColor = lastVal >= 70 ? '#22c55e' : lastVal >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={lineColor} />
    </svg>
  )
}

export default function OKRCheckinHistory({ keyResult }) {
  const { data: checkins = [], isLoading } = useOKRCheckins(keyResult?.id)

  const chronological = useMemo(() =>
    [...checkins].sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at)),
    [checkins]
  )

  const latest = checkins[0]
  const trend = chronological.length >= 2
    ? chronological[chronological.length - 1].progress_value - chronological[chronological.length - 2].progress_value
    : null

  if (isLoading) return (
    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      Chargement…
    </div>
  )

  if (checkins.length === 0) return (
    <div className="text-center py-6 text-gray-500">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Aucun check-in pour ce KR</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Résumé + sparkline */}
      <div className="bg-gray-900 rounded-xl p-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-white">{Math.round(latest?.progress_value ?? 0)}%</span>
            {trend !== null && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                trend > 0 ? 'text-green-400 bg-green-900/30' : trend < 0 ? 'text-rose-400 bg-rose-900/30' : 'text-gray-400 bg-gray-800'
              }`}>
                {trend > 0 ? '+' : ''}{Math.round(trend)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{checkins.length} check-in{checkins.length > 1 ? 's' : ''}</p>
          {latest && (
            <p className="text-xs text-gray-500 mt-0.5">
              Dernier : {new Date(latest.checked_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <Sparkline data={chronological} />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {checkins.map((checkin, idx) => {
          const conf = CONFIDENCE_CONFIG[checkin.confidence] || CONFIDENCE_CONFIG.medium
          const ConfIcon = conf.icon
          const prev = checkins[idx + 1]
          const delta = prev ? checkin.progress_value - prev.progress_value : null

          return (
            <div key={checkin.id} className="flex gap-3">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
                {idx < checkins.length - 1 && <div className="w-px flex-1 bg-gray-800 mt-1" />}
              </div>

              <div className="flex-1 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">
                      {Math.round(checkin.progress_value)}%
                    </span>
                    {delta !== null && (
                      <span className={`text-xs font-medium ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                        {delta > 0 ? '↑' : delta < 0 ? '↓' : '='} {Math.abs(Math.round(delta))}%
                      </span>
                    )}
                    <div className={`flex items-center gap-1 text-xs ${conf.color}`}>
                      <ConfIcon className="w-3 h-3" />
                      <span>{conf.label}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(checkin.checked_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {checkin.user && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    {checkin.user.first_name} {checkin.user.last_name}
                  </div>
                )}

                {checkin.note && (
                  <div className="mt-2 bg-gray-800/60 rounded-lg px-3 py-2 text-sm text-gray-300">
                    {checkin.note}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
