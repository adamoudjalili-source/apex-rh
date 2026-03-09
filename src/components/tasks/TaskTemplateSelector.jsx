// ============================================================
// APEX RH — TaskTemplateSelector.jsx  ·  S128
// Modal de sélection d'un template pour pré-remplir TaskForm
// Props : onSelect(template) · onClose()
// ============================================================
import { useState } from 'react'
import { useTaskTemplates, TEMPLATE_CATEGORIES, getCategoryInfo } from '../../hooks/useTaskTemplates'

export default function TaskTemplateSelector({ onSelect, onClose }) {
  const { data: templates = [], isLoading } = useTaskTemplates()
  const [search,      setSearch]   = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = templates.filter(t => {
    const matchSearch   = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'all' || t.category === activeCategory
    return matchSearch && matchCategory
  })

  // Grouper par catégorie si "all"
  const grouped = activeCategory === 'all'
    ? TEMPLATE_CATEGORIES.reduce((acc, cat) => {
        const items = filtered.filter(t => t.category === cat.id)
        if (items.length > 0) acc.push({ ...cat, items })
        return acc
      }, [])
    : [{ ...getCategoryInfo(activeCategory), items: filtered }]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0F0F23] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-white">Choisir un template</h2>
              <p className="text-xs text-gray-500 mt-0.5">La tâche sera pré-remplie avec les informations du template</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white transition-colors rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Recherche + Filtres catégorie */}
          <div className="px-6 py-3 border-b border-white/5 shrink-0 space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un template..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 text-xs rounded-full shrink-0 transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >Tous</button>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 text-xs rounded-full shrink-0 transition-colors flex items-center gap-1 ${activeCategory === cat.id ? 'text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des templates */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-medium text-gray-400">Aucun template disponible</p>
                <p className="text-xs text-gray-600 mt-1">Les templates sont créés par les RH ou managers</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm text-gray-400">Aucun résultat pour "{search}"</p>
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{group.icon}</span>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</h3>
                    <span className="text-xs text-gray-600">({group.items.length})</span>
                  </div>
                  <div className="grid gap-2">
                    {group.items.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onSelect(template)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 shrink-0 flex items-center justify-between">
            <span className="text-xs text-gray-600">{filtered.length} template{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Créer sans template
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function TemplateCard({ template, onSelect }) {
  const catInfo = getCategoryInfo(template.category)
  const itemCount = template.task_template_items?.length || 0

  return (
    <button
      onClick={onSelect}
      className="w-full text-left flex items-start gap-3 px-4 py-3 bg-white/3 border border-white/8 rounded-xl hover:border-indigo-500/40 hover:bg-white/5 transition-all group"
    >
      {/* Icône catégorie */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 mt-0.5"
        style={{ backgroundColor: template.color + '20' }}
      >
        {catInfo.icon}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-100 group-hover:text-white">{template.name}</span>
          {template.priority && template.priority !== 'normale' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              template.priority === 'urgente' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              template.priority === 'haute'   ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>{template.priority}</span>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-gray-500 truncate">{template.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {itemCount > 0 && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              {itemCount} tâche{itemCount !== 1 ? 's' : ''}
            </span>
          )}
          {template.estimated_hours && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ~{template.estimated_hours}h
            </span>
          )}
        </div>
      </div>

      <svg className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
