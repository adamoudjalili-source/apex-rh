// ============================================================
// APEX RH — Projects.jsx · S134
// Design Glacé #7 — CORRECTION: iceberg vraiment visible
// Fond local bleu nuit + halos froids + KPIs glass bleu fort
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

// ─── KPI cards Glacé — bleu givré fort ───────────────────────
const KPI_DEFS = [
  { key: 'total',       label: 'Total',       accent: '#E0F2FE', rgb: '224,242,254', Icon: FolderKanban,
    bg: 'linear-gradient(135deg, rgba(224,242,254,.14) 0%, rgba(186,230,253,.07) 100%)',
    border: 'rgba(186,230,253,.40)', glow: 'rgba(186,230,253,.15)', shimmer: 'rgba(224,242,254,.45)' },
  { key: 'enCours',     label: 'En cours',    accent: '#7DD3FC', rgb: '125,211,252', Icon: BarChart3,
    bg: 'linear-gradient(135deg, rgba(14,165,233,.28) 0%, rgba(2,132,199,.16) 100%)',
    border: 'rgba(125,211,252,.55)', glow: 'rgba(14,165,233,.30)', shimmer: 'rgba(125,211,252,.55)' },
  { key: 'avgProg',     label: 'Progression', accent: '#86EFAC', rgb: '134,239,172', Icon: TrendingUp,
    bg: 'linear-gradient(135deg, rgba(34,197,94,.22) 0%, rgba(21,128,61,.12) 100%)',
    border: 'rgba(134,239,172,.45)', glow: 'rgba(34,197,94,.22)', shimmer: 'rgba(134,239,172,.50)' },
  { key: 'totalBudget', label: 'Budget',      accent: '#FDE68A', rgb: '253,230,138', Icon: DollarSign,
    bg: 'linear-gradient(135deg, rgba(245,158,11,.22) 0%, rgba(180,83,9,.12) 100%)',
    border: 'rgba(253,230,138,.40)', glow: 'rgba(245,158,11,.20)', shimmer: 'rgba(253,230,138,.45)' },
  { key: 'atRisk',      label: 'Risques',     accent: '#FCA5A5', rgb: '252,165,165', Icon: AlertTriangle,
    bg: 'linear-gradient(135deg, rgba(239,68,68,.20) 0%, rgba(185,28,28,.10) 100%)',
    border: 'rgba(252,165,165,.40)', glow: 'rgba(239,68,68,.18)', shimmer: 'rgba(252,165,165,.45)' },
]

