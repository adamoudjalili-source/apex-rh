// ============================================================
// APEX RH — IntelligenceRH.jsx  ·  V2 Hub unifié S95
// Module 8 — Intelligence RH épurée
// 7 onglets : Vue d'ensemble · Effectifs · Absentéisme ·
//             Compétences · Succession · Prédictif · Exports
// Pattern V2 : can() via usePermission() — zéro check rôle direct
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Calendar, BookOpen,
  Map, GitBranch, FileText, Lock,
} from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'

// ── Composants réutilisés ────────────────────────────────────
import TableauBordDRH         from './TableauBordDRH'
import AbsenteeismChart        from '../../components/intelligence/AbsenteeismChart'
import HeadcountChart          from '../../components/intelligence/HeadcountChart'
import TurnoverDashboard       from '../../components/intelligence/TurnoverDashboard'
import SocialReportExport      from '../../components/intelligence/SocialReportExport'
import HRIntelligencePage      from './HRIntelligencePage'
import AnalyticsPredictifs     from './AnalyticsPredictifs'
import SuccessionVivierPage    from '../talent/SuccessionVivierPage'
import CompetencyFrameworkPage from '../talent/CompetencyFrameworkPage'

// ── Animations ───────────────────────────────────────────────
const fadeIn = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

// ── Onglet Effectifs — wrapper combinant Headcount + Turnover ─
function EffectifsPanel() {
  return (
    <div className="space-y-6">
      <HeadcountChart />
      <TurnoverDashboard />
    </div>
  )
}

// ── Onglet Exports — wrapper combinant HRIntelligence + SocialReport ─
function ExportsPanel() {
  return (
    <div className="space-y-6">
      <HRIntelligencePage />
      <SocialReportExport />
    </div>
  )
}

// ── Définition des 7 onglets ──────────────────────────────────
const TABS = [
  {
    id:        'overview',
    label:     "Vue d'ensemble",
    icon:      LayoutDashboard,
    color:     '#C9A227',
    resource:  'overview',
    component: TableauBordDRH,
  },
  {
    id:        'effectifs',
    label:     'Effectifs',
    icon:      Users,
    color:     '#6366F1',
    resource:  'effectifs',
    component: EffectifsPanel,
  },
  {
    id:        'absenteisme',
    label:     'Absentéisme',
    icon:      Calendar,
    color:     '#3B82F6',
    resource:  'absenteisme',
    component: AbsenteeismChart,
  },
  {
    id:        'competences',
    label:     'Compétences',
    icon:      BookOpen,
    color:     '#10B981',
    resource:  'competences',
    component: CompetencyFrameworkPage,
  },
  {
    id:        'succession',
    label:     'Succession',
    icon:      Map,
    color:     '#F59E0B',
    resource:  'succession',
    component: SuccessionVivierPage,
  },
  {
    id:        'predictif',
    label:     'Prédictif',
    icon:      GitBranch,
    color:     '#8B5CF6',
    resource:  'predictif',
    component: AnalyticsPredictifs,
  },
  {
    id:        'exports',
    label:     'Exports',
    icon:      FileText,
    color:     '#EC4899',
    resource:  'exports',
    component: ExportsPanel,
  },
]

// ── AccessDenied — affiché si contournement URL ───────────────
function AccessDenied() {
  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible"
      className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={22} color="#EF4444" />
      </div>
      <p className="text-white/50 text-sm">Accès non autorisé</p>
      <p className="text-white/25 text-xs">
        Vous n&apos;avez pas les droits pour consulter cette section.
      </p>
    </motion.div>
  )
}

// ── TabButton ─────────────────────────────────────────────────
function TabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
      style={{
        background: isActive ? `${tab.color}18` : 'transparent',
        color:      isActive ? tab.color : 'rgba(255,255,255,0.45)',
        border:     `1px solid ${isActive ? `${tab.color}35` : 'transparent'}`,
      }}>
      <Icon size={15} />
      {tab.label}
      {isActive && (
        <motion.div
          layoutId="intel-tab-indicator"
          className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
          style={{ background: tab.color }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function IntelligenceRH() {
  const { can } = usePermission()

  // Filtrer les onglets visibles selon can()
  const visibleTabs = TABS.filter(t => can('intelligence', t.resource, 'read'))

  const [activeTabId, setActiveTabId] = useState(() => visibleTabs[0]?.id ?? null)

  // Onglet actif parmi les visibles
  const activeTab = visibleTabs.find(t => t.id === activeTabId) ?? visibleTabs[0] ?? null

  // Aucun accès
  if (visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <AccessDenied />
      </div>
    )
  }

  const ActiveComponent = activeTab?.component ?? null

  return (
    <div className="flex flex-col h-full min-h-0" style={{ color: '#fff' }}>

      {/* ── En-tête ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <GitBranch size={17} color="#8B5CF6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Intelligence RH</h1>
            <p className="text-xs text-white/35 mt-0.5">Données, tendances et pilotage stratégique</p>
          </div>
        </div>

        {/* ── Onglets ───────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-px"
          style={{ scrollbarWidth: 'none' }}>
          {visibleTabs.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab?.id === tab.id}
              onClick={() => setActiveTabId(tab.id)}
            />
          ))}
        </div>

        {/* Ligne séparatrice */}
        <div className="mt-3 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── Contenu ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          {ActiveComponent && (
            can('intelligence', activeTab.resource, 'read') ? (
              <motion.div
                key={activeTab.id}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}>
                <ActiveComponent />
              </motion.div>
            ) : (
              <motion.div key="denied" variants={fadeIn} initial="hidden" animate="visible">
                <AccessDenied />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
