// ============================================================
// APEX RH — PermissionOverrideEditor.jsx
// Session 108 — Phase D RBAC — Éditeur de surcharges individuelles
// Guard : can('admin','rbac','update')
// logAudit() sur chaque mutation — category:'rbac'
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldOff, Plus, Trash2, RefreshCw,
  AlertTriangle, Check, X, Calendar, Shield,
} from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import {
  useUserOverrides,
  useSetOverride,
  useDeleteOverride,
} from '../../hooks/useUserPermissionOverrides'

// ---- Listes des modules/ressources/actions disponibles ----
const MODULE_OPTIONS = [
  'dashboard', 'tasks', 'profile', 'employes', 'temps', 'conges',
  'recrutement', 'onboarding', 'offboarding', 'performance', 'evaluations',
  'developpement', 'intelligence', 'admin', 'compensation', 'reconnaissances',
  'pulse', 'okr', 'calibration',
]

const ACTION_OPTIONS = ['read', 'create', 'update', 'delete', 'validate', 'export', 'admin', 'propose']

const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(iso) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

// ---- Formulaire d'ajout / édition ----
function OverrideForm({ userId, initial, onSaved, onCancel }) {
  const { setOverride, saving } = useSetOverride()
  const [form, setForm] = useState({
    module:     initial?.module     || '',
    resource:   initial?.resource   || '',
    action:     initial?.action     || 'read',
    granted:    initial?.granted    ?? true,
    expires_at: initial?.expires_at ? initial.expires_at.slice(0, 10) : '',
  })
  const [err, setErr] = useState(null)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function submit() {
    setErr(null)
    if (!form.module.trim() || !form.resource.trim() || !form.action.trim()) {
      setErr('Module, ressource et action sont requis.')
      return
    }
    const result = await setOverride(userId, {
      module:     form.module.trim(),
      resource:   form.resource.trim(),
      action:     form.action.trim(),
      granted:    form.granted,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    })
    if (result.success) onSaved()
    else setErr(result.error || 'Erreur inconnue')
  }

  const inputCls = "w-full h-8 bg-white/5 border border-white/10 rounded-lg px-3 text-xs text-white/80 placeholder-white/20 focus:outline-none focus:border-white/25"
  const selectCls = "w-full h-8 bg-[#1a1a2e] border border-white/10 rounded-lg px-3 text-xs text-white/80 focus:outline-none focus:border-white/25"

  return (
    <motion.div
      variants={fadeUp} initial="hidden" animate="visible"
      className="rounded-xl border border-white/10 p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
        {initial ? 'Modifier la surcharge' : 'Nouvelle surcharge'}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {/* Module */}
        <div>
          <label className="text-[10px] text-white/35 block mb-1">Module</label>
          <select value={form.module} onChange={e => set('module', e.target.value)} className={selectCls}>
            <option value="">— choisir —</option>
            {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {/* Ressource */}
        <div>
          <label className="text-[10px] text-white/35 block mb-1">Ressource</label>
          <input
            value={form.resource}
            onChange={e => set('resource', e.target.value)}
            placeholder="ex: team, own, users…"
            className={inputCls}
          />
        </div>
        {/* Action */}
        <div>
          <label className="text-[10px] text-white/35 block mb-1">Action</label>
          <select value={form.action} onChange={e => set('action', e.target.value)} className={selectCls}>
            {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Accordé / refusé */}
        <div>
          <label className="text-[10px] text-white/35 block mb-1">Droit</label>
          <div className="flex gap-1">
            <button
              onClick={() => set('granted', true)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 border ${
                form.granted
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/3 text-white/30 border-white/8 hover:border-white/15'
              }`}>
              <ShieldCheck size={11} /> Accordé
            </button>
            <button
              onClick={() => set('granted', false)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 border ${
                !form.granted
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-white/3 text-white/30 border-white/8 hover:border-white/15'
              }`}>
              <ShieldOff size={11} /> Refusé
            </button>
          </div>
        </div>
        {/* Expiration */}
        <div>
          <label className="text-[10px] text-white/35 block mb-1">Expiration (optionnel)</label>
          <input
            type="date"
            value={form.expires_at}
            onChange={e => set('expires_at', e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </div>
      </div>

      {err && (
        <p className="text-[11px] text-red-400/80 flex items-center gap-1.5">
          <AlertTriangle size={10} /> {err}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="h-8 px-3 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors border border-white/8">
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="h-8 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
          {saving ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
          {saving ? 'Sauvegarde…' : 'Confirmer'}
        </button>
      </div>
    </motion.div>
  )
}

// ---- Composant principal ----
export default function PermissionOverrideEditor({ userId, userName }) {
  const { can } = usePermission()
  const { overrides, loading, error, refetch } = useUserOverrides(userId)
  const { deleteOverride, deleting } = useDeleteOverride()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Guard RBAC
  if (!can('admin', 'rbac', 'update')) {
    return (
      <div className="flex items-center gap-2 text-white/30 text-sm py-4">
        <Shield size={16} /> Accès restreint — administrateur requis
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="py-8 text-center text-white/25 text-sm">
        Sélectionnez un utilisateur pour gérer ses surcharges
      </div>
    )
  }

  async function handleDelete(id) {
    await deleteOverride(id, { userId })
    setConfirmDelete(null)
    refetch()
  }

  function handleSaved() {
    setShowForm(false)
    setEditTarget(null)
    refetch()
  }

  const active    = overrides.filter(o => !isExpired(o.expires_at))
  const expired   = overrides.filter(o => isExpired(o.expires_at))

  return (
    <div className="space-y-4">

      {/* Header + bouton */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/70">
            Surcharges pour <span className="text-white/90">{userName || userId.slice(0, 8) + '…'}</span>
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            Ces surcharges ont priorité sur la matrice par défaut.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/35 hover:text-white/60 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditTarget(null) }}
              className="h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Plus size={11} /> Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Formulaire */}
      <AnimatePresence>
        {(showForm || editTarget) && (
          <OverrideForm
            key={editTarget?.id || 'new'}
            userId={userId}
            initial={editTarget}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditTarget(null) }}
          />
        )}
      </AnimatePresence>

      {/* Erreur */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-400/80 flex items-center gap-2">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Liste des surcharges actives */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={16} className="animate-spin text-white/20" />
        </div>
      ) : active.length === 0 && expired.length === 0 ? (
        <div className="rounded-xl border border-white/8 py-10 text-center space-y-2"
          style={{ background: 'rgba(255,255,255,0.01)' }}>
          <ShieldCheck size={24} className="text-white/15 mx-auto" />
          <p className="text-sm text-white/30">Aucune surcharge — matrice par défaut appliquée</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)' }}>

          {/* Header colonnes */}
          <div className="grid text-[10px] text-white/30 font-semibold uppercase tracking-wider px-4 py-2.5 border-b border-white/8 bg-white/2"
            style={{ gridTemplateColumns: '1fr 1fr 90px 80px 120px 72px' }}>
            <span>Module</span>
            <span>Ressource</span>
            <span>Action</span>
            <span>Droit</span>
            <span>Expiration</span>
            <span />
          </div>

          <AnimatePresence>
            {active.map(o => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="grid items-center px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors text-[11px]"
                style={{ gridTemplateColumns: '1fr 1fr 90px 80px 120px 72px' }}>

                <span className="text-white/60 font-mono">{o.module}</span>
                <span className="text-white/50 font-mono">{o.resource}</span>
                <span className="text-white/45 font-mono">{o.action}</span>
                <span>
                  {o.granted ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <ShieldCheck size={10} /> Accordé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                      <ShieldOff size={10} /> Refusé
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-white/35">
                  {o.expires_at ? (
                    <>
                      <Calendar size={9} className="text-amber-400/60" />
                      <span className="text-amber-400/80">
                        {formatDate(o.expires_at)}
                      </span>
                    </>
                  ) : (
                    <span className="text-white/20 italic">Permanent</span>
                  )}
                </span>
                <span className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => { setEditTarget(o); setShowForm(false) }}
                    className="h-6 w-6 rounded flex items-center justify-center text-white/25 hover:text-indigo-400 transition-colors">
                    <Check size={11} />
                  </button>
                  {confirmDelete === o.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(o.id)}
                        disabled={deleting}
                        className="h-6 px-1.5 rounded text-[10px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                        Oui
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="h-6 px-1.5 rounded text-[10px] text-white/30 border border-white/10 hover:bg-white/5 transition-colors">
                        <X size={9} />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(o.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  )}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Surcharges expirées (repliées) */}
      {expired.length > 0 && (
        <details className="group">
          <summary className="text-[11px] text-white/25 cursor-pointer hover:text-white/40 transition-colors select-none">
            {expired.length} surcharge{expired.length > 1 ? 's' : ''} expirée{expired.length > 1 ? 's' : ''} ▾
          </summary>
          <div className="mt-2 rounded-xl border border-white/6 overflow-hidden opacity-50"
            style={{ background: 'rgba(255,255,255,0.01)' }}>
            {expired.map(o => (
              <div
                key={o.id}
                className="grid items-center px-4 py-2 border-b border-white/5 last:border-0 text-[11px]"
                style={{ gridTemplateColumns: '1fr 1fr 90px 80px 120px 72px' }}>
                <span className="text-white/35 font-mono line-through">{o.module}</span>
                <span className="text-white/25 font-mono line-through">{o.resource}</span>
                <span className="text-white/25 font-mono">{o.action}</span>
                <span className={o.granted ? 'text-emerald-400/40' : 'text-red-400/40'}>
                  {o.granted ? 'Accordé' : 'Refusé'}
                </span>
                <span className="text-white/25">Expiré {formatDate(o.expires_at)}</span>
                <button
                  onClick={() => handleDelete(o.id)}
                  className="h-6 w-6 rounded flex items-center justify-center text-white/15 hover:text-red-400/60 transition-colors ml-auto">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
