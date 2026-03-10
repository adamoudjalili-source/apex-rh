// ============================================================
// APEX RH — Projects.jsx · S134  Glacé #7 — AUTONOME
// Iceberg bleu nuit pur — sans pollution de l'Aurora
// ============================================================
import { useState, useMemo } from 'react'
import {
  FolderKanban, Plus, LayoutList, Columns3, BarChart3,
  TrendingUp, AlertTriangle, DollarSign, GanttChartSquare,
} from 'lucide-react'
import { useAuth }            from '../../contexts/AuthContext'
import { useProjects, useDeleteProject } from '../../hooks/useProjects'
import { getProgressColor, formatBudget } from '../../lib/projectHelpers'
import ProjectFilters       from '../../components/projects/ProjectFilters'
import ProjectCard          from '../../components/projects/ProjectCard'
import ProjectForm          from '../../components/projects/ProjectForm'
import ProjectDetailPanel   from '../../components/projects/ProjectDetailPanel'
import PortfolioView        from '../../components/projects/PortfolioView'
import ProjectGanttAdvanced from '../../components/projects/ProjectGanttAdvanced'
import { exportProjects }   from '../../lib/exportExcel'
import { TASK_STATUS }      from '../../utils/constants'

// ─── Fond Glacé Iceberg — AUTONOME ───────────────────────────
function GlaceBackground() {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:0, pointerEvents:'none',
      overflow:'hidden',
      // Fond iceberg bleu nuit pur — complètement différent de l'Aurora
      background:'linear-gradient(160deg, #010A14 0%, #020E1C 35%, #010C18 65%, #020810 100%)',
    }}>
      {/* Grande masse glaciaire gauche */}
      <div style={{
        position:'absolute', top:'-20%', left:'-20%',
        width:'75%', height:'90%',
        background:'radial-gradient(ellipse at 40% 40%, rgba(14,165,233,.45) 0%, rgba(2,132,199,.28) 30%, rgba(7,89,133,.15) 55%, transparent 75%)',
        filter:'blur(55px)',
      }} />

      {/* Halo froid central-haut */}
      <div style={{
        position:'absolute', top:'-10%', left:'30%',
        width:'50%', height:'65%',
        background:'radial-gradient(ellipse, rgba(56,189,248,.30) 0%, rgba(14,165,233,.16) 40%, transparent 70%)',
        filter:'blur(60px)',
      }} />

      {/* Ligne de réfraction glaciaire — diagonale droite */}
      <div style={{
        position:'absolute', top:'0%', right:'-10%',
        width:'45%', height:'80%',
        background:'linear-gradient(145deg, rgba(186,230,253,.12) 0%, rgba(125,211,252,.07) 35%, rgba(56,189,248,.04) 60%, transparent 100%)',
        filter:'blur(25px)',
        transform:'skewX(-18deg)',
      }} />

      {/* Ligne de réfraction — gauche verticale fine */}
      <div style={{
        position:'absolute', top:'10%', left:'18%',
        width:'3%', height:'70%',
        background:'linear-gradient(180deg, transparent, rgba(186,230,253,.25), rgba(125,211,252,.18), transparent)',
        filter:'blur(8px)',
      }} />

      {/* Ligne de réfraction — centre */}
      <div style={{
        position:'absolute', top:'5%', left:'48%',
        width:'2%', height:'55%',
        background:'linear-gradient(180deg, transparent, rgba(186,230,253,.20), rgba(56,189,248,.14), transparent)',
        filter:'blur(6px)',
      }} />

      {/* Lueur basse froide — fond du glacier */}
      <div style={{
        position:'absolute', bottom:'-10%', left:'5%',
        width:'90%', height:'40%',
        background:'radial-gradient(ellipse, rgba(14,165,233,.18) 0%, rgba(2,132,199,.08) 50%, transparent 75%)',
        filter:'blur(55px)',
      }} />

      {/* Particules de glace (étoiles froides) */}
      {[
        [7,6,1],[18,13,0],[30,8,0],[44,4,1],[59,11,0],[70,7,0],[83,3,1],[94,9,0],
        [5,22,0],[21,26,1],[37,19,0],[52,23,0],[66,17,1],[80,22,0],[92,27,0],
        [13,36,0],[32,33,1],[49,38,0],[63,31,0],[76,35,0],[89,39,1],
        [9,47,1],[28,49,0],[45,44,0],[60,48,1],[74,43,0],[91,50,0],
      ].map(([l,t,big],i) => (
        <div key={i} style={{
          position:'absolute',
          width: big ? 2 : 1, height: big ? 2 : 1,
          borderRadius:'50%',
          // Étoiles froides : légèrement bleutées
          background: big
            ? 'rgba(186,230,253,.75)'
            : `rgba(${i%3===0 ? '186,230,253' : '255,255,255'},${0.15+(i%5)*0.07})`,
          left:`${l}%`, top:`${t}%`,
          boxShadow: big ? '0 0 5px rgba(186,230,253,.60)' : 'none',
        }} />
      ))}

      {/* Vignette droite et bas */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 80% 50%, transparent 30%, rgba(1,8,16,.55) 80%)',
      }} />
    </div>
  )
}

