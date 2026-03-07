// ============================================================
// APEX RH — IntelligenceRH.jsx  ·  Session 47
// + Tableau de Bord DRH (S47) : vue consolidée stratégique
//   KPIs globaux, matrice divisions, alertes, export Excel
// + Cartographie Talents / Succession Planning (S51) : 9-Box, postes clés
// + Behavioral Intelligence Engine (S54) : attrition prédictive, trajectoires, alertes
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppSettings } from '../../hooks/useSettings'
import { useAuth } from '../../contexts/AuthContext'
import { BarChart3, MessageSquare, ClipboardList, Activity, Wifi, TrendingUp, GitBranch, LayoutDashboard, Building2, Grid3x3, Brain, Star } from 'lucide-react'

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

// Groupes sémantiques (pour documentation) :
//   Mesure    : performance, analytics, analytics_predictifs, activite, cartographie_charges
//   Évaluation: feedback360, surveys, review_cycles, enps
//   Talent    : talents, behavioral
//   Stratégie : drh, direction, adoption
const TABS = [
  // ─── Groupe Mesure ───────────────────────────────────────────
  { id:'performance',          label:'Performance PULSE',   icon:Activity,         component:BoardPage,               color:'#4F46E5', moduleKey:null },
  { id:'analytics',            label:'Analytics',           icon:BarChart3,        component:AnalyticsPage,           color:'#8B5CF6', moduleKey:'analytics_enabled' },
  { id:'analytics_predictifs', label:'Prédictifs',          icon:GitBranch,        component:AnalyticsPredictifs,     color:'#A78BFA', moduleKey:null },
  { id:'activite',             label:'Activité Réelle',     icon:Wifi,             component:ActiviteReelle,          color:'#F59E0B', moduleKey:null },
  { id:'cartographie_charges', label:'Charges',             icon:BarChart3,        component:CartographieCharges,     color:'#F97316', moduleKey:null, managerOnly:true },  // S42 — Étape 8
  // ─── Groupe Évaluation ───────────────────────────────────────
  { id:'feedback360',          label:'Évaluations 360°',   icon:MessageSquare,    component:Feedback360Page,         color:'#3B82F6', moduleKey:'feedback360_enabled' },  // renommé Étape 10
  { id:'surveys',              label:'Enquêtes',            icon:TrendingUp,       component:SurveysPage,             color:'#10B981', moduleKey:'surveys_engagement_enabled' },  // Étape 22
  { id:'review_cycles',        label:'Campagnes',           icon:ClipboardList,    component:ReviewCyclesPage,        color:'#C9A227', moduleKey:'review_cycles_enabled' },  // Étape 22
  { id:'enps',                 label:'eNPS',                icon:Star,             component:ENPSPage,                color:'#10B981', moduleKey:'surveys_engagement_enabled' },
  // ─── Groupe Talent ───────────────────────────────────────────
  { id:'talents',              label:'Talents',             icon:Grid3x3,          component:TalentMapping,           color:'#F59E0B', moduleKey:null, managerOnly:true },
  { id:'behavioral',           label:'Comportemental',      icon:Brain,            component:BehavioralIntelligence,  color:'#EF4444', moduleKey:null, managerOnly:true },
  // ─── Groupe Stratégie ────────────────────────────────────────
  { id:'drh',                  label:'Tableau DRH',         icon:LayoutDashboard,  component:TableauBordDRH,          color:'#EC4899', moduleKey:null, adminOnly:true },
  { id:'direction',            label:'Direction Générale',  icon:Building2,        component:DashboardDirection,      color:'#C9A227', moduleKey:null, adminOnly:true },  // directionOnly→adminOnly (B-1) — Étape 15
  { id:'adoption',             label:'Adoption',            icon:Star,             component:AdoptionDashboard,       color:'#818CF8', moduleKey:null, adminOnly:true },  // S40 — Étape 8
]

export default function IntelligenceRH() {
  const { data: settings }    = useAppSettings()
  const { isAdminOrAbove, isManagerOrAbove } = useAuth()
  const modules                = settings?.modules || {}
  const [activeTab, setActive] = useState('performance')

  const isAdmin = isAdminOrAbove
  const isManager = isManagerOrAbove

  const visible = TABS.filter(t => {
    if (t.moduleKey && modules[t.moduleKey] !== true) return false
    if (t.managerOnly && !isManager)  return false
    if (t.adminOnly   && !isAdmin)    return false  // adminOnly = isAdminOrAbove (adminstr. + directeur)
    return true
  })

  const current   = visible.find(t => t.id === activeTab) || visible[0]
  const Component = current?.component

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0 border-b border-white/[0.06]"
        style={{ background:'linear-gradient(180deg,rgba(139,92,246,0.04) 0%,transparent 100%)' }}>
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
        <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-hide">
          {visible.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActive(tab.id)}
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