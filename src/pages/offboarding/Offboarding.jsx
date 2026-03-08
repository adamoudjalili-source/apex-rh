// ============================================================
// APEX RH — src/pages/offboarding/Offboarding.jsx
// Session 68 — Hub Offboarding : Dashboard · En cours · Historique · Administration
// Session 85 — +Dashboard auto · +FinalSettlementCard auto
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DoorOpen, Plus, X, User, Calendar, ChevronLeft,
  ClipboardList, MessageSquare, BookOpen, DollarSign,
  CheckCircle2, XCircle, AlertCircle, LayoutDashboard,
} from 'lucide-react'
import { useAuth }                 from '../../contexts/AuthContext'
import {
  useOffboardingProcesses,
  useOffboardingProcess,
  useCreateOffboardingProcess,
  useUpdateOffboardingProcess,
  useCancelOffboarding,
  useOffboardingTemplates,
  useCreateChecklistFromTemplate,
  OFFBOARDING_STATUS_LABELS,
  OFFBOARDING_STATUS_COLORS,
  EXIT_REASON_LABELS,
} from '../../hooks/useOffboarding'
import { useOffboardingAlerts }    from '../../hooks/useOffboardingS85'
import OffboardingProcessCard      from '../../components/offboarding/OffboardingProcessCard'
import OffboardingChecklist        from '../../components/offboarding/OffboardingChecklist'
import ExitInterviewForm           from '../../components/offboarding/ExitInterviewForm'
import KnowledgeTransferPanel      from '../../components/offboarding/KnowledgeTransferPanel'
import FinalSettlementPanel        from '../../components/offboarding/FinalSettlementPanel'
import FinalSettlementCard         from '../../components/offboarding/FinalSettlementCard'
import OffboardingTemplateAdmin    from '../../components/offboarding/OffboardingTemplateAdmin'
import OffboardingStats            from '../../components/offboarding/OffboardingStats'
import OffboardingDashboard        from '../../components/offboarding/OffboardingDashboard'

// ─── Tabs ─────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', adminOnly: true },
  { id: 'active',    label: 'En cours' },
  { id: 'history',   label: 'Historique' },
  { id: 'admin',     label: 'Administration', adminOnly: true },
]

// ─── Create Process Modal ─────────────────────────────────────

