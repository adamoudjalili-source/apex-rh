// S69 — guards via AuthContext helpers
// ============================================================
// APEX RH — Dashboard.jsx  ·  Session 36 v3
// Dashboard repensé — répond à : "Qui est en difficulté aujourd'hui ?"
// Nouveau contenu :
//   - Widget IPR équipe (managers) avec top/bottom performers
//   - Alertes actives en temps réel
//   - Accès direct Mon Espace (carte personnelle IPR)
//   - Stats existantes conservées (tâches, OKR, projets)
// ============================================================
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, BarChart3, CheckSquare,
  Target, FolderKanban, Zap, Users, TrendingUp, Shield,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { useAppSettings } from '../../hooks/useSettings'
import { isPulseEnabled } from '../../lib/pulseHelpers'
import { useTaskStats, useOkrStats, useProjectStats } from '../../hooks/useDashboard'
import { useMyIPR, useTeamIPR } from '../../hooks/useIPR'
import { useTodayScore } from '../../hooks/usePulse'
import { GaugeRing, Sparkline, TrendBadge, iprColor, iprLabel } from '../../components/ui/premium'
import { getQualitativeLabel } from '../../components/ui/ProfilPerformance'
import { Activity } from 'lucide-react'

// ─── Animations ──────────────────────────────────────────────
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4,0,0.2,1] } },
}

