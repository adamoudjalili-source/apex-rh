// ============================================================
// APEX RH — MonTravail.jsx · S113
// Hub Mon Espace — Tâches · Projets · OKR
// Onglets via useSearchParams(?tab=taches|projets|okr)
// Header stats rapides · Max 400 lignes
// ============================================================
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion }          from 'framer-motion'
import {
  CheckSquare,
  FolderKanban,
  Target,
  Clock,
} from 'lucide-react'

import { useMyCurrentTimeSheet, useTimeEntries, formatHours } from '../../hooks/useTemps'
import { TASK_STATUS } from '../../utils/constants'
import StatCard        from '../../components/ui/StatCard'

import { useTasks }            from '../../hooks/useTasks'
import { useProjects }         from '../../hooks/useProjects'
import { useObjectives }       from '../../hooks/useObjectives'
import { useActiveOKRPeriods } from '../../hooks/useOkrPeriods'
import { useAuth }             from '../../contexts/AuthContext'

import Tasks          from '../tasks/Tasks'
import ProjectsPage   from '../projects/Projects'
import ObjectivesPage from '../objectives/Objectives'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'taches',    label: 'Tâches',  icon: CheckSquare,  color: '#6366F1' },
  { id: 'projets',   label: 'Projets', icon: FolderKanban, color: '#3B82F6' },
  { id: 'objectifs', label: 'OKR',     icon: Target,       color: '#8B5CF6' },
]

const DEFAULT_TAB = 'taches'

// ─── HOOK STATS AGRÉGÉES ─────────────────────────────────────
function useMonTravailStats() {
  const { profile } = useAuth()

  const { data: tasks    = [], isLoading: loadingTasks    } = useTasks({})
  const { data: projects = [], isLoading: loadingProjects  } = useProjects({})
  const { data: periods  = [], isLoading: loadingPeriods   } = useActiveOKRPeriods()

  const activePeriodId = periods[0]?.id ?? null
  const { data: objectives = [], isLoading: loadingOkr } = useObjectives(activePeriodId, {})

  // Tâches : assignées à moi ou créées par moi
  const myTasks = tasks.filter(t =>
    t.assignees?.some(a => a.id === profile?.id) ||
    t.created_by === profile?.id
  )
  const openTasks    = myTasks.filter(t =>
    [TASK_STATUS.A_FAIRE, TASK_STATUS.EN_COURS, TASK_STATUS.EN_REVUE].includes(t.status)
  )
  const overdueCount = myTasks.filter(t => t.status === TASK_STATUS.OVERDUE).length
  const inProgress   = myTasks.filter(t => t.status === TASK_STATUS.EN_COURS).length

  // Projets : membre ou manager
  const myProjects     = projects.filter(p =>
    p.members?.some(m => m.user_id === profile?.id) || p.manager_id === profile?.id
  )
  const activeProjects = myProjects.filter(p => p.status === TASK_STATUS.EN_COURS)

  // OKR : objectifs dont je suis owner dans la période active
  const myObjectives = objectives.filter(o => o.owner_id === profile?.id)
  const activeOkr    = myObjectives.filter(o => o.status === 'en_cours')
  const avgProgress  = myObjectives.length
    ? Math.round(myObjectives.reduce((acc, o) => acc + (o.progress ?? 0), 0) / myObjectives.length)
    : 0

  return {
    loading: loadingTasks || loadingProjects || loadingPeriods || loadingOkr,
    openTasks:      openTasks.length,
    overdueCount,
    inProgress,
    activeProjects: activeProjects.length,
    totalProjects:  myProjects.length,
    activeOkr:      activeOkr.length,
    totalOkr:       myObjectives.length,
    avgProgress,
  }
}

// ─── Widget taux d'occupation ────────────────────────────────
const OBJ_H = 37
const TASK_COLORS = ['#818CF8','#34D399','#FB923C','#F87171','#FCD34D','#A78BFA','#38BDF8']

