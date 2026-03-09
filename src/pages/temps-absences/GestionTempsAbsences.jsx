// ============================================================
// APEX RH — src/pages/temps-absences/GestionTempsAbsences.jsx
// Session 92 — Module 3 : Temps & Absences — Hub unifié V2
// Route : /temps-absences
// Onglets : Ma Feuille · Mon Équipe · Heures Sup. · Validation · Administration
// Pattern V2 : can() via usePermission() — jamais check rôle direct
// ============================================================
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Users, TrendingUp, CheckSquare, Settings2,
  CalendarOff, Plus, Download, ShieldCheck,
} from 'lucide-react'

import { usePermission }         from '../../hooks/usePermission'

// ── Composants Temps (S71) ─────────────────────────────────
import TimeClockWidget           from '../../components/temps/TimeClockWidget'
import TimeSheetGrid             from '../../components/temps/TimeSheetGrid'
import TimeStatsCard             from '../../components/temps/TimeStatsCard'
import TeamTimeSheetDashboard    from '../../components/temps/TeamTimeSheetDashboard'
import TimeSheetExport           from '../../components/temps/TimeSheetExport'
import OvertimeSummary           from '../../components/temps/OvertimeSummary'
import OvertimeValidation        from '../../components/temps/OvertimeValidation'
import OvertimeAlerts            from '../../components/temps/OvertimeAlerts'
import OvertimePayrollExport     from '../../components/temps/OvertimePayrollExport'
import OvertimeRulesEngine       from '../../components/temps/OvertimeRulesEngine'

// ── Composants Congés (S70) ────────────────────────────────
import LeaveBalanceCard          from '../../components/conges/LeaveBalanceCard'
import LeaveRequestCard          from '../../components/conges/LeaveRequestCard'
import LeaveRequestForm          from '../../components/conges/LeaveRequestForm'
import TeamLeaveCalendar         from '../../components/conges/TeamLeaveCalendar'
import LeaveApprovalPanel        from '../../components/conges/LeaveApprovalPanel'
import LeaveTypeAdmin            from '../../components/conges/LeaveTypeAdmin'
import LeaveRulesEngine          from '../../components/conges/LeaveRulesEngine'
import PublicHolidaysManager     from '../../components/conges/PublicHolidaysManager'
import LeaveAlerts               from '../../components/conges/LeaveAlerts'
import LeavePayrollExport        from '../../components/conges/LeavePayrollExport'

import { useMyLeaveRequests, LEAVE_STATUS_LABELS } from '../../hooks/useConges'

// ── Animation helpers ──────────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

// ── Onglet Ma Feuille ──────────────────────────────────────
function OngletMaFeuille() {
  const [showForm,     setShowForm]     = useState(false)
  const [yearFilter,   setYearFilter]   = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState('')
  const { data: requests = [], isLoading, refetch } = useMyLeaveRequests(yearFilter)
  const filtered = statusFilter
    ? requests.filter(r => r.status === statusFilter)
    : requests

  return (
    <div className="space-y-6">
      {showForm && (
        <LeaveRequestForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch() }}
        />
      )}

      {/* Pointage + Stats + Feuille */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-4">
          <TimeClockWidget />
          <TimeStatsCard period="month" />
        </div>
        <div className="lg:col-span-3">
          <SectionCard title="Feuille de temps">
            <TimeSheetGrid />
          </SectionCard>
        </div>
      </div>

      {/* Mes congés */}
      <SectionCard
        title={`Mes congés — ${yearFilter}`}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
            <Plus size={13} /> Nouvelle demande
          </button>
        }>
        <div className="flex items-center gap-2 mb-4">
          <select
            value={yearFilter}
            onChange={e => setYearFilter(Number(e.target.value))}
            className="rounded-xl px-3 py-2 text-sm text-white/70 border outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm text-white/70 border outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <option value="">Tous les statuts</option>
            {Object.entries(LEAVE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <LeaveBalanceCard year={yearFilter} />

        <div className="mt-5">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
            Mes demandes
            {requests.length > 0 && (
              <span className="ml-2 text-white/40 normal-case font-normal">
                ({filtered.length})
              </span>
            )}
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="rounded-2xl px-5 py-12 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
              <CalendarOff size={32} className="mx-auto text-white/15 mb-3" />
              <p className="text-white/30 text-sm">Aucune demande de congé</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-xs text-indigo-400 hover:underline">
                + Créer une demande
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => <LeaveRequestCard key={r.id} request={r} onRefetch={refetch} />)}
            </div>
          )}
        </div>

        {/* Heures sup résumé perso */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
            Mes heures supplémentaires
          </p>
          <OvertimeSummary />
        </div>
      </SectionCard>
    </div>
  )
}

