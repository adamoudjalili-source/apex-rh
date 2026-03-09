// ============================================================
// APEX RH — Tasks.jsx  ·  Session 36 v3
// Exécution pure : Kanban / Liste / Calendrier / Ma Journée
// Tous les modules PULSE → /intelligence et /engagement
// ============================================================
import { useState } from 'react'
import { useTasks }         from '../../hooks/useTasks'
import { useTaskFilters }   from '../../hooks/useTaskFilters'
import { useTaskRealtime }  from '../../hooks/useTaskRealtime'
import { useAppSettings }   from '../../hooks/useSettings'
import { isPulseEnabled }   from '../../lib/pulseHelpers'
import TaskFilters          from '../../components/tasks/TaskFilters'
import KanbanView           from '../../components/tasks/KanbanView'
import ListView             from '../../components/tasks/ListView'
import CalendarView         from '../../components/tasks/CalendarView'
import MyDayView            from '../../components/tasks/MyDayView'
import TaskDetailPanel      from '../../components/tasks/TaskDetailPanel'
import Modal                from '../../components/ui/Modal'
import TaskForm             from '../../components/tasks/TaskForm'
import ExportButton         from '../../components/ui/ExportButton'
import { exportTasks }      from '../../lib/exportExcel'
import JournalPage          from '../pulse/Journal'
// ✅ S77
import WorkloadChart        from '../../components/tasks/WorkloadChart'
import GanttMini            from '../../components/tasks/GanttMini'
import { TASK_STATUS } from '../../utils/constants'

const VIEWS = [
  { id:'kanban',   label:'Kanban',      icon:'▦' },
  { id:'list',     label:'Liste',       icon:'☰' },
  { id:'calendar', label:'Calendrier',  icon:'📅' },
  { id:'myday',    label:'Ma Journée',  icon:'☀' },
  { id:'gantt',    label:'Gantt',       icon:'📊' },
  { id:'charge',   label:'Charge',      icon:'⚖' },
]

export default function Tasks() {
  const { filters, activeFilters, activeView, setActiveView,
          updateFilter, resetFilters, hasActiveFilters } = useTaskFilters()
  const { data: settings }  = useAppSettings()
  const pulseOn              = isPulseEnabled(settings)
  const isJournal            = activeView === 'myday' && pulseOn
  const isTaskView           = !isJournal && activeView !== 'myday' && activeView !== 'gantt' && activeView !== 'charge'

  const { data: tasks = [], isLoading, error } = useTasks(isTaskView ? activeFilters : {})
  const [selectedTaskId,  setSelectedTaskId]  = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters,     setShowFilters]     = useState(false)

  useTaskRealtime()

  const stats = {
    total:    tasks.length,
    en_cours: tasks.filter(t=>t.status===TASK_STATUS.EN_COURS).length,
    en_revue: tasks.filter(t=>t.status==='en_revue').length,
    urgentes: tasks.filter(t=>t.priority==='urgente'&&t.status!=='terminee').length,
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>Tâches</h1>
          <p className="text-sm text-white/35 mt-0.5">Gérez et suivez toutes vos tâches</p>
        </div>
        {isTaskView && (
          <div className="flex items-center gap-2">
            <ExportButton onExport={() => exportTasks(tasks)} label="Excel" disabled={tasks.length===0}/>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all">
              + Nouvelle tâche
            </button>
          </div>
        )}
      </div>

      {isTaskView && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Total',    value:stats.total,    color:'text-gray-300',   bg:'bg-white/5' },
            { label:'En cours', value:stats.en_cours, color:'text-amber-400',  bg:'bg-amber-500/5' },
            { label:'En revue', value:stats.en_revue, color:'text-violet-400', bg:'bg-violet-500/5' },
            { label:'Urgentes', value:stats.urgentes, color:'text-red-400',    bg:'bg-red-500/5' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/8 rounded-xl px-4 py-3`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView===v.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <span>{v.icon}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        {isTaskView && (
          <button onClick={() => setShowFilters(v=>!v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${
              showFilters||hasActiveFilters ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10' : 'border-white/10 text-gray-400 hover:text-white'
            }`}>
            ⚙ Filtres
            {hasActiveFilters && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"/>}
          </button>
        )}
      </div>

      {isTaskView && showFilters && (
        <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
          <TaskFilters filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} hasActiveFilters={hasActiveFilters}/>
        </div>
      )}

      {isJournal && (
        <div className="flex-1 min-h-0 overflow-y-auto"><JournalPage/></div>
      )}

      {!isJournal && activeView === 'myday' && !pulseOn && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MyDayView tasks={tasks} onTaskClick={setSelectedTaskId}/>
        </div>
      )}

      {isTaskView && (
        isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-400 text-sm">Erreur : {error.message}</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeView==='kanban'   && <div className="h-full overflow-x-auto"><KanbanView tasks={tasks} onTaskClick={setSelectedTaskId}/></div>}
            {activeView==='list'     && <ListView tasks={tasks} onTaskClick={setSelectedTaskId}/>}
            {activeView==='calendar' && <div className="h-full overflow-y-auto"><CalendarView tasks={tasks} onTaskClick={setSelectedTaskId}/></div>}
            {activeView==='gantt'    && <div className="h-full overflow-y-auto"><GanttMini /></div>}
            {activeView==='charge'   && <div className="h-full overflow-y-auto"><WorkloadChart /></div>}
          </div>
        )
      )}

      {selectedTaskId  && <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)}/>}
      {showCreateModal && <Modal title="Nouvelle tâche" onClose={() => setShowCreateModal(false)}><TaskForm onClose={() => setShowCreateModal(false)}/></Modal>}
    </div>
  )
}
