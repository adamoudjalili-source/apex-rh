// ============================================================
// APEX RH — OnboardingAdminDashboard.jsx  ·  Session 75
// Stats globales · Liste tous parcours · Assignation
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, TrendingUp, CheckCircle2,
  AlertCircle, Clock, Plus, User, Calendar, X, Save,
  RefreshCw, Layers,
} from 'lucide-react'
import {
  useAllOnboardingProgress, useOnboardingStats,
  useAssignTemplate, useOnboardingTemplates,
  useRefreshOnboardingMVs,
} from '../../hooks/useOnboarding'
import { useUsersList } from '../../hooks/useSettings'

// ─── SVG Donut avancement ────────────────────────────────────
function DonutChart({ pct, color, size = 64 }) {
  const r  = (size - 8) / 2
  const c  = size / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <motion.circle
        cx={c} cy={c} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Jauge SVG ────────────────────────────────────────────────
function GaugeBar({ pct, color }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}

// ─── Modal Assignation ────────────────────────────────────────
function AssignModal({ onClose }) {
  const { data: templates = [] } = useOnboardingTemplates()
  const { data: users = [] }     = useUsersList()
  const assignTemplate           = useAssignTemplate()

  const [userId,     setUserId]     = useState('')
  const [templateId, setTemplateId] = useState('')
  const [startDate,  setStartDate]  = useState(new Date().toISOString().slice(0, 10))

  const active = templates.filter(t => t.is_active)

  const handle = async () => {
    if (!userId || !templateId) return
    await assignTemplate.mutateAsync({ userId, templateId, startDate })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: 'linear-gradient(135deg, #1a1a3e, #12122a)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Assigner un parcours</h3>
          <button onClick={onClose}><X size={18} className="text-white/40 hover:text-white/70" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Collaborateur *</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a3e] border border-white/10 outline-none"
            >
              <option value="">— Choisir un collaborateur —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Template *</label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a3e] border border-white/10 outline-none"
            >
              <option value="">— Choisir un template —</option>
              {active.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Date de démarrage</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-white/50 border border-white/10">
            Annuler
          </button>
          <button
            onClick={handle}
            disabled={!userId || !templateId || assignTemplate.isPending}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {assignTemplate.isPending
              ? <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
              : <><Save size={13} /> Assigner</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Ligne assignment admin ───────────────────────────────────
function AssignmentRow({ assignment }) {
  const user     = assignment.users || {}
  const template = assignment.onboarding_templates || {}
  const steps    = assignment.onboarding_step_completions || []
  const total     = steps.length
  const completed = steps.filter(s => s.status === 'completed').length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

  const barColor = pct === 100 ? '#10B981' : pct >= 50 ? '#6366F1' : '#F59E0B'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.12)' }}>
        <User size={14} className="text-indigo-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white truncate">{user.full_name || '—'}</span>
          <span className="text-xs font-bold text-white flex-shrink-0">{pct}%</span>
        </div>
        <p className="text-[10px] text-white/35 truncate">{template.name || '—'}</p>
        <div className="mt-1">
          <GaugeBar pct={pct} color={barColor} />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] text-white/30">{completed}/{total}</p>
        <p className={`text-[10px] font-medium ${
          pct === 100 ? 'text-emerald-400' : assignment.status === 'active' ? 'text-indigo-300' : 'text-white/40'
        }`}>{pct === 100 ? 'Terminé' : assignment.status === 'active' ? 'Actif' : assignment.status}</p>
      </div>
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function OnboardingAdminDashboard() {
  const { data: assignments = [], isLoading } = useAllOnboardingProgress()
  const { data: stats = {} }                   = useOnboardingStats()
  const refreshMVs                             = useRefreshOnboardingMVs()
  const [assignModal, setAssignModal]          = useState(false)
  const [search, setSearch]                    = useState('')

  const filtered = assignments.filter(a => {
    if (!search) return true
    const name = a.users?.full_name?.toLowerCase() || ''
    const tmpl = a.onboarding_templates?.name?.toLowerCase() || ''
    const q = search.toLowerCase()
    return name.includes(q) || tmpl.includes(q)
  })

  const kpis = [
    { label: 'Parcours actifs',  value: stats.active   || 0, color: '#6366F1', icon: Clock },
    { label: 'Terminés',         value: stats.completed || 0, color: '#10B981', icon: CheckCircle2 },
    { label: 'Étapes en retard', value: stats.overdue  || 0, color: '#EF4444', icon: AlertCircle },
    { label: 'Taux complétion',  value: `${stats.avgCompletionRate || 0}%`, color: '#F59E0B', icon: TrendingUp },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-white">Tableau de bord onboarding</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refreshMVs.mutateAsync()}
            disabled={refreshMVs.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/50 hover:text-white/70 border border-white/10"
          >
            <RefreshCw size={12} className={refreshMVs.isPending ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setAssignModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            <Plus size={14} /> Assigner un parcours
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl relative overflow-hidden"
            style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
            <div className="flex items-center justify-between mb-2">
              <Icon size={16} style={{ color }} />
              <div style={{ width: 40, height: 40 }}>
                <DonutChart
                  pct={typeof value === 'string' ? parseInt(value) : Math.min(100, (value / (stats.total || 1)) * 100)}
                  color={color}
                  size={40}
                />
              </div>
            </div>
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher un collaborateur ou un template..."
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
      />

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
          <Layers size={28} className="mx-auto text-white/15 mb-2" />
          <p className="text-white/35 text-sm">
            {search ? 'Aucun résultat' : 'Aucun parcours assigné'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-white/30">{filtered.length} parcours</p>
          {filtered.map(a => (
            <AssignmentRow key={a.id} assignment={a} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {assignModal && <AssignModal onClose={() => setAssignModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
