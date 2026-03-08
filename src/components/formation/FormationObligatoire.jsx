// ============================================================
// APEX RH — src/components/formation/FormationObligatoire.jsx
// Session 73 — Formations obligatoires + conformité
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle2, XCircle,
  PlusCircle, Trash2, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'
import {
  useMandatoryRules, useCreateMandatoryRule, useDeleteMandatoryRule,
  useMyMandatoryStatus, useRefreshFormationMVs,
  useMandatoryCompliance, MANDATORY_TARGET_LABELS,
  COMPLIANCE_STATUS_LABELS, COMPLIANCE_STATUS_COLORS, getComplianceInfo,
} from '../../hooks/useFormations'
import { useTrainingCatalog } from '../../hooks/useFormations'
import { useAuth } from '../../contexts/AuthContext'

const ROLE_OPTIONS = [
  { value: 'collaborateur',  label: 'Collaborateur' },
  { value: 'chef_service',   label: 'Chef de service' },
  { value: 'chef_division',  label: 'Chef de division' },
  { value: 'directeur',      label: 'Directeur' },
  { value: 'administrateur', label: 'Administrateur' },
]

function ComplianceBadge({ status }) {
  const Icon = status === 'conforme' ? CheckCircle2 : status === 'a_renouveler' ? Clock : XCircle
  const color = COMPLIANCE_STATUS_COLORS[status] ?? '#6B7280'
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: `${color}22`, color }}>
      <Icon size={11}/>{COMPLIANCE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function MyMandatoryStatusPanel() {
  const { data: statuses = [], isLoading } = useMyMandatoryStatus()
  if (isLoading) return <div className="text-center py-6 text-white/20 text-sm">Chargement...</div>
  if (!statuses.length) return (
    <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
      <ShieldCheck size={28} className="mx-auto mb-2" style={{ color: '#10B981' }}/>
      <p className="text-sm font-semibold text-white">Aucune formation obligatoire assignée</p>
      <p className="text-xs text-white/30 mt-1">Vous n'avez pas de formations obligatoires à réaliser.</p>
    </div>
  )

  const conforme = statuses.filter(s => s.compliance_status === 'conforme').length
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Mes formations obligatoires</p>
        <span className="text-xs text-white/40">{conforme}/{statuses.length} conformes</span>
      </div>
      {statuses.map(s => (
        <div key={s.id} className="rounded-2xl p-4 flex items-start justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{s.training_catalog?.title}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {s.training_catalog?.type}
              {s.renewal_months && ` · Renouvellement tous les ${s.renewal_months} mois`}
            </p>
            {s.last_completed_at && (
              <p className="text-xs text-white/25 mt-1">
                Dernière réalisation : {new Date(s.last_completed_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <ComplianceBadge status={s.compliance_status}/>
        </div>
      ))}
    </div>
  )
}

function AdminRulesPanel() {
  const { data: rules = [], isLoading } = useMandatoryRules()
  const { data: catalog = [] } = useTrainingCatalog({ activeOnly: true })
  const { mutateAsync: createRule, isPending: creating } = useCreateMandatoryRule()
  const { mutateAsync: deleteRule } = useDeleteMandatoryRule()
  const { mutateAsync: refreshMVs, isPending: refreshing } = useRefreshFormationMVs()
  const { data: compliance = [] } = useMandatoryCompliance()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ training_id: '', target_type: 'all', target_role: '', renewal_months: '', deadline_days: 90 })

  const handleCreate = async () => {
    if (!form.training_id || !form.target_type) return
    await createRule({
      training_id: form.training_id,
      target_type: form.target_type,
      target_role: form.target_type === 'role' ? form.target_role : null,
      renewal_months: form.renewal_months ? +form.renewal_months : null,
      deadline_days: +form.deadline_days || 90,
    })
    setShowForm(false)
    setForm({ training_id: '', target_type: 'all', target_role: '', renewal_months: '', deadline_days: 90 })
  }

  // Conformité globale par formation
  const complianceMap = {}
  compliance.forEach(c => {
    if (!complianceMap[c.training_id]) complianceMap[c.training_id] = {}
    complianceMap[c.training_id][c.compliance_status] = (c.user_count || 0)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Règles obligations ({rules.length})</p>
        <div className="flex gap-2">
          <button onClick={() => refreshMVs()} disabled={refreshing}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/40 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''}/> Actualiser
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <PlusCircle size={13}/> Nouvelle règle
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-xs font-semibold text-indigo-300">Nouvelle formation obligatoire</p>
            <select value={form.training_id} onChange={e => setForm(f => ({ ...f, training_id: e.target.value }))}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="">Sélectionner une formation...</option>
              {catalog.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.target_type} onChange={e => setForm(f => ({ ...f, target_type: e.target.value }))}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {Object.entries(MANDATORY_TARGET_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {form.target_type === 'role' && (
                <select value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="">Rôle...</option>
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" placeholder="Renouvellement (mois, optionnel)"
                value={form.renewal_months} onChange={e => setForm(f => ({ ...f, renewal_months: e.target.value }))}
                className="rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}/>
              <input type="number" min="1" placeholder="Délai (jours)"
                value={form.deadline_days} onChange={e => setForm(f => ({ ...f, deadline_days: e.target.value }))}
                className="rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}/>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating || !form.training_id}
                className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'rgba(99,102,241,0.6)' }}>
                {creating ? 'Enregistrement...' : 'Créer la règle'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 rounded-lg text-sm text-white/40 hover:text-white transition"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && <div className="text-center py-4 text-white/20 text-sm">Chargement...</div>}

      {rules.map(rule => {
        const comp = complianceMap[rule.training_id] || {}
        const conforme = comp.conforme || 0
        const total = (comp.conforme || 0) + (comp.non_realise || 0) + (comp.a_renouveler || 0)
        const pct = total > 0 ? Math.round((conforme / total) * 100) : null

        return (
          <div key={rule.id} className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{rule.training_catalog?.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-white/40">
                    {MANDATORY_TARGET_LABELS[rule.target_type]}
                    {rule.target_role && ` — ${rule.target_role}`}
                  </span>
                  {rule.renewal_months && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full text-amber-400"
                      style={{ background: 'rgba(245,158,11,0.12)' }}>
                      ↺ {rule.renewal_months} mois
                    </span>
                  )}
                  {pct !== null && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: pct >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: pct >= 80 ? '#10B981' : '#EF4444' }}>
                      {pct}% conformes
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteRule(rule.id)}
                className="p-1.5 rounded-lg text-white/25 hover:text-red-400 transition"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Trash2 size={13}/>
              </button>
            </div>
          </div>
        )
      })}

      {!isLoading && !rules.length && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
          <ShieldCheck size={24} className="mx-auto mb-2 text-white/15"/>
          <p className="text-sm text-white/30">Aucune formation obligatoire configurée</p>
        </div>
      )}
    </div>
  )
}

export default function FormationObligatoire() {
  const { canAdmin } = useAuth()
  const [view, setView] = useState(canAdmin ? 'admin' : 'me')

  return (
    <div className="space-y-5">
      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { id: 'me', label: 'Ma conformité', icon: ShieldCheck },
          ...(canAdmin ? [{ id: 'admin', label: 'Configuration', icon: AlertTriangle }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
            style={view === t.id ? { background: 'rgba(99,102,241,0.3)' } : {}}>
            <t.icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      {view === 'me'    && <MyMandatoryStatusPanel/>}
      {view === 'admin' && <AdminRulesPanel/>}
    </div>
  )
}
