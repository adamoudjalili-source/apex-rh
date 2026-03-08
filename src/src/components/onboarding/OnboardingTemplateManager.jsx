// ============================================================
// APEX RH — OnboardingTemplateManager.jsx  ·  Session 75
// CRUD Templates + Étapes (admin/RH)
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  GripVertical, CheckCircle2, Clock, User, Users,
  Shield, Layers, X, Save, ToggleLeft, ToggleRight,
} from 'lucide-react'
import {
  useOnboardingTemplates,
  useCreateTemplate, useUpdateTemplate, useDeleteTemplate,
  useTemplateSteps, useCreateStep, useUpdateStep, useDeleteStep,
} from '../../hooks/useOnboarding'

const CATEGORY_LABELS = {
  administrative: { label: 'Administratif', color: '#6366F1' },
  equipment:      { label: 'Équipement',    color: '#F59E0B' },
  access:         { label: 'Accès & Outils', color: '#10B981' },
  training:       { label: 'Formation',     color: '#8B5CF6' },
  meeting:        { label: 'Réunion',       color: '#3B82F6' },
  documentation:  { label: 'Documentation', color: '#EC4899' },
  other:          { label: 'Autre',         color: '#6B7280' },
}

const ASSIGNEE_ICONS = {
  self:    { icon: User,   label: 'Collaborateur', color: '#4F46E5' },
  manager: { icon: Users,  label: 'Manager',       color: '#3B82F6' },
  rh:      { icon: Shield, label: 'RH',            color: '#10B981' },
}

