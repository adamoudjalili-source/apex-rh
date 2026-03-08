// ============================================================
// APEX RH — IntelligenceRH.jsx  ·  Réorg UX Hub & Spoke
// S76 — +3 onglets PULSE : Alertes / Heatmap équipe / Calibration
// Navigation 2 niveaux :
//   Groupes : Mesure · Évaluation · Talent · Stratégie
//   Onglets : filtrés par groupe actif + droits rôle
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppSettings } from '../../hooks/useSettings'
import { useAuth } from '../../contexts/AuthContext'
import { BarChart3, MessageSquare, ClipboardList, Activity, Wifi, TrendingUp, GitBranch, LayoutDashboard, Building2, Grid3x3, Brain, Star, Gauge, Target, BarChart2, Bell, SlidersHorizontal, FileText, Map } from 'lucide-react'

import PulseAlertCenter          from '../../components/pulse/PulseAlertCenter'    // S76
import TeamPulseHeatmap          from '../../components/pulse/TeamPulseHeatmap'    // S76
import PulseCalibration          from '../../components/pulse/PulseCalibration'    // S76
import BoardPage                 from '../pulse/Board'
import AnalyticsPage             from '../pulse/Analytics'
import Feedback360Page           from '../pulse/Feedback360'
import SurveysPage               from '../pulse/EngagementSurveys'
import ReviewCyclesPage          from '../pulse/ReviewCycles'
import ActiviteReelle            from './ActiviteReelle'
import AnalyticsPredictifs       from './AnalyticsPredictifs'
import TableauBordDRH            from './TableauBordDRH'
import DashboardDirection        from './DashboardDirection'
import TalentMapping             from './TalentMapping'
import BehavioralIntelligence    from './BehavioralIntelligence'   // S54
import ENPSPage                  from './ENPSPage'                  // S55
import AdoptionDashboard          from './AdoptionDashboard'           // S40 — Étape 8
import CartographieCharges        from './CartographieCharges'          // S42 — Étape 8
import HRIntelligencePage         from './HRIntelligencePage'           // S82 — Bilan social
import SuccessionVivierPage        from '../talent/SuccessionVivierPage'  // S83 — Vivier + gap analysis

// Groupes sémantiques (pour documentation) :
//   Mesure    : performance, analytics, analytics_predictifs, activite, cartographie_charges
//   Évaluation: feedback360, surveys, review_cycles, enps
//   Talent    : talents, behavioral
//   Stratégie : drh, direction, adoption
// ─── Groupes sémantiques ─────────────────────────────────────
const GROUPS = [
  { id:'mesure',     label:'Mesure',     color:'#4F46E5', icon:Gauge },
  { id:'evaluation', label:'Évaluation', color:'#3B82F6', icon:Target },
  { id:'talent',     label:'Talent',     color:'#F59E0B', icon:Grid3x3 },
  { id:'strategie',  label:'Stratégie',  color:'#EC4899', icon:BarChart2,  adminOnly:true },
]

const TABS = [
  // ─── Groupe Mesure ───────────────────────────────────────────
  { id:'performance',          group:'mesure',     label:'Performance PULSE',   icon:Activity,           component:BoardPage,               color:'#4F46E5', moduleKey:null },
  { id:'alertes_pulse',        group:'mesure',     label:'Alertes PULSE',       icon:Bell,               component:PulseAlertCenter,        color:'#EF4444', moduleKey:null },                         // S76
  { id:'heatmap_pulse',        group:'mesure',     label:'Heatmap équipe',      icon:Grid3x3,            component:TeamPulseHeatmap,        color:'#8B5CF6', moduleKey:null, managerOnly:true },        // S76
  { id:'calibration_pulse',    group:'mesure',     label:'Calibration',         icon:SlidersHorizontal,  component:PulseCalibration,        color:'#C9A227', moduleKey:null, adminOnly:true },           // S76
  { id:'analytics',            group:'mesure',     label:'Analytics',           icon:BarChart3,          component:AnalyticsPage,           color:'#8B5CF6', moduleKey:'analytics_enabled' },
  { id:'analytics_predictifs', group:'mesure',     label:'Prédictifs',          icon:GitBranch,        component:AnalyticsPredictifs,     color:'#A78BFA', moduleKey:null },
  { id:'activite',             group:'mesure',     label:'Activité Réelle',     icon:Wifi,             component:ActiviteReelle,          color:'#F59E0B', moduleKey:null },
  { id:'cartographie_charges', group:'mesure',     label:'Charges',             icon:BarChart3,        component:CartographieCharges,     color:'#F97316', moduleKey:null, managerOnly:true },
  // ─── Groupe Évaluation ───────────────────────────────────────
  { id:'feedback360',          group:'evaluation', label:'Évaluations 360°',   icon:MessageSquare,    component:Feedback360Page,         color:'#3B82F6', moduleKey:'feedback360_enabled' },
  { id:'surveys',              group:'evaluation', label:'Enquêtes',            icon:TrendingUp,       component:SurveysPage,             color:'#10B981', moduleKey:'surveys_engagement_enabled' },
  { id:'review_cycles',        group:'evaluation', label:'Campagnes',           icon:ClipboardList,    component:ReviewCyclesPage,        color:'#C9A227', moduleKey:'review_cycles_enabled' },
  { id:'enps',                 group:'evaluation', label:'eNPS',                icon:Star,             component:ENPSPage,                color:'#10B981', moduleKey:'surveys_engagement_enabled' },
  // ─── Groupe Talent ───────────────────────────────────────────
  { id:'talents',              group:'talent',     label:'Cartographie Talents',icon:Grid3x3,          component:TalentMapping,           color:'#F59E0B', moduleKey:null, managerOnly:true },
  { id:'behavioral',           group:'talent',     label:'Comportemental',      icon:Brain,            component:BehavioralIntelligence,  color:'#EF4444', moduleKey:null, managerOnly:true },
  { id:'vivier_s83',           group:'talent',     label:'Vivier & Relève',     icon:Map,              component:SuccessionVivierPage,    color:'#10B981', moduleKey:null, adminOnly:true },  // S83
  // ─── Groupe Stratégie ────────────────────────────────────────
  { id:'drh',                  group:'strategie',  label:'Tableau DRH',         icon:LayoutDashboard,  component:TableauBordDRH,          color:'#EC4899', moduleKey:null, adminOnly:true },
  { id:'direction',            group:'strategie',  label:'Direction Générale',  icon:Building2,        component:DashboardDirection,      color:'#C9A227', moduleKey:null, adminOnly:true },
  { id:'adoption',             group:'strategie',  label:'Adoption',            icon:Star,             component:AdoptionDashboard,       color:'#818CF8', moduleKey:null, adminOnly:true },
  { id:'bilan_social',         group:'strategie',  label:'Bilan Social',        icon:FileText,         component:HRIntelligencePage,      color:'#6366F1', moduleKey:null, adminOnly:true },  // S82
]

