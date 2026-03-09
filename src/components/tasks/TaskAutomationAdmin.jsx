// ============================================================
// APEX RH — TaskAutomationAdmin.jsx  ·  S130
// Administration des règles d'automation tâches
// Accès depuis Settings → Tâches (admin/directeur)
// ============================================================
import { useState } from 'react'
import {
  useTaskAutomationRules, useTaskAutomationLogs,
  useCreateAutomationRule, useUpdateAutomationRule,
  useDeleteAutomationRule, useToggleAutomationRule,
  AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS,
} from '../../hooks/useTaskAutomations'

export default function TaskAutomationAdmin() {
  const { data: rules = [], isLoading } = useTaskAutomationRules()
  const { data: logs  = [] }            = useTaskAutomationLogs({ limit: 20 })
  const createRule  = useCreateAutomationRule()
  const deleteRule  = useDeleteAutomationRule()
  const toggleRule  = useToggleAutomationRule()

  const [editing,   setEditing]   = useState(null)  // null | 'new' | rule
  const [activeTab, setActiveTab] = useState('rules')

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Entête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Automations tâches</h2>
          <p className="text-xs text-gray-500 mt-0.5">Règles déclenchées automatiquement par pg_cron</p>
        </div>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nouvelle règle
        </button>
      </div>

      {/* Tabs Règles / Logs */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[['rules','Règles'],['logs','Historique']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
            {id === 'rules' && <span className="ml-1.5 text-[10px] opacity-70">({rules.length})</span>}
          </button>
        ))}
      </div>

      {/* Onglet Règles */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-white/5 rounded-xl bg-white/2">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-sm font-medium text-gray-400">Aucune règle d'automation</p>
              <p className="text-xs text-gray-600 mt-1">Les règles permettent d'automatiser les notifications et actions sur les tâches</p>
              <button onClick={() => setEditing('new')}
                className="mt-4 px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors">
                Créer la première règle
              </button>
            </div>
          ) : (
            rules.map(rule => {
              const trigger = AUTOMATION_TRIGGERS.find(t => t.id === rule.trigger_event)
              const action  = AUTOMATION_ACTIONS[rule.action_type]
              return (
                <div key={rule.id}
                  className={`flex items-center gap-4 px-4 py-3 border rounded-xl transition-colors ${rule.is_active ? 'bg-white/3 border-white/10' : 'bg-white/1 border-white/5 opacity-60'}`}>
                  <div className="text-2xl shrink-0">{trigger?.icon || '⚡'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100">{rule.name}</span>
                      {!rule.is_active && <span className="text-[10px] px-2 py-0.5 bg-gray-500/20 text-gray-500 rounded-full">Inactif</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{trigger?.label}</span>
                      <span className="text-gray-700">→</span>
                      <span className="text-xs text-indigo-400">{action?.icon} {action?.label}</span>
                      {rule.trigger_config?.timeout_hours && (
                        <span className="text-[10px] text-gray-600">({rule.trigger_config.timeout_hours}h)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle actif */}
                    <button onClick={() => toggleRule.mutate({ id: rule.id, is_active: !rule.is_active })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${rule.is_active ? 'bg-indigo-600' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => setEditing(rule)}
                      className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => deleteRule.mutate(rule.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Onglet Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Aucune exécution enregistrée</p>
          ) : (
            logs.map(log => {
              const trigger = AUTOMATION_TRIGGERS.find(t => t.id === log.rule?.trigger_event)
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 bg-white/2 border border-white/6 rounded-xl">
                  <span className="text-base shrink-0">{trigger?.icon || '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-200 truncate">{log.task?.title || 'Tâche supprimée'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                        log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.status === 'error'   ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>{log.status}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {log.rule?.name} · {new Date(log.executed_at).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Formulaire création/édition */}
      {editing && (
        <AutomationRuleForm
          rule={editing === 'new' ? null : editing}
          onCreate={async (data) => { await createRule.mutateAsync(data); setEditing(null) }}
          onUpdate={async (data) => { /* useUpdateAutomationRule géré inline */ setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Formulaire ────────────────────────────────────────────
function AutomationRuleForm({ rule, onCreate, onUpdate, onClose }) {
  const updateRule = useUpdateAutomationRule()
  const isEdit = !!rule
  const [form, setForm] = useState({
    name:           rule?.name           || '',
    trigger_event:  rule?.trigger_event  || 'task_completed',
    action_type:    rule?.action_type    || 'notify_manager',
    timeout_hours:  rule?.trigger_config?.timeout_hours || 48,
    is_active:      rule?.is_active      ?? true,
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const selectedTrigger = AUTOMATION_TRIGGERS.find(t => t.id === form.trigger_event)
  const availableActions = selectedTrigger?.actions || []

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setError(''); setLoading(true)
    try {
      const payload = {
        name:           form.name,
        trigger_event:  form.trigger_event,
        trigger_config: form.trigger_event === 'review_timeout'
          ? { timeout_hours: parseInt(form.timeout_hours) || 48 }
          : {},
        action_type:    form.action_type,
        action_config:  {},
        is_active:      form.is_active,
      }
      if (isEdit) await updateRule.mutateAsync({ id: rule.id, updates: payload })
      else        await onCreate(payload)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0F0F23] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-base font-semibold text-white">{isEdit ? 'Modifier' : 'Nouvelle'} règle</h2>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nom *</label>
              <input autoFocus type="text" value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="Ex : Alerte retard quotidienne"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Déclencheur</label>
              <div className="space-y-2">
                {AUTOMATION_TRIGGERS.map(t => (
                  <label key={t.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${form.trigger_event === t.id ? 'border-indigo-500/50 bg-indigo-500/8' : 'border-white/8 hover:border-white/15'}`}>
                    <input type="radio" name="trigger" value={t.id} checked={form.trigger_event === t.id}
                      onChange={() => { setF('trigger_event', t.id); setF('action_type', t.actions[0]) }}
                      className="mt-0.5 accent-indigo-500" />
                    <div>
                      <div className="text-sm text-gray-200 flex items-center gap-1.5">{t.icon} {t.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{t.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {/* Config timeout si review_timeout */}
            {form.trigger_event === 'review_timeout' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Délai max sans validation (heures)</label>
                <input type="number" min={1} value={form.timeout_hours} onChange={e => setF('timeout_hours', e.target.value)}
                  className="w-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Action</label>
              <div className="flex flex-wrap gap-2">
                {availableActions.map(a => (
                  <button key={a} type="button" onClick={() => setF('action_type', a)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${form.action_type === a ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                    {AUTOMATION_ACTIONS[a]?.icon} {AUTOMATION_ACTIONS[a]?.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setF('is_active', !form.is_active)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.is_active ? 'bg-indigo-600' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-400">Règle active</span>
            </label>
            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          </form>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
            <button onClick={handleSubmit} disabled={loading}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la règle'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