function CreateProcessModal({ onClose }) {
  const { profile }  = useAuth()
  const { data: templates = [] } = useOffboardingTemplates()
  const createProcess = useCreateOffboardingProcess()
  const createFromTpl = useCreateChecklistFromTemplate()

  const [form, setForm] = useState({
    user_id:     '',
    exit_date:   '',
    exit_reason: '',
    template_id: templates.find(t => t.is_default)?.id || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.user_id) return
    const process = await createProcess.mutateAsync({
      user_id:     form.user_id,
      exit_date:   form.exit_date || null,
      exit_reason: form.exit_reason || null,
      status:      'in_progress',
    })
    if (form.template_id) {
      await createFromTpl.mutateAsync({
        processId:  process.id,
        templateId: form.template_id,
        exitDate:   form.exit_date,
      })
    }
    onClose(process)
  }

  const isPending = createProcess.isPending || createFromTpl.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.1] p-6"
        style={{ background: 'linear-gradient(135deg,#0f0f2e,#0a0a1e)' }}>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <DoorOpen size={18} className="text-red-400"/>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Démarrer un offboarding</h2>
            <p className="text-xs text-white/40">Renseignez les informations de départ</p>
          </div>
          <button onClick={() => onClose(null)} className="ml-auto text-white/30 hover:text-white/60">
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User ID */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              ID Collaborateur *
            </label>
            <input value={form.user_id}
              onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
              placeholder="UUID du collaborateur"
              required
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 border border-white/[0.08] bg-transparent outline-none focus:border-red-500/50"/>
            <p className="text-[10px] text-white/25 mt-1">Récupérez l'UUID depuis la gestion des utilisateurs</p>
          </div>

          {/* Exit date */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar size={10}/> Date de départ
            </label>
            <input type="date" value={form.exit_date}
              onChange={e => setForm(f => ({ ...f, exit_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] bg-transparent outline-none focus:border-red-500/50"
              style={{ colorScheme: 'dark' }}/>
          </div>

          {/* Exit reason */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Motif de départ
            </label>
            <select value={form.exit_reason}
              onChange={e => setForm(f => ({ ...f, exit_reason: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] outline-none"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <option value="">— Sélectionner —</option>
              {Object.entries(EXIT_REASON_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Template */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Template checklist
              </label>
              <select value={form.template_id}
                onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/[0.08] outline-none"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <option value="">— Aucun template —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(défaut)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => onClose(null)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/[0.08] hover:border-white/[0.15] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={!form.user_id || isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              {isPending ? 'Création...' : 'Démarrer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Process Detail View ──────────────────────────────────────

const DETAIL_TABS = [
  { id: 'checklist', label: 'Checklist', icon: ClipboardList },
  { id: 'interview', label: 'Entretien de sortie', icon: MessageSquare },
  { id: 'knowledge', label: 'Transfert', icon: BookOpen },
  { id: 'settlement', label: 'Solde tout compte', icon: DollarSign },
]

function ProcessDetail({ processId, onBack }) {
  const { data: process, isLoading } = useOffboardingProcess(processId)
  const cancelOffboarding = useCancelOffboarding()
  const completeOffboarding = useUpdateOffboardingProcess()
  const { canAdmin } = useAuth()
  const [detailTab, setDetailTab] = useState('checklist')

  if (isLoading || !process) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70">
          <ChevronLeft size={16}/> Retour
        </button>
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
      </div>
    )
  }

  const userName = [process.user?.first_name, process.user?.last_name].filter(Boolean).join(' ') || '—'
  const statusColor = OFFBOARDING_STATUS_COLORS[process.status] || '#6B7280'
  const statusLabel = OFFBOARDING_STATUS_LABELS[process.status] || process.status

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
        <ChevronLeft size={16}/> Retour à la liste
      </button>

      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${statusColor}15` }}>
            <DoorOpen size={20} style={{ color: statusColor }}/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-white">{userName}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: statusColor, background: `${statusColor}18` }}>
                {statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-white/40">
              {process.exit_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={10}/>
                  Départ : {new Date(process.exit_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}
              {process.exit_reason && (
                <span>{EXIT_REASON_LABELS[process.exit_reason] || process.exit_reason}</span>
              )}
              <span className="flex items-center gap-1">
                <User size={10}/>
                Déclenché par {process.triggered_by_user?.first_name} {process.triggered_by_user?.last_name}
              </span>
            </div>
          </div>

          {/* Actions */}
          {process.status === 'in_progress' && canAdmin && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { if (confirm('Marquer cet offboarding comme terminé ?'))
                  completeOffboarding.mutate({ id: process.id, status: 'completed' }) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                <CheckCircle2 size={12}/> Terminer
              </button>
              <button
                onClick={() => { if (confirm('Annuler cet offboarding ?'))
                  cancelOffboarding.mutate({ id: process.id }) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <XCircle size={12}/> Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {DETAIL_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id}
              onClick={() => setDetailTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background:  detailTab === tab.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                color:       detailTab === tab.id ? '#818CF8' : 'rgba(255,255,255,0.4)',
                border:      `1px solid ${detailTab === tab.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              <Icon size={13}/> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <AnimatePresence mode="wait">
          {detailTab === 'checklist' && (
            <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <OffboardingChecklist processId={process.id}
                readOnly={process.status !== 'in_progress'}/>
            </motion.div>
          )}
          {detailTab === 'interview' && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ExitInterviewForm processId={process.id}
                readOnly={process.status !== 'in_progress'}/>
            </motion.div>
          )}
          {detailTab === 'knowledge' && (
            <motion.div key="knowledge" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <KnowledgeTransferPanel processId={process.id}
                readOnly={process.status !== 'in_progress'}/>
            </motion.div>
          )}
          {detailTab === 'settlement' && (
            <motion.div key="settlement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <FinalSettlementCard
                userId={process.user_id}
                processId={process.id}
                currentAmount={process.final_amount}
              />
              <FinalSettlementPanel process={process}
                readOnly={process.status !== 'in_progress'}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────

export default function Offboarding() {
  const { canAdmin } = useAuth()
  const { data: processes = [], isLoading } = useOffboardingProcesses()
  const { data: alerts = [] } = useOffboardingAlerts()

  const [tab, setTab]               = useState(canAdmin ? 'dashboard' : 'active')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const active   = processes.filter(p => p.status === 'in_progress')
  const history  = processes.filter(p => p.status !== 'in_progress')

  const handleCreate = (process) => {
    setShowCreate(false)
    if (process) setSelectedId(process.id)
  }

  // Detail view
  if (selectedId) {
    return (
      <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
        <ProcessDetail processId={selectedId} onBack={() => setSelectedId(null)}/>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <DoorOpen size={20} className="text-red-400"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Offboarding</h1>
            <p className="text-xs text-white/40">Gestion des départs collaborateurs</p>
          </div>
        </div>
        {canAdmin && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Plus size={15}/> Démarrer un offboarding
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.filter(t => !t.adminOnly || canAdmin).map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background:  tab === t.id ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
              color:       tab === t.id ? '#F87171' : 'rgba(255,255,255,0.4)',
              border:      `1px solid ${tab === t.id ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}>
            {t.label}
            {t.id === 'active' && active.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>
                {active.length}
              </span>
            )}
            {t.id === 'dashboard' && alerts.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'dashboard' && canAdmin && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <OffboardingDashboard onSelectProcess={p => setSelectedId(p.id)}/>
          </motion.div>
        )}

        {tab === 'active' && (
          <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="text-center py-16">
                <DoorOpen size={40} className="text-white/10 mx-auto mb-3"/>
                <p className="text-white/30 text-sm">Aucun offboarding en cours</p>
                {canAdmin && (
                  <button onClick={() => setShowCreate(true)}
                    className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 mx-auto">
                    <Plus size={12}/> Démarrer un premier offboarding
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map(p => (
                  <OffboardingProcessCard key={p.id} process={p}
                    onClick={() => setSelectedId(p.id)}/>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {history.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">
                Aucun offboarding archivé
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {history.map(p => (
                  <OffboardingProcessCard key={p.id} process={p}
                    onClick={() => setSelectedId(p.id)}/>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'admin' && canAdmin && (
          <motion.div key="admin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-8">
            <OffboardingStats/>
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <OffboardingTemplateAdmin/>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateProcessModal onClose={handleCreate}/>
        )}
      </AnimatePresence>
    </div>
  )
}
