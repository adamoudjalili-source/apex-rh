// ============================================================
// APEX RH — CycleForm.jsx · S121
// Formulaire création/édition cycle OKR — extrait de OKRCycleManager
// ============================================================
import { useState } from 'react'

const CADENCE_LABELS = {
  quarterly:  'Trimestriel',
  semestrial: 'Semestriel',
  annual:     'Annuel',
  custom:     'Personnalisé',
}

export default function CycleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    cadence:     initial?.cadence     || 'quarterly',
    start_date:  initial?.start_date  || '',
    end_date:    initial?.end_date    || '',
    description: initial?.description || '',
  })

  function handleChange(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function prefillDates(cadence) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    let start, end
    if (cadence === 'quarterly') {
      const qStart = Math.floor(month / 3) * 3
      start = new Date(year, qStart, 1)
      end   = new Date(year, qStart + 3, 0)
    } else if (cadence === 'semestrial') {
      start = month < 6 ? new Date(year, 0, 1)  : new Date(year, 6, 1)
      end   = month < 6 ? new Date(year, 6, 0)  : new Date(year, 12, 0)
    } else if (cadence === 'annual') {
      start = new Date(year, 0, 1)
      end   = new Date(year, 12, 0)
    }
    if (start && end) {
      handleChange('start_date', start.toISOString().split('T')[0])
      handleChange('end_date',   end.toISOString().split('T')[0])
    }
    handleChange('cadence', cadence)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nom du cycle *</label>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          placeholder="ex: Q1 2026, S1 2026…"
          value={form.name}
          onChange={e => handleChange('name', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Cadence</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(CADENCE_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => prefillDates(k)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                form.cadence === k
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Début *</label>
          <input type="date"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            value={form.start_date} onChange={e => handleChange('start_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fin *</label>
          <input type="date"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            value={form.end_date} onChange={e => handleChange('end_date', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="Objectif stratégique du cycle…"
          value={form.description} onChange={e => handleChange('description', e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
          Annuler
        </button>
        <button
          onClick={() => form.name && form.start_date && form.end_date && onSave(form)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {initial ? 'Mettre à jour' : 'Créer le cycle'}
        </button>
      </div>
    </div>
  )
}
