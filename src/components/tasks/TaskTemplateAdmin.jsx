// ============================================================
// APEX RH — TaskTemplateAdmin.jsx  ·  S128
// Administration des templates de tâches (CRUD)
// Accessible depuis Settings → Tâches ou Admin
// ============================================================
import { useState } from 'react'
import { useTaskTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, TEMPLATE_CATEGORIES, getCategoryInfo } from '../../hooks/useTaskTemplates'
import { TASK_PRIORITY } from '../../lib/taskHelpers'

export default function TaskTemplateAdmin() {
  const { data: templates = [], isLoading } = useTaskTemplates()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()

  const [editing, setEditing]     = useState(null)   // null | 'new' | { ...template }
  const [deleteId, setDeleteId]   = useState(null)

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Entête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Templates de tâches</h2>
          <p className="text-xs text-gray-500 mt-0.5">{templates.length} template{templates.length !== 1 ? 's' : ''} actif{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nouveau template
        </button>
      </div>

      {/* Grille des templates */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 border border-white/5 rounded-xl bg-white/2">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-gray-400">Aucun template créé</p>
          <p className="text-xs text-gray-600 mt-1">Créez des templates pour accélérer la création de tâches</p>
          <button onClick={() => setEditing('new')} className="mt-4 px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors">
            Créer le premier template
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map(template => {
            const cat = getCategoryInfo(template.category)
            const itemCount = template.task_template_items?.length || 0
            return (
              <div key={template.id}
                className="flex items-center gap-4 px-4 py-3 bg-white/3 border border-white/8 rounded-xl hover:border-white/15 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: template.color + '20' }}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-100">{template.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">{cat.label}</span>
                  </div>
                  {template.description && <p className="text-xs text-gray-500 truncate mt-0.5">{template.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-600">{itemCount} sous-tâche{itemCount !== 1 ? 's' : ''}</span>
                    {template.estimated_hours && <span className="text-[10px] text-gray-600">~{template.estimated_hours}h</span>}
                    <span className={`text-[10px] ${TASK_PRIORITY[template.priority]?.textClass || 'text-gray-400'}`}>
                      {TASK_PRIORITY[template.priority]?.icon} {TASK_PRIORITY[template.priority]?.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditing(template)} className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => setDeleteId(template.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulaire création/édition */}
      {editing && (
        <TemplateForm
          template={editing === 'new' ? null : editing}
          onCreate={async (data) => { await createTemplate.mutateAsync(data); setEditing(null) }}
          onUpdate={async (data) => { await updateTemplate.mutateAsync({ id: editing.id, ...data }); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Confirm suppression */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-[#1a1a35] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <h3 className="text-base font-semibold text-white mb-2">Supprimer ce template ?</h3>
            <p className="text-sm text-gray-400 mb-6">Les tâches créées depuis ce template ne seront pas affectées.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={async () => { await deleteTemplate.mutateAsync(deleteId); setDeleteId(null) }}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sous-composant formulaire ─────────────────────────────
function TemplateForm({ template, onCreate, onUpdate, onClose }) {
  const isEdit = !!template
  const [form, setForm] = useState({
    name:            template?.name            || '',
    description:     template?.description     || '',
    category:        template?.category        || 'general',
    priority:        template?.priority        || 'normale',
    estimated_hours: template?.estimated_hours || '',
    color:           template?.color           || '#4F46E5',
  })
  const [items, setItems] = useState(
    template?.task_template_items?.sort((a, b) => a.order_index - b.order_index)
      .map(i => ({ title: i.title, description: i.description || '', priority: i.priority || 'normale', delay_days: i.delay_days || 0 }))
    || []
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }
  function addItem()  { setItems(p => [...p, { title: '', description: '', priority: 'normale', delay_days: 0 }]) }
  function removeItem(i) { setItems(p => p.filter((_, idx) => idx !== i)) }
  function setItem(i, k, v) { setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it)) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    const validItems = items.filter(it => it.title.trim())
    setError(''); setLoading(true)
    try {
      const payload = { template: { ...form, estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null }, items: validItems }
      if (isEdit) await onUpdate({ updates: form, items: validItems })
      else        await onCreate(payload)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0F0F23] border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <h2 className="text-base font-semibold text-white">{isEdit ? 'Modifier' : 'Nouveau'} template</h2>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Nom *</label>
                <input type="text" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Ex : Onboarding employé" autoFocus
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Catégorie</label>
                <select value={form.category} onChange={e => setF('category', e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-indigo-500">
                  {TEMPLATE_CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a35]">{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Priorité par défaut</label>
                <select value={form.priority} onChange={e => setF('priority', e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a35] border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-indigo-500">
                  {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k} className="bg-[#1a1a35]">{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Heures estimées</label>
                <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => setF('estimated_hours', e.target.value)} placeholder="ex: 8"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Couleur</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setF('color', e.target.value)} className="h-9 w-12 rounded bg-transparent cursor-pointer border-0" />
                  <span className="text-xs text-gray-500">{form.color}</span>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} placeholder="Contexte d'utilisation..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
            </div>

            {/* Sous-tâches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">Sous-tâches ({items.length})</label>
                <button type="button" onClick={addItem} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/3 border border-white/8 rounded-lg">
                    <span className="text-xs text-gray-600 shrink-0 w-5 text-center">{idx + 1}</span>
                    <input value={item.title} onChange={e => setItem(idx, 'title', e.target.value)} placeholder="Titre de la sous-tâche..."
                      className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none" />
                    <select value={item.delay_days} onChange={e => setItem(idx, 'delay_days', parseInt(e.target.value))}
                      className="text-xs bg-transparent text-gray-500 focus:outline-none">
                      {[0,1,2,3,5,7,14].map(d => <option key={d} value={d} className="bg-[#1a1a35]">J+{d}</option>)}
                    </select>
                    <button type="button" onClick={() => removeItem(idx)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-gray-600 italic px-1">Aucune sous-tâche — le template créera une seule tâche</p>}
              </div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          </form>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
            <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le template'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
