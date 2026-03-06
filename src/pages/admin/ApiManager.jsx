// ============================================================
// APEX RH — pages/admin/ApiManager.jsx
// Session 53 — Gestionnaire API Ouverte & Connecteurs SIRH
// Onglets : Clés API | Webhooks | Import SCIM | Mapping | Docs
// ============================================================
import { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useApiKeys, useApiStats, useApiKeyAudit,
  useCreateApiKey, useRevokeApiKey, useDeleteApiKey,
  AVAILABLE_SCOPES, SCOPE_PRESETS,
} from '../../hooks/useApiKeys'
import {
  useWebhooks, useWebhookDeliveries,
  useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useTestWebhook,
  WEBHOOK_EVENTS,
} from '../../hooks/useWebhooks'
import {
  useFieldMappings, useScimSyncLogs,
  useCreateFieldMapping, useUpdateFieldMapping, useDeleteFieldMapping,
  SOURCE_SYSTEMS, TARGET_TABLES, TRANSFORM_FUNCTIONS,
} from '../../hooks/useFieldMappings'

// ─── Icônes ──────────────────────────────────────────────────
const Icon = ({ name, className = 'w-4 h-4' }) => {
  const icons = {
    key      : 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
    webhook  : 'M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
    import   : 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
    mapping  : 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
    docs     : 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    copy     : 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.375',
    check    : 'M4.5 12.75l6 6 9-13.5',
    trash    : 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
    plus     : 'M12 4.5v15m7.5-7.5h-15',
    refresh  : 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
    alert    : 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    external : 'M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25',
    eye      : 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    eyeOff   : 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88',
    settings : 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[name] ?? ''} />
    </svg>
  )
}

// ─── StatCard ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue  : 'bg-blue-50 text-blue-700 border-blue-100',
    green : 'bg-green-50 text-green-700 border-green-100',
    red   : 'bg-red-50 text-red-700 border-red-100',
    amber : 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      <div className="text-sm font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Badge scope ──────────────────────────────────────────────
