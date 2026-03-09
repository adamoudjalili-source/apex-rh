// ============================================================
// APEX RH — src/pages/cycle-rh/CycleRHHub.jsx
// Session 98 — Module 4 : Cycle RH
// Hub unifié V2 — 5 onglets avec guards can()
// Route : /cycle-rh
// Redirections : /recrutement · /onboarding · /offboarding → /cycle-rh
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, Briefcase, UserCheck, DoorOpen, ArrowLeftRight,
  Users, TrendingUp, Clock, CheckCircle2, ShieldCheck,
  ArrowRight, MapPin, Building2, Star, AlertCircle,
} from 'lucide-react'
import { usePermission }             from '../../hooks/usePermission'
import { useRecruitmentGlobalStats } from '../../hooks/useRecruitment'
import { useOnboardingStats }        from '../../hooks/useOnboarding'
import { useOffboardingProcesses }   from '../../hooks/useOffboarding'

// Composants existants — réutilisés intégralement
import Recrutement from '../recrutement/Recrutement'
import Onboarding  from '../onboarding/Onboarding'
import Offboarding from '../offboarding/Offboarding'
import { TASK_STATUS } from '../../utils/constants'
import StatCard from '../../components/ui/StatCard'

// ─── Animations ──────────────────────────────────────────────
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

// ─── KPI Card ────────────────────────────────────────────────

