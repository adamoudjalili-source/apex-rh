// ============================================================
// APEX RH — Tasks.jsx · S134  Aurora #9 — AUTONOME
// Rideaux verticaux jade/violet/or propres à la page Tâches
// ============================================================
import { useState }           from 'react'
import { useTasks }           from '../../hooks/useTasks'
import { useTaskFilters }     from '../../hooks/useTaskFilters'
import { useTaskRealtime }    from '../../hooks/useTaskRealtime'
import { useAppSettings }     from '../../hooks/useSettings'
import { useAuth }            from '../../contexts/AuthContext'
import { usePermission }      from '../../hooks/usePermission'
import { isPulseEnabled }     from '../../lib/pulseHelpers'
import TaskFilters            from '../../components/tasks/TaskFilters'
import KanbanView             from '../../components/tasks/KanbanView'
import ListView               from '../../components/tasks/ListView'
import CalendarView           from '../../components/tasks/CalendarView'
import MyDayView              from '../../components/tasks/MyDayView'
import TaskDetailPanel        from '../../components/tasks/TaskDetailPanel'
import Modal                  from '../../components/ui/Modal'
import TaskForm               from '../../components/tasks/TaskForm'
import { exportTasks }        from '../../lib/exportExcel'
import JournalPage            from '../pulse/Journal'
import WorkloadChart          from '../../components/tasks/WorkloadChart'
import GanttMini              from '../../components/tasks/GanttMini'
import TaskDashboardView      from '../../components/tasks/TaskDashboardView'
import { TASK_STATUS, ROLES } from '../../utils/constants'

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

// ─── Fond Aurora Boréale — AUTONOME ──────────────────────────
// position:absolute dans le wrapper de la page
function AuroraBackground() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #020C10 0%, #030A14 40%, #050812 100%)',
    }}>
      {/* Rideau jade — gauche vertical */}
      <div style={{
        position: 'absolute',
        top: '-10%', left: '-5%',
        width: '38%', height: '120%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,.60) 20%, rgba(52,211,153,.45) 45%, rgba(16,185,129,.35) 65%, rgba(5,150,105,.20) 85%, transparent 100%)',
        filter: 'blur(45px)',
        transform: 'skewX(-6deg)',
      }} />

      {/* Rideau violet — centre légèrement décalé */}
      <div style={{
        position: 'absolute',
        top: '-15%', left: '28%',
        width: '34%', height: '130%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,.55) 18%, rgba(167,139,250,.40) 42%, rgba(124,58,237,.30) 68%, rgba(109,40,217,.15) 85%, transparent 100%)',
        filter: 'blur(50px)',
        transform: 'skewX(5deg)',
      }} />

      {/* Rideau or — droite */}
      <div style={{
        position: 'absolute',
        top: '-5%', right: '-8%',
        width: '36%', height: '110%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(245,158,11,.38) 22%, rgba(251,191,36,.28) 48%, rgba(245,158,11,.18) 70%, transparent 100%)',
        filter: 'blur(48px)',
        transform: 'skewX(-9deg)',
      }} />

      {/* Lueur basse — fusion des couleurs */}
      <div style={{
        position: 'absolute',
        bottom: '-5%', left: '15%',
        width: '70%', height: '35%',
        background: 'radial-gradient(ellipse, rgba(16,185,129,.18) 0%, rgba(139,92,246,.12) 45%, rgba(245,158,11,.08) 70%, transparent 100%)',
        filter: 'blur(60px)',
      }} />

      {/* Halo central discret */}
      <div style={{
        position: 'absolute',
        top: '5%', left: '38%',
        width: '28%', height: '55%',
        background: 'radial-gradient(ellipse, rgba(167,139,250,.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />

      {/* Étoiles */}
      {[
        [6,5,1],[15,12,0],[27,8,0],[42,4,1],[58,10,0],[69,6,0],[82,3,1],[93,9,0],
        [4,20,0],[20,25,1],[35,18,0],[50,22,0],[65,16,1],[78,21,0],[90,26,0],
        [11,35,0],[31,31,1],[47,37,0],[61,30,0],[74,34,0],[87,38,1],
        [8,45,1],[25,47,0],[43,43,0],[58,46,1],[72,42,0],[89,48,0],
        [3,58,0],[19,55,1],[38,60,0],[55,57,0],[70,53,0],[85,61,1],
      ].map(([l,t,big],i) => (
        <div key={i} style={{
          position: 'absolute',
          width: big ? 2 : 1, height: big ? 2 : 1,
          borderRadius: '50%',
          background: `rgba(255,255,255,${big ? 0.55 : 0.18 + (i%4)*0.08})`,
          left: `${l}%`, top: `${t}%`,
          boxShadow: big ? '0 0 5px rgba(255,255,255,.5)' : 'none',
        }} />
      ))}

      {/* Vignette bords doux */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(2,8,15,.50) 100%)',
      }} />
    </div>
  )
}

