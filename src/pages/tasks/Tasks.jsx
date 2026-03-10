// ============================================================
// APEX RH — Tasks.jsx · S134
// Aurora Design #9 — KPIs vivants + glass réel
// ============================================================
import { useState }               from 'react'
import { useTasks }               from '../../hooks/useTasks'
import { useTaskFilters }         from '../../hooks/useTaskFilters'
import { useTaskRealtime }        from '../../hooks/useTaskRealtime'
import { useAppSettings }         from '../../hooks/useSettings'
import { useAuth }                from '../../contexts/AuthContext'
import { usePermission }          from '../../hooks/usePermission'
import { isPulseEnabled }         from '../../lib/pulseHelpers'
import TaskFilters                from '../../components/tasks/TaskFilters'
import KanbanView                 from '../../components/tasks/KanbanView'
import ListView                   from '../../components/tasks/ListView'
import CalendarView               from '../../components/tasks/CalendarView'
import MyDayView                  from '../../components/tasks/MyDayView'
import TaskDetailPanel            from '../../components/tasks/TaskDetailPanel'
import Modal                      from '../../components/ui/Modal'
import TaskForm                   from '../../components/tasks/TaskForm'
import ExportButton               from '../../components/ui/ExportButton'
import { exportTasks }            from '../../lib/exportExcel'
import JournalPage                from '../pulse/Journal'
import WorkloadChart              from '../../components/tasks/WorkloadChart'
import GanttMini                  from '../../components/tasks/GanttMini'
import TaskDashboardView          from '../../components/tasks/TaskDashboardView'
import { TASK_STATUS, ROLES }     from '../../utils/constants'

const MANAGER_ROLES = [ROLES.MANAGER, ROLES.CHEF_SERVICE, ROLES.CHEF_DIVISION, ROLES.DIRECTEUR, ROLES.RH, ROLES.ADMINISTRATEUR]

const VIEWS = [
  { id: 'kanban',    label: 'Kanban',     icon: '▦' },
  { id: 'list',      label: 'Liste',      icon: '☰' },
  { id: 'calendar',  label: 'Calendrier', icon: '📅' },
  { id: 'myday',     label: 'Ma Journée', icon: '☀' },
  { id: 'gantt',     label: 'Gantt',      icon: '📊' },
  { id: 'charge',    label: 'Charge',     icon: '⚖' },
  { id: 'dashboard', label: 'Dashboard',  icon: '📈', managerOnly: true },
]

// ─── KPI cards Aurora — vivantes, colorées ───────────────────
// Chaque carte a UN fond coloré teinté fort + glow + barre lumineuse
const KPI_CONFIG = [
  {
    label: 'Total', key: 'total',
    bg: 'linear-gradient(135deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%)',
    border: 'rgba(255,255,255,.25)',
    accent: '#FFFFFF',
    glow: 'rgba(255,255,255,.08)',
    shimmer: 'rgba(255,255,255,.30)',
  },
  {
    label: 'En cours', key: 'en_cours',
    bg: 'linear-gradient(135deg, rgba(16,185,129,.22) 0%, rgba(5,150,105,.12) 100%)',
    border: 'rgba(52,211,153,.45)',
    accent: '#6EE7B7',
    glow: 'rgba(16,185,129,.25)',
    shimmer: 'rgba(52,211,153,.50)',
  },
  {
    label: 'En revue', key: 'en_revue',
    bg: 'linear-gradient(135deg, rgba(139,92,246,.22) 0%, rgba(109,40,217,.12) 100%)',
    border: 'rgba(167,139,250,.45)',
    accent: '#C4B5FD',
    glow: 'rgba(139,92,246,.25)',
    shimmer: 'rgba(167,139,250,.50)',
  },
  {
    label: 'Urgentes', key: 'urgentes',
    bg: 'linear-gradient(135deg, rgba(239,68,68,.20) 0%, rgba(185,28,28,.10) 100%)',
    border: 'rgba(252,165,165,.45)',
    accent: '#FCA5A5',
    glow: 'rgba(239,68,68,.20)',
    shimmer: 'rgba(252,165,165,.50)',
  },
]

