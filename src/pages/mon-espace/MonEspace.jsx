// ============================================================
// APEX RH — MonEspace.jsx  ·  Session 36 v3
// Espace personnel complet :
//   - IPR gauge + dimensions (formule 5 critères)
//   - Tâches actives
//   - Sparkline PULSE 30j
//   - "Ma Performance" : fiche complète collaborateur
//   - Accès rapide vers tous les modules
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Target, Zap, ArrowRight,
  Sun, Moon, AlertCircle, CheckCircle2, Circle,
  Calendar, BarChart3, TrendingUp, Trophy, Activity,
} from 'lucide-react'
import { useAuth }          from '../../contexts/AuthContext'
import { useAppSettings }   from '../../hooks/useSettings'
import { isPulseEnabled }   from '../../lib/pulseHelpers'
import {
  useTodayScore, useTodayMorningPlan, useTodayLog, useMyActiveTasks,
} from '../../hooks/usePulse'
import { useUserScoreHistory, getPeriodDates } from '../../hooks/usePerformanceScores'
import { useTaskStats } from '../../hooks/useDashboard'
import { useMyIPR }  from '../../hooks/useIPR'
import {
  GaugeRing, Sparkline, TrendBadge, MetricCard,
  iprColor, iprLabel,
} from '../../components/ui/premium'

// ─── Animations ──────────────────────────────────────────────
const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.065, delayChildren:0.04 } } }
const fadeUp  = { hidden:{ opacity:0, y:14 }, visible:{ opacity:1, y:0, transition:{ duration:0.38, ease:[0.4,0,0.2,1] } } }

// ─── Onglets Ma Performance ───────────────────────────────────
const PERF_TABS = ['Aperçu','Dimensions','Historique']

