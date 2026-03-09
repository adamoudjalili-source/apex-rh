// ============================================================
// APEX RH — NotificationRulesAdmin.jsx
// Session 86 — Administration des règles de notifications
// ============================================================
import { useState } from 'react'
import {
  Bell, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, X, Save, AlertTriangle, Clock,
} from 'lucide-react'
import {
  useNotificationRules,
  useUpsertRule,
  useDeleteRule,
} from '../hooks/useNotifications'
import { usePermission } from '../hooks/usePermission'
import { ROLES } from '../utils/constants'

// ─── Options prédéfinies ──────────────────────────────────────
const TRIGGER_EVENTS = [
  { value: 'leave_refused',         label: 'Congé refusé' },
  { value: 'leave_approved',        label: 'Congé approuvé' },
  { value: 'departure_registered',  label: 'Départ enregistré' },
  { value: 'onboarding_overdue',    label: 'Onboarding en retard' },
  { value: 'offboarding_alert',     label: 'Alerte offboarding' },
  { value: 'review_due',            label: 'Entretien à planifier' },
  { value: 'feedback360_due',       label: 'Feedback 360 en attente' },
  { value: 'settlement_applied',    label: 'Solde de tout compte appliqué' },
]

const ROLE_OPTIONS = [
  { value: ROLES.COLLABORATEUR,  label: 'Collaborateur' },
  { value: ROLES.CHEF_SERVICE,   label: 'Chef de service' },
  { value: ROLES.CHEF_DIVISION,  label: 'Chef de division' },
  { value: ROLES.ADMINISTRATEUR, label: 'Administrateur RH' },
  { value: ROLES.DIRECTEUR,      label: 'Directeur' },
]

const EMPTY_RULE = {
  id: undefined,
  name: '',
  trigger_event: 'leave_refused',
  target_roles: [],
  message_template: 'Bonjour, {{employee_name}} : {{details}} (le {{event_date}})',
  is_active: true,
  escalate_after_days: '',
  escalate_to_role: '',
}

