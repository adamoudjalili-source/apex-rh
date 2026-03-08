// S69 — MANAGER_ROLES remplacé par canManageTeam
// ============================================================
// APEX RH — CartographieCharges.jsx  ·  Session 42
// Cartographie des charges + corrélations NITA avancées
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth }     from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import {
  useWorkloadSummary,
  useNitaWorkloadCorrelation,
} from '../../hooks/useCompetencyFramework'
import {
  Users, AlertTriangle, Zap, BarChart3, TrendingUp, TrendingDown,
  Layers, Info, ChevronDown,
} from 'lucide-react'

const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.06 } } }
const fadeUp  = { hidden:{ opacity:0, y:10 }, visible:{ opacity:1, y:0, transition:{ duration:0.3 } } }

const LOAD_COLORS = [
  { max:30,  color:'#10B981', label:'Normale'  },
  { max:60,  color:'#F59E0B', label:'Chargée'  },
  { max:80,  color:'#F97316', label:'Élevée'   },
  { max:100, color:'#EF4444', label:'Critique' },
]

const getLoadColor = v => LOAD_COLORS.find(c => v <= c.max)?.color ?? '#EF4444'
const getLoadLabel = v => LOAD_COLORS.find(c => v <= c.max)?.label ?? 'Critique'

const CORR_LABELS = {
  forte_positive:    { label:'Forte corrélation positive', color:'#10B981', icon:'📈', text:'Quand l\'activité NITA augmente, la performance PULSE suit. Vos agents les plus actifs sont aussi les meilleurs performers.' },
  moderate_positive: { label:'Corrélation modérée positive', color:'#F59E0B', icon:'↗️', text:'Lien positif entre activité NITA et performance PULSE, mais d\'autres facteurs entrent en jeu.' },
  faible_positive:   { label:'Faible corrélation positive', color:'#6B7280', icon:'→', text:'Activité NITA et performance PULSE évoluent légèrement dans le même sens mais de façon non significative.' },
  faible_negative:   { label:'Faible corrélation négative', color:'#F59E0B', icon:'↘️', text:'Léger décrochage : les périodes de forte activité NITA ne s\'accompagnent pas toujours d\'une meilleure performance PULSE.' },
  forte_negative:    { label:'Corrélation négative forte', color:'#EF4444', icon:'📉', text:'Attention : forte activité NITA et performance PULSE évoluent en sens inverse. Possible surcharge impactant la qualité.' },
}

