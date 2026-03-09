// ============================================================
// APEX RH — src/pages/performance/PerformanceHub.jsx
// Session 93 — Module 5 : Performance — Hub unifié V2
// Session 102 — Phase C RBAC batch 3 : useAuth import inutile retiré
// Route : /performance
// Onglets : Mes OKR · OKR Équipe · OKR Division · OKR Stratégiques
//           Mon Pulse · Dashboard Équipe · Calibration
// Pattern V2 : can() via usePermission() — jamais check rôle direct
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Users, Building2, Globe2, Activity,
  LayoutDashboard, SlidersHorizontal, TrendingUp,
  ChevronRight, Plus, CheckCircle2, AlertCircle, Clock,
  BarChart3, Zap, RefreshCw, Lock,
} from 'lucide-react'

import { usePermission }              from '../../hooks/usePermission'

// ── OKR composants ────────────────────────────────────────────
import OKRDashboard                   from '../../components/okr/OKRDashboard'
import OKRCascadeView                 from '../../components/okr/OKRCascadeView'
import OKRCycleManager                from '../../components/okr/OKRCycleManager'

// ── Pulse composants ──────────────────────────────────────────
import PulseSnapshot                  from '../../components/pulse/PulseSnapshot'
import PulseTrendChart                from '../../components/pulse/PulseTrendChart'
import TeamPulseHeatmap               from '../../components/pulse/TeamPulseHeatmap'
import PulseAlertCenter               from '../../components/pulse/PulseAlertCenter'
import ManagerReviewPanel             from '../../components/pulse/ManagerReviewPanel'
import DailyLogForm                   from '../../components/pulse/DailyLogForm'
import MorningPlanForm                from '../../components/pulse/MorningPlanForm'
import ScoreCard                      from '../../components/pulse/ScoreCard'

// ── Calibration composants ────────────────────────────────────
import CalibrationHistory             from '../../components/calibration/CalibrationHistory'
import PulseCalibration               from '../../components/pulse/PulseCalibration'

// ── Objectives (hooks) ────────────────────────────────────────
import {
  useObjectives,
  useCurrentCycle,
  useOKRCycleStats,
  useOKRAlignmentTree,
} from '../../hooks/useObjectives'
import { useOkrPeriods }              from '../../hooks/useOkrPeriods'
import {
  useTodayScore,
  usePulseTrends,
  useTeamPulseAlerts,
} from '../../hooks/usePulse'
import { useAppSettings }             from '../../hooks/useSettings'
import { isPulseEnabled }             from '../../lib/pulseHelpers'

// ── Animation ──────────────────────────────────────────────────
const fadeIn = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

