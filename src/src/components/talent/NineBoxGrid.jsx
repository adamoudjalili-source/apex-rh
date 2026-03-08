// ============================================================
// APEX RH — src/components/talent/NineBoxGrid.jsx
// Session 51 — Grille 9-Box SVG interactive
//
// Props :
//   stats       — données useNineBoxStats
//   onCellClick — callback(cellId, people[])
//   selectedCell — cellule active
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, TrendingUp, Target, ChevronRight } from 'lucide-react'
import { NINEBOX_CELLS } from '../../hooks/useTalentNineBox'

// ─── Helpers visuels ─────────────────────────────────────────
const roleLabel = r => ({
  collaborateur: 'Collaborateur', chef_service: 'Chef Service',
  chef_division: 'Chef Division', directeur: 'Directeur',
}[r] || r)

function Avatar({ user, size = 24 }) {
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: 'rgba(139,92,246,0.25)',
        border: '1px solid rgba(139,92,246,0.4)',
        color: '#C4B5FD',
      }}
    >
      {initials}
    </div>
  )
}

// ─── Panneau drill-down ───────────────────────────────────────
function DrilldownPanel({ cellId, stats, onClose }) {
  const cfg = NINEBOX_CELLS[cellId]
  if (!cfg) return null

  const { people = [] } = stats[cellId] || {}

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22 }}
      className="absolute top-0 right-0 w-72 h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(145deg, rgba(17,17,34,0.98) 0%, rgba(11,11,22,0.98) 100%)',
        border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(24px)',
        zIndex: 20,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-white">{cfg.label}</div>
            <div className="text-xs mt-0.5" style={{ color: cfg.textColor }}>{cfg.sublabel}</div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
          >
            <X size={12} className="text-white/40" />
          </button>
        </div>
        <div className="mt-2 text-xs text-white/40 leading-relaxed">{cfg.description}</div>
        {/* Action recommandée */}
        <div
          className="mt-3 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.textColor, border: `1px solid ${cfg.border}` }}
        >
          → {cfg.action}
        </div>
      </div>

      {/* Liste collaborateurs */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-white/20 text-xs">
            <User size={20} className="mb-1" />
            Aucun collaborateur dans cette cellule
          </div>
        ) : (
          people.map(person => (
            <div
              key={person.user_id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all hover:bg-white/[0.04]"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Avatar user={person} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {person.first_name} {person.last_name}
                </div>
                <div className="text-[10px] text-white/40 truncate">
                  {person.division_name || person.service_name || roleLabel(person.role)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] font-bold" style={{ color: cfg.color }}>
                  {Math.round(person.performance_score)}pts
                </div>
                <div className="text-[9px] text-white/30">PULSE</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-xs text-white/25">
          {people.length} collaborateur{people.length > 1 ? 's' : ''}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function NineBoxGrid({ stats = {}, isLoading = false }) {
  const [selectedCell, setSelectedCell] = useState(null)

  // Grille : 3 colonnes (potential low→high) × 3 lignes (perf low→high)
  // Organisation : row 2 = haute performance (haut), row 0 = basse (bas)
  const GRID = [
    // row=2 (haute perf), du col 0 (low pot) au col 2 (high pot)
    ['expert',     'backbone',     'star'],
    ['reliable',   'core',         'high_potential'],
    ['underperformer', 'inconsistent', 'enigma'],
  ]

  const handleCellClick = (cellId) => {
    setSelectedCell(prev => prev === cellId ? null : cellId)
  }

  const CELL_SIZE = 110 // px

  return (
    <div className="relative flex flex-col gap-4">
      {/* Axes labels */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} style={{ color: '#8B5CF6' }} />
          <span className="text-xs text-white/40">Performance PULSE (3 mois)</span>
        </div>
        <span className="text-white/20 text-xs mx-2">×</span>
        <div className="flex items-center gap-1.5">
          <Target size={13} style={{ color: '#F59E0B' }} />
          <span className="text-xs text-white/40">Potentiel (OKR + F360 + ancienneté)</span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Axe Y label */}
        <div className="flex flex-col items-center justify-center gap-1" style={{ width: 28 }}>
          <div className="text-[9px] text-white/30 font-semibold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            PERFORMANCE ↑
          </div>
        </div>

        {/* Grille principale */}
        <div className="flex-1 relative">
          {/* Bandes Y (low / medium / high) */}
          <div className="flex flex-col gap-px">
            {/* Labels performance */}
            {['Élevée', 'Moyenne', 'Faible'].map((label, ri) => (
              <div key={ri} className="flex gap-px items-stretch">
                <div
                  className="flex items-center justify-end pr-1.5 text-[9px] font-semibold text-white/20 flex-shrink-0"
                  style={{ width: 46, height: CELL_SIZE }}
                >
                  {label}
                </div>

                {/* 3 cellules par ligne */}
                {GRID[ri].map((cellId) => {
                  const cfg   = NINEBOX_CELLS[cellId]
                  const count = stats[cellId]?.count || 0
                  const isActive = selectedCell === cellId
                  const isLoaded = !isLoading

                  return (
                    <motion.button
                      key={cellId}
                      onClick={() => handleCellClick(cellId)}
                      className="flex-1 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all relative overflow-hidden"
                      style={{
                        height: CELL_SIZE,
                        background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                        border: `1.5px solid ${isActive ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                        minWidth: 0,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Glow actif */}
                      {isActive && (
                        <div
                          className="absolute inset-0 opacity-10 blur-xl pointer-events-none"
                          style={{ background: cfg.color }}
                        />
                      )}

                      {/* Compteur */}
                      {isLoaded ? (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.05 * Object.keys(NINEBOX_CELLS).indexOf(cellId) }}
                          className="text-2xl font-black"
                          style={{ color: count > 0 ? cfg.color : 'rgba(255,255,255,0.1)' }}
                        >
                          {count}
                        </motion.div>
                      ) : (
                        <div className="w-8 h-6 rounded animate-pulse bg-white/[0.04]" />
                      )}

                      {/* Label */}
                      <div
                        className="text-[10px] font-semibold text-center px-1 leading-tight"
                        style={{ color: count > 0 ? cfg.textColor : 'rgba(255,255,255,0.2)' }}
                      >
                        {cfg.label.replace(/^[^\s]+ /, '')}
                      </div>

                      {/* Avatars miniatures si quelques personnes */}
                      {isLoaded && count > 0 && count <= 4 && (
                        <div className="flex -space-x-1.5">
                          {(stats[cellId]?.people || []).slice(0, 4).map(p => (
                            <div
                              key={p.user_id}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold border"
                              style={{
                                background: 'rgba(139,92,246,0.3)',
                                borderColor: 'rgba(139,92,246,0.5)',
                                color: '#C4B5FD',
                              }}
                            >
                              {p.first_name?.[0]}{p.last_name?.[0]}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Indicateur actif */}
                      {isActive && (
                        <div
                          className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                          style={{ background: cfg.color }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Axe X labels (Potentiel) */}
          <div className="flex mt-1.5 pl-[46px] gap-px">
            {['Potentiel\nFaible', 'Potentiel\nMoyen', 'Potentiel\nÉlevé'].map((label, ci) => (
              <div key={ci} className="flex-1 text-center text-[9px] text-white/25 font-semibold leading-tight">
                {label.split('\n').map((l, i) => <div key={i}>{l}</div>)}
              </div>
            ))}
          </div>
          <div className="text-center text-[9px] text-white/25 mt-1 tracking-widest font-semibold">
            POTENTIEL →
          </div>

          {/* Panel drill-down absolu */}
          <AnimatePresence>
            {selectedCell && (
              <DrilldownPanel
                cellId={selectedCell}
                stats={stats}
                onClose={() => setSelectedCell(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Légende summary */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2 mt-1">
          {Object.entries(NINEBOX_CELLS).map(([key, cfg]) => {
            const count = stats[key]?.count || 0
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => handleCellClick(key)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] transition-all hover:opacity-90"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  color: cfg.textColor,
                }}
              >
                <span className="font-bold">{count}</span>
                <span>{cfg.label.replace(/^[^\s]+ /, '')}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
