// ============================================================
// APEX RH — TaskFilters.jsx
// ✅ Session 9 — Corrigé : select styling, filtre date_from ajouté
// ============================================================
import { TASK_STATUS, TASK_PRIORITY } from '../../lib/taskHelpers'
import { useAllUsers } from '../../hooks/useTasks'

export default function TaskFilters({ filters, updateFilter, resetFilters, hasActiveFilters }) {
  const { data: users = [] } = useAllUsers()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recherche */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher..."
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          className="pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-48"
        />
      </div>

      {/* ✅ FIX Bug 7 : select avec bg et text explicites */}
      <select
        value={filters.status}
        onChange={e => updateFilter('status', e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option value="" className="bg-[#1a1a35] text-gray-200">Tous les statuts</option>
        {Object.entries(TASK_STATUS).map(([key, val]) => (
          <option key={key} value={key} className="bg-[#1a1a35] text-gray-200">{val.label}</option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={e => updateFilter('priority', e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option value="" className="bg-[#1a1a35] text-gray-200">Toutes priorités</option>
        {Object.entries(TASK_PRIORITY).map(([key, val]) => (
          <option key={key} value={key} className="bg-[#1a1a35] text-gray-200">{val.icon} {val.label}</option>
        ))}
      </select>

      <select
        value={filters.assignee_id}
        onChange={e => updateFilter('assignee_id', e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option value="" className="bg-[#1a1a35] text-gray-200">Tous les assignés</option>
        {users.map(u => (
          <option key={u.id} value={u.id} className="bg-[#1a1a35] text-gray-200">{u.first_name} {u.last_name}</option>
        ))}
      </select>

      {/* ✅ FIX Bug 3 : ajout du filtre date_from */}
      <input
        type="date"
        value={filters.due_date_from}
        onChange={e => updateFilter('due_date_from', e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500"
        title="Échéance après"
      />
      <input
        type="date"
        value={filters.due_date_to}
        onChange={e => updateFilter('due_date_to', e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500"
        title="Échéance avant"
      />

      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Réinitialiser
        </button>
      )}
    </div>
  )
}
