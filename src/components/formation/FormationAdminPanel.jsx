// ============================================================
// APEX RH — components/formation/FormationAdminPanel.jsx
// Session 57 — Administration : catalogue + statistiques org
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, BarChart2, BookOpen, Users, CheckCircle2,
  Clock, Award, Loader2, X, Edit, Eye, EyeOff,
  TrendingUp, AlertCircle,
} from 'lucide-react'
import {
  useTrainingCatalog, useOrgTrainingStats,
  useCreateTraining, useUpdateTraining, useDeleteTraining,
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS, LEVEL_LABELS,
} from '../../hooks/useFormations'

const TYPES  = Object.keys(TRAINING_TYPE_LABELS)
const LEVELS = ['debutant', 'intermediaire', 'avance']

function OrgStats() {
  const { data: stats, isLoading } = useOrgTrainingStats()
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-indigo-400"/></div>
  if (!stats) return null

    ? Math.round((stats.completed / stats.total_enrollments) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { label: 'Formations actives', value: stats.active_formations, icon: BookOpen,     color: '#6366F1' },
        { label: 'Total inscriptions', value: stats.total_enrollments,  icon: Users,       color: '#3B82F6' },
        { label: 'Formations terminées', value: stats.completed,        icon: CheckCircle2, color: '#10B981' },
        { label: 'En cours',           value: stats.in_progress,        icon: Clock,       color: '#F59E0B' },
        { label: 'Heures dispensées',  value: `${Math.round(stats.hours_total || 0)}h`, icon: TrendingUp, color: '#8B5CF6' },
        { label: 'Certifications',     value: stats.total_certifications, icon: Award,     color: '#C9A227' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl p-3.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Icon size={13} style={{ color }}/>
            <p className="text-[11px] text-white/35">{label}</p>
          </div>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      ))}
    </div>
  )
}

