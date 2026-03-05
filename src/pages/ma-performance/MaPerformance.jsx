// ============================================================
// APEX RH — MaPerformance.jsx  ·  Session 40 (RÉÉCRITURE COMPLÈTE)
// Route /ma-performance
//   • Profil multi-dimensionnel interactif (radar cliquable)
//   • Historique 12 mois (graphe SVG interactif)
//   • Comparatif mois courant vs précédent
//   • PULSE aujourd'hui + sparkline
//   • Activité Réelle NITA (si disponible)
// ⚠️ Règle Plan V2 : PAS de score IPR composite affiché à l'employé
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth }           from '../../contexts/AuthContext'
import { useAppSettings }    from '../../hooks/useSettings'
import { isPulseEnabled }    from '../../lib/pulseHelpers'
import { useTodayScore }     from '../../hooks/usePulse'
import { useMyIPR }          from '../../hooks/useIPR'
import { useMonthlyHistory, useMonthComparison, logPageVisit } from '../../hooks/usePerformanceHistory'
import { GaugeRing, Sparkline, iprColor } from '../../components/ui/premium'
import ProfilPerformance, { getQualitativeLabel } from '../../components/ui/ProfilPerformance'
import {
  Activity, TrendingUp, TrendingDown, Minus,
  BarChart2, Zap, Calendar,
} from 'lucide-react'

// ─── Animations ──────────────────────────────────────────────
const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:12 }, visible:{ opacity:1, y:0, transition:{ duration:0.35, ease:[0.4,0,0.2,1] } } }

// ─── Config dimensions ───────────────────────────────────────
const DIMS = [
  { key:'avg',        label:'Global',    color:'#4F46E5' },
  { key:'delivery',   label:'Exécution', color:'#4F46E5' },
  { key:'quality',    label:'Qualité',   color:'#10B981' },
  { key:'regularity', label:'Régularité',color:'#F59E0B' },
  { key:'bonus',      label:'Bonus',     color:'#EC4899' },
]

const PERIOD_OPTIONS = [
  { label:'3m', count:3 },
  { label:'6m', count:6 },
  { label:'12m', count:12 },
]

