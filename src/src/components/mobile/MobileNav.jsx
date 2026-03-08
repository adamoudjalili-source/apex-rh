// ============================================================
// APEX RH — MobileNav.jsx  ·  Session 39
// Barre de navigation fixe en bas (mobile uniquement)
// Affichée uniquement sur écrans < 768px
// ============================================================
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, CheckSquare, Activity, Trophy, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { isPulseEnabled } from '../../lib/pulseHelpers'
import MobileTaskQuick from './MobileTaskQuick'
import MobileHome from './MobileHome'

// S69 — guards via AuthContext helpers

export default function MobileNav() {
  const { profile, canManageTeam } = useAuth()
  const { data: settings } = useAppSettings()
  const pulseOn = isPulseEnabled(settings)

  const [showTaskQuick, setShowTaskQuick] = useState(false)
  const [showHome, setShowHome] = useState(false)

  const navItems = [
    {
      path:  '/mon-tableau-de-bord',
      icon:  LayoutDashboard,
      label: 'Accueil',
    },
    {
      path:  '/travail/taches',
      icon:  CheckSquare,
      label: 'Tâches',
    },
    // FAB central — pas un lien
    {
      id:    'fab',
      icon:  Plus,
      label: 'Créer',
    },
    {
      path:  pulseOn ? '/ma-performance' : '/travail/taches',
      icon:  Activity,
      label: 'PULSE',
    },
    {
      path:  '/mes-reconnaissances',
      icon:  Trophy,
      label: 'Awards',
    },
  ]

  return (
    <>
      {/* Bottom nav bar — visible uniquement mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          background: 'rgba(15,15,35,0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {navItems.map((item, i) => {
            const Icon = item.icon

            // FAB central
            if (item.id === 'fab') {
              return (
                <button
                  key="fab"
                  type="button"
                  onClick={() => setShowTaskQuick(true)}
                  className="flex flex-col items-center gap-1 relative -mt-5"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                  >
                    <Icon size={26} className="text-white" />
                  </div>
                  <span className="text-[10px] text-white/40">Créer</span>
                </button>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                {({ isActive }) => (
                  <>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                      }}
                    >
                      <Icon
                        size={20}
                        style={{ color: isActive ? '#6366F1' : 'rgba(255,255,255,0.35)' }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: isActive ? '#6366F1' : 'rgba(255,255,255,0.35)' }}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Quick task sheet */}
      <AnimatePresence>
        {showTaskQuick && (
          <MobileTaskQuick onClose={() => setShowTaskQuick(false)} />
        )}
      </AnimatePresence>

      {/* Spacer pour éviter que le contenu passe sous la nav */}
      <div className="h-20 md:hidden" />
    </>
  )
}
