// ============================================================
// APEX RH — MonSuiviTemps.jsx — S124
// Route : /mon-suivi-temps
// Hub 8 onglets : Saisie · Timer · Validation · Planning ·
//                 Productivité · Charge · Rappels · Score
// ============================================================
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, ClipboardEdit, Timer, CheckSquare, CalendarDays,
  TrendingUp, Users2, Bell, Award,
} from 'lucide-react'

import { OngletSaisie, OngletTimer }                     from './SuiviTempsA'
import { OngletValidation, OngletPlanning, OngletProductivite } from './SuiviTempsB'
import { OngletCharge, OngletRappels, OngletScore }       from './SuiviTempsC'

// ─── Onglets ──────────────────────────────────────────────────
const TABS = [
  { id: 'saisie',       label: 'Saisie du temps',          icon: ClipboardEdit, color: '#818CF8' },
  { id: 'timer',        label: 'Timer automatique',         icon: Timer,         color: '#34D399' },
  { id: 'validation',   label: 'Validation hiérarchique',   icon: CheckSquare,   color: '#FCD34D' },
  { id: 'planning',     label: 'Planning hebdomadaire',     icon: CalendarDays,  color: '#A78BFA' },
  { id: 'productivite', label: 'Analyse de la productivité',icon: TrendingUp,    color: '#10B981' },
  { id: 'charge',       label: 'Charge de travail',         icon: Users2,        color: '#FB923C' },
  { id: 'rappels',      label: 'Rappels automatiques',      icon: Bell,          color: '#F87171' },
  { id: 'score',        label: "Score d'occupation",        icon: Award,         color: '#FCD34D' },
]

const fadeIn = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.16 } },
}

// ─── Page principale ──────────────────────────────────────────
export default function MonSuiviTemps() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? 'saisie'
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true })
  const current = TABS.find(t => t.id === activeTab) ?? TABS[0]

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg,rgba(99,102,241,0.04) 0%,transparent 200px)' }}
    >
      <div className="px-6 pt-8 pb-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.2)' }}>
            <Clock size={18} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <h1
              className="text-2xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              Mon suivi du temps de travail
            </h1>
            <p className="text-sm text-white/35">
              Saisie, timer, validation, planning, productivité et score d'occupation.
            </p>
          </div>
        </div>

        {/* Tab bar — scrollable */}
        <div
          className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TABS.map(tab => {
            const Icon     = tab.icon
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0"
                style={
                  isActive
                    ? { background: `${tab.color}18`, color: tab.color, border: `1px solid ${tab.color}30`, boxShadow: `0 0 0 1px ${tab.color}20` }
                    : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
                }>
                <Icon size={13} className="flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contenu */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit">
            {activeTab === 'saisie'       && <OngletSaisie />}
            {activeTab === 'timer'        && <OngletTimer />}
            {activeTab === 'validation'   && <OngletValidation />}
            {activeTab === 'planning'     && <OngletPlanning />}
            {activeTab === 'productivite' && <OngletProductivite />}
            {activeTab === 'charge'       && <OngletCharge />}
            {activeTab === 'rappels'      && <OngletRappels />}
            {activeTab === 'score'        && <OngletScore />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