export default function CartographieCharges() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManageTeam = can('intelligence', 'effectifs', 'read')
  const isManager   = canManageTeam

  const { data: workload = [],   isLoading: wLoading  } = useWorkloadSummary()
  const { data: correlation,     isLoading: cLoading  } = useNitaWorkloadCorrelation()

  const [showDetails, setShowDetails] = useState(null)
  const [sortBy, setSortBy]           = useState('load')

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-3 text-white/20 p-12">
        <Users size={32}/>
        <p className="text-sm">Accès réservé aux managers</p>
      </div>
    )
  }

  const sorted = [...workload].sort((a,b) =>
    sortBy === 'load'  ? b.loadScore  - a.loadScore :
    sortBy === 'tasks' ? b.taskCount  - a.taskCount :
    sortBy === 'overdue' ? b.overdueCount - a.overdueCount : 0
  )

  const overloadCount  = workload.filter(u => u.loadScore > 70).length
  const criticalCount  = workload.filter(u => u.loadScore > 90).length
  const avgLoad        = workload.length ? Math.round(workload.reduce((s,u)=>s+u.loadScore,0)/workload.length) : null

  const corrInfo = correlation?.interpretation ? CORR_LABELS[correlation.interpretation] : null

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible"
      className="h-full overflow-y-auto px-6 py-5 space-y-5"
      style={{background:'linear-gradient(180deg,rgba(245,158,11,0.03) 0%,transparent 150px)'}}>

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.2)'}}>
          <Layers size={16} style={{color:'#F59E0B'}}/>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white" style={{fontFamily:"'Syne',sans-serif"}}>Cartographie des Charges</h2>
          <p className="text-xs text-white/30">Répartition du travail + corrélations NITA avancées</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {[
          { label:'Agents chargés', value:overloadCount, sub:'charge > 70%', color:'#F97316' },
          { label:'Agents critiques', value:criticalCount, sub:'charge > 90%', color:'#EF4444' },
          { label:'Charge moyenne', value:avgLoad !== null ? `${avgLoad}%` : '—', sub:'score pondéré', color:'#4F46E5' },
        ].map(k=>(
          <div key={k.label} className="rounded-xl p-3 text-center"
            style={{background:`${k.color}08`,border:`1px solid ${k.color}18`}}>
            <p className="text-2xl font-black" style={{color:k.color}}>{k.value}</p>
            <p className="text-[11px] font-medium text-white/60 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-white/25">{k.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Corrélation NITA */}
      {!cLoading && correlation && corrInfo && (
        <motion.div variants={fadeUp}
          className="rounded-2xl p-4 border"
          style={{background:`${corrInfo.color}06`,borderColor:`${corrInfo.color}25`}}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{corrInfo.icon}</span>
            <p className="text-sm font-semibold text-white/80">{corrInfo.label}</p>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{background:`${corrInfo.color}18`,color:corrInfo.color}}>
              r = {correlation.correlationR}
            </span>
          </div>
          <p className="text-xs text-white/45 leading-relaxed">{corrInfo.text}</p>
          <p className="text-[10px] text-white/20 mt-2">
            Basé sur {correlation.sampleSize} paires user/mois (6 derniers mois)
          </p>

          {/* Scatter plot simplifié */}
          {correlation.points.length >= 3 && (
            <div className="mt-3 rounded-xl border border-white/[0.06] p-3"
              style={{background:'rgba(255,255,255,0.015)'}}>
              <p className="text-[10px] text-white/30 mb-2">Nuage de points NITA × PULSE</p>
              <div className="relative" style={{height:80}}>
                <svg viewBox="0 0 200 80" className="w-full h-full">
                  {/* Axes */}
                  <line x1="5" y1="75" x2="195" y2="75" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                  <line x1="5" y1="5"  x2="5"   y2="75" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                  {/* Points */}
                  {correlation.points.map((p,i) => {
                    const x = 5 + (p.nita/100)*190
                    const y = 75 - (p.pulse/100)*70
                    return <circle key={i} cx={x} cy={y} r="2.5"
                      fill={corrInfo.color} opacity="0.5"/>
                  })}
                  {/* Labels */}
                  <text x="100" y="80" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7">NITA →</text>
                </svg>
                <div className="absolute right-0 top-0 h-full flex items-center">
                  <p style={{writingMode:'vertical-rl',transform:'rotate(180deg)'}} className="text-[7px] text-white/20">PULSE</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
      {!cLoading && !correlation && (
        <motion.div variants={fadeUp} className="rounded-xl border border-dashed border-white/10 p-4 flex items-start gap-3">
          <Info size={14} className="text-white/20 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-white/30 leading-relaxed">
            Les corrélations NITA × PULSE seront disponibles dès qu'il y aura suffisamment de données d'activité (au moins 2 mois avec l'API NITA connectée).
          </p>
        </motion.div>
      )}

      {/* Tableau charges */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Charge par collaborateur ({workload.length})
          </p>
          <div className="flex gap-1">
            {[{k:'load',l:'Charge'},{k:'tasks',l:'Tâches'},{k:'overdue',l:'En retard'}].map(s=>(
              <button key={s.k} onClick={()=>setSortBy(s.k)}
                className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-all ${sortBy===s.k?'text-amber-400 bg-amber-500/10':'text-white/30 hover:text-white/50'}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {wLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <Users size={24} className="text-white/10 mx-auto mb-2"/>
            <p className="text-sm text-white/20">Aucune tâche active trouvée dans l'équipe.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map(u => {
              const color = getLoadColor(u.loadScore)
              const label = getLoadLabel(u.loadScore)
              const isOpen = showDetails === u.user.id

              return (
                <motion.div key={u.user.id} variants={fadeUp}
                  className="rounded-xl border border-white/[0.06] overflow-hidden"
                  style={{background:'rgba(255,255,255,0.015)'}}>
                  <button
                    onClick={() => setShowDetails(isOpen ? null : u.user.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{background:`${color}18`,color,border:`1.5px solid ${color}30`}}>
                      {u.user.first_name?.[0]}{u.user.last_name?.[0]}
                    </div>
                    {/* Nom */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-white/80 truncate">
                        {u.user.first_name} {u.user.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{background:`${color}15`,color}}>
                          {label}
                        </span>
                        <span className="text-[10px] text-white/25">
                          {u.taskCount} tâche{u.taskCount>1?'s':''}
                        </span>
                        {u.overdueCount>0&&<span className="text-[10px] text-red-400">
                          ⚠ {u.overdueCount} en retard
                        </span>}
                      </div>
                    </div>
                    {/* Barre charge */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${u.loadScore}%`,background:color}}/>
                      </div>
                      <span className="text-xs font-bold w-8 text-right" style={{color}}>{u.loadScore}%</span>
                      <ChevronDown size={12} className="text-white/20 transition-transform" style={{transform:isOpen?'rotate(180deg)':'rotate(0deg)'}}/>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3 border-t border-white/[0.04]">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mt-2 mb-2">Détail des tâches actives</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {u.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{background:t.priority==='urgent'?'#EF4444':t.priority==='high'?'#F97316':'#6B7280'}}/>
                            <p className="text-xs text-white/60 flex-1 truncate">{t.title}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {t.due_date && new Date(t.due_date) < new Date() && (
                                <AlertTriangle size={9} className="text-red-400"/>
                              )}
                              <span className="text-[9px] font-bold" style={{color:getLoadColor(Math.round(t.computedWeight*20))}}>
                                ×{t.computedWeight.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Légende */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap">
        <p className="text-[10px] text-white/20">Légende charge :</p>
        {LOAD_COLORS.map(c=>(
          <div key={c.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{background:c.color}}/>
            <span className="text-[10px] text-white/30">{c.label} (≤{c.max}%)</span>
          </div>
        ))}
      </motion.div>

    </motion.div>
  )
}
