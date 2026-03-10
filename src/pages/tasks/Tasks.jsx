// ============================================================
// APEX RH — Tasks.jsx · S134
// Design Glacé #7 — unifié avec Projects
// Accent jade/vert pour l'onglet Tâches
// ============================================================
import { useTheme } from '../../contexts/ThemeContext'
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
import {
  CheckSquare, LayoutGrid, List, Calendar, Sun,
  BarChart2, Scale, PieChart, SlidersHorizontal, Plus, FileSpreadsheet
} from 'lucide-react'

const MANAGER_ROLES = [ROLES.MANAGER, ROLES.CHEF_SERVICE, ROLES.CHEF_DIVISION, ROLES.DIRECTEUR, ROLES.RH, ROLES.ADMINISTRATEUR]

const VIEWS = [
  { id:'kanban',    label:'Kanban',     Icon:LayoutGrid   },
  { id:'list',      label:'Liste',      Icon:List         },
  { id:'calendar',  label:'Calendrier', Icon:Calendar     },
  { id:'myday',     label:'Ma Journée', Icon:Sun          },
  { id:'gantt',     label:'Gantt',      Icon:BarChart2    },
  { id:'charge',    label:'Charge',     Icon:Scale        },
  { id:'dashboard', label:'Dashboard',  Icon:PieChart, managerOnly:true },
]

// ─── Fond Glacé — identique à Projects ───────────────────────
function GlaceBackground() {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:0, pointerEvents:'none',
      overflow:'hidden',
      background:'linear-gradient(160deg, #141E30 0%, #0F172A 30%, #0C1525 65%, #091020 100%)',
    }}>
      <div style={{ position:'absolute', top:'-20%', left:'-20%', width:'75%', height:'90%',
        background:'radial-gradient(ellipse at 40% 40%, rgba(14,165,233,.45) 0%, rgba(2,132,199,.28) 30%, rgba(7,89,133,.15) 55%, transparent 75%)',
        filter:'blur(55px)' }} />
      <div style={{ position:'absolute', top:'-10%', left:'30%', width:'50%', height:'65%',
        background:'radial-gradient(ellipse, rgba(56,189,248,.30) 0%, rgba(14,165,233,.16) 40%, transparent 70%)',
        filter:'blur(60px)' }} />
      <div style={{ position:'absolute', top:'0%', right:'-10%', width:'45%', height:'80%',
        background:'linear-gradient(145deg, rgba(186,230,253,.12) 0%, rgba(125,211,252,.07) 35%, rgba(56,189,248,.04) 60%, transparent 100%)',
        filter:'blur(25px)', transform:'skewX(-18deg)' }} />
      <div style={{ position:'absolute', top:'10%', left:'18%', width:'3%', height:'70%',
        background:'linear-gradient(180deg, transparent, rgba(186,230,253,.25), rgba(125,211,252,.18), transparent)',
        filter:'blur(8px)' }} />
      <div style={{ position:'absolute', top:'5%', left:'48%', width:'2%', height:'55%',
        background:'linear-gradient(180deg, transparent, rgba(186,230,253,.20), rgba(56,189,248,.14), transparent)',
        filter:'blur(6px)' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'5%', width:'90%', height:'40%',
        background:'radial-gradient(ellipse, rgba(14,165,233,.18) 0%, rgba(2,132,199,.08) 50%, transparent 75%)',
        filter:'blur(55px)' }} />
      {[
        [7,6,1],[18,13,0],[30,8,0],[44,4,1],[59,11,0],[70,7,0],[83,3,1],[94,9,0],
        [5,22,0],[21,26,1],[37,19,0],[52,23,0],[66,17,1],[80,22,0],[92,27,0],
        [13,36,0],[32,33,1],[49,38,0],[63,31,0],[76,35,0],[89,39,1],
        [9,47,1],[28,49,0],[45,44,0],[60,48,1],[74,43,0],[91,50,0],
      ].map(([l,t,big],i) => (
        <div key={i} style={{
          position:'absolute', width:big?2:1, height:big?2:1, borderRadius:'50%',
          background:big ? 'rgba(186,230,253,.75)' : `rgba(${i%3===0?'186,230,253':'255,255,255'},${0.15+(i%5)*0.07})`,
          left:`${l}%`, top:`${t}%`,
          boxShadow:big ? '0 0 5px rgba(186,230,253,.60)' : 'none',
        }} />
      ))}
      <div style={{ position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 80% 50%, transparent 30%, rgba(1,8,16,.55) 80%)' }} />
    </div>
  )
}

