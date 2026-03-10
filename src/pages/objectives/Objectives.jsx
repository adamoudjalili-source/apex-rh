// ============================================================
// APEX RH — Objectives.jsx · S134
// Design Glacé #7 — unifié avec Projects + Tasks
// Accent violet/or pour l'onglet OKR
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Target, Plus, LayoutList, GitBranch, BarChart3,
  TrendingUp, AlertCircle, RefreshCw, Network, LayoutDashboard,
  FileSpreadsheet,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useObjectives, useUpdateKeyResult, useDeleteKeyResult, useDeleteObjective } from '../../hooks/useObjectives'
import { useCurrentCycle } from '../../hooks/useOkrCycles'
import {
  canCreateObjective, getLevelInfo, getScoreColor, formatScore,
  formatScorePercent, LEVEL_ORDER, OBJECTIVE_LEVELS,
} from '../../lib/objectiveHelpers'

import OkrPeriodSelector    from '../../components/objectives/OkrPeriodSelector'
import OkrFilters           from '../../components/objectives/OkrFilters'
import ObjectiveCard        from '../../components/objectives/ObjectiveCard'
import ObjectiveCascade     from '../../components/objectives/ObjectiveCascade'
import ObjectiveForm        from '../../components/objectives/ObjectiveForm'
import KeyResultForm        from '../../components/objectives/KeyResultForm'
import ObjectiveDetailPanel from '../../components/objectives/ObjectiveDetailPanel'
import ExportButton         from '../../components/ui/ExportButton'
import { exportObjectives } from '../../lib/exportExcel'

import OKRCycleManager  from '../../components/okr/OKRCycleManager'
import OKRCascadeView   from '../../components/okr/OKRCascadeView'
import OKRDashboard     from '../../components/okr/OKRDashboard'
import EmptyState       from '../../components/ui/EmptyState'

// ─── Fond Glacé — identique Projects/Tasks ───────────────────
function GlaceBackground() {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:0, pointerEvents:'none',
      overflow:'hidden',
      background:'linear-gradient(160deg, #010A14 0%, #020E1C 35%, #010C18 65%, #020810 100%)',
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

// ─── KPI OKR — palette violet/or sur base Glacé ─────────────
const KPI_OKR = [
  { key:'total',    label:'Objectifs',  Icon:Target,       accent:'#BAE6FD', rgb:'186,230,253',
    tint:'rgba(186,230,253,.14)', border:'rgba(186,230,253,.38)', glow:'rgba(186,230,253,.12)', shimmer:'rgba(186,230,253,.42)' },
  { key:'avgScore', label:'Score moy.', Icon:TrendingUp,   accent:'#C4B5FD', rgb:'196,181,253',
    tint:'rgba(139,92,246,.20)', border:'rgba(167,139,250,.48)', glow:'rgba(139,92,246,.18)', shimmer:'rgba(167,139,250,.52)' },
  { key:'totalKrs', label:'Key Results',Icon:BarChart3,    accent:'#6EE7B7', rgb:'110,231,183',
    tint:'rgba(16,185,129,.18)', border:'rgba(52,211,153,.45)', glow:'rgba(16,185,129,.16)', shimmer:'rgba(52,211,153,.50)' },
  { key:'enRetard', label:'En retard',  Icon:AlertCircle,  accent:'#FCA5A5', rgb:'252,165,165',
    tint:'rgba(239,68,68,.16)', border:'rgba(252,165,165,.40)', glow:'rgba(239,68,68,.14)', shimmer:'rgba(252,165,165,.45)' },
]

function KpiCard({ def, value }) {
  return (
    <div style={{
      borderRadius:20, padding:'20px 22px 16px',
      position:'relative', overflow:'hidden',
      background:'linear-gradient(135deg, rgba(2,14,26,.85) 0%, rgba(3,12,22,.80) 100%)',
      backdropFilter:'blur(40px)',
      WebkitBackdropFilter:'blur(40px)',
      border:`1px solid ${def.border}`,
      boxShadow:`0 4px 24px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.12)`,
    }}>
      <div style={{ position:'absolute', inset:0, borderRadius:20, background:def.tint, pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, zIndex:1,
        background:`linear-gradient(90deg,transparent,${def.shimmer},transparent)` }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%', zIndex:1,
        background:'linear-gradient(180deg,rgba(255,255,255,.08),transparent)',
        borderRadius:'20px 20px 0 0' }} />
      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ width:32, height:32, borderRadius:10, marginBottom:12,
          background:`rgba(${def.rgb},.16)`,
          border:`1px solid rgba(${def.rgb},.28)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 12px rgba(${def.rgb},.14)` }}>
          <def.Icon size={15} style={{ color:def.accent }} />
        </div>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.10em',
          textTransform:'uppercase', marginBottom:8, color:'rgba(255,255,255,.58)' }}>
          {def.label}
        </div>
        <div style={{ fontSize:30, fontWeight:900, lineHeight:1, letterSpacing:'-1.5px',
          color:def.accent, textShadow:`0 0 18px ${def.glow}` }}>
          {value}
        </div>
        <div style={{ marginTop:14, height:3, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
          <div style={{ height:'100%', width:'65%', borderRadius:3,
            background:def.accent, opacity:.75,
            boxShadow:`0 0 10px ${def.accent}` }} />
        </div>
      </div>
    </div>
  )
}