// ─── HistoryChart SVG ────────────────────────────────────────
function HistoryChart({ months, activeDimKey, activeDimColor, onHover }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const svgRef = useRef(null)

  const W=560, H=130, PX=8, PY=14
  const w=W-PX*2, h=H-PY*2

  const vals    = months.map(m => m[activeDimKey])
  const nonNull = vals.filter(v=>v!==null)
  const maxV    = nonNull.length ? Math.max(...nonNull, 10) : 100
  const minV    = Math.max(0, Math.min(...(nonNull.length?nonNull:[0]))-8)

  const toY = v => v===null ? null : PY + h - ((v-minV)/(maxV-minV+1))*h
  const toX = i => PX + (i/(months.length-1))*w

  const pts = months.map((m,i) => ({ x:toX(i), y:toY(m[activeDimKey]) }))

  const linePath = pts.reduce((acc,p,i) => {
    if (p.y===null) return acc
    if (i===0 || pts[i-1].y===null) return `${acc}M ${p.x} ${p.y}`
    const cx=(p.x+pts[i-1].x)/2
    return `${acc} C${cx} ${pts[i-1].y} ${cx} ${p.y} ${p.x} ${p.y}`
  },'')

  const validPts = pts.filter(p=>p.y!==null)
  const fillPath = linePath && validPts.length>=2
    ? `${linePath} L${validPts.at(-1).x} ${PY+h} L${validPts[0].x} ${PY+h}Z`
    : ''

  const handleMove = e => {
    const rect=svgRef.current?.getBoundingClientRect()
    if(!rect) return
    const i=Math.round(((e.clientX-rect.left-PX)/w)*(months.length-1))
    const c=Math.max(0,Math.min(i,months.length-1))
    setHoverIdx(c); onHover?.(c)
  }

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
        style={{overflow:'visible'}}
        onMouseMove={handleMove}
        onMouseLeave={()=>{setHoverIdx(null);onHover?.(null)}}>

        {[25,50,75].map(v=>{
          const y=toY(v); if(!y) return null
          return <line key={v} x1={PX} y1={y} x2={W-PX} y2={y}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 3"/>
        })}

        {fillPath && <path d={fillPath} fill={`${activeDimColor}10`}/>}
        {linePath && <path d={linePath} fill="none" stroke={activeDimColor}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>}

        {pts.map((p,i)=> p.y!==null && (
          <g key={i}>
            {hoverIdx===i && (
              <>
                <line x1={p.x} y1={PY} x2={p.x} y2={PY+h}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 3"/>
                <circle cx={p.x} cy={p.y} r="8" fill={activeDimColor} opacity="0.1"/>
              </>
            )}
            <circle cx={p.x} cy={p.y}
              r={hoverIdx===i ? 4 : 2.5}
              fill={hoverIdx===i ? activeDimColor : `${activeDimColor}70`}
              stroke={hoverIdx===i ? 'rgba(255,255,255,0.8)':'none'} strokeWidth="1.5"
              style={{transition:'r .15s'}}/>

            {hoverIdx===i && months[i]?.[activeDimKey]!==null && (()=>{
              const m=months[i]
              const tx=Math.min(Math.max(p.x-30,2),W-68)
              const ty=Math.max(p.y-44,2)
              return (
                <g>
                  <rect x={tx} y={ty} width="64" height="32" rx="6"
                    fill="#161630" stroke={`${activeDimColor}50`} strokeWidth="1"/>
                  <text x={tx+32} y={ty+13} textAnchor="middle"
                    fill={activeDimColor} fontSize="11" fontWeight="700">{m[activeDimKey]}%</text>
                  <text x={tx+32} y={ty+26} textAnchor="middle"
                    fill="rgba(255,255,255,0.35)" fontSize="9">{m.month} {String(m.year).slice(-2)}</text>
                </g>
              )
            })()}
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-2 mt-1">
        {months.map((m,i)=>(
          <span key={i} className="text-[9px] transition-colors"
            style={{color: hoverIdx===i ? activeDimColor : 'rgba(255,255,255,0.18)'}}>
            {m.month}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── DeltaCard ───────────────────────────────────────────────
function DeltaCard({ label, current, delta, color }) {
  const s = delta===null ? null : delta>0 ? 1 : delta<0 ? -1 : 0
  const Icon = s===1 ? TrendingUp : s===-1 ? TrendingDown : Minus
  return (
    <div className="rounded-xl p-3" style={{background:`${color}08`,border:`1px solid ${color}18`}}>
      <p className="text-[10px] text-white/35 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-xl font-black" style={{color}}>
          {current!==null ? `${current}%` : '—'}
        </span>
        {delta!==null && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold mb-0.5 ${
            s===1?'text-emerald-400':s===-1?'text-red-400':'text-white/30'
          }`}>
            <Icon size={11}/>
            {s!==0 ? `${Math.abs(delta)}pts` : '='}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────
export default function MaPerformance() {
  const { profile }              = useAuth()
  const { data: settings }       = useAppSettings()
  const pulseOn                  = isPulseEnabled(settings)
  const [activeDimIdx, setDim]   = useState(0)
  const [periodCount, setPeriod] = useState(12)
  const [hoverIdx, setHoverIdx]  = useState(null)

  const { data: todayScore }     = useTodayScore()
  const { data: iprData }        = useMyIPR()
  const { data: allMonths = [] } = useMonthlyHistory(profile?.id)
  const { data: comparison }     = useMonthComparison(profile?.id)

  useEffect(() => { logPageVisit(profile?.id, '/ma-performance') }, [profile?.id])

  const months      = allMonths.slice(-periodCount)
  const activeDim   = DIMS[activeDimIdx]
  const sparkData   = allMonths.filter(m=>m.avg!==null).map(m=>m.avg)
  const qualLabel   = iprData?.ipr!=null ? getQualitativeLabel(iprData.ipr) : null
  const hoverMonth  = hoverIdx!==null ? months[hoverIdx] : null

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{background:'linear-gradient(180deg,rgba(79,70,229,0.05) 0%,transparent 220px)'}}>

      {/* Header */}
      <motion.div variants={fadeUp} className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{background:'rgba(79,70,229,0.12)',border:'1px solid rgba(79,70,229,0.2)'}}>
              <Activity size={16} style={{color:'#4F46E5'}}/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>
                Ma Performance
              </h1>
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
      </motion.div>

      <div className="flex-1 px-6 py-5 space-y-5 pb-24 md:pb-6">

        {/* Profil Multi-Dimensionnel */}
        {pulseOn && iprData && (
          <motion.div variants={fadeUp}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Profil de performance
            </p>
            <ProfilPerformance data={iprData} showDetails />
          </motion.div>
        )}

        {/* Historique 12 mois */}
        {pulseOn && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-5 border border-white/[0.06]"
            style={{background:'rgba(255,255,255,0.02)'}}>

            {/* Titre + période */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-indigo-400"/>
                <span className="text-sm font-semibold text-white">Historique</span>
              </div>
              <div className="flex gap-1">
                {PERIOD_OPTIONS.map(p=>(
                  <button key={p.label} onClick={()=>setPeriod(p.count)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                      periodCount===p.count?'bg-indigo-500/20 text-indigo-400':'text-white/25 hover:text-white/50'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur dimension */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {DIMS.map((d,i)=>(
                <button key={d.key} onClick={()=>setDim(i)}
                  className="px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-all"
                  style={activeDimIdx===i?{
                    background:`${d.color}20`,border:`1px solid ${d.color}40`,color:d.color
                  }:{
                    background:'transparent',border:'1px solid transparent',color:'rgba(255,255,255,0.25)'
                  }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Graphe */}
            {months.length>1 ? (
              <>
                <HistoryChart months={months} activeDimKey={activeDim.key}
                  activeDimColor={activeDim.color} onHover={setHoverIdx}/>
                <AnimatePresence>
                  {hoverMonth && !hoverMonth.isEmpty && (
                    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                      className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{background:'rgba(255,255,255,0.03)'}}>
                      <span className="text-xs text-white/40">{hoverMonth.month} {hoverMonth.year}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold" style={{color:activeDim.color}}>
                          {hoverMonth[activeDim.key]??'—'}%
                        </span>
                        <span className="text-[10px] text-white/30">{hoverMonth.daysCount}j</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <p className="text-sm text-white/20 py-6 text-center">Pas encore de données sur cette période.</p>
            )}
          </motion.div>
        )}

        {/* Comparatif mensuel */}
        {pulseOn && comparison && (
          <motion.div variants={fadeUp}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              Comparatif mensuel
              <span className="text-[10px] font-normal text-white/25 normal-case">
                Mois courant vs mois précédent
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DeltaCard label="Score global" current={comparison.current.avg}       delta={comparison.delta}            color="#4F46E5"/>
              <DeltaCard label="Exécution"    current={comparison.current.delivery}  delta={comparison.deltaDelivery}    color="#4F46E5"/>
              <DeltaCard label="Qualité"      current={comparison.current.quality}   delta={comparison.deltaQuality}     color="#10B981"/>
              <DeltaCard label="Régularité"   current={comparison.current.regularity}delta={comparison.deltaRegularity}  color="#F59E0B"/>
            </div>
            {comparison.current.days>0 && (
              <p className="text-[11px] text-white/20 mt-2">
                Basé sur {comparison.current.days} jour{comparison.current.days>1?'s':''} ce mois ·{' '}
                {comparison.previous.days} jour{comparison.previous.days>1?'s':''} le mois précédent.
              </p>
            )}
          </motion.div>
        )}

        {/* PULSE aujourd'hui */}
        {pulseOn && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-5 border border-white/[0.06]"
            style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-indigo-400"/>
              <span className="text-sm font-semibold text-white">PULSE — Aujourd'hui</span>
            </div>
            {todayScore ? (
              <div className="flex items-center gap-5">
                <GaugeRing value={todayScore.score_total??0} size={76}
                  color={iprColor(todayScore.score_total??0)}/>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[
                    {label:'Exécution', v:todayScore.score_delivery??todayScore.delivery_score??0, c:'#4F46E5'},
                    {label:'Qualité',   v:todayScore.score_quality??todayScore.quality_score??0,   c:'#10B981'},
                    {label:'Régularité',v:todayScore.score_regularity??todayScore.regularity_score??0, c:'#F59E0B'},
                    {label:'Bonus',     v:todayScore.score_bonus??todayScore.bonus_score??0,        c:'#EC4899'},
                  ].map(d=>(
                    <div key={d.label} className="rounded-xl p-2.5"
                      style={{background:`${d.c}08`,border:`1px solid ${d.c}18`}}>
                      <p className="text-[10px] text-white/35 mb-1">{d.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black" style={{color:d.c}}>{d.v}%</span>
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${d.v}%`,background:d.c}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/25 py-2">Aucun score PULSE pour aujourd'hui.</p>
            )}
            {sparkData.length>2 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[11px] text-white/25 mb-2">Évolution mensuelle (12 mois)</p>
                <Sparkline data={sparkData} height={36} color="#4F46E5"/>
              </div>
            )}
          </motion.div>
        )}

        {/* Activité NITA */}
        {pulseOn && iprData?.nita && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-5 border border-white/[0.06]"
            style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} className="text-amber-400"/>
              <span className="text-sm font-semibold text-white">Activité Réelle NITA</span>
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B'}}>NITA</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Résilience',v:iprData.nita.resilience??0,c:'#4F46E5',d:'Jours de pic'},
                {label:'Fiabilité', v:iprData.nita.reliability??0,c:'#10B981',d:'Taux erreur'},
                {label:'Endurance', v:iprData.nita.endurance??0,  c:'#F59E0B',d:'Shifts longs'},
              ].map(s=>(
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{background:`${s.c}08`,border:`1px solid ${s.c}18`}}>
                  <p className="text-2xl font-black mb-0.5" style={{color:s.c}}>{s.v}%</p>
                  <p className="text-[11px] font-semibold text-white/70">{s.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{s.d}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!pulseOn && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-10 border border-dashed border-white/[0.08] text-center">
            <Activity size={32} className="text-white/15 mx-auto mb-3"/>
            <p className="text-sm text-white/30">
              Activez PULSE dans les Paramètres pour accéder à votre profil de performance.
            </p>
          </motion.div>
        )}

      </div>
    </motion.div>
  )
}
