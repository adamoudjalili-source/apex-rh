// ============================================================
// APEX RH — ScoreCard.jsx
// ✅ Session 23 — Carte score décomposé PULSE (Phase C)
// ============================================================
import { TrendingUp, TrendingDown, Minus, User } from 'lucide-react'
import {
  getScoreColor,
  getScoreLabel,
  PULSE_COLORS,
} from '../../lib/pulseHelpers'
import ScoreBar from './ScoreBar'

/**
 * Carte de score PULSE pour un agent.
 * Affiche le score total + décomposition en 4 dimensions.
 *
 * Props :
 *  - firstName   {string}
 *  - lastName    {string}
 *  - role        {string}
 *  - service     {string}
 *  - rank        {number}   position dans le classement (optionnel)
 *  - avgTotal    {number}   score total moyen
 *  - avgDelivery {number}
 *  - avgQuality  {number}
 *  - avgRegularity {number}
 *  - avgBonus    {number}
 *  - daysCount   {number}   nombre de jours avec score
 *  - trend       {number}   +/– points vs période précédente
 *  - onClick     {func}     callback au clic (optionnel)
 *  - selected    {boolean}  carte active (optionnel)
 *  - compact     {boolean}  mode compact liste (défaut: false)
 */
export default function ScoreCard({
  firstName,
  lastName,
  role,
  service,
  rank,
  avgTotal,
  avgDelivery,
  avgQuality,
  avgRegularity,
  avgBonus,
  daysCount = 0,
  trend = 0,
  onClick,
  selected = false,
  compact = false,
}) {
  const scoreColor = getScoreColor(avgTotal)
  const scoreLabel = getScoreLabel(avgTotal)
  const hasScore   = avgTotal !== null && avgTotal !== undefined

  // Icône de tendance
  const TrendIcon = trend > 5 ? TrendingUp : trend < -5 ? TrendingDown : Minus
  const trendColor = trend > 5
    ? PULSE_COLORS.success
    : trend < -5
      ? PULSE_COLORS.danger
      : PULSE_COLORS.neutral

  // Médaille selon le rang
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  if (compact) {
    // ─── MODE LISTE (compact) ─────────────────────────────
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
        style={{
          background: selected
            ? `${scoreColor}12`
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${selected ? scoreColor + '40' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        {/* Rang + Médaille */}
        <div className="w-8 flex-shrink-0 text-center">
          {medal
            ? <span className="text-lg leading-none">{medal}</span>
            : <span className="text-sm font-bold text-white/30">#{rank}</span>
          }
        </div>

        {/* Avatar initiales */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ background: `${scoreColor}30`, border: `1px solid ${scoreColor}40` }}
        >
          {(firstName?.[0] || '?').toUpperCase()}
        </div>

        {/* Nom */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {firstName} {lastName}
          </p>
          {service && (
            <p className="text-xs text-white/30 truncate">{service}</p>
          )}
        </div>

        {/* Barre compacte */}
        <div className="w-24 flex-shrink-0">
          <ScoreBar score={avgTotal} compact showValue={false} height={6} />
        </div>

        {/* Score + tendance */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="text-lg font-black tabular-nums"
            style={{ color: hasScore ? scoreColor : PULSE_COLORS.neutral }}
          >
            {hasScore ? avgTotal : '—'}
          </span>
          {Math.abs(trend) > 0 && (
            <TrendIcon
              size={14}
              style={{ color: trendColor }}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>
    )
  }

  // ─── MODE CARTE (expanded) ────────────────────────────────
  return (
    <div
      onClick={onClick}
      className="rounded-xl p-5 space-y-4 cursor-pointer transition-all"
      style={{
        background: selected
          ? `${scoreColor}10`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? scoreColor + '40' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* En-tête : avatar + nom + rang */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: `${scoreColor}20`, border: `1px solid ${scoreColor}30` }}
        >
          {rank && medal
            ? <span className="text-base">{medal}</span>
            : (firstName?.[0] || '?').toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">
              {firstName} {lastName}
            </p>
            {rank && !medal && (
              <span className="text-xs text-white/30">#{rank}</span>
            )}
          </div>
          {service && (
            <p className="text-xs text-white/40">{service}</p>
          )}
        </div>
        {/* Score principal */}
        <div className="flex flex-col items-end">
          <span
            className="text-2xl font-black tabular-nums"
            style={{ color: hasScore ? scoreColor : PULSE_COLORS.neutral }}
          >
            {hasScore ? avgTotal : '—'}
          </span>
          <span className="text-xs" style={{ color: scoreColor }}>
            {scoreLabel}
          </span>
        </div>
      </div>

      {/* Décomposition 4 dimensions */}
      <div className="space-y-2">
        <ScoreBar
          score={avgDelivery}
          label="Livraison"
          color={PULSE_COLORS.delivery}
          weight="40%"
          height={6}
        />
        <ScoreBar
          score={avgQuality}
          label="Qualité"
          color={PULSE_COLORS.quality}
          weight="30%"
          height={6}
        />
        <ScoreBar
          score={avgRegularity}
          label="Régularité"
          color={PULSE_COLORS.regularity}
          weight="20%"
          height={6}
        />
        <ScoreBar
          score={avgBonus}
          label="Bonus OKR"
          color={PULSE_COLORS.bonus}
          weight="10%"
          height={6}
        />
      </div>

      {/* Pied : jours + tendance */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-xs text-white/30">
          {daysCount} jour{daysCount > 1 ? 's' : ''}
        </span>
        {Math.abs(trend) > 0 && (
          <div className="flex items-center gap-1">
            <TrendIcon size={13} style={{ color: trendColor }} />
            <span className="text-xs font-medium" style={{ color: trendColor }}>
              {trend > 0 ? '+' : ''}{trend} pts
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
