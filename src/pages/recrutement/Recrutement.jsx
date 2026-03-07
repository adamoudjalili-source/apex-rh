// ============================================================
// APEX RH — pages/recrutement/Recrutement.jsx
// Session 59 — Portail Candidats & Recrutement Light
// Session 61 — + Onglet IA Matching (matching automatique, scoring candidats)
// Session 63 — + Onglet Parser CV (upload PDF + extraction IA structurée)
// Onglets adaptatifs : Offres · Mes candidatures · Pipeline (mgr) · Entretiens (mgr) · IA Matching (mgr) · Parser CV (mgr) · Admin
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase, Send, Users, Calendar, Settings,
  TrendingUp, Clock, CheckCircle2, Brain, FileSearch,
} from 'lucide-react'
// S69 — guards via AuthContext helpers (isManagerRole local supprimé)
import { useAuth }             from '../../contexts/AuthContext'
import { useRecruitmentStats } from '../../hooks/useRecruitment'

import JobBoard              from '../../components/recrutement/JobBoard'
import MyApplications        from '../../components/recrutement/MyApplications'
import CandidatePipeline     from '../../components/recrutement/CandidatePipeline'
import InterviewPanel        from '../../components/recrutement/InterviewPanel'
import RecruitmentAdminPanel from '../../components/recrutement/RecruitmentAdminPanel'
import AIMatchingPanel       from '../../components/recrutement/AIMatchingPanel'   // S61
import CVParserPanel         from '../../components/recrutement/CVParserPanel'     // S63

// ─── Animations ───────────────────────────────────────────────
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
}

// ─── Quick stats widget ───────────────────────────────────────
function QuickStats() {
  const { data: stats } = useRecruitmentStats()
  if (!stats) return null

  const items = [
    { label: 'Offres actives',  value: stats.active_postings,    color: '#6366F1', icon: Briefcase },
    { label: 'Candidatures',   value: stats.total_applications,  color: '#3B82F6', icon: Send },
    { label: 'En cours',        value: stats.in_interview,        color: '#F59E0B', icon: Clock },
    { label: 'Recrutés',        value: stats.hired,               color: '#10B981', icon: CheckCircle2 },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ label, value, color, icon: Icon }) => (
        <div key={label}
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Icon size={14} className="mx-auto mb-1" style={{ color }}/>
          <p className="text-base font-bold text-white">{value ?? '–'}</p>
          <p className="text-[10px] text-white/30">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────
export default function Recrutement() {
  const { profile, canAdmin, canManageOrg, hasStrategic, canManageTeam } = useAuth()
  const role = profile?.role

  // Pipeline & outils IA : canManageOrg (super_admin, admin, directeur) + chef_division
  const canPipeline = canManageOrg || role === 'chef_division'
  // Admin recrutement : canManageOrg uniquement
  const canRecruitAdmin = canManageOrg

  const TABS = useMemo(() => {
    const base = [
      { id: 'board',      label: 'Offres',           icon: Briefcase },
      { id: 'mine',       label: 'Mes candidatures', icon: Send },
    ]
    if (canPipeline) {
      base.push({ id: 'pipeline',   label: 'Pipeline',     icon: Users })
      base.push({ id: 'interviews', label: 'Entretiens',   icon: Calendar })
      base.push({ id: 'ai',         label: 'IA Matching',  icon: Brain })
      base.push({ id: 'cvparser',   label: 'Parser CV',    icon: FileSearch })
    }
    if (canRecruitAdmin) {
      base.push({ id: 'admin', label: 'Administration', icon: Settings })
    }
    return base
  }, [role, canPipeline, canRecruitAdmin])

  const [activeTab, setActiveTab] = useState('board')

  return (
    <motion.div
      className="p-5 md:p-8 max-w-6xl mx-auto space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible">

      {/* ════ HERO ══════════════════════════════════════════ */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
              <Briefcase size={19} className="text-white"/>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Recrutement</h1>
          </div>
          <p className="text-sm text-white/40 pl-11">
            Portail candidats · Suivi pipeline · Entretiens · IA Matching · Parser CV
          </p>
        </div>
      </motion.div>

      {/* ════ STATS ═════════════════════════════════════════ */}
      {canPipeline && (
        <motion.div variants={fadeUp}>
          <QuickStats/>
        </motion.div>
      )}

      {/* ════ TABS ══════════════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: activeTab === id
                  ? id === 'ai'       ? 'rgba(139,92,246,0.2)'
                  : id === 'cvparser' ? 'rgba(201,162,39,0.15)'
                  : 'rgba(99,102,241,0.2)'
                  : 'rgba(255,255,255,0.04)',
                color: activeTab === id
                  ? id === 'ai'       ? '#C4B5FD'
                  : id === 'cvparser' ? '#C9A227'
                  : '#818CF8'
                  : 'rgba(255,255,255,0.4)',
                border: activeTab === id
                  ? id === 'ai'       ? '1px solid rgba(139,92,246,0.35)'
                  : id === 'cvparser' ? '1px solid rgba(201,162,39,0.3)'
                  : '1px solid rgba(99,102,241,0.3)'
                  : '1px solid transparent',
              }}>
              <Icon size={13}/>
              {label}
              {/* Badge NEW sur les onglets IA */}
              {id === 'ai' && activeTab !== 'ai' && (
                <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase"
                  style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA', marginLeft: 2 }}>
                  IA
                </span>
              )}
              {id === 'cvparser' && activeTab !== 'cvparser' && (
                <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase"
                  style={{ background: 'rgba(201,162,39,0.15)', color: '#C9A227', marginLeft: 2 }}>
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ════ CONTENT ═══════════════════════════════════════ */}
      <motion.div key={activeTab} variants={fadeUp}>
        {activeTab === 'board'      && <JobBoard/>}
        {activeTab === 'mine'       && <MyApplications/>}
        {activeTab === 'pipeline'   && <CandidatePipeline/>}
        {activeTab === 'interviews' && <InterviewPanel/>}
        {activeTab === 'ai'         && <AIMatchingPanel/>}
        {activeTab === 'cvparser'   && <CVParserPanel/>}
        {activeTab === 'admin'      && <RecruitmentAdminPanel/>}
      </motion.div>
    </motion.div>
  )
}