// ─── KPI cards Aurora vivantes ────────────────────────────────
const KPI_CONFIG = [
  { label:'Total',    key:'total',
    bg:'linear-gradient(135deg,rgba(255,255,255,.13),rgba(255,255,255,.06))',
    border:'rgba(255,255,255,.28)', accent:'#FFFFFF', glow:'rgba(255,255,255,.10)', shimmer:'rgba(255,255,255,.35)' },
  { label:'En cours', key:'en_cours',
    bg:'linear-gradient(135deg,rgba(16,185,129,.30),rgba(5,150,105,.16))',
    border:'rgba(52,211,153,.55)', accent:'#6EE7B7', glow:'rgba(16,185,129,.30)', shimmer:'rgba(52,211,153,.60)' },
  { label:'En revue', key:'en_revue',
    bg:'linear-gradient(135deg,rgba(139,92,246,.28),rgba(109,40,217,.15))',
    border:'rgba(167,139,250,.55)', accent:'#C4B5FD', glow:'rgba(139,92,246,.28)', shimmer:'rgba(167,139,250,.60)' },
  { label:'Urgentes', key:'urgentes',
    bg:'linear-gradient(135deg,rgba(239,68,68,.26),rgba(185,28,28,.13))',
    border:'rgba(252,165,165,.55)', accent:'#FCA5A5', glow:'rgba(239,68,68,.25)', shimmer:'rgba(252,165,165,.60)' },
]

