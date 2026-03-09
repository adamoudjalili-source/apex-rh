// ============================================================
// APEX RH — TaskFilters.jsx  ·  S125-A
// + Filtre tags, filtre "en retard", 7 statuts complets
// ============================================================
import { TASK_STATUS, TASK_PRIORITY } from '../../lib/taskHelpers'
import { useAllUsers } from '../../hooks/useTasks'
import { useTaskTags } from './TaskTagPicker'

export default function TaskFilters({ filters, updateFilter, resetFilters, hasActiveFilters }) {
  const { data: users = [] } = useAllUsers()
  const { data: tags  = [] } = useTaskTags()
  const selClass = 'px-2.5 py-1.5 text-sm bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Rechercher..." value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-48" />
        </div>

        {/* Statut */}
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className={selClass}>
          <option value="" className="bg-[#1a1a35] text-gray-200">Tous les statuts</option>
          {Object.entries(TASK_STATUS).map(([key, val]) => (
            <option key={key} value={key} className="bg-[#1a1a35] text-gray-200">{val.label}</option>
          ))}
        </select>

        {/* Priorité */}
        <select value={filters.priority} onChange={e => updateFilter('priority', e.target.value)} className={selClass}>
          <option value="" className="bg-[#1a1a35] text-gray-200">Toutes priorités</option>
          {Object.entries(TASK_PRIORITY).map(([key, val]) => (
            <option key={key} value={key} className="bg-[#1a1a35] text-gray-200">{val.icon} {val.label}</option>
          ))}
        </select>

        {/* Assigné */}
        <select value={filters.assignee_id} onChange={e => updateFilter('assignee_id', e.target.value)} className={selClass}>
          <option value="" className="bg-[#1a1a35] text-gray-200">Tous les assignés</option>
          {users.map(u => (
            <option key={u.id} value={u.id} className="bg-[#1a1a35] text-gray-200">{u.first_name} {u.last_name}</option>
          ))}
        </select>

        <input type="date" value={filters.due_date_from}
          onChange={e => updateFilter('due_date_from', e.target.value)}
          className={selClass} title="Échéance après" />
        <input type="date" value={filters.due_date_to}
          onChange={e => updateFilter('due_date_to', e.target.value)}
          className={selClass} title="Échéance avant" />

        {/* Filtre retard S125 */}
        <button onClick={() => updateFilter('overdue_only', !filters.overdue_only)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg transition-colors ${
            filters.overdue_only ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          }`}>
          ⚠ En retard
        </button>

        {hasActiveFilters && (
          <button onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tags S125 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-gray-500 mr-1">Tags :</span>
          {tags.map(tag => {
            const active = filters.tag_id === tag.id
            return (
              <button key={tag.id} onClick={() => updateFilter('tag_id', active ? '' : tag.id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all"
                style={{ background: active ? `${tag.color}33` : `${tag.color}11`, color: tag.color,
                         border: `1px solid ${active ? tag.color : tag.color + '33'}`, opacity: active ? 1 : 0.7 }}>
                {tag.name}{active && ' ✓'}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
