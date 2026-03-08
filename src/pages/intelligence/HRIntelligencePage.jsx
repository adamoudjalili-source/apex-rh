// ============================================================
// APEX RH — HRIntelligencePage.jsx  ·  S82
// Intelligence RH — Bilan social + turnover
// Accessible : directeur + administrateur
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, LogOut, Calendar, DollarSign, FileText } from 'lucide-react'
import HeadcountChart      from '../../components/intelligence/HeadcountChart'
import TurnoverDashboard   from '../../components/intelligence/TurnoverDashboard'
import AbsenteeismChart    from '../../components/intelligence/AbsenteeismChart'
import SalaryMassDashboard from '../../components/intelligence/SalaryMassDashboard'
import SocialReportExport  from '../../components/intelligence/SocialReportExport'

const YEAR = new Date().getFullYear()

const TABS = [
  { id: 'effectifs',  label: 'Effectifs',        icon: Users,       color: '#6366F1', component: HeadcountChart },
  { id: 'turnover',   label: 'Turnover',          icon: LogOut,      color: '#EF4444', component: TurnoverDashboard },
  { id: 'absenteisme',label: 'Absentéisme',       icon: Calendar,    color: '#F97316', component: AbsenteeismChart },
  { id: 'salaires',   label: 'Masse salariale',   icon: DollarSign,  color: '#10B981', component: SalaryMassDashboard },
  { id: 'bilan',      label: 'Bilan social',      icon: FileText,    color: '#8B5CF6', component: SocialReportExport },
]

export default function HRIntelligencePage() {
  const [activeTab, setActiveTab] = useState('effectifs')
  const [year, setYear]           = useState(YEAR)

  const years    = Array.from({ length: 5 }, (_, i) => YEAR - i)
  const current  = TABS.find(t => t.id === activeTab) || TABS[0]
  const Component = current.component

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <FileText size={16} style={{ color: '#6366F1' }}/>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Bilan Social
            </h2>
            <p className="text-xs text-white/30">Effectifs · Turnover · Absentéisme · Masse salariale</p>
          </div>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="rounded-lg px-3 py-1.5 text-sm text-white"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 border-b overflow-x-auto scrollbar-hide pb-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-all flex-shrink-0 ${active ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
              style={active ? {
                background:  'rgba(255,255,255,0.04)',
                borderTop:   `2px solid ${tab.color}`,
                borderLeft:  '1px solid rgba(255,255,255,0.08)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              } : undefined}>
              <Icon size={13} style={active ? { color: tab.color } : undefined}/>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}>
          <Component year={year}/>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