// ─── Style partagé Glacé ────────────────────────────────────
const glacePanel = {
  background:'rgba(255,255,255,.07)',
  backdropFilter:'blur(30px)',
  border:'1px solid rgba(139,92,246,.18)',
}

const VIEWS_OKR = [
  { id:'list',      Icon:LayoutList,    label:'Liste'       },
  { id:'cascade',   Icon:GitBranch,     label:'Cascade'     },
  { id:'stats',     Icon:BarChart3,     label:'Stats'       },
  { id:'cycles',    Icon:RefreshCw,     label:'Cycles'      },
  { id:'alignment', Icon:Network,       label:'Alignement'  },
  { id:'dashboard', Icon:LayoutDashboard, label:'Dashboard' },
]

export default function Objectives() {
  const { profile } = useAuth()

  const [selectedPeriodId, setSelectedPeriodId] = useState(null)
  const [view, setView] = useState('list')
  const [filters, setFilters] = useState({ search:'', level:'', status:'' })
  const [activeCycleId, setActiveCycleId] = useState(null)
  const { data: currentCycle } = useCurrentCycle()

  const [showObjForm, setShowObjForm]   = useState(false)
  const [editingObj, setEditingObj]     = useState(null)
  const [showKrForm, setShowKrForm]     = useState(false)
  const [krFormObjId, setKrFormObjId]   = useState(null)
  const [editingKr, setEditingKr]       = useState(null)
  const [detailObjId, setDetailObjId]   = useState(null)

  const { data: objectives = [], isLoading, error } = useObjectives(selectedPeriodId, filters)
  const updateKr = useUpdateKeyResult()
  const deleteKr = useDeleteKeyResult()
  const deleteObj = useDeleteObjective()

  const stats = useMemo(() => {
    if (!objectives.length) return null
    const avgScore = objectives.reduce((s, o) => s + (o.progress_score || 0), 0) / objectives.length
    const totalKrs = objectives.reduce((s, o) => s + (o.key_results?.length || 0), 0)
    const byLevel = {}
    LEVEL_ORDER.forEach(l => {
      const objs = objectives.filter(o => o.level === l)
      byLevel[l] = { count:objs.length,
        avgScore: objs.length ? objs.reduce((s,o) => s+(o.progress_score||0),0)/objs.length : 0 }
    })
    return { total:objectives.length, avgScore, totalKrs, byLevel }
  }, [objectives])

  const childCounts = useMemo(() => {
    const counts = {}
    objectives.forEach(o => {
      if (o.parent_id) counts[o.parent_id] = (counts[o.parent_id] || 0) + 1
    })
    return counts
  }, [objectives])

  const handleEditObj    = (obj) => { setEditingObj(obj); setShowObjForm(true) }
  const handleDeleteObj  = async (obj) => {
    if (!confirm(`Supprimer "${obj.title}" ?`)) return
    try { await deleteObj.mutateAsync(obj.id) } catch {}
  }
  const handleAddKr      = (objId) => { setKrFormObjId(objId); setEditingKr(null); setShowKrForm(true) }
  const handleEditKr     = (kr) => { setEditingKr(kr); setKrFormObjId(kr.objective_id); setShowKrForm(true) }
  const handleDeleteKr   = async (kr) => {
    if (!confirm('Supprimer ce Key Result ?')) return
    try { await deleteKr.mutateAsync(kr.id) } catch {}
  }
  const handleUpdateKrValue = async (kr, value) => {
    try { await updateKr.mutateAsync({ id:kr.id, actual_value:value }) } catch {}
  }

  const kpiValues = stats ? {
    total:    stats.total,
    avgScore: formatScore(stats.avgScore),
    totalKrs: stats.totalKrs,
    enRetard: objectives.filter(o => o.progress_score < 0.4 && o.status === 'actif').length,
  } : null

  return (
    <div style={{ position:'relative', minHeight:'100%', isolation:'isolate' }}>
      <GlaceBackground />

      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto" style={{ position:'relative', zIndex:1 }}>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div style={{ width:46, height:46, borderRadius:14,
              background:'rgba(139,92,246,.22)', backdropFilter:'blur(40px)',
              border:'1px solid rgba(167,139,250,.40)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 22px rgba(139,92,246,.22)' }}>
              <Target size={20} style={{ color:'#C4B5FD' }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white" style={{ letterSpacing:'-0.5px' }}>
                Objectifs OKR
              </h1>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.38)', marginTop:2 }}>
                Cascade stratégique · Score 0 → 1.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportObjectives(objectives)} disabled={objectives.length===0} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'9px 16px', borderRadius:11, cursor:'pointer',
              fontSize:12, fontWeight:500,
              background:'rgba(255,255,255,.08)', backdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,.14)', color:'rgba(255,255,255,.52)' }}>
              <FileSpreadsheet size={13} /> Excel
            </button>
            {canCreateObjective(profile?.role) && selectedPeriodId && (
              <button onClick={() => { setEditingObj(null); setShowObjForm(true) }} style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'9px 22px', borderRadius:11,
                background:'rgba(221,214,254,.88)',
                backdropFilter:'blur(20px)',
                border:'1px solid rgba(255,255,255,.65)',
                color:'#2E1065', fontSize:12, fontWeight:800, cursor:'pointer',
                boxShadow:'0 4px 26px rgba(139,92,246,.40), inset 0 1px 0 rgba(255,255,255,.70)' }}>
                <Plus size={14} /> Nouvel objectif
              </button>
            )}
          </div>
        </div>

        {/* SÉLECTEUR PÉRIODE */}
        <OkrPeriodSelector selectedPeriodId={selectedPeriodId} onSelect={setSelectedPeriodId} />

        {!selectedPeriodId ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:'64px 0', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:20, marginBottom:16,
              background:'rgba(139,92,246,.15)', backdropFilter:'blur(40px)',
              border:'1px solid rgba(167,139,250,.25)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Target size={26} style={{ color:'rgba(196,181,253,.45)' }} />
            </div>
            <p style={{ color:'rgba(255,255,255,.32)', fontSize:14 }}>
              Sélectionnez ou créez une période pour afficher les objectifs
            </p>
          </div>
        ) : (
          <>
            {/* KPI CARDS */}
            {kpiValues && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                {KPI_OKR.map(def => <KpiCard key={def.key} def={def} value={kpiValues[def.key]} />)}
              </div>
            )}

            {/* SWITCH VUES + FILTRES */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div style={{ display:'flex', gap:3, padding:4, borderRadius:14, ...glacePanel }}>
                {VIEWS_OKR.map(v => (
                  <button key={v.id} onClick={() => setView(v.id)} style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'7px 13px', borderRadius:10,
                    border: view===v.id ? '1px solid rgba(167,139,250,.45)' : '1px solid transparent',
                    cursor:'pointer', fontSize:12, fontWeight:500, transition:'all .15s',
                    background: view===v.id
                      ? 'linear-gradient(135deg,rgba(139,92,246,.38),rgba(109,40,217,.24))'
                      : 'transparent',
                    color: view===v.id ? '#C4B5FD' : 'rgba(255,255,255,.38)',
                    boxShadow: view===v.id ? '0 2px 14px rgba(139,92,246,.22)' : 'none',
                  }}>
                    <v.Icon size={13} />{v.label}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <OkrFilters filters={filters} onChange={setFilters} />
              </div>
            </div>

            {/* LOADING / ERROR */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div style={{ width:28, height:28, border:'2px solid rgba(167,139,250,.35)',
                  borderTopColor:'#C4B5FD', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
              </div>
            )}
            {error && (
              <div style={{ padding:'12px 16px', borderRadius:12,
                background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)',
                color:'#FCA5A5', fontSize:13 }}>
                Erreur : {error.message}
              </div>
            )}

            {/* VUES */}
            {!isLoading && view==='list' && (
              <div className="space-y-3">
                {objectives.length===0
                  ? <EmptyState icon={Target} title="Aucun objectif trouvé"
                      description="Créez votre premier objectif pour commencer" />
                  : objectives.map(obj => (
                    <ObjectiveCard key={obj.id} objective={obj}
                      childCount={childCounts[obj.id] || 0}
                      onEdit={handleEditObj} onDelete={handleDeleteObj}
                      onViewDetail={o => setDetailObjId(o.id)}
                      onAddKr={handleAddKr} onEditKr={handleEditKr}
                      onDeleteKr={handleDeleteKr} onUpdateKrValue={handleUpdateKrValue} />
                  ))
                }
              </div>
            )}
            {!isLoading && view==='cascade' && (
              <ObjectiveCascade objectives={objectives}
                onSelect={obj => setDetailObjId(obj.id)} />
            )}
            {!isLoading && view==='stats' && stats && (
              <StatsView objectives={objectives} stats={stats} />
            )}
            {view==='cycles' && (
              <OKRCycleManager onCycleSelect={cycle => {
                setActiveCycleId(cycle.id); setView('alignment')
              }} />
            )}
            {view==='alignment' && <OKRCascadeView cycleId={activeCycleId || currentCycle?.id} />}
            {view==='dashboard' && <OKRDashboard cycleId={activeCycleId || currentCycle?.id} />}
          </>
        )}

        {/* MODALES */}
        <ObjectiveForm isOpen={showObjForm}
          onClose={() => { setShowObjForm(false); setEditingObj(null) }}
          periodId={selectedPeriodId} objective={editingObj}
          parentObjectives={objectives} />
        <KeyResultForm isOpen={showKrForm}
          onClose={() => { setShowKrForm(false); setEditingKr(null); setKrFormObjId(null) }}
          objectiveId={krFormObjId} keyResult={editingKr} />
        {detailObjId && (
          <ObjectiveDetailPanel objectiveId={detailObjId}
            onClose={() => setDetailObjId(null)}
            onEdit={obj => { setDetailObjId(null); handleEditObj(obj) }} />
        )}
      </div>
    </div>
  )
}

