// ============================================================
// APEX RH — Projects.jsx · S134
// Module Projets complet — Design Glacé #7
// Iceberg glass · Vision Pro · blur(40px) saturate(180%)
// Logique S11 inchangée
// ============================================================
import { useState, useMemo } from 'react'
import {
  FolderKanban, Plus, LayoutList, Columns3, BarChart3,
  TrendingUp, AlertTriangle, DollarSign, GanttChartSquare,
} from 'lucide-react'
import { useAuth }            from '../../contexts/AuthContext'
import { useProjects, useDeleteProject } from '../../hooks/useProjects'
import { getProgressColor, formatBudget } from '../../lib/projectHelpers'

import ProjectFilters      from '../../components/projects/ProjectFilters'
import ProjectCard         from '../../components/projects/ProjectCard'
import ProjectForm         from '../../components/projects/ProjectForm'
import ProjectDetailPanel  from '../../components/projects/ProjectDetailPanel'
import PortfolioView       from '../../components/projects/PortfolioView'
import ProjectGanttAdvanced from '../../components/projects/ProjectGanttAdvanced'
import ExportButton        from '../../components/ui/ExportButton'
import { exportProjects }  from '../../lib/exportExcel'
import { TASK_STATUS }     from '../../utils/constants'

// ─── Styles Glacé ────────────────────────────────────────────
const G = {
  panel: {
    background: 'rgba(255,255,255,.07)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,.13)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 8px 32px rgba(0,0,0,.25)',
  },
  light: {
    background: 'rgba(255,255,255,.05)',
    backdropFilter: 'blur(30px) saturate(160%)',
    WebkitBackdropFilter: 'blur(30px) saturate(160%)',
    border: '1px solid rgba(255,255,255,.09)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1)',
  },
  active: {
    background: 'rgba(147,197,253,.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(147,197,253,.28)',
    color: '#BAE6FD',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.15), 0 2px 12px rgba(147,197,253,.15)',
  },
}

// ─── KPI card Glacé ──────────────────────────────────────────
const KPI_DEFS = [
  { key: 'total',       label: 'Total',       accent: 'rgba(255,255,255,.88)', rgb: '255,255,255', Icon: FolderKanban  },
  { key: 'enCours',     label: 'En cours',    accent: '#93C5FD',               rgb: '147,197,253', Icon: BarChart3     },
  { key: 'avgProg',     label: 'Progression', accent: '#86EFAC',               rgb: '134,239,172', Icon: TrendingUp    },
  { key: 'totalBudget', label: 'Budget',      accent: '#FDE68A',               rgb: '253,230,138', Icon: DollarSign    },
  { key: 'atRisk',      label: 'Risques',     accent: '#FCA5A5',               rgb: '252,165,165', Icon: AlertTriangle },
]

