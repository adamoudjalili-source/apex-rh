// ============================================================
// APEX RH — AwardBadge.jsx
// ✅ Session 24 — Badge award PULSE (Phase E)
// ============================================================
import { motion } from 'framer-motion'
import { AWARD_TYPES, formatAwardMonth } from '../../hooks/useAwards'

/**
 * Badge d'award PULSE.
 *
 * Props :
 * - awardType   {string}  — 'star_of_month' | 'top_delivery' | 'most_improved'
 * - year        {number}  — ex: 2025
 * - month       {number}  — 1–12
 * - size        {'sm'|'md'|'lg'} — taille du badge (défaut: 'md')
 * - showMonth   {boolean} — afficher le mois (défaut: false)
 * - animate     {boolean} — animation d'apparition (défaut: true)
 */
export default function AwardBadge({
  awardType,
  year,
  month,
  size = 'md',
  showMonth = false,
  animate = true,
}) {
  const config = AWARD_TYPES[awardType]
  if (!config) return null

  const sizes = {
    sm: { outer: 'w-8 h-8',   icon: 'text-base',   label: 'text-[10px]', ring: 'ring-1' },
    md: { outer: 'w-11 h-11', icon: 'text-xl',    label: 'text-xs',     ring: 'ring-2' },
    lg: { outer: 'w-16 h-16', icon: 'text-3xl',   label: 'text-sm',     ring: 'ring-2' },
  }

  const s = sizes[size] || sizes.md

  const badge = (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${s.outer} rounded-full flex items-center justify-center ${s.ring} relative`}
        style={{
          background:   `${config.color}18`,
          ringColor:    config.color,
          borderColor:  config.color,
          border:       `2px solid ${config.color}50`,
          boxShadow:    `0 0 12px ${config.color}25`,
        }}
        title={config.label}
      >
        <span className={s.icon}>{config.icon}</span>
      </div>
      {(showMonth && year && month) && (
        <span className="text-[10px] text-white/40 whitespace-nowrap">
          {formatAwardMonth(year, month)}
        </span>
      )}
    </div>
  )

  if (!animate) return badge

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {badge}
    </motion.div>
  )
}

// ─── VARIANTE : liste de badges ──────────────────────────────
/**
 * Affiche plusieurs badges en ligne (pour le profil ou la carte agent).
 * Filtre automatiquement 'lowest_performer' (confidentiel).
 */
export function AwardBadgeList({ awards = [], size = 'sm', showMonth = false }) {
  const visible = awards.filter(a => a.award_type !== 'lowest_performer')
  if (!visible.length) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visible.map((award) => (
        <AwardBadge
          key={award.id || `${award.award_type}-${award.award_year}-${award.award_month}`}
          awardType={award.award_type}
          year={award.award_year}
          month={award.award_month}
          size={size}
          showMonth={showMonth}
        />
      ))}
    </div>
  )
}

// ─── VARIANTE : carte award complète ─────────────────────────
/**
 * Carte award avec nom du lauréat, type et score.
 */
export function AwardCard({ award, isManager = false }) {
  const config = AWARD_TYPES[award.award_type]
  if (!config) return null
  if (config.confidential && !isManager) return null

  const userName = award.user
    ? `${award.user.first_name} ${award.user.last_name}`
    : '—'

  const score = award.score_snapshot?.avg_total

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 flex items-center gap-4"
      style={{
        background: `${config.color}08`,
        border:     `1px solid ${config.color}25`,
      }}
    >
      {/* Icône */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
        style={{
          background: `${config.color}15`,
          border:     `2px solid ${config.color}40`,
        }}
      >
        {config.icon}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
           style={{ color: config.color }}>
          {config.label}
        </p>
        <p className="text-sm font-bold text-white truncate">{userName}</p>
        {award.user?.services?.name && (
          <p className="text-xs text-white/30 truncate">{award.user.services.name}</p>
        )}
      </div>

      {/* Score */}
      {score != null && (
        <div
          className="flex flex-col items-center px-3 py-2 rounded-lg flex-shrink-0"
          style={{
            background: `${config.color}10`,
            border:     `1px solid ${config.color}20`,
          }}
        >
          <span className="text-xl font-black" style={{ color: config.color }}>
            {Math.round(score)}
          </span>
          <span className="text-[9px] text-white/30">score</span>
        </div>
      )}
    </motion.div>
  )
}
