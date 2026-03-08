// ============================================================
// APEX RH — MaPerformance.jsx  ·  Session 44
// Route /ma-performance — 4 onglets :
//   • "Ma Performance"    : profil multi-dim + historique + PULSE + NITA (S40)
//   • "Vue Manager"       : transparency mode — ce que le manager voit (S42)
//   • "Mes Commentaires"  : droit de commentaire par dimension (S42)
//   • "Mes Rapports"      : reporting automatisé IA (S44)
// ✅ Session 101 — Phase C RBAC : migration usePermission V2
// ⚠️ PAS de score IPR composite affiché à l'employé
// ⚠️ NE PAS modifier Sidebar.jsx, App.jsx, useTasks.js, usePulse.js
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth }           from '../../contexts/AuthContext'
import { usePermission }     from '../../hooks/usePermission'
import { useAppSettings }    from '../../hooks/useSettings'
import { isPulseEnabled }    from '../../lib/pulseHelpers'
import { useTodayScore }     from '../../hooks/usePulse'
import { useMyIPR }          from '../../hooks/useIPR'
import { useMonthlyHistory, useMonthComparison, logPageVisit } from '../../hooks/usePerformanceHistory'
import { GaugeRing, Sparkline, iprColor } from '../../components/ui/premium'
import ProfilPerformance, { getQualitativeLabel } from '../../components/ui/ProfilPerformance'
import {
  useAllMyComments, useUpsertComment, useDeleteComment,
  useSharedManagerNotes, DIMENSION_LABELS, NOTE_TYPE_LABELS,
  currentPeriodKey, isTransparencyEnabled,
} from '../../hooks/useTransparency'
import ReportingIA from '../intelligence/ReportingIA'
import {
  Activity, TrendingUp, TrendingDown, Minus,
  BarChart2, Zap, Calendar, MessageSquare, Eye,
  Plus, Trash2, Check, X, Lock, Unlock, ChevronDown, Users, FileText,
} from 'lucide-react'

const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:12 }, visible:{ opacity:1, y:0, transition:{ duration:0.35, ease:[0.4,0,0.2,1] } } }

const DIMS = [
  { key:'avg',        label:'Global',     color:'#4F46E5' },
  { key:'delivery',   label:'Exécution',  color:'#4F46E5' },
  { key:'quality',    label:'Qualité',    color:'#10B981' },
  { key:'regularity', label:'Régularité', color:'#F59E0B' },
  { key:'bonus',      label:'Bonus',      color:'#EC4899' },
]
const PERIOD_OPTIONS = [{ label:'3m', count:3 }, { label:'6m', count:6 }, { label:'12m', count:12 }]
const COMMENTABLE_DIMS = ['delivery','quality','regularity','bonus','nita_resilience','nita_reliability','nita_endurance','okr','f360','review']