export default function IntelligenceRH() {
  const { data: settings }    = useAppSettings()
  const { isAdminOrAbove, isManagerOrAbove } = useAuth()
  const modules                = settings?.modules || {}

  const isAdmin   = isAdminOrAbove
  const isManager = isManagerOrAbove

  // ── Filtrer les onglets visibles selon droits ──────────────
  const visibleTabs = TABS.filter(t => {
    if (t.moduleKey && modules[t.moduleKey] !== true) return false
    if (t.managerOnly && !isManager) return false
    if (t.adminOnly   && !isAdmin)   return false
    return true
  })

  // ── Groupes visibles (ceux qui ont au moins 1 onglet visible) ──
  const visibleGroups = GROUPS.filter(g => {
    if (g.adminOnly && !isAdmin) return false
    return visibleTabs.some(t => t.group === g.id)
  })

  const [activeGroup, setActiveGroup] = useState(() => visibleGroups[0]?.id || 'mesure')
  const [activeTab,   setActiveTab]   = useState(() => visibleTabs.find(t => t.group === (visibleGroups[0]?.id || 'mesure'))?.id || 'performance')

  const tabsForGroup = visibleTabs.filter(t => t.group === activeGroup)
  const currentGroup = visibleGroups.find(g => g.id === activeGroup) || visibleGroups[0]

  const handleGroupChange = (groupId) => {
    setActiveGroup(groupId)
    const firstTab = visibleTabs.find(t => t.group === groupId)
    if (firstTab) setActiveTab(firstTab.id)
  }

  const current   = tabsForGroup.find(t => t.id === activeTab) || tabsForGroup[0]
  const Component = current?.component

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0 border-b border-white/[0.06]"
        style={{ background:'linear-gradient(180deg,rgba(139,92,246,0.04) 0%,transparent 100%)' }}>
        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.2)' }}>
            <BarChart3 size={16} style={{ color:'#8B5CF6' }}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>Intelligence RH</h1>
            <p className="text-xs text-white/30">Mesure, analyse et pilotage de la performance</p>
          </div>
        </div>

        {/* Niveau 1 — Groupes */}
        <div className="flex items-center gap-1.5 mb-3">
          {visibleGroups.map(group => {
            const Icon    = group.icon
            const isActive = activeGroup === group.id
            return (
              <button key={group.id} onClick={() => handleGroupChange(group.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={isActive
                  ? { background:`${group.color}18`, color:group.color, border:`1px solid ${group.color}35` }
                  : { color:'rgba(255,255,255,0.3)', border:'1px solid transparent' }}>
                <Icon size={12}/>
                {group.label}
              </button>
            )
          })}
        </div>

        {/* Niveau 2 — Onglets du groupe actif */}
        <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-hide">
          {tabsForGroup.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-all flex-shrink-0 ${active?'text-white':'text-white/30 hover:text-white/60'}`}
                style={active?{ background:'rgba(255,255,255,0.04)', borderTop:`2px solid ${tab.color}`, borderLeft:'1px solid rgba(255,255,255,0.08)', borderRight:'1px solid rgba(255,255,255,0.08)' }:undefined}>
                <Icon size={13} style={active?{color:tab.color}:undefined}/>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {Component ? (
          <motion.div key={activeTab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.22}} className="h-full">
            <Component/>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}