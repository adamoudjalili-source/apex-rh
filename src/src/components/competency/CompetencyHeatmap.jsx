// ============================================================
// APEX RH — src/components/competency/CompetencyHeatmap.jsx · S84
// Heatmap SVG compétences × collaborateurs
// Axes : compétences (colonnes) · collaborateurs (lignes)
// Couleur : niveau 1–5 → rouge→vert ; gris = non évalué
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOrgAssessments, useCompetenciesList, useCompetencyCategories, useRefreshCompetencyCoverage } from '../../hooks/useCompetencyS84'
import { useUsersList } from '../../hooks/useSettings'

// ─── Couleur niveau ───────────────────────────────────────────
const LEVEL_COLORS = {
  null: 'rgba(255,255,255,0.06)',
  0:    'rgba(255,255,255,0.06)',
  1:    '#EF4444',
  2:    '#F97316',
  3:    '#F59E0B',
  4:    '#3B82F6',
  5:    '#10B981',
}

const LEVEL_LABELS = ['—', 'Débutant', 'En cours', 'Compétent', 'Avancé', 'Expert']

// ─── Légende ──────────────────────────────────────────────────
function Legende() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Niveau :</span>
      {[0, 1, 2, 3, 4, 5].map(n => (
        <div key={n} className="flex items-center gap-1">
          <div
            className="rounded"
            style={{ width: 14, height: 14, background: LEVEL_COLORS[n] || LEVEL_COLORS[0] }}
          />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {n === 0 ? 'N/A' : `${n} – ${LEVEL_LABELS[n]}`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function CompetencyHeatmap() {
  const { canAdmin } = useAuth()
  const { data: assessments = [], isLoading: loadA } = useOrgAssessments()
  const { data: competencies = [], isLoading: loadC } = useCompetenciesList()
  const { data: categories = [] }                    = useCompetencyCategories()
  const { data: users = [] }                         = useUsersList()
  const refresh = useRefreshCompetencyCoverage()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [hoveredCell, setHoveredCell]           = useState(null)
  const [hoveredUser, setHoveredUser]           = useState(null)

  const loading = loadA || loadC

  // Filtrer compétences par catégorie
  const filteredComps = useMemo(() => {
    if (selectedCategory === 'all') return competencies
    return competencies.filter(c => c.category_id === selectedCategory)
  }, [competencies, selectedCategory])

  // Construire matrice niveau max par (user_id, competency_id)
  const matrix = useMemo(() => {
    const m = {}
    assessments.forEach(a => {
      const key = `${a.user_id}__${a.competency_id}`
      if (!m[key] || a.assessed_level > m[key]) m[key] = a.assessed_level
    })
    return m
  }, [assessments])

  // Utilisateurs qui ont au moins 1 évaluation
  const evaluatedUserIds = useMemo(() => {
    const ids = new Set(assessments.map(a => a.user_id))
    return Array.from(ids)
  }, [assessments])

  const evaluatedUsers = useMemo(() => {
    return evaluatedUserIds
      .map(id => users.find(u => u.id === id))
      .filter(Boolean)
      .sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`))
  }, [evaluatedUserIds, users])

  // Dimensions cellule
  const CELL_W = 36
  const CELL_H = 32
  const LABEL_H = 110  // hauteur entête colonnes (noms compétences en diagonal)
  const LABEL_W = 160  // largeur colonne noms utilisateurs

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#4F46E5', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (competencies.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
        <AlertCircle size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Aucune compétence définie. Créez d'abord votre catalogue.
        </p>
      </div>
    )
  }

  if (evaluatedUsers.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
        <AlertCircle size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Aucune évaluation enregistrée. Ajoutez des évaluations dans les profils individuels.
        </p>
      </div>
    )
  }

  const svgW = LABEL_W + filteredComps.length * CELL_W
  const svgH = LABEL_H + evaluatedUsers.length * CELL_H

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'white' }}>
            Heatmap Compétences
          </h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {evaluatedUsers.length} collaborateurs · {filteredComps.length} compétences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtre catégorie */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Filter size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs bg-transparent"
              style={{ color: 'rgba(255,255,255,0.7)', outline: 'none' }}
            >
              <option value="all">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          {canAdmin && (
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
              Actualiser
            </button>
          )}
        </div>
      </div>

      <Legende />

      {/* Heatmap SVG */}
      <div className="overflow-auto rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          {/* Entêtes colonnes (noms compétences) — en diagonale */}
          {filteredComps.map((comp, ci) => {
            const x = LABEL_W + ci * CELL_W + CELL_W / 2
            const cat = comp.competency_categories
            const color = cat?.color || '#6B7280'
            return (
              <g key={comp.id}>
                <text
                  x={x}
                  y={LABEL_H - 8}
                  fontSize={11}
                  fill={color}
                  textAnchor="start"
                  transform={`rotate(-45 ${x} ${LABEL_H - 8})`}
                >
                  {comp.name.length > 20 ? comp.name.slice(0, 18) + '…' : comp.name}
                </text>
              </g>
            )
          })}

          {/* Lignes utilisateurs */}
          {evaluatedUsers.map((user, ri) => {
            const y = LABEL_H + ri * CELL_H
            const isHovered = hoveredUser === user.id
            return (
              <g key={user.id}>
                {/* Fond ligne au survol */}
                {isHovered && (
                  <rect
                    x={0} y={y}
                    width={svgW} height={CELL_H}
                    fill="rgba(255,255,255,0.04)"
                  />
                )}
                {/* Nom utilisateur */}
                <text
                  x={LABEL_W - 8}
                  y={y + CELL_H / 2 + 4}
                  fontSize={11}
                  fill={isHovered ? 'white' : 'rgba(255,255,255,0.65)'}
                  textAnchor="end"
                  fontWeight={isHovered ? '600' : '400'}
                >
                  {user.last_name} {user.first_name}
                </text>

                {/* Cellules */}
                {filteredComps.map((comp, ci) => {
                  const key = `${user.id}__${comp.id}`
                  const level = matrix[key] || 0
                  const color = LEVEL_COLORS[level]
                  const isHov = hoveredCell?.r === ri && hoveredCell?.c === ci
                  const cx = LABEL_W + ci * CELL_W
                  return (
                    <g key={comp.id}>
                      <rect
                        x={cx + 2} y={y + 2}
                        width={CELL_W - 4} height={CELL_H - 4}
                        rx={4}
                        fill={color}
                        style={{ cursor: 'default', transition: 'opacity 0.1s' }}
                        opacity={isHov ? 1 : 0.85}
                        onMouseEnter={() => { setHoveredCell({ r: ri, c: ci, level, user, comp }); setHoveredUser(user.id) }}
                        onMouseLeave={() => { setHoveredCell(null); setHoveredUser(null) }}
                      />
                      {level > 0 && (
                        <text
                          x={cx + CELL_W / 2} y={y + CELL_H / 2 + 4}
                          fontSize={11} fontWeight="700"
                          fill="rgba(255,255,255,0.9)"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {level}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Tooltip */}
          {hoveredCell && (() => {
            const { r, c, level, user, comp } = hoveredCell
            const tx = LABEL_W + c * CELL_W + CELL_W / 2
            const ty = LABEL_H + r * CELL_H - 10
            const label = LEVEL_LABELS[level] || '—'
            const txt = `${user.first_name} ${user.last_name} · ${comp.name} : ${level > 0 ? `${level} – ${label}` : 'Non évalué'}`
            return (
              <g>
                <rect
                  x={Math.min(tx - 4, svgW - txt.length * 6 - 12)}
                  y={ty - 18}
                  width={txt.length * 6 + 16}
                  height={22}
                  rx={5}
                  fill="rgba(15,23,42,0.95)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                />
                <text
                  x={Math.min(tx + 4, svgW - txt.length * 6 - 4)}
                  y={ty - 2}
                  fontSize={10}
                  fill="rgba(255,255,255,0.85)"
                >
                  {txt}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
