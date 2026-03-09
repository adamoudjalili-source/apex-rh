// ============================================================
// APEX RH — AnalyticsHub.jsx · S117
// Batch 3 — Hub métier — Analytics RH pour admin + directeur
// Onglets via useSearchParams(?tab=kpis|services|risques|heatmap)
// StatCard KPIs · GLASS_STYLE · Max 400 lignes
// ============================================================
import { useSearchParams }   from 'react-router-dom'
import { motion }            from 'framer-motion'
import {
  BarChart3, LayoutGrid, AlertTriangle, Activity,
  Lock, TrendingUp, Users, Zap,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE,
} from '../../utils/constants'
import StatCard   from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'

import { useAuth }       from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { MANAGER_ROLES } from '../../lib/roles'
import {
  useAnalyticsKpis,
  useServiceComparison,
  useDepartureRisk,
  useHeatmapData,
  riskColor,
  riskLabel,
  heatmapColor,
  monthKeyToLabel,
} from '../../hooks/useAnalytics'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'kpis',     label: 'KPIs',       icon: BarChart3,      color: '#6366F1' },
  { id: 'services', label: 'Services',   icon: LayoutGrid,     color: '#3B82F6' },
  { id: 'risques',  label: 'Risques',    icon: AlertTriangle,  color: '#EF4444' },
  { id: 'heatmap',  label: 'Heatmap',    icon: Activity,       color: '#F59E0B' },
]
const DEFAULT_TAB = 'kpis'

