// ============================================================
// APEX RH — src/pages/developpement/DeveloppementHub.jsx
// Session 97 — Module 7 : Formation & Développement
// Hub unifié V2 — 5 onglets avec guards can()
// Route : /developpement  (+ redirect /formation → /developpement)
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, BookOpen, Users, DollarSign, Settings,
  BookMarked, TrendingUp, Award, Clock, CheckCircle2,
  ShieldCheck, Star,
} from 'lucide-react'
import { usePermission }           from '../../hooks/usePermission'
import { useAuth }                  from '../../contexts/AuthContext'
import {
  useMyTrainingStats,
  useMyPendingEvaluations,
  useMyMandatoryStatus,
} from '../../hooks/useFormations'

import FormationCatalog       from '../../components/formation/FormationCatalog'
import MyEnrollments          from '../../components/formation/MyEnrollments'
import MyCertifications       from '../../components/formation/MyCertifications'
import TrainingPlanPanel      from '../../components/formation/TrainingPlanPanel'
import TeamFormationDashboard from '../../components/formation/TeamFormationDashboard'
import FormationBudget        from '../../components/formation/FormationBudget'
import FormationObligatoire   from '../../components/formation/FormationObligatoire'
import FormationAdminPanel    from '../../components/formation/FormationAdminPanel'

// ─── Animation ───────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
}
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}

// ─── Access Denied ───────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/30">
      <ShieldCheck size={40} />
      <p className="text-sm">Accès non autorisé</p>
    </div>
  )
}