// ─── Formulaire règle ─────────────────────────────────────────
function RuleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)

  function toggleRole(role) {
    setForm(f => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter(r => r !== role)
        : [...f.target_roles, role],
    }))
  }

  const isValid = form.name.trim() && form.target_roles.length > 0 && form.message_template.trim()

  return (
    <div className="rounded-xl border border-indigo-500/30 p-4 space-y-4"
      style={{ background: 'rgba(79,70,229,0.06)' }}>
      <p className="text-sm font-semibold text-white">
        {form.id ? 'Modifier la règle' : 'Nouvelle règle'}
      </p>

      {/* Nom */}
      <div>
        <label className="text-xs text-white/50 mb-1 block">Nom de la règle</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Ex: Congé refusé → Notifier employé"
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60"
        />
      </div>

      {/* Événement déclencheur */}
      <div>
        <label className="text-xs text-white/50 mb-1 block">Événement déclencheur</label>
        <select
          value={form.trigger_event}
          onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value }))}
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
          style={{ background: '#0f0f2e' }}
        >
          {TRIGGER_EVENTS.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </div>

      {/* Rôles cibles */}
      <div>
        <label className="text-xs text-white/50 mb-2 block">Notifier les rôles</label>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(r => {
            const selected = form.target_roles.includes(r.value)
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRole(r.value)}
                className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                  selected
                    ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-300'
                    : 'bg-white/[0.04] border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Template message */}
      <div>
        <label className="text-xs text-white/50 mb-1 block">
          Template message
          <span className="ml-2 text-white/25">
            Variables : {'{{employee_name}}'}, {'{{event_date}}'}, {'{{details}}'}
          </span>
        </label>
        <textarea
          value={form.message_template}
          onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
          rows={2}
          className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 resize-none"
        />
      </div>

      {/* Escalade */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <label className="text-xs text-white/50 mb-1 block">Escalader après (jours)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={form.escalate_after_days}
            onChange={e => setForm(f => ({ ...f, escalate_after_days: e.target.value }))}
            placeholder="Laisser vide = pas d'escalade"
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-white/50 mb-1 block">Escalader vers le rôle</label>
          <select
            value={form.escalate_to_role}
            onChange={e => setForm(f => ({ ...f, escalate_to_role: e.target.value }))}
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
            style={{ background: '#0f0f2e' }}
          >
            <option value="">Aucun</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={!isValid || saving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: 'white' }}
        >
          <Save size={14} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <X size={14} />
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Composant principal ────────────────────────────────────────
export default function NotificationRulesAdmin() {
  const { can } = usePermission()
  const [editing, setEditing]   = useState(null)   // null | 'new' | rule_id
  const [expanded, setExpanded] = useState(null)

  const { data: rules = [], isLoading } = useNotificationRules()
  const { mutate: upsert, isPending: saving } = useUpsertRule()
  const { mutate: del }                        = useDeleteRule()

  if (!can('admin', 'notifications', 'admin')) return null

  function handleSave(form) {
    const payload = {
      ...form,
      escalate_after_days: form.escalate_after_days ? parseInt(form.escalate_after_days) : null,
      escalate_to_role: form.escalate_to_role || null,
    }
    upsert(payload, { onSuccess: () => setEditing(null) })
  }

  function handleToggle(rule) {
    upsert({ ...rule, is_active: !rule.is_active })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Règles de notifications</h3>
          <span className="text-xs text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">
            {rules.length} règle(s)
          </span>
        </div>
        {editing !== 'new' && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(79,70,229,0.18)', color: '#818CF8' }}
          >
            <Plus size={14} />
            Nouvelle règle
          </button>
        )}
      </div>

      {/* Formulaire nouvelle règle */}
      {editing === 'new' && (
        <RuleForm
          initial={EMPTY_RULE}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : rules.length === 0 && editing !== 'new' ? (
        <div className="rounded-xl border border-white/[0.06] p-8 text-center">
          <Bell size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Aucune règle configurée</p>
          <p className="text-xs text-white/20 mt-1">
            Créez des règles pour automatiser vos notifications RH
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const eventLabel = TRIGGER_EVENTS.find(e => e.value === rule.trigger_event)?.label || rule.trigger_event
            const isEditing  = editing === rule.id
            const isExpanded = expanded === rule.id

            return (
              <div key={rule.id}
                className="rounded-xl border border-white/[0.06] overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}>

                {isEditing ? (
                  <div className="p-3">
                    <RuleForm
                      initial={{
                        ...rule,
                        escalate_after_days: rule.escalate_after_days || '',
                        escalate_to_role: rule.escalate_to_role || '',
                      }}
                      onSave={handleSave}
                      onCancel={() => setEditing(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <>
                    {/* Header règle */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Toggle actif */}
                      <button
                        onClick={() => handleToggle(rule)}
                        className="flex-shrink-0 text-white/40 hover:text-white/80 transition-colors"
                        title={rule.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {rule.is_active
                          ? <ToggleRight size={20} className="text-green-400" />
                          : <ToggleLeft  size={20} />
                        }
                      </button>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${rule.is_active ? 'text-white' : 'text-white/40'}`}>
                            {rule.name}
                          </p>
                          {rule.escalate_after_days && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                              <Clock size={9} /> {rule.escalate_after_days}j
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/35 truncate">{eventLabel}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : rule.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                        >
                          <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          onClick={() => setEditing(rule.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette règle ?')) del(rule.id)
                          }}
                          className="w-7 h-7 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Détails expandés */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0 border-t border-white/[0.04] space-y-2">
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rule.target_roles.map(r => {
                            const lbl = ROLE_OPTIONS.find(o => o.value === r)?.label || r
                            return (
                              <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">
                                {lbl}
                              </span>
                            )
                          })}
                        </div>
                        <p className="text-xs text-white/35 italic leading-relaxed bg-white/[0.03] rounded px-2.5 py-2">
                          {rule.message_template}
                        </p>
                        {rule.escalate_after_days && rule.escalate_to_role && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
                            <AlertTriangle size={11} />
                            Escalade après {rule.escalate_after_days} jour(s) → {
                              ROLE_OPTIONS.find(o => o.value === rule.escalate_to_role)?.label || rule.escalate_to_role
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