// ─── Vue d'ensemble Tab ──────────────────────────────────────
function VueEnsembleTab() {
  const { data: recStats }              = useRecruitmentGlobalStats()
  const { data: onbStats }              = useOnboardingStats()
  const { data: offboardingList = [] }  = useOffboardingProcesses()

  const offActive  = offboardingList.filter(p => p.status === 'in_progress').length
  const offOverdue = offboardingList.filter(p => p.status === TASK_STATUS.OVERDUE).length

  const sections = [
    {
      title: 'Recrutement',
      color: '#818CF8',
      icon: Briefcase,
      kpis: [
        { label: 'Offres actives',   value: recStats?.active_postings,   color: '#818CF8', icon: Briefcase },
        { label: 'Candidatures',     value: recStats?.total_applications, color: '#3B82F6', icon: Users },
        { label: 'En entretien',     value: recStats?.in_interview,       color: '#F59E0B', icon: Clock },
        { label: 'Recrutés',         value: recStats?.hired,              color: '#10B981', icon: CheckCircle2 },
      ],
    },
    {
      title: 'Onboarding',
      color: '#10B981',
      icon: UserCheck,
      kpis: [
        { label: 'Actifs',           value: onbStats?.active,            color: '#10B981', icon: UserCheck },
        { label: 'Terminés',         value: onbStats?.completed,         color: '#6366F1', icon: CheckCircle2 },
        { label: 'En retard',        value: onbStats?.overdue,           color: '#EF4444', icon: AlertCircle, alert: (onbStats?.overdue ?? 0) > 0 },
        { label: 'Taux complét.',    value: onbStats?.avgCompletionRate != null ? `${onbStats.avgCompletionRate}%` : '–', color: '#F59E0B', icon: TrendingUp },
      ],
    },
    {
      title: 'Offboarding',
      color: '#EF4444',
      icon: DoorOpen,
      kpis: [
        { label: 'En cours',         value: offActive,                   color: '#F59E0B', icon: Clock },
        { label: 'En retard',        value: offOverdue,                  color: '#EF4444', icon: AlertCircle, alert: offOverdue > 0 },
        { label: 'Total suivis',     value: offboardingList.length,      color: '#8B5CF6', icon: DoorOpen },
      ],
    },
    {
      title: 'Mobilité',
      color: '#06B6D4',
      icon: ArrowLeftRight,
      kpis: [
        { label: 'Demandes actives', value: '–', color: '#06B6D4', icon: ArrowLeftRight },
        { label: 'Mutations',        value: '–', color: '#3B82F6', icon: ArrowRight },
        { label: 'Promotions',       value: '–', color: '#F59E0B', icon: Star },
      ],
    },
  ]

  return (
    <div className="space-y-8">
      {sections.map(({ title, color, icon: SectionIcon, kpis }) => (
        <div key={title}>
          <div className="flex items-center gap-2 mb-4">
            <SectionIcon size={15} style={{ color }} />
            <p className="text-sm font-semibold text-white/70">{title}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map(kpi => (
              <StatCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Mobilité Tab ────────────────────────────────────────────
// Placeholder V2 — composants mobilité à créer en Phase C
function MobiliteTab() {
  const categories = [
    {
      icon: ArrowRight,
      color: '#06B6D4',
      title: 'Mutations internes',
      desc: 'Transferts entre services et divisions',
      count: null,
    },
    {
      icon: TrendingUp,
      color: '#F59E0B',
      title: 'Promotions',
      desc: 'Évolutions hiérarchiques et changements de grade',
      count: null,
    },
    {
      icon: Building2,
      color: '#8B5CF6',
      title: 'Détachements',
      desc: 'Missions temporaires et affectations spéciales',
      count: null,
    },
    {
      icon: MapPin,
      color: '#10B981',
      title: 'Mobilité géographique',
      desc: 'Changements de site et de localisation',
      count: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6"
        style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)' }}>
        <div className="flex items-center gap-3 mb-2">
          <ArrowLeftRight size={18} style={{ color: '#06B6D4' }} />
          <p className="text-sm font-semibold text-white">Mobilité Interne</p>
        </div>
        <p className="text-xs text-white/40 ml-8">
          Gestion centralisée des demandes de mobilité, mutations et promotions au sein de l'organisation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map(({ icon: Icon, color, title, desc }) => (
          <div key={title}
            className="rounded-xl p-5 flex items-start gap-4 cursor-pointer group hover:scale-[1.01] transition-transform"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-white/90">{title}</p>
              <p className="text-xs text-white/40 mt-1">{desc}</p>
              <p className="text-[10px] text-white/20 mt-2 italic">Module en cours de déploiement</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
        <AlertCircle size={15} style={{ color: '#6366F1' }} />
        <p className="text-xs text-white/40">
          Les workflows de mobilité interne seront disponibles dans une prochaine mise à jour.
          Le suivi des career_events est déjà actif via la fiche employé.
        </p>
      </div>
    </div>
  )
}

// ─── Main Hub ─────────────────────────────────────────────────
export default function CycleRHHub() {
  const { can } = usePermission()

  const canVueEnsemble  = can('recrutement', 'pipeline', 'read')   // canManageOrg
  const canRecrutement  = can('recrutement', 'candidatures', 'read') // true (tout le monde voit ses candidatures)
  const canOnboarding   = can('onboarding', 'team', 'read')         // canManageTeam
  const canOffboarding  = can('offboarding', 'team', 'read')        // canManageTeam
  const canMobilite     = can('recrutement', 'pipeline', 'read')   // canManageOrg

  const TABS = useMemo(() => {
    const all = [
      {
        id:      'vue-ensemble',
        label:   'Vue d\'ensemble',
        icon:    TrendingUp,
        visible: canVueEnsemble,
        color:   '#C9A227',
      },
      {
        id:      'recrutement',
        label:   'Recrutement',
        icon:    Briefcase,
        visible: canRecrutement,
        color:   '#818CF8',
      },
      {
        id:      'onboarding',
        label:   'Onboarding',
        icon:    UserCheck,
        visible: canOnboarding,
        color:   '#10B981',
      },
      {
        id:      'offboarding',
        label:   'Offboarding',
        icon:    DoorOpen,
        visible: canOffboarding,
        color:   '#EF4444',
      },
      {
        id:      'mobilite',
        label:   'Mobilité',
        icon:    ArrowLeftRight,
        visible: canMobilite,
        color:   '#06B6D4',
      },
    ]
    return all.filter(t => t.visible)
  }, [canVueEnsemble, canRecrutement, canOnboarding, canOffboarding, canMobilite])

  const [activeTab, setActiveTab] = useState(() => TABS[0]?.id ?? 'recrutement')

  // Si aucun onglet visible → accès refusé
  if (TABS.length === 0) return <AccessDenied />

  // Sécurisation contournement URL
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
              style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.3)' }}>
              <RefreshCw size={20} style={{ color: '#C9A227' }} />
            </div>
            Cycle RH
          </h1>
          <p className="text-sm text-white/40 mt-1 ml-[52px]">
            Hub unifié — recrutement, intégration, départs et mobilité interne
          </p>
        </div>
      </motion.div>

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
        {currentTab === 'vue-ensemble' && (canVueEnsemble  ? <VueEnsembleTab />  : <AccessDenied />)}
        {currentTab === 'recrutement'  && (canRecrutement   ? <Recrutement />    : <AccessDenied />)}
        {currentTab === 'onboarding'   && (canOnboarding    ? <Onboarding />     : <AccessDenied />)}
        {currentTab === 'offboarding'  && (canOffboarding   ? <Offboarding />    : <AccessDenied />)}
        {currentTab === 'mobilite'     && (canMobilite      ? <MobiliteTab />    : <AccessDenied />)}
      </motion.div>
    </motion.div>
  )
}
