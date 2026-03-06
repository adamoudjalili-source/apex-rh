// ============================================================
// APEX RH — SuperAdmin.jsx
// Session 52 — Interface Super-Admin : gestion multi-tenant
// Accès : super_admins uniquement (table super_admins)
// ============================================================
import { useState } from 'react'
import {
  useOrganizations,
  useOrganizationStats,
  useCreateOrganization,
  useUpdateOrganization,
  useToggleOrganization,
  useIsSuperAdmin,
  PLAN_CONFIG,
} from '../../hooks/useOrganizations'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'

// ─── BADGE PLAN ───────────────────────────────────────────────
function PlanBadge({ plan }) {
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.trial
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ─── BADGE STATUT ─────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`} />
      {active ? 'Actif' : 'Inactif'}
    </span>
  )
}

// ─── STATS CARD ───────────────────────────────────────────────
function StatsCard({ orgId }) {
  const { data: stats, isLoading } = useOrganizationStats(orgId)
  if (isLoading) return <span className="text-xs text-white/30">…</span>
  if (!stats) return null
  return (
    <div className="flex items-center gap-4 text-xs text-white/50">
      <span><span className="text-white/80 font-medium">{stats.activeUsers}</span> utilisateurs</span>
      <span><span className="text-white/80 font-medium">{stats.totalObjectives}</span> OKR</span>
      {stats.avgPulse30j !== null && (
        <span>PULSE : <span className="text-white/80 font-medium">{stats.avgPulse30j}</span></span>
      )}
    </div>
  )
}

// ─── FORMULAIRE ORGANISATION ──────────────────────────────────
function OrgForm({ initial = null, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    slug:     initial?.slug     ?? '',
    plan:     initial?.plan     ?? 'enterprise',
    maxUsers: initial?.max_users ?? 500,
    domain:   initial?.domain   ?? '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Nom de l'organisation *</label>
        <input
          value={form.name}
          onChange={set('name')}
          required
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-white/20"
          placeholder="Ex: NITA, Acme Corp"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Identifiant unique (slug) *</label>
        <input
          value={form.slug}
          onChange={set('slug')}
          required
          disabled={!!initial}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-white/20
                     disabled:opacity-40 disabled:cursor-not-allowed font-mono"
          placeholder="ex: nita, acme-corp"
        />
        {!initial && <p className="mt-1 text-xs text-white/30">Minuscules et tirets uniquement. Non modifiable après création.</p>}
      </div>

      {/* Plan + Max users */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">Plan</label>
          <select
            value={form.plan}
            onChange={set('plan')}
            className="w-full px-3 py-2 rounded-lg bg-[#1c1c2e] border border-white/10 text-white text-sm
                       focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {Object.entries(PLAN_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Utilisateurs max</label>
          <input
            type="number"
            min={1}
            max={9999}
            value={form.maxUsers}
            onChange={set('maxUsers')}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                       focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Domaine */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Domaine email (optionnel)</label>
        <input
          value={form.domain}
          onChange={set('domain')}
          type="text"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-white/20 font-mono"
          placeholder="ex: nita.tg, acme.com"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition text-sm"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium
                     transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />}
          {initial ? 'Mettre à jour' : 'Créer l\'organisation'}
        </button>
      </div>
    </form>
  )
}

// ─── ROW ORGANISATION ─────────────────────────────────────────
function OrgRow({ org, onEdit }) {
  const toggle = useToggleOrganization()

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5 hover:bg-white/2 transition group">
      {/* Logo / initiales */}
      <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-sm flex-shrink-0">
        {org.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Nom + slug */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{org.name}</span>
          <span className="text-xs text-white/30 font-mono">{org.slug}</span>
          {org.domain && <span className="text-xs text-white/30">· {org.domain}</span>}
        </div>
        <StatsCard orgId={org.id} />
      </div>

      {/* Plan + statut */}
      <div className="flex items-center gap-3">
        <PlanBadge plan={org.plan} />
        <StatusBadge active={org.is_active} />
        <span className="text-xs text-white/30">{org.max_users} users max</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onEdit(org)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition text-xs"
          title="Modifier"
        >
          ✏️
        </button>
        <button
          onClick={() => toggle.mutate({ id: org.id, is_active: !org.is_active })}
          disabled={toggle.isPending}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition text-xs
            ${org.is_active ? 'text-red-400/60 hover:text-red-400' : 'text-green-400/60 hover:text-green-400'}`}
          title={org.is_active ? 'Désactiver' : 'Réactiver'}
        >
          {org.is_active ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function SuperAdmin() {
  const { data: isSuperAdmin, isLoading: checkingAccess } = useIsSuperAdmin()
  const { data: orgs = [], isLoading } = useOrganizations()
  const createOrg = useCreateOrganization()
  const updateOrg = useUpdateOrganization()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [error, setError] = useState(null)

  // ── Vérification accès ────────────────────────────────────
  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div className="space-y-3">
          <div className="text-4xl">🔒</div>
          <p className="text-white/60 text-sm">Accès réservé aux super-administrateurs APEX RH.</p>
        </div>
      </div>
    )
  }

  // ── Filtrage ──────────────────────────────────────────────
  const filtered = orgs.filter(o => {
    const matchSearch = !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === 'all' || o.plan === filterPlan
    return matchSearch && matchPlan
  })

  const activeCount = orgs.filter(o => o.is_active).length

  // ── Handlers ─────────────────────────────────────────────
  const handleEdit = (org) => {
    setEditTarget(org)
    setShowModal(true)
    setError(null)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditTarget(null)
    setError(null)
  }

  const handleSave = async (form) => {
    setError(null)
    try {
      if (editTarget) {
        await updateOrg.mutateAsync({
          id: editTarget.id,
          name: form.name,
          plan: form.plan,
          max_users: Number(form.maxUsers),
          domain: form.domain || null,
        })
      } else {
        await createOrg.mutateAsync(form)
      }
      handleClose()
    } catch (e) {
      setError(e.message ?? 'Erreur lors de la sauvegarde.')
    }
  }

  const isSaving = createOrg.isPending || updateOrg.isPending

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            🌐 Super-Admin
            <span className="text-xs font-normal text-white/40 bg-white/5 px-2 py-0.5 rounded-full ml-1">
              Gestion Multi-tenant
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {activeCount} organisation{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''} sur {orgs.length} au total
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500
                     text-white text-sm font-medium transition"
        >
          <span className="text-base leading-none">+</span>
          Nouvelle organisation
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Organisations', value: orgs.length, icon: '🏢' },
          { label: 'Actives',        value: activeCount, icon: '✅' },
          { label: 'Enterprise',     value: orgs.filter(o => o.plan === 'enterprise').length, icon: '⭐' },
          { label: 'En essai',       value: orgs.filter(o => o.plan === 'trial').length, icon: '🧪' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-white/3 border border-white/8 p-4">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une organisation…"
            className="w-full pl-8 pr-4 py-2 rounded-lg bg-white/5 border border-white/10
                       text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white
                     focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="all">Tous les plans</option>
          {Object.entries(PLAN_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      <div className="rounded-xl border border-white/8 overflow-hidden bg-white/2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="compact"
            title="Aucune organisation"
            description={search ? `Aucun résultat pour « ${search} »` : 'Créez votre première organisation.'}
          />
        ) : (
          filtered.map(org => (
            <OrgRow key={org.id} org={org} onEdit={handleEdit} />
          ))
        )}
      </div>

      {/* Note sécurité */}
      <p className="text-xs text-white/25 text-center">
        🔒 Interface super-admin — accès restreint à la table <code className="font-mono">super_admins</code>.
        Les modifications sont immédiatement effectives en base.
      </p>

      {/* Modal création / édition */}
      <Modal
        isOpen={showModal}
        onClose={handleClose}
        title={editTarget ? `Modifier — ${editTarget.name}` : 'Nouvelle organisation'}
      >
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <OrgForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={handleClose}
          isSaving={isSaving}
        />
      </Modal>
    </div>
  )
}
