// ============================================================
// APEX RH — components/communication/AnnouncementForm.jsx
// Session S65 — base | S87 — ciblage avancé + flag important
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Pin, Send, Loader2, Image, CalendarClock, AlertCircle, Users, UserCheck, Globe } from 'lucide-react'
import { useUpdateAnnonce } from '../../hooks/useAnnonces'
import { useCreateTargetedAnnouncement, useUpdateTargetedAnnouncement } from '../../hooks/useCommunication'
import { useUsersList } from '../../hooks/useSettings'
import { useAuth } from '../../contexts/AuthContext'

const ROLES = [
  { value: 'collaborateur',  label: 'Collaborateurs' },
  { value: 'chef_service',   label: 'Chefs de service' },
  { value: 'chef_division',  label: 'Chefs de division' },
  { value: 'directeur',      label: 'Directeurs' },
  { value: 'administrateur', label: 'Administrateurs' },
]

const TARGETING_TYPES = [
  { value: 'all',    label: 'Tous les collaborateurs', icon: Globe },
  { value: 'roles',  label: 'Par rôle',                icon: Users },
  { value: 'manual', label: 'Sélection manuelle',      icon: UserCheck },
]

export default function AnnouncementForm({ annonce, onClose }) {
  const { profile } = useAuth()
  const createAnnonce  = useCreateTargetedAnnouncement()
  const updateAnnonce  = useUpdateTargetedAnnouncement()

  // useUsersList pour sélection manuelle
  const { data: allUsers = [] } = useUsersList()

  const [form, setForm] = useState({
    title:           '',
    content:         '',
    targeting_type:  'all',    // all | roles | manual
    target_roles:    [],
    target_user_ids: [],
    important:       false,
    pinned:          false,
    expires_at:      '',
    cover_image_url: '',
  })
  const [error, setError] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Pré-remplir si édition
  useEffect(() => {
    if (annonce) {
      const rules = annonce.targeting_rules || { type: 'all' }
      setForm({
        title:           annonce.title || '',
        content:         annonce.content || '',
        targeting_type:  rules.type || 'all',
        target_roles:    rules.roles || annonce.target_roles || [],
        target_user_ids: rules.user_ids || [],
        important:       annonce.important || false,
        pinned:          annonce.pinned || false,
        expires_at:      annonce.expires_at ? annonce.expires_at.split('T')[0] : '',
        cover_image_url: annonce.cover_image_url || '',
      })
    }
  }, [annonce?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleRole = (role) => {
    set('target_roles', form.target_roles.includes(role)
      ? form.target_roles.filter(r => r !== role)
      : [...form.target_roles, role]
    )
  }

  const toggleUser = (userId) => {
    set('target_user_ids', form.target_user_ids.includes(userId)
      ? form.target_user_ids.filter(id => id !== userId)
      : [...form.target_user_ids, userId]
    )
  }

  const buildTargetingRules = () => {
    if (form.targeting_type === 'roles') {
      return { type: 'roles', roles: form.target_roles }
    }
    if (form.targeting_type === 'manual') {
      return { type: 'manual', user_ids: form.target_user_ids }
    }
    return { type: 'all' }
  }

  const handleSubmit = async () => {
    if (!form.title.trim())   { setError('Le titre est requis'); return }
    if (!form.content.trim()) { setError('Le contenu est requis'); return }
    if (form.targeting_type === 'roles' && form.target_roles.length === 0) {
      setError('Sélectionnez au moins un rôle ou changez le ciblage'); return
    }
    if (form.targeting_type === 'manual' && form.target_user_ids.length === 0) {
      setError('Sélectionnez au moins un destinataire'); return
    }
    setError('')

    const payload = {
      title:           form.title.trim(),
      content:         form.content,
      targeting_rules: buildTargetingRules(),
      target_roles:    form.targeting_type === 'roles' ? form.target_roles : [],
      important:       form.important,
      pinned:          form.pinned,
      expires_at:      form.expires_at || undefined,
      cover_image_url: form.cover_image_url || undefined,
    }

    try {
      if (annonce) {
        await updateAnnonce.mutateAsync({ id: annonce.id, ...payload })
      } else {
        await createAnnonce.mutateAsync(payload)
      }
      onClose?.()
    } catch (err) {
      setError(err.message || 'Erreur lors de la publication')
    }
  }

  const isLoading = createAnnonce.isPending || updateAnnonce.isPending

  // Utilisateurs filtrés pour sélection manuelle
  const filteredUsers = allUsers.filter(u =>
    !userSearch ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const recipientCount = form.targeting_type === 'manual'
    ? form.target_user_ids.length
    : form.targeting_type === 'roles'
      ? `rôles : ${form.target_roles.length}`
      : 'tous'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      className="w-full max-w-2xl mx-auto rounded-2xl border overflow-hidden"
      style={{ background: '#090920', border: '1px solid rgba(255,255,255,0.1)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]"
        style={{ background: 'linear-gradient(135deg,rgba(201,162,39,0.06),transparent)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.2)' }}>
            <Send size={14} style={{ color: '#C9A227' }}/>
          </div>
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
            {annonce ? "Modifier l'annonce" : 'Nouvelle annonce'}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          <X size={16}/>
        </button>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

        {/* Titre */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
            Titre *
          </label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Titre de l'annonce..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
        </div>

        {/* Contenu */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
            Contenu *
          </label>
          <textarea
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Rédigez votre annonce..."
            rows={8}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors resize-none leading-relaxed"
          />
          <p className="text-[10px] text-white/25 mt-1">
            Le HTML basique est supporté (&lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, etc.)
          </p>
        </div>

        {/* Image de couverture */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider flex items-center gap-1">
            <Image size={11}/> Image de couverture (URL)
          </label>
          <input
            value={form.cover_image_url}
            onChange={e => set('cover_image_url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
        </div>

        {/* S87 — Ciblage avancé */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Ciblage des destinataires
          </label>

          {/* Type de ciblage */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {TARGETING_TYPES.map(t => {
              const Icon = t.icon
              const active = form.targeting_type === t.value
              return (
                <button key={t.value}
                  onClick={() => set('targeting_type', t.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    active
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:text-white/65 hover:border-white/15'
                  }`}>
                  <Icon size={13}/>
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Sélection par rôle */}
          {form.targeting_type === 'roles' && (
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => {
                const active = form.target_roles.includes(r.value)
                return (
                  <button key={r.value} onClick={() => toggleRole(r.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      active
                        ? 'border-amber-500/40 bg-amber-500/12 text-amber-300'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/70 hover:border-white/15'
                    }`}>
                    {r.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Sélection manuelle */}
          {form.targeting_type === 'manual' && (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="p-3 border-b border-white/[0.06]">
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Rechercher un collaborateur..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.04]">
                {filteredUsers.map(u => {
                  const selected = form.target_user_ids.includes(u.id)
                  return (
                    <button key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        selected ? 'bg-amber-500/08' : 'hover:bg-white/[0.03]'
                      }`}>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        selected ? 'border-amber-500 bg-amber-500' : 'border-white/20'
                      }`}>
                        {selected && <span className="text-[8px] text-white font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/75 truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-[10px] text-white/35">{u.role}</p>
                      </div>
                    </button>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <p className="px-3 py-3 text-xs text-white/30 text-center">Aucun résultat</p>
                )}
              </div>
            </div>
          )}

          {/* Résumé destinataires */}
          <p className="text-[10px] text-white/30 mt-2">
            Destinataires : <span className="text-amber-400 font-semibold">{recipientCount}</span>
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {/* S87 — Important */}
          <div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div onClick={() => set('important', !form.important)}
                className="w-10 rounded-full transition-all flex items-center"
                style={{
                  height: 22,
                  background: form.important ? '#EF4444' : 'rgba(255,255,255,0.1)',
                }}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-all mx-0.5 ${
                  form.important ? 'translate-x-5' : 'translate-x-0'
                }`}/>
              </div>
              <span className="flex items-center gap-1 text-sm text-white/60">
                <AlertCircle size={13}/> Important
              </span>
            </label>
            <p className="text-[10px] text-white/25 ml-12 mt-0.5">Génère une notification urgente</p>
          </div>

          {/* Épingler */}
          <div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div onClick={() => set('pinned', !form.pinned)}
                className="w-10 rounded-full transition-all flex items-center"
                style={{
                  height: 22,
                  background: form.pinned ? '#C9A227' : 'rgba(255,255,255,0.1)',
                }}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-all mx-0.5 ${
                  form.pinned ? 'translate-x-5' : 'translate-x-0'
                }`}/>
              </div>
              <span className="flex items-center gap-1 text-sm text-white/60">
                <Pin size={13}/> Épingler en haut
              </span>
            </label>
          </div>
        </div>

        {/* Date d'expiration */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider flex items-center gap-1">
            <CalendarClock size={11}/> Expire le
          </label>
          <input
            type="date"
            value={form.expires_at}
            onChange={e => set('expires_at', e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/40 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Erreur */}
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.07]">
        <button onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          Annuler
        </button>
        <button onClick={handleSubmit} disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#B88B1A,#C9A227)' }}>
          {isLoading
            ? <Loader2 size={14} className="animate-spin"/>
            : <Send size={14}/>}
          {annonce ? 'Mettre à jour' : 'Publier'}
        </button>
      </div>
    </motion.div>
  )
}