// ─── HistoryChart ─────────────────────────────────────────────
function HistoryChart({ months, activeDimKey, activeDimColor, onHover }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const svgRef = useRef(null)
  const W=560, H=130, PX=8, PY=14, w=W-PX*2, h=H-PY*2
  const vals=months.map(m=>m[activeDimKey]), nonNull=vals.filter(v=>v!==null)
  const maxV=nonNull.length?Math.max(...nonNull,10):100
  const minV=Math.max(0,Math.min(...(nonNull.length?nonNull:[0]))-8)
  const toY=v=>v===null?null:PY+h-((v-minV)/(maxV-minV+1))*h
  const toX=i=>PX+(i/(months.length-1))*w
  const pts=months.map((m,i)=>({x:toX(i),y:toY(m[activeDimKey])}))
  const linePath=pts.reduce((acc,p,i)=>{
    if(p.y===null)return acc
    if(i===0||pts[i-1].y===null)return`${acc}M ${p.x} ${p.y}`
    const cx=(p.x+pts[i-1].x)/2
    return`${acc} C${cx} ${pts[i-1].y} ${cx} ${p.y} ${p.x} ${p.y}`
  },'')
  const validPts=pts.filter(p=>p.y!==null)
  const fillPath=linePath&&validPts.length>=2?`${linePath} L${validPts.at(-1).x} ${PY+h} L${validPts[0].x} ${PY+h}Z`:''
  const handleMove=e=>{
    const rect=svgRef.current?.getBoundingClientRect();if(!rect)return
    const i=Math.round(((e.clientX-rect.left-PX)/w)*(months.length-1))
    const c=Math.max(0,Math.min(i,months.length-1));setHoverIdx(c);onHover?.(c)
  }
  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{overflow:'visible'}}
        onMouseMove={handleMove} onMouseLeave={()=>{setHoverIdx(null);onHover?.(null)}}>
        {[25,50,75].map(v=>{const y=toY(v);if(!y)return null;return<line key={v} x1={PX} y1={y} x2={W-PX} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 3"/>})}
        {fillPath&&<path d={fillPath} fill={`${activeDimColor}10`}/>}
        {linePath&&<path d={linePath} fill="none" stroke={activeDimColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>}
        {pts.map((p,i)=>p.y!==null&&(<g key={i}>
          {hoverIdx===i&&<><line x1={p.x} y1={PY} x2={p.x} y2={PY+h} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 3"/><circle cx={p.x} cy={p.y} r="8" fill={activeDimColor} opacity="0.1"/></>}
          <circle cx={p.x} cy={p.y} r={hoverIdx===i?4:2.5} fill={hoverIdx===i?activeDimColor:`${activeDimColor}70`} stroke={hoverIdx===i?'rgba(255,255,255,0.8)':'none'} strokeWidth="1.5" style={{transition:'r .15s'}}/>
          {hoverIdx===i&&months[i]?.[activeDimKey]!==null&&(()=>{const m=months[i],tx=Math.min(Math.max(p.x-30,2),W-68),ty=Math.max(p.y-44,2);return<g><rect x={tx} y={ty} width="64" height="32" rx="6" fill="#161630" stroke={`${activeDimColor}50`} strokeWidth="1"/><text x={tx+32} y={ty+13} textAnchor="middle" fill={activeDimColor} fontSize="11" fontWeight="700">{m[activeDimKey]}%</text><text x={tx+32} y={ty+26} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9">{m.month} {String(m.year).slice(-2)}</text></g>})()}
        </g>))}
      </svg>
      <div className="flex justify-between px-2 mt-1">
        {months.map((m,i)=><span key={i} className="text-[9px] transition-colors" style={{color:hoverIdx===i?activeDimColor:'rgba(255,255,255,0.18)'}}>{m.month}</span>)}
      </div>
    </div>
  )
}

// ─── DeltaCard ────────────────────────────────────────────────
function DeltaCard({ label, current, delta, color }) {
  const s=delta===null?null:delta>0?1:delta<0?-1:0
  const Icon=s===1?TrendingUp:s===-1?TrendingDown:Minus
  return (
    <div className="rounded-xl p-3" style={{background:`${color}08`,border:`1px solid ${color}18`}}>
      <p className="text-[10px] text-white/35 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-xl font-black" style={{color}}>{current!==null?`${current}%`:'—'}</span>
        {delta!==null&&<span className={`flex items-center gap-0.5 text-[11px] font-semibold mb-0.5 ${s===1?'text-emerald-400':s===-1?'text-red-400':'text-white/30'}`}><Icon size={11}/>{s!==0?`${Math.abs(delta)}pts`:'='}</span>}
      </div>
    </div>
  )
}

// ─── Onglet Mes Commentaires ──────────────────────────────────
function MesCommentaires() {
  const { data: allComments = [] } = useAllMyComments()
  const upsertComment = useUpsertComment()
  const deleteComment = useDeleteComment()
  const [editingDim, setEditingDim] = useState(null)
  const [draft, setDraft] = useState('')
  const [draftPeriod, setDraftPeriod] = useState(currentPeriodKey())
  const [visibility, setVisibility] = useState('manager_only')
  const [expandedPeriod, setExpandedPeriod] = useState(currentPeriodKey())
  const [deleting, setDeleting] = useState(null)

  const grouped = {}
  for (const c of allComments) {
    if (!grouped[c.period_key]) grouped[c.period_key] = []
    grouped[c.period_key].push(c)
  }
  const periods = Object.keys(grouped).sort().reverse()

  async function handleSave() {
    if (!draft.trim() || !editingDim) return
    await upsertComment.mutateAsync({ dimension_key:editingDim, period_key:draftPeriod, comment:draft.trim(), visibility })
    setEditingDim(null); setDraft('')
  }

  async function handleDelete(id) {
    setDeleting(id); await deleteComment.mutateAsync(id); setDeleting(null)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={14} className="text-indigo-400"/>
          <span className="text-sm font-semibold text-white">Ajouter un commentaire</span>
          <span className="ml-auto text-[10px] text-white/30">Droit de réponse sur votre performance</span>
        </div>
        {editingDim ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{DIMENSION_LABELS[editingDim]?.icon}</span>
              <span className="text-sm font-medium text-white">{DIMENSION_LABELS[editingDim]?.label}</span>
              <button onClick={()=>{setEditingDim(null);setDraft('')}} className="ml-auto p-1 rounded text-white/30 hover:text-white/60 transition-colors"><X size={14}/></button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input type="month" value={draftPeriod} onChange={e=>setDraftPeriod(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 focus:outline-none focus:border-indigo-500/40"/>
              <select value={visibility} onChange={e=>setVisibility(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 focus:outline-none">
                <option value="manager_only">Manager uniquement</option>
                <option value="public">Visible de tous</option>
              </select>
            </div>
            <textarea value={draft} onChange={e=>setDraft(e.target.value)}
              placeholder="Exprimez votre point de vue sur cette dimension..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 resize-none"/>
            <div className="flex justify-end gap-2">
              <button onClick={()=>{setEditingDim(null);setDraft('')}} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={!draft.trim()||upsertComment.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors disabled:opacity-40">
                <Check size={12}/> Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMMENTABLE_DIMS.map(dk => {
              const dim = DIMENSION_LABELS[dk]; if(!dim) return null
              return (
                <button key={dk} onClick={()=>{setEditingDim(dk);setDraft('');setDraftPeriod(currentPeriodKey())}}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:scale-[1.02]"
                  style={{background:`${dim.color}08`,border:`1px solid ${dim.color}18`}}>
                  <span className="text-base">{dim.icon}</span>
                  <span className="text-xs font-medium" style={{color:dim.color}}>{dim.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-10 text-white/20">
          <MessageSquare size={28} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">Aucun commentaire enregistré.</p>
          <p className="text-xs mt-1">Utilisez la section ci-dessus pour exprimer votre point de vue.</p>
        </div>
      ) : periods.map(period => {
        const comments = grouped[period], isExp = expandedPeriod===period
        const [y,m]=period.split('-')
        const monthName=new Date(parseInt(y),parseInt(m)-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
        return (
          <div key={period} className="rounded-2xl border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
            <button className="w-full flex items-center justify-between px-5 py-3.5"
              onClick={()=>setExpandedPeriod(isExp?null:period)}>
              <span className="text-sm font-semibold text-white capitalize">{monthName}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">{comments.length} commentaire{comments.length>1?'s':''}</span>
                <ChevronDown size={14} className={`text-white/30 transition-transform ${isExp?'rotate-180':''}`}/>
              </div>
            </button>
            <AnimatePresence>
              {isExp && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <div className="px-5 pb-4 space-y-2.5 border-t border-white/[0.04] pt-3">
                    {comments.map(c => {
                      const dim=DIMENSION_LABELS[c.dimension_key]
                      return (
                        <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl"
                          style={{background:`${dim?.color||'#6B7280'}06`,border:`1px solid ${dim?.color||'#6B7280'}15`}}>
                          <span className="text-lg mt-0.5 flex-shrink-0">{dim?.icon||'📝'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold" style={{color:dim?.color||'#6B7280'}}>{dim?.label||c.dimension_key}</span>
                              {c.visibility==='public'
                                ?<span className="flex items-center gap-0.5 text-[9px] text-emerald-400"><Unlock size={9}/> Public</span>
                                :<span className="flex items-center gap-0.5 text-[9px] text-white/30"><Lock size={9}/> Manager seul</span>
                              }
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed">{c.comment}</p>
                          </div>
                          <button onClick={()=>handleDelete(c.id)} disabled={deleting===c.id}
                            className="p-1 rounded text-white/20 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ─── Onglet Vue Manager ───────────────────────────────────────
function VueManagerTransparence({ iprData, todayScore, settings }) {
  const { data: sharedNotes = [] } = useSharedManagerNotes()
  const transparencyOn = isTransparencyEnabled(settings)
  if (!transparencyOn) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{background:'rgba(79,70,229,0.08)',border:'1px solid rgba(79,70,229,0.15)'}}>
        <Eye size={24} className="text-indigo-400/40"/>
      </div>
      <p className="text-white/50 font-medium">Mode Transparence désactivé</p>
      <p className="text-white/25 text-sm max-w-xs">Demandez à votre administrateur d'activer le mode transparence pour voir ce que votre manager voit.</p>
    </div>
  )
  const qualLabel = iprData?.ipr!=null ? getQualitativeLabel(iprData.ipr) : null
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{background:'rgba(79,70,229,0.08)',border:'1px solid rgba(79,70,229,0.15)'}}>
        <Eye size={14} className="text-indigo-400 flex-shrink-0"/>
        <p className="text-xs text-indigo-300">Vous voyez ici exactement ce que votre manager voit sur votre profil.</p>
      </div>

      {iprData && (
        <div className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-indigo-400"/>
            <span className="text-sm font-semibold text-white">Profil vu par votre manager</span>
            {qualLabel && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{background:`${qualLabel.color}18`,color:qualLabel.color}}>{qualLabel.label}</span>}
          </div>
          <ProfilPerformance data={iprData} showDetails />
        </div>
      )}

      {todayScore && (
        <div className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-amber-400"/>
            <span className="text-sm font-semibold text-white">Score PULSE brut du jour</span>
          </div>
          <div className="flex items-center gap-5">
            <GaugeRing value={todayScore.score_total??0} size={72} color={iprColor(todayScore.score_total??0)}/>
            <div className="flex-1 space-y-2">
              {[{label:'Exécution',v:todayScore.score_delivery??0,c:'#4F46E5'},{label:'Qualité',v:todayScore.score_quality??0,c:'#10B981'},{label:'Régularité',v:todayScore.score_regularity??0,c:'#F59E0B'},{label:'Bonus',v:todayScore.score_bonus??0,c:'#EC4899'}].map(d=>(
                <div key={d.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-20">{d.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${d.v}%`,background:d.c}}/>
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{color:d.c}}>{d.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {iprData?.nita && (
        <div className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-amber-400"/>
            <span className="text-sm font-semibold text-white">Activité Réelle NITA</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{label:'Résilience',v:iprData.nita.resilience??0,c:'#4F46E5'},{label:'Fiabilité',v:iprData.nita.reliability??0,c:'#10B981'},{label:'Endurance',v:iprData.nita.endurance??0,c:'#F59E0B'}].map(s=>(
              <div key={s.label} className="rounded-xl p-3 text-center" style={{background:`${s.c}08`,border:`1px solid ${s.c}18`}}>
                <p className="text-2xl font-black mb-0.5" style={{color:s.c}}>{s.v}%</p>
                <p className="text-[11px] font-semibold text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {sharedNotes.length > 0 && (
        <div className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-purple-400"/>
            <span className="text-sm font-semibold text-white">Notes de votre manager</span>
            <span className="ml-auto text-[10px] text-white/30">Partagées avec vous</span>
          </div>
          <div className="space-y-3">
            {sharedNotes.map(note => {
              const nt = NOTE_TYPE_LABELS[note.note_type]||NOTE_TYPE_LABELS.general
              return (
                <div key={note.id} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{background:`${nt.color}06`,border:`1px solid ${nt.color}15`}}>
                  <span className="text-base flex-shrink-0">{nt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{color:nt.color}}>{nt.label}</span>
                      {note.manager&&<span className="text-[10px] text-white/25">par {note.manager.first_name} {note.manager.last_name}</span>}
                      <span className="text-[10px] text-white/20 ml-auto">{note.period_key}</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{note.note_text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────
export default function MaPerformance() {
  const { profile } = useAuth()
  const { can }     = usePermission()
  const { data: settings } = useAppSettings()
  const pulseOn       = isPulseEnabled(settings) && can('pulse', 'own', 'read')
  const transparencyOn = isTransparencyEnabled(settings)
  const [tab, setTab] = useState('performance')
  const [activeDimIdx, setDim] = useState(0)
  const [periodCount, setPeriod] = useState(12)
  const [hoverIdx, setHoverIdx] = useState(null)

  const { data: todayScore } = useTodayScore()
  const { data: iprData }    = useMyIPR()
  const { data: allMonths = [] } = useMonthlyHistory(profile?.id)
  const { data: comparison } = useMonthComparison(profile?.id)

  useEffect(() => { logPageVisit(profile?.id, '/ma-performance') }, [profile?.id])

  const months = allMonths.slice(-periodCount)
  const activeDim = DIMS[activeDimIdx]
  const sparkData = allMonths.filter(m=>m.avg!==null).map(m=>m.avg)
  const qualLabel = iprData?.ipr!=null ? getQualitativeLabel(iprData.ipr) : null
  const hoverMonth = hoverIdx!==null ? months[hoverIdx] : null

  const TABS = [
    { id:'performance',  label:'Ma Performance',   icon:Activity },
    { id:'vue_manager',  label:'Vue Manager',       icon:Eye },
    { id:'commentaires', label:'Mes Commentaires',  icon:MessageSquare },
    { id:'rapports',     label:'Mes Rapports',      icon:FileText, badge:'S44' },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{background:'linear-gradient(180deg,rgba(79,70,229,0.05) 0%,transparent 220px)'}}>

      <motion.div variants={fadeUp} className="px-6 pt-6 pb-0 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{background:'rgba(79,70,229,0.12)',border:'1px solid rgba(79,70,229,0.2)'}}>
              <Activity size={16} style={{color:'#4F46E5'}}/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Ma Performance</h1>
              <p className="text-xs text-white/30">Profil multi-dimensionnel · PULSE · Activité NITA</p>
            </div>
          </div>
          {qualLabel && (
            <span className="hidden sm:inline text-xs font-bold px-3 py-1.5 rounded-full"
              style={{background:`${qualLabel.color}18`,color:qualLabel.color,border:`1px solid ${qualLabel.color}30`}}>
              {qualLabel.label}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon; const active = tab===t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${active?'text-white border-indigo-500 bg-indigo-500/8':'text-white/35 border-transparent hover:text-white/60'}`}>
                <Icon size={13}/>
                <span className="hidden sm:inline">{t.label}</span>
                {t.id==='vue_manager'&&transparencyOn&&<span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>}
                {t.badge&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(129,140,248,0.15)',color:'#818CF8'}}>{t.badge}</span>}
              </button>
            )
          })}
        </div>
      </motion.div>

      <div className="flex-1 px-6 py-5 space-y-5 pb-24 md:pb-6">
        <AnimatePresence mode="wait">
          {tab==='performance' && (
            <motion.div key="perf" variants={stagger} initial="hidden" animate="visible" className="space-y-5">
              {pulseOn && iprData && (
                <motion.div variants={fadeUp}>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Profil de performance</p>
                  <ProfilPerformance data={iprData} showDetails />
                </motion.div>
              )}
              {pulseOn && (
                <motion.div variants={fadeUp} className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-indigo-400"/><span className="text-sm font-semibold text-white">Historique</span></div>
                    <div className="flex gap-1">{PERIOD_OPTIONS.map(p=><button key={p.label} onClick={()=>setPeriod(p.count)} className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${periodCount===p.count?'bg-indigo-500/20 text-indigo-400':'text-white/25 hover:text-white/50'}`}>{p.label}</button>)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {DIMS.map((d,i)=><button key={d.key} onClick={()=>setDim(i)} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all" style={activeDimIdx===i?{background:`${d.color}20`,border:`1px solid ${d.color}40`,color:d.color}:{background:'transparent',border:'1px solid transparent',color:'rgba(255,255,255,0.25)'}}>{d.label}</button>)}
                  </div>
                  {months.length>1 ? (
                    <>
                      <HistoryChart months={months} activeDimKey={activeDim.key} activeDimColor={activeDim.color} onHover={setHoverIdx}/>
                      <AnimatePresence>
                        {hoverMonth&&!hoverMonth.isEmpty&&(
                          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                            className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl" style={{background:'rgba(255,255,255,0.03)'}}>
                            <span className="text-xs text-white/40">{hoverMonth.month} {hoverMonth.year}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-bold" style={{color:activeDim.color}}>{hoverMonth[activeDim.key]??'—'}%</span>
                              <span className="text-[10px] text-white/30">{hoverMonth.daysCount}j</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : <p className="text-sm text-white/20 py-6 text-center">Pas encore de données sur cette période.</p>}
                </motion.div>
              )}
              {pulseOn && comparison && (
                <motion.div variants={fadeUp}>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    Comparatif mensuel <span className="text-[10px] font-normal text-white/25 normal-case">Mois courant vs mois précédent</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <DeltaCard label="Score global" current={comparison.current.avg}       delta={comparison.delta}            color="#4F46E5"/>
                    <DeltaCard label="Exécution"    current={comparison.current.delivery}  delta={comparison.deltaDelivery}    color="#4F46E5"/>
                    <DeltaCard label="Qualité"      current={comparison.current.quality}   delta={comparison.deltaQuality}     color="#10B981"/>
                    <DeltaCard label="Régularité"   current={comparison.current.regularity}delta={comparison.deltaRegularity}  color="#F59E0B"/>
                  </div>
                </motion.div>
              )}
              {pulseOn && (
                <motion.div variants={fadeUp} className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
                  <div className="flex items-center gap-2 mb-4"><Zap size={14} className="text-indigo-400"/><span className="text-sm font-semibold text-white">PULSE — Aujourd'hui</span></div>
                  {todayScore ? (
                    <div className="flex items-center gap-5">
                      <GaugeRing value={todayScore.score_total??0} size={76} color={iprColor(todayScore.score_total??0)}/>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {[{label:'Exécution',v:todayScore.score_delivery??0,c:'#4F46E5'},{label:'Qualité',v:todayScore.score_quality??0,c:'#10B981'},{label:'Régularité',v:todayScore.score_regularity??0,c:'#F59E0B'},{label:'Bonus',v:todayScore.score_bonus??0,c:'#EC4899'}].map(d=>(
                          <div key={d.label} className="rounded-xl p-2.5" style={{background:`${d.c}08`,border:`1px solid ${d.c}18`}}>
                            <p className="text-[10px] text-white/35 mb-1">{d.label}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black" style={{color:d.c}}>{d.v}%</span>
                              <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{width:`${d.v}%`,background:d.c}}/></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-sm text-white/25 py-2">Aucun score PULSE pour aujourd'hui.</p>}
                  {sparkData.length>2 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.04]">
                      <p className="text-[11px] text-white/25 mb-2">Évolution mensuelle (12 mois)</p>
                      <Sparkline data={sparkData} height={36} color="#4F46E5"/>
                    </div>
                  )}
                </motion.div>
              )}
              {pulseOn && iprData?.nita && (
                <motion.div variants={fadeUp} className="rounded-2xl p-5 border border-white/[0.06]" style={{background:'rgba(255,255,255,0.02)'}}>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={14} className="text-amber-400"/>
                    <span className="text-sm font-semibold text-white">Activité Réelle NITA</span>
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B'}}>NITA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{label:'Résilience',v:iprData.nita.resilience??0,c:'#4F46E5',d:'Jours de pic'},{label:'Fiabilité',v:iprData.nita.reliability??0,c:'#10B981',d:'Taux erreur'},{label:'Endurance',v:iprData.nita.endurance??0,c:'#F59E0B',d:'Shifts longs'}].map(s=>(
                      <div key={s.label} className="rounded-xl p-3 text-center" style={{background:`${s.c}08`,border:`1px solid ${s.c}18`}}>
                        <p className="text-2xl font-black mb-0.5" style={{color:s.c}}>{s.v}%</p>
                        <p className="text-[11px] font-semibold text-white/70">{s.label}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{s.d}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {!pulseOn && (
                <motion.div variants={fadeUp} className="rounded-2xl p-10 border border-dashed border-white/[0.08] text-center">
                  <Activity size={32} className="text-white/15 mx-auto mb-3"/>
                  <p className="text-sm text-white/30">Activez PULSE dans les Paramètres pour accéder à votre profil de performance.</p>
                </motion.div>
              )}
            </motion.div>
          )}
          {tab==='vue_manager' && (
            <motion.div key="vue" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
              <VueManagerTransparence iprData={iprData} todayScore={todayScore} settings={settings}/>
            </motion.div>
          )}
          {tab==='commentaires' && (
            <motion.div key="comments" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
              <MesCommentaires/>
            </motion.div>
          )}
          {tab==='rapports' && (
            <motion.div key="rapports" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="-mx-6">
              <ReportingIA/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