function ScopeBadge({ scope }) {
  const colors = {
    'users'       : 'bg-blue-100 text-blue-700',
    'performance' : 'bg-green-100 text-green-700',
    'objectives'  : 'bg-purple-100 text-purple-700',
    'surveys'     : 'bg-amber-100 text-amber-700',
    'scim'        : 'bg-cyan-100 text-cyan-700',
    'webhooks'    : 'bg-pink-100 text-pink-700',
  }
  const prefix = scope.split(':')[0]
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${colors[prefix] ?? 'bg-gray-100 text-gray-600'}`}>
      {scope}
    </span>
  )
}

// ─── StatusDot ───────────────────────────────────────────────
function StatusDot({ active }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
  )
}

// ─── CopyButton ──────────────────────────────────────────────
function CopyButton({ text, label = 'Copier' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
    >
      <Icon name={copied ? 'check' : 'copy'} className="w-3.5 h-3.5" />
      {copied ? 'Copié !' : label}
    </button>
  )
}

// ─── Modal créer une clé API ──────────────────────────────────
function CreateApiKeyModal({ onClose, onCreated }) {
  const [name, setName]           = useState('')
  const [scopes, setScopes]       = useState(SCOPE_PRESETS.readonly)
  const [preset, setPreset]       = useState('readonly')
  const [expiresIn, setExpiresIn] = useState('never')
  const { mutateAsync, isPending } = useCreateApiKey()

  const handlePreset = (p) => {
    setPreset(p)
    setScopes(SCOPE_PRESETS[p] ?? [])
  }

  const toggleScope = (s) => {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleSubmit = async () => {
    if (!name.trim() || !scopes.length) return
    let expiresAt = null
    if (expiresIn === '30d')  expiresAt = new Date(Date.now() + 30*86400000).toISOString()
    if (expiresIn === '90d')  expiresAt = new Date(Date.now() + 90*86400000).toISOString()
    if (expiresIn === '365d') expiresAt = new Date(Date.now() + 365*86400000).toISOString()

    const result = await mutateAsync({ name: name.trim(), scopes, expiresAt })
    onCreated(result)
  }

  const groupedScopes = AVAILABLE_SCOPES.reduce((acc, s) => {
    ;(acc[s.group] = acc[s.group] ?? []).push(s)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Nouvelle clé API</h3>
          <p className="text-sm text-gray-500 mt-1">La clé sera affichée une seule fois après création.</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la clé</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Workday Integration, SAP SuccessFactors..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preset de scopes</label>
            <div className="flex gap-2">
              {[['readonly','Lecture seule'],['scim','SCIM'],['full','Accès complet']].map(([p, l]) => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    preset === p ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Scopes granulaires */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
            <div className="space-y-3">
              {Object.entries(groupedScopes).map(([group, items]) => (
                <div key={group}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{group}</div>
                  <div className="space-y-1">
                    {items.map(s => (
                      <label key={s.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={scopes.includes(s.value)}
                          onChange={() => toggleScope(s.value)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{s.label}</span>
                        <span className="text-xs text-gray-400 font-mono">{s.value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
            <select
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="never">Jamais</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
              <option value="365d">1 an</option>
            </select>
          </div>
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim() || !scopes.length}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <span className="animate-spin">⟳</span> : <Icon name="key" className="w-4 h-4" />}
            Générer la clé
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal révélation clé (one-time) ─────────────────────────
function KeyRevealModal({ keyData, onClose }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://ptpxoczdycajphrshdnk.supabase.co'
  const baseUrl     = `${supabaseUrl}/functions/v1/apex-api`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Icon name="check" className="w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900">Clé créée avec succès</h3>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <div className="flex items-start gap-2">
              <Icon name="alert" className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Copiez cette clé maintenant. Elle ne sera plus jamais affichée.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Clé API</label>
              <CopyButton text={keyData.raw_key} label="Copier la clé" />
            </div>
            <div className="font-mono text-sm bg-gray-900 text-green-400 rounded-lg p-3 break-all select-all">
              {keyData.raw_key}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exemple d'utilisation</label>
            <div className="font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700">
              <div className="text-gray-400 mb-1"># GET utilisateurs</div>
              <div>curl -H "Authorization: Bearer {keyData.raw_key}" \</div>
              <div className="ml-4">{baseUrl}/api/v1/users</div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            J'ai copié la clé, fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Onglet : Clés API ────────────────────────────────────────
function TabApiKeys() {
  const { data: keys = [], isLoading }         = useApiKeys()
  const { data: stats }                        = useApiStats()
  const { mutateAsync: revoke, isPending: revoking } = useRevokeApiKey()
  const { mutateAsync: remove }                = useDeleteApiKey()
  const [showCreate, setShowCreate]            = useState(false)
  const [newKeyData, setNewKeyData]            = useState(null)
  const [auditKeyId, setAuditKeyId]            = useState(null)
  const { data: auditLogs = [] }               = useApiKeyAudit(auditKeyId)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Clés actives"     value={stats?.active_keys} color="blue"  />
        <StatCard label="Appels (24h)"     value={stats?.calls_24h}   color="green" />
        <StatCard label="Erreurs (24h)"    value={stats?.errors_24h}  color={stats?.errors_24h > 0 ? 'red' : 'green'} />
        <StatCard label="Taux d'erreur"    value={stats?.error_rate_24h !== undefined ? `${stats.error_rate_24h}%` : '—'} color={stats?.error_rate_24h > 5 ? 'red' : 'green'} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Clés API ({keys.length})</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Icon name="plus" className="w-4 h-4" /> Nouvelle clé
        </button>
      </div>

      {/* Liste clés */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <Icon name="key" className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">Aucune clé API créée</p>
          <p className="text-gray-400 text-xs mt-1">Créez votre première clé pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className={`border rounded-xl p-4 ${k.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot active={k.is_active} />
                    <span className="font-medium text-gray-900 text-sm">{k.name}</span>
                    {k.expires_at && new Date(k.expires_at) < new Date() && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Expirée</span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-gray-500 mb-2">{k.key_prefix}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(k.scopes ?? []).map(s => <ScopeBadge key={s} scope={s} />)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Créée {new Date(k.created_at).toLocaleDateString('fr-FR')}</span>
                    {k.last_used_at && <span>Dernière utilisation {new Date(k.last_used_at).toLocaleDateString('fr-FR')}</span>}
                    {k.expires_at && <span>Expire {new Date(k.expires_at).toLocaleDateString('fr-FR')}</span>}
                    <span>{k.rate_limit_per_min} req/min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setAuditKeyId(auditKeyId === k.id ? null : k.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                    title="Voir les logs"
                  >
                    <Icon name="eye" className="w-4 h-4" />
                  </button>
                  {k.is_active && (
                    <button
                      onClick={() => revoke(k.id)}
                      disabled={revoking}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                      title="Révoquer"
                    >
                      <Icon name="alert" className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm('Supprimer cette clé ?')) remove(k.id) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Audit log inline */}
              {auditKeyId === k.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Derniers appels API</div>
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun appel enregistré</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {auditLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                          <span className={`font-mono font-bold w-8 ${log.status_code < 400 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.status_code}
                          </span>
                          <span className="text-gray-500 w-6">{log.method}</span>
                          <span className="font-mono text-gray-700 flex-1">{log.endpoint}</span>
                          <span className="text-gray-400">{log.response_rows ?? 0} lignes</span>
                          <span className="text-gray-400">{log.response_time_ms}ms</span>
                          <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateApiKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={(data) => { setShowCreate(false); setNewKeyData(data) }}
        />
      )}
      {newKeyData && <KeyRevealModal keyData={newKeyData} onClose={() => setNewKeyData(null)} />}
    </div>
  )
}

// ─── Onglet : Webhooks ────────────────────────────────────────
function TabWebhooks() {
  const { data: webhooks = [], isLoading }    = useWebhooks()
  const { mutateAsync: create, isPending }    = useCreateWebhook()
  const { mutateAsync: update }               = useUpdateWebhook()
  const { mutateAsync: remove }               = useDeleteWebhook()
  const { mutateAsync: test }                 = useTestWebhook()
  const [showForm, setShowForm]               = useState(false)
  const [selectedId, setSelectedId]           = useState(null)
  const [newSecret, setNewSecret]             = useState(null)
  const { data: deliveries = [] }             = useWebhookDeliveries(selectedId)
  const { user }                              = useAuth()

  // Form state
  const [wName, setWName]       = useState('')
  const [wUrl, setWUrl]         = useState('')
  const [wEvents, setWEvents]   = useState([])

  const handleCreate = async () => {
    if (!wName.trim() || !wUrl.trim() || !wEvents.length) return
    const result = await create({ name: wName, url: wUrl, events: wEvents })
    setNewSecret(result.raw_secret)
    setShowForm(false)
    setWName(''); setWUrl(''); setWEvents([])
  }

  const toggleEvent = (ev) =>
    setWEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])

  const groupedEvents = WEBHOOK_EVENTS.reduce((acc, e) => {
    ;(acc[e.group] = acc[e.group] ?? []).push(e)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Webhooks sortants ({webhooks.length})</h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Icon name="plus" className="w-4 h-4" /> Nouveau webhook
        </button>
      </div>

      {/* Info HMAC */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>Signature HMAC-SHA256</strong> — Chaque requête est signée avec l'en-tête{' '}
        <code className="bg-blue-100 px-1 rounded">X-Apex-Signature-256</code> au format{' '}
        <code className="bg-blue-100 px-1 rounded">t=timestamp,v1=signature</code>.
        Vérifiez la signature côté récepteur pour garantir l'authenticité.
      </div>

      {isLoading ? <div className="text-center py-8 text-gray-400">Chargement...</div> :
       webhooks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <Icon name="webhook" className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">Aucun webhook configuré</p>
        </div>
       ) : (
        <div className="space-y-3">
          {webhooks.map(w => (
            <div key={w.id} className="border rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot active={w.is_active} />
                    <span className="font-medium text-gray-900 text-sm">{w.name}</span>
                    {w.failure_count > 3 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {w.failure_count} échecs
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-gray-500 mb-2 break-all">{w.url}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(w.events ?? []).map(ev => (
                      <span key={ev} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ev}</span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 flex gap-3">
                    <span>Secret : <code className="font-mono">{w.secret_prefix}</code></span>
                    <span>Retry : {w.retry_count}x</span>
                    {w.last_triggered_at && <span>Dernier déclenchement {new Date(w.last_triggered_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => test({ webhookId: w.id, orgId: user?.organization_id })}
                    className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Icon name="eye" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => update({ id: w.id, is_active: !w.is_active })}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    title={w.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <Icon name="settings" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Supprimer ce webhook ?')) remove(w.id) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delivery logs */}
              {selectedId === w.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Historique livraisons</div>
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune livraison enregistrée</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {deliveries.map(d => (
                        <div key={d.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                          <span className={`font-mono font-bold w-8 ${(d.http_status ?? 0) < 400 ? 'text-green-600' : 'text-red-600'}`}>
                            {d.http_status ?? '—'}
                          </span>
                          <span className="text-gray-700 flex-1">{d.event_type}</span>
                          <span className="text-gray-400">Essai {d.attempt}</span>
                          <span className="text-gray-400">{d.response_time_ms}ms</span>
                          <span className={d.delivered_at ? 'text-green-600' : 'text-red-500'}>
                            {d.delivered_at ? '✓ Livré' : '✗ Échec'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
       )
      }

      {/* Formulaire création */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Nouveau webhook</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input type="text" value={wName} onChange={e => setWName(e.target.value)}
                  placeholder="ex: Notifier Slack, Sync Workday..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL endpoint</label>
                <input type="url" value={wUrl} onChange={e => setWUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Événements à écouter</label>
                {Object.entries(groupedEvents).map(([grp, evts]) => (
                  <div key={grp} className="mb-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{grp}</div>
                    {evts.map(ev => (
                      <label key={ev.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-0.5">
                        <input type="checkbox" checked={wEvents.includes(ev.value)} onChange={() => toggleEvent(ev.value)} className="rounded text-blue-600" />
                        <span className="text-sm text-gray-700">{ev.label}</span>
                        <span className="text-xs text-gray-400 font-mono">{ev.value}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annuler</button>
              <button
                onClick={handleCreate}
                disabled={isPending || !wName.trim() || !wUrl.trim() || !wEvents.length}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Créer le webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret reveal */}
      {newSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <Icon name="check" className="w-5 h-5" />
              <h3 className="font-semibold text-gray-900">Webhook créé</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              <strong>Copiez ce secret maintenant</strong> — il ne sera plus affiché.
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Secret HMAC</span>
              <CopyButton text={newSecret} />
            </div>
            <div className="font-mono text-sm bg-gray-900 text-green-400 rounded-lg p-3 break-all select-all mb-4">
              {newSecret}
            </div>
            <button onClick={() => setNewSecret(null)} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              J'ai copié le secret
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet : Import SCIM ─────────────────────────────────────
function TabScim() {
  const { data: logs = [], isLoading } = useScimSyncLogs()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://ptpxoczdycajphrshdnk.supabase.co'
  const scimBase    = `${supabaseUrl}/functions/v1/apex-api-scim`

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Endpoint SCIM 2.0</h3>
        <p className="text-sm text-gray-500 mb-4">
          Compatible SCIM 2.0 (RFC 7644). Utilisez cet endpoint avec Workday, SAP SuccessFactors, Okta ou tout IdP supportant SCIM.
        </p>
        <div className="space-y-3">
          {[
            { method: 'GET',    label: 'Lister les utilisateurs',  path: '/Users' },
            { method: 'GET',    label: 'Obtenir un utilisateur',   path: '/Users/:id' },
            { method: 'POST',   label: 'Créer un utilisateur',     path: '/Users' },
            { method: 'PUT',    label: 'Remplacer un utilisateur', path: '/Users/:id' },
            { method: 'PATCH',  label: 'Modifier partiellement',   path: '/Users/:id' },
            { method: 'DELETE', label: 'Désactiver',               path: '/Users/:id' },
          ].map(r => (
            <div key={r.path + r.method} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className={`font-mono text-xs font-bold w-14 text-center py-0.5 rounded ${
                { GET: 'bg-green-100 text-green-700', POST: 'bg-blue-100 text-blue-700',
                  PUT: 'bg-amber-100 text-amber-700', PATCH: 'bg-purple-100 text-purple-700',
                  DELETE: 'bg-red-100 text-red-700' }[r.method]
              }`}>
                {r.method}
              </span>
              <span className="font-mono text-xs text-gray-600 flex-1">{scimBase}{r.path}</span>
              <span className="text-xs text-gray-500">{r.label}</span>
              <CopyButton text={`${scimBase}${r.path}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Config Workday */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Configuration Workday</h3>
        <p className="text-sm text-gray-500 mb-3">Paramètres à renseigner dans Workday Provisioning Studio :</p>
        <div className="space-y-2 text-sm">
          {[
            { label: 'SCIM Service URL',         value: scimBase },
            { label: 'Authentication Type',       value: 'OAuth Bearer Token' },
            { label: 'Authorization Header',      value: 'Authorization: Bearer <api_key>' },
            { label: 'Content-Type',              value: 'application/scim+json' },
            { label: 'Unique Identifier Field',   value: 'userName (email)' },
          ].map(c => (
            <div key={c.label} className="flex gap-3 p-2 rounded-lg hover:bg-gray-50">
              <span className="text-gray-500 w-48 flex-shrink-0">{c.label}</span>
              <code className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded flex-1">{c.value}</code>
              <CopyButton text={c.value} />
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Historique synchronisations</h3>
        {isLoading ? (
          <div className="text-center py-4 text-gray-400">Chargement...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Icon name="import" className="w-6 h-6 mx-auto text-gray-300 mb-1" />
            <p className="text-gray-500 text-sm">Aucune synchronisation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 border rounded-xl text-sm">
                <span className={`w-20 text-center py-0.5 rounded text-xs font-medium ${
                  log.status === 'completed' ? 'bg-green-100 text-green-700' :
                  log.status === 'failed'    ? 'bg-red-100 text-red-700'    :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {log.status}
                </span>
                <span className="text-gray-500 w-12">{log.sync_type}</span>
                <span className="flex-1 text-gray-700">
                  {log.created_count} créés · {log.updated_count} mis à jour · {log.skipped_count} ignorés
                  {log.error_count > 0 && <span className="text-red-600"> · {log.error_count} erreurs</span>}
                </span>
                <span className="text-gray-400 text-xs">{new Date(log.started_at).toLocaleString('fr-FR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Onglet : Mapping champs ──────────────────────────────────
function TabMapping() {
  const [system, setSystem]           = useState('scim')
  const { data: mappings = [], isLoading } = useFieldMappings(system)
  const { mutateAsync: create }       = useCreateFieldMapping()
  const { mutateAsync: remove }       = useDeleteFieldMapping()
  const { mutateAsync: update }       = useUpdateFieldMapping()
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ source_field: '', target_table: 'users', target_field: '', transform_fn: null, is_required: false })

  const targetFields = TARGET_TABLES[form.target_table]?.fields ?? []

  const handleCreate = async () => {
    if (!form.source_field || !form.target_field) return
    await create({ ...form, source_system: system, mapping_name: `${system} → ${form.source_field}` })
    setShowForm(false)
    setForm({ source_field: '', target_table: 'users', target_field: '', transform_fn: null, is_required: false })
  }

  return (
    <div className="space-y-5">
      {/* Sélecteur système */}
      <div className="flex gap-2 flex-wrap">
        {SOURCE_SYSTEMS.map(s => (
          <button
            key={s.value}
            onClick={() => setSystem(s.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              system === s.value ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{mappings.length} mapping(s) configuré(s)</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Icon name="plus" className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {isLoading ? <div className="text-center py-6 text-gray-400">Chargement...</div> :
       mappings.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
          <Icon name="mapping" className="w-6 h-6 mx-auto text-gray-300 mb-1" />
          <p className="text-gray-500 text-sm">Aucun mapping pour {SOURCE_SYSTEMS.find(s => s.value === system)?.label}</p>
        </div>
       ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Champ source</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Champ APEX</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Transform</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Requis</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Actif</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{m.source_field}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{m.target_table}.{m.target_field}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{m.transform_fn ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {m.is_required ? <span className="text-xs text-red-600 font-medium">Oui</span> : <span className="text-xs text-gray-400">Non</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => update({ id: m.id, is_active: !m.is_active })}>
                      <StatusDot active={m.is_active} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => remove(m.id)} className="text-gray-400 hover:text-red-600">
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )
      }

      {/* Formulaire ajout */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau mapping</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Champ source ({SOURCE_SYSTEMS.find(s => s.value === system)?.label})</label>
                <input type="text" value={form.source_field} onChange={e => setForm(f => ({ ...f, source_field: e.target.value }))}
                  placeholder="ex: name.givenName, worker.workerID..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Champ cible APEX RH</label>
                <select value={form.target_field} onChange={e => setForm(f => ({ ...f, target_field: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sélectionner —</option>
                  {targetFields.map(f => (
                    <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Transformation</label>
                <select value={form.transform_fn ?? ''} onChange={e => setForm(f => ({ ...f, transform_fn: e.target.value || null }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TRANSFORM_FUNCTIONS.map(t => <option key={String(t.value)} value={t.value ?? ''}>{t.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} className="rounded text-blue-600" />
                <span className="text-sm text-gray-700">Champ obligatoire (erreur si absent)</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
              <button onClick={handleCreate} disabled={!form.source_field || !form.target_field}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet : Documentation OpenAPI ──────────────────────────
function TabDocs() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://ptpxoczdycajphrshdnk.supabase.co'
  const baseUrl     = `${supabaseUrl}/functions/v1/apex-api`

  const endpoints = [
    {
      method: 'GET', path: '/api/v1/users', scope: 'users:read',
      desc: 'Liste les utilisateurs de l\'organisation',
      params: [
        { name: 'page', type: 'integer', desc: 'Numéro de page (défaut: 1)' },
        { name: 'per_page', type: 'integer', desc: 'Résultats par page (max: 100)' },
        { name: 'role', type: 'string', desc: 'Filtrer par rôle (administrateur, directeur, etc.)' },
        { name: 'active', type: 'boolean', desc: 'Filtrer utilisateurs actifs/inactifs' },
      ],
      example: `curl -H "Authorization: Bearer apx_live_xxx" \\
  "${baseUrl}/api/v1/users?page=1&per_page=20&active=true"`,
    },
    {
      method: 'GET', path: '/api/v1/performance', scope: 'performance:read',
      desc: 'Scores PULSE par utilisateur',
      params: [
        { name: 'user_id', type: 'uuid', desc: 'Filtrer par utilisateur' },
        { name: 'date_from', type: 'date', desc: 'Date de début (YYYY-MM-DD)' },
        { name: 'date_to', type: 'date', desc: 'Date de fin' },
        { name: 'group_by', type: 'string', desc: '"month" pour agrégation mensuelle' },
      ],
      example: `curl -H "Authorization: Bearer apx_live_xxx" \\
  "${baseUrl}/api/v1/performance?date_from=2026-01-01&group_by=month"`,
    },
    {
      method: 'GET', path: '/api/v1/objectives', scope: 'objectives:read',
      desc: 'OKR et objectifs de l\'organisation',
      params: [
        { name: 'status', type: 'string', desc: 'brouillon | actif | en_evaluation | valide | archive' },
        { name: 'level', type: 'string', desc: 'strategique | division | service | individuel' },
        { name: 'owner_id', type: 'uuid', desc: 'Propriétaire de l\'OKR' },
      ],
      example: `curl -H "Authorization: Bearer apx_live_xxx" \\
  "${baseUrl}/api/v1/objectives?status=actif&level=strategique"`,
    },
    {
      method: 'GET', path: '/api/v1/surveys', scope: 'surveys:read',
      desc: 'Enquêtes d\'engagement',
      params: [
        { name: 'page', type: 'integer', desc: 'Numéro de page' },
        { name: 'per_page', type: 'integer', desc: 'Résultats par page' },
      ],
      example: `curl -H "Authorization: Bearer apx_live_xxx" \\
  "${baseUrl}/api/v1/surveys"`,
    },
  ]

  const methodColors = { GET: 'bg-green-100 text-green-700', POST: 'bg-blue-100 text-blue-700' }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">APEX RH API v1.0</h3>
          <a
            href="/docs/openapi.json"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Icon name="external" className="w-4 h-4" /> OpenAPI JSON
          </a>
        </div>
        <p className="text-blue-100 text-sm">Base URL : <code className="bg-white/20 px-2 py-0.5 rounded font-mono text-xs">{baseUrl}</code></p>
        <p className="text-blue-100 text-sm mt-1">Auth : <code className="bg-white/20 px-2 py-0.5 rounded font-mono text-xs">Authorization: Bearer {'<api_key>'}</code></p>
        <p className="text-blue-100 text-sm mt-1">Rate limit : <code className="bg-white/20 px-2 py-0.5 rounded font-mono text-xs">100 req/min par clé</code></p>
      </div>

      {/* Format réponse */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-2">Format de réponse paginée :</div>
        <pre className="text-xs text-green-400 overflow-auto">{`{
  "data": [...],           // Tableau de résultats
  "meta": {
    "total": 150,          // Total de résultats
    "page": 1,
    "per_page": 50,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}`}</pre>
      </div>

      {/* Endpoints */}
      {endpoints.map(ep => (
        <div key={ep.path} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${methodColors[ep.method]}`}>{ep.method}</span>
            <code className="font-mono text-sm text-gray-800">{ep.path}</code>
            <span className="text-xs text-gray-500 ml-2">{ep.desc}</span>
            <ScopeBadge scope={ep.scope} />
          </div>
          <div className="p-4 space-y-4">
            {/* Paramètres */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Paramètres query</div>
              <div className="space-y-1.5">
                {ep.params.map(p => (
                  <div key={p.name} className="flex items-start gap-3 text-xs">
                    <code className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-28 flex-shrink-0">{p.name}</code>
                    <span className="text-gray-400 w-16 flex-shrink-0">{p.type}</span>
                    <span className="text-gray-600">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Exemple */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Exemple</div>
              <div className="relative">
                <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-auto">{ep.example}</pre>
                <CopyButton text={ep.example} label="Copier" />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Codes erreur */}
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Codes d'erreur</div>
        <div className="space-y-2 text-xs">
          {[
            { code: 401, msg: 'AUTH_MISSING / AUTH_INVALID', desc: 'Clé API manquante ou invalide' },
            { code: 403, msg: 'AUTH_SCOPE',                  desc: 'Scope insuffisant pour cet endpoint' },
            { code: 404, msg: 'NOT_FOUND',                   desc: 'Endpoint inconnu' },
            { code: 429, msg: 'RATE_LIMIT',                  desc: 'Limite de 100 req/min dépassée' },
            { code: 500, msg: 'SERVER_ERROR',                desc: 'Erreur serveur interne' },
          ].map(e => (
            <div key={e.code} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <span className={`font-mono font-bold w-8 ${e.code >= 500 ? 'text-red-600' : e.code >= 400 ? 'text-amber-600' : 'text-green-600'}`}>{e.code}</span>
              <code className="font-mono text-gray-700 w-32">{e.msg}</code>
              <span className="text-gray-500">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function ApiManager() {
  const { user } = useAuth()
  const [tab, setTab] = useState('keys')

  // Accès restreint aux admins — sécurité réelle assurée par RLS Supabase
  const isAdmin = ['administrateur', 'admin', 'superadmin'].includes(user?.role?.toLowerCase() ?? '')
    || user?.role?.toLowerCase()?.includes('admin')

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <Icon name="key" className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-lg font-medium text-gray-700">Accès réservé aux administrateurs</p>
        <p className="text-sm mt-1">Cette page nécessite le rôle Administrateur.</p>
        <p className="text-xs mt-2 text-gray-400">Rôle détecté : {user?.role ?? 'non défini'}</p>
      </div>
    )
  }

  const tabs = [
    { id: 'keys',    label: 'Clés API',     icon: 'key'     },
    { id: 'webhooks',label: 'Webhooks',     icon: 'webhook' },
    { id: 'scim',    label: 'Import SCIM',  icon: 'import'  },
    { id: 'mapping', label: 'Mapping',      icon: 'mapping' },
    { id: 'docs',    label: 'Docs API',     icon: 'docs'    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API & Connecteurs SIRH</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gérez les intégrations externes : clés API, webhooks, import SCIM et mapping de champs.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon name={t.icon} className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu */}
      <div>
        {tab === 'keys'    && <TabApiKeys />}
        {tab === 'webhooks'&& <TabWebhooks />}
        {tab === 'scim'    && <TabScim />}
        {tab === 'mapping' && <TabMapping />}
        {tab === 'docs'    && <TabDocs />}
      </div>
    </div>
  )
}