function KpiCard({ cfg, value, total }) {
  const pct = cfg.key === 'total' ? 100 : (total > 0 ? Math.round((value/total)*100) : 0)
  return (
    <div style={{
      borderRadius: 20, padding: '22px 24px 18px',
      position: 'relative', overflow: 'hidden',
      background: cfg.bg,
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      border: `1px solid ${cfg.border}`,
      boxShadow: `0 8px 32px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,.22)`,
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg,transparent,${cfg.shimmer},transparent)` }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%',
        background:'linear-gradient(180deg,rgba(255,255,255,.09),transparent)',
        borderRadius:'20px 20px 0 0' }} />

      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.10em',
        textTransform:'uppercase', marginBottom:10, color:'rgba(255,255,255,.55)' }}>
        {cfg.label}
      </div>
      <div style={{ fontSize:48, fontWeight:900, lineHeight:1, letterSpacing:'-3px',
        color:cfg.accent, textShadow:`0 0 24px ${cfg.glow}` }}>
        {value}
      </div>
      <div style={{ marginTop:18, height:3, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:3,
          background:cfg.accent, boxShadow:`0 0 12px ${cfg.accent}`,
          transition:'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function Tasks() {
  const { profile }  = useAuth()
  const { can }      = usePermission()
  const { filters, activeFilters, activeView, setActiveView,
          updateFilter, resetFilters, hasActiveFilters } = useTaskFilters()
  const { data: settings } = useAppSettings()
  const pulseOn = isPulseEnabled(settings)

  const isManager   = MANAGER_ROLES.includes(profile?.role)
  const isDashboard = activeView === 'dashboard'
  const isJournal   = activeView === 'myday' && pulseOn
  const isTaskView  = !isJournal && !['myday','gantt','charge','dashboard'].includes(activeView)

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
    /* Wrapper relatif → Aurora en position:absolute dedans */
    <div style={{ position:'relative', minHeight:'100%', isolation:'isolate' }}>
      <AuroraBackground />

      {/* Contenu au-dessus de l'aurora */}
      <div className="flex flex-col gap-5 px-6 py-5" style={{ position:'relative', zIndex:1 }}>

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white" style={{ letterSpacing:'-0.4px' }}>Tâches</h2>
            <p className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,.40)' }}>
              Gérez et suivez toutes vos tâches
            </p>
          </div>
          {isTaskView && (
            <div className="flex items-center gap-2">
              <button onClick={() => exportTasks(tasks)} disabled={tasks.length === 0} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:10, cursor:'pointer',
                fontSize:12, fontWeight:500,
                background:'rgba(255,255,255,.08)',
                backdropFilter:'blur(20px)',
                border:'1px solid rgba(255,255,255,.14)',
                color:'rgba(255,255,255,.55)',
              }}>Excel</button>
              <button onClick={() => setShowCreateModal(true)} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 22px', borderRadius:10,
                background:'linear-gradient(135deg,rgba(16,185,129,.60),rgba(5,150,105,.42))',
                backdropFilter:'blur(20px)',
                border:'1px solid rgba(52,211,153,.60)',
                color:'#A7F3D0', fontSize:12, fontWeight:700, cursor:'pointer',
                boxShadow:'0 4px 22px rgba(16,185,129,.35), inset 0 1px 0 rgba(255,255,255,.28)',
                textShadow:'0 0 10px rgba(52,211,153,.6)',
              }}>+ Nouvelle tâche</button>
            </div>
          )}
        </div>

        {/* KPI CARDS */}
        {isTaskView && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {KPI_CONFIG.map(cfg => (
              <KpiCard key={cfg.key} cfg={cfg} value={stats[cfg.key]} total={stats.total} />
            ))}
          </div>
        )}

        {/* SWITCH VUES + FILTRES */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div style={{
            display:'flex', gap:3, padding:4, borderRadius:14,
            background:'rgba(255,255,255,.07)',
            backdropFilter:'blur(30px)',
            border:'1px solid rgba(255,255,255,.12)',
          }}>
            {visibleViews.map(v => (
              <button key={v.id} onClick={() => setActiveView(v.id)} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 13px', borderRadius:10,
                border:activeView===v.id ? '1px solid rgba(52,211,153,.40)' : '1px solid transparent',
                cursor:'pointer', fontSize:12, fontWeight:500, transition:'all .15s',
                background: activeView===v.id
                  ? 'linear-gradient(135deg,rgba(16,185,129,.38),rgba(5,150,105,.24))'
                  : 'transparent',
                color: activeView===v.id ? '#6EE7B7' : 'rgba(255,255,255,.38)',
                boxShadow: activeView===v.id ? '0 2px 12px rgba(16,185,129,.22)' : 'none',
              }}>
                <span>{v.icon}</span><span>{v.label}</span>
              </button>
            ))}
          </div>
          {isTaskView && (
            <button onClick={() => setShowFilters(f => !f)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 16px', borderRadius:11, cursor:'pointer',
              fontSize:12, fontWeight:500, transition:'all .2s',
              ...(showFilters || hasActiveFilters
                ? { background:'rgba(16,185,129,.18)', border:'1px solid rgba(52,211,153,.40)', color:'#6EE7B7' }
                : { background:'rgba(255,255,255,.07)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.45)' }
              ),
            }}>
              ⚙ Filtres
              {hasActiveFilters && <span style={{ width:6, height:6, borderRadius:'50%',
                background:'#34D399', boxShadow:'0 0 6px #34D399' }} />}
            </button>
          )}
        </div>

        {isTaskView && showFilters && (
          <div style={{ background:'rgba(255,255,255,.07)', backdropFilter:'blur(30px)',
            border:'1px solid rgba(255,255,255,.12)', borderRadius:14, padding:'12px 16px' }}>
            <TaskFilters filters={filters} updateFilter={updateFilter}
              resetFilters={resetFilters} hasActiveFilters={hasActiveFilters} />
          </div>
        )}

        {/* VUES */}
        {isDashboard && <div className="flex-1 min-h-0 overflow-y-auto"><TaskDashboardView onTaskClick={setSelectedTaskId} /></div>}
        {isJournal   && <div className="flex-1 min-h-0 overflow-y-auto"><JournalPage /></div>}
        {activeView==='myday'  && !pulseOn && !isDashboard && <div className="flex-1 min-h-0 overflow-y-auto"><MyDayView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
        {activeView==='gantt'  && <div className="flex-1 min-h-0 overflow-y-auto"><GanttMini /></div>}
        {activeView==='charge' && <div className="flex-1 min-h-0 overflow-y-auto"><WorkloadChart /></div>}

        {isTaskView && (
          isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div style={{ width:28, height:28, border:'2px solid rgba(52,211,153,.35)',
                borderTopColor:'#6EE7B7', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm py-8 text-center">Erreur : {error.message}</p>
          ) : (
            <div style={{ minHeight:400 }}>
              {activeView==='kanban'   && <div style={{ overflowX:'auto' }}><KanbanView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
              {activeView==='list'     && <ListView tasks={tasks} onTaskClick={setSelectedTaskId} />}
              {activeView==='calendar' && <CalendarView tasks={tasks} onTaskClick={setSelectedTaskId} />}
            </div>
          )
        )}
      </div>

      {selectedTaskId   && <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      {showCreateModal  && <Modal title="Nouvelle tâche" onClose={() => setShowCreateModal(false)}><TaskForm onClose={() => setShowCreateModal(false)} /></Modal>}
    </div>
  )
}