// ─── StatsView — Glacé style ─────────────────────────────────
function StatsView({ objectives, stats }) {
  return (
    <div className="space-y-6">
      <div style={{ padding:20, borderRadius:16,
        background:'rgba(2,14,26,.75)', backdropFilter:'blur(40px)',
        border:'1px solid rgba(167,139,250,.18)' }}>
        <h3 style={{ fontSize:13, fontWeight:600, color:'#C4B5FD', marginBottom:16 }}>
          Score moyen par niveau
        </h3>
        <div className="space-y-4">
          {LEVEL_ORDER.map(lvl => {
            const info = getLevelInfo(lvl)
            const data = stats.byLevel[lvl]
            if (!data.count) return null
            const pct = Math.round(data.avgScore * 100)
            return (
              <div key={lvl} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize:12, fontWeight:500, color:info.color }}>
                      {info.icon} {info.label}
                    </span>
                    <span style={{ fontSize:10, color:'rgba(255,255,255,.22)' }}>
                      ({data.count} objectif{data.count>1?'s':''})
                    </span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:getScoreColor(data.avgScore) }}>
                    {formatScore(data.avgScore)}
                  </span>
                </div>
                <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                    transition={{ duration:.8, ease:'easeOut' }}
                    style={{ height:'100%', borderRadius:3, background:info.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {[
          { title:'🏆 Top 5 — Meilleurs scores', color:'#6EE7B7',
            data:[...objectives].sort((a,b)=>(b.progress_score||0)-(a.progress_score||0)).slice(0,5) },
          { title:'⚠️ À surveiller — Scores les plus bas', color:'#FCA5A5',
            data:[...objectives].filter(o=>o.status==='actif').sort((a,b)=>(a.progress_score||0)-(b.progress_score||0)).slice(0,5) },
        ].map(({ title, color, data }) => (
          <div key={title} style={{ padding:20, borderRadius:16,
            background:'rgba(2,14,26,.75)', backdropFilter:'blur(40px)',
            border:'1px solid rgba(186,230,253,.10)' }}>
            <h3 style={{ fontSize:13, fontWeight:600, color, marginBottom:12 }}>{title}</h3>
            <div className="space-y-2">
              {data.map(o => (
                <div key={o.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                    background:getLevelInfo(o.level).color }} />
                  <span style={{ flex:1, color:'rgba(255,255,255,.55)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {o.title}
                  </span>
                  <span style={{ fontWeight:700, flexShrink:0,
                    color:getScoreColor(o.progress_score) }}>
                    {formatScore(o.progress_score)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
