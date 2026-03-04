// ============================================================
// APEX RH — Sidebar.jsx
// ✅ Session 18 — Masque les modules désactivés dans la sidebar
// ✅ Session 21 — Ajout entrée PULSE (moduleKey: 'pulse_enabled', icône Activity)
// ✅ Session 25 — Phase G : Suppression lien PULSE + renommage "Tâches & Performance"
// ============================================================
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare,
  Target,
  FolderKanban,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Users,
  Building2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayScore } from '../../hooks/usePulse'
import { getScoreColor, isPulseEnabled } from '../../lib/pulseHelpers'
import logoNita from '../../assets/logo-nita.png'

const NAV_ITEMS = [
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'],
    moduleKey: null, // toujours visible
  },
  {
    // ✅ Session 25 — "Tâches & Performance" quand PULSE actif (renommage dynamique ci-dessous)
    label: 'Tâches',
    icon: CheckSquare,
    path: '/tasks',
    roles: ['administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'],
    moduleKey: 'tasks_enabled',
  },
  {
    label: 'Objectifs OKR',
    icon: Target,
    path: '/objectives',
    roles: ['administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'],
    moduleKey: 'okr_enabled',
  },
  {
    label: 'Projets',
    icon: FolderKanban,
    path: '/projects',
    roles: ['administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'],
    moduleKey: 'projects_enabled',
  },
  // ✅ Session 25 — Lien PULSE standalone supprimé (Phase G — Étape 2)
  // Les pages PULSE sont maintenant des onglets dans /tasks
]

const ADMIN_ITEMS = [
  {
    label: 'Utilisateurs',
    icon: Users,
    path: '/admin/users',
    roles: ['administrateur'],
  },
  {
    label: 'Organisation',
    icon: Building2,
    path: '/admin/organisation',
    roles: ['administrateur'],
  },
]

const SETTINGS_ITEM = {
  label: 'Paramètres',
  icon: Settings,
  path: '/admin/settings',
  roles: ['administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'],
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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: settings } = useAppSettings()
  const { data: todayScore } = useTodayScore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // ✅ Session 18 — Filtrage par rôle ET par modules actifs
  const modules = settings?.modules || {}
  const pulseActive = isPulseEnabled(settings)

  const visibleNav = NAV_ITEMS
    .filter((item) => {
      if (!item.roles.includes(role)) return false
      if (item.moduleKey && modules[item.moduleKey] === false) return false
      return true
    })
    .map((item) => {
      // ✅ Session 25 — Renommage dynamique : "Tâches & Performance" si PULSE activé
      if (item.path === '/tasks' && pulseActive) {
        return { ...item, label: 'Tâches & Performance' }
      }
      return item
    })

  const visibleAdmin  = ADMIN_ITEMS.filter((item) => item.roles.includes(role))
  const showSettings  = SETTINGS_ITEM.roles.includes(role)

  // Initiale : première lettre du prénom ou du nom
  const initiale =
    profile?.first_name?.charAt(0) || profile?.last_name?.charAt(0) || 'U'

  // Nom complet affiché
  const fullName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : 'Utilisateur'

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen border-r border-white/5 overflow-hidden flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #0A0A1E 0%, #080818 100%)',
      }}
    >
      {/* Ligne décorative dorée en haut */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #C9A227, #4F46E5, transparent)' }}
      />

      {/* Logo */}
      <div className="border-b border-white/5 flex-shrink-0 overflow-hidden">
        <AnimatePresence>
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={logoNita}
                alt="NITA"
                className="w-full h-auto"
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center h-16"
            >
              <img
                src={logoNita}
                alt="NITA"
                className="w-10 h-10 object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {visibleNav.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <AnimatePresence>
                {!collapsed ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-white/20 uppercase tracking-widest px-3"
                  >
                    Administration
                  </motion.p>
                ) : (
                  <div className="w-full h-px bg-white/5" />
                )}
              </AnimatePresence>
            </div>
            {visibleAdmin.map((item) => (
              <NavItem key={item.path} item={item} collapsed={collapsed} />
            ))}
          </>
        )}

        {/* Paramètres — visible par tous les rôles */}
        {showSettings && (
          <NavItem item={SETTINGS_ITEM} collapsed={collapsed} />
        )}
      </nav>

      {/* Profil utilisateur */}
      <div className="px-3 py-4 border-t border-white/5 space-y-2 flex-shrink-0">
        <div
          className="rounded-xl p-3 flex items-center gap-3 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase text-white"
            style={{ background: ROLE_COLORS[role] || '#4F46E5' }}
          >
            {initiale}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {fullName}
                </p>
                <p
                  className="text-[10px] font-medium truncate"
                  style={{ color: ROLE_COLORS[role] || '#818CF8' }}
                >
                  {ROLE_LABELS[role] || role}
                </p>
                {/* ✅ Session 21 — Score PULSE du jour sur le profil */}
                {pulseActive && todayScore && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-white/20">PULSE</span>
                    <span
                      className="text-[11px] font-black"
                      style={{ color: getScoreColor(todayScore.score_total) }}
                    >
                      {todayScore.score_total}%
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${todayScore.score_total}%`,
                          background: getScoreColor(todayScore.score_total),
                        }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bouton déconnexion */}
        <button
          onClick={handleSignOut}
          className="w-full rounded-lg px-3 py-2.5 flex items-center gap-3 text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm"
              >
                Déconnexion
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Bouton collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-[50%] -right-3 w-6 h-6 rounded-full bg-[#1a1a3e] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-indigo-600 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}

// ─── Composant NavItem ─────────────────────────────────────────
function NavItem({ item, collapsed }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden ${
          isActive
            ? 'bg-indigo-500/10 text-indigo-400'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <Icon size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium truncate"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  )
}