// ─── Modal template ──────────────────────────────────────────
function TemplateModal({ tpl, onClose, onSave }) {
  const [form, setForm] = useState({
    name:              tpl?.name              || '',
    description:       tpl?.description      || '',
    target_role:       tpl?.target_role       || '',
    target_department: tpl?.target_department || '',
    is_active:         tpl?.is_active ?? true,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: 'linear-gradient(135deg, #1a1a3e, #12122a)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {tpl ? 'Modifier le template' : 'Nouveau template'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-white/40 hover:text-white/70" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nom *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="ex : Parcours cadre standard"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Décrivez ce parcours..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Rôle cible</label>
              <input
                value={form.target_role}
                onChange={e => set('target_role', e.target.value)}
                placeholder="ex : manager"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Département cible</label>
              <input
                value={form.target_department}
                onChange={e => set('target_department', e.target.value)}
                placeholder="ex : IT"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-sm text-white/60">Template actif</span>
            <button onClick={() => set('is_active', !form.is_active)}>
              {form.is_active
                ? <ToggleRight size={22} className="text-indigo-400" />
                : <ToggleLeft  size={22} className="text-white/30" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 border border-white/10">
            Annuler
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            <Save size={14} /> Enregistrer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Modal étape ─────────────────────────────────────────────
function StepModal({ step, templateId, maxOrder, onClose, onSave }) {
  const [form, setForm] = useState({
    title:          step?.title          || '',
    description:    step?.description    || '',
    due_day_offset: step?.due_day_offset ?? 1,
    assignee_type:  step?.assignee_type  || 'self',
    category:       step?.category       || 'other',
    is_required:    step?.is_required    ?? true,
    order_index:    step?.order_index    ?? maxOrder,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: 'linear-gradient(135deg, #1a1a3e, #12122a)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{step ? 'Modifier l\'étape' : 'Nouvelle étape'}</h3>
          <button onClick={onClose}><X size={18} className="text-white/40 hover:text-white/70" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Titre *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="ex : Signer le contrat de travail"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Détails de l'étape..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Délai (jours)</label>
              <input
                type="number" min={1} max={90}
                value={form.due_day_offset}
                onChange={e => set('due_day_offset', +e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Assigné à</label>
              <select
                value={form.assignee_type}
                onChange={e => set('assignee_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a3e] border border-white/10 outline-none"
              >
                {Object.entries(ASSIGNEE_ICONS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Catégorie</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#1a1a3e] border border-white/10 outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-sm text-white/60">Étape obligatoire</span>
            <button onClick={() => set('is_required', !form.is_required)}>
              {form.is_required
                ? <ToggleRight size={22} className="text-red-400" />
                : <ToggleLeft  size={22} className="text-white/30" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 border border-white/10">
            Annuler
          </button>
          <button
            onClick={() => onSave({ ...form, template_id: templateId })}
            disabled={!form.title.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            <Save size={14} /> Enregistrer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Ligne étape ─────────────────────────────────────────────
function StepRow({ step, onEdit, onDelete }) {
  const cat = CATEGORY_LABELS[step.category] || CATEGORY_LABELS.other
  const assign = ASSIGNEE_ICONS[step.assignee_type] || ASSIGNEE_ICONS.self
  const AssignIcon = assign.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <GripVertical size={14} className="text-white/15 flex-shrink-0" />
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${cat.color}20`, border: `1px solid ${cat.color}30` }}>
        <span className="text-[9px] font-bold" style={{ color: cat.color }}>
          {step.order_index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{step.title}</span>
          {step.is_required && (
            <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>Obligatoire</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${cat.color}15`, color: cat.color }}>
            {cat.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Clock size={9} /> J+{step.due_day_offset}
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: assign.color }}>
            <AssignIcon size={9} /> {assign.label}
          </span>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(step)} className="p-1.5 rounded-lg hover:bg-white/5">
          <Edit2 size={12} className="text-white/40 hover:text-indigo-400" />
        </button>
        <button onClick={() => onDelete(step)} className="p-1.5 rounded-lg hover:bg-white/5">
          <Trash2 size={12} className="text-white/40 hover:text-red-400" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Carte template ──────────────────────────────────────────
function TemplateCard({ tpl, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { data: steps = [] } = useTemplateSteps(expanded ? tpl.id : null)
  const createStep  = useCreateStep()
  const updateStep  = useUpdateStep()
  const deleteStep  = useDeleteStep()

  const [stepModal, setStepModal] = useState(null) // null | 'new' | step obj

  const handleSaveStep = async (form) => {
    if (form.id) await updateStep.mutateAsync({ ...form })
    else          await createStep.mutateAsync(form)
    setStepModal(null)
  }

  const handleDeleteStep = async (step) => {
    if (confirm(`Supprimer l'étape "${step.title}" ?`)) {
      await deleteStep.mutateAsync({ id: step.id, template_id: step.template_id })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* En-tête template */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: tpl.is_active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)' }}>
          <Layers size={18} style={{ color: tpl.is_active ? '#818CF8' : '#ffffff50' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{tpl.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              tpl.is_active ? 'text-emerald-300' : 'text-white/30'
            }`} style={{ background: tpl.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }}>
              {tpl.is_active ? 'Actif' : 'Inactif'}
            </span>
            {tpl.target_role && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full text-indigo-300"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                {tpl.target_role}
              </span>
            )}
            {tpl.target_department && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full text-violet-300"
                style={{ background: 'rgba(139,92,246,0.15)' }}>
                {tpl.target_department}
              </span>
            )}
          </div>
          {tpl.description && (
            <p className="text-xs text-white/40 mt-0.5 truncate">{tpl.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(tpl)} className="p-1.5 rounded-lg hover:bg-white/5">
            <Edit2 size={14} className="text-white/40 hover:text-indigo-400" />
          </button>
          <button onClick={() => onDelete(tpl)} className="p-1.5 rounded-lg hover:bg-white/5">
            <Trash2 size={14} className="text-white/40 hover:text-red-400" />
          </button>
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            {expanded
              ? <ChevronUp size={14} className="text-white/40" />
              : <ChevronDown size={14} className="text-white/40" />}
          </button>
        </div>
      </div>

      {/* Étapes */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-2">
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              {steps.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-3">Aucune étape — ajoutez-en une</p>
              ) : (
                steps.map(s => (
                  <StepRow
                    key={s.id} step={s}
                    onEdit={s => setStepModal(s)}
                    onDelete={handleDeleteStep}
                  />
                ))
              )}
              <button
                onClick={() => setStepModal('new')}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.25)' }}
              >
                <Plus size={13} /> Ajouter une étape
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stepModal && (
          <StepModal
            step={stepModal === 'new' ? null : stepModal}
            templateId={tpl.id}
            maxOrder={steps.length}
            onClose={() => setStepModal(null)}
            onSave={handleSaveStep}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function OnboardingTemplateManager() {
  const { data: templates = [], isLoading } = useOnboardingTemplates()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()

  const [modal, setModal] = useState(null) // null | 'new' | template

  const handleSave = async (form) => {
    if (modal?.id) await updateTemplate.mutateAsync({ id: modal.id, ...form })
    else            await createTemplate.mutateAsync(form)
    setModal(null)
  }

  const handleDelete = async (tpl) => {
    if (confirm(`Supprimer le template "${tpl.name}" ? Toutes les étapes seront supprimées.`)) {
      await deleteTemplate.mutateAsync(tpl.id)
    }
  }

  const active   = templates.filter(t => t.is_active)
  const inactive = templates.filter(t => !t.is_active)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Templates de parcours</h2>
          <p className="text-xs text-white/40 mt-0.5">
            {templates.length} template{templates.length > 1 ? 's' : ''} · {active.length} actif{active.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <Plus size={15} /> Nouveau template
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <Layers size={32} className="mx-auto text-white/15 mb-3" />
          <p className="text-white/40 text-sm">Aucun template créé</p>
          <p className="text-white/25 text-xs mt-1">Créez des parcours réutilisables pour vos nouveaux collaborateurs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.length > 0 && (
            <>
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium">Actifs ({active.length})</p>
              {active.map(t => (
                <TemplateCard key={t.id} tpl={t} onEdit={t => setModal(t)} onDelete={handleDelete} />
              ))}
            </>
          )}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium mt-4">Inactifs ({inactive.length})</p>
              {inactive.map(t => (
                <TemplateCard key={t.id} tpl={t} onEdit={t => setModal(t)} onDelete={handleDelete} />
              ))}
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <TemplateModal
            tpl={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
