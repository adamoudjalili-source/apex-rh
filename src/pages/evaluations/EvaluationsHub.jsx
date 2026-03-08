// ============================================================
// APEX RH — src/pages/evaluations/EvaluationsHub.jsx
// Session 94 — Module 6 : Évaluations — Hub unifié V2
// Route : /evaluations
// Onglets : Mes Entretiens · Entretiens Équipe · Feedback 360
//           Enquêtes · Administration
// Pattern V2 : can() via usePermission() — jamais check rôle direct
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Users, MessageSquare, BarChart2,
  Settings2, ChevronRight, Plus, CheckCircle2,
  AlertCircle, Clock, Star, Lock, FileText,
  Activity, Target, TrendingUp, Calendar,
  UserCheck, BarChart3, RefreshCw,
} from 'lucide-react'

import { usePermission }                    from '../../hooks/usePermission'
import { useAuth }                          from '../../contexts/AuthContext'

// ── Entretiens composants ─────────────────────────────────────
import AnnualReviewDashboard                from '../../components/entretiens/AnnualReviewDashboard'
import AnnualReviewForm                     from '../../components/entretiens/AnnualReviewForm'
import AnnualReviewHistory                  from '../../components/entretiens/AnnualReviewHistory'
import AnnualReviewEnrichedDashboard        from '../../components/entretiens/AnnualReviewEnrichedDashboard'
import ReviewSelfAssessmentForm             from '../../components/entretiens/ReviewSelfAssessmentForm'
import ReviewDevelopmentPlan                from '../../components/entretiens/ReviewDevelopmentPlan'
import ReviewManagerDashboard               from '../../components/entretiens/ReviewManagerDashboard'
import MidYearCampaignPanel                 from '../../components/entretiens/MidYearCampaignPanel'
import AnnualReviewAdmin                    from '../../components/entretiens/AnnualReviewAdmin'

// ── Feedback 360 composants ───────────────────────────────────
import Feedback360Summary                   from '../../components/feedback360/Feedback360Summary'
import Feedback360Form                      from '../../components/feedback360/Feedback360Form'
import Feedback360Trends                    from '../../components/feedback360/Feedback360Trends'
import Feedback360CycleAdmin                from '../../components/feedback360/Feedback360CycleAdmin'

// ── Enquêtes / eNPS composants ────────────────────────────────
import ENPSScore                            from '../../components/enps/ENPSScore'
import ENPSSegmentation                     from '../../components/enps/ENPSSegmentation'
import ENPSTrend                            from '../../components/enps/ENPSTrend'

// ── Animation ──────────────────────────────────────────────────
const fadeIn = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

