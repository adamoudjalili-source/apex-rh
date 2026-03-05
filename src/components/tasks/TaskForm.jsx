// ============================================================
// APEX RH — TaskForm.jsx
// ✅ Session 9  — Corrigé : auto-assignation créateur, log intelligent
// ✅ Session 39 — Ajout pondération tâches (4 critères × 1–5)
// ============================================================
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCreateTask, useUpdateTask, useAllUsers } from '../../hooks/useTasks'
import { TASK_STATUS, TASK_PRIORITY, getUserFullName } from '../../lib/taskHelpers'
import { supabase } from '../../lib/supabase'
import TaskWeightForm from './TaskWeightForm'

export default function TaskForm({ task = null, onClose, defaultStatus = 'backlog' }) {
  // ✅ FIX Bug 1 : utiliser profile pour id et infos
  const { profile } = useAuth()
  const { data: users = [] } = useAllUsers()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const [services, setServices] = useState([])
  const [divisions, setDivisions] = useState([])

  // Pré-remplir division/service selon le profil connecté (sauf admin)
  const isAdmin = profile?.role === 'administrateur'
  const isDirecteur = profile?.role === 'directeur'

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || defaultStatus,
    priority: task?.priority || 'normale',
    due_date: task?.due_date || '',
    start_date: task?.start_date || '',
    estimated_hours: task?.estimated_hours || '',
    service_id: task?.service_id || (!task && profile?.service_id ? profile.service_id : ''),
    division_id: task?.division_id || (!task && profile?.division_id ? profile.division_id : ''),
    direction_id: task?.direction_id || (!task && profile?.direction_id ? profile.direction_id : ''),
  })

  // S39 — Pondération
  const [weights, setWeights] = useState({
    weight_complexity: task?.weight_complexity ?? 1,
    weight_impact:     task?.weight_impact     ?? 1,
    weight_urgency:    task?.weight_urgency    ?? 1,
    weight_strategic:  task?.weight_strategic  ?? 1,
  })
  const [showWeight, setShowWeight] = useState(false)

  // ✅ FIX Bug 5 : auto-assignation du créateur pour une nouvelle tâche
  const [assigneeIds, setAssigneeIds] = useState(
    task
      ? (task.task_assignees?.map(a => a.user_id) || [])
      : (profile?.id ? [profile.id] : [])
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadOrgData() {
      let divsQuery = supabase.from('divisions').select('id, name').eq('is_active', true).order('name')
      let svcsQuery = supabase.from('services').select('id, name, division_id').eq('is_active', true).order('name')

      // Filtrer selon le rôle
      if (!isAdmin && !isDirecteur) {
        // Chef de division, chef de service, collaborateur → leur division uniquement
        if (profile?.division_id) {
          divsQuery = divsQuery.eq('id', profile.division_id)
          svcsQuery = svcsQuery.eq('division_id', profile.division_id)
        }
      } else if (isDirecteur && profile?.direction_id) {
        // Directeur → divisions de sa direction
        const { data: dirDivs } = await supabase
          .from('divisions')
          .select('id')
          .eq('direction_id', profile.direction_id)
          .eq('is_active', true)
        const divIds = (dirDivs || []).map(d => d.id)
        if (divIds.length > 0) {
          divsQuery = divsQuery.in('id', divIds)
          svcsQuery = svcsQuery.in('division_id', divIds)
        }
      }

      const [{ data: divs }, { data: svcs }] = await Promise.all([divsQuery, svcsQuery])
      setDivisions(divs || [])
      setServices(svcs || [])
    }
    loadOrgData()
  }, [profile])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleAssignee(uid) {
    setAssigneeIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Le titre est obligatoire'); return }
    setError('')
    setLoading(true)

    try {
      const taskData = {
        ...form,
        due_date: form.due_date || null,
        start_date: form.start_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        service_id: form.service_id || null,
        division_id: form.division_id || null,
        direction_id: form.direction_id || null,
        ...weights,
      }

      if (task) {
        // ✅ FIX Bug 9 : détecter quel champ a changé et logger correctement
        let logAction = null, logOld = null, logNew = null

        if (form.title !== task.title) {
          logAction = 'title_changed'
          logOld = task.title
          logNew = form.title
        } else if (form.priority !== task.priority) {
          logAction = 'priority_changed'
          logOld = task.priority
          logNew = form.priority
        } else if (form.due_date !== (task.due_date || '')) {
          logAction = 'due_date_changed'
          logOld = task.due_date || 'non définie'
          logNew = form.due_date || 'non définie'
        } else if (form.status !== task.status) {
          logAction = 'status_changed'
          logOld = task.status
          logNew = form.status
        }

        await updateTask.mutateAsync({
          taskId: task.id,
          updates: taskData,
          logAction,
          logOld,
          logNew,
        })
      } else {
        await createTask.mutateAsync({ taskData, assigneeIds })
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Titre */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Titre *</label>
        <input
          autoFocus
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Nom de la tâche..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Décrivez la tâche..."
          rows={3}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none"
        />
      </div>

      {/* Statut + Priorité */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Statut</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
          >
            {Object.entries(TASK_STATUS).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#1a1a35] text-gray-200">{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Priorité</label>
          <select
            value={form.priority}
            onChange={e => set('priority', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
          >
            {Object.entries(TASK_PRIORITY).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#1a1a35] text-gray-200">{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Date de début</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => set('start_date', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Date d'échéance</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Heures estimées */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Heures estimées</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={form.estimated_hours}
          onChange={e => set('estimated_hours', e.target.value)}
          placeholder="ex: 4.5"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Organisation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Division</label>
          <select
            value={form.division_id}
            onChange={e => set('division_id', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
          >
            <option value="" className="bg-[#1a1a35] text-gray-200">— Aucune —</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id} className="bg-[#1a1a35] text-gray-200">{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Service</label>
          <select
            value={form.service_id}
            onChange={e => set('service_id', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 text-sm"
          >
            <option value="" className="bg-[#1a1a35] text-gray-200">— Aucun —</option>
            {services.map(s => (
              <option key={s.id} value={s.id} className="bg-[#1a1a35] text-gray-200">{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignés */}

      {/* S39 — Pondération tâche */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <button
          type="button"
          onClick={() => setShowWeight(p => !p)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          style={{ background: 'rgba(99,102,241,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span>⚖️</span>
            <span>Pondération de la tâche</span>
          </div>
          <span className="text-white/40 text-xs">{showWeight ? "▲ Réduire" : "▼ Configurer"}</span>
        </button>
        {showWeight && (
          <div className="p-3">
            <TaskWeightForm
              weights={weights}
              onChange={setWeights}
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Assignés ({assigneeIds.length} sélectionné{assigneeIds.length !== 1 ? 's' : ''})
        </label>
        <div className="max-h-36 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2 bg-white/3">
          {users.map(u => (
            <label
              key={u.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                assigneeIds.includes(u.id) ? 'bg-indigo-500/20' : 'hover:bg-white/5'
              }`}
            >
              <input
                type="checkbox"
                checked={assigneeIds.includes(u.id)}
                onChange={() => toggleAssignee(u.id)}
                className="accent-indigo-500"
              />
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {u.first_name?.[0]}{u.last_name?.[0]}
              </div>
              <span className="text-sm text-gray-300">{getUserFullName(u)}</span>
              <span className="ml-auto text-[10px] text-gray-500">{u.role}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enregistrement...' : task ? 'Modifier' : 'Créer la tâche'}
        </button>
      </div>
    </form>
  )
}