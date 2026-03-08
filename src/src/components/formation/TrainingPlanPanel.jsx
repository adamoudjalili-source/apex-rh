// ============================================================
// APEX RH — components/formation/TrainingPlanPanel.jsx
// Session 57 — Plan de formation individuel
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Target, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Trash2, Loader2,
  Calendar, BookOpen, TrendingUp,
} from 'lucide-react'
import {
  useMyTrainingPlan, useTrainingCatalog,
  useCreateOrUpdatePlan, useAddPlanItem, useUpdatePlanItem, useDeletePlanItem,
  PLAN_PRIORITY_LABELS, PLAN_PRIORITY_COLORS,
  PLAN_ITEM_STATUS_LABELS, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS,
} from '../../hooks/useFormations'
import { useAuth } from '../../contexts/AuthContext'

const CURRENT_YEAR = new Date().getFullYear()

const PRIORITY_OPTIONS = ['haute', 'moyenne', 'basse']
const ITEM_STATUS_OPTIONS = ['planifie', 'inscrit', 'en_cours', 'termine', 'reporte', 'annule']

function PriorityDot({ priority }) {
  const color = PLAN_PRIORITY_COLORS[priority] || '#6B7280'
  return <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }}/>
}

function PlanItemRow({ item, onDelete, onUpdateStatus }) {
  const [open, setOpen] = useState(false)
  const { training_catalog: training, free_title, priority, target_date, status, budget_xof } = item
  const title = training?.title || free_title || 'Formation hors catalogue'
  const typeColor = training ? TRAINING_TYPE_COLORS[training.type] : '#6B7280'
  const statusColor = {
    planifie: '#6B7280', inscrit: '#6366F1', en_cours: '#3B82F6',
    termine: '#10B981', reporte: '#F59E0B', annule: '#EF4444',
  }[status] || '#6B7280'

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <PriorityDot priority={priority}/>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 truncate">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {training && (
              <span className="text-[11px]" style={{ color: typeColor }}>
                {TRAINING_TYPE_LABELS[training.type]}
              </span>
            )}
            {target_date && (
              <span className="text-[11px] text-white/25">
                <Calendar size={9} className="inline mr-0.5"/>
                {new Date(target_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${statusColor}18`, color: statusColor }}>
            {PLAN_ITEM_STATUS_LABELS[status]}
          </span>
          {open ? <ChevronUp size={13} className="text-white/25"/> : <ChevronDown size={13} className="text-white/25"/>}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.04]">
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/30 mb-1">Priorité</p>
                  <span className="font-medium" style={{ color: PLAN_PRIORITY_COLORS[priority] }}>
                    {PLAN_PRIORITY_LABELS[priority]}
                  </span>
                </div>
                {budget_xof > 0 && (
                  <div>
                    <p className="text-white/30 mb-1">Budget</p>
                    <span className="text-white/60">
                      {new Intl.NumberFormat('fr-FR').format(budget_xof)} XOF
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] text-white/30 mb-1.5">Changer le statut</p>
                <div className="flex flex-wrap gap-1.5">
                  {ITEM_STATUS_OPTIONS.map(s => (
                    <button key={s}
                      onClick={() => onUpdateStatus(item.id, s)}
                      className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                        s === status ? 'font-bold' : 'opacity-50 hover:opacity-80'
                      }`}
                      style={{ background: `${({
                        planifie:'#6B7280',inscrit:'#6366F1',en_cours:'#3B82F6',
                        termine:'#10B981',reporte:'#F59E0B',annule:'#EF4444'
                      }[s]||'#6B7280')}20`,
                        color: {
                          planifie:'#6B7280',inscrit:'#6366F1',en_cours:'#3B82F6',
                          termine:'#10B981',reporte:'#F59E0B',annule:'#EF4444'
                        }[s]||'#6B7280',
                      }}>
                      {PLAN_ITEM_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => onDelete(item.id)}
                className="flex items-center gap-1 text-[11px] text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 size={11}/>
                Retirer du plan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AddItemModal({ planId, onClose }) {
  const { data: catalog = [] } = useTrainingCatalog()
  const addItem = useAddPlanItem()
  const [form, setForm] = useState({
    training_id: '',
    free_title:  '',
    priority:    'moyenne',
    target_date: '',
    budget_xof:  '',
  })

  async function handleSubmit() {
    if (!form.training_id && !form.free_title) return
    await addItem.mutateAsync({
      planId,
      trainingId: form.training_id || undefined,
      freeTitle:  form.free_title || undefined,
      priority:   form.priority,
      targetDate: form.target_date || undefined,
      budgetXof:  form.budget_xof ? Number(form.budget_xof) : undefined,
    })
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="h-1" style={{ background: '#10B981' }}/>
        <div className="p-5 space-y-4">
          <h3 className="text-base font-bold text-white">Ajouter au plan</h3>

          <div>
            <label className="block text-xs text-white/40 mb-1">Formation du catalogue</label>
            <select
              value={form.training_id}
              onChange={e => setForm(f => ({ ...f, training_id: e.target.value, free_title: '' }))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors">
              <option value="">-- Sélectionner une formation --</option>
              {catalog.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/25">
            <div className="h-px flex-1 bg-white/[0.06]"/>
            ou formation hors catalogue
            <div className="h-px flex-1 bg-white/[0.06]"/>
          </div>

          <div>
            <input
              value={form.free_title}
              onChange={e => setForm(f => ({ ...f, free_title: e.target.value, training_id: '' }))}
              placeholder="Nom de la formation externe…"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors">
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{PLAN_PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Date cible</label>
              <input
                type="month"
                value={form.target_date}
                onChange={e => setForm(f => ({ ...f, target_date: e.target.value ? `${e.target.value}-01` : '' }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/[0.07] text-sm text-white/40 hover:text-white/60 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={(!form.training_id && !form.free_title) || addItem.isPending}
              className="flex-1 py-2.5 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-sm font-semibold text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {addItem.isPending && <Loader2 size={14} className="animate-spin"/>}
              Ajouter
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TrainingPlanPanel() {
  const { profile } = useAuth()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [showAdd, setShowAdd] = useState(false)
  const { data: plan, isLoading } = useMyTrainingPlan(year)
  const createPlan = useCreateOrUpdatePlan()
  const deletePlanItem = useDeletePlanItem()
  const updatePlanItem = useUpdatePlanItem()

  const items = plan?.training_plan_items || []
  const completedItems = items.filter(i => i.status === 'termine').length
  const progressPct = items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0

  async function ensurePlanExists() {
    if (plan) return plan
    const p = await createPlan.mutateAsync({
      userId:     profile.id,
      year,
      managerId:  profile.manager_id || null,
    })
    return p
  }

  async function handleAddItem() {
    await ensurePlanExists()
    setShowAdd(true)
  }

  return (
    <div className="space-y-4">
      {/* Année selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
            <button key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                year === y
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
              }`}>
              {y}
            </button>
          ))}
        </div>
        <button onClick={handleAddItem}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition-colors border border-emerald-500/20">
          <Plus size={13}/>
          Ajouter
        </button>
      </div>

      {/* Progression globale */}
      {plan && items.length > 0 && (
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Progression du plan {year}</span>
            <span className="font-bold text-emerald-400">{progressPct}%</span>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}/>
          </div>
          <div className="flex justify-between text-[11px] text-white/25">
            <span>{completedItems} terminé{completedItems > 1 ? 's' : ''}</span>
            <span>{items.length} au total</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-emerald-400"/>
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!plan || items.length === 0) && (
        <div className="flex flex-col items-center py-14 text-center">
          <Target size={32} className="text-white/10 mb-3"/>
          <p className="text-sm text-white/30">Aucun plan de formation pour {year}.</p>
          <button onClick={handleAddItem}
            className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 underline">
            Créer mon plan de formation
          </button>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {items.map(item => (
          <PlanItemRow
            key={item.id}
            item={item}
            onDelete={id => deletePlanItem.mutate(id)}
            onUpdateStatus={(id, status) => updatePlanItem.mutate({ id, status })}
          />
        ))}
      </div>

      {/* Add modal */}
      {showAdd && plan && (
        <AddItemModal planId={plan.id} onClose={() => setShowAdd(false)}/>
      )}
    </div>
  )
}
