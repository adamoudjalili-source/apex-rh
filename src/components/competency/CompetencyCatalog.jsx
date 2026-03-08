// ============================================================
// APEX RH — src/components/competency/CompetencyCatalog.jsx  · S84
// Catalogue de compétences — gestion CRUD (adminOnly)
// Groupé par catégorie · création / édition / suppression
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Edit2, Trash2, ChevronDown, ChevronRight, Book, Tag } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useCompetencyCategories,
  useCompetenciesList,
  useCreateCompetencyCategory,
  useCreateCompetency,
  useUpdateCompetency,
  useDeleteCompetency,
  COMPETENCY_LEVEL_LABELS,
} from '../../hooks/useCompetencyS84'

// ─── Pill niveau ──────────────────────────────────────────────
function LevelPill({ level }) {
  const cfg = COMPETENCY_LEVEL_LABELS[level] || {}
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {level} — {cfg.label}
    </span>
  )
}

// ─── Formulaire compétence ────────────────────────────────────
function CompetencyForm({ categories, initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    description: initial?.description || '',
    category_id: initial?.category_id || categories[0]?.id || '',
    levels:      initial?.levels      || [
      { level: 1, label: 'Débutant',   descriptor: '' },
      { level: 2, label: 'En cours',   descriptor: '' },
      { level: 3, label: 'Compétent',  descriptor: '' },
      { level: 4, label: 'Avancé',     descriptor: '' },
      { level: 5, label: 'Expert',     descriptor: '' },
    ],
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const updateLevel = (i, field, val) => {
    const levels = [...form.levels]
    levels[i] = { ...levels[i], [field]: val }
    setForm(f => ({ ...f, levels }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return setErr('Le nom est requis')
    setSaving(true)
    try {
      await onSave(form)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* Ligne nom + catégorie */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Nom *
          </label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex : Maîtrise Excel"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
            }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Catégorie
          </label>
          <select
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
            }}
          >
            <option value="">Sans catégorie</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Description
        </label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
          }}
        />
      </div>

      {/* Descripteurs par niveau */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Descripteurs par niveau
        </p>
        <div className="space-y-2">
          {form.levels.map((lv, i) => {
            const cfg = COMPETENCY_LEVEL_LABELS[lv.level]
            return (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="mt-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: cfg.bg, color: cfg.color, minWidth: 64, textAlign: 'center' }}
                >
                  {cfg.label}
                </span>
                <input
                  value={lv.descriptor}
                  onChange={e => updateLevel(i, 'descriptor', e.target.value)}
                  placeholder={`Qu'est-ce que niveau ${lv.level} signifie ?`}
                  className="flex-1 rounded-lg px-3 py-1 text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: '#4F46E5', color: 'white' }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Carte compétence ─────────────────────────────────────────
function CompetencyCard({ comp, onEdit, onDelete, canAdmin }) {
  const [expanded, setExpanded] = useState(false)
  const cat = comp.competency_categories

  return (
    <div
      className="rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'white' }}>
              {comp.name}
            </span>
            {cat && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: cat.color + '22', color: cat.color }}
              >
                {cat.name}
              </span>
            )}
          </div>
          {comp.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {comp.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canAdmin && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onEdit(comp) }}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(comp.id) }}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: '#EF4444' }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {expanded ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    : <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && comp.levels?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5">
              {comp.levels.map(lv => {
                const cfg = COMPETENCY_LEVEL_LABELS[lv.level] || {}
                return (
                  <div key={lv.level} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color, minWidth: 64, textAlign: 'center' }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {lv.descriptor || <em style={{ opacity: 0.4 }}>Aucun descripteur</em>}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function CompetencyCatalog() {
  const { canAdmin } = useAuth()
  const { data: categories = [], isLoading: loadCat } = useCompetencyCategories()
  const { data: competencies = [], isLoading: loadComp } = useCompetenciesList()
  const createCategory   = useCreateCompetencyCategory()
  const createCompetency = useCreateCompetency()
  const updateCompetency = useUpdateCompetency()
  const deleteCompetency = useDeleteCompetency()

  const [showNewComp,  setShowNewComp]  = useState(false)
  const [showNewCat,   setShowNewCat]   = useState(false)
  const [editingComp,  setEditingComp]  = useState(null)
  const [newCatName,   setNewCatName]   = useState('')
  const [newCatColor,  setNewCatColor]  = useState('#4F46E5')
  const [newCatIcon,   setNewCatIcon]   = useState('🎯')

  const loading = loadCat || loadComp

  // Grouper par catégorie
  const grouped = {}
  const uncategorized = []
  competencies.forEach(c => {
    if (c.category_id) {
      if (!grouped[c.category_id]) grouped[c.category_id] = []
      grouped[c.category_id].push(c)
    } else {
      uncategorized.push(c)
    }
  })

  const handleSaveCompetency = async (form) => {
    if (editingComp) {
      await updateCompetency.mutateAsync({ id: editingComp.id, ...form })
      setEditingComp(null)
    } else {
      await createCompetency.mutateAsync(form)
      setShowNewComp(false)
    }
  }

  const handleDeleteCompetency = async (id) => {
    if (!window.confirm('Archiver cette compétence ?')) return
    await deleteCompetency.mutateAsync(id)
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    await createCategory.mutateAsync({
      name: newCatName, color: newCatColor, icon: newCatIcon,
      order_index: categories.length,
    })
    setNewCatName(''); setShowNewCat(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#4F46E5', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'white' }}>
            Catalogue de compétences
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {competencies.length} compétences · {categories.length} catégories
          </p>
        </div>
        {canAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewCat(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
            >
              <Tag size={14} />
              Catégorie
            </button>
            <button
              onClick={() => { setShowNewComp(v => !v); setEditingComp(null) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#4F46E5', color: 'white' }}
            >
              <Plus size={14} />
              Compétence
            </button>
          </div>
        )}
      </div>

      {/* Form nouvelle catégorie */}
      <AnimatePresence>
        {showNewCat && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <input
              value={newCatIcon}
              onChange={e => setNewCatIcon(e.target.value)}
              className="w-10 rounded-lg px-2 py-2 text-center text-base"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'white',
              }}
            />
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Nom de la catégorie"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'white',
              }}
            />
            <input
              type="color"
              value={newCatColor}
              onChange={e => setNewCatColor(e.target.value)}
              className="rounded-lg w-10 h-10 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', padding: 2 }}
            />
            <button
              onClick={handleCreateCategory}
              disabled={createCategory.isPending || !newCatName.trim()}
              className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#4F46E5', color: 'white' }}
            >
              Créer
            </button>
            <button onClick={() => setShowNewCat(false)}>
              <X size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire nouvelle / édition compétence */}
      <AnimatePresence>
        {(showNewComp || editingComp) && (
          <CompetencyForm
            categories={categories}
            initial={editingComp}
            onSave={handleSaveCompetency}
            onCancel={() => { setShowNewComp(false); setEditingComp(null) }}
          />
        )}
      </AnimatePresence>

      {/* Liste groupée */}
      {competencies.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <Book size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Aucune compétence définie. Commencez par créer des catégories puis ajoutez vos compétences.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Catégories */}
          {categories.map(cat => {
            const comps = grouped[cat.id] || []
            if (comps.length === 0) return null
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{cat.icon}</span>
                  <h3 className="font-semibold text-sm" style={{ color: cat.color }}>
                    {cat.name}
                  </h3>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs"
                    style={{ background: cat.color + '22', color: cat.color }}
                  >
                    {comps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {comps.map(c => (
                    <CompetencyCard
                      key={c.id}
                      comp={c}
                      canAdmin={canAdmin}
                      onEdit={() => setEditingComp(c)}
                      onDelete={handleDeleteCompetency}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Non catégorisées */}
          {uncategorized.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Sans catégorie
              </h3>
              <div className="space-y-2">
                {uncategorized.map(c => (
                  <CompetencyCard
                    key={c.id}
                    comp={c}
                    canAdmin={canAdmin}
                    onEdit={() => setEditingComp(c)}
                    onDelete={handleDeleteCompetency}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
