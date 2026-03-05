// ============================================================
// APEX RH — src/pages/admin/Integrations.jsx
// Session 35 — Module Intégrations Tierces
// Configuration Slack, Teams, Zapier + export Google Calendar
// Accès réservé aux administrateurs
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import {
  INTEGRATION_TYPES,
  TRIGGER_LABELS,
  ALL_TRIGGERS,
  useWebhooks,
  useIntegrationLogs,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  downloadReviewCyclesIcal,
} from '../../hooks/useIntegrations'

// ─── HELPERS ─────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function maskUrl(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}/...`
  } catch {
    return url.slice(0, 30) + '...'
  }
}

// ─── COMPOSANT SKELETON ──────────────────────────────────────
function Sk({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
}

// ─── BADGE STATUT ────────────────────────────────────────────
function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      ok === true  ? 'bg-emerald-500/15 text-emerald-400'
    : ok === false ? 'bg-red-500/15 text-red-400'
    : 'bg-white/8 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok === true ? 'bg-emerald-400' : ok === false ? 'bg-red-400' : 'bg-gray-500'}`} />
      {label}
    </span>
  )
}

// ─── FORMULAIRE CRÉATION / ÉDITION WEBHOOK ───────────────────
function WebhookForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? {
    type: 'slack',
    label: '',
    webhook_url: '',
    triggers: ALL_TRIGGERS,
  })

  const intType = INTEGRATION_TYPES[form.type]

  const toggleTrigger = (key) => {
    setForm(p => ({
      ...p,
      triggers: p.triggers.includes(key)
        ? p.triggers.filter(t => t !== key)
        : [...p.triggers, key],
    }))
  }

  return (
    <div className="bg-white/3 border border-white/10 rounded-xl p-5 space-y-5">
      <h4 className="text-sm font-semibold text-white">
        {initial ? 'Modifier l\'intégration' : 'Nouvelle intégration'}
      </h4>

      {/* Type */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Type d'intégration</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(INTEGRATION_TYPES).map(([key, info]) => (
            <button
              key={key}
              type="button"
              onClick={() => setForm(p => ({ ...p, type: key, label: info.label }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                form.type === key
                  ? 'text-white border-transparent'
                  : 'bg-white/3 border-white/10 text-gray-400 hover:text-white'
              }`}
              style={form.type === key ? { backgroundColor: `${info.color}30`, borderColor: `${info.color}60` } : {}}
            >
              <span>{info.icon}</span>
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Nom affiché</label>
        <input
          type="text"
          value={form.label}
          onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
          placeholder={`ex. ${intType.label} #rh-alertes`}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* URL */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">
          URL du webhook entrant
          {form.type === 'slack'  && <span className="ml-2 text-gray-600">— Slack → Incoming Webhooks</span>}
          {form.type === 'teams'  && <span className="ml-2 text-gray-600">— Teams → Connecteurs → Webhook entrant</span>}
          {form.type === 'zapier' && <span className="ml-2 text-gray-600">— Zapier → Webhooks by Zapier → Catch Hook</span>}
        </label>
        <input
          type="url"
          value={form.webhook_url}
          onChange={e => setForm(p => ({ ...p, webhook_url: e.target.value }))}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 font-mono text-xs"
        />
      </div>

      {/* Déclencheurs */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Événements déclencheurs</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TRIGGER_LABELS).map(([key, label]) => {
            const active = form.triggers.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleTrigger(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-white/3 border-white/8 text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={!form.webhook_url || loading}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white bg-white/4 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── CARTE WEBHOOK ───────────────────────────────────────────
function WebhookCard({ webhook, onEdit, onDelete, onTest }) {
  const [showLogs, setShowLogs] = useState(false)
  const [testState, setTestState] = useState(null) // null | 'loading' | 'ok' | 'error'
  const { data: logs = [], isLoading: logsLoading } = useIntegrationLogs(webhook.id)
  const info = INTEGRATION_TYPES[webhook.type]

  const handleTest = async () => {
    setTestState('loading')
    try {
      await onTest(webhook)
      setTestState('ok')
    } catch {
      setTestState('error')
    }
    setTimeout(() => setTestState(null), 3000)
  }

  return (
    <motion.div
      layout
      className="bg-white/3 border border-white/8 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {/* Icône type */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${info.color}20` }}
        >
          {info.icon}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{webhook.label}</span>
            <span className="text-xs text-gray-600">{info.label}</span>
            {webhook.is_active
              ? <StatusBadge ok={true}  label="Actif" />
              : <StatusBadge ok={false} label="Désactivé" />
            }
            {webhook.last_tested_at && (
              <StatusBadge
                ok={webhook.last_test_ok}
                label={`Testé ${timeAgo(webhook.last_tested_at)}`}
              />
            )}
          </div>
          <p className="text-xs text-gray-600 font-mono mt-0.5 truncate">{maskUrl(webhook.webhook_url)}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(webhook.triggers || []).map(t => (
              <span key={t} className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">
                {TRIGGER_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Test */}
          <button
            onClick={handleTest}
            disabled={testState === 'loading'}
            title="Envoyer un message test"
            className={`p-2 rounded-lg text-xs font-medium border transition-all ${
              testState === 'ok'      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : testState === 'error'  ? 'bg-red-500/20 border-red-500/40 text-red-400'
            : testState === 'loading' ? 'bg-white/5 border-white/10 text-gray-500'
            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {testState === 'loading' ? '…'
            : testState === 'ok'     ? '✓'
            : testState === 'error'  ? '✗'
            : '▶ Test'}
          </button>

          {/* Active toggle */}
          <button
            onClick={() => onEdit({ ...webhook, is_active: !webhook.is_active })}
            title={webhook.is_active ? 'Désactiver' : 'Activer'}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white bg-white/5 transition-colors"
          >
            {webhook.is_active ? '⏸' : '▶'}
          </button>

          {/* Logs */}
          <button
            onClick={() => setShowLogs(v => !v)}
            title="Voir les logs"
            className={`p-2 rounded-lg border transition-colors ${
              showLogs
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'border-white/10 text-gray-400 hover:text-white bg-white/5'
            }`}
          >
            📋
          </button>

          {/* Éditer */}
          <button
            onClick={() => onEdit(webhook)}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white bg-white/5 transition-colors"
          >
            ✏️
          </button>

          {/* Supprimer */}
          <button
            onClick={() => onDelete(webhook.id)}
            className="p-2 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 bg-white/3 transition-colors"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Logs panel */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/6"
          >
            <div className="p-4 space-y-1.5">
              <p className="text-xs text-gray-500 mb-2">Derniers envois</p>
              {logsLoading ? (
                <Sk className="h-8 w-full" />
              ) : logs.length === 0 ? (
                <p className="text-xs text-gray-600">Aucun envoi enregistré.</p>
              ) : (
                logs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-gray-400 w-28 flex-shrink-0">{timeAgo(log.sent_at)}</span>
                    <span className="text-gray-500">{TRIGGER_LABELS[log.event_type] ?? log.event_type}</span>
                    {log.http_status && <span className="text-gray-700 ml-auto">HTTP {log.http_status}</span>}
                    {log.error_message && <span className="text-red-500 truncate max-w-[120px]">{log.error_message}</span>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── SECTION GOOGLE CALENDAR ─────────────────────────────────
function GoogleCalendarSection() {
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadReviewCyclesIcal()
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      console.error(e)
    }
    setDownloading(false)
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-blue-500/10">
          📅
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">Google Calendar / Agenda</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Exportez les échéances des Review Cycles au format iCal (.ics).<br/>
            Compatible Google Calendar, Microsoft Outlook, Apple Agenda — aucune authentification requise.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export .ics */}
            <div className="bg-white/3 border border-white/8 rounded-lg p-3">
              <p className="text-xs font-medium text-white mb-1">Export .ics (une fois)</p>
              <p className="text-xs text-gray-600 mb-3">Télécharge les échéances actuelles. À ré-exporter après chaque nouveau cycle.</p>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                  done
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                }`}
              >
                {downloading ? 'Export en cours…' : done ? '✓ Téléchargé' : '⬇ Télécharger apex-rh.ics'}
              </button>
            </div>

            {/* Instructions import */}
            <div className="bg-white/3 border border-white/8 rounded-lg p-3">
              <p className="text-xs font-medium text-white mb-2">Comment importer dans Google Calendar</p>
              <ol className="text-xs text-gray-500 space-y-1 list-decimal ml-3">
                <li>Téléchargez le fichier .ics</li>
                <li>Ouvrez Google Calendar</li>
                <li>Paramètres → Importer et exporter</li>
                <li>Sélectionnez le fichier .ics → Importer</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function Integrations() {
  const { profile } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [activeTab, setActiveTab] = useState('webhooks')

  const { data: webhooks = [], isLoading } = useWebhooks()
  const createWebhook = useCreateWebhook()
  const updateWebhook = useUpdateWebhook()
  const deleteWebhook = useDeleteWebhook()
  const testWebhook   = useTestWebhook()

  // Accès réservé aux admins
  if (profile?.role !== 'administrateur') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600">
        <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm">Accès réservé aux administrateurs.</p>
      </div>
    )
  }

  const handleSave = async (form) => {
    if (editingWebhook?.id) {
      await updateWebhook.mutateAsync({ id: editingWebhook.id, ...form })
    } else {
      await createWebhook.mutateAsync(form)
    }
    setShowForm(false)
    setEditingWebhook(null)
  }

  const handleEdit = (webhook) => {
    setEditingWebhook(webhook)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette intégration ? Les logs associés seront aussi supprimés.')) return
    await deleteWebhook.mutateAsync(id)
  }

  const handleTest = async (webhook) => {
    await testWebhook.mutateAsync({
      id:          webhook.id,
      type:        webhook.type,
      webhook_url: webhook.webhook_url,
    })
  }

  const TABS = [
    { id: 'webhooks',  label: 'Webhooks', count: webhooks.length },
    { id: 'calendar',  label: 'Google Calendar' },
    { id: 'guide',     label: 'Guide d\'installation' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Intégrations Tierces</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Connectez APEX RH à Slack, Teams, Zapier et Google Calendar.
          </p>
        </div>
        {activeTab === 'webhooks' && !showForm && (
          <button
            onClick={() => { setEditingWebhook(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span>+</span> Ajouter
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/3 border border-white/8 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="text-xs bg-white/10 rounded px-1.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >

          {/* ── ONGLET WEBHOOKS ─────────────────────────────── */}
          {activeTab === 'webhooks' && (
            <>
              {/* Formulaire création/édition */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <WebhookForm
                      initial={editingWebhook}
                      loading={createWebhook.isPending || updateWebhook.isPending}
                      onSave={handleSave}
                      onCancel={() => { setShowForm(false); setEditingWebhook(null) }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Liste webhooks */}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => <Sk key={i} className="h-20 w-full" />)}
                </div>
              ) : webhooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-600">
                  <div className="text-4xl mb-3 opacity-30">🔌</div>
                  <p className="text-sm font-medium">Aucune intégration configurée</p>
                  <p className="text-xs mt-1">Ajoutez un webhook Slack, Teams ou Zapier pour commencer.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {webhooks.map(w => (
                      <WebhookCard
                        key={w.id}
                        webhook={w}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTest={handleTest}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {/* ── ONGLET GOOGLE CALENDAR ──────────────────────── */}
          {activeTab === 'calendar' && <GoogleCalendarSection />}

          {/* ── ONGLET GUIDE ────────────────────────────────── */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {[
                {
                  type: 'slack',
                  title: '💬 Slack — Incoming Webhook',
                  steps: [
                    'Aller sur https://api.slack.com/apps → "Create New App"',
                    'Choisir "From scratch" → nommer l\'app "APEX RH"',
                    'Dans le menu gauche → "Incoming Webhooks" → activer',
                    'Cliquer "Add New Webhook to Workspace"',
                    'Sélectionner le channel de destination → Autoriser',
                    'Copier l\'URL générée (commence par https://hooks.slack.com/services/...)',
                    'Coller l\'URL dans APEX RH → "Ajouter" → "Test"',
                  ],
                },
                {
                  type: 'teams',
                  title: '🟦 Microsoft Teams — Webhook entrant',
                  steps: [
                    'Ouvrir le channel Teams de destination',
                    'Cliquer les "..." → "Connecteurs"',
                    'Rechercher "Webhook entrant" → Configurer',
                    'Nommer le connecteur "APEX RH" → Créer',
                    'Copier l\'URL générée',
                    'Coller l\'URL dans APEX RH → "Ajouter" → "Test"',
                  ],
                },
                {
                  type: 'zapier',
                  title: '⚡ Zapier — Webhooks by Zapier',
                  steps: [
                    'Créer un nouveau Zap sur zapier.com',
                    'Trigger : choisir "Webhooks by Zapier"',
                    'Event : "Catch Hook" → Continue',
                    'Copier l\'URL fournie par Zapier (Custom Webhook URL)',
                    'Coller l\'URL dans APEX RH → "Ajouter" → "Test"',
                    'Dans Zapier, cliquer "Test Trigger" pour vérifier la réception',
                    'Configurer votre Action (Gmail, Notion, Sheets, etc.)',
                    'Activer le Zap',
                  ],
                },
              ].map(guide => (
                <div key={guide.type} className="bg-white/3 border border-white/8 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white mb-3">{guide.title}</h4>
                  <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </span>
                        <span className="text-gray-400">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
