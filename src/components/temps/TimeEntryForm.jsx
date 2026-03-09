// ============================================================
// APEX RH — src/components/temps/TimeEntryForm.jsx
// Session 66 — Formulaire ajout/édition ligne de temps
// ============================================================
import { useState } from 'react'
import { X, Save, Briefcase, CheckSquare } from 'lucide-react'
import { useAddTimeEntry, useUpdateTimeEntry, ENTRY_TYPE_LABELS } from '../../hooks/useTemps'
import { useProjects } from '../../hooks/useProjects'
import { useTasks }    from '../../hooks/useTasks'

const ENTRY_TYPES = ['regular', 'overtime', 'project', 'task']

export default function TimeEntryForm({ timesheetId, entryDate, entry = null, onClose }) {
  const isEdit = !!entry

  const [date,        setDate]        = useState(entry?.entry_date || entryDate || '')
  const [hours,       setHours]       = useState(entry?.hours ? String(entry.hours) : '')
  const [entryType,   setEntryType]   = useState(entry?.entry_type || 'regular')
  const [projectId,   setProjectId]   = useState(entry?.project_id || '')
  const [taskId,      setTaskId]      = useState(entry?.task_id || '')
  const [description, setDescription] = useState(entry?.description || '')
  const [error,       setError]       = useState('')

  const addEntry    = useAddTimeEntry()
  const updateEntry = useUpdateTimeEntry()
  const { data: projects = [] } = useProjects()
  const { data: allTasks = [] } = useTasks()

  const projectTasks = taskId ? allTasks : (projectId ? allTasks.filter(t => t.project_id === projectId) : allTasks)

  const loading = addEntry.isPending || updateEntry.isPending

  const handleSubmit = async () => {
    setError('')
    if (!date) return setError('La date est requise.')
    const h = parseFloat(hours)
    if (!h || h <= 0 || h > 24) return setError('Saisissez un nombre d\'heures valide (0.5 à 24).')

    try {
      if (isEdit) {
        await updateEntry.mutateAsync({
          id: entry.id, timesheetId,
          entry_date: date, hours: h, entry_type: entryType,
          project_id: projectId || null,
          task_id:    taskId    || null,
          description: description || null,
        })
      } else {
        await addEntry.mutateAsync({
          timesheetId, entryDate: date,
          hours: h, entryType,
          projectId: projectId || undefined,
          taskId:    taskId    || undefined,
          description: description || undefined,
        })
      }
      onClose?.()
    } catch (e) {
      setError(e.message || 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] p-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          {isEdit ? 'Modifier l\'entrée' : 'Ajouter des heures'}
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
            <X size={15}/>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Date */}
        <div>
          <label className="block text-xs text-white/40 mb-1">Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {/* Heures + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Heures *</label>
            <input type="number" min="0.5" max="24" step="0.5"
              value={hours} onChange={e => setHours(e.target.value)}
              placeholder="8"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Type</label>
            <select value={entryType} onChange={e => setEntryType(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors">
              {ENTRY_TYPES.map(t => (
                <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Projet */}
        {(entryType === 'project' || entryType === 'task') && (
          <div>
            <label className="block text-xs text-white/40 mb-1 flex items-center gap-1">
              <Briefcase size={11}/> Projet
            </label>
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setTaskId('') }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors">
              <option value="">— Sélectionner un projet —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Tâche */}
        {entryType === 'task' && (
          <div>
            <label className="block text-xs text-white/40 mb-1 flex items-center gap-1">
              <CheckSquare size={11}/> Tâche
            </label>
            <select value={taskId} onChange={e => setTaskId(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50 transition-colors">
              <option value="">— Sélectionner une tâche —</option>
              {projectTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs text-white/40 mb-1">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Activité réalisée…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          {onClose && (
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] transition-all">
              Annuler
            </button>
          )}
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
            {loading
              ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
              : <><Save size={13}/> {isEdit ? 'Modifier' : 'Ajouter'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