// ── Onglet Mon Équipe ──────────────────────────────────────
function OngletMonEquipe() {
  const [subTab, setSubTab] = useState('absences')

  const subTabs = [
    { id: 'absences', label: 'Calendrier absences' },
    { id: 'feuilles', label: 'Feuilles de temps' },
    { id: 'alertes',  label: 'Alertes' },
  ]

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex gap-2 flex-wrap">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={
              subTab === t.id
                ? { background: 'rgba(99,102,241,0.18)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'absences' && (
        <SectionCard title="Calendrier absences équipe">
          <TeamLeaveCalendar />
        </SectionCard>
      )}

      {subTab === 'feuilles' && (
        <SectionCard title="Feuilles de temps équipe">
          <TeamTimeSheetDashboard />
        </SectionCard>
      )}

      {subTab === 'alertes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title="Alertes absences">
            <LeaveAlerts />
          </SectionCard>
          <SectionCard title="Alertes heures supplémentaires">
            <OvertimeAlerts />
          </SectionCard>
        </div>
      )}
    </div>
  )
}

// ── Onglet Heures Sup. ─────────────────────────────────────
function OngletHeuresSup({ canValidateTeam }) {
  return (
    <div className="space-y-5">
      <SectionCard title="Mes heures supplémentaires">
        <OvertimeSummary />
      </SectionCard>

      {canValidateTeam && (
        <SectionCard title="Validation équipe — Heures supplémentaires">
          <OvertimeValidation />
        </SectionCard>
      )}
    </div>
  )
}

// ── Onglet Validation ──────────────────────────────────────
function OngletValidation() {
  return (
    <div className="space-y-5">
      <SectionCard title="Approbation des congés en attente">
        <LeaveApprovalPanel />
      </SectionCard>
      <SectionCard title="Validation heures supplémentaires">
        <OvertimeValidation />
      </SectionCard>
    </div>
  )
}

// ── Onglet Administration ──────────────────────────────────
function OngletAdministration({ canExportPayroll, canAdminRules, canAdminHolidays }) {
  const [subTab, setSubTab] = useState(canAdminRules ? 'regles_conges' : 'export')

  const subTabs = [
    canAdminRules    && { id: 'regles_conges', label: 'Règles congés' },
    canAdminRules    && { id: 'regles_hs',     label: 'Règles H. sup.' },
    canAdminHolidays && { id: 'feries',        label: 'Jours fériés' },
    canExportPayroll && { id: 'export',        label: 'Export paie' },
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex gap-2 flex-wrap">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={
              subTab === t.id
                ? { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'regles_conges' && (
        <div className="space-y-5">
          <SectionCard title="Types de congés">
            <LeaveTypeAdmin />
          </SectionCard>
          <SectionCard title="Moteur de règles congés">
            <LeaveRulesEngine />
          </SectionCard>
        </div>
      )}

      {subTab === 'regles_hs' && (
        <SectionCard title="Moteur de règles heures supplémentaires">
          <OvertimeRulesEngine />
        </SectionCard>
      )}

      {subTab === 'feries' && (
        <SectionCard title="Gestion des jours fériés">
          <PublicHolidaysManager />
        </SectionCard>
      )}

      {subTab === 'export' && (
        <div className="space-y-5">
          <SectionCard title="Export paie — Congés">
            <LeavePayrollExport />
          </SectionCard>
          <SectionCard title="Export paie — Heures supplémentaires">
            <OvertimePayrollExport />
          </SectionCard>
          <SectionCard title="Export feuilles de temps">
            <TimeSheetExport />
          </SectionCard>
        </div>
      )}
    </div>
  )
}

