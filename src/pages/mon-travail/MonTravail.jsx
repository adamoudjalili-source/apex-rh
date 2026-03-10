// ============================================================
// APEX RH — MonTravail.jsx · S134
// Hub Mon Espace — Tâches · Projets · OKR
// Aurora Design #9 — tabs glass jade/violet/or
// Stats header supprimé · Max 400 lignes
// ============================================================
import { useSearchParams } from 'react-router-dom'
import { motion }          from 'framer-motion'
import { CheckSquare, FolderKanban, Target } from 'lucide-react'

import Tasks          from '../tasks/Tasks'
import ProjectsPage   from '../projects/Projects'
import ObjectivesPage from '../objectives/Objectives'

const TABS = [
  { id: 'taches',    label: 'Tâches',  Icon: CheckSquare,  accent: '#6EE7B7', rgb: '16,185,129'  },
  { id: 'projets',   label: 'Projets', Icon: FolderKanban, accent: '#C4B5FD', rgb: '139,92,246'  },
  { id: 'objectifs', label: 'OKR',     Icon: Target,       accent: '#FDE68A', rgb: '245,158,11'  },
]
const DEFAULT_TAB = 'taches'

function TabBar({ activeTab, onTabClick }) {
  return (
    <div
      className="flex-shrink-0 px-6"
      style={{
        borderBottom: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(3,8,15,.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex gap-1 pt-1">
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className="relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200"
              style={{
                borderRadius: '10px 10px 0 0',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? `rgba(${tab.rgb},.08)` : 'transparent',
                color: isActive ? tab.accent : 'rgba(255,255,255,.35)',
                backdropFilter: isActive ? 'blur(20px)' : undefined,
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="aurora-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${tab.accent}, transparent)`,
                    boxShadow: `0 0 10px ${tab.accent}80`,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <tab.Icon
                size={14}
                style={isActive ? { color: tab.accent, filter: `drop-shadow(0 0 4px ${tab.accent}80)` } : undefined}
              />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function MonTravail() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  function handleTabClick(tabId) {
    setSearchParams({ tab: tabId }, { replace: true })
  }

  return (
    <div className="flex flex-col h-full">

      {/* En-tête */}
      <div
        className="flex-shrink-0 px-6 pt-6 pb-3"
        style={{ background: 'rgba(3,8,15,.15)', backdropFilter: 'blur(10px)' }}
      >
        <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.5px' }}>
          Mon Travail
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.35)' }}>
          Tâches, projets et objectifs OKR qui me sont assignés.
        </p>
      </div>

      {/* Onglets */}
      <TabBar activeTab={activeTab} onTabClick={handleTabClick} />

      {/* Contenu onglet actif */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'taches'    && <Tasks />}
        {activeTab === 'projets'   && <ProjectsPage />}
        {activeTab === 'objectifs' && <ObjectivesPage />}
      </div>

    </div>
  )
}
