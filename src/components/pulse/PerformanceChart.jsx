// ============================================================
// APEX RH — PerformanceChart.jsx
// ✅ Session 23 — Courbe d'évolution du score PULSE (Phase C)
// Pure SVG — aucune dépendance externe
// ============================================================
import { useState, useMemo } from 'react'
import { getScoreColor, PULSE_COLORS, SCORE_THRESHOLDS } from '../../lib/pulseHelpers'

const CHART_H     = 180    // hauteur zone de tracé (px)
const CHART_PAD_L = 40     // padding gauche (axe Y)
const CHART_PAD_R = 16     // padding droit
const CHART_PAD_T = 16     // padding haut
const CHART_PAD_B = 32     // padding bas (axe X)

/**
 * Graphe SVG de l'évolution du score PULSE dans le temps.
 *
 * Props :
 *  - scores      {Array}   tableau de { score_date, score_total, score_delivery,
 *                          score_quality, score_regularity, score_bonus }
 *  - userName    {string}  nom affiché en titre
 *  - showDims    {boolean} afficher lignes dimensions (défaut: false)
 *  - height      {number}  hauteur totale du composant (défaut: 260)
 */
export default function PerformanceChart({
  scores = [],
  userName,
  showDims = false,
  height = 260,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [showDimsLocal, setShowDimsLocal] = useState(showDims)

  const chartW  = 600          // largeur SVG (viewBox — responsive)
  const innerW  = chartW - CHART_PAD_L - CHART_PAD_R
  const innerH  = CHART_H

  // ─── Données normalisées ──────────────────────────────────
  const data = useMemo(() => {
    if (!scores.length) return []
    return scores.map(s => ({
      date:       s.score_date,
      total:      s.score_total      ?? null,
      delivery:   s.score_delivery   ?? null,
      quality:    s.score_quality    ?? null,
      regularity: s.score_regularity ?? null,
      bonus:      s.score_bonus      ?? null,
    }))
  }, [scores])

  // ─── Coordonnées SVG ─────────────────────────────────────
  const n = data.length

  function xAt(i) {
    if (n <= 1) return CHART_PAD_L + innerW / 2
    return CHART_PAD_L + (i / (n - 1)) * innerW
  }

  function yAt(value) {
    if (value === null) return null
    // 0 → bas, 100 → haut
    return CHART_PAD_T + innerH - (value / 100) * innerH
  }

  // ─── Génération path SVG ─────────────────────────────────
  function buildPath(key) {
    const pts = data
      .map((d, i) => ({ x: xAt(i), y: yAt(d[key]) }))
      .filter(p => p.y !== null)

    if (pts.length < 2) return ''

    return pts
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ')
  }

  // ─── Path de l'aire de remplissage ───────────────────────
  function buildAreaPath(key) {
    const pts = data
      .map((d, i) => ({ x: xAt(i), y: yAt(d[key]) }))
      .filter(p => p.y !== null)

    if (pts.length < 2) return ''

    const baseY = CHART_PAD_T + innerH
    const line = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    const close = `L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`
    return line + ' ' + close
  }

  // ─── Ticks axe Y ─────────────────────────────────────────
  const yTicks = [0, 25, 50, 75, 100]

  // ─── Labels axe X : afficher max 6 dates ─────────────────
  function getXLabels() {
    if (!n) return []
    const step = Math.max(1, Math.floor(n / 6))
    const indices = []
    for (let i = 0; i < n; i += step) indices.push(i)
    if (indices[indices.length - 1] !== n - 1) indices.push(n - 1)
    return indices.map(i => ({
      i,
      x: xAt(i),
      label: formatDateShort(data[i].date),
    }))
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // ─── Données du tooltip ───────────────────────────────────
  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null

  // ─── Couleur dynamique par point ─────────────────────────
  function pointColor(value) {
    return getScoreColor(value)
  }

  if (!data.length) {
    return (
      <div
        className="rounded-xl p-8 flex flex-col items-center justify-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          height,
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-xl">📊</span>
        </div>
        <p className="text-sm text-white/30">Aucune donnée de score disponible</p>
        <p className="text-xs text-white/20">Les scores apparaîtront après la soumission des journaux</p>
      </div>
    )
  }

  const totalPath = buildPath('total')
  const areaPath  = buildAreaPath('total')
  const xLabels   = getXLabels()
    ? getScoreColor(hovered.total)
    : PULSE_COLORS.primary

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          {userName && (
            <p className="text-sm font-semibold text-white">{userName}</p>
          )}
          <p className="text-xs text-white/30">
            Évolution du score · {n} jour{n > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowDimsLocal(v => !v)}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: showDimsLocal ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.05)',
            color: showDimsLocal ? '#818CF8' : 'rgba(255,255,255,0.4)',
            border: `1px solid ${showDimsLocal ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          Dimensions
        </button>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="rounded-lg px-3 py-2 flex items-center gap-4 flex-wrap"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-xs text-white/50">{formatDateShort(hovered.date)}</span>
          <span className="text-sm font-bold" style={{ color: getScoreColor(hovered.total) }}>
            Score total : {hovered.total ?? '—'}
          </span>
          {showDimsLocal && (
            <>
              <span className="text-xs" style={{ color: PULSE_COLORS.delivery }}>
                Livr. {hovered.delivery ?? '—'}
              </span>
              <span className="text-xs" style={{ color: PULSE_COLORS.quality }}>
                Qual. {hovered.quality ?? '—'}
              </span>
              <span className="text-xs" style={{ color: PULSE_COLORS.regularity }}>
                Rég. {hovered.regularity ?? '—'}
              </span>
              <span className="text-xs" style={{ color: PULSE_COLORS.bonus }}>
                Bonus {hovered.bonus ?? '—'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Graphe SVG */}
      <svg
        viewBox={`0 0 ${chartW} ${CHART_PAD_T + CHART_H + CHART_PAD_B}`}
        className="w-full"
        style={{ height: height - 80, minHeight: 120 }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          {/* Dégradé aire de remplissage */}
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={PULSE_COLORS.primary} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PULSE_COLORS.primary} stopOpacity="0.02" />
          </linearGradient>
          {/* Lignes de seuil */}
          <marker id="dot" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4">
            <circle cx="2" cy="2" r="2" fill="white" />
          </marker>
        </defs>

        {/* Grille horizontale + ticks Y */}
        {yTicks.map(tick => {
          const y = yAt(tick)
          const isThreshold = tick === SCORE_THRESHOLDS.high || tick === SCORE_THRESHOLDS.medium
          return (
            <g key={tick}>
              <line
                x1={CHART_PAD_L}
                y1={y}
                x2={chartW - CHART_PAD_R}
                y2={y}
                stroke={isThreshold ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)'}
                strokeWidth={isThreshold ? 1.5 : 1}
                strokeDasharray={isThreshold ? '4 3' : 'none'}
              />
              <text
                x={CHART_PAD_L - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="rgba(255,255,255,0.25)"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {/* Seuil critique rouge */}
        <text
          x={CHART_PAD_L - 6}
          y={yAt(SCORE_THRESHOLDS.medium) + 4}
          textAnchor="end"
          fontSize={8}
          fill={PULSE_COLORS.danger + '80'}
        >
          {SCORE_THRESHOLDS.medium}
        </text>
        <text
          x={CHART_PAD_L - 6}
          y={yAt(SCORE_THRESHOLDS.high) + 4}
          textAnchor="end"
          fontSize={8}
          fill={PULSE_COLORS.success + '80'}
        >
          {SCORE_THRESHOLDS.high}
        </text>

        {/* Labels axe X */}
        {xLabels.map(({ i, x, label }) => (
          <text
            key={i}
            x={x}
            y={CHART_PAD_T + CHART_H + 20}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(255,255,255,0.25)"
          >
            {label}
          </text>
        ))}

        {/* ─── Dimensions (optionnelles) ─── */}
        {showDimsLocal && (
          <>
            <path d={buildPath('delivery')}   fill="none" stroke={PULSE_COLORS.delivery}   strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="3 2" />
            <path d={buildPath('quality')}    fill="none" stroke={PULSE_COLORS.quality}    strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="3 2" />
            <path d={buildPath('regularity')} fill="none" stroke={PULSE_COLORS.regularity} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="3 2" />
          </>
        )}

        {/* ─── Aire score total ─── */}
        {areaPath && (
          <path d={areaPath} fill="url(#areaGrad)" />
        )}

        {/* ─── Ligne score total ─── */}
        {totalPath && (
          <path
            d={totalPath}
            fill="none"
            stroke={PULSE_COLORS.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* ─── Points interactifs ─── */}
        {data.map((d, i) => {
          if (d.total === null) return null
          const x = xAt(i)
          const y = yAt(d.total)
          const color = pointColor(d.total)
          const isHovered = hoveredIdx === i

          return (
            <g key={i}>
              {/* Zone de survol élargie */}
              <rect
                x={x - 12}
                y={CHART_PAD_T}
                width={24}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
              />
              {/* Ligne verticale au survol */}
              {isHovered && (
                <line
                  x1={x} y1={CHART_PAD_T}
                  x2={x} y2={CHART_PAD_T + innerH}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}
              {/* Point */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : n > 30 ? 0 : 3.5}
                fill={isHovered ? color : PULSE_COLORS.primary}
                stroke={isHovered ? 'white' : 'rgba(15,15,35,0.8)'}
                strokeWidth={isHovered ? 2 : 1.5}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )
        })}
      </svg>

      {/* Légende dimensions */}
      {showDimsLocal && (
        <div className="flex flex-wrap gap-3 pt-1">
          {[
            { label: 'Livraison',  color: PULSE_COLORS.delivery },
            { label: 'Qualité',    color: PULSE_COLORS.quality },
            { label: 'Régularité', color: PULSE_COLORS.regularity },
          ].map(d => (
            <div key={d.label} className="flex items-center gap-1.5">
              <div
                className="w-4 h-0.5 rounded"
                style={{ background: d.color, opacity: 0.7 }}
              />
              <span className="text-xs text-white/30">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
