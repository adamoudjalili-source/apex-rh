// ============================================================
// APEX RH — src/components/offboarding/OffboardingTemplateAdmin.jsx
// Session 68 — Gestion templates (admin)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ROLES } from '../../utils/constants'
import {
  LayoutTemplate, Plus, Edit2, Trash2, Star, ChevronDown, ChevronUp, X, Save, GripVertical,
} from 'lucide-react'
import {
  useOffboardingTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate,
  CHECKLIST_CATEGORY_LABELS,
} from '../../hooks/useOffboarding'

const EMPTY_STEP = { title: '', category: 'admin', assignee_role: ROLES.ADMINISTRATEUR, days_before_exit: 7 }
const ROLES = [ROLES.ADMINISTRATEUR, ROLES.DIRECTEUR, ROLES.CHEF_SERVICE, ROLES.CHEF_DIVISION, ROLES.COLLABORATEUR]

function StepRow({ step, index, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <GripVertical size={14} className="text-white/15 mt-2 flex-shrink-0"/>
      <div className="flex-1 space-y-2">
        <input value={step.title}
          onChange={e => onChange(index, 'title', e.target.value)}
          placeholder="Titre de l'étape *"
          className="w-full bg-transparent text-sm text-white placeholder-white/20 border-b border-white/[0.08] pb-1 outline-none"/>
        <div className="grid grid-cols-3 gap-2">
          <select value={step.category}
            onChange={e => onChange(index, 'category', e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-white/[0.08] outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
            {Object.entries(CHECKLIST_CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select value={step.assignee_role}
            onChange={e => onChange(index, 'assignee_role', e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-white/[0.08] outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input type="number" value={step.days_before_exit}
              onChange={e => onChange(index, 'days_before_exit', parseInt(e.target.value) || 0)}
              className="w-full text-xs px-2 py-1 rounded-lg border border-white/[0.08] bg-transparent text-white/70 outline-none [appearance:textfield]"/>
            <span className="text-[10px] text-white/30 whitespace-nowrap">j. avant</span>
          </div>
        </div>
      </div>
      <button onClick={() => onRemove(index)} className="text-white/20 hover:text-red-400 mt-1 flex-shrink-0">
        <X size={14}/>
      </button>
    </div>
  )
}

function TemplateForm({ template, onClose }) {
  const create = useCreateTemplate()
  const update = useUpdateTemplate()

  const [form, setForm] = useState({
    name:        template?.name || '',
    description: template?.description || '',
    steps:       template?.steps || [{ ...EMPTY_STEP }],
    is_default:  template?.is_default || false,
  })

  const addStep   = () => setForm(f => ({ ...f, steps: [...f.steps, { ...EMPTY_STEP }] }))
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))
  const changeStep = (i, key, val) => setForm(f => ({
    ...f,
    steps: f.steps.map((s, idx) => idx === i ? { ...s, [key]: val } : s)
  }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (template?.id) {
      await update.mutateAsync({ id: template.id, ...form })
    } else {
      await create.mutateAsync(form)
    }
    onClose()
  }

  const isPending = create.isPending || update.isPending

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="rounded-2xl border border-white/[0.1] p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.04)' }}>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {template ? 'Modifier le template' : 'Nouveau template'}
        </h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60">
          <X size={16}/>
        </button>
      </div>

      {/* Nom */}
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Nom du template *"
        className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 border border-white/[0.08] bg-transparent outline-none focus:border-indigo-500/50"/>

      {/* Description */}
      <textarea value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Description (optionnel)"
        rows={2}
        className="w-full px-3 py-2 rounded-xl text-sm text-white/70 placeholder-white/20 border border-white/[0.08] bg-transparent outline-none resize-none"/>

      {/* Default toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <div onClick={() => setForm(f => ({ ...f, is_default: !f.is_default }))}
          className="w-9 h-5 rounded-full transition-colors relative"
          style={{ background: form.is_default ? '#6366F1' : 'rgba(255,255,255,0.1)' }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: form.is_default ? '18px' : '2px' }}/>
        </div>
        <span className="text-xs text-white/60">Template par défaut</span>
      </label>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            Étapes ({form.steps.length})
          </span>
          <button onClick={addStep}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <Plus size={11}/> Ajouter
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {form.steps.map((step, i) => (
            <StepRow key={step.id || `step-${i}`} step={step} index={i} onChange={changeStep} onRemove={removeStep}/>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-white/30 hover:text-white/60">
          Annuler
        </button>
        <button onClick={handleSave} disabled={!form.name.trim() || isPending}
          className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-all"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Save size={12}/>
          {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </motion.div>
  )
}

export default function OffboardingTemplateAdmin() {
  const { data: templates = [], isLoading } = useOffboardingTemplates()
  const deleteTemplate = useDeleteTemplate()
  const [editing, setEditing]   = useState(null) // null | 'new' | template obj
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={16} className="text-indigo-400"/>
          <span className="text-sm font-medium text-white/70">Templates de checklist</span>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}>
          <Plus size={12}/> Nouveau template
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {editing !== null && (
          <TemplateForm
            template={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}/>
        )}
      </AnimatePresence>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}/>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          Aucun template configuré
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => (
            <motion.div key={tpl.id} layout
              className="rounded-xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3 p-3">
                {tpl.is_default && (
                  <Star size={13} className="text-amber-400 flex-shrink-0" fill="currentColor"/>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-xs text-white/30 truncate">{tpl.description}</p>
                  )}
                </div>
                <span className="text-xs text-white/25 flex-shrink-0">
                  {tpl.steps?.length || 0} étapes
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(tpl)}
                    className="p-1.5 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors">
                    <Edit2 size={13}/>
                  </button>
                  {!tpl.is_default && (
                    <button
                      onClick={() => { if (confirm('Supprimer ce template ?')) deleteTemplate.mutate(tpl.id) }}
                      className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  )}
                  <button onClick={() => setExpanded(e => e === tpl.id ? null : tpl.id)}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/60">
                    {expanded === tpl.id ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expanded === tpl.id && tpl.steps?.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/[0.05]">
                    <div className="p-3 space-y-1">
                      {tpl.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                          <span className="text-white/20 w-4 text-right">{i+1}.</span>
                          <span className="flex-1 truncate">{step.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {CHECKLIST_CATEGORY_LABELS[step.category] || step.category}
                          </span>
                          <span className="text-white/20 flex-shrink-0">J-{step.days_before_exit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
