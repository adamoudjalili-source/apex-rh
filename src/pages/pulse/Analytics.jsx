// S69 — MANAGER_ROLES/isAdminRole remplacés par canManageTeam/canManageOrg
// ============================================================
// APEX RH — src/pages/pulse/Analytics.jsx
// Session 33 — Module Analytics Avancés & Prédictif
// 4 tableaux de bord : Heatmap, Corrélation PULSE/OKR,
//   Comparatif services, Score risque de départ
// Accès réservé aux managers et administrateurs
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
  useHeatmapData,
  usePulseOkrCorrelation,
  useServiceComparison,
  useDepartureRisk,
  useAnalyticsKpis,
  getLastNMonthKeys,
  monthKeyToLabel,
  heatmapColor,
  riskColor,
  riskLabel,
} from '../../hooks/useAnalytics'

// ─── Icônes SVG inline ────────────────────────────────────────
const IconGrid     = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
const IconScatter  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="19" r="1.5" fill="currentColor" /><circle cx="9" cy="13" r="1.5" fill="currentColor" /><circle cx="14" cy="8" r="1.5" fill="currentColor" /><circle cx="19" cy="4" r="1.5" fill="currentColor" /><circle cx="7" cy="16" r="1.5" fill="currentColor" /><circle cx="16" cy="11" r="1.5" fill="currentColor" /></svg>
const IconBar      = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
const IconAlert    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
const IconTrend    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
const IconUsers    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
const IconTarget   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /><circle cx="12" cy="12" r="5" strokeWidth={2} /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>

// ─── HELPERS LOCAUX ───────────────────────────────────────────

// isManagerRole and isDirectionRole moved to top-level imports — Étape 14+15

function scoreLabel(score) {
  if (score == null) return '—'
  if (score >= 75) return 'Excellent'
  if (score >= 60) return 'Bien'
  if (score >= 50) return 'Moyen'
  if (score >= 35) return 'Faible'
  return 'Insuffisant'
}

function pulseTextColor(score) {
  if (score == null) return 'text-gray-500'
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

// ─── COMPOSANT SKELETON ───────────────────────────────────────
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  )
}

// ─── COMPOSANT KPI CARD ───────────────────────────────────────
function KpiCard({ label, value, unit = '', icon: Icon, color = '#6366f1', loading = false }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: `${color}20`, color }}>
        {Icon && <Icon />}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {loading
          ? <Skeleton className="h-6 w-16 mt-1" />
          : <p className="text-xl font-bold text-white">{value ?? '—'}{unit && value != null ? <span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span> : ''}</p>
        }
      </div>
    </div>
  )
}

