// ============================================================
// APEX RH — Tasks.jsx — Page principale Module Tâches
// ✅ Session 25 — Phase G : Fusion UI PULSE
//    Onglets Performance (Board), Rapports, Awards ajoutés
//    Ma Journée → Journal.jsx (PULSE) quand pulse activé
// ✅ Session 28 — Ajout onglet Feedback 360°
//    Visible uniquement si feedback360_enabled dans settings.modules
//    Zéro modification backend (hooks, tables, RLS inchangés)
// ✅ Session 33 — Ajout onglet Analytics Avancés & Prédictif
//    Visible uniquement si analytics_enabled dans settings.modules
// ============================================================
import { useState } from 'react'
import { Activity, FileText, Trophy, MessageSquare, BarChart2, BrainCircuit, Zap, ClipboardList, TrendingUp } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { useTaskFilters } from '../../hooks/useTaskFilters'
import { useTaskRealtime } from '../../hooks/useTaskRealtime'
import { useAppSettings } from '../../hooks/useSettings'
import { isPulseEnabled } from '../../lib/pulseHelpers'
import TaskFilters from '../../components/tasks/TaskFilters'
import KanbanView from '../../components/tasks/KanbanView'
import ListView from '../../components/tasks/ListView'
import CalendarView from '../../components/tasks/CalendarView'
import MyDayView from '../../components/tasks/MyDayView'
import TaskDetailPanel from '../../components/tasks/TaskDetailPanel'
import Modal from '../../components/ui/Modal'
import TaskForm from '../../components/tasks/TaskForm'
import ExportButton from '../../components/ui/ExportButton'
import { exportTasks } from '../../lib/exportExcel'

// ✅ Session 25 — Pages PULSE importées comme onglets (Phase G — Étape 2)
// ✅ Session 28 — Feedback 360° ajouté comme onglet PULSE
// ✅ Session 29 — Surveys d'Engagement ajouté comme onglet PULSE
// ✅ Session 31 — Gamification Avancée ajouté comme onglet PULSE
// ✅ Session 32 — Review Cycles Formels ajouté comme onglet PULSE
// Les composants eux-mêmes ne sont PAS modifiés — seul leur emplacement UI change
import JournalPage           from '../pulse/Journal'
import BoardPage             from '../pulse/Board'
import ReportsPage           from '../pulse/Reports'
import AwardsPage            from '../pulse/Awards'
import Feedback360Page       from '../pulse/Feedback360'
import EngagementSurveysPage from '../pulse/EngagementSurveys'
import AICoachPage           from '../pulse/AICoach'
import GamificationPage      from '../pulse/Gamification'
import ReviewCyclesPage      from '../pulse/ReviewCycles'
import AnalyticsPage         from '../pulse/Analytics'

