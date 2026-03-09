// ============================================================
// APEX RH — Pilotage.jsx · S117
// Batch 3 — Hub métier — Pilotage stratégique pour directeur
// Onglets via useSearchParams(?tab=scorecard|okr|tendances|roi)
// StatCard KPIs · GLASS_STYLE · RAG · Max 400 lignes
// ============================================================
import { useSearchParams }    from 'react-router-dom'
import { motion }             from 'framer-motion'
import {
  Gauge, Target, TrendingUp, BarChart3,
  Lock, Activity, AlertTriangle, CheckCircle,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE, ROLES,
} from '../../utils/constants'
import StatCard   from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'

import { useAuth }       from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { ADMIN_ROLES }   from '../../lib/roles'
import {
  useDirectionScorecard,
  useDirectionTrend12m,
  useDirectionOKR,
  useDirectionROI,
  ragStatus,
  RAG_COLORS,
  KPI_THRESHOLDS,
} from '../../hooks/useDashboardDirection'
import { monthKeyToLabel } from '../../hooks/useAnalytics'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'scorecard', label: 'Scorecard', icon: Gauge,      color: '#6366F1' },
  { id: 'okr',       label: 'OKR',       icon: Target,     color: '#10B981' },
  { id: 'tendances', label: 'Tendances', icon: TrendingUp,  color: '#3B82F6' },
  { id: 'roi',       label: 'ROI RH',    icon: BarChart3,   color: '#F59E0B' },
]
const DEFAULT_TAB = 'scorecard'

