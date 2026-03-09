// ============================================================
// APEX RH — PulseAlertCenter.jsx
// Session 76 — Centre d'alertes proactives PULSE
// Session 101 — Phase C RBAC : migration usePermission V2
// Liste + filtres + actions (acknowledge/resolve/dismiss)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePermission } from '../../hooks/usePermission'
import { CRITICALITY } from '../../utils/constants'
import ConfirmModal from '../ui/ConfirmModal'
import {
  useTeamPulseAlerts,
  usePulseAlerts,
  useAcknowledgeAlert,
  usePulseAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from '../../hooks/usePulse'

// ─── HELPERS ─────────────────────────────────────────────────

const ALERT_TYPE_LABELS = {
  decrochage:   { label: 'Décrochage',    color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    icon: '📉' },
  absence:      { label: 'Absence logs',  color: '#F97316', bg: 'rgba(249,115,22,0.1)',   icon: '📭' },
  stagnation:   { label: 'Stagnation',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   icon: '➡️' },
  pic_negatif:  { label: 'Chute soudaine',color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',   icon: '⚡' },
}

const STATUS_LABELS = {
  active:       { label: 'Active',      color: '#EF4444' },
  acknowledged: { label: 'Vue',         color: '#F59E0B' },
  resolved:     { label: 'Résolue',     color: '#10B981' },
  dismissed:    { label: 'Ignorée',     color: '#6B7280' },
}

const SEVERITY_COLORS = {
  info:     '#6B7280',
  warning:  '#F59E0B',
  critical: '#EF4444',
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  return 'récemment'
}

// ─── MODAL ACKNOWLEDGE ───────────────────────────────────────

function AcknowledgeModal({ alert, onClose }) {
  const [note, setNote] = useState('')
  const [confirmRuleId, setConfirmRuleId] = useState(null)
  const [action, setAction] = useState('acknowledged')
  const { mutate, isPending } = useAcknowledgeAlert()

  const typeInfo = ALERT_TYPE_LABELS[alert.alert_type] || ALERT_TYPE_LABELS.decrochage

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1f2e] rounded-xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{typeInfo.icon}</span>
          <div>
            <h3 className="font-semibold text-white">Traiter l'alerte</h3>
            <p className="text-sm text-gray-400">{alert.user?.full_name || 'Collaborateur'}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg mb-4" style={{ background: typeInfo.bg, border: `1px solid ${typeInfo.color}30` }}>
          <p className="text-sm text-white/80">
            {typeInfo.label} · Déclenchée {formatRelativeTime(alert.triggered_at)}
          </p>
          {alert.context_json?.avg_score != null && (
            <p className="text-sm text-white/60 mt-1">
              Score moyen : <span className="font-medium text-white">{alert.context_json.avg_score}</span>
              {alert.context_json.days && ` sur ${alert.context_json.days} jours`}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">Action</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'acknowledged', label: 'Vue',     color: '#F59E0B' },
              { value: 'resolved',     label: 'Résolue', color: '#10B981' },
              { value: 'dismissed',    label: 'Ignorer', color: '#6B7280' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setAction(opt.value)}
                className="py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: action === opt.value ? `${opt.color}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${action === opt.value ? opt.color : 'rgba(255,255,255,0.1)'}`,
                  color: action === opt.value ? opt.color : '#9CA3AF',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-400 mb-2 block">Note (optionnel)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Action prise, contexte..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => mutate({ id: alert.id, status: action, resolution_note: note || null }, { onSuccess: onClose })}
            disabled={isPending}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {isPending ? 'En cours...' : 'Confirmer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── MODAL RÈGLE ─────────────────────────────────────────────

function RuleModal({ rule, onClose }) {
  const isEdit = !!rule?.id
  const createRule = useCreateAlertRule()
  const updateRule = useUpdateAlertRule()

  const [form, setForm] = useState({
    name: rule?.name || '',
    alert_type: rule?.alert_type || 'decrochage',
    threshold_score: rule?.threshold_score ?? 40,
    consecutive_days: rule?.consecutive_days ?? 3,
    drop_pct: rule?.drop_pct ?? 20,
    applies_to_dimension: rule?.applies_to_dimension || 'global',
    is_active: rule?.is_active ?? true,
    description: rule?.description || '',
  })

  const isPending = createRule.isPending || updateRule.isPending

  const handleSubmit = () => {
    if (!form.name.trim()) return
    if (isEdit) {
      updateRule.mutate({ id: rule.id, ...form }, { onSuccess: onClose })
    } else {
      createRule.mutate(form, { onSuccess: onClose })
    }
  }

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({ ...p, [field]: e.target.value })) })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1f2e] rounded-xl p-6 w-full max-w-lg border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-semibold text-white mb-5">{isEdit ? 'Modifier la règle' : 'Nouvelle règle d\'alerte'}</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nom *</label>
            <input
              {...f('name')}
              placeholder="ex: Décrochage score global"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type d'alerte</label>
              <select {...f('alert_type')} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400">
                <option value="decrochage">Décrochage</option>
                <option value="absence">Absence logs</option>
                <option value="stagnation">Stagnation</option>
                <option value="pic_negatif">Pic négatif</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Dimension</label>
              <select {...f('applies_to_dimension')} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400">
                <option value="global">Global</option>
                <option value="delivery">Delivery</option>
                <option value="quality">Qualité</option>
                <option value="regularity">Régularité</option>
                <option value="bonus_okr">Bonus OKR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Seuil score</label>
              <input type="number" min="0" max="100" {...f('threshold_score')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Jours consécutifs</label>
              <input type="number" min="1" max="30" {...f('consecutive_days')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {form.alert_type === 'pic_negatif' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Chute % déclenchante</label>
              <input type="number" min="5" max="100" {...f('drop_pct')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea {...f('description')} rows={2} placeholder="Optionnel..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-400"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="rounded border-white/20 bg-white/5 text-indigo-500"
            />
            <span className="text-sm text-gray-300">Règle active</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={isPending || !form.name.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

export default function PulseAlertCenter() {
  const { can } = usePermission()
  const canSeeAlerts  = can('pulse', 'alerts', 'read')
  const canAdminRules = can('pulse', 'alerts', 'admin')
  const { data: teamAlerts = [], isLoading } = useTeamPulseAlerts()
  const { data: myAlerts = [] } = usePulseAlerts()
  const { data: rules = [] } = usePulseAlertRules()
  const deleteRule = useDeleteAlertRule()

  const [filter, setFilter] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('alerts') // 'alerts' | 'rules'
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [editRule, setEditRule] = useState(null) // null = closed, {} = new, {...} = edit

  const alerts = canSeeAlerts ? teamAlerts : myAlerts

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (typeFilter !== 'all' && a.alert_type !== typeFilter) return false
    return true
  })

  const countByStatus = (s) => alerts.filter(a => a.status === s).length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🔔</span> Centre d'alertes PULSE
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {countByStatus('active')} alerte{countByStatus('active') !== 1 ? 's' : ''} active{countByStatus('active') !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('alerts')}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              background: view === 'alerts' ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${view === 'alerts' ? '#4F46E5' : 'rgba(255,255,255,0.1)'}`,
              color: view === 'alerts' ? '#818CF8' : '#9CA3AF',
            }}
          >
            Alertes ({alerts.length})
          </button>
          {canAdminRules && (
            <button
              onClick={() => setView('rules')}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                background: view === 'rules' ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${view === 'rules' ? '#4F46E5' : 'rgba(255,255,255,0.1)'}`,
                color: view === 'rules' ? '#818CF8' : '#9CA3AF',
              }}
            >
              Règles ({rules.length})
            </button>
          )}
        </div>
      </div>

      {/* Vue Alertes */}
      {view === 'alerts' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Actives',   count: countByStatus('active'),       color: '#EF4444' },
              { label: 'Vues',      count: countByStatus('acknowledged'), color: '#F59E0B' },
              { label: 'Résolues',  count: countByStatus('resolved'),     color: '#10B981' },
              { label: 'Ignorées',  count: countByStatus('dismissed'),    color: '#6B7280' },
            ].map(kpi => (
              <div key={kpi.label} className="p-4 rounded-xl" style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}>
                <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.count}</div>
                <div className="text-xs text-gray-400 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
              {['all', 'active', 'acknowledged', 'resolved', 'dismissed'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: filter === s ? 'rgba(79,70,229,0.3)' : 'transparent',
                    color: filter === s ? '#818CF8' : '#9CA3AF',
                  }}
                >
                  {s === 'all' ? 'Toutes' : STATUS_LABELS[s]?.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
              {['all', 'decrochage', 'absence', 'stagnation', 'pic_negatif'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: typeFilter === t ? 'rgba(79,70,229,0.3)' : 'transparent',
                    color: typeFilter === t ? '#818CF8' : '#9CA3AF',
                  }}
                >
                  {t === 'all' ? 'Tous types' : ALERT_TYPE_LABELS[t]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">✅</div>
              <p>Aucune alerte correspondante</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((alert) => {
                  const typeInfo = ALERT_TYPE_LABELS[alert.alert_type] || ALERT_TYPE_LABELS.decrochage
                  const statusInfo = STATUS_LABELS[alert.status] || STATUS_LABELS.active
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 rounded-xl flex items-center gap-4"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-2xl flex-shrink-0">{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {alert.user?.full_name || 'Collaborateur'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: typeInfo.bg, color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}>
                            {statusInfo.label}
                          </span>
                          {alert.severity === CRITICALITY.CRITICAL && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400">
                              Critique
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {alert.rule?.name || typeInfo.label} · {formatRelativeTime(alert.triggered_at)}
                          {alert.context_json?.avg_score != null && ` · Score: ${alert.context_json.avg_score}`}
                          {alert.context_json?.days && ` sur ${alert.context_json.days}j`}
                        </p>
                      </div>
                      {canSeeAlerts && alert.status === 'active' && (
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors flex-shrink-0"
                        >
                          Traiter
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Vue Règles */}
      {view === 'rules' && canAdminRules && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setEditRule({})}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              + Nouvelle règle
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p>Aucune règle configurée</p>
              <button onClick={() => setEditRule({})} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300">
                Créer la première règle →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => {
                const typeInfo = ALERT_TYPE_LABELS[rule.alert_type] || ALERT_TYPE_LABELS.decrochage
                return (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-xl flex items-center gap-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span className="text-xl flex-shrink-0">{typeInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{rule.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: typeInfo.bg, color: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                        {!rule.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Seuil {rule.threshold_score} · {rule.consecutive_days}j consécutifs · {rule.applies_to_dimension}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setEditRule(rule)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmRuleId(rule.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modales */}
      {selectedAlert && (
        <AcknowledgeModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
      <ConfirmModal
        isOpen={!!confirmRuleId}
        onClose={() => setConfirmRuleId(null)}
        onConfirm={() => { deleteRule.mutate(confirmRuleId); setConfirmRuleId(null) }}
        title="Supprimer cette règle ?"
        message="Les alertes associées ne seront plus déclenchées."
        confirmLabel="Supprimer"
        danger
      />
      {editRule !== null && (
        <RuleModal rule={editRule?.id ? editRule : null} onClose={() => setEditRule(null)} />
      )}
    </div>
  )
}
