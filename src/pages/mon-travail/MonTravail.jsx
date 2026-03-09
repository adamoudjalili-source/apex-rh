// ============================================================
// APEX RH — MonTravail.jsx · S110
// Hub Mon Travail — 3 onglets : Tâches · Projets · OKR
// Unifie /travail/taches + /travail/projets + /travail/objectifs
// en un seul espace personnel
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckSquare, FolderKanban, Target } from 'lucide-react'

import Tasks          from '../tasks/Tasks'
import ProjectsPage   from '../projects/Projects'
import ObjectivesPage from '../objectives/Objectives'

const TABS = [
  { id: 'taches',    label: 'Tâches',  icon: CheckSquare,  color: '#6366F1', component: Tasks          },
  { id: 'projets',   label: 'Projets', icon: FolderKanban, color: '#3B82F6', component: ProjectsPage   },
  { id: 'objectifs', label: 'OKR',     icon: Target,       color: '#8B5CF6', component: ObjectivesPage },
]

export default function MonTravail() {
  const [activeTab, setActiveTab] = useState('taches')
  const current   = TABS.find(t => t.id === activeTab)
  const Component = current?.component

  return (
    <div className="flex flex-col h-full">

      {/* Header + onglets */}
      <div className="flex-shrink-0 border-b border-white/[0.06] px-6 pt-6 pb-0"
        style={{ background: 'rgba(9,9,32,0.6)' }}>
        <h1 className="text-2xl font-bold text-white mb-1">Mon Travail</h1>
        <p className="text-sm text-white/40 mb-4">Tâches, projets et objectifs OKR assignés.</p>

        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon     = tab.icon
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 relative ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
                style={isActive ? { background: `${tab.color}14` } : undefined}>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                    style={{ background: tab.color }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}/>
                )}
                <Icon size={15} style={isActive ? { color: tab.color } : undefined}/>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu onglet actif */}
      <div className="flex-1 overflow-auto">
        {Component && <Component />}
      </div>

    </div>
  )
}