// ─── KPI Tâches — palette jade sur base Glacé ────────────────
const KPI_CONFIG = [
  { label:'Total',    key:'total',
    tint:'rgba(186,230,253,.16)', border:'rgba(186,230,253,.40)',
    accent:'#BAE6FD', rgb:'186,230,253', glow:'rgba(186,230,253,.14)', shimmer:'rgba(186,230,253,.45)' },
  { label:'En cours', key:'en_cours',
    tint:'rgba(16,185,129,.20)', border:'rgba(52,211,153,.50)',
    accent:'#6EE7B7', rgb:'110,231,183', glow:'rgba(16,185,129,.20)', shimmer:'rgba(52,211,153,.55)' },
  { label:'En revue', key:'en_revue',
    tint:'rgba(14,165,233,.22)', border:'rgba(56,189,248,.52)',
    accent:'#38BDF8', rgb:'56,189,248', glow:'rgba(14,165,233,.20)', shimmer:'rgba(56,189,248,.55)' },
  { label:'Urgentes', key:'urgentes',
    tint:'rgba(239,68,68,.16)', border:'rgba(252,165,165,.40)',
    accent:'#FCA5A5', rgb:'252,165,165', glow:'rgba(239,68,68,.15)', shimmer:'rgba(252,165,165,.45)' },
]

