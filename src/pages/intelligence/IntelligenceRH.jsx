// ============================================================
// APEX RH — IntelligenceRH.jsx  ·  Session 36 v3
// Hub Intelligence RH — onglets horizontaux premium
// Performance PULSE · Analytics · Feedback 360° · Surveys · Review Cycles · Activité Réelle
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppSettings } from '../../hooks/useSettings'
import { BarChart3, MessageSquare, ClipboardList, Activity, Wifi, TrendingUp } from 'lucide-react'

import BoardPage        from '../pulse/Board'
import AnalyticsPage    from '../pulse/Analytics'
import Feedback360Page  from '../pulse/Feedback360'
import SurveysPage      from '../pulse/EngagementSurveys'
import ReviewCyclesPage from '../pulse/ReviewCycles'

const TABS = [
  { id:'performance',   label:'Performance PULSE', icon:Activity,      component:BoardPage,        color:'#4F46E5', moduleKey:null },
  { id:'analytics',     label:'Analytics',         icon:BarChart3,     component:AnalyticsPage,    color:'#8B5CF6', moduleKey:'analytics_enabled' },
  { id:'feedback360',   label:'Feedback 360°',     icon:MessageSquare, component:Feedback360Page,  color:'#3B82F6', moduleKey:'feedback360_enabled' },
  { id:'surveys',       label:'Surveys',           icon:TrendingUp,    component:SurveysPage,      color:'#10B981', moduleKey:'surveys_engagement_enabled' },
  { id:'review_cycles', label:'Review Cycles',     icon:ClipboardList, component:ReviewCyclesPage, color:'#C9A227', moduleKey:'review_cycles_enabled' },
  { id:'activite',      label:'Activité Réelle',   icon:Wifi,          component:null,             color:'#F59E0B', moduleKey:null, comingSoon:true },
]

export default function IntelligenceRH() {
  const { data: settings }   = useAppSettings()
  const modules               = settings?.modules || {}
  const [activeTab, setActive] = useState('performance')

  const visible = TABS.filter(t => !t.moduleKey || modules[t.moduleKey] === true)
  const current = visible.find(t=>t.id===activeTab) || visible[0]
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
                {tab.comingSoon && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>S39</span>}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {current?.comingSoon ? (
          <ComingSoon tab={current}/>
        ) : Component ? (
          <motion.div key={activeTab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.22}} className="h-full">
            <Component/>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}

function ComingSoon({ tab }) {
  const Icon = tab.icon
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-12 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background:`${tab.color}12`, border:`1px solid ${tab.color}20` }}>
        <Icon size={28} style={{ color:tab.color }}/>
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily:"'Syne',sans-serif" }}>{tab.label}</h3>
        <p className="text-sm text-white/30 max-w-sm">Connecteur logiciels métiers NITA + Agent Desktop Windows</p>
      </div>
      <div className="px-4 py-2 rounded-xl text-sm font-medium"
        style={{ background:`${tab.color}10`, border:`1px solid ${tab.color}20`, color:tab.color }}>
        Disponible en Session 39
      </div>
    </div>
  )
}
