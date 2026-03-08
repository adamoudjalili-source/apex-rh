// ============================================================
// APEX RH — EmployesHub.jsx  ·  V2 Hub unifié S96
// Module 2 — Gestion des Employés
// 5 onglets : Annuaire · Fiche · Organigramme · Structure · Accès & Droits
// Pattern V2 : can() via usePermission() — zéro check rôle direct
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, User, GitBranch, Building2, ShieldCheck, Lock,
  Search, Filter, ChevronDown, Plus, Edit2, ToggleLeft, ToggleRight,
  Award, Briefcase, Phone, Mail, Calendar, ArrowRight, Clock, X,
  CheckCircle, XCircle, AlertCircle, Layers,
} from 'lucide-react'
import { usePermission }           from '../../hooks/usePermission'
import { useAuth }                 from '../../contexts/AuthContext'
import {
  useEmployeeList, useEmployee, useUpdateEmployee,
  useCareerEvents, useAddCareerEvent,
  useOrgStructure, useOrgChart,
  useEmployeeAccess, useUpsertEmployeeAccess, useDeleteEmployeeAccess,
} from '../../hooks/useEmployeeManagement'

// ── Animations ───────────────────────────────────────────────
const fadeIn = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

// ── Constantes rôles ─────────────────────────────────────────
const ROLE_LABELS = {
  super_admin:   'Super Admin',
  administrateur:'Administrateur',
  directeur:     'Directeur',
  chef_division: 'Chef de Division',
  chef_service:  'Chef de Service',
  collaborateur: 'Collaborateur',
}
const ROLE_COLORS = {
  super_admin:   '#C9A227',
  administrateur:'#EF4444',
  directeur:     '#8B5CF6',
  chef_division: '#3B82F6',
  chef_service:  '#06B6D4',
  collaborateur: '#10B981',
}
const ROLE_ORDER = ['collaborateur','chef_service','chef_division','directeur','administrateur','super_admin']

const EVENT_LABELS = {
  promotion:        'Promotion',
  mutation:         'Mutation',
  changement_role:  'Changement de rôle',
  augmentation:     'Augmentation',
  formation:        'Formation',
  periode_essai:    "Période d'essai",
  confirmation:     'Confirmation',
  avertissement:    'Avertissement',
}

