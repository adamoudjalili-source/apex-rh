// ============================================================
// APEX RH — pages/recrutement/Recrutement.jsx
// Session 59 — Portail Candidats & Recrutement Light
// Session 61 — + Onglet IA Matching
// Session 63 — + Onglet Parser CV
// Session 72 — + Pipeline Kanban S72 + Dashboard + Scoring
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase, Send, Users, Calendar, Settings,
  Clock, CheckCircle2, Brain, FileSearch,
  BarChart2, Star,
} from 'lucide-react'
import { useAuth }                   from '../../contexts/AuthContext'
import { useRecruitmentGlobalStats } from '../../hooks/useRecruitment'

import JobBoard                     from '../../components/recrutement/JobBoard'
import MyApplications               from '../../components/recrutement/MyApplications'
import InterviewPanel               from '../../components/recrutement/InterviewPanel'
import RecruitmentAdminPanel        from '../../components/recrutement/RecruitmentAdminPanel'
import AIMatchingPanel              from '../../components/recrutement/AIMatchingPanel'
import CVParserPanel                from '../../components/recrutement/CVParserPanel'
import RecruitmentPipelineKanban    from '../../components/recrutement/RecruitmentPipelineKanban'
import RecruitmentDashboard         from '../../components/recrutement/RecruitmentDashboard'
import RecruitmentScoringPanel      from '../../components/recrutement/RecruitmentScoringPanel'

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
}

function QuickStats() {
  const { data: stats } = useRecruitmentGlobalStats()
  if (!stats) return null
  const items = [
    { label: 'Offres actives', value: stats.active_postings,   color: '#6366F1', icon: Briefcase },
    { label: 'Candidatures',  value: stats.total_applications, color: '#3B82F6', icon: Send },
    { label: 'En cours',       value: stats.in_interview,       color: '#F59E0B', icon: Clock },
    { label: 'Recrutés',       value: stats.hired,              color: '#10B981', icon: CheckCircle2 },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Icon size={14} className="mx-auto mb-1" style={{ color }}/>
          <p className="text-base font-bold text-white">{value ?? '–'}</p>
          <p className="text-[10px] text-white/30">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Icône Kanban inline (lucide ne l'a pas dans cette version) ─
function KanbanIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  )
}

export default function Recrutement() {
  const { profile, canAdmin, canManageOrg } = useAuth()
  const role = profile?.role
  const canPipeline     = canManageOrg || role === 'chef_division'
  const canRecruitAdmin = canManageOrg

  const TABS = useMemo(() => {
    const base = [
      { id: 'board', label: 'Offres',           Icon: () => <Briefcase size={13}/> },
      { id: 'mine',  label: 'Mes candidatures', Icon: () => <Send size={13}/> },
    ]
    if (canPipeline) {
      base.push({ id: 'pipeline',  label: 'Pipeline',    Icon: () => <KanbanIcon/>,       badge: 'S72', badgeColor: '#34D399', badgeBg: 'rgba(16,185,129,0.15)' })
      base.push({ id: 'dashboard', label: 'Dashboard',   Icon: () => <BarChart2 size={13}/>, badge: 'S72', badgeColor: '#34D399', badgeBg: 'rgba(16,185,129,0.15)' })
      base.push({ id: 'scoring',   label: 'Scoring',     Icon: () => <Star size={13}/>,   badge: 'S72', badgeColor: '#34D399', badgeBg: 'rgba(16,185,129,0.15)' })
      base.push({ id: 'interviews',label: 'Entretiens',  Icon: () => <Calendar size={13}/> })
      base.push({ id: 'ai',        label: 'IA Matching', Icon: () => <Brain size={13}/>,   badge: 'IA',  badgeColor: '#A78BFA', badgeBg: 'rgba(139,92,246,0.2)' })
      base.push({ id: 'cvparser',  label: 'Parser CV',   Icon: () => <FileSearch size={13}/>, badge: 'IA', badgeColor: '#C9A227', badgeBg: 'rgba(201,162,39,0.15)' })
    }
    if (canRecruitAdmin) {
      base.push({ id: 'admin', label: 'Administration', Icon: () => <Settings size={13}/> })
    }
    return base
  }, [role, canPipeline, canRecruitAdmin])

  const [activeTab, setActiveTab] = useState('board')

  const getTabStyle = (id) => {
    const active = activeTab === id
    if (!active) return { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
    if (['ai','cvparser'].includes(id)) return { background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.35)' }
    if (['pipeline','dashboard','scoring'].includes(id)) return { background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }
    return { background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }
  }

  return (
    <motion.div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6" variants={stagger} initial="hidden" animate="visible">

      {/* HERO */}
      <motion.div variants={fadeUp} className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
          <Briefcase size={19} className="text-white"/>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Recrutement</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>S72</span>
          </div>
          <p className="text-sm text-white/40">Pipeline Kanban · Scoring · Dashboard · Entretiens · IA Matching</p>
        </div>
      </motion.div>

      {/* STATS */}
      {canPipeline && <motion.div variants={fadeUp}><QuickStats/></motion.div>}

      {/* TABS */}
      <motion.div variants={fadeUp}>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(({ id, label, Icon, badge, badgeColor, badgeBg }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={getTabStyle(id)}>
              <Icon/>
              {label}
              {badge && activeTab !== id && badgeColor && (
                <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase"
                  style={{ background: badgeBg, color: badgeColor, marginLeft: 2 }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* CONTENT */}
      <motion.div key={activeTab} variants={fadeUp}>
        {activeTab === 'board'       && <JobBoard/>}
        {activeTab === 'mine'        && <MyApplications/>}
        {activeTab === 'pipeline'    && <RecruitmentPipelineKanban/>}
        {activeTab === 'dashboard'   && <RecruitmentDashboard/>}
        {activeTab === 'scoring'     && <RecruitmentScoringPanel/>}
        {activeTab === 'interviews'  && <InterviewPanel/>}
        {activeTab === 'ai'          && <AIMatchingPanel/>}
        {activeTab === 'cvparser'    && <CVParserPanel/>}
        {activeTab === 'admin'       && <RecruitmentAdminPanel/>}
      </motion.div>
    </motion.div>
  )
}
