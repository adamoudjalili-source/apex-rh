// ============================================================
// APEX RH — CommandPalette.jsx
// ✅ Session 12 — Recherche universelle Ctrl+K
// Navigation clavier (↑↓ Enter Esc), résultats groupés,
// highlight du terme, skeleton loading
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  CheckSquare,
  Target,
  FolderKanban,
  Users,
  ArrowRight,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Command,
} from 'lucide-react'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'

// ─── CONFIG ──────────────────────────────────────────────────
const SECTION_CONFIG = {
  tasks: {
    label: 'Tâches',
    icon: CheckSquare,
    color: '#3B82F6',
    emptyMessage: 'Aucune tâche trouvée',
  },
  objectives: {
    label: 'Objectifs OKR',
    icon: Target,
    color: '#C9A227',
    emptyMessage: 'Aucun objectif trouvé',
  },
  projects: {
    label: 'Projets',
    icon: FolderKanban,
    color: '#8B5CF6',
    emptyMessage: 'Aucun projet trouvé',
  },
  users: {
    label: 'Utilisateurs',
    icon: Users,
    color: '#10B981',
    emptyMessage: 'Aucun utilisateur trouvé',
  },
}

const STATUS_COLORS = {
  // Tasks
  backlog: '#6B7280', a_faire: '#3B82F6', en_cours: '#F59E0B',
  en_revue: '#8B5CF6', terminee: '#10B981', bloquee: '#EF4444',
  // Objectives
  brouillon: '#6B7280', actif: '#3B82F6', en_evaluation: '#F59E0B',
  valide: '#10B981', archive: '#6B7280',
  // Projects
  planifie: '#6B7280', en_pause: '#F59E0B', termine: '#10B981', annule: '#EF4444',
}