function TrainingFormModal({ training, onClose }) {
  const createTraining = useCreateTraining()
  const updateTraining = useUpdateTraining()
  const isEdit = !!training?.id

  const [form, setForm] = useState({
    title:          training?.title          || '',
    description:    training?.description    || '',
    type:           training?.type           || 'e-learning',
    provider:       training?.provider       || '',
    duration_hours: training?.duration_hours || '',
    price_xof:      training?.price_xof      || '',
    level:          training?.level          || 'intermediaire',
    is_mandatory:   training?.is_mandatory   || false,
    is_active:      training?.is_active      ?? true,
    link_url:       training?.link_url       || '',
    skills_covered: training?.skills_covered?.join(', ') || '',
    tags:           training?.tags?.join(', ')           || '',
  })

  function handleChange(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.title) return
    const payload = {
      ...form,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
      price_xof:      form.price_xof      ? Number(form.price_xof)      : null,
      skills_covered: form.skills_covered
        ? form.skills_covered.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      tags: form.tags
        ? form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : [],
    }
    if (isEdit) {
      await updateTraining.mutateAsync({ id: training.id, ...payload })
    } else {
      await createTraining.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = createTraining.isPending || updateTraining.isPending

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="h-1 flex-shrink-0" style={{ background: '#6366F1' }}/>

          <div className="p-5 flex items-center justify-between flex-shrink-0">
            <h3 className="text-base font-bold text-white">
              {isEdit ? 'Modifier la formation' : 'Nouvelle formation'}
            </h3>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={16}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Titre *</label>
              <input value={form.title} onChange={e => handleChange('title', e.target.value)}
                placeholder="Titre de la formation"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">Description</label>
              <textarea value={form.description} onChange={e => handleChange('description', e.target.value)}
                placeholder="Décrivez le contenu et les objectifs…" rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white/70 placeholder-white/20 outline-none focus:border-indigo-500/40 resize-none transition-colors"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Type</label>
                <select value={form.type} onChange={e => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors">
                  {TYPES.map(t => <option key={t} value={t}>{TRAINING_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Niveau</label>
                <select value={form.level} onChange={e => handleChange('level', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-indigo-500/40 transition-colors">
                  {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Prestataire</label>
                <input value={form.provider} onChange={e => handleChange('provider', e.target.value)}
                  placeholder="ex: Cegos, MOOC…"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Durée (heures)</label>
                <input type="number" value={form.duration_hours}
                  onChange={e => handleChange('duration_hours', e.target.value)}
                  placeholder="ex: 8"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Coût (XOF)</label>
                <input type="number" value={form.price_xof}
                  onChange={e => handleChange('price_xof', e.target.value)}
                  placeholder="ex: 150000"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Lien</label>
                <input value={form.link_url} onChange={e => handleChange('link_url', e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">Compétences développées (séparées par virgule)</label>
              <input value={form.skills_covered}
                onChange={e => handleChange('skills_covered', e.target.value)}
                placeholder="ex: Excel, Reporting, Analyse"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">Tags (séparés par virgule)</label>
              <input value={form.tags} onChange={e => handleChange('tags', e.target.value)}
                placeholder="ex: bureautique, management, compliance"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"/>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_mandatory}
                  onChange={e => handleChange('is_mandatory', e.target.checked)}
                  className="rounded border-white/20 bg-white/[0.04] text-indigo-500"/>
                <span className="text-xs text-white/50">Formation obligatoire</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => handleChange('is_active', e.target.checked)}
                  className="rounded border-white/20 bg-white/[0.04] text-emerald-500"/>
                <span className="text-xs text-white/50">Active (visible dans le catalogue)</span>
              </label>
            </div>
          </div>

          <div className="p-5 border-t border-white/[0.06] flex gap-2 flex-shrink-0">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/[0.07] text-sm text-white/40 hover:text-white/60 transition-colors">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={!form.title || isPending}
              className="flex-1 py-2.5 rounded-lg bg-indigo-500/80 hover:bg-indigo-500 text-sm font-semibold text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {isPending && <Loader2 size={14} className="animate-spin"/>}
              {isEdit ? 'Sauvegarder' : 'Créer'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function FormationAdminPanel() {
  const [activeTab, setActiveTab]   = useState('stats')
  const [showForm, setShowForm]     = useState(false)
  const [editItem, setEditItem]     = useState(null)

  const { data: catalog = [], isLoading } = useTrainingCatalog({ activeOnly: false })
  const deleteTraining = useDeleteTraining()

  const TABS = [
    { id: 'stats',   label: 'Statistiques org.' },
    { id: 'catalog', label: 'Gérer le catalogue' },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ STATS ═══ */}
      {activeTab === 'stats' && <OrgStats/>}

      {/* ═══ CATALOGUE ADMIN ═══ */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/35">
              {catalog.length} formation{catalog.length > 1 ? 's' : ''} au total
            </p>
            <button onClick={() => { setEditItem(null); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors border border-indigo-500/20">
              <Plus size={13}/>
              Nouvelle formation
            </button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-indigo-400"/>
            </div>
          )}

          <div className="space-y-2">
            {catalog.map(training => {
              const typeColor = TRAINING_TYPE_COLORS[training.type] || '#6366F1'
              return (
                <div key={training.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06]"
                  style={{ background: 'rgba(255,255,255,0.025)' }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: typeColor }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white/80 truncate">{training.title}</p>
                      {training.is_mandatory && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                          Obligatoire
                        </span>
                      )}
                      {!training.is_active && (
                        <span className="text-[10px] text-white/25 bg-white/[0.05] px-1.5 py-0.5 rounded flex-shrink-0">
                          Inactif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: typeColor }}>
                        {TRAINING_TYPE_LABELS[training.type]}
                      </span>
                      {training.provider && (
                        <span className="text-[11px] text-white/25">• {training.provider}</span>
                      )}
                      {training.duration_hours && (
                        <span className="text-[11px] text-white/25">• {training.duration_hours}h</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditItem(training); setShowForm(true) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white hover:bg-white/[0.06] transition-colors">
                      <Edit size={13}/>
                    </button>
                    <button
                      onClick={() => deleteTraining.mutate(training.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors">
                      {training.is_active ? <EyeOff size={13}/> : <Eye size={13}/>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <TrainingFormModal
          training={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}