// ─── PANEL KPIs ───────────────────────────────────────────────
function KPIsPanel() {
  const { data: kpis = {}, isLoading } = useAnalyticsKpis()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const items = [
    { label: 'Score PULSE moyen', value: kpis.avgPulse,         suffix: '%', color: '#6366F1' },
    { label: 'Progression OKR',   value: kpis.avgOkr,           suffix: '%', color: '#10B981' },
    { label: 'Engagement survey', value: kpis.avgSurvey,        suffix: '%', color: '#8B5CF6' },
    { label: 'Agents PULSE',      value: kpis.pulseUsersCount,  suffix: '',  color: '#3B82F6' },
    { label: 'Objectifs actifs',  value: kpis.okrObjectivesCount, suffix: '', color: '#F59E0B' },
  ]

  if (items.every(i => i.value === null || i.value === undefined)) {
    return <EmptyState icon={BarChart3} title="Données indisponibles" description="Les indicateurs ne sont pas encore calculés." />
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const hasValue = item.value !== null && item.value !== undefined
        return (
          <div key={item.label} className="rounded-2xl p-4 flex items-center gap-3" style={GLASS_STYLE}>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: item.color }}
            />
            <span className="text-sm text-white/70 flex-1">{item.label}</span>
            <span className="text-sm font-black" style={{ color: hasValue ? item.color : '#4B5563' }}>
              {hasValue ? `${item.value}${item.suffix}` : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL SERVICES ───────────────────────────────────────────
function ServicesPanel() {
  const { data: services = [], isLoading } = useServiceComparison()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (services.length === 0) return <EmptyState icon={LayoutGrid} title="Aucun service" description="Aucune donnée PULSE par service disponible." />

  return (
    <div className="space-y-2">
      <div className="rounded-2xl px-4 py-2.5 flex items-center justify-between" style={GLASS_STYLE_SUBTLE}>
        <span className="text-[11px] text-white/40">Classement PULSE par service</span>
        <span className="text-[10px] text-indigo-400">{services.length} service{services.length > 1 ? 's' : ''}</span>
      </div>
      {services.map((svc, idx) => {
        const c = heatmapColor(svc.avgScore)
        return (
          <div key={svc.serviceId} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-white/25 w-5 text-right flex-shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">{svc.name}</p>
                <p className="text-[10px] text-white/30">{svc.division} · {svc.activeUsers} agents</p>
              </div>
              <div className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full" style={{ width: `${svc.avgScore ?? 0}%`, background: c }} />
              </div>
              <span className="text-xs font-black w-9 text-right flex-shrink-0" style={{ color: c }}>
                {svc.avgScore ?? '—'}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL RISQUES ────────────────────────────────────────────
function RisquesPanel() {
  const { data: risks = [], isLoading } = useDepartureRisk()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />

  const elevated = risks.filter(r => r.riskScore >= 40)
  if (elevated.length === 0) return (
    <EmptyState icon={AlertTriangle} title="Aucun risque détecté" description="Aucun collaborateur ne présente de risque de départ significatif." />
  )

  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-4 py-2.5 flex items-center justify-between" style={GLASS_STYLE_SUBTLE}>
        <span className="text-[11px] text-white/40">Risques de départ identifiés</span>
        <span className="text-[10px]" style={{ color: elevated.some(r => r.riskScore >= 70) ? '#EF4444' : '#F59E0B' }}>
          {elevated.length} profil{elevated.length > 1 ? 's' : ''}
        </span>
      </div>
      {elevated.slice(0, 15).map(r => {
        const c    = riskColor(r.riskScore)
        const lbl  = riskLabel(r.riskScore)
        return (
          <div key={r.userId} className="rounded-2xl p-4" style={GLASS_STYLE}>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                style={{ background: `${c}20` }}
              >
                {r.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">{r.name}</p>
                <p className="text-[10px] text-white/30">{r.service}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black" style={{ color: c }}>{r.riskScore}</p>
                <p className="text-[9px]" style={{ color: c }}>{lbl}</p>
              </div>
            </div>
            <div className="mt-2 flex gap-3">
              {r.pulseScore !== null && (
                <span className="text-[10px] text-white/25">
                  PULSE <span style={{ color: heatmapColor(r.pulseScore) }}>{r.pulseScore}%</span>
                </span>
              )}
              {r.okrProgress !== null && (
                <span className="text-[10px] text-white/25">
                  OKR <span style={{ color: '#818CF8' }}>{r.okrProgress}%</span>
                </span>
              )}
              {r.declining && (
                <span className="text-[10px]" style={{ color: '#EF4444' }}>⬇ Tendance décroissante</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PANEL HEATMAP ────────────────────────────────────────────
function HeatmapPanel() {
  const { data: hm = { users: [], months: [], scores: {} }, isLoading } = useHeatmapData(4)

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl" style={GLASS_STYLE} />
  if (hm.users.length === 0) return <EmptyState icon={Activity} title="Aucune donnée" description="Aucun score PULSE disponible pour la heatmap." />

  const usersWithData = hm.users.filter(u =>
    hm.months.some(m => hm.scores[u.id]?.[m] !== undefined)
  ).slice(0, 20)

  return (
    <div className="rounded-2xl p-4 overflow-x-auto" style={GLASS_STYLE_STRONG}>
      <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
        Heatmap PULSE — {hm.months.length} mois
      </p>
      <div className="min-w-max">
        {/* En-têtes mois */}
        <div className="flex items-center gap-1 mb-2 pl-28">
          {hm.months.map(m => (
            <div key={m} className="w-10 text-center text-[9px] text-white/25">{monthKeyToLabel(m)}</div>
          ))}
        </div>
        {/* Lignes */}
        {usersWithData.map(u => (
          <div key={u.id} className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-white/50 w-28 truncate flex-shrink-0">
              {u.first_name} {u.last_name}
            </span>
            {hm.months.map(m => {
              const score = hm.scores[u.id]?.[m] ?? null
              return (
                <div
                  key={m}
                  className="w-10 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{
                    background: heatmapColor(score, 0.7),
                    color: score !== null ? 'rgba(255,255,255,0.85)' : 'transparent',
                  }}
                  title={score !== null ? `${score}%` : 'N/A'}
                >
                  {score !== null ? score : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HOOK KPIs ────────────────────────────────────────────────
function useAnalyticsHubStats() {
  const { data: kpis    = {} }  = useAnalyticsKpis()
  const { data: risks   = [] }  = useDepartureRisk()
  const { data: services = [] } = useServiceComparison()

  const highRisk = risks.filter(r => r.riskScore >= 70).length

  return {
    avgPulse:    kpis.avgPulse ?? null,
    nbServices:  services.length,
    highRisk,
  }
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function AnalyticsHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile } = useAuth()
  const { can }     = usePermission()

  const hasAccess = MANAGER_ROLES.includes(profile?.role) || can('intelligence', 'read')

  const { avgPulse, nbServices, highRisk } = useAnalyticsHubStats()

  if (!hasAccess) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={GLASS_STYLE}>
            <Lock size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">Accès réservé aux managers et administrateurs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Analytics RH</h1>
        <p className="text-sm text-white/40">
          Indicateurs avancés · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Zap}           label="Score PULSE"  value={avgPulse !== null ? `${avgPulse}%` : '—'} color="#6366F1" />
        <StatCard icon={LayoutGrid}    label="Services"     value={nbServices}                               color="#3B82F6" />
        <StatCard icon={AlertTriangle} label="Risques élevés" value={highRisk}                               color="#EF4444" />
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
        {activeTab === 'kpis'     && <KPIsPanel />}
        {activeTab === 'services' && <ServicesPanel />}
        {activeTab === 'risques'  && <RisquesPanel />}
        {activeTab === 'heatmap'  && <HeatmapPanel />}
      </motion.div>
    </div>
  )
}