function KpiCard({ def, value }) {
  return (
    <div style={{
      borderRadius: 20, padding: '20px 22px 16px',
      position: 'relative', overflow: 'hidden',
      background: def.bg,
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      border: `1px solid ${def.border}`,
      boxShadow: `0 8px 32px ${def.glow}, inset 0 1px 0 rgba(255,255,255,.22)`,
    }}>
      {/* Shimmer haut */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${def.shimmer}, transparent)` }} />
      {/* Reflet glass */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
        background: 'linear-gradient(180deg, rgba(255,255,255,.09) 0%, transparent 100%)',
        borderRadius: '20px 20px 0 0' }} />

      {/* Icône */}
      <div style={{ width: 32, height: 32, borderRadius: 10, marginBottom: 12,
        background: `rgba(${def.rgb},.18)`,
        border: `1px solid rgba(${def.rgb},.30)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 12px rgba(${def.rgb},.15)` }}>
        <def.Icon size={15} style={{ color: def.accent }} />
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: 8, color: 'rgba(255,255,255,.50)' }}>
        {def.label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-1.5px',
        color: def.accent, textShadow: `0 0 20px ${def.glow}` }}>
        {value}
      </div>
      {/* Barre lumineuse */}
      <div style={{ marginTop: 14, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.08)' }}>
        <div style={{ height: '100%', width: '65%', borderRadius: 3,
          background: def.accent, opacity: .75,
          boxShadow: `0 0 10px ${def.accent}` }} />
      </div>
    </div>
  )
}

// ─── Fond Glacé local (overlay sur l'aurore) ─────────────────
// Vient se superposer à l'aurore pour donner l'ambiance iceberg
function GlaceBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Halo bleu froid gauche */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-15%',
        width: '60%', height: '80%',
        background: 'radial-gradient(ellipse, rgba(14,165,233,.30) 0%, rgba(2,132,199,.15) 40%, transparent 70%)',
        filter: 'blur(60px)',
      }} />
      {/* Halo bleu centre */}
      <div style={{
        position: 'absolute', top: '10%', left: '30%',
        width: '45%', height: '65%',
        background: 'radial-gradient(ellipse, rgba(56,189,248,.20) 0%, rgba(14,165,233,.08) 50%, transparent 75%)',
        filter: 'blur(70px)',
      }} />
      {/* Lignes de réfraction glaciaires */}
      <div style={{
        position: 'absolute', top: '5%', right: '-5%',
        width: '35%', height: '60%',
        background: 'linear-gradient(135deg, rgba(186,230,253,.08) 0%, rgba(125,211,252,.04) 50%, transparent 100%)',
        filter: 'blur(30px)',
        transform: 'skewX(-15deg)',
      }} />
      {/* Lueur basse froide */}
      <div style={{
        position: 'absolute', bottom: 0, left: '10%',
        width: '80%', height: '30%',
        background: 'radial-gradient(ellipse, rgba(14,165,233,.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />
    </div>
  )
}

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
    // Wrapper relatif pour le fond Glacé local
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <GlaceBackground />

      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>

        {/* EN-TÊTE */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: 'rgba(14,165,233,.22)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(125,211,252,.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(14,165,233,.20)',
            }}>
              <FolderKanban size={20} style={{ color: '#7DD3FC' }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.5px' }}>Projets</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                Gestion de projets · Gantt · Portefeuille
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProjects(projects)}
              disabled={projects.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 11, cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                background: 'rgba(255,255,255,.07)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.50)',
              }}>
              Excel
            </button>
            {/* Bouton Glacé — bleu pâle solide signature Vision Pro */}
            <button
              onClick={() => { setEditingProject(null); setShowForm(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 22px', borderRadius: 11,
                background: 'rgba(186,230,253,.88)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,.60)',
                color: '#0C2340',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(14,165,233,.35), inset 0 1px 0 rgba(255,255,255,.65)',
              }}>
              <Plus size={14} /> Nouveau projet
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        {kpiValues && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
            {KPI_DEFS.map(def => <KpiCard key={def.key} def={def} value={kpiValues[def.key]} />)}
          </div>
        )}

        {/* BARRE VUES + FILTRES */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div style={{
            display: 'flex', gap: 3, padding: 4, borderRadius: 14,
            background: 'rgba(255,255,255,.07)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(186,230,253,.15)',
          }}>
            {VIEWS_LIST.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, transition: 'all .15s',
                ...(view === v.id
                  ? {
                      background: 'linear-gradient(135deg, rgba(14,165,233,.35) 0%, rgba(2,132,199,.22) 100%)',
                      color: '#7DD3FC',
                      border: '1px solid rgba(125,211,252,.40)',
                      boxShadow: '0 2px 12px rgba(14,165,233,.20)',
                    }
                  : { background: 'transparent', color: 'rgba(255,255,255,.35)' }
                ),
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
            <div style={{ width: 28, height: 28,
              border: '2px solid rgba(125,211,252,.35)',
              borderTopColor: '#7DD3FC',
              borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12,
            background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)',
            color: '#FCA5A5', fontSize: 13 }}>
            Erreur : {error.message}
          </div>
        )}

        {/* VUES */}
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
        {!isLoading && view === 'portfolio' && (
          projects.length === 0
            ? <EmptyState onNew={() => { setEditingProject(null); setShowForm(true) }} />
            : <PortfolioView projects={projects} onSelect={proj => setDetailProjectId(proj.id)} />
        )}
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
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 16,
        background: 'rgba(14,165,233,.15)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(125,211,252,.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FolderKanban size={26} style={{ color: 'rgba(125,211,252,.45)' }} />
      </div>
      <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 14, marginBottom: 4 }}>Aucun projet trouvé</p>
      <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 12, marginBottom: 20 }}>
        Créez votre premier projet pour commencer
      </p>
      <button onClick={onNew} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 11,
        background: 'rgba(186,230,253,.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,.55)', color: '#0C2340',
        fontSize: 12, fontWeight: 800, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(14,165,233,.30)' }}>
        <Plus size={13} /> Créer un projet
      </button>
    </div>
  )
}