// ─── KPI Glacé ───────────────────────────────────────────────
const KPI_DEFS = [
  { key:'total',       label:'Total',       Icon:FolderKanban,  accent:'#E0F2FE', rgb:'224,242,254',
    bg:'linear-gradient(135deg,rgba(186,230,253,.18),rgba(125,211,252,.09))',
    border:'rgba(186,230,253,.45)', glow:'rgba(186,230,253,.18)', shimmer:'rgba(224,242,254,.50)' },
  { key:'enCours',     label:'En cours',    Icon:BarChart3,      accent:'#38BDF8', rgb:'56,189,248',
    bg:'linear-gradient(135deg,rgba(14,165,233,.35),rgba(2,132,199,.20))',
    border:'rgba(56,189,248,.60)', glow:'rgba(14,165,233,.32)', shimmer:'rgba(56,189,248,.65)' },
  { key:'avgProg',     label:'Progression', Icon:TrendingUp,     accent:'#86EFAC', rgb:'134,239,172',
    bg:'linear-gradient(135deg,rgba(34,197,94,.28),rgba(21,128,61,.15))',
    border:'rgba(134,239,172,.50)', glow:'rgba(34,197,94,.25)', shimmer:'rgba(134,239,172,.55)' },
  { key:'totalBudget', label:'Budget',      Icon:DollarSign,     accent:'#FDE68A', rgb:'253,230,138',
    bg:'linear-gradient(135deg,rgba(245,158,11,.28),rgba(180,83,9,.15))',
    border:'rgba(253,230,138,.48)', glow:'rgba(245,158,11,.24)', shimmer:'rgba(253,230,138,.55)' },
  { key:'atRisk',      label:'Risques',     Icon:AlertTriangle,  accent:'#FCA5A5', rgb:'252,165,165',
    bg:'linear-gradient(135deg,rgba(239,68,68,.26),rgba(185,28,28,.14))',
    border:'rgba(252,165,165,.48)', glow:'rgba(239,68,68,.22)', shimmer:'rgba(252,165,165,.55)' },
]