// ─── Composant principal ─────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManageTeam = can('tasks', 'team', 'read')
  const navigate    = useNavigate()
  const { data: settings }    = useAppSettings()
  const pulseOn                = isPulseEnabled(settings)
  const isManager = canManageTeam

  const taskStats    = useTaskStats()
  const okrStats     = useOkrStats()
  const projectStats = useProjectStats()

  const { data: iprData }   = useMyIPR()
  const { data: todayScore } = useTodayScore()
  const { data: team = [] }  = useTeamIPR({ enabled: isManager })

  const alertMembers  = team.filter(m => m.alert)
  const topPerformer  = team.find(m => (m.ipr ?? 0) >= 70)
  const avgTeamIPR    = team.filter(m => m.ipr !== null).length
    ? Math.round(team.filter(m=>m.ipr!==null).reduce((s,m)=>s+m.ipr,0)/team.filter(m=>m.ipr!==null).length)
    : null

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <motion.div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6"
      variants={stagger} initial="hidden" animate="visible">

      {/* ── Greeting ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
            {greeting}, {fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-white/35 mt-0.5 capitalize">
            {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <button onClick={() => navigate('/mon-espace')}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow:'0 4px 16px rgba(79,70,229,0.3)' }}>
          <Zap size={14} /> Mon Espace
        </button>
      </motion.div>

      {/* ── Bannière Profil Performance (si PULSE actif) ── */}
      {pulseOn && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => navigate('/mon-espace')}
            style={{
              background:'linear-gradient(135deg,rgba(79,70,229,0.1) 0%,rgba(124,58,237,0.05) 100%)',
              border:'1px solid rgba(79,70,229,0.2)',
            }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Icône qualitative — pas de chiffre IPR unique */}
                {(() => {
                  const dims = iprData?.dimensions
                  const ql = dims ? (() => {
                    const weighted = Object.values(dims).filter(d=>d.score!==null&&d.score!==undefined).reduce((a,d)=>a+d.score*(d.weight||0.2),0)
                    const tw = Object.values(dims).filter(d=>d.score!==null&&d.score!==undefined).reduce((a,d)=>a+(d.weight||0.2),0)
                    return getQualitativeLabel(tw > 0 ? Math.round(weighted/tw) : null)
                  })() : getQualitativeLabel(null)
                  return (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: ql.bg, border: `2px solid ${ql.border}` }}>
                      <span className="text-xl font-black" style={{ color: ql.color, fontFamily:"'Syne',sans-serif" }}>
                        {ql.label.charAt(0)}
                      </span>
                    </div>
                  )
                })()}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-lg font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
                      Mon Profil ce mois
                    </p>
                    {iprData?.trend !== null && iprData?.trend !== undefined && (
                      <TrendBadge value={iprData.trend} suffix="pts" />
                    )}
                  </div>
                  {(() => {
                    const dims = iprData?.dimensions
                    if (!dims) return <p className="text-sm text-white/40">En cours de construction — {iprData?.daysWithData ?? 0} jours actifs</p>
                    const weighted = Object.values(dims).filter(d=>d.score!==null&&d.score!==undefined).reduce((a,d)=>a+d.score*(d.weight||0.2),0)
                    const tw = Object.values(dims).filter(d=>d.score!==null&&d.score!==undefined).reduce((a,d)=>a+(d.weight||0.2),0)
                    const ql = getQualitativeLabel(tw > 0 ? Math.round(weighted/tw) : null)
                    return (
                      <p className="text-sm font-semibold" style={{ color: ql.color }}>
                        {ql.label} — {iprData?.daysWithData ?? 0} jours actifs
                      </p>
                    )
                  })()}
                </div>
              </div>

              {/* Mini sparkline */}
              <div className="hidden md:flex items-center gap-4">
                {iprData?.sparkline?.length > 1 && (
                  <Sparkline data={iprData.sparkline} width={140} height={36}
                    color={iprColor(iprData?.ipr)} filled />
                )}
                <div className="flex items-center gap-1.5 text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-sm font-medium">Mon Espace</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Alertes équipe (managers) ── */}
      {isManager && alertMembers.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-4"
            style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-400" />
                <span className="text-sm font-semibold text-red-400">
                  {alertMembers.length} alerte{alertMembers.length > 1 ? 's' : ''} dans votre équipe
                </span>
              </div>
              <button onClick={() => navigate('/mon-equipe')}
                className="text-[11px] text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors">
                Voir Mon Équipe <ArrowRight size={10} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {alertMembers.slice(0, 5).map(m => (
                <div key={m.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.12)' }}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background:'rgba(239,68,68,0.3)' }}>
                    {m.firstName?.charAt(0)}{m.lastName?.charAt(0)}
                  </div>
                  <span className="text-red-300">{m.firstName} {m.lastName?.charAt(0)}.</span>
                  <span className="text-red-400/60">
                    {m.alert === 'no_brief' ? `${m.daysSinceLastBrief}j sans brief` : `IPR ${m.ipr}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stats principales ── */}
      <motion.div variants={fadeUp}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCardFixed
          label="Tâches actives" icon={<CheckSquare size={14}/>}
          value={taskStats.data?.inProgress ?? 0}
          sub={`${taskStats.data?.completed ?? 0} terminées`}
          color="#3B82F6" onClick={() => navigate('/travail/taches')} />
        <StatCardFixed
          label="OKR en cours" icon={<Target size={14}/>}
          value={okrStats.data?.active ?? 0}
          sub={`${okrStats.data?.avgProgress ?? 0}% progression`}
          color="#C9A227" onClick={() => navigate('/travail/objectifs')} />
        <StatCardFixed
          label="Projets actifs" icon={<FolderKanban size={14}/>}
          value={projectStats.data?.active ?? 0}
          sub={`${projectStats.data?.completed ?? 0} terminés`}
          color="#8B5CF6" onClick={() => navigate('/travail/projets')} />
        {isManager ? (
          <StatCardFixed
            label="IPR équipe moyen" icon={<Users size={14}/>}
            value={avgTeamIPR ?? '—'}
            sub={`${team.length} membres`}
            color={iprColor(avgTeamIPR)} onClick={() => navigate('/mon-equipe')} />
        ) : (
          <StatCardFixed
            label="PULSE aujourd'hui" icon={<Activity size={14}/>}
            value={todayScore?.score_total ?? '—'}
            sub={pulseOn ? 'Score du jour' : 'Module désactivé'}
            color={iprColor(todayScore?.score_total)} onClick={() => navigate('/intelligence')} />
        )}
      </motion.div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Colonne gauche 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* IPR équipe (managers) */}
          {isManager && team.length > 0 && pulseOn && (
            <motion.div variants={fadeUp}>
              <SectionCard title="Équipe — IPR aujourd'hui"
                icon={<Users size={13} className="text-indigo-400"/>}
                action={{ label:'Mon Équipe complet', onClick:() => navigate('/mon-equipe') }}>
                <div className="space-y-1">
                  {team.slice(0, 6).map(m => (
                    <TeamMiniRow key={m.userId} member={m} onClick={() => navigate('/mon-equipe')} />
                  ))}
                  {team.length > 6 && (
                    <button onClick={() => navigate('/mon-equipe')}
                      className="w-full text-center text-[11px] text-white/20 hover:text-indigo-400 py-1.5 transition-colors">
                      + {team.length - 6} autres membres
                    </button>
                  )}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* Tâches en retard */}
          {(taskStats.data?.overdue ?? 0) > 0 && (
            <motion.div variants={fadeUp}>
              <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)' }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-sm text-amber-300 font-medium">
                    {taskStats.data.overdue} tâche{taskStats.data.overdue>1?'s':''} en retard
                  </span>
                </div>
                <button onClick={() => navigate('/travail/taches')}
                  className="text-[11px] text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  Voir <ArrowRight size={10} />
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Colonne droite 1/3 */}
        <div className="space-y-5">
          {/* Raccourcis */}
          <motion.div variants={fadeUp}>
            <SectionCard title="Navigation rapide" icon={<Zap size={13} className="text-amber-400" />}>
              <div className="space-y-1">
                <QuickNav icon={<Zap size={13}/>}       label="Mon Espace"      color="#4F46E5" onClick={() => navigate('/mon-espace')} />
                {isManager && <QuickNav icon={<Users size={13}/>} label="Mon Équipe" color="#8B5CF6" onClick={() => navigate('/mon-equipe')} />}
                <QuickNav icon={<CheckSquare size={13}/>} label="Mes tâches"    color="#3B82F6" onClick={() => navigate('/travail/taches')} />
                <QuickNav icon={<Target size={13}/>}    label="Objectifs OKR"   color="#C9A227" onClick={() => navigate('/travail/objectifs')} />
                {pulseOn && <QuickNav icon={<BarChart3 size={13}/>} label="Intelligence RH" color="#10B981" onClick={() => navigate('/intelligence')} />}
              </div>
            </SectionCard>
          </motion.div>

          {/* Progression OKR */}
          {okrStats.data && (
            <motion.div variants={fadeUp}>
              <SectionCard title="Objectifs OKR" icon={<Target size={13} className="text-amber-400"/>}
                action={{ label:'Voir', onClick:()=>navigate('/travail/objectifs') }}>
                <div className="space-y-2.5">
                  <OKRBar label="Complétés"   count={okrStats.data.completed??0}  color="#10B981" total={okrStats.data.total??1} />
                  <OKRBar label="En bonne voie" count={okrStats.data.onTrack??0}  color="#4F46E5" total={okrStats.data.total??1} />
                  <OKRBar label="À risque"    count={okrStats.data.atRisk??0}     color="#F59E0B" total={okrStats.data.total??1} />
                  <OKRBar label="Hors piste"  count={okrStats.data.offTrack??0}   color="#EF4444" total={okrStats.data.total??1} />
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
function SectionCard({ title, icon, action, children }) {
  return (
    <div className="rounded-2xl p-5"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">{title}</h3>
        </div>
        {action && (
          <button onClick={action.onClick}
            className="text-[11px] text-white/20 hover:text-indigo-400 flex items-center gap-1 transition-colors">
            {action.label} <ArrowRight size={10} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}


// Version sans require (fix)
function StatCardFixed({ label, icon, value, sub, color, onClick }) {
  return (
    <div onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
      style={{ background:'rgba(255,255,255,0.025)', border:`1px solid rgba(255,255,255,0.07)` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:`${color}15`, color }}>{icon}</div>
        <span className="text-[10px] text-white/30 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black mb-0.5" style={{ color, fontFamily:"'Syne',sans-serif" }}>{value}</p>
      <p className="text-[11px] text-white/25">{sub}</p>
    </div>
  )
}

function TeamMiniRow({ member: m, onClick }) {
  const name = `${m.firstName||''} ${m.lastName||''}`.trim()
  const c    = iprColor(m.ipr)
  return (
    <button onClick={onClick}
      className="w-full grid items-center px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors gap-3"
      style={{ gridTemplateColumns:'1fr 48px 80px 90px' }}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
          style={{ background:c+'33' }}>
          {m.firstName?.charAt(0)}{m.lastName?.charAt(0)}
        </div>
        <span className="text-xs text-white/70 truncate">{name}</span>
      </div>
      <span className="text-sm font-black text-right" style={{ color:c, fontFamily:"'Syne',sans-serif" }}>
        {m.ipr ?? '—'}
      </span>
      <div className="flex justify-end">
        {m.sparkline?.length > 1
          ? <Sparkline data={m.sparkline} width={70} height={20} color={c} filled={false} />
          : <span className="text-[10px] text-white/15">—</span>}
      </div>
      <div className="flex justify-end">
        {m.alert ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{
              background: m.alert==='no_brief'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',
              color: m.alert==='no_brief'?'#EF4444':'#F59E0B',
            }}>
            {m.alert==='no_brief'?`${m.daysSinceLastBrief}j sans brief`:'IPR bas'}
          </span>
        ) : <span className="text-[10px] text-emerald-400/60">✓</span>}
      </div>
    </button>
  )
}

function QuickNav({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl group hover:bg-white/[0.04] transition-all text-left">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}15`, color }}>{icon}</div>
      <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors">{label}</span>
      <ArrowRight size={12} className="ml-auto text-white/10 group-hover:text-white/30 transition-colors" />
    </button>
  )
}

function OKRBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count/total)*100) : 0
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-white/35">{label}</span>
        <span className="font-semibold" style={{ color }}>{count}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${pct}%`, background:color }} />
      </div>
    </div>
  )
}
