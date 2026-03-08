// ============================================================
// APEX RH — PulseAnalytics.jsx
// Session 101 — Phase C RBAC : nouveau composant natif usePermission V2
// Analytics PULSE — Heatmap équipe + KPIs + Risque de départ
// Guard : can('pulse', 'analytics', 'read') — managers+
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, BarChart2, TrendingUp, Users, AlertTriangle, Grid } from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import {
  useHeatmapData,
  useAnalyticsKpis,
  useDepartureRisk,
  useServiceComparison,
  getLastNMonthKeys,
  monthKeyToLabel,
  heatmapColor,
  riskColor,
  riskLabel,
} from '../../hooks/useAnalytics'

// ─── Access Denied ────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={20} className="text-rose-400" />
      </div>
      <p className="text-white/40 text-sm text-center max-w-xs">
        Accès réservé aux managers et administrateurs
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, unit = '', color = '#6366f1', icon: Icon, loading }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20`, color }}>
        {Icon && <Icon size={16} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {loading
          ? <Skeleton className="h-6 w-16 mt-1" />
          : <p className="text-xl font-bold text-white">
              {value ?? '—'}
              {unit && value != null ? <span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span> : ''}
            </p>
        }
      </div>
    </div>
  )
}

// ─── Score color helper ───────────────────────────────────────
function pulseTextColor(score) {
  if (score == null) return 'text-gray-500'
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

// ─── Heatmap Section ─────────────────────────────────────────
function HeatmapSection() {
  const [months, setMonths] = useState(6)
  const { data, isLoading } = useHeatmapData(months)

  const users     = data?.users  || []
  const monthKeys = data?.months || getLastNMonthKeys(months)
  const scores    = data?.scores || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Heatmap PULSE équipe</h3>
          <p className="text-xs text-gray-500 mt-0.5">Score mensuel moyen par collaborateur</p>
        </div>
        <div className="flex items-center gap-2">
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                months === m
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/3 border-white/10 text-gray-400 hover:text-white'
              }`}>
              {m} mois
            </button>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        {[
          { label: '≥75 Excellent', v: 80 },
          { label: '60–74 Bien',    v: 65 },
          { label: '50–59 Moyen',   v: 54 },
          { label: '<50 Faible',    v: 40 },
        ].map(({ label, v }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatmapColor(v) }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          <span>N/D</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-600">
          <p className="text-sm">Aucune donnée PULSE disponible pour cette période.</p>
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
                const values = Object.values(userScores).filter(v => v != null)
                const avg = values.length
                  ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
                  : null
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <td className="pr-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-[10px] flex-shrink-0">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <p className="text-white truncate">{user.first_name} {user.last_name}</p>
                      </div>
                    </td>
                    {monthKeys.map(k => {
                      const s = userScores[k]
                      return (
                        <td key={k} className="px-1.5 py-1.5 text-center">
                          <div
                            className="mx-auto w-10 h-8 rounded-md flex items-center justify-center font-semibold text-xs"
                            style={{
                              backgroundColor: s != null ? heatmapColor(s, 0.85) : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${s != null ? heatmapColor(s, 0.3) : 'rgba(255,255,255,0.06)'}`,
                              color: s != null ? '#fff' : '#4B5563',
                            }}
                          >
                            {s != null ? s : '—'}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-center">
                      <span className={`font-bold ${pulseTextColor(avg)}`}>{avg ?? '—'}</span>
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

// ─── Risque de départ Section ─────────────────────────────────
function DepartureRiskSection() {
  const { data: risks = [], isLoading } = useDepartureRisk()

  const highCount = risks.filter(r => r.riskScore >= 70).length
  const medCount  = risks.filter(r => r.riskScore >= 40 && r.riskScore < 70).length
  const lowCount  = risks.filter(r => r.riskScore < 40).length

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Score prédictif — Risque de départ</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Score 0–100 basé sur tendance PULSE, engagement survey et progression OKR
        </p>
      </div>

      {!isLoading && risks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Risque élevé',  count: highCount, color: '#EF4444' },
            { label: 'Risque modéré', count: medCount,  color: '#F59E0B' },
            { label: 'Faible risque', count: lowCount,  color: '#10B981' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center border"
              style={{ borderColor: `${item.color}20`, background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs text-white font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-600">
          <p className="text-sm">Aucun collaborateur dans le scope.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {risks.map((r, idx) => {
              const color = riskColor(r.riskScore)
              return (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white/3 border border-white/8 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: `${color}20`, color }}>
                      {r.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.service}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color }}>{riskLabel(r.riskScore)}</span>
                          <span className="text-lg font-black" style={{ color }}>{r.riskScore}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs flex-wrap">
                        <span className="text-gray-600">PULSE <span className={pulseTextColor(r.pulseScore)}>{r.pulseScore ?? '—'}</span></span>
                        <span className="text-gray-600">Engagement <span className={r.surveyScore != null ? (r.surveyScore >= 65 ? 'text-emerald-400' : r.surveyScore >= 45 ? 'text-amber-400' : 'text-red-400') : 'text-gray-600'}>{r.surveyScore != null ? `${r.surveyScore}/100` : '—'}</span></span>
                        <span className="text-gray-600">OKR <span className={r.okrProgress != null ? (r.okrProgress >= 60 ? 'text-emerald-400' : r.okrProgress >= 35 ? 'text-amber-400' : 'text-red-400') : 'text-gray-600'}>{r.okrProgress != null ? `${r.okrProgress}%` : '—'}</span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
const TABS = [
  { id: 'heatmap', label: 'Heatmap',       Icon: Grid,          forOrg: false },
  { id: 'risk',    label: 'Risque départ',  Icon: AlertTriangle, forOrg: false },
]

export default function PulseAnalytics() {
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState('heatmap')
  const { data: kpis, isLoading: kpisLoading } = useAnalyticsKpis()

  // Guard RBAC
  if (!can('pulse', 'analytics', 'read')) return <AccessDenied />

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Score PULSE moyen"       value={kpis?.avgPulse}        color="#6366f1" icon={TrendingUp}  loading={kpisLoading} />
        <KpiCard label="Progression OKR moy."    value={kpis?.avgOkr}   unit="%" color="#8B5CF6" icon={BarChart2}  loading={kpisLoading} />
        <KpiCard label="Score engagement survey" value={kpis?.avgSurvey} unit="/100" color="#06B6D4" icon={Users} loading={kpisLoading} />
        <KpiCard label="Utilisateurs PULSE actifs" value={kpis?.pulseUsersCount} color="#10B981" icon={Grid} loading={kpisLoading} />
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 bg-white/3 border border-white/8 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <tab.Icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="bg-white/3 border border-white/8 rounded-xl p-5"
        >
          {activeTab === 'heatmap' && <HeatmapSection />}
          {activeTab === 'risk'    && <DepartureRiskSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
