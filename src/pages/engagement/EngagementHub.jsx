// ============================================================
// APEX RH — EngagementHub.jsx  ·  Session 36 v3
// Hub Engagement — Awards · Gamification · IA Coach · Rapports
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppSettings } from '../../hooks/useSettings'
import { Trophy, Zap, BrainCircuit, FileText } from 'lucide-react'

import AwardsPage       from '../pulse/Awards'
import GamificationPage from '../pulse/Gamification'
import AICoachPage      from '../pulse/AICoach'
import ReportsPage      from '../pulse/Reports'

const TABS = [
  { id:'awards',       label:'Awards',       icon:Trophy,       component:AwardsPage,       color:'#C9A227', moduleKey:null },
  { id:'gamification', label:'Classements',  icon:Zap,          component:GamificationPage, color:'#F59E0B', moduleKey:'gamification_enabled' },
  { id:'ia_coach',     label:'IA Coach',     icon:BrainCircuit, component:AICoachPage,      color:'#8B5CF6', moduleKey:'ia_coach_enabled' },
  { id:'rapports',     label:'Rapports',     icon:FileText,     component:ReportsPage,      color:'#3B82F6', moduleKey:null },
]

export default function EngagementHub() {
  const { data: settings }     = useAppSettings()
  const modules                 = settings?.modules || {}
  const [activeTab, setActive]  = useState('awards')

  const visible   = TABS.filter(t => !t.moduleKey || modules[t.moduleKey] === true)
  const current   = visible.find(t=>t.id===activeTab) || visible[0]
  const Component = current?.component

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0 border-b border-white/[0.06]"
        style={{ background:'linear-gradient(180deg,rgba(201,162,39,0.04) 0%,transparent 100%)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(201,162,39,0.12)', border:'1px solid rgba(201,162,39,0.2)' }}>
            <Trophy size={16} style={{ color:'#C9A227' }}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>Engagement</h1>
            <p className="text-xs text-white/30">Reconnaissance, motivation et développement</p>
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
