// ============================================================
// APEX RH — components/formation/MyCertifications.jsx
// Session 57 — Mes certifications
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Plus, X, ExternalLink, AlertTriangle,
  CheckCircle2, Clock, Loader2, Calendar, Trash2,
} from 'lucide-react'
import {
  useMyCertifications, useAddCertification, useDeleteCertification,
} from '../../hooks/useFormations'
import { useAuth } from '../../contexts/AuthContext'

function getDaysUntilExpiry(expiresAt) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ expiresAt }) {
  if (!expiresAt) return (
    <span className="text-[11px] text-white/20">Pas d'expiration</span>
  )
  const days = getDaysUntilExpiry(expiresAt)
  const date = new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  if (days < 0) return (
    <span className="text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
      <AlertTriangle size={10}/>Expirée
    </span>
  )
  if (days < 30) return (
    <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
      <Clock size={10}/>Exp. dans {days}j
    </span>
  )
  if (days < 90) return (
    <span className="text-[11px] text-yellow-400/70 flex items-center gap-1">
      <Calendar size={10}/>{date}
    </span>
  )
  return (
    <span className="text-[11px] text-white/25 flex items-center gap-1">
      <Calendar size={10}/>{date}
    </span>
  )
}

function AddCertificationModal({ onClose }) {
  const { profile } = useAuth()
  const addCert = useAddCertification()
  const [form, setForm] = useState({
    name:          '',
    issuer:        '',
    obtained_at:   new Date().toISOString().split('T')[0],
    expires_at:    '',
    credential_id: '',
    credential_url: '',
  })

  function handleChange(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.name || !form.issuer || !form.obtained_at) return
    await addCert.mutateAsync({
      ...form,
      user_id: profile.id,
      expires_at: form.expires_at || null,
      credential_id: form.credential_id || null,
      credential_url: form.credential_url || null,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="h-1" style={{ background: 'linear-gradient(90deg,#C9A227,#4F46E5)' }}/>

          <div className="p-5 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Ajouter une certification</h3>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={16}/>
            </button>
          </div>

          <div className="px-5 pb-5 space-y-3">
            {[
              { key: 'name',          label: 'Nom de la certification *', placeholder: 'ex: AWS Certified Solutions Architect' },
              { key: 'issuer',        label: 'Organisme délivrant *', placeholder: 'ex: Amazon Web Services' },
              { key: 'credential_id', label: 'Numéro de certificat',  placeholder: 'ex: ABC-123456' },
              { key: 'credential_url', label: 'Lien de vérification', placeholder: 'https://…' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-white/40 mb-1">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Date d'obtention *</label>
                <input
                  type="date"
                  value={form.obtained_at}
                  onChange={e => handleChange('obtained_at', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Date d'expiration</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => handleChange('expires_at', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-white/[0.07] text-sm text-white/40 hover:text-white/60 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.issuer || !form.obtained_at || addCert.isPending}
                className="flex-1 py-2.5 rounded-lg bg-indigo-500/80 hover:bg-indigo-500 text-sm font-semibold text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {addCert.isPending && <Loader2 size={14} className="animate-spin"/>}
                Ajouter
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function MyCertifications() {
  const { data: certs = [], isLoading } = useMyCertifications()
  const deleteCert = useDeleteCertification()
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const expiringSoon = certs.filter(c => {
    const days = getDaysUntilExpiry(c.expires_at)
    return days !== null && days > 0 && days < 60
  })

  const expired = certs.filter(c => {
    const days = getDaysUntilExpiry(c.expires_at)
    return days !== null && days < 0
  })

  return (
    <div className="space-y-4">
      {/* Header + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/40">
            {certs.length} certification{certs.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors border border-indigo-500/20">
          <Plus size={13}/>
          Ajouter
        </button>
      </div>

      {/* Alertes expiration */}
      {expiringSoon.length > 0 && (
        <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-amber-300">
            {expiringSoon.length} certification{expiringSoon.length > 1 ? 's expirent' : ' expire'} dans moins de 60 jours.
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-indigo-400"/>
        </div>
      )}

      {/* Empty */}
      {!isLoading && certs.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <Award size={32} className="text-white/10 mb-3"/>
          <p className="text-sm text-white/30">Aucune certification enregistrée.</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline">
            Ajouter ma première certification
          </button>
        </div>
      )}

      {/* Liste certifications */}
      <div className="space-y-2">
        {certs.map(cert => {
          const days = getDaysUntilExpiry(cert.expires_at)
          const isExpired = days !== null && days < 0
          const isExpiringSoon = days !== null && days > 0 && days < 60

          return (
            <motion.div
              key={cert.id}
              layout
              className="rounded-xl p-4 border flex items-start gap-3"
              style={{
                background: 'rgba(255,255,255,0.025)',
                borderColor: isExpired
                  ? 'rgba(239,68,68,0.2)'
                  : isExpiringSoon
                    ? 'rgba(245,158,11,0.2)'
                    : 'rgba(255,255,255,0.07)',
              }}>

              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isExpired ? 'bg-red-500/15' : 'bg-amber-500/15'
              }`}>
                <Award size={16} className={isExpired ? 'text-red-400' : 'text-amber-400'}/>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{cert.name}</p>
                    <p className="text-xs text-white/40 truncate">{cert.issuer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ExpiryBadge expiresAt={cert.expires_at}/>
                    <button
                      onClick={() => setConfirmDelete(cert.id)}
                      className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-white/30">
                    <Calendar size={10}/>
                    <span>Obtenu le {new Date(cert.obtained_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {cert.credential_id && (
                    <span className="text-[11px] text-white/20">#{cert.credential_id}</span>
                  )}
                  {cert.credential_url && (
                    <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                      <ExternalLink size={10}/>
                      Vérifier
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)}/>
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="relative rounded-2xl p-6 max-w-sm w-full space-y-4"
              style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-sm font-semibold text-white">Supprimer la certification ?</p>
              <p className="text-xs text-white/40">Cette action est irréversible.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2 rounded-lg border border-white/[0.07] text-sm text-white/40 hover:text-white/60 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    await deleteCert.mutateAsync(confirmDelete)
                    setConfirmDelete(null)
                  }}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-colors">
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add modal */}
      {showAdd && <AddCertificationModal onClose={() => setShowAdd(false)}/>}
    </div>
  )
}
