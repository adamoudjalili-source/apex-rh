// ============================================================
// APEX RH — RecurrenceConfig.jsx
// Configuration de la récurrence d'une tâche
// Session 77 — Dépendances + récurrence + charge
// ============================================================
import { useState, useEffect } from 'react'
import { useTaskRecurrence, useCreateRecurrence, useUpdateRecurrence, useDeleteRecurrence } from '../../hooks/useTasks'

const FREQ_OPTIONS = [
  { value: 'daily',   label: 'Quotidienne' },
  { value: 'weekly',  label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'custom',  label: 'Personnalisée' },
]

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function humanReadable(rec) {
  if (!rec) return 'Aucune récurrence'
  const freq = FREQ_OPTIONS.find(f => f.value === rec.frequency)?.label || rec.frequency
  let str = `${freq}`
  if (rec.interval_value > 1) str = `Toutes les ${rec.interval_value} ${rec.frequency === 'daily' ? 'jours' : rec.frequency === 'weekly' ? 'semaines' : 'mois'}`
  if (rec.days_of_week?.length) {
    str += ` · ${rec.days_of_week.map(d => DAYS[d]).join(', ')}`
  }
  if (rec.end_date) str += ` · Jusqu'au ${new Date(rec.end_date).toLocaleDateString('fr-FR')}`
  if (rec.max_occurrences) str += ` · ${rec.max_occurrences} occurrences max`
  return str
}

export default function RecurrenceConfig({ taskId }) {
  const { data: recurrence, isLoading } = useTaskRecurrence(taskId)
  const createRec = useCreateRecurrence()
  const updateRec = useUpdateRecurrence()
  const deleteRec = useDeleteRecurrence()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    frequency: 'weekly',
    interval_value: 1,
    days_of_week: [],
    day_of_month: null,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    max_occurrences: '',
  })

  useEffect(() => {
    if (recurrence) {
      setForm({
        frequency: recurrence.frequency,
        interval_value: recurrence.interval_value,
        days_of_week: recurrence.days_of_week || [],
        day_of_month: recurrence.day_of_month || null,
        start_date: recurrence.start_date,
        end_date: recurrence.end_date || '',
        max_occurrences: recurrence.max_occurrences || '',
      })
    }
  }, [recurrence])

  const toggleDay = (d) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d].sort()
    }))
  }

  const handleSave = async () => {
    const payload = {
      task_id: taskId,
      frequency: form.frequency,
      interval_value: parseInt(form.interval_value) || 1,
      days_of_week: form.days_of_week.length ? form.days_of_week : null,
      day_of_month: form.day_of_month || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      max_occurrences: form.max_occurrences ? parseInt(form.max_occurrences) : null,
      is_active: true,
    }
    if (recurrence) {
      await updateRec.mutateAsync({ id: recurrence.id, taskId, ...payload })
    } else {
      await createRec.mutateAsync(payload)
    }
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!recurrence) return
    if (!confirm('Supprimer la récurrence ?')) return
    await deleteRec.mutateAsync({ id: recurrence.id, taskId })
    setEditing(false)
  }

  if (isLoading) {
    return <div className="h-24 flex items-center justify-center text-gray-500 text-sm">Chargement…</div>
  }

  return (
    <div className="space-y-4">
      {/* Résumé actuel */}
      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${recurrence ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
            🔄
          </div>
          <div>
            <div className={`text-sm font-medium ${recurrence ? 'text-indigo-300' : 'text-gray-400'}`}>
              {recurrence ? 'Récurrence active' : 'Pas de récurrence'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{humanReadable(recurrence)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recurrence && (
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all"
            >
              Supprimer
            </button>
          )}
          <button
            onClick={() => setEditing(v => !v)}
            className="text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg transition-all"
          >
            {editing ? 'Fermer' : recurrence ? 'Modifier' : 'Configurer'}
          </button>
        </div>
      </div>

      {/* Formulaire */}
      {editing && (
        <div className="p-4 bg-[#13103a] border border-indigo-500/20 rounded-xl space-y-4">
          {/* Fréquence */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Fréquence</label>
            <div className="flex gap-2 flex-wrap">
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, frequency: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.frequency === opt.value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intervalle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Intervalle</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={52}
                  value={form.interval_value}
                  onChange={e => setForm(f => ({ ...f, interval_value: e.target.value }))}
                  className="w-16 bg-[#1a1635] border border-white/10 text-white text-sm rounded-lg px-2 py-1.5 text-center"
                />
                <span className="text-xs text-gray-400">
                  {form.frequency === 'daily' ? 'jour(s)' : form.frequency === 'weekly' ? 'semaine(s)' : 'mois'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date de début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full bg-[#1a1635] border border-white/10 text-white text-sm rounded-lg px-2 py-1.5"
              />
            </div>
          </div>

          {/* Jours de la semaine (si weekly) */}
          {(form.frequency === 'weekly' || form.frequency === 'custom') && (
            <div>
              <label className="block text-xs text-gray-400 mb-2">Jours de la semaine</label>
              <div className="flex gap-1.5">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium border transition-all ${
                      form.days_of_week.includes(i)
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jour du mois (si monthly) */}
          {form.frequency === 'monthly' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Jour du mois</label>
              <input
                type="number" min={1} max={31}
                value={form.day_of_month || ''}
                placeholder="ex: 15"
                onChange={e => setForm(f => ({ ...f, day_of_month: parseInt(e.target.value) || null }))}
                className="w-24 bg-[#1a1635] border border-white/10 text-white text-sm rounded-lg px-2 py-1.5"
              />
            </div>
          )}

          {/* Fin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date de fin (optionnel)</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-[#1a1635] border border-white/10 text-white text-sm rounded-lg px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Max occurrences (optionnel)</label>
              <input
                type="number" min={1}
                value={form.max_occurrences}
                placeholder="illimitées"
                onChange={e => setForm(f => ({ ...f, max_occurrences: e.target.value }))}
                className="w-full bg-[#1a1635] border border-white/10 text-white text-sm rounded-lg px-2 py-1.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={createRec.isPending || updateRec.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all"
            >
              {(createRec.isPending || updateRec.isPending) ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-200">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Prochaines occurrences (preview) */}
      {recurrence && !editing && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Prochaines occurrences</div>
          <div className="flex gap-2 flex-wrap">
            {computeNextOccurrences(recurrence, 5).map((d, i) => (
              <span key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-lg">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function computeNextOccurrences(rec, count) {
  const dates = []
  let current = new Date(rec.last_generated || rec.start_date)
  const end = rec.end_date ? new Date(rec.end_date) : null
  let iterations = 0
  while (dates.length < count && iterations < 200) {
    iterations++
    // Avancer d'un intervalle
    if (rec.frequency === 'daily') {
      current = new Date(current.getTime() + rec.interval_value * 86400000)
    } else if (rec.frequency === 'weekly') {
      current = new Date(current.getTime() + rec.interval_value * 7 * 86400000)
    } else if (rec.frequency === 'monthly') {
      const d = new Date(current)
      d.setMonth(d.getMonth() + rec.interval_value)
      if (rec.day_of_month) d.setDate(rec.day_of_month)
      current = d
    } else {
      current = new Date(current.getTime() + rec.interval_value * 86400000)
    }
    if (current < new Date()) continue
    if (end && current > end) break
    dates.push(current.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }))
  }
  return dates
}
