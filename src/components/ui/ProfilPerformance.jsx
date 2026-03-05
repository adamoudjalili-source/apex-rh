// ============================================================
// APEX RH — ProfilPerformance.jsx  ·  Session 37
// Remplacement du score IPR composite par un profil multi-dimensionnel
//
// ⚠️ DÉCISION ARCHITECTURALE PLAN V2 :
//   - PAS de chiffre IPR unique affiché à l'employé
//   - Profil 5 dimensions avec libellés qualitatifs
//   - Managers voient les scores bruts ; employé voit profil qualitatif
//
// Libellés par palier :
//   ≥ 85  → Exemplaire  (vert émeraude)
//   65-84 → Confirmé    (indigo)
//   45-64 → En progression (ambre)
//   < 45  → À accompagner  (rouge)
//
// Usage :
//   <ProfilPerformance iprData={...} isManager={false} compact={false} />
// ============================================================
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'

// ─── Constantes palette qualitative ──────────────────────────

export const QUALITATIVE_LABELS = {
  exemplaire:      { label: 'Exemplaire',      color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  dot: '#10B981' },
  confirme:        { label: 'Confirmé',        color: '#4F46E5', bg: 'rgba(79,70,229,0.12)',   border: 'rgba(79,70,229,0.3)',   dot: '#4F46E5' },
  en_progression:  { label: 'En progression',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  dot: '#F59E0B' },
  a_accompagner:   { label: 'À accompagner',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   dot: '#EF4444' },
  insuffisant:     { label: 'Données manquantes', color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', dot: '#6B7280' },
}

export function getQualitativeLabel(score) {
  if (score === null || score === undefined) return QUALITATIVE_LABELS.insuffisant
  if (score >= 85) return QUALITATIVE_LABELS.exemplaire
  if (score >= 65) return QUALITATIVE_LABELS.confirme
  if (score >= 45) return QUALITATIVE_LABELS.en_progression
  return QUALITATIVE_LABELS.a_accompagner
}

// ─── Radar chart SVG 5 axes ───────────────────────────────────

function RadarChart({ dimensions, size = 220 }) {
  const cx    = size / 2
  const cy    = size / 2
  const r     = (size / 2) - 28
  const n     = 5
  const steps = [20, 40, 60, 80, 100]

  // Positions des axes (commencer en haut, sens horaire)
  const angles = Array.from({ length: n }, (_, i) => (i * 2 * Math.PI / n) - Math.PI / 2)

  const polar = (angle, pct) => [
    cx + r * (pct / 100) * Math.cos(angle),
    cy + r * (pct / 100) * Math.sin(angle),
  ]

  const dims = Object.values(dimensions)

  // Polygone de données
  const dataPoints = dims.map((d, i) => polar(angles[i], d.score ?? 0))
  const dataPath   = dataPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z'

  // Grille de fond (cercles concentriques)
  const gridLines = steps.map(s =>
    dims.map((_, i) => polar(angles[i], s))
       .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z'
  )

  // Labels axes (positionnés à l'extérieur)
  const labelOffset = 1.22
  const labelPositions = dims.map((d, i) => {
    const [lx, ly] = [
      cx + r * labelOffset * Math.cos(angles[i]),
      cy + r * labelOffset * Math.sin(angles[i]),
    ]
    return { x: lx, y: ly, label: d.shortLabel || d.label }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grille */}
      {gridLines.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={i === gridLines.length - 1 ? 1.5 : 0.8} />
      ))}

      {/* Axes */}
      {angles.map((angle, i) => {
        const [ex, ey] = polar(angle, 100)
        return (
          <line key={i} x1={cx} y1={cy} x2={ex.toFixed(1)} y2={ey.toFixed(1)}
            stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
        )
      })}

      {/* Zone de données (fond coloré) */}
      <path d={dataPath}
        fill="rgba(79,70,229,0.12)"
        stroke="rgba(79,70,229,0.5)"
        strokeWidth={1.5}
        strokeLinejoin="round" />

      {/* Points de données */}
      {dataPoints.map(([x, y], i) => {
        const score = dims[i].score
        const ql    = getQualitativeLabel(score)
        return (
          <g key={i}>
            <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={5} fill={ql.color}
              style={{ filter: `drop-shadow(0 0 4px ${ql.color}88)` }} />
            <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={9} fill={ql.color} fillOpacity={0.15} />
          </g>
        )
      })}

      {/* Labels axes */}
      {labelPositions.map((pos, i) => {
        const score = dims[i].score
        const ql    = getQualitativeLabel(score)
        // Alignement selon position
        const anchor = pos.x < cx - 10 ? 'end' : pos.x > cx + 10 ? 'start' : 'middle'
        return (
          <text key={i} x={pos.x.toFixed(1)} y={pos.y.toFixed(1)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={9.5} fontWeight="600" fontFamily="'Inter',sans-serif"
            fill={ql.color} style={{ letterSpacing: '0.02em' }}>
            {pos.label}
          </text>
        )
      })}

      {/* Centre */}
      <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.15)" />
    </svg>
  )
}

// ─── Jauge individuelle d'une dimension ───────────────────────