// ─── SECTION : HEATMAP ÉQUIPE ─────────────────────────────────
function HeatmapSection() {
  const [months, setMonths] = useState(6)
  const { data, isLoading, error } = useHeatmapData(months)

  if (error) return (
    <div className="text-red-400 text-sm p-4">Erreur lors du chargement de la heatmap.</div>
  )

  const users  = data?.users  || []
  const monthKeys = data?.months || getLastNMonthKeys(months)
  const scores = data?.scores || {}

  return (
    <div className="space-y-4">
      {/* Options */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Heatmap des scores PULSE</h3>
          <p className="text-xs text-gray-500 mt-0.5">Score PULSE mensuel moyen par collaborateur</p>
        </div>
        <div className="flex items-center gap-2">
          {[3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                months === m
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/3 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {m} mois
            </button>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Légende :</span>
        {[
          { label: '≥ 75 — Excellent', color: heatmapColor(80) },
          { label: '60–74 — Bien',    color: heatmapColor(65) },
          { label: '50–59 — Moyen',   color: heatmapColor(54) },
          { label: '35–49 — Faible',  color: heatmapColor(40) },
          { label: '< 35 — Insuffisant', color: heatmapColor(20) },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          <span>Pas de données</span>
        </div>
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6" />
          </svg>
          <p className="text-sm">Aucune donnée PULSE disponible pour cette période.</p>
          <p className="text-xs mt-1">Activez le module PULSE et attendez que les collaborateurs soumettent leurs journaux.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-gray-500 font-medium pr-4 py-2 w-40">Collaborateur</th>
                {monthKeys.map(k => (
                  <th key={k} className="text-center text-gray-500 font-medium px-1.5 py-2 min-w-[52px]">
                    {monthKeyToLabel(k)}
                  </th>
                ))}
                <th className="text-center text-gray-500 font-medium px-2 py-2">Moy.</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const userScores = scores[user.id] || {}
                const values = Object.values(userScores).filter(v => v !== null && v !== undefined)
                const avg = values.length > 0
                  ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
                  : null

                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group"
                  >
                    <td className="pr-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-[10px] flex-shrink-0">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white truncate">{user.first_name} {user.last_name}</p>
                          {user.services?.name && (
                            <p className="text-gray-600 truncate text-[10px]">{user.services.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {monthKeys.map(k => {
                      const s = userScores[k]
                      const bg = s != null ? heatmapColor(s, 0.85) : 'rgba(255,255,255,0.03)'
                      const border = s != null ? heatmapColor(s, 0.3) : 'rgba(255,255,255,0.06)'
                      return (
                        <td key={k} className="px-1.5 py-1.5 text-center">
                          <div
                            title={s != null ? `${s} — ${scoreLabel(s)}` : 'Aucune donnée'}
                            className="mx-auto w-10 h-8 rounded-md flex items-center justify-center font-semibold text-xs cursor-default transition-transform hover:scale-110"
                            style={{ backgroundColor: bg, border: `1px solid ${border}`, color: s != null ? '#fff' : '#4B5563' }}
                          >
                            {s != null ? s : '—'}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-center">
                      <span className={`font-bold ${pulseTextColor(avg)}`}>
                        {avg ?? '—'}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── SECTION : CORRÉLATION PULSE ↔ OKR ───────────────────────
function CorrelationSection() {
  const { data: points = [], isLoading, error } = usePulseOkrCorrelation()

  if (error) return (
    <div className="text-red-400 text-sm p-4">Erreur lors du chargement de la corrélation.</div>
  )

  const W = 520, H = 320
  const PAD = { top: 30, right: 30, bottom: 50, left: 55 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  // Filtrer les points avec les 2 valeurs
  const validPoints = points.filter(p => p.pulse !== null && p.okrProgress !== null)

  // Calcul de la régression linéaire simple
  let regrLine = null
  if (validPoints.length >= 3) {
    const n = validPoints.length
    const sumX = validPoints.reduce((s, p) => s + p.pulse, 0)
    const sumY = validPoints.reduce((s, p) => s + p.okrProgress, 0)
    const sumXY = validPoints.reduce((s, p) => s + p.pulse * p.okrProgress, 0)
    const sumX2 = validPoints.reduce((s, p) => s + p.pulse * p.pulse, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    const x1 = 0, x2 = 100
    const y1 = slope * x1 + intercept
    const y2 = slope * x2 + intercept

    const toSvgX = v => PAD.left + (v / 100) * iW
    const toSvgY = v => PAD.top + iH - (v / 100) * iH

    regrLine = {
      x1: toSvgX(x1), y1: toSvgY(Math.max(0, Math.min(100, y1))),
      x2: toSvgX(x2), y2: toSvgY(Math.max(0, Math.min(100, y2))),
    }
  }

  const toSvgX = v => PAD.left + (v / 100) * iW
  const toSvgY = v => PAD.top + iH - (v / 100) * iH

  const gridLines = [0, 25, 50, 75, 100]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Corrélation PULSE ↔ OKR</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Score PULSE moyen (3 mois) vs Progression OKR individuelle. Chaque point = un collaborateur.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : validPoints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <p className="text-sm">Pas assez de données pour afficher la corrélation.</p>
          <p className="text-xs mt-1">Il faut des scores PULSE ET des OKR individuels pour les mêmes collaborateurs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '320px' }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grille */}
            {gridLines.map(v => (
              <g key={v}>
                <line x1={PAD.left} y1={toSvgY(v)} x2={PAD.left + iW} y2={toSvgY(v)}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1={toSvgX(v)} y1={PAD.top} x2={toSvgX(v)} y2={PAD.top + iH}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={PAD.left - 6} y={toSvgY(v) + 4} textAnchor="end"
                      fill="#4B5563" fontSize="9">{v}</text>
                <text x={toSvgX(v)} y={PAD.top + iH + 14} textAnchor="middle"
                      fill="#4B5563" fontSize="9">{v}</text>
              </g>
            ))}

            {/* Axes labels */}
            <text x={PAD.left + iW / 2} y={H - 6} textAnchor="middle"
                  fill="#6B7280" fontSize="10">Score PULSE moyen (3 mois)</text>
            <text x={12} y={PAD.top + iH / 2} textAnchor="middle"
                  fill="#6B7280" fontSize="10"
                  transform={`rotate(-90, 12, ${PAD.top + iH / 2})`}>
              Progression OKR (%)
            </text>

            {/* Zones colorées */}
            {/* Top-right = High performer */}
            <rect x={toSvgX(60)} y={PAD.top} width={iW * 0.4} height={iH * 0.4}
                  fill="rgba(16,185,129,0.04)" />
            {/* Bottom-left = At risk */}
            <rect x={PAD.left} y={toSvgY(40)} width={iW * 0.4} height={iH * 0.4}
                  fill="rgba(239,68,68,0.04)" />

            {/* Ligne de régression */}
            {regrLine && (
              <line {...regrLine}
                    stroke="rgba(99,102,241,0.4)" strokeWidth="1.5"
                    strokeDasharray="4 3" />
            )}

            {/* Points */}
            {validPoints.map((p, i) => {
              const cx = toSvgX(p.pulse)
              const cy = toSvgY(p.okrProgress)
              const c = p.pulse >= 65 && p.okrProgress >= 60
                ? '#10B981'
                : p.pulse < 45 || p.okrProgress < 35
                ? '#EF4444'
                : '#6366f1'
              return (
                <g key={p.userId}>
                  <circle cx={cx} cy={cy} r="6" fill={c} fillOpacity="0.7"
                          stroke={c} strokeWidth="1.5" filter="url(#glow)" />
                  {/* Label on hover via title */}
                  <title>{p.name} ({p.service}){'\n'}PULSE: {p.pulse} | OKR: {p.okrProgress}%</title>
                </g>
              )
            })}

            {/* Labels quadrants */}
            <text x={toSvgX(85)} y={PAD.top + 16} textAnchor="middle"
                  fill="rgba(16,185,129,0.6)" fontSize="8">High Performer</text>
            <text x={toSvgX(15)} y={PAD.top + iH - 8} textAnchor="middle"
                  fill="rgba(239,68,68,0.5)" fontSize="8">À risque</text>
          </svg>
        </div>
      )}

      {/* Tableau récap */}
      {!isLoading && validPoints.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {[
            {
              label: 'High Performers',
              desc:  'PULSE ≥ 65 et OKR ≥ 60',
              color: '#10B981',
              count: validPoints.filter(p => p.pulse >= 65 && p.okrProgress >= 60).length,
            },
            {
              label: 'Potentiel inexploité',
              desc:  'OKR ≥ 60 mais PULSE < 60',
              color: '#F59E0B',
              count: validPoints.filter(p => p.pulse < 60 && p.okrProgress >= 60).length,
            },
            {
              label: 'À accompagner',
              desc:  'PULSE < 45 ou OKR < 35',
              color: '#EF4444',
              count: validPoints.filter(p => p.pulse < 45 || p.okrProgress < 35).length,
            },
          ].map(item => (
            <div key={item.label} className="bg-white/3 border border-white/8 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-white">{item.label}</span>
              </div>
              <p className="text-xs text-gray-600">{item.desc}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>
                {item.count}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SECTION : COMPARATIF SERVICES ───────────────────────────
function ServicesSection() {
  const { profile } = useAuth()
  const { data: services = [], isLoading, error } = useServiceComparison(3)

  if (error) return (
    <div className="text-red-400 text-sm p-4">Erreur lors du chargement du comparatif.</div>
  )

  const maxScore = Math.max(...services.map(s => s.avgScore || 0), 100)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Comparatif inter-services</h3>
        <p className="text-xs text-gray-500 mt-0.5">Score PULSE moyen des 3 derniers mois par service</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <p className="text-sm">Aucune donnée disponible pour la comparaison inter-services.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service, idx) => {
            const pct = service.avgScore != null ? (service.avgScore / maxScore) * 100 : 0
            const color = service.avgScore >= 70
              ? '#10B981'
              : service.avgScore >= 50
              ? '#F59E0B'
              : '#EF4444'

            return (
              <motion.div
                key={service.serviceId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group"
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white/60 bg-white/5 border border-white/10 flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{service.name}</span>
                      <span className="font-bold text-base flex-shrink-0" style={{ color }}>
                        {service.avgScore}
                      </span>
                    </div>
                    {service.division && (
                      <p className="text-xs text-gray-600">{service.division}</p>
                    )}
                  </div>
                </div>
                <div className="ml-9 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: idx * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color, opacity: 0.8 }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {service.activeUsers} {service.activeUsers === 1 ? 'actif' : 'actifs'}
                  </span>
                </div>
              </motion.div>
            )
          })}

          {/* Seuils de référence */}
          <div className="mt-4 pt-4 border-t border-white/6 flex items-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>≥ 70 — Excellent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>50–69 — Moyen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>&lt; 50 — Insuffisant</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SECTION : RISQUE DE DÉPART ───────────────────────────────
function DepartureRiskSection() {
  const [filter, setFilter] = useState('all')
  const { data: risks = [], isLoading, error } = useDepartureRisk()

  if (error) return (
    <div className="text-red-400 text-sm p-4">Erreur lors du calcul du risque de départ.</div>
  )

  const filtered = filter === 'all'
    ? risks
    : filter === 'high'
    ? risks.filter(r => r.riskScore >= 70)
    : filter === 'medium'
    ? risks.filter(r => r.riskScore >= 40 && r.riskScore < 70)
    : risks.filter(r => r.riskScore < 40)

  const highCount   = risks.filter(r => r.riskScore >= 70).length
  const medCount    = risks.filter(r => r.riskScore >= 40 && r.riskScore < 70).length
  const lowCount    = risks.filter(r => r.riskScore < 40).length

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-white">Score prédictif — Risque de départ</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Score 0–100 basé sur la tendance PULSE, l'engagement survey et la progression OKR
          </p>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all',    label: 'Tous',         count: risks.length },
            { id: 'high',   label: 'Risque élevé', count: highCount,  color: '#EF4444' },
            { id: 'medium', label: 'Modéré',        count: medCount,   color: '#F59E0B' },
            { id: 'low',    label: 'Faible',        count: lowCount,   color: '#10B981' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filter === f.id
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/3 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {f.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />}
              {f.label}
              <span className="ml-1 bg-white/10 rounded px-1">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Résumé risque en chiffres */}
      {!isLoading && risks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Risque élevé', count: highCount, color: '#EF4444', desc: 'Action immédiate recommandée' },
            { label: 'Risque modéré', count: medCount, color: '#F59E0B', desc: 'Surveillance renforcée' },
            { label: 'Faible risque', count: lowCount, color: '#10B981', desc: 'Situation saine' },
          ].map(item => (
            <div key={item.label}
                 className="bg-white/3 border border-white/8 rounded-xl p-3 text-center"
                 style={{ borderColor: `${item.color}20` }}>
              <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs text-white font-medium mt-0.5">{item.label}</p>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liste collaborateurs */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <p className="text-sm">
            {filter === 'all'
              ? 'Aucun collaborateur dans le scope visible.'
              : `Aucun collaborateur dans cette catégorie de risque.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((r, idx) => {
              const color = riskColor(r.riskScore)
              return (
                <motion.div
                  key={r.userId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white/3 border border-white/8 rounded-xl p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                         style={{ backgroundColor: `${color}20`, color }}>
                      {r.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-white">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.service}</p>
                        </div>
                        {/* Score risque */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs" style={{ color }}>{riskLabel(r.riskScore)}</span>
                            <div className="relative w-10 h-10">
                              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                                <circle cx="18" cy="18" r="14" fill="none"
                                        stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                                <circle cx="18" cy="18" r="14" fill="none"
                                        stroke={color} strokeWidth="4"
                                        strokeDasharray={`${(r.riskScore / 100) * 87.96} 87.96`}
                                        strokeLinecap="round" />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                                    style={{ color }}>
                                {r.riskScore}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Signaux détaillés */}
                      <div className="mt-2 flex items-center gap-4 flex-wrap">
                        {/* PULSE */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-600">PULSE</span>
                          <span className={r.pulseScore != null ? pulseTextColor(r.pulseScore) : 'text-gray-600'}>
                            {r.pulseScore != null ? r.pulseScore : '—'}
                          </span>
                          {r.declining && (
                            <span className="text-red-400 text-[10px] bg-red-500/10 px-1 py-0.5 rounded">
                              ↘ baisse
                            </span>
                          )}
                          {r.pulseTrend !== null && !r.declining && (
                            <span className={`text-[10px] ${r.pulseTrend >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {r.pulseTrend >= 0 ? `▲ +${r.pulseTrend}` : `▼ ${r.pulseTrend}`}
                            </span>
                          )}
                        </div>

                        {/* Survey */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-600">Engagement</span>
                          <span className={r.surveyScore != null ? (r.surveyScore >= 65 ? 'text-emerald-400' : r.surveyScore >= 45 ? 'text-amber-400' : 'text-red-400') : 'text-gray-600'}>
                            {r.surveyScore != null ? `${r.surveyScore}/100` : '—'}
                          </span>
                        </div>

                        {/* OKR */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-600">OKR</span>
                          <span className={r.okrProgress != null ? (r.okrProgress >= 60 ? 'text-emerald-400' : r.okrProgress >= 35 ? 'text-amber-400' : 'text-red-400') : 'text-gray-600'}>
                            {r.okrProgress != null ? `${r.okrProgress}%` : '—'}
                          </span>
                          {r.okrTotal > 0 && (
                            <span className="text-gray-600">({r.okrTotal} obj.)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Disclaimer */}
      {risks.length > 0 && (
        <p className="text-xs text-gray-700 mt-2 italic">
          ⚠️ Ce score est indicatif et basé sur des données objectives de performance.
          Il doit être complété par un entretien individuel avant toute action managériale.
        </p>
      )}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
const TABS = [
  { id: 'heatmap',     label: 'Heatmap équipe',      Icon: IconGrid,    desc: 'Scores mensuels',      forAll: true },
  { id: 'correlation', label: 'Corrélation PULSE/OKR', Icon: IconScatter, desc: 'Scatter plot',         forAll: true },
  { id: 'services',    label: 'Comparatif services',  Icon: IconBar,     desc: 'Inter-services',       forAll: false },
  { id: 'risk',        label: 'Risque de départ',     Icon: IconAlert,   desc: 'Score prédictif',      forAll: true },
]

export default function Analytics() {
  const { profile, canManageTeam, canManageOrg } = useAuth()
  const [activeTab, setActiveTab] = useState('heatmap')
  const { data: kpis, isLoading: kpisLoading } = useAnalyticsKpis()

  const isManager   = canManageTeam
  const isDirection = canManageOrg  // administrateur + directeur + super_admin

  // Accès interdit aux collaborateurs
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600">
        <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm font-medium">Accès réservé aux managers et administrateurs.</p>
        <p className="text-xs mt-1">Ce module est disponible à partir du rôle Chef de Service.</p>
      </div>
    )
  }

  const visibleTabs = TABS.filter(t => t.forAll || isDirection)

  return (
    <div className="space-y-5">

      {/* ── Bandeau KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Score PULSE moyen (ce mois)"
          value={kpis?.avgPulse}
          icon={IconTrend}
          color="#6366f1"
          loading={kpisLoading}
        />
        <KpiCard
          label="Progression OKR moyenne"
          value={kpis?.avgOkr}
          unit="%"
          icon={IconTarget}
          color="#8B5CF6"
          loading={kpisLoading}
        />
        <KpiCard
          label="Score engagement survey"
          value={kpis?.avgSurvey}
          unit="/100"
          icon={IconUsers}
          color="#06B6D4"
          loading={kpisLoading}
        />
        <KpiCard
          label="Collaborateurs PULSE actifs"
          value={kpis?.pulseUsersCount}
          icon={IconGrid}
          color="#10B981"
          loading={kpisLoading}
        />
      </div>

      {/* ── Onglets ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white/3 border border-white/8 rounded-xl p-1 overflow-x-auto">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <tab.Icon />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ── Contenu ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="bg-white/3 border border-white/8 rounded-xl p-5"
        >
          {activeTab === 'heatmap'     && <HeatmapSection />}
          {activeTab === 'correlation' && <CorrelationSection />}
          {activeTab === 'services'    && (isDirection ? <ServicesSection /> : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <p className="text-sm">Disponible pour les Directeurs et Administrateurs.</p>
            </div>
          ))}
          {activeTab === 'risk'        && <DepartureRiskSection />}
        </motion.div>
      </AnimatePresence>

    </div>
  )
}