// ─────────────────────────────────────────────────────────────
// PANEL 1 — Annuaire
// ─────────────────────────────────────────────────────────────
function AnnuairePanel({ onSelectEmployee }) {
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('actifs')

  const { data: employees = [], isLoading } = useEmployeeList({ search, roleFilter, statusFilter })

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, prénom ou email…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-white/70 focus:outline-none"
        >
          <option value="tous">Tous les rôles</option>
          {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-white/70 focus:outline-none"
        >
          <option value="actifs">Actifs</option>
          <option value="inactifs">Inactifs</option>
          <option value="tous">Tous</option>
        </select>
      </div>

      {/* Compteur */}
      <p className="text-xs text-white/30">{employees.length} collaborateur{employees.length !== 1 ? 's' : ''}</p>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-blue-400 animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">Aucun collaborateur trouvé</div>
      ) : (
        <div className="grid gap-2">
          {employees.map(emp => (
            <button
              key={emp.id}
              onClick={() => onSelectEmployee(emp.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all text-left group"
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white uppercase"
                style={{ background: `${ROLE_COLORS[emp.role] || '#4F46E5'}22`, border: `1px solid ${ROLE_COLORS[emp.role] || '#4F46E5'}40` }}
              >
                {emp.first_name?.[0]}{emp.last_name?.[0]}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {emp.first_name} {emp.last_name}
                </p>
                <p className="text-xs text-white/40 truncate">{emp.poste || emp.email}</p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {emp.divisions?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 hidden sm:block">
                    {emp.divisions.name}
                  </span>
                )}
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                  style={{
                    background: `${ROLE_COLORS[emp.role]}18`,
                    color: ROLE_COLORS[emp.role],
                    borderColor: `${ROLE_COLORS[emp.role]}35`,
                  }}
                >
                  {ROLE_LABELS[emp.role] || emp.role}
                </span>
                {!emp.is_active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                    Inactif
                  </span>
                )}
                <ArrowRight size={13} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL 2 — Fiche Employé
// ─────────────────────────────────────────────────────────────
function FichePanel({ canUpdate }) {
  const [selectedId, setSelectedId] = useState(null)
  const [editMode, setEditMode]     = useState(false)
  const [editData, setEditData]     = useState({})
  const [showCareer, setShowCareer] = useState(false)
  const [newEvent, setNewEvent]     = useState({ event_type: 'promotion', new_value: '', note: '', effective_date: '' })
  const [showEventForm, setShowEventForm] = useState(false)

  const { data: employees = [] } = useEmployeeList()
  const { data: emp, isLoading } = useEmployee(selectedId)
  const { data: events = [] }    = useCareerEvents(selectedId)
  const updateEmp                = useUpdateEmployee()
  const addEvent                 = useAddCareerEvent()

  const handleSave = async () => {
    await updateEmp.mutateAsync({ id: selectedId, updates: editData })
    setEditMode(false)
  }

  const handleAddEvent = async () => {
    await addEvent.mutateAsync({ ...newEvent, user_id: selectedId })
    setShowEventForm(false)
    setNewEvent({ event_type: 'promotion', new_value: '', note: '', effective_date: '' })
  }

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 500 }}>
      {/* Sélecteur */}
      <div className="w-64 flex-shrink-0 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-white/25 px-1 pb-1">Sélectionner</p>
        <div className="overflow-y-auto space-y-1" style={{ maxHeight: 520 }}>
          {employees.map(e => (
            <button
              key={e.id}
              onClick={() => { setSelectedId(e.id); setEditMode(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                selectedId === e.id ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0"
                style={{ background: `${ROLE_COLORS[e.role]}30` }}
              >{e.first_name?.[0]}{e.last_name?.[0]}</div>
              <span className="text-xs text-white/70 truncate">{e.first_name} {e.last_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fiche */}
      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-white/25 gap-3 py-16">
            <User size={32} className="opacity-30" />
            <p className="text-sm">Sélectionnez un collaborateur</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center pt-16">
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-blue-400 animate-spin" />
          </div>
        ) : emp ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white uppercase"
                  style={{ background: `${ROLE_COLORS[emp.role] || '#4F46E5'}22`, border: `1px solid ${ROLE_COLORS[emp.role] || '#4F46E5'}40` }}
                >
                  {emp.first_name?.[0]}{emp.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{emp.first_name} {emp.last_name}</h3>
                  <p className="text-xs text-white/40">{emp.poste || 'Poste non défini'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {emp.is_active
                  ? <span className="text-[11px] px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">Actif</span>
                  : <span className="text-[11px] px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">Inactif</span>
                }
                {canUpdate && (
                  <button
                    onClick={() => { setEditMode(!editMode); setEditData({ poste: emp.poste, phone: emp.phone }) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: editMode ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)', color: editMode ? '#818CF8' : 'rgba(255,255,255,0.6)' }}
                  >
                    {editMode ? 'Annuler' : <><Edit2 size={12} className="inline mr-1" />Modifier</>}
                  </button>
                )}
              </div>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Mail,      label: 'Email',     value: emp.email },
                { icon: Phone,     label: 'Téléphone', value: editMode ? null : (emp.phone || '—'),
                  edit: editMode ? <input value={editData.phone || ''} onChange={e => setEditData(d=>({...d,phone:e.target.value}))} className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-white" /> : null },
                { icon: Briefcase, label: 'Poste',     value: editMode ? null : (emp.poste || '—'),
                  edit: editMode ? <input value={editData.poste || ''} onChange={e => setEditData(d=>({...d,poste:e.target.value}))} className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-xs text-white" /> : null },
                { icon: Award,     label: 'Rôle',      value: ROLE_LABELS[emp.role] || emp.role },
                { icon: Building2, label: 'Direction',  value: emp.directions?.name || '—' },
                { icon: Layers,    label: 'Division',   value: emp.divisions?.name || '—' },
                { icon: Users,     label: 'Service',    value: emp.services?.name || '—' },
                { icon: Calendar,  label: 'Depuis',     value: new Date(emp.created_at).toLocaleDateString('fr-FR') },
              ].map(({ icon: Icon, label, value, edit }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={11} className="text-white/30" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
                  </div>
                  {edit || <p className="text-xs text-white/70 truncate">{value}</p>}
                </div>
              ))}
            </div>

            {/* Bouton Sauvegarder */}
            {editMode && (
              <button
                onClick={handleSave}
                disabled={updateEmp.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                {updateEmp.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            )}

            {/* Historique carrière */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowCareer(!showCareer)}
                  className="flex items-center gap-2 text-xs font-medium text-white/50 hover:text-white/80 transition-colors"
                >
                  <Clock size={13} />
                  Historique carrière ({events.length})
                  <ChevronDown size={12} className={`transition-transform ${showCareer ? 'rotate-180' : ''}`} />
                </button>
                {canUpdate && showCareer && (
                  <button
                    onClick={() => setShowEventForm(true)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    <Plus size={11} /> Ajouter
                  </button>
                )}
              </div>

              {showCareer && (
                <div className="space-y-2 pl-3 border-l border-white/[0.08]">
                  {showEventForm && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <select
                        value={newEvent.event_type}
                        onChange={e => setNewEvent(d => ({ ...d, event_type: e.target.value }))}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        {Object.entries(EVENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <input
                        placeholder="Valeur (ex: Chef de Service → Chef de Division)"
                        value={newEvent.new_value}
                        onChange={e => setNewEvent(d => ({ ...d, new_value: e.target.value }))}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/25"
                      />
                      <input
                        type="date"
                        value={newEvent.effective_date}
                        onChange={e => setNewEvent(d => ({ ...d, effective_date: e.target.value }))}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <input
                        placeholder="Note (optionnel)"
                        value={newEvent.note}
                        onChange={e => setNewEvent(d => ({ ...d, note: e.target.value }))}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/25"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddEvent} disabled={addEvent.isPending} className="px-3 py-1.5 rounded-lg text-xs text-green-400 bg-green-500/15 border border-green-500/25">
                          {addEvent.isPending ? '…' : 'Ajouter'}
                        </button>
                        <button onClick={() => setShowEventForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-white/40 bg-white/[0.04] border border-white/10">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  {events.length === 0 && !showEventForm && (
                    <p className="text-xs text-white/25 py-2">Aucun événement</p>
                  )}
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-start gap-2 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white/70">
                          <span className="font-medium text-white/90">{EVENT_LABELS[ev.event_type] || ev.event_type}</span>
                          {ev.new_value && ` — ${ev.new_value}`}
                        </p>
                        {ev.note && <p className="text-[11px] text-white/35 mt-0.5">{ev.note}</p>}
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {ev.effective_date ? new Date(ev.effective_date).toLocaleDateString('fr-FR') : '—'}
                          {ev.created_by_user && ` · par ${ev.created_by_user.first_name} ${ev.created_by_user.last_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL 3 — Organigramme SVG
// ─────────────────────────────────────────────────────────────
function OrgchartPanel() {
  const { data: employees = [], isLoading } = useOrgChart()
  const [expandedDivision, setExpandedDivision] = useState(null)

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-indigo-400 animate-spin" />
    </div>
  )

  // Grouper par division
  const byDivision = {}
  const noDivision = []
  employees.forEach(emp => {
    if (emp.division_id) {
      const key = emp.divisions?.name || emp.division_id
      if (!byDivision[key]) byDivision[key] = []
      byDivision[key].push(emp)
    } else {
      noDivision.push(emp)
    }
  })

  const ROLE_ICONS = {
    super_admin:   '⭐',
    administrateur:'🛡',
    directeur:     '🎯',
    chef_division: '🏢',
    chef_service:  '👥',
    collaborateur: '👤',
  }

  const EmpCard = ({ emp }) => (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${ROLE_COLORS[emp.role] || '#4F46E5'}22` }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0"
        style={{ background: `${ROLE_COLORS[emp.role] || '#4F46E5'}20` }}
      >
        {emp.first_name?.[0]}{emp.last_name?.[0]}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/80 truncate">{emp.first_name} {emp.last_name}</p>
        <p className="text-[10px] text-white/30 truncate">{ROLE_LABELS[emp.role] || emp.role}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ROLE_ORDER.map(r => {
          const count = employees.filter(e => e.role === r).length
          if (!count) return null
          return (
            <div key={r} className="rounded-xl p-2.5 text-center" style={{ background: `${ROLE_COLORS[r]}12`, border: `1px solid ${ROLE_COLORS[r]}25` }}>
              <p className="text-lg font-bold" style={{ color: ROLE_COLORS[r] }}>{count}</p>
              <p className="text-[10px] text-white/40 truncate">{ROLE_LABELS[r]}</p>
            </div>
          )
        })}
      </div>

      {/* Arbre SVG — Vue par division */}
      <div className="space-y-3">
        {/* Sans division */}
        {noDivision.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 px-1">Direction générale</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {noDivision.map(emp => <EmpCard key={emp.id} emp={emp} />)}
            </div>
          </div>
        )}

        {/* Par division */}
        {Object.entries(byDivision).map(([divName, emps]) => {
          const isExpanded = expandedDivision === divName || Object.keys(byDivision).length <= 3
          const chiefs     = emps.filter(e => e.role === 'chef_division')
          const others     = emps.filter(e => e.role !== 'chef_division')

          return (
            <div key={divName} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Header division */}
              <button
                onClick={() => setExpandedDivision(expandedDivision === divName ? null : divName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                style={{ background: 'rgba(255,255,255,0.025)' }}
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-blue-400" />
                  <span className="text-sm font-medium text-white/80">{divName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{emps.length}</span>
                </div>
                <ChevronDown size={14} className={`text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="p-3 space-y-3">
                  {/* Chefs de division */}
                  {chiefs.length > 0 && (
                    <div>
                      <p className="text-[10px] text-white/25 mb-1.5 px-1">Responsable(s)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {chiefs.map(emp => <EmpCard key={emp.id} emp={emp} />)}
                      </div>
                    </div>
                  )}
                  {/* Autres */}
                  {others.length > 0 && (
                    <div>
                      {chiefs.length > 0 && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-4 h-px bg-white/[0.06]" />
                          <p className="text-[10px] text-white/25">Membres</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {others.map(emp => <EmpCard key={emp.id} emp={emp} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL 4 — Structure
// ─────────────────────────────────────────────────────────────
function StructurePanel() {
  const { data, isLoading } = useOrgStructure()

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-indigo-400 animate-spin" />
    </div>
  )

  const { directions = [], divisions = [], services = [] } = data || {}

  return (
    <div className="space-y-6">
      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Directions', count: directions.length, color: '#C9A227' },
          { label: 'Divisions',  count: divisions.length,  color: '#3B82F6' },
          { label: 'Services',   count: services.length,   color: '#10B981' },
        ].map(({ label, count, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
            <p className="text-2xl font-bold" style={{ color }}>{count}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Arbre structure */}
      {directions.map(dir => {
        const divs = divisions.filter(d => d.direction_id === dir.id)
        return (
          <div key={dir.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,162,39,0.2)' }}>
            {/* Direction */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(201,162,39,0.06)' }}>
              <Building2 size={14} color="#C9A227" />
              <span className="text-sm font-semibold text-amber-400/90">{dir.name}</span>
              {dir.description && <span className="text-xs text-white/30">— {dir.description}</span>}
            </div>

            {/* Divisions */}
            {divs.length > 0 && (
              <div className="p-3 space-y-2">
                {divs.map(div => {
                  const svcs = services.filter(s => s.division_id === div.id)
                  return (
                    <div key={div.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.06)' }}>
                        <Layers size={12} color="#3B82F6" />
                        <span className="text-xs font-medium text-blue-400/90">{div.name}</span>
                      </div>
                      {svcs.length > 0 && (
                        <div className="px-3 py-2 flex flex-wrap gap-2">
                          {svcs.map(svc => (
                            <span key={svc.id} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                              {svc.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {directions.length === 0 && (
        <p className="text-center text-white/25 text-sm py-12">Aucune structure définie</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PANEL 5 — Accès & Droits
// ─────────────────────────────────────────────────────────────
const MODULE_LABELS = {
  employes:     'Employés',
  temps:        'Temps & Absences',
  conges:       'Congés',
  performance:  'Performance',
  evaluations:  'Évaluations',
  intelligence: 'Intelligence RH',
  admin:        'Administration',
}

function AccesDroitsPanel({ canUpdate }) {
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ module: 'employes', resource: '', action: 'read', granted: true, expires_at: '' })

  const { data: employees = [] }      = useEmployeeList()
  const { data: overrides = [], isLoading } = useEmployeeAccess(selectedId)
  const upsert                         = useUpsertEmployeeAccess()
  const remove                         = useDeleteEmployeeAccess()

  const handleAdd = async () => {
    await upsert.mutateAsync({ ...form, user_id: selectedId })
    setShowForm(false)
    setForm({ module: 'employes', resource: '', action: 'read', granted: true, expires_at: '' })
  }

  return (
    <div className="flex gap-4" style={{ minHeight: 500 }}>
      {/* Sélecteur employé */}
      <div className="w-56 flex-shrink-0 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-white/25 px-1 pb-1">Sélectionner</p>
        <div className="overflow-y-auto space-y-1" style={{ maxHeight: 500 }}>
          {employees.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                selectedId === e.id ? 'bg-red-500/15 border border-red-500/25' : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0"
                style={{ background: `${ROLE_COLORS[e.role]}30` }}>
                {e.first_name?.[0]}{e.last_name?.[0]}
              </div>
              <span className="text-xs text-white/70 truncate">{e.first_name} {e.last_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Détail */}
      <div className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-white/25 gap-3 py-16">
            <ShieldCheck size={32} className="opacity-30" />
            <p className="text-sm">Sélectionnez un collaborateur</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                {(() => {
                  const emp = employees.find(e => e.id === selectedId)
                  return emp ? (
                    <div>
                      <p className="text-sm font-medium text-white">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-white/40">Surcharges RBAC individuelles</p>
                    </div>
                  ) : null
                })()}
              </div>
              {canUpdate && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <Plus size={12} /> Ajouter surcharge
                </button>
              )}
            </div>

            {/* Formulaire ajout */}
            {showForm && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Module</label>
                    <select
                      value={form.module}
                      onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {Object.entries(MODULE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Ressource</label>
                    <input
                      placeholder="ex: fiche"
                      value={form.resource}
                      onChange={e => setForm(f => ({ ...f, resource: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/25"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Action</label>
                    <select
                      value={form.action}
                      onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {['read','create','update','delete','validate','export','admin'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Accès</label>
                    <select
                      value={form.granted}
                      onChange={e => setForm(f => ({ ...f, granted: e.target.value === 'true' }))}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="true">Accordé ✓</option>
                      <option value="false">Refusé ✗</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Expiration</label>
                    <input
                      type="date"
                      value={form.expires_at}
                      onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={upsert.isPending || !form.resource} className="px-3 py-1.5 rounded-lg text-xs text-red-400 bg-red-500/15 border border-red-500/25">
                    {upsert.isPending ? '…' : 'Ajouter'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-white/40 bg-white/[0.04] border border-white/10">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Liste surcharges */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-red-400 animate-spin" />
              </div>
            ) : overrides.length === 0 ? (
              <div className="text-center py-10 text-white/25 text-sm">Aucune surcharge RBAC — droits du rôle appliqués</div>
            ) : (
              <div className="space-y-2">
                {overrides.map(ov => (
                  <div key={ov.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      {ov.granted
                        ? <CheckCircle size={14} color="#10B981" />
                        : <XCircle    size={14} color="#EF4444" />
                      }
                      <div>
                        <p className="text-xs text-white/80">
                          <span className="font-medium">{MODULE_LABELS[ov.module] || ov.module}</span>
                          <span className="text-white/40"> · {ov.resource} · {ov.action}</span>
                        </p>
                        {ov.expires_at && (
                          <p className="text-[10px] text-white/30">
                            Expire le {new Date(ov.expires_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    {canUpdate && (
                      <button
                        onClick={() => remove.mutate({ overrideId: ov.id, userId: selectedId })}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 transition-colors"
                        title="Supprimer"
                      >
                        <X size={13} className="text-white/30 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AccessDenied
// ─────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible"
      className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={22} color="#EF4444" />
      </div>
      <p className="text-white/50 text-sm">Accès non autorisé</p>
      <p className="text-white/25 text-xs">Vous n&apos;avez pas les droits pour consulter cette section.</p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// TabButton
// ─────────────────────────────────────────────────────────────
function TabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
      style={{
        background: isActive ? `${tab.color}18` : 'transparent',
        color:      isActive ? tab.color : 'rgba(255,255,255,0.45)',
        border:     `1px solid ${isActive ? `${tab.color}35` : 'transparent'}`,
      }}>
      <Icon size={15} />
      {tab.label}
      {isActive && (
        <motion.div
          layoutId="employes-tab-indicator"
          className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
          style={{ background: tab.color }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — EmployesHub
// ─────────────────────────────────────────────────────────────
export default function EmployesHub() {
  const { can } = usePermission()

  const TABS = [
    {
      id:       'annuaire',
      label:    'Annuaire',
      icon:     Users,
      color:    '#3B82F6',
      resource: 'annuaire',
      render:   () => <AnnuairePanel onSelectEmployee={(id) => {
        setActiveTabId('fiche')
        setPreselectedId(id)
      }} />,
    },
    {
      id:       'fiche',
      label:    'Fiche Employé',
      icon:     User,
      color:    '#6366F1',
      resource: 'fiche',
      render:   () => <FichePanel canUpdate={can('employes','fiche','update')} />,
    },
    {
      id:       'orgchart',
      label:    'Organigramme',
      icon:     GitBranch,
      color:    '#10B981',
      resource: 'orgchart',
      render:   () => <OrgchartPanel />,
    },
    {
      id:       'structure',
      label:    'Structure',
      icon:     Building2,
      color:    '#C9A227',
      resource: 'structure',
      render:   () => <StructurePanel />,
    },
    {
      id:       'acces_droits',
      label:    'Accès & Droits',
      icon:     ShieldCheck,
      color:    '#EF4444',
      resource: 'acces_droits',
      render:   () => <AccesDroitsPanel canUpdate={can('employes','acces_droits','update')} />,
    },
  ]

  const visibleTabs = TABS.filter(t => can('employes', t.resource, 'read'))
  const [activeTabId, setActiveTabId] = useState(() => visibleTabs[0]?.id ?? null)
  const [preselectedId, setPreselectedId] = useState(null) // eslint-disable-line no-unused-vars

  const activeTab = visibleTabs.find(t => t.id === activeTabId) ?? visibleTabs[0] ?? null

  if (visibleTabs.length === 0) {
    return <div className="p-6"><AccessDenied /></div>
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ color: '#fff' }}>

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Users size={17} color="#3B82F6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Gestion des Employés</h1>
            <p className="text-xs text-white/35 mt-0.5">Annuaire, fiches, organigramme et droits d&apos;accès</p>
          </div>
        </div>

        {/* ── Onglets ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-px" style={{ scrollbarWidth: 'none' }}>
          {visibleTabs.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab?.id === tab.id}
              onClick={() => setActiveTabId(tab.id)}
            />
          ))}
        </div>

        {/* Séparateur */}
        <div className="mt-3 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* ── Contenu ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          {activeTab && (
            can('employes', activeTab.resource, 'read') ? (
              <motion.div
                key={activeTab.id}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}>
                {activeTab.render()}
              </motion.div>
            ) : (
              <motion.div key="denied" variants={fadeIn} initial="hidden" animate="visible">
                <AccessDenied />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