function DimensionGauge({ dim, isManager, delay = 0 }) {
  const score = dim.score ?? 0
  const ql    = getQualitativeLabel(dim.score)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className="group"
    >
      <div className="rounded-xl p-3.5 transition-all duration-200 hover:bg-white/[0.025]"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: ql.color, boxShadow: `0 0 6px ${ql.color}66` }} />
            <span className="text-xs font-semibold text-white/70">{dim.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Libellé qualitatif (toujours visible) */}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: ql.bg, color: ql.color, border: `1px solid ${ql.border}` }}>
              {ql.label}
            </span>
            {/* Score numérique : seulement pour les managers */}
            {isManager && dim.score !== null && dim.score !== undefined && (
              <span className="text-[11px] font-bold tabular-nums" style={{ color: ql.color }}>
                {dim.score}
              </span>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="relative h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${ql.color}99, ${ql.color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, delay: delay + 0.1, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>

        {/* Description courte si disponible */}
        {dim.description && (
          <p className="text-[10px] text-white/25 mt-1.5 leading-relaxed">{dim.description}</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Badge niveau global (profil) ────────────────────────────

function ProfilBadge({ dimensions }) {
  // Le niveau global = dimension la plus fréquente ou la médiane
  const scores = Object.values(dimensions)
    .map(d => d.score)
    .filter(s => s !== null && s !== undefined)

  if (!scores.length) return null

  // Médiane pondérée selon les poids
  const weighted = Object.values(dimensions)
    .filter(d => d.score !== null && d.score !== undefined)
    .reduce((acc, d) => acc + (d.score * (d.weight || 0.2)), 0)

  const totalWeight = Object.values(dimensions)
    .filter(d => d.score !== null && d.score !== undefined)
    .reduce((acc, d) => acc + (d.weight || 0.2), 0)

  const globalScore = totalWeight > 0 ? Math.round(weighted / totalWeight) : null
  const ql = getQualitativeLabel(globalScore)

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
      style={{ background: ql.bg, border: `1px solid ${ql.border}` }}>
      <div className="w-2 h-2 rounded-full" style={{ background: ql.color }} />
      <span className="text-sm font-bold" style={{ color: ql.color }}>{ql.label}</span>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

export default function ProfilPerformance({
  iprData,
  isManager = false,
  compact   = false,
  showRadar = true,
}) {
  const dimensions = useMemo(() => {
    if (!iprData?.dimensions) return null

    // Enrichir avec labels courts et descriptions
    const enriched = { ...iprData.dimensions }
    if (enriched.pulse) {
      enriched.pulse = { ...enriched.pulse, shortLabel: 'PULSE', description: isManager ? null : 'Régularité et qualité d\'exécution quotidienne' }
    }
    if (enriched.okr) {
      enriched.okr = { ...enriched.okr, shortLabel: 'Objectifs', description: isManager ? null : 'Progression vers vos objectifs du trimestre' }
    }
    if (enriched.perception) {
      enriched.perception = { ...enriched.perception, shortLabel: 'Perception', description: isManager ? null : 'Retours de vos pairs et évaluation formelle' }
    }
    if (enriched.activite) {
      enriched.activite = { ...enriched.activite, shortLabel: 'Activité', description: isManager ? null : 'Performance mesurée sur les opérations NITA' }
    }
    if (enriched.engagement) {
      enriched.engagement = { ...enriched.engagement, shortLabel: 'Engagement', description: isManager ? null : 'Implication et satisfaction mesurées via surveys' }
    }
    return enriched
  }, [iprData, isManager])

  if (!dimensions) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.2)' }}>
          <Info size={18} style={{ color: '#8B5CF6' }} />
        </div>
        <p className="text-sm text-white/40">Profil en cours de construction</p>
        <p className="text-xs text-white/20 max-w-xs">Les données se complètent au fil du mois. Soumettez votre brief et journal quotidiennement.</p>
      </div>
    )
  }

  if (compact) {
    // Version compacte : juste les jauges + badge
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Profil de performance</p>
          <ProfilBadge dimensions={dimensions} />
        </div>
        {Object.values(dimensions).map((dim, i) => (
          <DimensionGauge key={dim.label} dim={dim} isManager={isManager} delay={i * 0.06} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* En-tête profil */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
            Profil de Performance
          </h3>
          <p className="text-xs text-white/30 mt-0.5">
            {isManager ? '5 dimensions — données brutes' : '5 dimensions — vue qualitative'}
          </p>
        </div>
        <ProfilBadge dimensions={dimensions} />
      </div>

      {/* Radar + Jauges côte à côte (desktop) ou empilés (mobile) */}
      <div className={`grid gap-5 ${showRadar ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Radar chart */}
        {showRadar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center justify-center py-4"
          >
            <div className="relative">
              {/* Fond décoratif */}
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)' }} />
              <RadarChart dimensions={dimensions} size={220} />
            </div>
          </motion.div>
        )}

        {/* Jauges 5 dimensions */}
        <div className="space-y-1.5">
          {Object.values(dimensions).map((dim, i) => (
            <DimensionGauge key={dim.label} dim={dim} isManager={isManager} delay={i * 0.07} />
          ))}
        </div>
      </div>

      {/* Message aide si pas manager */}
      {!isManager && (
        <p className="text-[10px] text-white/20 text-center leading-relaxed">
          Votre profil reflète 5 dimensions de performance. Chaque dimension évolue en temps réel.
          {' '}
          <span className="text-white/35">Cliquez sur Intelligence RH pour le détail.</span>
        </p>
      )}
    </div>
  )
}
