// ============================================================
// APEX RH — ScoreBar.jsx
// ✅ Session 23 — Barre de score colorée PULSE (Phase C)
// ============================================================
import { getScoreColor, PULSE_COLORS } from '../../lib/pulseHelpers'

/**
 * Barre de progression colorée pour afficher un score PULSE.
 *
 * Props :
 *  - score       {number}  valeur 0–100
 *  - label       {string}  libellé affiché à gauche
 *  - color       {string}  couleur hex forcée (optionnel — sinon auto depuis score)
 *  - showValue   {boolean} afficher la valeur numérique (défaut: true)
 *  - height      {number}  hauteur de la barre en px (défaut: 8)
 *  - animated    {boolean} animation de remplissage (défaut: true)
 *  - weight      {string}  pondération ex: "40%" (optionnel)
 *  - compact     {boolean} mode compact sans label (défaut: false)
 */
export default function ScoreBar({
  score,
  label,
  color,
  showValue = true,
  height = 8,
  animated = true,
  weight,
  compact = false,
}) {
  const value  = score === null || score === undefined ? 0 : Math.min(100, Math.max(0, score))
  const barColor = color || getScoreColor(value)
  const hasScore = score !== null && score !== undefined

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Barre */}
        <div
          className="flex-1 rounded-full overflow-hidden"
          style={{
            height,
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          <div
            className={animated ? 'transition-all duration-700 ease-out' : ''}
            style={{
              height: '100%',
              width: `${value}%`,
              background: hasScore
                ? `linear-gradient(90deg, ${barColor}99, ${barColor})`
                : 'rgba(255,255,255,0.08)',
              borderRadius: 'inherit',
            }}
          />
        </div>
        {showValue && (
          <span
            className="text-xs font-bold w-7 text-right tabular-nums"
            style={{ color: hasScore ? barColor : PULSE_COLORS.neutral }}
          >
            {hasScore ? value : '—'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* En-tête : label + poids + valeur */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white/50">{label}</span>
          {weight && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: `${barColor}18`,
                color: barColor,
              }}
            >
              {weight}
            </span>
          )}
        </div>
        {showValue && (
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: hasScore ? barColor : PULSE_COLORS.neutral }}
          >
            {hasScore ? value : '—'}
          </span>
        )}
      </div>

      {/* Barre */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height,
          background: 'rgba(255,255,255,0.05)',
        }}
      >
        <div
          className={animated ? 'transition-all duration-700 ease-out' : ''}
          style={{
            height: '100%',
            width: `${value}%`,
            background: hasScore
              ? `linear-gradient(90deg, ${barColor}99, ${barColor})`
              : 'rgba(255,255,255,0.08)',
            borderRadius: 'inherit',
          }}
        />
      </div>
    </div>
  )
}