// ─── Composant principal ─────────────────────────────────────
export default function MonEspace() {
  const { profile }    = useAuth()
  const navigate       = useNavigate()
  const { data: settings } = useAppSettings()
  const pulseOn         = isPulseEnabled(settings)

  const { data: iprData, isLoading:iprLoading } = useMyIPR()
  const { data: todayScore }  = useTodayScore()
  const { data: todayPlan }   = useTodayMorningPlan()
  const { data: todayLog }    = useTodayLog()
  const { data: activeTasks = [] } = useMyActiveTasks()
  const { data: taskStats }   = useTaskStats()

  const { startDate, endDate } = getPeriodDates('quarter')
  const { data: scoreHistory = [] } = useUserScoreHistory(null, startDate, endDate)
  const sparkline30 = scoreHistory.slice(-30).map(s => s.score_total || 0)

  const [perfTab, setPerfTab]    = useState(0)
  const [showAllTasks, setShowAllTasks] = useState(false)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'
  const dateStr  = new Date().toLocaleDateString('fr-FR',{ weekday:'long', day:'numeric', month:'long' })

  const briefDone   = todayPlan?.status === 'submitted'
  const journalDone = todayLog?.status  === 'submitted'
  const pulseScore  = todayScore?.score_total ?? null
  const ipr         = iprData?.ipr
  const iprTrend    = iprData?.trend

  const urgentTasks  = activeTasks.filter(t => t.priority === 'urgente')
  const displayTasks = showAllTasks ? activeTasks : activeTasks.slice(0, 6)

  return (
    <motion.div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6"
      variants={stagger} initial="hidden" animate="visible">

      {/* ════ HÉRO ══════════════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <div className="relative rounded-2xl overflow-hidden p-6 md:p-8"
          style={{
            background:'linear-gradient(135deg,rgba(79,70,229,0.13) 0%,rgba(124,58,237,0.07) 60%,rgba(201,162,39,0.04) 100%)',
            border:'1px solid rgba(79,70,229,0.2)',
          }}>
          <div className="absolute -top-16 -right-12 w-60 h-60 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(79,70,229,0.1) 0%,transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background:'linear-gradient(90deg,transparent,rgba(201,162,39,0.3),transparent)' }} />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs text-white/30 mb-1.5 capitalize">{dateStr}</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white"
                style={{ fontFamily:"'Syne',sans-serif" }}>
                {greeting}, {fullName}
              </h1>
              <p className="text-sm text-white/35 mt-1">Votre espace de performance personnelle</p>
            </div>

            {pulseOn && (
              <div className="flex items-center gap-5 flex-shrink-0">
                {/* IPR Gauge */}
                <div className="flex flex-col items-center gap-2">
                  <GaugeRing score={iprLoading ? 0 : (ipr ?? 0)} size={96} stroke={7}
                    color={iprColor(ipr)}>
                    <div className="text-center">
                      <p className="text-xl font-black leading-none"
                        style={{ color:iprColor(ipr), fontFamily:"'Syne',sans-serif" }}>
                        {iprLoading ? '…' : (ipr ?? '—')}
                      </p>
                      <p className="text-[9px] text-white/25 mt-0.5">IPR</p>
                    </div>
                  </GaugeRing>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/35">{iprLabel(ipr)}</span>
                    {iprTrend !== null && iprTrend !== undefined && (
                      <TrendBadge value={iprTrend} suffix="pts" size="sm" />
                    )}
                  </div>
                </div>

                {/* PULSE du jour */}
                <div className="rounded-2xl px-4 py-4 min-w-[140px]"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">PULSE aujourd'hui</p>
                  <p className="text-3xl font-black mb-3"
                    style={{ fontFamily:"'Syne',sans-serif", color:iprColor(pulseScore) }}>
                    {pulseScore ?? '—'}
                    <span className="text-sm font-normal text-white/20">/100</span>
                  </p>
                  <div className="space-y-1.5">
                    <StatusRow icon={<Sun size={11}/>}  label="Brief matinal"   done={briefDone}   onClick={() => navigate('/travail/taches')} />
                    <StatusRow icon={<Moon size={11}/>} label="Journal du soir" done={journalDone} onClick={() => navigate('/travail/taches')} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ════ ALERTE urgences ═══════════════════════════════ */}
      {urgentTasks.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/travail/taches')}
            style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
            <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-white flex-1">
              {urgentTasks.length} tâche{urgentTasks.length>1?'s':''} urgente{urgentTasks.length>1?'s':''}
              <span className="text-white/40 font-normal ml-2">
                {urgentTasks.slice(0,2).map(t=>t.title).join(' · ')}
                {urgentTasks.length > 2 ? ` +${urgentTasks.length-2}` : ''}
              </span>
            </p>
            <ArrowRight size={14} className="text-red-400 flex-shrink-0" />
          </div>
        </motion.div>
      )}

      {/* ════ GRILLE ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Colonne principale 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tâches actives */}
          <motion.div variants={fadeUp}>
            <SectionCard
              title="Mes tâches actives"
              icon={<CheckSquare size={13} className="text-blue-400"/>}
              action={{ label:'Tout voir', onClick:()=>navigate('/travail/taches') }}
              badge={activeTasks.length > 0 ? `${activeTasks.length}` : undefined}
              badgeColor="#3B82F6">
              {activeTasks.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={18}/>} label="Aucune tâche active" />
              ) : (
                <div className="space-y-0.5">
                  {displayTasks.map(task => (
                    <TaskRow key={task.id} task={task} onClick={() => navigate('/travail/taches')} />
                  ))}
                  {activeTasks.length > 6 && (
                    <button onClick={() => setShowAllTasks(v=>!v)}
                      className="w-full text-center text-[11px] text-white/25 hover:text-indigo-400 py-2 transition-colors">
                      {showAllTasks ? 'Réduire' : `+ ${activeTasks.length - 6} autres tâches`}
                    </button>
                  )}
                </div>
              )}
            </SectionCard>
          </motion.div>

          {/* Ma Performance — onglets */}
          {pulseOn && (
            <motion.div variants={fadeUp}>
              <SectionCard
                title="Ma Performance"
                icon={<Activity size={13} className="text-indigo-400"/>}
                action={{ label:'Analytics complets', onClick:()=>navigate('/intelligence') }}
                tabs={PERF_TABS} activeTab={perfTab} onTabChange={setPerfTab}>

                {perfTab === 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCard label="IPR ce mois" value={ipr} suffix="/100"
                      sparklineData={sparkline30} color={iprColor(ipr)}
                      trend={iprTrend} trendSuffix="pts"
                      icon={<Activity size={12}/>} size="sm" />
                    <MetricCard label="PULSE moy." value={sparkline30.length?Math.round(sparkline30.reduce((a,b)=>a+b,0)/sparkline30.length):null}
                      suffix="/100" color="#4F46E5"
                      icon={<TrendingUp size={12}/>} size="sm" />
                    <MetricCard label="Jours actifs" value={iprData?.daysWithData??0}
                      color="#C9A227" icon={<Calendar size={12}/>} size="sm" />
                  </div>
                )}

                {perfTab === 1 && iprData?.dimensions && (
                  <div className="space-y-1.5">
                    {Object.entries(iprData.dimensions).map(([k,d]) => (
                      <DimBar key={k} label={d.label} score={d.score}
                        weight={Math.round(d.weight*100)} color={d.color} />
                    ))}
                    <div className="flex items-center justify-between pt-3 mt-1"
                      style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-xs text-white/40 font-medium">IPR Total</span>
                      <span className="text-xl font-black"
                        style={{ color:iprColor(ipr), fontFamily:"'Syne',sans-serif" }}>
                        {ipr??'—'}<span className="text-xs font-normal text-white/20">/100</span>
                      </span>
                    </div>
                  </div>
                )}

                {perfTab === 2 && (
                  <div className="space-y-3">
                    {sparkline30.length > 1 ? (
                      <>
                        <div className="rounded-xl p-3"
                          style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)' }}>
                          <Sparkline data={sparkline30} width={480} height={56} color="#4F46E5" filled />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <MiniStat label="Meilleur" value={Math.max(...sparkline30)} suffix="/100" color="#10B981" />
                          <MiniStat label="Moy. 30j"
                            value={Math.round(sparkline30.reduce((a,b)=>a+b,0)/sparkline30.length)}
                            suffix="/100" color="#4F46E5" />
                          <MiniStat label="Tendance" value={(() => { const half = Math.max(1, Math.floor(sparkline30.length / 2)); return sparkline30.length >= 2 ? Math.round(sparkline30.at(-1) - sparkline30[sparkline30.length - half - 1]) : 0 })()}
                            suffix="pts" color={iprColor(sparkline30.at(-1))} />
                        </div>
                      </>
                    ) : (
                      <EmptyState icon={<BarChart3 size={18}/>} label="Pas assez de données" />
                    )}
                  </div>
                )}
              </SectionCard>
            </motion.div>
          )}
        </div>

        {/* Colonne droite 1/3 */}
        <div className="space-y-5">

          {/* Accès rapide */}
          <motion.div variants={fadeUp}>
            <SectionCard title="Navigation rapide" icon={<Zap size={13} className="text-amber-400"/>}>
              <div className="space-y-1">
                <QuickLink icon={<CheckSquare size={13}/>} label="Mes tâches"
                  sub={`${activeTasks.length} active${activeTasks.length>1?'s':''}`}
                  color="#3B82F6" onClick={() => navigate('/travail/taches')} />
                <QuickLink icon={<Target size={13}/>} label="Mes objectifs OKR"
                  sub={iprData?.okrCount ? `${iprData.okrCount} objectif${iprData.okrCount>1?'s':''}` : undefined}
                  color="#C9A227" onClick={() => navigate('/travail/objectifs')} />
                <QuickLink icon={<Calendar size={13}/>} label="Ma journée"
                  sub={briefDone ? 'Brief soumis ✓' : 'Brief en attente'}
                  color={briefDone?'#10B981':'#F59E0B'}
                  onClick={() => navigate('/travail/taches')} />
                {pulseOn && (
                  <QuickLink icon={<BarChart3 size={13}/>} label="Intelligence RH"
                    sub={pulseScore !== null ? `PULSE : ${pulseScore}/100` : 'Analytics'}
                    color="#4F46E5" onClick={() => navigate('/intelligence')} />
                )}
                <QuickLink icon={<Trophy size={13}/>} label="Mes Awards"
                  color="#C9A227" onClick={() => navigate('/engagement')} />
              </div>
            </SectionCard>
          </motion.div>

          {/* Résumé tâches */}
          {taskStats && (
            <motion.div variants={fadeUp}>
              <SectionCard title="Tâches — ce mois" icon={<CheckSquare size={13} className="text-blue-400"/>}>
                <div className="space-y-2">
                  {[
                    { label:'En cours',  count:taskStats.inProgress??0,  color:'#F59E0B', total:taskStats.active??1 },
                    { label:'En revue',  count:taskStats.inReview??0,    color:'#8B5CF6', total:taskStats.active??1 },
                    { label:'Terminées', count:taskStats.completed??0,   color:'#10B981', total:Math.max(taskStats.active??0,taskStats.completed??0,1) },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-white/35">{s.label}</span>
                        <span className="font-semibold" style={{ color:s.color }}>{s.count}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width:`${s.total>0?Math.round((s.count/s.total)*100):0}%`, background:s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────
function SectionCard({ title, icon, action, badge, badgeColor, tabs, activeTab, onTabChange, children }) {
  return (
    <div className="rounded-2xl" style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-0 mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{title}</h3>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background:`${badgeColor}20`, color:badgeColor }}>{badge}</span>
          )}
        </div>
        {action && (
          <button onClick={action.onClick}
            className="text-[11px] text-white/20 hover:text-indigo-400 flex items-center gap-1 transition-colors">
            {action.label}<ArrowRight size={10}/>
          </button>
        )}
      </div>
      {tabs && (
        <div className="flex px-5 gap-1 mb-4 border-b border-white/[0.05] pb-0">
          {tabs.map((t,i) => (
            <button key={t} onClick={() => onTabChange(i)}
              className={`pb-2 px-2 text-xs font-medium border-b-2 transition-all -mb-px ${
                activeTab===i ? 'text-indigo-400 border-indigo-500' : 'text-white/25 border-transparent hover:text-white/50'
              }`}>{t}</button>
          ))}
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

function StatusRow({ icon, label, done, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-1.5 group">
      <span className={done?'text-emerald-400':'text-white/20'}>{icon}</span>
      <span className={`text-[10px] flex-1 text-left ${done?'text-white/40 line-through':'text-white/30'}`}>{label}</span>
      {done && <CheckCircle2 size={9} className="text-emerald-400"/>}
    </button>
  )
}

function TaskRow({ task, onClick }) {
  const today    = new Date().toISOString().split('T')[0]
  const overdue  = task.due_date && task.due_date < today && task.status !== 'terminee'
  const dueToday = task.due_date === today
  const pColor   = { urgente:'#EF4444', haute:'#F59E0B', normale:'#3B82F6', basse:'#6B7280' }[task.priority]||'#6B7280'
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-white/[0.04] transition-colors">
      {task.status==='terminee'
        ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0"/>
        : task.status==='en_cours'
        ? <Circle size={13} className="text-amber-400 flex-shrink-0"/>
        : <Circle size={13} className="text-white/20 flex-shrink-0"/>}
      <span className={`flex-1 text-xs truncate ${task.status==='terminee'?'text-white/20 line-through':'text-white/70'}`}>
        {task.title}
      </span>
      {overdue  && <span className="text-[10px] text-red-400 flex-shrink-0">retard</span>}
      {dueToday && !overdue && <span className="text-[10px] text-amber-400 flex-shrink-0">auj.</span>}
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:pColor }}/>
    </button>
  )
}

function QuickLink({ icon, label, sub, color, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group hover:bg-white/[0.04] transition-all">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}15`, border:`1px solid ${color}20`, color }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/75 group-hover:text-white transition-colors truncate">{label}</p>
        {sub && <p className="text-[10px] text-white/25">{sub}</p>}
      </div>
      <ArrowRight size={12} className="text-white/10 group-hover:text-white/35 transition-colors"/>
    </button>
  )
}

function DimBar({ label, score, weight, color }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:color }}/>
      <span className="text-[11px] text-white/45 flex-1 truncate">{label}</span>
      <span className="text-[10px] text-white/20 flex-shrink-0">{weight}%</span>
      <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width:`${score??0}%`, background:iprColor(score) }}/>
      </div>
      <span className="text-xs font-bold w-6 text-right flex-shrink-0"
        style={{ color:iprColor(score) }}>{score??'—'}</span>
    </div>
  )
}

function MiniStat({ label, value, suffix, color }) {
  return (
    <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] text-white/25 mb-1">{label}</p>
      <p className="text-lg font-black" style={{ color, fontFamily:"'Syne',sans-serif" }}>
        {value??'—'}<span className="text-xs font-normal text-white/20">{suffix}</span>
      </p>
    </div>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-white/15">
      {icon}<p className="text-xs">{label}</p>
    </div>
  )
}