function KpiCard({ def, value }) {
  return (
    <div style={{
      borderRadius: 18, padding: '18px 20px',
      position: 'relative', overflow: 'hidden', cursor: 'pointer',
      ...G.panel,
      border: `1px solid rgba(${def.rgb},.18)`,
      boxShadow: `0 6px 28px rgba(${def.rgb},.08), inset 0 1px 0 rgba(255,255,255,.15)`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg,transparent,rgba(${def.rgb},.4),transparent)` }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%',
        background: 'linear-gradient(180deg,rgba(255,255,255,.05),transparent)',
        borderRadius: '18px 18px 0 0' }} />
      <div style={{ width: 30, height: 30, borderRadius: 9, marginBottom: 12,
        background: `rgba(${def.rgb},.12)`, border: `1px solid rgba(${def.rgb},.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <def.Icon size={14} style={{ color: def.accent }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.38)',
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>{def.label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1,
        letterSpacing: '-1px', color: def.accent }}>{value}</div>
      <div style={{ marginTop: 14, height: 2, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
        <div style={{ height: '100%', width: '60%', borderRadius: 2,
          background: def.accent, opacity: .6,
          boxShadow: `0 0 8px rgba(${def.rgb},.5)` }} />
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────
export default function Projects() {
  const { profile } = useAuth()
  const [view, setView]       = useState('list')
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })
  const [showForm, setShowForm]               = useState(false)
  const [editingProject, setEditingProject]   = useState(null)
  const [detailProjectId, setDetailProjectId] = useState(null)

  const { data: projects = [], isLoading, error } = useProjects(filters)
  const deleteProject = useDeleteProject()

  const stats = useMemo(() => {
    if (!projects.length) return null
    const avgProgress = projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    const atRisk = projects.filter(p =>
      p.status === TASK_STATUS.EN_COURS && (p.risks?.length || 0) > 0
    ).length
    return {
      total: projects.length,
      avgProgress,
      totalBudget,
      atRisk,
      enCours: projects.filter(p => p.status === TASK_STATUS.EN_COURS).length,
    }
  }, [projects])

  const handleEdit = (project) => {
    setEditingProject(project)
    setShowForm(true)
    setDetailProjectId(null)
  }

  const handleDelete = async (project) => {
    if (!confirm(`Supprimer le projet "${project.name}" et tout son contenu ?`)) return
    try { await deleteProject.mutateAsync(project.id) } catch (err) {}
  }

  const VIEWS_LIST = [
    { id: 'list',      Icon: LayoutList,       label: 'Liste'        },
    { id: 'portfolio', Icon: Columns3,          label: 'Portefeuille' },
    { id: 'gantt',     Icon: GanttChartSquare,  label: 'Gantt'        },
  ]

  const kpiValues = stats ? {
    total:       stats.total,
    enCours:     stats.enCours,
    avgProg:     `${Math.round(stats.avgProgress)}%`,
    totalBudget: formatBudget(stats.totalBudget),
    atRisk:      stats.atRisk,
  } : null

  return (
    <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">

      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 14, ...G.panel,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={20} style={{ color: '#93C5FD' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>Projets</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
              Gestion de projets · Gantt · Portefeuille
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => exportProjects(projects)} disabled={projects.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
              borderRadius: 11, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              ...G.light, color: 'rgba(255,255,255,.5)' }}>
            Excel
          </button>
          <button onClick={() => { setEditingProject(null); setShowForm(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
              borderRadius: 11, background: 'rgba(147,197,253,.82)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,.45)', color: '#0A1628',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(147,197,253,.28), inset 0 1px 0 rgba(255,255,255,.55)' }}>
            <Plus size={14} /> Nouveau projet
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      {kpiValues && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {KPI_DEFS.map(def => <KpiCard key={def.key} def={def} value={kpiValues[def.key]} />)}
        </div>
      )}

      {/* BARRE VUE + FILTRES */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div style={{ display: 'flex', gap: 3, padding: 4, borderRadius: 13, ...G.light }}>
          {VIEWS_LIST.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12,
              fontWeight: 500, transition: 'all .15s',
              ...(view === v.id ? G.active : { background: 'transparent', color: 'rgba(255,255,255,.35)' }),
            }}>
              <v.Icon size={13} />{v.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <ProjectFilters filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* LOADING / ERROR */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div style={{ width: 28, height: 28, border: '2px solid rgba(147,197,253,.4)',
            borderTopColor: '#93C5FD', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12,
          background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)',
          color: '#FCA5A5', fontSize: 13 }}>
          Erreur : {error.message}
        </div>
      )}

      {/* VUE LISTE */}
      {!isLoading && view === 'list' && (
        <div className="space-y-3">
          {projects.length === 0
            ? <EmptyState onNew={() => { setEditingProject(null); setShowForm(true) }} />
            : projects.map(p => (
                <ProjectCard key={p.id} project={p} onEdit={handleEdit}
                  onDelete={handleDelete} onViewDetail={proj => setDetailProjectId(proj.id)} />
              ))
          }
        </div>
      )}

      {/* VUE PORTEFEUILLE */}
      {!isLoading && view === 'portfolio' && (
        projects.length === 0
          ? <EmptyState onNew={() => { setEditingProject(null); setShowForm(true) }} />
          : <PortfolioView projects={projects} onSelect={proj => setDetailProjectId(proj.id)} />
      )}

      {/* VUE GANTT */}
      {view === 'gantt' && <ProjectGanttAdvanced />}

      {/* MODALES */}
      <ProjectForm isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingProject(null) }}
        project={editingProject} />

      {detailProjectId && (
        <ProjectDetailPanel projectId={detailProjectId}
          onClose={() => setDetailProjectId(null)}
          onEdit={proj => { setDetailProjectId(null); handleEdit(proj) }} />
      )}
    </div>
  )
}

// ─── Empty state Glacé ───────────────────────────────────────
function EmptyState({ onNew }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 16,
        background: 'rgba(255,255,255,.07)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FolderKanban size={26} style={{ color: 'rgba(255,255,255,.18)' }} />
      </div>
      <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14, marginBottom: 4 }}>Aucun projet trouvé</p>
      <p style={{ color: 'rgba(255,255,255,.15)', fontSize: 12, marginBottom: 20 }}>
        Créez votre premier projet pour commencer
      </p>
      <button onClick={onNew} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 11,
        background: 'rgba(147,197,253,.8)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,.4)', color: '#0A1628',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(147,197,253,.25), inset 0 1px 0 rgba(255,255,255,.5)' }}>
        <Plus size={13} /> Créer un projet
      </button>
    </div>
  )
}
