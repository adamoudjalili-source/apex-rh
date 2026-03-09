// ============================================================
// APEX RH — ObjectiveForm.jsx
// Session 10 — Formulaire création / édition objectif
// ============================================================
import { useState, useEffect } from 'react'
import { Target, X } from 'lucide-react'
import Modal from '../ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useCreateObjective, useUpdateObjective, useAllUsersForOkr } from '../../hooks/useObjectives'
import { OBJECTIVE_LEVELS, getAllowedLevels, OBJECTIVE_STATUS, LEVEL_ORDER } from '../../lib/objectiveHelpers'
import { ROLES } from '../../utils/constants'

export default function ObjectiveForm({ isOpen, onClose, periodId, objective, parentObjectives = [] }) {
  const { profile } = useAuth()
  const { data: users = [] } = useAllUsersForOkr()
  const createObj = useCreateObjective()
  const updateObj = useUpdateObjective()

  const isEdit = !!objective
  const allowedLevels = getAllowedLevels(profile?.role)

  const [form, setForm] = useState({
    title: '',
    description: '',
    level: allowedLevels[0] || 'individuel',
    status: 'brouillon',
    parent_objective_id: null,
    owner_id: profile?.id || '',
    direction_id: profile?.direction_id || '',
    division_id: profile?.division_id || '',
    service_id: profile?.service_id || '',
  })

  useEffect(() => {
    if (objective) {
      setForm({
        title: objective.title || '',
        description: objective.description || '',
        level: objective.level || 'individuel',
        status: objective.status || 'brouillon',
        parent_objective_id: objective.parent_objective_id || null,
        owner_id: objective.owner_id || profile?.id || '',
        direction_id: objective.direction_id || profile?.direction_id || '',
        division_id: objective.division_id || profile?.division_id || '',
        service_id: objective.service_id || profile?.service_id || '',
      })
    } else {
      setForm((f) => ({
        ...f,
        title: '',
        description: '',
        level: allowedLevels[0] || 'individuel',
        status: 'brouillon',
        parent_objective_id: null,
        owner_id: profile?.id || '',
      }))
    }
  }, [objective, profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    try {
      if (isEdit) {
        await updateObj.mutateAsync({
          id: objective.id,
          updates: {
            title: form.title.trim(),
            description: form.description.trim() || null,
            level: form.level,
            status: form.status,
            parent_objective_id: form.parent_objective_id || null,
            owner_id: form.owner_id,
            direction_id: form.direction_id || null,
            division_id: form.division_id || null,
            service_id: form.service_id || null,
          },
        })
      } else {
        await createObj.mutateAsync({
          title: form.title.trim(),
          description: form.description.trim() || null,
          level: form.level,
          status: form.status,
          period_id: periodId,
          parent_objective_id: form.parent_objective_id || null,
          owner_id: form.owner_id,
          direction_id: form.direction_id || null,
          division_id: form.division_id || null,
          service_id: form.service_id || null,
        })
      }
      onClose()
    } catch (err) {
    }
  }

  // Parents possibles : objectifs de niveau supérieur
  const levelIndex = LEVEL_ORDER.indexOf(form.level)
  const possibleParents = parentObjectives.filter((o) => {
    const parentIndex = LEVEL_ORDER.indexOf(o.level)
    return parentIndex < levelIndex
  })

  // Filtrer les propriétaires selon le niveau
  const filteredOwners = users.filter((u) => {
    if (form.level === 'strategique') return u.role === ROLES.DIRECTEUR
    if (form.level === 'division') return u.role === ROLES.CHEF_DIVISION
    if (form.level === 'service') return u.role === ROLES.CHEF_SERVICE
    if (form.level === 'individuel') return true
    return true
  })

  const isPending = createObj.isPending || updateObj.isPending

  if (!isOpen) return null

  return (
    <Modal onClose={onClose}>
      <div className="w-full max-w-lg">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Target size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEdit ? 'Modifier l\'objectif' : 'Nouvel objectif'}
              </h2>
              <p className="text-xs text-white/30">
                {isEdit ? 'Mettre à jour les informations' : 'Définir un nouvel objectif OKR'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Titre de l'objectif *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ex: Augmenter la satisfaction client de 20%"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Contexte, enjeux, résultat attendu…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
            />
          </div>

          {/* Ligne : Niveau + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Niveau *</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value, parent_objective_id: null })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              >
                {allowedLevels.map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-[#1a1a35]">
                    {OBJECTIVE_LEVELS[lvl].icon} {OBJECTIVE_LEVELS[lvl].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              >
                {Object.entries(OBJECTIVE_STATUS).map(([key, val]) => (
                  <option key={key} value={key} className="bg-[#1a1a35]">
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objectif parent */}
          {possibleParents.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Objectif parent (alignement)</label>
              <select
                value={form.parent_objective_id || ''}
                onChange={(e) => setForm({ ...form, parent_objective_id: e.target.value || null })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              >
                <option value="" className="bg-[#1a1a35]">— Aucun parent —</option>
                {possibleParents.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a35]">
                    {OBJECTIVE_LEVELS[p.level]?.icon} {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Propriétaire */}
          {form.level === 'individuel' && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Propriétaire</label>
              <select
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              >
                {filteredOwners.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[#1a1a35]">
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !form.title.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer l\'objectif'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
