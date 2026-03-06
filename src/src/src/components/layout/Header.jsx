// ============================================================
// APEX RH — Header.jsx
// ✅ Session 12 — Ctrl+K connecté + bug full_name corrigé
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, ChevronDown, CheckSquare, Target, FolderKanban,
  LayoutDashboard, Users, Building2, Settings,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import CommandPalette from '../ui/CommandPalette'
import NotificationCenter from '../ui/NotificationCenter'

const PAGE_META = {
  '/dashboard': { label: 'Tableau de bord', icon: LayoutDashboard, description: "Vue d'ensemble de votre activité" },
  '/tasks': { label: 'Tâches', icon: CheckSquare, description: 'Gérez vos tâches et assignations' },
  '/objectives': { label: 'Objectifs OKR', icon: Target, description: 'Suivez vos objectifs et résultats clés' },
  '/projects': { label: 'Projets', icon: FolderKanban, description: 'Pilotez vos projets et livrables' },
  '/admin/users': { label: 'Utilisateurs', icon: Users, description: 'Gestion des comptes utilisateurs' },
  '/admin/organisation': { label: 'Organisation', icon: Building2, description: 'Divisions, services et équipes' },
  '/admin/settings': { label: 'Paramètres', icon: Settings, description: "Configuration de l'application" },
}

const ROLE_LABELS = {
  administrateur: 'Administrateur',
  directeur: 'Directeur',
  chef_division: 'Chef de Division',
  chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}

const ROLE_COLORS = {
  administrateur: '#EF4444',
  directeur: '#C9A227',
  chef_division: '#8B5CF6',
  chef_service: '#3B82F6',
  collaborateur: '#10B981',
}

export default function Header() {
  const location = useLocation()
  const { profile, role } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  // ✅ FIX : utiliser first_name + last_name (pas full_name)
  const initiale = profile?.first_name?.charAt(0) || profile?.last_name?.charAt(0) || 'U'
  const fullName = profile?.first_name || profile?.last_name
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : 'Utilisateur'

  const meta = PAGE_META[location.pathname] || { label: 'APEX RH', icon: LayoutDashboard, description: '' }
  const Icon = meta.icon

  // Raccourci clavier Ctrl+K / Cmd+K
  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 border-b border-white/5 flex-shrink-0"
        style={{
          background: 'rgba(8, 8, 24, 0.8)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Gauche — titre de page */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79, 70, 229, 0.3)' }}
          >
            <Icon size={15} style={{ color: '#4F46E5' }} />
          </div>
          <div>
            <h1
              className="text-sm font-bold text-white tracking-wide"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {meta.label}
            </h1>
            <p className="text-[10px] text-white/30">{meta.description}</p>
          </div>
        </div>

        {/* Droite — actions */}
        <div className="flex items-center gap-3">
          {/* Bouton recherche → ouvre CommandPalette */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/30 hover:text-white/60 hover:border-indigo-500/30 transition-all text-xs"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Search size={13} />
            <span>Recherche...</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
            >
              ⌘K
            </span>
          </button>

          {/* Bouton recherche mobile */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <Search size={16} />
          </button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Profil */}
          <div
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer group"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0 text-white"
              style={{
                background: `linear-gradient(135deg, ${ROLE_COLORS[role] || '#4F46E5'}, ${ROLE_COLORS[role] || '#4F46E5'}88)`,
              }}
            >
              {initiale}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-white leading-none mb-0.5">
                {fullName}
              </p>
              <p
                className="text-[10px] leading-none font-medium"
                style={{ color: ROLE_COLORS[role] || '#4F46E5' }}
              >
                {ROLE_LABELS[role] || role}
              </p>
            </div>
            <ChevronDown size={12} className="text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </div>

      </header>

      {/* Command Palette (portail) */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
