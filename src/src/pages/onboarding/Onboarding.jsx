// ============================================================
// APEX RH — pages/onboarding/Onboarding.jsx  ·  Session 75
// Hub Onboarding : Mon parcours / Mon équipe / Templates / Admin
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin, Users, Layers, LayoutDashboard,
} from 'lucide-react'
import { useAuth }                    from '../../contexts/AuthContext'
import { useOnboardingStats }         from '../../hooks/useOnboarding'

import MyOnboardingJourney       from '../../components/onboarding/MyOnboardingJourney'
import TeamOnboardingDashboard   from '../../components/onboarding/TeamOnboardingDashboard'
import OnboardingTemplateManager from '../../components/onboarding/OnboardingTemplateManager'
import OnboardingAdminDashboard  from '../../components/onboarding/OnboardingAdminDashboard'

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

// ─── KPI rapide ───────────────────────────────────────────────
function QuickStats() {
  const { data: stats } = useOnboardingStats()
  if (!stats) return null

  const items = [
    { label: 'Actifs',       value: stats.active     ?? 0, color: '#6366F1' },
    { label: 'Terminés',     value: stats.completed  ?? 0, color: '#10B981' },
    { label: 'En retard',    value: stats.overdue    ?? 0, color: '#EF4444' },
    { label: 'Taux complet.', value: `${stats.avgCompletionRate ?? 0}%`, color: '#F59E0B' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, color }) => (
        <div key={label} className="px-4 py-3 rounded-xl text-center"
          style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
          <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function Onboarding() {
  const { canAdmin, canValidate, canManageTeam } = useAuth()

  const TABS = useMemo(() => {
    const base = [
      { id: 'journey',   label: 'Mon parcours', icon: MapPin },
    ]
    if (canManageTeam) {
      base.push({ id: 'team', label: 'Mon équipe', icon: Users, s75: true })
    }
    if (canValidate) {
      base.push({ id: 'templates', label: 'Templates', icon: Layers, s75: true })
    }
    if (canAdmin) {
      base.push({ id: 'admin', label: 'Administration', icon: LayoutDashboard, s75: true })
    }
    return base
  }, [canAdmin, canValidate, canManageTeam])

  const [activeTab, setActiveTab] = useState('journey')

  return (
    <motion.div
      className="p-5 md:p-8 max-w-6xl mx-auto space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <MapPin size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Onboarding</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Parcours d'intégration progressif — étapes, templates et suivi
          </p>
        </div>
      </motion.div>

      {/* KPIs (admin seulement) */}
      {canAdmin && (
        <motion.div variants={fadeUp}>
          <QuickStats />
        </motion.div>
      )}

      {/* Onglets */}
      <motion.div variants={fadeUp}>
        <div className="flex gap-1 flex-wrap border-b border-white/[0.06] pb-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium relative transition-colors ${
                  activeTab === tab.id ? 'text-indigo-300' : 'text-white/35 hover:text-white/60'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.s75 && (
                  <span className="text-[9px] font-bold px-1 rounded"
                    style={{ background: 'rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
                    S75
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="onboarding-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-t"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Contenu */}
      <motion.div variants={fadeUp} key={activeTab}>
        {activeTab === 'journey'   && <MyOnboardingJourney />}
        {activeTab === 'team'      && <TeamOnboardingDashboard />}
        {activeTab === 'templates' && <OnboardingTemplateManager />}
        {activeTab === 'admin'     && <OnboardingAdminDashboard />}
      </motion.div>
    </motion.div>
  )
}
