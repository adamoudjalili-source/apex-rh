// ============================================================
// APEX RH — components/formation/FormationCatalog.jsx
// Session 57 — Navigateur du catalogue de formations
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Filter, X, BookOpen, AlertCircle, Loader2,
} from 'lucide-react'
import {
  useTrainingCatalog, useMyEnrollments,
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS, LEVEL_LABELS,
} from '../../hooks/useFormations'
import FormationCard from './FormationCard'
import FormationDetail from './FormationDetail'

const TYPES   = Object.keys(TRAINING_TYPE_LABELS)
const LEVELS  = ['debutant', 'intermediaire', 'avance']

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
}

export default function FormationCatalog() {
  const [search, setSearch]       = useState('')
  const [typeFilter, setType]     = useState('')
  const [levelFilter, setLevel]   = useState('')
  const [selected, setSelected]   = useState(null)

  const { data: catalog = [], isLoading, error } = useTrainingCatalog({
    type:   typeFilter || undefined,
    level:  levelFilter || undefined,
    search: search || undefined,
  })

  const { data: myEnrollments = [] } = useMyEnrollments()
  const enrolledIds = useMemo(
    () => new Set(myEnrollments.filter(e => e.status !== 'annule').map(e => e.training_id)),
    [myEnrollments]
  )
  const enrolledStatus = useMemo(
    () => Object.fromEntries(myEnrollments.map(e => [e.training_id, e.status])),
    [myEnrollments]
  )

  const hasFilters = typeFilter || levelFilter || search

  function clearFilters() {
    setType(''); setLevel(''); setSearch('')
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une formation…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/25 outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={e => setType(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white/70 outline-none focus:border-indigo-500/50 transition-colors">
            <option value="">Tous les types</option>
            {TYPES.map(t => (
              <option key={t} value={t}>{TRAINING_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={e => setLevel(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white/70 outline-none focus:border-indigo-500/50 transition-colors">
            <option value="">Tous les niveaux</option>
            {LEVELS.map(l => (
              <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors">
              <X size={14}/>
            </button>
          )}
        </div>
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">
          {isLoading ? 'Chargement…' : `${catalog.length} formation${catalog.length > 1 ? 's' : ''}`}
        </p>
        {enrolledIds.size > 0 && (
          <p className="text-xs text-emerald-400/60">
            {enrolledIds.size} inscription{enrolledIds.size > 1 ? 's' : ''} active{enrolledIds.size > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-indigo-400"/>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 rounded-lg bg-red-500/10">
          <AlertCircle size={16}/>
          <span>Erreur lors du chargement du catalogue.</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && catalog.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={32} className="text-white/10 mb-3"/>
          <p className="text-sm text-white/30">
            {hasFilters ? 'Aucune formation ne correspond à vos critères.' : 'Le catalogue est vide pour le moment.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline">
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* Grille formations */}
      {!isLoading && !error && catalog.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {catalog.map((training, i) => (
            <motion.div
              key={training.id}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible">
              <FormationCard
                training={training}
                onSelect={setSelected}
                enrolled={enrolledIds.has(training.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <FormationDetail
          training={selected}
          onClose={() => setSelected(null)}
          enrolledStatus={enrolledStatus[selected.id]}
        />
      )}
    </div>
  )
}
