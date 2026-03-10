// ============================================================
// APEX RH — MonTravail.jsx · S134
// Hub Mon Espace — Tâches · Projets · OKR
// Onglets via useSearchParams(?tab=taches|projets|okr)
// Stats header supprimé (S134) · Max 400 lignes
// ============================================================
import { useSearchParams } from 'react-router-dom'
import { motion }          from 'framer-motion'
import {
  CheckSquare,
  FolderKanban,
  Target,
} from 'lucide-react'

import Tasks          from '../tasks/Tasks'
import ProjectsPage   from '../projects/Projects'
import ObjectivesPage from '../objectives/Objectives'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'taches',    label: 'Tâches',  icon: CheckSquare,  color: '#6366F1' },
  { id: 'projets',   label: 'Projets', icon: FolderKanban, color: '#3B82F6' },
  { id: 'objectifs', label: 'OKR',     icon: Target,       color: '#8B5CF6' },
]

const DEFAULT_TAB = 'taches'

// ─── BARRE D'ONGLETS ──────────────────────────────────────────
function TabBar({ activeTab, onTabClick }) {
  return (
    <div
      className="flex-shrink-0 border-b border-white/[0.06] px-6 pb-0"
      style={{ background: 'rgba(9,9,32,0.4)' }}
    >
      <div className="flex gap-1">
        {TABS.map(tab => {
          const Icon     = tab.icon
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 relative ${
                isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              style={isActive ? { background: `${tab.color}14` } : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="montravail-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                  style={{ background: tab.color }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon size={15} style={isActive ? { color: tab.color } : undefined} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function MonTravail() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  function handleTabClick(tabId) {
    setSearchParams({ tab: tabId }, { replace: true })
  }

  return (
    <div className="flex flex-col h-full">

      {/* En-tête */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0" style={{ background: 'rgba(9,9,32,0.6)' }}>
        <h1 className="text-2xl font-bold text-white mb-0.5">Mon Travail</h1>
        <p className="text-sm text-white/40 mb-4">
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