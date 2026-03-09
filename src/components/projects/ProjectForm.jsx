// ============================================================
// APEX RH — ProjectForm.jsx
// Session 11 — Formulaire création / édition projet
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useCreateProject, useUpdateProject, useOrgStructure } from '../../hooks/useProjects'
import { TASK_STATUS } from '../../utils/constants'

const INITIAL = {
  name: '',
  description: '',
  status: 'planifie',
  priority: 'moyenne',
  start_date: '',
  end_date: '',
  budget: '',
  direction_id: '',
  division_id: '',
  service_id: '',
}

export default function ProjectForm({ isOpen, onClose, project = null }) {
  const { profile } = useAuth()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const { data: org } = useOrgStructure()

  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState('')

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planifie',
        priority: project.priority || 'moyenne',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget || '',
        direction_id: project.direction_id || '',
        division_id: project.division_id || '',
        service_id: project.service_id || '',
      })
    } else {
      setForm({
        ...INITIAL,
        direction_id: profile?.direction_id || '',
        division_id: profile?.division_id || '',
        service_id: profile?.service_id || '',
      })
    }
    setError('')
  }, [project, profile, isOpen])

  // Divisions filtrées par direction
  const filteredDivisions = useMemo(() => {
    if (!org?.divisions) return []
    if (!form.direction_id) return org.divisions
    return org.divisions.filter((d) => d.direction_id === form.direction_id)
  }, [org?.divisions, form.direction_id])

  // Services filtrés par division
  const filteredServices = useMemo(() => {
    if (!org?.services) return []
    if (!form.division_id) return org.services
    return org.services.filter((s) => s.division_id === form.division_id)
  }, [org?.services, form.division_id])

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Le nom du projet est obligatoire')
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? parseFloat(form.budget) : 0,
      direction_id: form.direction_id || null,
      division_id: form.division_id || null,
      service_id: form.service_id || null,
    }

    try {
      if (project) {
        await updateProject.mutateAsync({ id: project.id, updates: payload })
      } else {
        await createProject.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  const isSubmitting = createProject.isPending || updateProject.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-lg w-full">
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          {project ? 'Modifier le projet' : 'Nouveau projet'}
        </h2>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Nom */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Nom du projet *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
            placeholder="Ex : Migration ERP 2026"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
            placeholder="Objectifs, contexte…"
          />
        </div>

        {/* Statut + Priorité */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Statut</label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="planifie" className="bg-[#1a1a35]">Planifié</option>
              <option value=TASK_STATUS.EN_COURS className="bg-[#1a1a35]">En cours</option>
              <option value="en_pause" className="bg-[#1a1a35]">En pause</option>
              <option value=TASK_STATUS.TERMINE className="bg-[#1a1a35]">Terminé</option>
              <option value="annule" className="bg-[#1a1a35]">Annulé</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Priorité</label>
            <select
              value={form.priority}
              onChange={(e) => update('priority', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
            >
              <option value="basse" className="bg-[#1a1a35]">Basse</option>
              <option value="moyenne" className="bg-[#1a1a35]">Moyenne</option>
              <option value="haute" className="bg-[#1a1a35]">Haute</option>
              <option value="critique" className="bg-[#1a1a35]">Critique</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Date de début</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update('start_date', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Date de fin</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => update('end_date', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Budget (FCFA)</label>
          <input
            type="number"
            value={form.budget}
            onChange={(e) => update('budget', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
            placeholder="Ex : 5000000"
            min={0}
          />
        </div>

        {/* Organisation */}
        <div className="space-y-3">
          <p className="text-xs text-white/30 font-medium">Rattachement organisationnel</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Direction</label>
              <select
                value={form.direction_id}
                onChange={(e) => {
                  update('direction_id', e.target.value)
                  update('division_id', '')
                  update('service_id', '')
                }}
                className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a35]">—</option>
                {org?.directions?.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#1a1a35]">{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Division</label>
              <select
                value={form.division_id}
                onChange={(e) => {
                  update('division_id', e.target.value)
                  update('service_id', '')
                }}
                className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a35]">—</option>
                {filteredDivisions.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#1a1a35]">{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Service</label>
              <select
                value={form.service_id}
                onChange={(e) => update('service_id', e.target.value)}
                className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a35]">—</option>
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#1a1a35]">{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            {isSubmitting ? 'Enregistrement…' : project ? 'Modifier' : 'Créer le projet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