function OccupationWidget() {
  const navigate          = useNavigate()
  const { data: sheet }  = useMyCurrentTimeSheet()
  const { data: entries = [] } = useTimeEntries(sheet?.id)

  const totalH = entries.reduce((s, e) => s + (e.hours ?? 0), 0)
  const taux   = Math.min(100, Math.round((totalH / OBJ_H) * 100))
  const color  = taux >= 80 ? '#34D399' : taux >= 50 ? '#FCD34D' : '#818CF8'

  // Regroupement par tâche (ou type si pas de tâche)
  const byTask = entries.reduce((acc, e) => {
    const key   = e.tasks?.title || e.projects?.name || e.entry_type || 'Autre'
    acc[key] = (acc[key] || 0) + (e.hours ?? 0)
    return acc
  }, {})
  const breakdown = Object.entries(byTask)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div
      onClick={() => navigate('/mon-suivi-temps?tab=saisie')}
      className="rounded-xl border border-white/[0.08] p-4 cursor-pointer transition-all hover:border-white/20"
      style={{ background: 'rgba(255,255,255,.03)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Clock size={14} style={{ color }} />
            <span className="text-xs font-semibold text-white/50">Taux d'occupation</span>
          </div>
          <div className="text-2xl font-black" style={{ color }}>{taux}%</div>
          <div className="text-[11px] text-white/30 mt-0.5">{formatHours(totalH)} / {OBJ_H}h cette semaine</div>
        </div>
        {/* Anneau SVG */}
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${(taux / 100) * 113} 113`}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: 'stroke-dasharray .6s ease' }}
          />
        </svg>
      </div>

      {/* Barre de progression */}
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${taux}%`, background: color }} />
      </div>

      {/* Breakdown tâches */}
      {breakdown.length > 0 && (
        <div className="space-y-1.5">
          {breakdown.map(([label, h], i) => {
            const pct = Math.round((h / totalH) * 100)
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TASK_COLORS[i % TASK_COLORS.length] }} />
                <span className="text-[11px] text-white/40 truncate flex-1 min-w-0">{label}</span>
                <span className="text-[11px] font-semibold text-white/60 flex-shrink-0">{formatHours(h)}</span>
                <span className="text-[10px] text-white/25 flex-shrink-0 w-7 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function StatsHeader({ onTabClick }) {
  const {
    loading,
    openTasks, overdueCount, inProgress,
    activeProjects, totalProjects,
    activeOkr, totalOkr, avgProgress,
  } = useMonTravailStats()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 px-6 py-4">
      <StatCard
        icon={CheckSquare}
        label="Tâches ouvertes"
        value={openTasks}
        sub={
          overdueCount > 0
            ? `${overdueCount} en retard · ${inProgress} en cours`
            : `${inProgress} en cours`
        }
        color="#6366F1"
        alert={overdueCount > 0}
        loading={loading}
        onClick={() => onTabClick('taches')}
      />
      <StatCard
        icon={FolderKanban}
        label="Projets actifs"
        value={activeProjects}
        sub={totalProjects > 0 ? `sur ${totalProjects} projet${totalProjects > 1 ? 's' : ''}` : 'Aucun projet'}
        color="#3B82F6"
        loading={loading}
        onClick={() => onTabClick('projets')}
      />
      <StatCard
        icon={Target}
        label="OKR en cours"
        value={activeOkr}
        sub={totalOkr > 0 ? `Progression moy. ${avgProgress}%` : 'Aucun objectif'}
        color="#8B5CF6"
        loading={loading}
        onClick={() => onTabClick('objectifs')}
      />
      <OccupationWidget />
    </div>
  )
}

// ─── BARRE D'ONGLETS ──────────────────────────────────────────
function TabBar({ activeTab, onTabClick }) {
  return (
    <div
      className="flex-shrink-0 border-b border-white/[0.06] px-6 pb-0"
      style={{ background: 'rgba(9,9,32,0.4)' }}
    >
      <div className="flex gap-1">
        {TABS.map(tab => {
          const Icon     = tab.icon
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 relative ${
                isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              style={isActive ? { background: `${tab.color}14` } : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="montravail-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ background: tab.color }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon size={15} style={isActive ? { color: tab.color } : undefined} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MonTravail() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  function handleTabClick(tabId) {
    setSearchParams({ tab: tabId }, { replace: true })
  }

  return (
    <div className="flex flex-col h-full">

      {/* En-tête */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0" style={{ background: 'rgba(9,9,32,0.6)' }}>
        <h1 className="text-2xl font-bold text-white mb-0.5">Mon Travail</h1>
        <p className="text-sm text-white/40 mb-4">
          Tâches, projets et objectifs OKR qui me sont assignés.
        </p>
      </div>

      {/* Stats rapides */}
      <div className="flex-shrink-0" style={{ background: 'rgba(9,9,32,0.6)' }}>
        <StatsHeader onTabClick={handleTabClick} />
      </div>

      {/* Onglets */}
      <TabBar activeTab={activeTab} onTabClick={handleTabClick} />

      {/* Contenu onglet actif */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'taches'    && <Tasks />}
        {activeTab === 'projets'   && <ProjectsPage />}
        {activeTab === 'objectifs' && <ObjectivesPage />}
      </div>

    </div>
  )
}
