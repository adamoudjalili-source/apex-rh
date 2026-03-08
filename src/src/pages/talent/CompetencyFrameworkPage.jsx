// ============================================================
// APEX RH — src/pages/talent/CompetencyFrameworkPage.jsx · S84
// Référentiel Compétences — Cartographie + gaps
// Onglets : Catalogue · Heatmap · Profil individuel
// Accès : chef_service+ (adminOnly pour CRUD)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, Grid3x3, User, RefreshCw, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import CompetencyCatalog       from '../../components/competency/CompetencyCatalog'
import CompetencyHeatmap       from '../../components/competency/CompetencyHeatmap'
import UserCompetencyProfile   from '../../components/competency/UserCompetencyProfile'
import { useUsersList }        from '../../hooks/useSettings'
import { useRefreshCompetencyCoverage } from '../../hooks/useCompetencyS84'

const TABS = [
  { id: 'catalogue', label: 'Catalogue',        icon: Book,    color: '#4F46E5' },
  { id: 'heatmap',   label: 'Heatmap équipe',   icon: Grid3x3, color: '#10B981' },
  { id: 'profil',    label: 'Profil individuel', icon: User,    color: '#8B5CF6' },
]

// ─── Sélecteur collaborateur ──────────────────────────────────
function UserSelector({ value, onChange }) {
  const { data: users = [] } = useUsersList()
  const sorted = [...users].sort((a, b) =>
    `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
  )

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <User size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        className="text-sm bg-transparent min-w-0"
        style={{ color: value ? 'white' : 'rgba(255,255,255,0.4)', outline: 'none' }}
      >
        <option value="">— Sélectionner un collaborateur —</option>
        {sorted.map(u => (
          <option key={u.id} value={u.id}>
            {u.last_name} {u.first_name} ({u.role})
          </option>
        ))}
      </select>
      <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function CompetencyFrameworkPage() {
  const { canAdmin }  = useAuth()
  const [activeTab, setActiveTab]   = useState('catalogue')
  const [selectedUser, setSelectedUser] = useState(null)
  const refresh = useRefreshCompetencyCoverage()

  const current = TABS.find(t => t.id === activeTab) || TABS[0]

  return (
    <div className="space-y-5">
      {/* Navigation onglets */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isActive ? tab.color + '22' : 'transparent',
                  color:      isActive ? tab.color       : 'rgba(255,255,255,0.45)',
                  border:     isActive ? `1px solid ${tab.color}44` : '1px solid transparent',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2">
          {activeTab === 'profil' && (
            <UserSelector value={selectedUser} onChange={setSelectedUser} />
          )}
          {canAdmin && (
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Rafraîchir la vue matérialisée"
            >
              <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
              {refresh.isPending ? 'Actualisation…' : 'Actualiser MV'}
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'catalogue' && <CompetencyCatalog />}
          {activeTab === 'heatmap'   && <CompetencyHeatmap />}
          {activeTab === 'profil'    && (
            <UserCompetencyProfile userId={selectedUser} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
