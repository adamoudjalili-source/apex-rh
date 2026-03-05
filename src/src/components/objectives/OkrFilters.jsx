// ============================================================
// APEX RH — OkrFilters.jsx
// Session 10 — Filtres pour les objectifs
// ============================================================
import { Search, Filter, X } from 'lucide-react'
import { OBJECTIVE_LEVELS, OBJECTIVE_STATUS, LEVEL_ORDER } from '../../lib/objectiveHelpers'

export default function OkrFilters({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })
  const hasFilters = filters.level || filters.status || filters.search

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recherche */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Rechercher un objectif…"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Filtre niveau */}
      <select
        value={filters.level || ''}
        onChange={(e) => update('level', e.target.value)}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
      >
        <option value="" className="bg-[#1a1a35]">Tous les niveaux</option>
        {LEVEL_ORDER.map((lvl) => (
          <option key={lvl} value={lvl} className="bg-[#1a1a35]">
            {OBJECTIVE_LEVELS[lvl].icon} {OBJECTIVE_LEVELS[lvl].label}
          </option>
        ))}
      </select>

      {/* Filtre statut */}
      <select
        value={filters.status || ''}
        onChange={(e) => update('status', e.target.value)}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
      >
        <option value="" className="bg-[#1a1a35]">Tous les statuts</option>
        {Object.entries(OBJECTIVE_STATUS).map(([key, val]) => (
          <option key={key} value={key} className="bg-[#1a1a35]">
            {val.label}
          </option>
        ))}
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={() => onChange({ search: '', level: '', status: '' })}
          className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-colors"
          title="Effacer les filtres"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