// ── Composant utilitaire SectionCard ──────────────────────────
function SectionCard({ title, action, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-white/80">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Accès refusé ──────────────────────────────────────────────
function AccessDenied({ message = "Accès réservé — droits insuffisants" }) {
  return (
    <motion.div
      variants={fadeIn} initial="hidden" animate="visible"
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={24} className="text-rose-400" />
      </div>
      <p className="text-white/40 text-sm text-center max-w-xs">{message}</p>
    </motion.div>
  )
}

// ── StatMini ──────────────────────────────────────────────────
function StatMini({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-xs text-white/40 truncate">{label}</div>
      </div>
    </div>
  )
}

// ── Onglet Mes Entretiens ─────────────────────────────────────
function OngletMesEntretiens() {
  const [view, setView] = useState('dashboard')
  const { profile } = useAuth()

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      {/* Barre actions */}
      <div className="flex items-center gap-2">
        {[
          { key: 'dashboard', label: 'Tableau de bord' },
          { key: 'form',      label: 'Mon entretien' },
          { key: 'self',      label: 'Auto-évaluation' },
          { key: 'pdi',       label: 'Plan de dev.' },
          { key: 'history',   label: 'Historique' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === key
                ? 'text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            style={view === key ? { background: 'rgba(167,139,250,0.15)', color: '#A78BFA' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div key="dashboard" variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="space-y-6">
            <SectionCard title="Vue d'ensemble — Mes entretiens">
              <AnnualReviewDashboard />
            </SectionCard>
          </motion.div>
        )}
        {view === 'form' && (
          <motion.div key="form" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Mon entretien annuel">
              <AnnualReviewForm />
            </SectionCard>
          </motion.div>
        )}
        {view === 'self' && (
          <motion.div key="self" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Mon auto-évaluation">
              <ReviewSelfAssessmentForm />
            </SectionCard>
          </motion.div>
        )}
        {view === 'pdi' && (
          <motion.div key="pdi" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Mon plan de développement individuel">
              <ReviewDevelopmentPlan />
            </SectionCard>
          </motion.div>
        )}
        {view === 'history' && (
          <motion.div key="history" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Historique de mes entretiens">
              <AnnualReviewHistory />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Onglet Entretiens Équipe ──────────────────────────────────
function OngletEntretiensEquipe() {
  const [view, setView] = useState('manager')

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center gap-2">
        {[
          { key: 'manager',  label: 'Vue manager' },
          { key: 'enriched', label: 'Dashboard enrichi' },
          { key: 'midyear',  label: 'Mi-année' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === key ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            style={view === key ? { background: 'rgba(59,130,246,0.15)', color: '#60A5FA' } : {}}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'manager' && (
          <motion.div key="manager" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Suivi des entretiens de mon équipe">
              <ReviewManagerDashboard />
            </SectionCard>
          </motion.div>
        )}
        {view === 'enriched' && (
          <motion.div key="enriched" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Dashboard enrichi — Entretiens équipe">
              <AnnualReviewEnrichedDashboard />
            </SectionCard>
          </motion.div>
        )}
        {view === 'midyear' && (
          <motion.div key="midyear" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Campagne mi-année">
              <MidYearCampaignPanel />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Onglet Feedback 360 ───────────────────────────────────────
function OngletFeedback360() {
  const [view, setView] = useState('summary')

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center gap-2">
        {[
          { key: 'summary', label: 'Mes feedbacks' },
          { key: 'form',    label: 'Donner un feedback' },
          { key: 'trends',  label: 'Tendances' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === key ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            style={view === key ? { background: 'rgba(16,185,129,0.15)', color: '#34D399' } : {}}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'summary' && (
          <motion.div key="summary" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Résumé de mes feedbacks 360°">
              <Feedback360Summary />
            </SectionCard>
          </motion.div>
        )}
        {view === 'form' && (
          <motion.div key="form" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Formulaire feedback 360°">
              <Feedback360Form />
            </SectionCard>
          </motion.div>
        )}
        {view === 'trends' && (
          <motion.div key="trends" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Évolution des feedbacks 360°">
              <Feedback360Trends />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Onglet Enquêtes (eNPS) ────────────────────────────────────
function OngletEnquetes() {
  const [view, setView] = useState('score')

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center gap-2">
        {[
          { key: 'score',        label: 'Score eNPS' },
          { key: 'segmentation', label: 'Segmentation' },
          { key: 'trend',        label: 'Évolution' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === key ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            style={view === key ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D' } : {}}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'score' && (
          <motion.div key="score" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Score d'engagement (eNPS)">
              <ENPSScore />
            </SectionCard>
          </motion.div>
        )}
        {view === 'segmentation' && (
          <motion.div key="segmentation" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Segmentation promoteurs / détracteurs">
              <ENPSSegmentation />
            </SectionCard>
          </motion.div>
        )}
        {view === 'trend' && (
          <motion.div key="trend" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Évolution du score eNPS">
              <ENPSTrend />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Onglet Administration ─────────────────────────────────────
function OngletAdministration() {
  const [view, setView] = useState('cycles')

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center gap-2">
        {[
          { key: 'cycles',   label: 'Cycles éval.' },
          { key: 'feedback', label: 'Cycles 360°' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === key ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
            style={view === key ? { background: 'rgba(239,68,68,0.15)', color: '#F87171' } : {}}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'cycles' && (
          <motion.div key="cycles" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Administration des cycles d'évaluation">
              <AnnualReviewAdmin />
            </SectionCard>
          </motion.div>
        )}
        {view === 'feedback' && (
          <motion.div key="feedback" variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            <SectionCard title="Administration des cycles 360°">
              <Feedback360CycleAdmin />
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Hub principal ─────────────────────────────────────────────
export default function EvaluationsHub() {
  const { can } = usePermission()

  // Définition des onglets avec guards can()
  const allTabs = [
    {
      key:   'entretiens_own',
      label: 'Mes Entretiens',
      icon:  ClipboardList,
      color: '#A78BFA',
      guard: can('evaluations', 'entretiens_own', 'read'),
      component: <OngletMesEntretiens />,
    },
    {
      key:   'entretiens_team',
      label: 'Entretiens Équipe',
      icon:  Users,
      color: '#60A5FA',
      guard: can('evaluations', 'entretiens_team', 'read'),
      component: <OngletEntretiensEquipe />,
    },
    {
      key:   'feedback360',
      label: 'Feedback 360',
      icon:  MessageSquare,
      color: '#34D399',
      guard: can('evaluations', 'feedback360', 'read'),
      component: <OngletFeedback360 />,
    },
    {
      key:   'surveys',
      label: 'Enquêtes',
      icon:  BarChart2,
      color: '#FCD34D',
      guard: can('evaluations', 'surveys', 'read'),
      component: <OngletEnquetes />,
    },
    {
      key:   'cycles',
      label: 'Administration',
      icon:  Settings2,
      color: '#F87171',
      guard: can('evaluations', 'cycles', 'admin'),
      component: <OngletAdministration />,
    },
  ]

  const visibleTabs = allTabs.filter(t => t.guard)
  const [activeKey, setActiveKey] = useState(() => visibleTabs[0]?.key ?? 'entretiens_own')

  const activeTab = allTabs.find(t => t.key === activeKey)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── En-tête ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <ClipboardList size={20} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Évaluations</h1>
            <p className="text-xs text-white/40">Entretiens · Feedback 360 · Enquêtes engagement</p>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div className="flex items-center gap-1 border-b overflow-x-auto pb-0 scrollbar-hide"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeKey === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveKey(tab.key)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all relative flex-shrink-0"
                style={{
                  color: isActive ? tab.color : 'rgba(255,255,255,0.35)',
                  borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Accès refusé si contournement URL */}
        {activeTab && !activeTab.guard ? (
          <AccessDenied />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeKey} variants={fadeIn} initial="hidden" animate="visible" exit="exit">
              {activeTab?.component}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Aucun onglet visible */}
        {visibleTabs.length === 0 && (
          <AccessDenied message="Aucun accès au module Évaluations — contactez votre administrateur" />
        )}
      </div>
    </div>
  )
}
