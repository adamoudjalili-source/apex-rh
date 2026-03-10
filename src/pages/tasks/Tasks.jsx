// ============================================================
// APEX RH — Tasks.jsx · S134
// 7 vues : Kanban · Liste · Calendrier · Ma Journée · Gantt · Charge · Dashboard
// Aurora Design #9 — glass KPIs + view switcher jade
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

// ─── Icônes SVG inline (pas de dépendance externe) ───────────
const Ico = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const IKanban = () => <Ico d="M3 3h5v11H3zM10 3h5v7h-5zM17 3h5v14h-5z" />
const IList   = () => <Ico d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
const ICal    = () => <Ico d="M3 4h18v18H3V4zm3 4h12M8 2v4M16 2v4" />
const ISun    = () => <Ico d="M12 17A5 5 0 1012 7a5 5 0 000 10zm0-15v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
const IGantt  = () => <Ico d="M3 5h8M3 10h14M3 15h10M3 20h6" />
const ICharge = () => <Ico d="M22 12h-4l-3 9L9 3l-3 9H2" />
const IDash   = () => <Ico d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
const IFilter = () => <Ico d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
const IPlus   = () => <Ico d="M12 5v14M5 12h14" />
const IExcel  = () => <Ico d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1v5h5" />

const VIEWS = [
  { id: 'kanban',    label: 'Kanban',      I: IKanban },
  { id: 'list',      label: 'Liste',       I: IList   },
  { id: 'calendar',  label: 'Calendrier',  I: ICal    },
  { id: 'myday',     label: 'Ma Journée',  I: ISun    },
  { id: 'gantt',     label: 'Gantt',       I: IGantt  },
  { id: 'charge',    label: 'Charge',      I: ICharge },
  { id: 'dashboard', label: 'Dashboard',   I: IDash, managerOnly: true },
]

// ─── Styles Aurora réutilisables ─────────────────────────────
const glassBase = {
  background: 'rgba(255,255,255,.05)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '1px solid rgba(255,255,255,.08)',
}
const glassActive = {
  background: 'rgba(16,185,129,.10)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(52,211,153,.22)',
  color: '#6EE7B7',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1), 0 2px 12px rgba(16,185,129,.15)',
}

// ─── KPI card Aurora ─────────────────────────────────────────
const KPI_CONFIG = [
  { label: 'Total',    key: 'total',    accent: 'rgba(255,255,255,.88)', rgb: '255,255,255', pct: 100  },
  { label: 'En cours', key: 'en_cours', accent: '#6EE7B7',               rgb: '110,231,183', pct: null },
  { label: 'En revue', key: 'en_revue', accent: '#C4B5FD',               rgb: '196,181,253', pct: null },
  { label: 'Urgentes', key: 'urgentes', accent: '#FCA5A5',               rgb: '252,165,165', pct: null },
]

