// S69 — guards via AuthContext helpers
// ============================================================
// APEX RH — pages/formation/Formation.jsx
// Session 57 — Module Formation & Certifications
// Onglets : Catalogue · Mes formations · Mes certifications
//           · Mon plan / Plan équipe (manager) / Admin (admin)
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, GraduationCap, Award, Target, Users, Settings,
  TrendingUp, Clock, CheckCircle2,
} from 'lucide-react'
import { useAuth }           from '../../contexts/AuthContext'
import { useMyTrainingStats } from '../../hooks/useFormations'

import FormationCatalog         from '../../components/formation/FormationCatalog'
import MyEnrollments            from '../../components/formation/MyEnrollments'
import MyCertifications         from '../../components/formation/MyCertifications'
import TrainingPlanPanel        from '../../components/formation/TrainingPlanPanel'
import TeamFormationDashboard   from '../../components/formation/TeamFormationDashboard'
import FormationAdminPanel      from '../../components/formation/FormationAdminPanel'

// ─── Animations ───────────────────────────────────────────────
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
}

// ─── Statistiques rapides ─────────────────────────────────────
function QuickStats() {
  const { data: stats } = useMyTrainingStats()
  if (!stats) return null

  const items = [
    { label: 'En cours',   value: stats.enrollments_in_progress, color: '#3B82F6', icon: Clock },
    { label: 'Terminées',  value: stats.enrollments_completed,   color: '#10B981', icon: CheckCircle2 },
    { label: 'Heures',     value: `${stats.hours_completed || 0}h`, color: '#8B5CF6', icon: TrendingUp },
    { label: 'Certifs',    value: stats.certifications_count,    color: '#F59E0B', icon: Award },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ label, value, color, icon: Icon }) => (
        <div key={label}
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Icon size={14} className="mx-auto mb-1" style={{ color }}/>
          <p className="text-base font-bold text-white">{value}</p>
          <p className="text-[10px] text-white/30">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────
export default function Formation() {
  const { profile, canAdmin, canManageTeam } = useAuth()
  const role = profile?.role

  const TABS = useMemo(() => {
    const base = [
      { id: 'catalog', label: 'Catalogue',        icon: BookOpen },
      { id: 'my',      label: 'Mes formations',    icon: GraduationCap },
      { id: 'certs',   label: 'Mes certifications', icon: Award },
      { id: 'plan',    label: 'Mon plan',           icon: Target },
    ]
    if (canManageTeam && !canAdmin) {
      base.push({ id: 'team', label: 'Mon équipe', icon: Users })
    }
    if (canAdmin) {
      base.push({ id: 'team',  label: 'Équipe',      icon: Users })
      base.push({ id: 'admin', label: 'Administration', icon: Settings })
    }
    return base
  }, [role, canManageTeam, canAdmin])

  const [activeTab, setActiveTab] = useState('catalog')

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
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <GraduationCap size={19} className="text-white"/>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Formation & Certifications</h1>
          </div>
          <p className="text-sm text-white/40 ml-11">
            Développez vos compétences, suivez vos formations et valorisez vos certifications.
          </p>
        </div>
      </motion.div>

      {/* ════ STATS RAPIDES ══════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <QuickStats/>
      </motion.div>

      {/* ════ ONGLETS ════════════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <div className="flex gap-1 flex-wrap border-b border-white/[0.06] pb-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium relative transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-300'
                    : 'text-white/35 hover:text-white/60'
                }`}>
                <Icon size={14}/>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="formation-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-t"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}/>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* ════ CONTENU ONGLET ═════════════════════════════════ */}
      <motion.div variants={fadeUp} key={activeTab}>
        {activeTab === 'catalog' && <FormationCatalog/>}
        {activeTab === 'my'      && <MyEnrollments/>}
        {activeTab === 'certs'   && <MyCertifications/>}
        {activeTab === 'plan'    && <TrainingPlanPanel/>}
        {activeTab === 'team'    && <TeamFormationDashboard/>}
        {activeTab === 'admin'   && <FormationAdminPanel/>}
      </motion.div>
    </motion.div>
  )
}
