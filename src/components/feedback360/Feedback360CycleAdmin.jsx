// ============================================================
// APEX RH — components/feedback360/Feedback360CycleAdmin.jsx
// Session 81 — Admin cycles 360° : création, participants, taux
// ============================================================
import { useState } from 'react'
import {
  Plus, Play, Archive, BarChart2, Users, CheckCircle, Clock,
  ChevronDown, ChevronRight, Loader2, Settings, Calendar,
  AlertCircle, X, Check,
} from 'lucide-react'
import {
  useFeedback360Cycles, useCreateFeedback360Cycle,
  useUpdateFeedback360CycleStatus, useFeedback360CycleStats,
  useFeedback360Templates, useCreateFeedback360Requests,
} from '../../hooks/useFeedback360'
import { useUsersList } from '../../hooks/useSettings'

const STATUS_CONFIG = {
  draft:    { label: 'Brouillon', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  active:   { label: 'En cours',  color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  closed:   { label: 'Terminé',   color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  archived: { label: 'Archivé',   color: '#374151', bg: 'rgba(55,65,81,0.12)'    },
}

// ─── Carte cycle ─────────────────────────────────────────────

function CycleCard({ cycle, expanded, onToggle }) {
  const { data: stats } = useFeedback360CycleStats(cycle.id)
  const updateStatus = useUpdateFeedback360CycleStatus()
  const cfg = STATUS_CONFIG[cycle.status] ?? STATUS_CONFIG.draft

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white truncate">{cycle.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-white/35">
            {new Date(cycle.start_date).toLocaleDateString('fr-FR')} →{' '}
            {new Date(cycle.end_date).toLocaleDateString('fr-FR')}
            {cycle.template?.name && <span className="ml-2">· {cycle.template.name}</span>}
          </p>
        </div>

        {/* Mini stats */}
        {stats && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: stats.response_rate >= 70 ? '#22C55E' : '#EAB308' }}>
                {stats.response_rate}%
              </p>
              <p className="text-xs text-white/30">{stats.submitted}/{stats.total}</p>
            </div>
            <div className="w-10 h-10 relative">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                <circle cx="18" cy="18" r="15" fill="none"
                  stroke={stats.response_rate >= 70 ? '#22C55E' : '#EAB308'}
                  strokeWidth="3"
                  strokeDasharray={`${(stats.response_rate / 100) * 94.2} 94.2`}
                  strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        )}

        {expanded ? <ChevronDown size={14} className="text-white/30 flex-shrink-0"/> : <ChevronRight size={14} className="text-white/30 flex-shrink-0"/>}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Stats détail */}
          {stats && (
            <div className="grid grid-cols-4 gap-2 mt-3 mb-3">
              {[
                { label: 'Total',     value: stats.total,          color: '#60A5FA' },
                { label: 'Soumis',    value: stats.submitted,      color: '#22C55E' },
                { label: 'En attente',value: stats.pending,        color: '#EAB308' },
                { label: 'Évalués',   value: stats.evaluatee_count, color: '#A78BFA' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-white/30">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {cycle.status === 'draft' && (
              <button
                onClick={() => updateStatus.mutate({ cycleId: cycle.id, status: 'active' })}
                disabled={updateStatus.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }}>
                <Play size={11}/> Lancer le cycle
              </button>
            )}
            {cycle.status === 'active' && (
              <button
                onClick={() => updateStatus.mutate({ cycleId: cycle.id, status: 'closed' })}
                disabled={updateStatus.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818CF8' }}>
                <CheckCircle size={11}/> Clôturer
              </button>
            )}
            {cycle.status === 'closed' && (
              <button
                onClick={() => updateStatus.mutate({ cycleId: cycle.id, status: 'archived' })}
                disabled={updateStatus.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.25)', color: '#9CA3AF' }}>
                <Archive size={11}/> Archiver
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal création cycle ────────────────────────────────────

function CreateCycleModal({ onClose }) {
  const { data: templates = [] } = useFeedback360Templates()
  const { data: users = [] }     = useUsersList()
  const createCycle   = useCreateFeedback360Cycle()
  const createReqs    = useCreateFeedback360Requests()

  const [step, setStep] = useState(0)  // 0: infos, 1: participants
  const [form, setForm] = useState({
    title: '', description: '', start_date: '', end_date: '',
    template_id: '', scope: 'all',
  })
  const [assignments, setAssignments] = useState([])
  // assignments: [{evaluatee_id, evaluator_id, relationship}]

  const [evaluateeSearch, setEvaluateeSearch] = useState('')
  const [evaluatorSearch, setEvaluatorSearch] = useState('')

  const filteredEvaluatees = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(evaluateeSearch.toLowerCase())
  ).slice(0, 8)

  async function handleCreate() {
    const cycleData = await createCycle.mutateAsync(form)
    // On doit récupérer le cycle créé (via refetch) pour obtenir l'id
    // En pratique, on recharge les cycles et prend le dernier
    onClose()
  }

  const valid = form.title && form.start_date && form.end_date

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-base font-bold text-white">Nouveau cycle 360°</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          <div className="flex flex-col gap-3">
            {/* Titre */}
            <div>
              <label className="text-xs text-white/50 mb-1 block">Titre du cycle *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Feedback 360° T1 2026"
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}/>
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Date début *</label>
                <input type="date" value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}/>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Date fin *</label>
                <input type="date" value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}/>
              </div>
            </div>
            {/* Template */}
            {templates.length > 0 && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">Template de compétences</label>
                <select value={form.template_id}
                  onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <option value="">Aucun template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (Défaut)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Description */}
            <div>
              <label className="text-xs text-white/50 mb-1 block">Description</label>
              <textarea value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Objectif de ce cycle 360°…"
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}/>
            </div>

            {!form.template_id && templates.length === 0 && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertCircle size={13} className="text-amber-400 mt-0.5 flex-shrink-0"/>
                <p className="text-xs text-amber-400/80">
                  Aucun template disponible. Créez d'abord un template de compétences depuis les paramètres.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            Annuler
          </button>
          <button onClick={handleCreate} disabled={!valid || createCycle.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            {createCycle.isPending ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            Créer le cycle
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────

export default function Feedback360CycleAdmin() {
  const { data: cycles = [], isLoading } = useFeedback360Cycles()
  const [expanded, setExpanded]  = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const activeCycles   = cycles.filter(c => c.status === 'active')
  const draftCycles    = cycles.filter(c => c.status === 'draft')
  const closedCycles   = cycles.filter(c => ['closed', 'archived'].includes(c.status))

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Cycles Feedback 360°</h2>
          <p className="text-xs text-white/35">
            {cycles.length} cycle{cycles.length > 1 ? 's' : ''} · {activeCycles.length} actif{activeCycles.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Plus size={14}/> Nouveau cycle
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-white/30"/>
        </div>
      ) : cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <BarChart2 size={40} className="text-white/10"/>
          <p className="text-sm text-white/30">Aucun cycle 360° créé.</p>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white mt-1"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.35)' }}>
            <Plus size={13}/> Créer le premier cycle
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Actifs */}
          {activeCycles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">En cours</p>
              <div className="flex flex-col gap-2">
                {activeCycles.map(c => (
                  <CycleCard key={c.id} cycle={c}
                    expanded={expanded === c.id}
                    onToggle={() => setExpanded(expanded === c.id ? null : c.id)}/>
                ))}
              </div>
            </div>
          )}
          {/* Brouillons */}
          {draftCycles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Brouillons</p>
              <div className="flex flex-col gap-2">
                {draftCycles.map(c => (
                  <CycleCard key={c.id} cycle={c}
                    expanded={expanded === c.id}
                    onToggle={() => setExpanded(expanded === c.id ? null : c.id)}/>
                ))}
              </div>
            </div>
          )}
          {/* Terminés */}
          {closedCycles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Terminés</p>
              <div className="flex flex-col gap-2">
                {closedCycles.map(c => (
                  <CycleCard key={c.id} cycle={c}
                    expanded={expanded === c.id}
                    onToggle={() => setExpanded(expanded === c.id ? null : c.id)}/>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateCycleModal onClose={() => setShowCreate(false)}/>}
    </div>
  )
}