// ─── Quick Stats Banner ──────────────────────────────────────
function QuickStats() {
  const { data: stats }          = useMyTrainingStats()
  const { data: pending = [] }   = useMyPendingEvaluations()
  const { data: mandatory = [] } = useMyMandatoryStatus()

  if (!stats) return null

  const nonConformes = mandatory.filter(m => m.compliance_status !== 'conforme').length

  const items = [
    { label: 'En cours',  value: stats.enrollments_in_progress ?? 0, color: '#3B82F6', icon: Clock },
    { label: 'Terminées', value: stats.enrollments_completed ?? 0,   color: '#10B981', icon: CheckCircle2 },
    { label: 'Heures',    value: `${stats.hours_completed ?? 0}h`,   color: '#8B5CF6', icon: TrendingUp },
    { label: 'Certifs',   value: stats.certifications_count ?? 0,    color: '#F59E0B', icon: Award },
    ...(pending.length > 0
      ? [{ label: 'À évaluer', value: pending.length, color: '#F97316', icon: Star, alert: true }]
      : []),
    ...(nonConformes > 0
      ? [{ label: 'Obligatoires', value: nonConformes, color: '#EF4444', icon: ShieldCheck, alert: true }]
      : []),
  ]

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-6">
      {items.map(({ label, value, color, icon: Icon, alert }) => (
        <div
          key={label}
          className="rounded-xl p-3 text-center"
          style={{
            background: alert ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
            border: alert ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Icon size={14} className="mx-auto mb-1" style={{ color }} />
          <p className="text-base font-bold text-white">{value}</p>
          <p className="text-[10px] text-white/30">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Mon Développement Tab ───────────────────────────────────
// Regroupe : Mes formations + Certifications + Plan individuel
function MonDeveloppementTab() {
  const [sub, setSub] = useState('formations')

  const subTabs = [
    { id: 'formations',    label: 'Mes formations',  icon: GraduationCap },
    { id: 'certifications',label: 'Certifications',  icon: Award },
    { id: 'plan',          label: 'Mon plan',         icon: BookMarked },
  ]

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSub(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              sub === id
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            style={sub === id ? { background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)' } : {}}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {sub === 'formations'     && <MyEnrollments />}
      {sub === 'certifications' && <MyCertifications />}
      {sub === 'plan'           && <TrainingPlanPanel />}
    </div>
  )
}

// ─── Budget Tab ───────────────────────────────────────────────
// Regroupe : Budget formation + Obligatoires
function BudgetTab({ canAdminBudget }) {
  const [sub, setSub] = useState('budget')

  const subTabs = [
    { id: 'budget',      label: 'Budget formation', icon: DollarSign },
    { id: 'obligatoires',label: 'Obligatoires',      icon: ShieldCheck, adminOnly: true },
  ].filter(t => !t.adminOnly || canAdminBudget)

  return (
    <div>
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSub(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              sub === id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
            style={sub === id ? { background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)' } : {}}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {sub === 'budget'       && <FormationBudget />}
      {sub === 'obligatoires' && <FormationObligatoire />}
    </div>
  )
}

// ─── Main Hub ─────────────────────────────────────────────────
export default function DeveloppementHub() {
  const { can } = usePermission()

  const canReadOwn       = can('developpement', 'own',       'read')
  const canReadCatalogue = can('developpement', 'catalogue', 'read')
  const canReadTeam      = can('developpement', 'team',      'read')
  const canReadBudget    = can('developpement', 'budget',    'read')
  const canAdminBudget   = can('developpement', 'budget',    'admin')

  // Build visible tabs using can() — jamais check rôle direct
  const TABS = useMemo(() => {
    const all = [
      {
        id:      'mon-dev',
        label:   'Mon Développement',
        icon:    GraduationCap,
        visible: canReadOwn,
        color:   '#6366F1',
      },
      {
        id:      'catalogue',
        label:   'Catalogue',
        icon:    BookOpen,
        visible: canReadCatalogue,
        color:   '#10B981',
      },
      {
        id:      'equipe',
        label:   'Mon Équipe',
        icon:    Users,
        visible: canReadTeam,
        color:   '#3B82F6',
      },
      {
        id:      'budget',
        label:   'Budget',
        icon:    DollarSign,
        visible: canReadBudget,
        color:   '#F59E0B',
      },
      {
        id:      'admin',
        label:   'Administration',
        icon:    Settings,
        visible: canAdminBudget,
        color:   '#EF4444',
      },
    ]
    return all.filter(t => t.visible)
  }, [canReadOwn, canReadCatalogue, canReadTeam, canReadBudget, canAdminBudget])

  const [activeTab, setActiveTab] = useState(() => TABS[0]?.id ?? 'mon-dev')

  // Si aucun onglet visible → accès refusé
  if (TABS.length === 0) return <AccessDenied />

  // Sécurisation contournement URL : activeTab doit être dans les tabs visibles
  const currentTab = TABS.find(t => t.id === activeTab) ? activeTab : TABS[0].id

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <GraduationCap size={20} style={{ color: '#6366F1' }} />
            </div>
            Formation & Développement
          </h1>
          <p className="text-sm text-white/40 mt-1 ml-[52px]">
            Hub unifié — formations, compétences et développement professionnel
          </p>
        </div>
      </motion.div>

      {/* Quick Stats (Mon Développement only) */}
      {currentTab === 'mon-dev' && (
        <motion.div variants={fadeUp}>
          <QuickStats />
        </motion.div>
      )}

      {/* Tab Bar */}
      <motion.div variants={fadeUp}>
        <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                currentTab === id ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              style={currentTab === id
                ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }
                : {}}
            >
              <Icon size={15} style={{ color: currentTab === id ? color : undefined }} />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={fadeUp} key={currentTab}>
        {currentTab === 'mon-dev'   && <MonDeveloppementTab />}
        {currentTab === 'catalogue' && <FormationCatalog />}
        {currentTab === 'equipe'    && (canReadTeam   ? <TeamFormationDashboard /> : <AccessDenied />)}
        {currentTab === 'budget'    && (canReadBudget ? <BudgetTab canAdminBudget={canAdminBudget} /> : <AccessDenied />)}
        {currentTab === 'admin'     && (canAdminBudget ? <FormationAdminPanel /> : <AccessDenied />)}
      </motion.div>
    </motion.div>
  )
}