const ROLE_COLORS = {
  administrateur: '#EF4444', directeur: '#C9A227',
  chef_division: '#8B5CF6', chef_service: '#3B82F6', collaborateur: '#10B981',
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { query, setQuery, results, isSearching, reset } = useGlobalSearch()
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Construire la liste plate de tous les résultats pour la navigation clavier
  const flatResults = results
    ? [
        ...results.tasks,
        ...results.objectives,
        ...results.projects,
        ...results.users,
      ]
    : []

  // Focus l'input à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setActiveIndex(0)
    } else {
      reset()
    }
  }, [isOpen, reset])

  // Reset l'index actif quand les résultats changent
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // Navigation au résultat sélectionné
  const handleSelect = useCallback((item) => {
    if (!item) return
    onClose()
    navigate(item.path)
  }, [navigate, onClose])

  // Navigation clavier
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % Math.max(flatResults.length, 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + flatResults.length) % Math.max(flatResults.length, 1))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (flatResults[activeIndex]) {
        handleSelect(flatResults[activeIndex])
      }
      return
    }
  }, [flatResults, activeIndex, handleSelect, onClose])

  // Scroll l'élément actif dans la vue
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

  if (!isOpen) return null

  const hasResults = results && results.totalCount > 0
  const hasQuery = query.length >= 2

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101] rounded-2xl overflow-hidden"
            style={{
              background: '#0D0D24',
              border: '1px solid rgba(79, 70, 229, 0.2)',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(79, 70, 229, 0.08)',
            }}
          >
            {/* Input de recherche */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
              {isSearching ? (
                <Loader2 size={16} className="text-indigo-400 animate-spin flex-shrink-0" />
              ) : (
                <Search size={16} className="text-white/30 flex-shrink-0" />
              )}

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher des tâches, objectifs, projets, utilisateurs..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                autoComplete="off"
                spellCheck={false}
              />

              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-white/20 hover:text-white/50 transition-colors"
                >
                  <X size={14} />
                </button>
              )}

              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}
              >
                ESC
              </span>
            </div>

            {/* Zone de résultats */}
            <div
              ref={listRef}
              className="max-h-[55vh] overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
              {/* État initial — pas de requête */}
              {!hasQuery && (
                <div className="px-4 py-8 text-center">
                  <Command size={28} className="mx-auto mb-3 text-white/8" />
                  <p className="text-xs text-white/25 mb-1">Tapez au moins 2 caractères pour rechercher</p>
                  <p className="text-[10px] text-white/15">
                    Tâches, objectifs OKR, projets{' '}
                    <span className="text-white/10">et utilisateurs</span>
                  </p>
                </div>
              )}

              {/* Chargement */}
              {hasQuery && isSearching && !results && (
                <div className="px-4 py-8 text-center">
                  <Loader2 size={20} className="mx-auto mb-2 text-indigo-400/50 animate-spin" />
                  <p className="text-xs text-white/20">Recherche en cours...</p>
                </div>
              )}

              {/* Aucun résultat */}
              {hasQuery && !isSearching && results && results.totalCount === 0 && (
                <div className="px-4 py-8 text-center">
                  <Search size={24} className="mx-auto mb-2 text-white/8" />
                  <p className="text-xs text-white/25">
                    Aucun résultat pour « <span className="text-white/40">{query}</span> »
                  </p>
                  <p className="text-[10px] text-white/15 mt-1">
                    Essayez avec d'autres termes
                  </p>
                </div>
              )}

              {/* Résultats groupés */}
              {hasResults && (
                <ResultGroups
                  results={results}
                  query={query}
                  flatResults={flatResults}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  onSelect={handleSelect}
                />
              )}
            </div>

            {/* Footer avec raccourcis */}
            <div
              className="flex items-center gap-4 px-4 py-2.5 border-t border-white/5"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-white/20">
                <span className="flex items-center gap-0.5">
                  <ArrowUp size={9} className="inline" />
                  <ArrowDown size={9} className="inline" />
                </span>
                naviguer
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/20">
                <CornerDownLeft size={9} />
                ouvrir
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/20">
                <span className="font-mono text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  ESC
                </span>
                fermer
              </div>
              {results && results.totalCount > 0 && (
                <span className="ml-auto text-[10px] text-white/15">
                  {results.totalCount} résultat{results.totalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── GROUPES DE RÉSULTATS ────────────────────────────────────
function ResultGroups({ results, query, flatResults, activeIndex, setActiveIndex, onSelect }) {
  let globalIndex = 0

  return (
    <div className="py-2">
      {Object.entries(SECTION_CONFIG).map(([key, config]) => {
        const items = results[key]
        if (!items || items.length === 0) return null

        const Icon = config.icon
        const startIndex = globalIndex

        const group = (
          <div key={key} className="mb-1">
            {/* En-tête de section */}
            <div className="flex items-center gap-2 px-4 py-1.5">
              <Icon size={11} style={{ color: config.color }} />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: `${config.color}90` }}
              >
                {config.label}
              </span>
              <span className="text-[9px] text-white/15">({items.length})</span>
            </div>

            {/* Items */}
            {items.map((item, localIdx) => {
              const itemGlobalIndex = startIndex + localIdx
              const isActive = activeIndex === itemGlobalIndex

              return (
                <ResultItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  query={query}
                  sectionConfig={config}
                  isActive={isActive}
                  dataIndex={itemGlobalIndex}
                  onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                  onClick={() => onSelect(item)}
                />
              )
            })}
          </div>
        )

        globalIndex += items.length
        return group
      })}
    </div>
  )
}

// ─── ITEM DE RÉSULTAT ────────────────────────────────────────
function ResultItem({ item, query, sectionConfig, isActive, dataIndex, onMouseEnter, onClick }) {
  const statusColor = item.type === 'user'
    ? ROLE_COLORS[item.role] || '#6B7280'
    : STATUS_COLORS[item.status] || '#6B7280'

  return (
    <div
      data-index={dataIndex}
      className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-100"
      style={{
        background: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
        border: isActive ? '1px solid rgba(79, 70, 229, 0.15)' : '1px solid transparent',
      }}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* Indicateur de statut */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: statusColor }}
      />

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 truncate">
          <HighlightText text={item.title} highlight={query} />
        </p>
        {item.subtitle && (
          <p className="text-[10px] text-white/30 truncate">{item.subtitle}</p>
        )}
      </div>

      {/* Flèche au hover */}
      <ArrowRight
        size={11}
        className="flex-shrink-0 transition-opacity duration-100"
        style={{ color: isActive ? '#818CF8' : 'transparent' }}
      />
    </div>
  )
}

// ─── HIGHLIGHT DU TERME DE RECHERCHE ─────────────────────────
function HighlightText({ text, highlight }) {
  if (!highlight || highlight.length < 2 || !text) return text

  const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-indigo-400 font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