// ── Composant utilitaire SectionCard ──────────────────────────
function SectionCard({ title, action, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-white/80">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Accès refusé ──────────────────────────────────────────────
function AccessDenied({ message = "Accès réservé — droits insuffisants" }) {
  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible"
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={24} className="text-rose-400" />
      </div>
      <p className="text-white/40 text-sm text-center max-w-xs">{message}</p>
    </motion.div>
  )
}

// ── Onglet Mes OKR ────────────────────────────────────────────
function OngletMesOKR() {
  const { data: cycle }  = useCurrentCycle()
  const { data: stats }  = useOKRCycleStats(cycle?.id)
  const { data: periods } = useOkrPeriods()
  const activePeriod = periods?.find(p => p.is_active) ?? periods?.[0]
  const { data: objectives = [] } = useObjectives(activePeriod?.id, { level: 'individuel' })

  const total     = objectives.length
  const done      = objectives.filter(o => (o.progress_score ?? 0) >= 100).length
  const atRisk    = objectives.filter(o => (o.progress_score ?? 0) < 40 && o.status === 'actif').length
  const avgProg   = total ? Math.round(objectives.reduce((s, o) => s + (o.progress_score ?? 0), 0) / total) : 0

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Objectifs',    value: total,   color: '#6366f1', icon: Target },
          { label: 'Complétés',   value: done,    color: '#10b981', icon: CheckCircle2 },
          { label: 'En risque',   value: atRisk,  color: '#ef4444', icon: AlertCircle },
          { label: 'Progression', value: `${avgProg}%`, color: '#f59e0b', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl border p-4"
            style={{ background: `${color}08`, borderColor: `${color}20` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau OKR */}
      <SectionCard title="Mes objectifs individuels">
        {total === 0 ? (
          <div className="text-center py-10">
            <Target size={32} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm">Aucun objectif pour cette période</p>
          </div>
        ) : (
          <div className="space-y-3">
            {objectives.map(obj => {
              const prog  = obj.progress_score ?? 0
              const color = prog >= 70 ? '#10b981' : prog >= 40 ? '#f59e0b' : '#ef4444'
              return (
                <div key={obj.id}
                  className="rounded-xl border p-3 group transition-all hover:border-white/15"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{obj.title}</p>
                      <p className="text-xs text-white/30 mt-0.5">{obj.description ?? ''}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-lg font-bold" style={{ color }}>{prog}%</span>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(prog, 100)}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Cycle actuel */}
      {cycle && (
        <SectionCard title="Cycle en cours">
          <OKRDashboard />
        </SectionCard>
      )}
    </motion.div>
  )
}

// ── Onglet OKR Équipe ─────────────────────────────────────────
function OngletOKREquipe() {
  const { data: periods }  = useOkrPeriods()
  const activePeriod = periods?.find(p => p.is_active) ?? periods?.[0]
  const { data: objectives = [] } = useObjectives(activePeriod?.id, { level: 'service' })

  const avgProg = objectives.length
    ? Math.round(objectives.reduce((s, o) => s + (o.progress_score ?? 0), 0) / objectives.length)
    : 0

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Résumé équipe */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-white/40">OKR Équipe</p>
              <p className="text-2xl font-bold text-blue-400">{objectives.length}</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-white/40">Progression moy.</p>
              <p className="text-2xl font-bold text-emerald-400">{avgProg}%</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertCircle size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-white/40">En risque</p>
              <p className="text-2xl font-bold text-amber-400">
                {objectives.filter(o => (o.progress_score ?? 0) < 40).length}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Vue cascade équipe */}
      <SectionCard title="Alignement OKR — Niveau Service">
        <OKRCascadeView levelFilter="service" />
      </SectionCard>

      {/* Liste des OKR d'équipe */}
      <SectionCard title="Objectifs du service">
        {objectives.length === 0 ? (
          <div className="text-center py-10">
            <Users size={32} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm">Aucun objectif d'équipe pour cette période</p>
          </div>
        ) : (
          <div className="space-y-2">
            {objectives.map(obj => {
              const prog  = obj.progress_score ?? 0
              const color = prog >= 70 ? '#10b981' : prog >= 40 ? '#f59e0b' : '#ef4444'
              return (
                <div key={obj.id}
                  className="rounded-xl border p-3 transition-all hover:border-white/15"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white/75 truncate flex-1">{obj.title}</p>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color }}>{prog}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(prog, 100)}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </motion.div>
  )
}

// ── Onglet OKR Division ───────────────────────────────────────
function OngletOKRDivision() {
  const { data: periods } = useOkrPeriods()
  const activePeriod = periods?.find(p => p.is_active) ?? periods?.[0]
  const { data: objectives = [] } = useObjectives(activePeriod?.id, { level: 'division' })

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <SectionCard title="Vue cascade Division">
        <OKRCascadeView levelFilter="division" />
      </SectionCard>

      <SectionCard title="Objectifs de division">
        {objectives.length === 0 ? (
          <div className="text-center py-10">
            <Building2 size={32} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm">Aucun objectif de division pour cette période</p>
          </div>
        ) : (
          <div className="space-y-2">
            {objectives.map(obj => {
              const prog  = obj.progress_score ?? 0
              const color = prog >= 70 ? '#10b981' : prog >= 40 ? '#f59e0b' : '#ef4444'
              return (
                <div key={obj.id}
                  className="rounded-xl border p-3"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/75">{obj.title}</p>
                      <p className="text-xs text-white/30 mt-0.5 capitalize">{obj.level}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>{prog}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(prog, 100)}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </motion.div>
  )
}

// ── Onglet OKR Stratégiques ───────────────────────────────────
function OngletOKRStrategiques() {
  const { data: periods } = useOkrPeriods()
  const activePeriod = periods?.find(p => p.is_active) ?? periods?.[0]
  const { data: objectives = [] } = useObjectives(activePeriod?.id, { level: 'strategique' })
  const { data: cycle } = useCurrentCycle()
  const { data: stats } = useOKRCycleStats(cycle?.id)

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Stats stratégiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Objectifs org.',   value: objectives.length,                         color: '#818cf8', icon: Globe2 },
          { label: 'Progression',      value: `${stats?.overall_progress_avg ? Math.round(stats.overall_progress_avg) : 0}%`, color: '#10b981', icon: TrendingUp },
          { label: 'Cycles actifs',    value: stats?.active_count ?? 0,                  color: '#f59e0b', icon: RefreshCw },
          { label: 'En risque',        value: stats?.at_risk_count ?? 0,                 color: '#ef4444', icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl border p-4"
            style={{ background: `${color}08`, borderColor: `${color}20` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              </div>
              <Icon size={16} className="mt-1 opacity-60" style={{ color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tableau de bord OKR complet */}
      <SectionCard title="Tableau de bord OKR Organisation">
        <OKRDashboard />
      </SectionCard>

      {/* Vue cascade complète */}
      <SectionCard title="Cascade stratégique complète">
        <OKRCascadeView />
      </SectionCard>

      {/* Gestion cycles */}
      <SectionCard title="Gestion des cycles OKR">
        <OKRCycleManager />
      </SectionCard>
    </motion.div>
  )
}

// ── Onglet Mon Pulse ──────────────────────────────────────────
function OngletMonPulse({ pulseEnabled }) {
  const { data: trends } = usePulseTrends()

  if (!pulseEnabled) {
    return (
      <motion.div variants={fadeIn} initial="hidden" animate="visible"
        className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Activity size={24} className="text-indigo-400" />
        </div>
        <p className="text-white/40 text-sm text-center max-w-xs">
          Le module Pulse n'est pas activé pour votre organisation
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Score du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <SectionCard title="Mon score aujourd'hui">
            <ScoreCard />
          </SectionCard>
        </div>
        <div className="lg:col-span-2">
          <SectionCard title="Snapshot journalier">
            <PulseSnapshot />
          </SectionCard>
        </div>
      </div>

      {/* Formulaires du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Plan du matin">
          <MorningPlanForm />
        </SectionCard>
        <SectionCard title="Journal du jour">
          <DailyLogForm />
        </SectionCard>
      </div>

      {/* Tendances */}
      <SectionCard title="Mes tendances Pulse — 30 jours">
        <PulseTrendChart trends={trends} />
      </SectionCard>
    </motion.div>
  )
}

// ── Onglet Dashboard Équipe ───────────────────────────────────
function OngletDashboardEquipe({ pulseEnabled }) {
  const { data: alerts = [] } = useTeamPulseAlerts()
  const atRisk = alerts.filter(a => a.status === 'active').length

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* En-tête avec indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.12)' }}>
              <Users size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-white/40">Vue équipe</p>
              <p className="text-sm font-semibold text-white/80">Actif</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: atRisk > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }}>
              <AlertCircle size={18} className={atRisk > 0 ? 'text-rose-400' : 'text-emerald-400'} />
            </div>
            <div>
              <p className="text-xs text-white/40">Alertes actives</p>
              <p className={`text-sm font-semibold ${atRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {atRisk}
              </p>
            </div>
          </div>
        </SectionCard>
        <SectionCard className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)' }}>
              <BarChart3 size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-white/40">Performance</p>
              <p className="text-sm font-semibold text-amber-400">Vue globale</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Heatmap équipe */}
      {pulseEnabled && (
        <SectionCard title="Heatmap Pulse — Équipe">
          <TeamPulseHeatmap />
        </SectionCard>
      )}

      {/* Alertes équipe */}
      <SectionCard title="Centre d'alertes équipe">
        <PulseAlertCenter />
      </SectionCard>

      {/* Panel manager */}
      <SectionCard title="Revue manager">
        <ManagerReviewPanel />
      </SectionCard>
    </motion.div>
  )
}

// ── Onglet Calibration ────────────────────────────────────────
function OngletCalibration() {
  const [activeTab, setActiveTab] = useState('pulse')

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Sous-navigation */}
      <div className="flex gap-2">
        {[
          { id: 'pulse',      label: 'Pulse',      icon: Activity },
          { id: 'historique', label: 'Historique', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === id
                ? 'text-white'
                : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
            }`}
            style={activeTab === id
              ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }
              : { border: '1px solid transparent' }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pulse' && (
          <motion.div key="pulse" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Calibration Pulse — Pondération dimensions">
              <PulseCalibration />
            </SectionCard>
          </motion.div>
        )}
        {activeTab === 'historique' && (
          <motion.div key="historique" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Historique des calibrations">
              <CalibrationHistory />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Configuration des onglets ─────────────────────────────────
function buildTabs(can) {
  return [
    {
      id:      'mes-okr',
      label:   'Mes OKR',
      icon:    Target,
      color:   '#6366f1',
      guard:   can('performance', 'okr_own', 'read'),
    },
    {
      id:      'okr-equipe',
      label:   'OKR Équipe',
      icon:    Users,
      color:   '#3b82f6',
      guard:   can('performance', 'okr_team', 'read'),
    },
    {
      id:      'okr-division',
      label:   'OKR Division',
      icon:    Building2,
      color:   '#10b981',
      guard:   can('performance', 'okr_division', 'read'),
    },
    {
      id:      'okr-strategiques',
      label:   'OKR Stratégiques',
      icon:    Globe2,
      color:   '#818cf8',
      guard:   can('performance', 'okr_strategic', 'read'),
    },
    {
      id:      'mon-pulse',
      label:   'Mon Pulse',
      icon:    Activity,
      color:   '#f59e0b',
      guard:   can('performance', 'pulse_own', 'read'),
    },
    {
      id:      'dashboard-equipe',
      label:   'Dashboard Équipe',
      icon:    LayoutDashboard,
      color:   '#06b6d4',
      guard:   can('performance', 'dashboard_equipe', 'read'),
    },
    {
      id:      'calibration',
      label:   'Calibration',
      icon:    SlidersHorizontal,
      color:   '#8b5cf6',
      guard:   can('performance', 'calibration', 'read'),
    },
  ]
}

// ── Hub principal ─────────────────────────────────────────────
export default function PerformanceHub() {
  const { can } = usePermission()
  const { data: settings } = useAppSettings()
  const pulseEnabled = isPulseEnabled(settings)

  const tabs = buildTabs(can)
  const visibleTabs = tabs.filter(t => t.guard)

  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.id ?? 'mes-okr')

  // Si l'onglet actif n'est plus visible (changement de rôle), basculer
  const currentTab = visibleTabs.find(t => t.id === activeTab) ?? visibleTabs[0]
  const activeId = currentTab?.id ?? ''

  if (visibleTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AccessDenied message="Vous n'avez accès à aucun onglet du module Performance." />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d24 100%)' }}>

      {/* ── En-tête module ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 0 24px rgba(79,70,229,0.25)' }}>
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Performance</h1>
            <p className="text-xs text-white/40 mt-0.5">OKR · Pulse · Calibration</p>
          </div>
        </div>
        {/* Indicateur cycle actif */}
        <CycleIndicator />
      </div>

      {/* ── Navigation onglets ── */}
      <div
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeId === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive ? 'text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
              style={isActive
                ? { background: `${tab.color}15`, border: `1px solid ${tab.color}35`, color: tab.color }
                : { border: '1px solid transparent' }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Contenu onglet ── */}
      <AnimatePresence mode="wait">
        <div key={activeId}>
          {activeId === 'mes-okr' && <OngletMesOKR />}
          {activeId === 'okr-equipe' && (
            can('performance', 'okr_team', 'read')
              ? <OngletOKREquipe />
              : <AccessDenied />
          )}
          {activeId === 'okr-division' && (
            can('performance', 'okr_division', 'read')
              ? <OngletOKRDivision />
              : <AccessDenied />
          )}
          {activeId === 'okr-strategiques' && (
            can('performance', 'okr_strategic', 'read')
              ? <OngletOKRStrategiques />
              : <AccessDenied />
          )}
          {activeId === 'mon-pulse' && (
            can('performance', 'pulse_own', 'read')
              ? <OngletMonPulse pulseEnabled={pulseEnabled} />
              : <AccessDenied />
          )}
          {activeId === 'dashboard-equipe' && (
            can('performance', 'dashboard_equipe', 'read')
              ? <OngletDashboardEquipe pulseEnabled={pulseEnabled} />
              : <AccessDenied />
          )}
          {activeId === 'calibration' && (
            can('performance', 'calibration', 'read')
              ? <OngletCalibration />
              : <AccessDenied />
          )}
        </div>
      </AnimatePresence>
    </div>
  )
}

// ── Indicateur cycle actif ─────────────────────────────────────
function CycleIndicator() {
  const { data: cycle } = useCurrentCycle()
  if (!cycle) return null

  const end    = new Date(cycle.end_date)
  const now    = new Date()
  const days   = Math.max(0, Math.ceil((end - now) / 86400000))
  const urgent = days <= 14

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{
        background: urgent ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
        border: `1px solid ${urgent ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
      }}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-rose-400' : 'bg-emerald-400'}`} />
      <span className={urgent ? 'text-rose-300' : 'text-emerald-300'}>
        {cycle.name} — {days}j restants
      </span>
    </div>
  )
}