// ── Section Card helper ────────────────────────────────────
function SectionCard({ title, action, children }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)' }}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && (
            <h2 className="text-sm font-semibold text-white/80">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Hub principal ──────────────────────────────────────────
export default function GestionTempsAbsences() {
  const { can } = usePermission()
  const [searchParams]            = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'ma-feuille')

  // Permissions
  const canViewTeam       = can('temps', 'team', 'read')
  const canValidateTeam   = can('temps', 'team', 'validate')
  const canExportPayroll  = can('temps', 'export_paie', 'read')
  const canAdminRules     = can('temps', 'regles', 'admin')
  const canAdminHolidays  = can('temps', 'feries', 'admin')
  const showAdmin         = canExportPayroll || canAdminRules || canAdminHolidays

  const TABS = [
    {
      id:    'ma-feuille',
      label: 'Ma Feuille',
      icon:  Clock,
      show:  true,
      color: '#818CF8',
    },
    {
      id:    'mon-equipe',
      label: 'Mon Équipe',
      icon:  Users,
      show:  canViewTeam,
      color: '#34D399',
    },
    {
      id:    'heures-sup',
      label: 'Heures Sup.',
      icon:  TrendingUp,
      show:  true,
      color: '#FB923C',
    },
    {
      id:    'validation',
      label: 'Validation',
      icon:  CheckSquare,
      show:  canValidateTeam,
      color: '#FACC15',
    },
    {
      id:    'administration',
      label: 'Administration',
      icon:  Settings2,
      show:  showAdmin,
      color: '#F87171',
    },
  ].filter(t => t.show)

  // Normalise activeTab si un onglet disparaît
  // 'conges' est un alias de 'ma-feuille' (venu de /mes-conges)
  const normalizedTab = activeTab === 'conges' ? 'ma-feuille' : activeTab
  const validTab = TABS.find(t => t.id === normalizedTab) ? normalizedTab : TABS[0]?.id

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg,rgba(99,102,241,0.04) 0%,transparent 200px)' }}>

      <div className="px-6 pt-8 pb-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Clock size={18} style={{ color: '#818CF8' }} />
          </div>
          <div>
            <h1
              className="text-2xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}>
              Temps &amp; Absences
            </h1>
            <p className="text-sm text-white/35">
              Pointage, feuilles de temps, congés et heures supplémentaires.
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TABS.map(tab => {
            const Icon    = tab.icon
            const isActive = tab.id === validTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 min-w-0"
                style={
                  isActive
                    ? {
                        background: `${tab.color}18`,
                        color: tab.color,
                        border: `1px solid ${tab.color}30`,
                        boxShadow: `0 0 0 1px ${tab.color}20`,
                      }
                    : {
                        color: 'rgba(255,255,255,0.35)',
                        border: '1px solid transparent',
                      }
                }>
                <Icon size={14} className="flex-shrink-0" />
                <span className="truncate hidden sm:block">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contenu onglet */}
        <AnimatePresence mode="wait">
          <motion.div
            key={validTab}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit">
            {validTab === 'ma-feuille'     && <OngletMaFeuille />}
            {validTab === 'mon-equipe'     && <OngletMonEquipe />}
            {validTab === 'heures-sup'     && <OngletHeuresSup canValidateTeam={canValidateTeam} />}
            {validTab === 'validation'     && <OngletValidation />}
            {validTab === 'administration' && (
              <OngletAdministration
                canExportPayroll={canExportPayroll}
                canAdminRules={canAdminRules}
                canAdminHolidays={canAdminHolidays}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