function KpiCard({ cfg, value, total }) {
  const pct = cfg.key === 'total' ? 100 : (total > 0 ? Math.round((value / total) * 100) : 0)
  return (
    <div style={{
      borderRadius: 20,
      padding: '22px 22px 18px',
      position: 'relative',
      overflow: 'hidden',
      background: cfg.bg,
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      border: `1px solid ${cfg.border}`,
      boxShadow: `0 8px 32px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,.20)`,
    }}>
      {/* Shimmer ligne du haut */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${cfg.shimmer} 50%, transparent 100%)`,
      }} />
      {/* Reflet glass haut */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(180deg, rgba(255,255,255,.08) 0%, transparent 100%)',
        borderRadius: '20px 20px 0 0',
      }} />

      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: 10,
        color: 'rgba(255,255,255,.55)',
      }}>{cfg.label}</div>

      <div style={{
        fontSize: 44, fontWeight: 900, lineHeight: 1,
        letterSpacing: '-3px', color: cfg.accent,
        textShadow: `0 0 20px ${cfg.glow}`,
      }}>{value}</div>

      {/* Barre de progression lumineuse */}
      <div style={{ marginTop: 18, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: cfg.accent,
          boxShadow: `0 0 10px ${cfg.accent}`,
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

export default function Tasks() {
  const { profile }  = useAuth()
  const { can }      = usePermission()
  const {
    filters, activeFilters, activeView, setActiveView,
    updateFilter, resetFilters, hasActiveFilters,
  } = useTaskFilters()
  const { data: settings } = useAppSettings()
  const pulseOn             = isPulseEnabled(settings)

  const isManager   = MANAGER_ROLES.includes(profile?.role)
  const isDashboard = activeView === 'dashboard'
  const isJournal   = activeView === 'myday' && pulseOn
  const isTaskView  = !isJournal && !['myday', 'gantt', 'charge', 'dashboard'].includes(activeView)

  const { data: tasks = [], isLoading, error } = useTasks(isTaskView ? activeFilters : {})
  const [selectedTaskId,  setSelectedTaskId]   = useState(null)
  const [showCreateModal, setShowCreateModal]  = useState(false)
  const [showFilters,     setShowFilters]      = useState(false)

  useTaskRealtime()

  const stats = {
    total:    tasks.length,
    en_cours: tasks.filter(t => t.status === TASK_STATUS.EN_COURS).length,
    en_revue: tasks.filter(t => t.status === 'en_revue').length,
    urgentes: tasks.filter(t => t.priority === 'urgente' && t.status !== 'terminee').length,
  }

  const visibleViews = VIEWS.filter(v => !v.managerOnly || isManager)

  return (
    <div className="flex flex-col h-full gap-5 px-6 py-5">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ letterSpacing: '-0.4px' }}>Tâches</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.35)' }}>
            Gérez et suivez toutes vos tâches
          </p>
        </div>
        {isTaskView && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTasks(tasks)}
              disabled={tasks.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                background: 'rgba(255,255,255,.07)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.55)',
              }}
            >
              Excel
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(16,185,129,.55) 0%, rgba(5,150,105,.40) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(52,211,153,.55)',
                color: '#A7F3D0',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(16,185,129,.30), inset 0 1px 0 rgba(255,255,255,.25)',
                textShadow: '0 0 10px rgba(52,211,153,.5)',
              }}
            >
              + Nouvelle tâche
            </button>
          </div>
        )}
      </div>

      {/* KPI CARDS */}
      {isTaskView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {KPI_CONFIG.map(cfg => (
            <KpiCard key={cfg.key} cfg={cfg} value={stats[cfg.key]} total={stats.total} />
          ))}
        </div>
      )}

      {/* SWITCH VUES + FILTRES */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div style={{
          display: 'flex', gap: 3, padding: 4, borderRadius: 14,
          background: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,.10)',
        }}>
          {visibleViews.map(v => (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, transition: 'all .15s',
                ...(activeView === v.id
                  ? {
                      background: 'linear-gradient(135deg, rgba(16,185,129,.35) 0%, rgba(5,150,105,.22) 100%)',
                      color: '#6EE7B7',
                      border: '1px solid rgba(52,211,153,.35)',
                      boxShadow: '0 2px 10px rgba(16,185,129,.20)',
                    }
                  : { background: 'transparent', color: 'rgba(255,255,255,.35)' }
                ),
              }}
            >
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        {isTaskView && (
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 11, cursor: 'pointer',
              fontSize: 12, fontWeight: 500, transition: 'all .2s',
              ...(showFilters || hasActiveFilters
                ? {
                    background: 'rgba(16,185,129,.15)',
                    border: '1px solid rgba(52,211,153,.35)',
                    color: '#6EE7B7',
                  }
                : {
                    background: 'rgba(255,255,255,.06)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,.10)',
                    color: 'rgba(255,255,255,.45)',
                  }
              ),
            }}
          >
            ⚙ Filtres
            {hasActiveFilters && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399',
                boxShadow: '0 0 6px #34D399' }} />
            )}
          </button>
        )}
      </div>

      {/* Panneau filtres */}
      {isTaskView && showFilters && (
        <div style={{
          background: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,.10)',
          borderRadius: 14, padding: '12px 16px',
        }}>
          <TaskFilters filters={filters} updateFilter={updateFilter}
            resetFilters={resetFilters} hasActiveFilters={hasActiveFilters} />
        </div>
      )}

      {/* CONTENU */}
      {isDashboard && <div className="flex-1 min-h-0 overflow-y-auto"><TaskDashboardView onTaskClick={setSelectedTaskId} /></div>}
      {isJournal    && <div className="flex-1 min-h-0 overflow-y-auto"><JournalPage /></div>}
      {activeView === 'myday'  && !pulseOn && !isDashboard && <div className="flex-1 min-h-0 overflow-y-auto"><MyDayView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
      {activeView === 'gantt'  && <div className="flex-1 min-h-0 overflow-y-auto"><GanttMini /></div>}
      {activeView === 'charge' && <div className="flex-1 min-h-0 overflow-y-auto"><WorkloadChart /></div>}

      {isTaskView && (
        isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: 28, height: 28, border: '2px solid rgba(52,211,153,.35)',
              borderTopColor: '#6EE7B7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm flex-1 flex items-center justify-center">Erreur : {error.message}</p>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeView === 'kanban'   && <div className="h-full overflow-x-auto"><KanbanView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
            {activeView === 'list'     && <ListView tasks={tasks} onTaskClick={setSelectedTaskId} />}
            {activeView === 'calendar' && <div className="h-full overflow-y-auto"><CalendarView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
          </div>
        )
      )}

      {selectedTaskId   && <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      {showCreateModal  && <Modal title="Nouvelle tâche" onClose={() => setShowCreateModal(false)}><TaskForm onClose={() => setShowCreateModal(false)} /></Modal>}
    </div>
  )
}