function KpiCard({ cfg, value, total }) {
  const pct = cfg.pct ?? (total > 0 ? Math.round((value / total) * 100) : 0)
  return (
    <div style={{
      borderRadius: 18,
      padding: '20px',
      background: 'rgba(255,255,255,.05)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      border: `1px solid rgba(${cfg.rgb},.18)`,
      boxShadow: `0 6px 28px rgba(${cfg.rgb},.08), inset 0 1px 0 rgba(255,255,255,.12)`,
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {/* Shimmer haut */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg,transparent,rgba(${cfg.rgb},.35),transparent)` }} />
      {/* Reflet glass */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(180deg,rgba(255,255,255,.04),transparent)',
        borderRadius: '18px 18px 0 0' }} />

      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.38)',
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
        {cfg.label}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1,
        letterSpacing: '-2px', color: cfg.accent }}>
        {value}
      </div>
      <div style={{ marginTop: 16, height: 2, borderRadius: 2,
        background: 'rgba(255,255,255,.06)' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2,
          background: cfg.accent, opacity: 0.75,
          boxShadow: `0 0 8px rgba(${cfg.rgb},.6)`,
          transition: 'width .8s ease' }} />
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
    <div className="flex flex-col h-full gap-4 px-6 py-5">

      {/* ── HEADER ───────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ letterSpacing: '-0.4px' }}>
            Tâches
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>
            Gérez et suivez toutes vos tâches
          </p>
        </div>
        {isTaskView && (
          <div className="flex items-center gap-2">
            {/* Bouton Excel glass */}
            <button
              onClick={() => exportTasks(tasks)}
              disabled={tasks.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                ...glassBase,
                color: 'rgba(255,255,255,.5)',
                transition: 'all .2s',
              }}
            >
              <IExcel /> Excel
            </button>
            {/* Bouton Nouvelle tâche — accent jade */}
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10,
                border: '1px solid rgba(52,211,153,.35)',
                background: 'rgba(16,185,129,.18)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: '#6EE7B7',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(16,185,129,.2), inset 0 1px 0 rgba(255,255,255,.15)',
              }}
            >
              <IPlus /> Nouvelle tâche
            </button>
          </div>
        )}
      </div>

      {/* ── KPI CARDS ────────────────────────────────────── */}
      {isTaskView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {KPI_CONFIG.map(cfg => (
            <KpiCard key={cfg.key} cfg={cfg} value={stats[cfg.key]} total={stats.total} />
          ))}
        </div>
      )}

      {/* ── VUE SELECTOR + FILTRES ───────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Switch vues — glass Aurora */}
        <div style={{
          display: 'flex', gap: 3, padding: 4, borderRadius: 14,
          ...glassBase,
        }}>
          {visibleViews.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                transition: 'all .15s',
                ...(activeView === v.id ? glassActive : {
                  background: 'transparent',
                  color: 'rgba(255,255,255,.35)',
                }),
              }}
            >
              <v.I />{v.label}
            </button>
          ))}
        </div>

        {/* Filtres */}
        {isTaskView && (
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 11, cursor: 'pointer',
              fontSize: 12, fontWeight: 500, transition: 'all .2s',
              ...(showFilters || hasActiveFilters
                ? { background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.25)',
                    color: '#6EE7B7', backdropFilter: 'blur(20px)' }
                : { ...glassBase, color: 'rgba(255,255,255,.4)' }
              ),
            }}
          >
            <IFilter />
            Filtres
            {hasActiveFilters && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399',
                boxShadow: '0 0 6px #34D399', marginLeft: 2 }} />
            )}
          </button>
        )}
      </div>

      {/* Panneau filtres */}
      {isTaskView && showFilters && (
        <div style={{
          ...glassBase,
          borderRadius: 14, padding: '12px 16px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)',
        }}>
          <TaskFilters
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      {/* ── CONTENU VUE ACTIVE ───────────────────────────── */}
      {isDashboard && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TaskDashboardView onTaskClick={setSelectedTaskId} />
        </div>
      )}
      {isJournal && (
        <div className="flex-1 min-h-0 overflow-y-auto"><JournalPage /></div>
      )}
      {activeView === 'myday' && !pulseOn && !isDashboard && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MyDayView tasks={tasks} onTaskClick={setSelectedTaskId} />
        </div>
      )}
      {activeView === 'gantt' && (
        <div className="flex-1 min-h-0 overflow-y-auto"><GanttMini /></div>
      )}
      {activeView === 'charge' && (
        <div className="flex-1 min-h-0 overflow-y-auto"><WorkloadChart /></div>
      )}

      {isTaskView && (
        isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: 28, height: 28, border: '2px solid rgba(110,231,183,.5)',
              borderTopColor: '#6EE7B7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-400 text-sm">Erreur : {error.message}</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeView === 'kanban'   && <div className="h-full overflow-x-auto"><KanbanView   tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
            {activeView === 'list'     && <ListView   tasks={tasks} onTaskClick={setSelectedTaskId} />}
            {activeView === 'calendar' && <div className="h-full overflow-y-auto"><CalendarView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
          </div>
        )
      )}

      {selectedTaskId   && <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      {showCreateModal  && <Modal title="Nouvelle tâche" onClose={() => setShowCreateModal(false)}><TaskForm onClose={() => setShowCreateModal(false)} /></Modal>}
    </div>
  )
}
