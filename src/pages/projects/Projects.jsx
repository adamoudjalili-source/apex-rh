// ============================================================
// APEX RH — Projects.jsx (page principale)
// Session 11 — Module Projets complet
// ============================================================
import { useState, useMemo } from 'react'
import {
  FolderKanban, Plus, LayoutList, Columns3, BarChart3,
  TrendingUp, AlertTriangle, DollarSign, GanttChartSquare,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useProjects, useDeleteProject } from '../../hooks/useProjects'
import {
  getProgressColor, formatBudget,
} from '../../lib/projectHelpers'

// Composants
import ProjectFilters from '../../components/projects/ProjectFilters'
import ProjectCard from '../../components/projects/ProjectCard'
import ProjectForm from '../../components/projects/ProjectForm'
import ProjectDetailPanel from '../../components/projects/ProjectDetailPanel'
import PortfolioView from '../../components/projects/PortfolioView'
import ProjectGanttAdvanced from '../../components/projects/ProjectGanttAdvanced'
import ExportButton from '../../components/ui/ExportButton'
import { exportProjects } from '../../lib/exportExcel'
import { TASK_STATUS } from '../../utils/constants'

export default function Projects() {
  const { profile } = useAuth()

  // État
  const [view, setView] = useState('list') // 'list' | 'portfolio' | 'gantt'
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })

  // Modales
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [detailProjectId, setDetailProjectId] = useState(null)

  // Data
  const { data: projects = [], isLoading, error } = useProjects(filters)
  const deleteProject = useDeleteProject()

  // Stats
  const stats = useMemo(() => {
    if (!projects.length) return null
    const avgProgress = projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const atRisk = projects.filter((p) =>
      p.status === TASK_STATUS.EN_COURS && (p.risks?.length || 0) > 0
    ).length
    return {
      total: projects.length,
      avgProgress,
      totalBudget,
      atRisk,
      enCours: projects.filter((p) => p.status === TASK_STATUS.EN_COURS).length,
    }
  }, [projects])

  // Handlers
  const handleEdit = (project) => {
    setEditingProject(project)
    setShowForm(true)
    setDetailProjectId(null)
  }

  const handleDelete = async (project) => {
    if (!confirm(`Supprimer le projet "${project.name}" et tout son contenu ?`)) return
    try { await deleteProject.mutateAsync(project.id) } catch (err) { }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-black text-white flex items-center gap-3"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <FolderKanban size={22} className="text-indigo-400" />
            </div>
            Projets
          </h1>
          <p className="text-sm text-white/30 mt-1 ml-[52px]">
            Gestion de projets · Gantt · Portefeuille
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton onExport={() => exportProjects(projects)} label="Excel" disabled={projects.length === 0} />
          <button
            onClick={() => { setEditingProject(null); setShowForm(true) }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            <Plus size={16} />
            Nouveau projet
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            icon={FolderKanban}
            label="Total"
            value={stats.total}
            color="#4F46E5"
          />
          <StatCard
            icon={BarChart3}
            label="En cours"
            value={stats.enCours}
            color="#3B82F6"
          />
          <StatCard
            icon={TrendingUp}
            label="Progression"
            value={`${Math.round(stats.avgProgress)}%`}
            color={getProgressColor(stats.avgProgress)}
          />
          <StatCard
            icon={DollarSign}
            label="Budget total"
            value={formatBudget(stats.totalBudget)}
            color="#C9A227"
          />
          <StatCard
            icon={AlertTriangle}
            label="Avec risques"
            value={stats.atRisk}
            color={stats.atRisk > 0 ? '#F59E0B' : '#10B981'}
          />
        </div>
      )}

      {/* Barre vue + filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
          {[
            { id: 'list', icon: LayoutList, label: 'Liste' },
            { id: 'portfolio', icon: Columns3, label: 'Portefeuille' },
            { id: 'gantt', icon: GanttChartSquare, label: 'Gantt' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                view === v.id
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <ProjectFilters filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm">
          Chargement des projets…
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Erreur : {error.message}
        </div>
      )}

      {/* Vue Liste */}
      {!isLoading && view === 'list' && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetail={(proj) => setDetailProjectId(proj.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Vue Portefeuille */}
      {!isLoading && view === 'portfolio' && (
        projects.length === 0 ? (
          <EmptyState />
        ) : (
          <PortfolioView
            projects={projects}
            onSelect={(proj) => setDetailProjectId(proj.id)}
          />
        )
      )}

      {/* Vue Gantt avancé */}
      {view === 'gantt' && (
        <ProjectGanttAdvanced />
      )}

      {/* Modale formulaire */}
      <ProjectForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingProject(null) }}
        project={editingProject}
      />

      {/* Panneau détail */}
      {detailProjectId && (
        <ProjectDetailPanel
          projectId={detailProjectId}
          onClose={() => setDetailProjectId(null)}
          onEdit={(proj) => { setDetailProjectId(null); handleEdit(proj) }}
        />
      )}
    </div>
  )
}

// ─── Composants internes ─────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] text-white/30">{label}</span>
      </div>
      <p className="text-xl font-black text-white" style={{ color }}>{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <FolderKanban size={24} className="text-white/15" />
      </div>
      <p className="text-white/30 text-sm mb-1">Aucun projet trouvé</p>
      <p className="text-white/15 text-xs">Créez votre premier projet pour commencer</p>
    </div>
  )
}