function KpiCard({ def, value }) {
  return (
    <div style={{
      borderRadius:20, padding:'20px 22px 16px',
      position:'relative', overflow:'hidden',
      background:def.bg,
      backdropFilter:'blur(40px) saturate(200%)',
      WebkitBackdropFilter:'blur(40px) saturate(200%)',
      border:`1px solid ${def.border}`,
      boxShadow:`0 8px 36px ${def.glow}, inset 0 1px 0 rgba(255,255,255,.25)`,
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg,transparent,${def.shimmer},transparent)` }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%',
        background:'linear-gradient(180deg,rgba(255,255,255,.10),transparent)',
        borderRadius:'20px 20px 0 0' }} />

      <div style={{ width:32, height:32, borderRadius:10, marginBottom:12,
        background:`rgba(${def.rgb},.20)`,
        border:`1px solid rgba(${def.rgb},.35)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 0 14px rgba(${def.rgb},.18)` }}>
        <def.Icon size={15} style={{ color:def.accent }} />
      </div>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.10em',
        textTransform:'uppercase', marginBottom:8, color:'rgba(255,255,255,.52)' }}>
        {def.label}
      </div>
      <div style={{ fontSize:30, fontWeight:900, lineHeight:1, letterSpacing:'-1.5px',
        color:def.accent, textShadow:`0 0 22px ${def.glow}` }}>
        {value}
      </div>
      <div style={{ marginTop:14, height:3, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
        <div style={{ height:'100%', width:'65%', borderRadius:3,
          background:def.accent, opacity:.80,
          boxShadow:`0 0 12px ${def.accent}` }} />
      </div>
    </div>
  )
}

export default function Projects() {
  const { profile } = useAuth()
  const [view, setView]       = useState('list')
  const [filters, setFilters] = useState({ search:'', status:'', priority:'' })
  const [showForm, setShowForm]               = useState(false)
  const [editingProject, setEditingProject]   = useState(null)
  const [detailProjectId, setDetailProjectId] = useState(null)

  const { data: projects = [], isLoading, error } = useProjects(filters)
  const deleteProject = useDeleteProject()

  const stats = useMemo(() => {
    if (!projects.length) return null
    const avgProgress = projects.reduce((s,p) => s+(p.progress||0), 0) / projects.length
    const totalBudget = projects.reduce((s,p) => s+(p.budget||0), 0)
    const atRisk = projects.filter(p =>
      p.status === TASK_STATUS.EN_COURS && (p.risks?.length||0) > 0
    ).length
    return { total:projects.length, avgProgress, totalBudget, atRisk,
      enCours:projects.filter(p => p.status===TASK_STATUS.EN_COURS).length }
  }, [projects])

  const handleEdit = (project) => { setEditingProject(project); setShowForm(true); setDetailProjectId(null) }
  const handleDelete = async (project) => {
    if (!confirm(`Supprimer "${project.name}" ?`)) return
    try { await deleteProject.mutateAsync(project.id) } catch {}
  }

  const VIEWS_LIST = [
    { id:'list',      Icon:LayoutList,       label:'Liste'        },
    { id:'portfolio', Icon:Columns3,          label:'Portefeuille' },
    { id:'gantt',     Icon:GanttChartSquare, label:'Gantt'        },
  ]

  const kpiValues = stats ? {
    total:       stats.total,
    enCours:     stats.enCours,
    avgProg:     `${Math.round(stats.avgProgress)}%`,
    totalBudget: formatBudget(stats.totalBudget),
    atRisk:      stats.atRisk,
  } : null

  return (
    <div style={{ position:'relative', minHeight:'100%', isolation:'isolate' }}>
      <GlaceBackground />

      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto" style={{ position:'relative', zIndex:1 }}>

        {/* EN-TÊTE */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div style={{ width:46, height:46, borderRadius:14,
              background:'rgba(14,165,233,.28)',
              backdropFilter:'blur(40px)',
              border:'1px solid rgba(56,189,248,.45)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 22px rgba(14,165,233,.25)' }}>
              <FolderKanban size={20} style={{ color:'#38BDF8' }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white" style={{ letterSpacing:'-0.5px' }}>Projets</h1>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.38)', marginTop:2 }}>
                Gestion de projets · Gantt · Portefeuille
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportProjects(projects)} disabled={projects.length===0} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'9px 16px', borderRadius:11, cursor:'pointer',
              fontSize:12, fontWeight:500,
              background:'rgba(255,255,255,.08)', backdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,.14)', color:'rgba(255,255,255,.52)' }}>
              Excel
            </button>
            {/* Bouton Glacé signature — bleu pâle solide Vision Pro */}
            <button onClick={() => { setEditingProject(null); setShowForm(true) }} style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'9px 22px', borderRadius:11,
              background:'rgba(186,230,253,.90)',
              backdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,.65)',
              color:'#0A1E30', fontSize:12, fontWeight:800, cursor:'pointer',
              boxShadow:'0 4px 26px rgba(14,165,233,.40), inset 0 1px 0 rgba(255,255,255,.70)',
            }}>
              <Plus size={14} /> Nouveau projet
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        {kpiValues && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
            {KPI_DEFS.map(def => <KpiCard key={def.key} def={def} value={kpiValues[def.key]} />)}
          </div>
        )}

        {/* VUES + FILTRES */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div style={{ display:'flex', gap:3, padding:4, borderRadius:14,
            background:'rgba(255,255,255,.07)', backdropFilter:'blur(30px)',
            border:'1px solid rgba(56,189,248,.18)' }}>
            {VIEWS_LIST.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 14px', borderRadius:10,
                border: view===v.id ? '1px solid rgba(56,189,248,.45)' : '1px solid transparent',
                cursor:'pointer', fontSize:12, fontWeight:500, transition:'all .15s',
                background: view===v.id
                  ? 'linear-gradient(135deg,rgba(14,165,233,.38),rgba(2,132,199,.24))'
                  : 'transparent',
                color: view===v.id ? '#38BDF8' : 'rgba(255,255,255,.38)',
                boxShadow: view===v.id ? '0 2px 14px rgba(14,165,233,.24)' : 'none',
              }}>
                <v.Icon size={13} />{v.label}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <ProjectFilters filters={filters} onChange={setFilters} />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div style={{ width:28, height:28, border:'2px solid rgba(56,189,248,.35)',
              borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          </div>
        )}
        {error && <div style={{ padding:'12px 16px', borderRadius:12,
          background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)',
          color:'#FCA5A5', fontSize:13 }}>Erreur : {error.message}</div>}

        {!isLoading && view==='list' && (
          <div className="space-y-3">
            {projects.length===0
              ? <EmptyState onNew={() => { setEditingProject(null); setShowForm(true) }} />
              : projects.map(p => <ProjectCard key={p.id} project={p} onEdit={handleEdit}
                  onDelete={handleDelete} onViewDetail={proj => setDetailProjectId(proj.id)} />)
            }
          </div>
        )}
        {!isLoading && view==='portfolio' && (
          projects.length===0
            ? <EmptyState onNew={() => { setEditingProject(null); setShowForm(true) }} />
            : <PortfolioView projects={projects} onSelect={proj => setDetailProjectId(proj.id)} />
        )}
        {view==='gantt' && <ProjectGanttAdvanced />}

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
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'64px 0', textAlign:'center' }}>
      <div style={{ width:64, height:64, borderRadius:20, marginBottom:16,
        background:'rgba(14,165,233,.18)', backdropFilter:'blur(40px)',
        border:'1px solid rgba(56,189,248,.28)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <FolderKanban size={26} style={{ color:'rgba(56,189,248,.50)' }} />
      </div>
      <p style={{ color:'rgba(255,255,255,.35)', fontSize:14, marginBottom:4 }}>Aucun projet trouvé</p>
      <p style={{ color:'rgba(255,255,255,.18)', fontSize:12, marginBottom:20 }}>
        Créez votre premier projet pour commencer
      </p>
      <button onClick={onNew} style={{
        display:'flex', alignItems:'center', gap:6, padding:'9px 22px', borderRadius:11,
        background:'rgba(186,230,253,.88)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(255,255,255,.60)', color:'#0A1E30',
        fontSize:12, fontWeight:800, cursor:'pointer',
        boxShadow:'0 4px 22px rgba(14,165,233,.32)' }}>
        <Plus size={13} /> Créer un projet
      </button>
    </div>
  )
}