function KpiCard({ cfg, value, total }) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const pct = cfg.key==='total' ? 100 : (total>0 ? Math.round((value/total)*100) : 0)
  return (
    <div style={{
      borderRadius:20, padding:'20px 22px 16px',
      position:'relative', overflow:'hidden',
      background: isLight ? 'white' : 'linear-gradient(135deg, rgba(20,30,50,.90) 0%, rgba(15,23,42,.86) 100%)',
      backdropFilter:'blur(40px)',
      WebkitBackdropFilter:'blur(40px)',
      border:`1px solid ${cfg.border}`,
      boxShadow:`0 4px 24px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.12)`,
    }}>
      <div style={{ position:'absolute', inset:0, borderRadius:20, background:cfg.tint, pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, zIndex:1,
        background:`linear-gradient(90deg,transparent,${cfg.shimmer},transparent)` }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%', zIndex:1,
        background:'linear-gradient(180deg,rgba(255,255,255,.08),transparent)',
        borderRadius:'20px 20px 0 0' }} />
      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.10em',
          textTransform:'uppercase', marginBottom:10, color:'rgba(255,255,255,.60)' }}>
          {cfg.label}
        </div>
        <div style={{ fontSize:42, fontWeight:900, lineHeight:1, letterSpacing:'-2.5px',
          color:cfg.accent, textShadow:`0 0 20px ${cfg.glow}` }}>
          {value}
        </div>
        <div style={{ marginTop:16, height:3, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
          <div style={{ height:'100%', width:`${pct}%`, borderRadius:3,
            background:cfg.accent, opacity:.80,
            boxShadow:`0 0 10px ${cfg.accent}`, transition:'width 1s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Style partagé Glacé ────────────────────────────────────
// glacePanel moved inside component
// glaceActive moved inside component

export default function Tasks() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const glacePanel = {
  background:'rgba(255,255,255,.07)',
  backdropFilter:'blur(30px)',
  border: isLight ? '1px solid #E6EBF1' : '1px solid rgba(56,189,248,18)',
}
  const glaceActive = {
  background:'linear-gradient(135deg,rgba(14,165,233,.38),rgba(2,132,199,.24))',
  border: isLight ? '1px solid #E6EBF1' : '1px solid rgba(56,189,248,45)',
  color:'#38BDF8',
  boxShadow:'0 2px 14px rgba(14,165,233,.24)',
}
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
    <div style={{ position:'relative', minHeight:'100%', isolation:'isolate' }}>
      <GlaceBackground />

      <div className="px-6 py-5 space-y-5" style={{ position:'relative', zIndex:1 }}>

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width:46, height:46, borderRadius:14,
              background: isLight ? 'transparent' : 'rgba(16,185,129,22)', backdropFilter:'blur(40px)',
              border: isLight ? '1px solid #E6EBF1' : '1px solid rgba(52,211,153,40)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 22px rgba(16,185,129,.20)' }}>
              <CheckSquare size={20} style={{ color:'#6EE7B7' }} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white" style={{ letterSpacing:'-0.5px' }}>Tâches</h2>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.38)', marginTop:2 }}>
                Gérez et suivez toutes vos tâches
              </p>
            </div>
          </div>
          {isTaskView && (
            <div className="flex items-center gap-2">
              <button onClick={() => exportTasks(tasks)} disabled={tasks.length===0} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'9px 16px', borderRadius:11, cursor:'pointer',
                fontSize:12, fontWeight:500,
                background:'rgba(255,255,255,.08)', backdropFilter:'blur(20px)',
                border: isLight ? '1px solid #E6EBF1' : '1px solid rgba(255,255,255,14)', color:'rgba(255,255,255,.52)' }}>
                <FileSpreadsheet size={13} /> Excel
              </button>
              {/* Bouton Glacé jade — même pattern que "Nouveau projet" */}
              <button onClick={() => setShowCreateModal(true)} style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 22px', borderRadius:11,
                background:'rgba(167,243,208,.88)',
                backdropFilter:'blur(20px)',
                border: isLight ? '1px solid #E6EBF1' : '1px solid rgba(255,255,255,65)',
                color:'#052E16', fontSize:12, fontWeight:800, cursor:'pointer',
                boxShadow:'0 4px 26px rgba(16,185,129,.40), inset 0 1px 0 rgba(255,255,255,.70)' }}>
                <Plus size={14} /> Nouvelle tâche
              </button>
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
          <div style={{ display:'flex', gap:3, padding:4, borderRadius:14, ...glacePanel }}>
            {visibleViews.map(v => (
              <button key={v.id} onClick={() => setActiveView(v.id)} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 14px', borderRadius:10,
                border: activeView===v.id ? '1px solid rgba(56,189,248,.45)' : '1px solid transparent',
                cursor:'pointer', fontSize:12, fontWeight:500, transition:'all .15s',
                ...(activeView===v.id ? glaceActive : { background:'transparent', color:'rgba(255,255,255,.38)' }),
              }}>
                <v.Icon size={13} />{v.label}
              </button>
            ))}
          </div>
          {isTaskView && (
            <button onClick={() => setShowFilters(f => !f)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 16px', borderRadius:11, cursor:'pointer',
              fontSize:12, fontWeight:500, transition:'all .2s',
              ...(showFilters || hasActiveFilters
                ? { background: isLight ? 'transparent' : 'rgba(14,165,233,18)', border: isLight ? '1px solid #E6EBF1' : '1px solid rgba(56,189,248,40)', color:'#38BDF8' }
                : { ...glacePanel, color:'rgba(255,255,255,.45)' }
              ),
            }}>
              <SlidersHorizontal size={13} /> Filtres
              {hasActiveFilters && <span style={{ width:6, height:6, borderRadius:'50%',
                background:'#38BDF8', boxShadow:'0 0 6px #38BDF8' }} />}
            </button>
          )}
        </div>

        {isTaskView && showFilters && (
          <div style={{ ...glacePanel, borderRadius:14, padding:'12px 16px' }}>
            <TaskFilters filters={filters} updateFilter={updateFilter}
              resetFilters={resetFilters} hasActiveFilters={hasActiveFilters} />
          </div>
        )}

        {/* VUES */}
        {isDashboard && <div className="min-h-0 overflow-y-auto"><TaskDashboardView onTaskClick={setSelectedTaskId} /></div>}
        {isJournal   && <div className="min-h-0 overflow-y-auto"><JournalPage /></div>}
        {activeView==='myday'  && !pulseOn && !isDashboard && <div className="min-h-0 overflow-y-auto"><MyDayView tasks={tasks} onTaskClick={setSelectedTaskId} /></div>}
        {activeView==='gantt'  && <div className="min-h-0 overflow-y-auto"><GanttMini /></div>}
        {activeView==='charge' && <div className="min-h-0 overflow-y-auto"><WorkloadChart /></div>}

        {isTaskView && (
          isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div style={{ width:28, height:28, border:'2px solid rgba(56,189,248,.35)',
                borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            </div>
          ) : error ? (
            <p style={{ color:'#FCA5A5', fontSize:13, padding:'16px 0', textAlign:'center' }}>Erreur : {error.message}</p>
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