// ─── PANEL SCORECARD ─────────────────────────────────────────
function ScorecardPanel() {
  const { data: sc = {}, isLoading } = useDirectionScorecard()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const kpis = [
    { label: 'Score PULSE moyen', value: sc.avg_pulse,      suffix: '%', threshold: KPI_THRESHOLDS.pulse },
    { label: 'Score NITA moyen',  value: sc.avg_nita,       suffix: '%', threshold: KPI_THRESHOLDS.nita },
    { label: 'Progression OKR',   value: sc.avg_okr,        suffix: '%', threshold: KPI_THRESHOLDS.okr_progress },
    { label: 'Taux activité',     value: sc.taux_activite,  suffix: '%', threshold: KPI_THRESHOLDS.taux_activite },
    { label: 'Taux F360',         value: sc.f360_rate,      suffix: '%', threshold: KPI_THRESHOLDS.f360_rate },
  ]

  if (kpis.every(k => k.value === null || k.value === undefined)) {
    return <EmptyState icon={Gauge} title="Données indisponibles" description="Les KPIs de scorecard ne sont pas encore disponibles." />
  }

  return (
    <div className="space-y-2">
      {kpis.map(kpi => {
        const rag = ragStatus(kpi.value, kpi.threshold)
        const colors = RAG_COLORS[rag]
        return (
          <div
            key={kpi.label}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: colors.dot }}
            />
            <span className="text-sm text-white/70 flex-1">{kpi.label}</span>
            <span className="text-sm font-bold" style={{ color: colors.text }}>
              {kpi.value !== null && kpi.value !== undefined ? `${kpi.value}${kpi.suffix}` : '—'}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${colors.dot}20`, color: colors.text }}
            >
              {colors.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL OKR STRATÉGIQUES ───────────────────────────────────
function OKRPanel() {
  const { data: okrs = [], isLoading } = useDirectionOKR()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (okrs.length === 0) return <EmptyState icon={Target} title="Aucun OKR stratégique" description="Aucun objectif stratégique actif." />

  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-4 py-2.5 flex items-center justify-between" style={GLASS_STYLE_SUBTLE}>
        <span className="text-[11px] text-white/40">Objectifs stratégiques</span>
        <span className="text-[10px] text-indigo-400">{okrs.length} objectif{okrs.length > 1 ? 's' : ''}</span>
      </div>
      {okrs.map(obj => {
        const progress = obj.progress_score ?? obj.avg_progress ?? 0
        const c = progress >= 75 ? '#10B981' : progress >= 45 ? '#F59E0B' : '#EF4444'
        return (
          <div key={obj.id ?? obj.objective_id} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-white/80 leading-snug">{obj.title}</p>
              <span className="text-xs font-black flex-shrink-0" style={{ color: c }}>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(progress)}%`, background: c }} />
            </div>
            {obj.status && (
              <p className="text-[10px] text-white/25 capitalize">{obj.status}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL TENDANCES 12 MOIS ──────────────────────────────────
function TendancesPanel() {
  const { data: trends = [], isLoading } = useDirectionTrend12m()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (trends.length === 0) return <EmptyState icon={TrendingUp} title="Aucune tendance" description="Les données de tendance ne sont pas encore disponibles." />

  const last6 = trends.slice(-6)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={GLASS_STYLE_STRONG}>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          Évolution 6 derniers mois
        </p>
        <div className="space-y-3">
          {last6.map(row => {
            const pulse = row.avg_pulse ?? null
            const okr   = row.avg_okr ?? null
            const label = monthKeyToLabel(row.month_key)
            const c     = pulse !== null ? (pulse >= 70 ? '#10B981' : pulse >= 50 ? '#F59E0B' : '#EF4444') : '#6B7280'
            return (
              <div key={row.month_key} className="flex items-center gap-3">
                <span className="text-[10px] text-white/30 w-8 flex-shrink-0">{label}</span>
                <div className="flex-1 space-y-1">
                  {pulse !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/25 w-10">PULSE</span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pulse}%`, background: c }} />
                      </div>
                      <span className="text-[10px] font-bold w-7 text-right" style={{ color: c }}>{pulse}%</span>
                    </div>
                  )}
                  {okr !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/25 w-10">OKR</span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${okr}%`, background: '#6366F1' }} />
                      </div>
                      <span className="text-[10px] font-bold w-7 text-right" style={{ color: '#818CF8' }}>{okr}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── PANEL ROI RH ─────────────────────────────────────────────
function ROIPanel() {
  const { data: roi = {}, isLoading } = useDirectionROI()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const kpis = [
    { label: 'Agents actifs',        value: roi.totalAgents,            suffix: '',  icon: Activity,      color: '#6366F1' },
    { label: 'Couverture PULSE',     value: roi.tauxCouverturePulse,    suffix: '%', icon: Gauge,         color: '#3B82F6' },
    { label: 'OKR taux completion',  value: roi.okrCompletionRate,      suffix: '%', icon: CheckCircle,   color: '#10B981' },
    { label: 'OKR progression moy.', value: roi.okrAvgProgress,        suffix: '%', icon: Target,        color: '#10B981' },
    { label: 'Taux F360',            value: roi.f360Rate,               suffix: '%', icon: Activity,      color: '#8B5CF6' },
    { label: 'Plans dev. complétés', value: roi.pdiRate,                suffix: '%', icon: TrendingUp,    color: '#F59E0B' },
  ]

  return (
    <div className="space-y-2">
      {kpis.map(kpi => {
        const Icon = kpi.icon
        return (
          <div key={kpi.label} className="rounded-2xl p-4 flex items-center gap-3" style={GLASS_STYLE}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${kpi.color}18` }}
            >
              <Icon size={15} style={{ color: kpi.color }} />
            </div>
            <span className="text-sm text-white/70 flex-1">{kpi.label}</span>
            <span className="text-sm font-black" style={{ color: kpi.color }}>
              {kpi.value !== null && kpi.value !== undefined ? `${kpi.value}${kpi.suffix}` : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── HOOK KPIs ────────────────────────────────────────────────
function usePilotageStats() {
  const { data: sc  = {} }    = useDirectionScorecard()
  const { data: okrs = [] }   = useDirectionOKR()
  const { data: roi = {} }    = useDirectionROI()

  const validatedOkrs = okrs.filter(o => o.status === 'valide').length
  const avgPulse      = sc.avg_pulse ?? null
  const totalAgents   = roi.totalAgents ?? null

  return { avgPulse, validatedOkrs, okrTotal: okrs.length, totalAgents }
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function Pilotage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile } = useAuth()
  const { can }     = usePermission()

  const isDirecteur = ADMIN_ROLES.includes(profile?.role)

  const { avgPulse, validatedOkrs, okrTotal, totalAgents } = usePilotageStats()

  if (!isDirecteur && !can('intelligence', 'read')) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={GLASS_STYLE}>
            <Lock size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">Accès réservé à la direction</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Pilotage</h1>
        <p className="text-sm text-white/40">
          Vue stratégique organisation · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Activity}   label="Score PULSE"    value={avgPulse !== null ? `${avgPulse}%` : '—'}  color="#6366F1" />
        <StatCard icon={Target}     label="OKR validés"    value={okrTotal > 0 ? `${validatedOkrs}/${okrTotal}` : '—'} color="#10B981" />
        <StatCard icon={BarChart3}  label="Effectif total" value={totalAgents ?? '—'}                         color="#3B82F6" />
      </div>

      <div className="flex gap-1 p-1 rounded-2xl" style={GLASS_STYLE_SUBTLE}>
        {TABS.map(tab => {
          const active = tab.id === activeTab
          const Icon   = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200"
              style={active
                ? { background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}30` }
                : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
              }
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {activeTab === 'scorecard' && <ScorecardPanel />}
        {activeTab === 'okr'       && <OKRPanel />}
        {activeTab === 'tendances' && <TendancesPanel />}
        {activeTab === 'roi'       && <ROIPanel />}
      </motion.div>
    </div>
  )
}
