// ============================================================
// APEX RH — ProjectFilters.jsx
// Session 11 — Barre de recherche et filtres projets
// ============================================================
import { Search, X } from 'lucide-react'

export default function ProjectFilters({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })
  const hasFilters = filters.search || filters.status || filters.priority

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recherche */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
        <input
          type="text"
          placeholder="Rechercher un projet…"
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Statut */}
      <select
        value={filters.status || ''}
        onChange={(e) => update('status', e.target.value)}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
      >
        <option value="" className="bg-[#1a1a35]">Tous les statuts</option>
        <option value="planifie" className="bg-[#1a1a35]">Planifié</option>
        <option value="en_cours" className="bg-[#1a1a35]">En cours</option>
        <option value="en_pause" className="bg-[#1a1a35]">En pause</option>
        <option value="termine" className="bg-[#1a1a35]">Terminé</option>
        <option value="annule" className="bg-[#1a1a35]">Annulé</option>
      </select>

      {/* Priorité */}
      <select
        value={filters.priority || ''}
        onChange={(e) => update('priority', e.target.value)}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
      >
        <option value="" className="bg-[#1a1a35]">Toutes priorités</option>
        <option value="basse" className="bg-[#1a1a35]">Basse</option>
        <option value="moyenne" className="bg-[#1a1a35]">Moyenne</option>
        <option value="haute" className="bg-[#1a1a35]">Haute</option>
        <option value="critique" className="bg-[#1a1a35]">Critique</option>
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => onChange({ search: '', status: '', priority: '' })}
          className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          title="Effacer les filtres"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
