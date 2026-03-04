// ============================================================
// APEX RH — KeyResultForm.jsx
// Session 10 — Formulaire création / édition KR
// ✅ Session 16 — Fix reset formulaire à chaque ouverture (ajout isOpen dans useEffect)
// ============================================================
import { useState, useEffect } from 'react'
import { TrendingUp, X } from 'lucide-react'
import Modal from '../ui/Modal'
import { useCreateKeyResult, useUpdateKeyResult } from '../../hooks/useObjectives'
import { KR_TYPES } from '../../lib/objectiveHelpers'

export default function KeyResultForm({ isOpen, onClose, objectiveId, keyResult }) {
  const createKr = useCreateKeyResult()
  const updateKr = useUpdateKeyResult()
  const isEdit = !!keyResult

  const [form, setForm] = useState({
    title: '',
    description: '',
    kr_type: 'number',
    start_value: 0,
    target_value: 100,
    current_value: 0,
    weight: 1,
    unit: '',
  })

  // ✅ Session 16 — Ajout isOpen pour reset le formulaire à chaque ouverture
  useEffect(() => {
    if (keyResult) {
      setForm({
        title: keyResult.title || '',
        description: keyResult.description || '',
        kr_type: keyResult.kr_type || 'number',
        start_value: keyResult.start_value ?? 0,
        target_value: keyResult.target_value ?? 100,
        current_value: keyResult.current_value ?? 0,
        weight: keyResult.weight ?? 1,
        unit: keyResult.unit || '',
      })
    } else {
      setForm({
        title: '', description: '', kr_type: 'number',
        start_value: 0, target_value: 100, current_value: 0,
        weight: 1, unit: '',
      })
    }
  }, [keyResult, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        kr_type: form.kr_type,
        start_value: Number(form.start_value),
        target_value: form.kr_type === 'binary' ? 1 : Number(form.target_value),
        current_value: Number(form.current_value),
        weight: Number(form.weight),
        unit: form.unit.trim() || null,
      }

      if (isEdit) {
        await updateKr.mutateAsync({ id: keyResult.id, updates: payload })
      } else {
        await createKr.mutateAsync({ ...payload, objective_id: objectiveId })
      }
      onClose()
    } catch (err) {
      console.error('Erreur KR:', err)
    }
  }

  const isPending = createKr.isPending || updateKr.isPending
  const isBinary = form.kr_type === 'binary'

  if (!isOpen) return null

  return (
    <Modal onClose={onClose}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEdit ? 'Modifier le KR' : 'Nouveau Key Result'}
              </h2>
              <p className="text-xs text-white/30">Résultat clé mesurable</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ex: Réduire le temps de traitement à 2 min"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
              autoFocus
            />
          </div>

          {/* Type + Poids */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Type de mesure</label>
              <select
                value={form.kr_type}
                onChange={(e) => setForm({ ...form, kr_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              >
                {Object.entries(KR_TYPES).map(([key, val]) => (
                  <option key={key} value={key} className="bg-[#1a1a35]">
                    {val.icon} {val.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Poids</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Valeurs : Départ / Cible / Actuelle */}
          {!isBinary && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Départ</label>
                <input
                  type="number"
                  value={form.start_value}
                  onChange={(e) => setForm({ ...form, start_value: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Cible</label>
                <input
                  type="number"
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Actuelle</label>
                <input
                  type="number"
                  value={form.current_value}
                  onChange={(e) => setForm({ ...form, current_value: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          )}

          {/* Binaire : toggle */}
          {isBinary && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Réalisé ?</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, current_value: form.current_value >= 1 ? 0 : 1 })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.current_value >= 1
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-white/5 text-white/40 ring-1 ring-white/10'
                }`}
              >
                {form.current_value >= 1 ? '✓ Oui' : '✗ Non'}
              </button>
            </div>
          )}

          {/* Unité */}
          {!isBinary && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Unité (optionnel)</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="ex: clients, FCFA, %, jours…"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Détails, méthode de mesure…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isPending || !form.title.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {isPending ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Ajouter le KR'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}