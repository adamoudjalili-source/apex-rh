// ============================================================
// APEX RH — src/pages/conges/GestionConges.jsx
// Session 67 — Congés & Absences — Hub 3 onglets
// Onglets : Mes Congés · Mon Équipe · Administration
// ============================================================
import { useState } from 'react'
import {
  CalendarOff, Users, Settings2, Plus, Download,
  RefreshCw, AlertCircle,
} from 'lucide-react'
import { useAuth }             from '../../contexts/AuthContext'
import { MANAGER_ROLES as MANAGERS, ADMIN_ROLES as ADMINS } from '../../lib/roles'

import LeaveBalanceCard     from '../../components/conges/LeaveBalanceCard'
import LeaveRequestCard     from '../../components/conges/LeaveRequestCard'
import LeaveRequestForm     from '../../components/conges/LeaveRequestForm'
import TeamLeaveCalendar    from '../../components/conges/TeamLeaveCalendar'
import LeaveApprovalPanel   from '../../components/conges/LeaveApprovalPanel'
import LeaveTypeAdmin       from '../../components/conges/LeaveTypeAdmin'

import {
  useMyLeaveRequests,
  useLeaveSettings,
  useUpdateLeaveSettings,
  useTeamLeaveRequests,
  useExportLeaves,
  LEAVE_STATUS_LABELS,
} from '../../hooks/useConges'

// ─── Onglet Mes Congés ────────────────────────────────────────
function MesConges() {
  const [showForm,   setShowForm]   = useState(false)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())
  const [statusFilter, setStatus]  = useState('')

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

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={yearFilter}
            onChange={e => setYearFilter(Number(e.target.value))}
            className="rounded-xl px-3 py-2 text-sm text-white/70 border outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm text-white/70 border outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <option value="">Tous les statuts</option>
            {Object.entries(LEAVE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          <Plus size={15}/> Nouvelle demande
        </button>
      </div>

      {/* Soldes */}
      <div>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          Mes soldes — {yearFilter}
        </h2>
        <LeaveBalanceCard year={yearFilter}/>
      </div>

      {/* Historique */}
      <div>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          Mes demandes
          {requests.length > 0 && (
            <span className="ml-2 text-white/40 normal-case font-normal">
              ({filtered.length})
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl px-5 py-12 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
            <CalendarOff size={32} className="mx-auto text-white/15 mb-3"/>
            <p className="text-white/30 text-sm">Aucune demande de congé</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-xs text-indigo-400 hover:underline">
              + Créer une demande
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => <LeaveRequestCard key={r.id} request={r}/>)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Onglet Mon Équipe ────────────────────────────────────────
function MonEquipe() {
  const { data: all = [] }     = useTeamLeaveRequests()
  const exportLeaves            = useExportLeaves()
  const [view, setView]         = useState('pending') // 'pending' | 'calendar' | 'all'
  const now = new Date()

  const pending = all.filter(r => ['submitted','manager_approved'].includes(r.status))

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { key: 'pending',  label: `À valider (${pending.length})` },
          { key: 'calendar', label: 'Calendrier' },
          { key: 'all',      label: 'Toutes' },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === t.key ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white/60'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'pending' && <LeaveApprovalPanel/>}
      {view === 'calendar' && <TeamLeaveCalendar/>}
      {view === 'all' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/30">{all.length} demande{all.length > 1 ? 's' : ''}</p>
            <button
              onClick={() => exportLeaves.mutateAsync({
                startDate: `${now.getFullYear()}-01-01`,
                endDate:   `${now.getFullYear()}-12-31`,
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/60 border hover:text-white/80 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Download size={12}/> Export
            </button>
          </div>
          <div className="space-y-2">
            {all.map(r => <LeaveRequestCard key={r.id} request={r} showUser/>)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Administration ────────────────────────────────────
function Administration() {
  const { data: settings, isLoading } = useLeaveSettings()
  const updateSettings = useUpdateLeaveSettings()
  const exportLeaves   = useExportLeaves()
  const now = new Date()

  const [form,    setForm]    = useState(null)
  const [saved,   setSaved]   = useState(false)
  const [expFrom, setExpFrom] = useState(`${now.getFullYear()}-01-01`)
  const [expTo,   setExpTo]   = useState(`${now.getFullYear()}-12-31`)

  const current = form || settings

  async function handleSave() {
    await updateSettings.mutateAsync(current)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setForm(null)
  }

  return (
    <div className="space-y-8">

      {/* Paramètres généraux */}
      <div>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          Paramètres organisation
        </h2>
        <div className="rounded-2xl border p-5 space-y-5"
          style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)' }}>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'cp_days_per_year',  label: 'Jours CP / an',      min: 0, max: 60 },
                  { key: 'rtt_days_per_year',  label: 'Jours RTT / an',     min: 0, max: 30 },
                  { key: 'carry_over_max',     label: 'Report max (jours)', min: 0, max: 30 },
                ].map(({ key, label, min, max }) => (
                  <div key={key}>
                    <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={(current?.[key] ?? '')}
                      onChange={e => setForm(f => ({ ...(f || current), [key]: Number(e.target.value) }))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500"
                      style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Date limite report</label>
                  <input
                    type="date"
                    value={current?.carry_over_deadline || ''}
                    onChange={e => setForm(f => ({ ...(f || current), carry_over_deadline: e.target.value || null }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!form || updateSettings.isPending}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: saved ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                {saved ? '✓ Enregistré' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Types de congés */}
      <LeaveTypeAdmin/>

      {/* Export global */}
      <div>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          Export données
        </h2>
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Du</label>
              <input type="date" value={expFrom}
                onChange={e => setExpFrom(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Au</label>
              <input type="date" value={expTo}
                onChange={e => setExpTo(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-white/80 border outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportLeaves.mutateAsync({ startDate: expFrom, endDate: expTo, format: 'xlsx' })}
              disabled={exportLeaves.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Download size={14}/> Excel
            </button>
            <button
              onClick={() => exportLeaves.mutateAsync({ startDate: expFrom, endDate: expTo, format: 'csv' })}
              disabled={exportLeaves.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <Download size={14}/> CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HUB PRINCIPAL ────────────────────────────────────────────
export default function GestionConges() {
  const { profile } = useAuth()
  const role        = profile?.role
  const isManager   = MANAGERS.includes(role)
  const isAdmin     = ADMINS.includes(role)

  const tabs = [
    { key: 'mes-conges', label: 'Mes Congés',   icon: CalendarOff, show: true },
    { key: 'mon-equipe', label: 'Mon Équipe',    icon: Users,       show: isManager || isAdmin },
    { key: 'admin',      label: 'Administration', icon: Settings2,   show: isAdmin },
  ].filter(t => t.show)

  const [activeTab, setActiveTab] = useState(tabs[0].key)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarOff size={22} className="text-violet-400"/>
              Congés & Absences
            </h1>
            <p className="text-xs text-white/30 mt-0.5">
              Gestion des demandes de congé et des soldes
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {tabs.map(tab => {
            const Icon    = tab.icon
            const active  = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  active
                    ? 'text-violet-400 border-violet-400'
                    : 'text-white/30 border-transparent hover:text-white/55'
                }`}>
                <Icon size={14}/>{tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'mes-conges' && <MesConges/>}
        {activeTab === 'mon-equipe' && (isManager || isAdmin) && <MonEquipe/>}
        {activeTab === 'admin'      && isAdmin                 && <Administration/>}
      </div>
    </div>
  )
}
