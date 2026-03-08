// S69 — guards via AuthContext helpers
// S73 — Ajout onglets : Budget / Obligatoires / Évaluation / Dashboard enrichi
// ============================================================
// APEX RH — pages/formation/Formation.jsx
// Session 73 — Formation enrichie : Budget + Obligatoires + Évaluation
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, GraduationCap, Award, Target, Users, Settings,
  TrendingUp, Clock, CheckCircle2, DollarSign, ShieldCheck,
  Star, LayoutDashboard,
} from 'lucide-react'
import { useAuth }           from '../../contexts/AuthContext'
import { useMyTrainingStats, useMyPendingEvaluations, useMyMandatoryStatus } from '../../hooks/useFormations'

import FormationCatalog            from '../../components/formation/FormationCatalog'
import MyEnrollments               from '../../components/formation/MyEnrollments'
import MyCertifications            from '../../components/formation/MyCertifications'
import TrainingPlanPanel           from '../../components/formation/TrainingPlanPanel'
import TeamFormationDashboard      from '../../components/formation/TeamFormationDashboard'
import FormationAdminPanel         from '../../components/formation/FormationAdminPanel'
import FormationBudget             from '../../components/formation/FormationBudget'
import FormationObligatoire        from '../../components/formation/FormationObligatoire'
import FormationEvaluation         from '../../components/formation/FormationEvaluation'
import FormationDashboardEnrichi   from '../../components/formation/FormationDashboardEnrichi'

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
}

function QuickStats() {
  const { data: stats }          = useMyTrainingStats()
  const { data: pending = [] }   = useMyPendingEvaluations()
  const { data: mandatory = [] } = useMyMandatoryStatus()

  if (!stats) return null

  const nonConformes = mandatory.filter(m => m.compliance_status !== 'conforme').length

  const items = [
    { label: 'En cours',  value: stats.enrollments_in_progress, color: '#3B82F6', icon: Clock },
    { label: 'Terminées', value: stats.enrollments_completed,   color: '#10B981', icon: CheckCircle2 },
    { label: 'Heures',    value: `${stats.hours_completed || 0}h`, color: '#8B5CF6', icon: TrendingUp },
    { label: 'Certifs',   value: stats.certifications_count,    color: '#F59E0B', icon: Award },
    ...(pending.length > 0 ? [{ label: 'À évaluer', value: pending.length, color: '#F97316', icon: Star, alert: true }] : []),
    ...(nonConformes > 0 ? [{ label: 'Obligatoires', value: nonConformes, color: '#EF4444', icon: ShieldCheck, alert: true }] : []),
  ]

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
      {items.map(({ label, value, color, icon: Icon, alert }) => (
        <div key={label}
          className="rounded-xl p-3 text-center"
          style={{
            background: alert ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
            border: alert ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.06)',
          }}>
          <Icon size={14} className="mx-auto mb-1" style={{ color }}/>
          <p className="text-base font-bold text-white">{value}</p>
          <p className="text-[10px] text-white/30">{label}</p>
        </div>
      ))}
    </div>
  )
}

export default function Formation() {
  const { profile, canAdmin, canManageTeam } = useAuth()
  const role = profile?.role

  const TABS = useMemo(() => {
    const base = [
      { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard, s73: true },
      { id: 'catalog',   label: 'Catalogue',          icon: BookOpen },
      { id: 'my',        label: 'Mes formations',     icon: GraduationCap },
      { id: 'eval',      label: 'Évaluations',        icon: Star,           s73: true },
      { id: 'mandatory', label: 'Obligatoires',       icon: ShieldCheck,    s73: true },
      { id: 'certs',     label: 'Certifications',     icon: Award },
      { id: 'plan',      label: 'Mon plan',           icon: Target },
    ]
    if (canManageTeam && !canAdmin) {
      base.push({ id: 'team', label: 'Mon équipe', icon: Users })
    }
    if (canAdmin) {
      base.push({ id: 'team',   label: 'Équipe',       icon: Users })
      base.push({ id: 'budget', label: 'Budget',        icon: DollarSign, s73: true })
      base.push({ id: 'admin',  label: 'Administration', icon: Settings })
    }
    return base
  }, [role, canManageTeam, canAdmin])

  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <motion.div
      className="p-5 md:p-8 max-w-6xl mx-auto space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible">

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

      <motion.div variants={fadeUp}>
        <QuickStats/>
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="flex gap-1 flex-wrap border-b border-white/[0.06] pb-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium relative transition-colors ${
                  activeTab === tab.id ? 'text-indigo-300' : 'text-white/35 hover:text-white/60'
                }`}>
                <Icon size={14}/>
                <span>{tab.label}</span>
                {tab.s73 && (
                  <span className="text-[9px] font-bold px-1 rounded"
                    style={{ background: 'rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
                    S73
                  </span>
                )}
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

      <motion.div variants={fadeUp} key={activeTab}>
        {activeTab === 'dashboard' && <FormationDashboardEnrichi/>}
        {activeTab === 'catalog'   && <FormationCatalog/>}
        {activeTab === 'my'        && <MyEnrollments/>}
        {activeTab === 'eval'      && <FormationEvaluation/>}
        {activeTab === 'mandatory' && <FormationObligatoire/>}
        {activeTab === 'certs'     && <MyCertifications/>}
        {activeTab === 'plan'      && <TrainingPlanPanel/>}
        {activeTab === 'team'      && <TeamFormationDashboard/>}
        {activeTab === 'budget'    && <FormationBudget/>}
        {activeTab === 'admin'     && <FormationAdminPanel/>}
      </motion.div>
    </motion.div>
  )
}