// ─── Vues Tâches (inchangées) ──────────────────────────────
const TASK_VIEWS = [
  {
    id: 'kanban',
    label: 'Kanban',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'Liste',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'myday',
    label: 'Ma Journée',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

// ─── Vues PULSE (affichées uniquement si pulse_enabled) ─────
const PULSE_VIEWS = [
  { id: 'performance', label: 'Performance', icon: <Activity     className="w-4 h-4" />, module: null },
  { id: 'rapports',    label: 'Rapports',    icon: <FileText     className="w-4 h-4" />, module: null },
  { id: 'awards',      label: 'Awards',      icon: <Trophy       className="w-4 h-4" />, module: null },
  { id: 'feedback360', label: 'Feedback 360°', icon: <MessageSquare className="w-4 h-4" />, module: 'feedback360_enabled' },
  { id: 'surveys',     label: 'Surveys',     icon: <BarChart2    className="w-4 h-4" />, module: 'surveys_engagement_enabled' },
  { id: 'ia_coach',    label: 'IA Coach',    icon: <BrainCircuit className="w-4 h-4" />, module: 'ia_coach_enabled' },
  { id: 'gamification', label: 'Gamification', icon: <Zap        className="w-4 h-4" />, module: 'gamification_enabled' },
  { id: 'review_cycles', label: 'Review Cycles', icon: <ClipboardList className="w-4 h-4" />, module: 'review_cycles_enabled' },
  { id: 'analytics',    label: 'Analytics',     icon: <TrendingUp   className="w-4 h-4" />, module: 'analytics_enabled' },
]

// IDs des onglets PULSE purs (sans Ma Journée)
const PULSE_VIEW_IDS = new Set(['performance', 'rapports', 'awards', 'feedback360', 'surveys', 'ia_coach', 'gamification', 'review_cycles', 'analytics'])

// ─── Composant principal ─────────────────────────────────────
export default function Tasks() {
  const {
    filters, activeFilters, activeView, setActiveView,
    updateFilter, resetFilters, hasActiveFilters,
  } = useTaskFilters()

  const { data: settings, isLoading: settingsLoading } = useAppSettings()

  // PULSE actif ?
  const pulseOn = !settingsLoading && isPulseEnabled(settings)

  // Feedback360 actif ?
  const feedback360On = !settingsLoading && settings?.modules?.feedback360_enabled === true

  // Surveys d'Engagement actifs ?
  const surveysOn = !settingsLoading && settings?.modules?.surveys_engagement_enabled === true

  // IA Coach actif ?
  const iaCoachOn = !settingsLoading && settings?.modules?.ia_coach_enabled === true

  // Gamification actif ?
  const gamificationOn = !settingsLoading && settings?.modules?.gamification_enabled === true

  // Review Cycles actif ?
  const reviewCyclesOn = !settingsLoading && settings?.modules?.review_cycles_enabled === true

  // Analytics Avancés actif ?
  const analyticsOn = !settingsLoading && settings?.modules?.analytics_enabled === true

  // Vues PULSE filtrées selon les modules activés
  const visiblePulseViews = PULSE_VIEWS.filter(v => {
    if (v.module === null) return true
    if (v.module === 'feedback360_enabled') return feedback360On
    if (v.module === 'surveys_engagement_enabled') return surveysOn
    if (v.module === 'ia_coach_enabled') return iaCoachOn
    if (v.module === 'gamification_enabled') return gamificationOn
    if (v.module === 'review_cycles_enabled') return reviewCyclesOn
    if (v.module === 'analytics_enabled') return analyticsOn
    return false
  })

  // Quel type de contenu afficher ?
  const isPulseTab       = PULSE_VIEW_IDS.has(activeView)
  const isMaJourneePulse = activeView === 'myday' && pulseOn
  const isTaskContent    = !isPulseTab && !isMaJourneePulse

  // Charger les tâches seulement pour les vues tâches (TanStack Query met en cache)
  const { data: tasks = [], isLoading, error } = useTasks(
    isTaskContent && activeView !== 'myday' ? activeFilters : {}
  )

  const [selectedTaskId,   setSelectedTaskId]   = useState(null)
  const [showCreateModal,  setShowCreateModal]   = useState(false)
  const [showFilters,      setShowFilters]       = useState(false)

  // Temps réel (tâches)
  useTaskRealtime()

  // Stats rapides
  const stats = {
    total:    tasks.length,
    en_cours: tasks.filter(t => t.status === 'en_cours').length,
    en_revue: tasks.filter(t => t.status === 'en_revue').length,
    urgentes: tasks.filter(t => t.priority === 'urgente' && t.status !== 'terminee').length,
  }

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {pulseOn ? 'Tâches & Performance' : 'Tâches'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isPulseTab
              ? 'Suivi de performance et reconnaissance'
              : 'Gérez et suivez toutes vos tâches'}
          </p>
        </div>

        {/* Boutons Export + Nouvelle tâche — masqués sur onglets PULSE */}
        {isTaskContent && (
          <div className="flex items-center gap-2">
            <ExportButton
              onExport={() => exportTasks(tasks)}
              label="Excel"
              disabled={tasks.length === 0}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle tâche
            </button>
          </div>
        )}
      </div>

      {/* ── Stats rapides (tâches uniquement) ─────────────── */}
      {isTaskContent && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-gray-300',   bg: 'bg-white/5' },
            { label: 'En cours', value: stats.en_cours, color: 'text-amber-400',  bg: 'bg-amber-500/5' },
            { label: 'En revue', value: stats.en_revue, color: 'text-violet-400', bg: 'bg-violet-500/5' },
            { label: 'Urgentes', value: stats.urgentes, color: 'text-red-400',    bg: 'bg-red-500/5' },
          ].map(stat => (
            <div
              key={stat.label}
              className={`${stat.bg} border border-white/8 rounded-xl px-4 py-3`}
            >
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Sélecteur de vue */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap">

          {/* Onglets Tâches */}
          {TASK_VIEWS.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === view.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {view.icon}
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}

          {/* Séparateur + Onglets PULSE (si pulse activé) */}
          {pulseOn && (
            <>
              <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />
              {visiblePulseViews.map(view => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === view.id
                      ? 'text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={
                    activeView === view.id
                      ? { background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }
                      : undefined
                  }
                >
                  {view.icon}
                  <span className="hidden sm:inline">{view.label}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Filtres (tâches uniquement) */}
        {isTaskContent && (
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtres
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* ── Filtres expandable (tâches uniquement) ─────────── */}
      {isTaskContent && showFilters && (
        <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
          <TaskFilters
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      {/* ── Contenu PULSE — onglets Performance / Rapports / Awards / Feedback360 ── */}
      {isPulseTab && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeView === 'performance' && <BoardPage />}
          {activeView === 'rapports'    && <ReportsPage />}
          {activeView === 'awards'      && <AwardsPage />}
          {activeView === 'feedback360' && <Feedback360Page />}
          {activeView === 'surveys'     && <EngagementSurveysPage />}
          {activeView === 'ia_coach'    && <AICoachPage />}
          {activeView === 'gamification' && <GamificationPage />}
          {activeView === 'review_cycles' && <ReviewCyclesPage />}
          {activeView === 'analytics'    && <AnalyticsPage />}
        </div>
      )}

      {/* ── Ma Journée PULSE (Journal.jsx — brief matinal + journal du soir) ── */}
      {isMaJourneePulse && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <JournalPage />
        </div>
      )}

      {/* ── Contenu Tâches ─────────────────────────────────── */}
      {isTaskContent && (
        isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Chargement des tâches...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 text-sm">Erreur : {error.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs text-gray-500 hover:text-gray-300"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeView === 'kanban' && (
              <div className="h-full overflow-x-auto">
                <KanbanView tasks={tasks} onTaskClick={setSelectedTaskId} />
              </div>
            )}
            {activeView === 'list' && (
              <ListView tasks={tasks} onTaskClick={setSelectedTaskId} />
            )}
            {activeView === 'calendar' && (
              <div className="h-full overflow-y-auto">
                <CalendarView tasks={tasks} onTaskClick={setSelectedTaskId} />
              </div>
            )}
            {/* Ma Journée sans PULSE = vue tâches du jour */}
            {activeView === 'myday' && !pulseOn && (
              <div className="h-full overflow-y-auto">
                <MyDayView tasks={tasks} onTaskClick={setSelectedTaskId} />
              </div>
            )}
          </div>
        )
      )}

      {/* ── Panneau détail ─────────────────────────────────── */}
      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* ── Modal création ─────────────────────────────────── */}
      {showCreateModal && (
        <Modal title="Nouvelle tâche" onClose={() => setShowCreateModal(false)}>
          <TaskForm onClose={() => setShowCreateModal(false)} />
        </Modal>
      )}
    </div>
  )
}
