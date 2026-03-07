// ============================================================
// APEX RH — pages/compensation/Compensation.jsx
// Session 58 — Page principale Compensation & Benchmark
// Onglets adaptatifs rôle :
//   Collaborateur  : Ma rémunération · Benchmark · Historique
//   Manager        : + Mon équipe
//   Admin/Directeur: + Mon équipe + Administration
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, BarChart3, Clock, Users, Settings, Lock } from 'lucide-react'
import { useAuth }               from '../../contexts/AuthContext'
import { useAppSettings }         from '../../hooks/useSettings'
import { useOrgCompensationStats, formatSalaryShort } from '../../hooks/useCompensation'  // Étape 21

import MyCompensation           from '../../components/compensation/MyCompensation'
import SalaryBenchmarkPanel     from '../../components/compensation/SalaryBenchmarkPanel'
import CompensationHistory      from '../../components/compensation/CompensationHistory'
import TeamCompensationDashboard from '../../components/compensation/TeamCompensationDashboard'
import CompensationAdminPanel   from '../../components/compensation/CompensationAdminPanel'

// S69 — guards via AuthContext helpers (MANAGERS/ADMINS locaux supprimés)


// ─── QuickStats compensation (Étape 21) ─────────────────────
function QuickStatsCompensation() {
  const { data: stats } = useOrgCompensationStats()
  if (!stats) return null
  const items = [
    { label: 'Collaborateurs',    value: stats.count,                                              color: '#4F46E5' },
    { label: 'Masse salariale',   value: formatSalaryShort(stats.total_mass),                      color: '#10B981' },
    { label: 'Salaire moyen',     value: formatSalaryShort(stats.avg_salary),                      color: '#F59E0B' },
    { label: 'Comp. total moy.',  value: stats.avg_total_comp ? formatSalaryShort(stats.avg_total_comp) : '—', color: '#8B5CF6' },
  ]
  return (
    <div className="flex flex-wrap gap-3 px-4 sm:px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {items.map(s => (
        <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
          <span className="text-xs text-white/35">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Compensation() {
  const { profile, canAdmin, canManageTeam } = useAuth()
  const { data: settings }   = useAppSettings()
  const [tab, setTab]        = useState('my')

  const role = profile?.role

  // Vérification module activé
  const moduleEnabled = settings?.modules?.compensation_enabled !== false

  if (!moduleEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Lock size={22} className="text-white/25"/>
        </div>
        <p className="text-white/35 text-sm">Le module Compensation est désactivé.</p>
        <p className="text-white/20 text-xs">Contactez votre administrateur pour l'activer.</p>
      </div>
    )
  }

  // Définition des onglets selon rôle
  const TABS = [
    { id: 'my',       label: 'Ma rémunération', icon: DollarSign, roles: null },
    { id: 'benchmark',label: 'Benchmark marché', icon: BarChart3,  roles: null },
    { id: 'history',  label: 'Historique',       icon: Clock,      roles: null },
    ...(canManageTeam ? [{ id: 'team',  label: 'Mon équipe',    icon: Users    }] : []),
    ...(canAdmin      ? [{ id: 'admin', label: 'Administration', icon: Settings }] : []),
  ]

  // Si l'onglet courant n'est plus accessible après changement de rôle, reset
  const validTab = TABS.find(t => t.id === tab) ? tab : 'my'

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── QuickStats (Étape 21) ── */}
      {canAdmin && <QuickStatsCompensation/>}

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(99,102,241,0.2))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <DollarSign size={18} style={{ color: '#10B981' }}/>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Compensation</h1>
            <p className="text-xs text-white/35">Rémunération & Benchmark salarial</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(t => {
            const Icon    = t.icon
            const active  = validTab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={active
                  ? { background: 'rgba(255,255,255,0.08)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.35)' }}>
                <Icon size={13}/>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={validTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {validTab === 'my'        && <MyCompensation/>}
            {validTab === 'benchmark' && <SalaryBenchmarkPanel/>}
            {validTab === 'history'   && <CompensationHistory/>}
            {validTab === 'team'      && <TeamCompensationDashboard/>}
            {validTab === 'admin'     && <CompensationAdminPanel/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
