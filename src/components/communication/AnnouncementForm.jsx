// ============================================================
// APEX RH — components/communication/AnnouncementForm.jsx
// Session S65 — Formulaire création/édition annonce
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Pin, Send, Loader2, Image, CalendarClock } from 'lucide-react'
import { useCreateAnnonce, useUpdateAnnonce } from '../../hooks/useAnnonces'
import { useAuth } from '../../contexts/AuthContext'

const ROLES = [
  { value: 'collaborateur',  label: 'Collaborateurs' },
  { value: 'chef_service',   label: 'Chefs de service' },
  { value: 'chef_division',  label: 'Chefs de division' },
  { value: 'directeur',      label: 'Directeurs' },
  { value: 'administrateur', label: 'Administrateurs' },
]

export default function AnnouncementForm({ annonce, onClose }) {
  const { profile } = useAuth()
  const createAnnonce = useCreateAnnonce()
  const updateAnnonce = useUpdateAnnonce()

  const [form, setForm] = useState({
    title:          '',
    content:        '',
    target_roles:   [],
    pinned:         false,
    expires_at:     '',
    cover_image_url:'',
  })
  const [error, setError] = useState('')

  // Pré-remplir si édition
  useEffect(() => {
    if (annonce) {
      setForm({
        title:           annonce.title || '',
        content:         annonce.content || '',
        target_roles:    annonce.target_roles || [],
        pinned:          annonce.pinned || false,
        expires_at:      annonce.expires_at ? annonce.expires_at.split('T')[0] : '',
        cover_image_url: annonce.cover_image_url || '',
      })
    }
  }, [annonce?.id])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleRole = (role) => {
    set('target_roles', form.target_roles.includes(role)
      ? form.target_roles.filter(r => r !== role)
      : [...form.target_roles, role]
    )
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    if (!form.content.trim()) { setError('Le contenu est requis'); return }
    setError('')

    const payload = {
      title:           form.title.trim(),
      content:         form.content,
      target_roles:    form.target_roles,
      pinned:          form.pinned,
      expires_at:      form.expires_at || undefined,
      cover_image_url: form.cover_image_url || undefined,
    }

    if (annonce) {
      await updateAnnonce.mutateAsync({ id: annonce.id, ...payload })
    } else {
      await createAnnonce.mutateAsync(payload)
    }
    onClose?.()
  }

  const isLoading = createAnnonce.isPending || updateAnnonce.isPending

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
            {annonce ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
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

        {/* Ciblage rôles */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Destinataires <span className="font-normal normal-case">(laisser vide = tous)</span>
          </label>
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
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {/* Épingler */}
          <div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div onClick={() => set('pinned', !form.pinned)}
                className={`w-10 h-5.5 rounded-full transition-all flex items-center ${
                  form.pinned ? 'bg-amber-500' : 'bg-white/10'
                }`}
                style={{ height: 22 }}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-all mx-0.5 ${
                  form.pinned ? 'translate-x-5' : 'translate-x-0'
                }`}/>
              </div>
              <span className="flex items-center gap-1 text-sm text-white/60">
                <Pin size={13}/> Épingler en haut
              </span>
            </label>
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
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/40 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>
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
