// ============================================================
// APEX RH — src/components/talent/KeyPositionForm.jsx
// Session 51 — Formulaire création / édition poste clé
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Shield, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  useCreateKeyPosition,
  useUpdateKeyPosition,
  CRITICALITY_CONFIG,
} from '../../hooks/useSuccessionPlanning'

export default function KeyPositionForm({ position = null, onClose, onSuccess }) {
  const isEdit = !!position

  const [form, setForm] = useState({
    title:                  position?.title || '',
    description:            position?.description || '',
    criticality_level:      position?.criticality_level || 'medium',
    vacancy_horizon_months: position?.vacancy_horizon_months || 12,
    division_id:            position?.division_id || '',
    direction_id:           position?.direction_id || '',
    current_holder_id:      position?.current_holder_id || '',
  })

  const [divisions,  setDivisions]  = useState([])
  const [directions, setDirections] = useState([])
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(false)

  const createPos = useCreateKeyPosition()
  const updatePos = useUpdateKeyPosition()

  useEffect(() => {
    const fetch = async () => {
      const [{ data: divs }, { data: dirs }, { data: usrs }] = await Promise.all([
        supabase.from('divisions').select('id,name').order('name'),
        supabase.from('directions').select('id,name').order('name'),
        supabase.from('users').select('id,first_name,last_name,role')
          .eq('is_active', true)
          .in('role', ['directeur','chef_division','chef_service','collaborateur'])
          .order('last_name'),
      ])
      setDivisions(divs || [])
      setDirections(dirs || [])
      setUsers(usrs || [])
    }
    fetch()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        division_id:       form.division_id       || null,
        direction_id:      form.direction_id      || null,
        current_holder_id: form.current_holder_id || null,
        vacancy_horizon_months: Number(form.vacancy_horizon_months) || 12,
      }
      if (isEdit) {
        await updatePos.mutateAsync({ id: position.id, ...payload })
      } else {
        await createPos.mutateAsync(payload)
      }
      onSuccess?.()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 110 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(17,17,34,0.99) 0%, rgba(11,11,22,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <Shield size={15} style={{ color: '#8B5CF6' }} />
            <h2 className="text-sm font-bold text-white">
              {isEdit ? 'Modifier le poste clé' : 'Nouveau poste clé'}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all">
            <X size={14} className="text-white/50" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Intitulé du poste *</label>
            <input
              required
              value={form.title}
              onChange={e => field('title', e.target.value)}
              placeholder="Ex : Directeur Technique, DRH..."
              className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Criticité */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Criticité</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(CRITICALITY_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => field('criticality_level', k)}
                  className="py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: form.criticality_level === k ? v.bg : 'rgba(255,255,255,0.03)',
                    color: form.criticality_level === k ? v.color : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${form.criticality_level === k ? v.color + '50' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Division */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Division</label>
              <select
                value={form.division_id}
                onChange={e => field('division_id', e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">— Aucune —</option>
                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Direction</label>
              <select
                value={form.direction_id}
                onChange={e => field('direction_id', e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">— Aucune —</option>
                {directions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Titulaire + Horizon */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Titulaire actuel</label>
              <select
                value={form.current_holder_id}
                onChange={e => field('current_holder_id', e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">— Aucun —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Horizon vacance (mois)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.vacancy_horizon_months}
                onChange={e => field('vacancy_horizon_months', e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Description (optionnel)</label>
            <textarea
              value={form.description}
              onChange={e => field('description', e.target.value)}
              rows={2}
              placeholder="Responsabilités clés, compétences requises..."
              className="w-full rounded-xl px-3 py-2 text-xs text-white resize-none placeholder-white/20 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/40 hover:bg-white/5 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !form.title.trim()}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'rgba(139,92,246,0.25)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.35)' }}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: '#8B5CF6' }} />
                  Enregistrement...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check size={13} />
                  {isEdit ? 'Mettre à jour' : 'Créer le poste'}
                </span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
