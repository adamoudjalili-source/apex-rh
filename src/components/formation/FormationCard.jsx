// ============================================================
// APEX RH — components/formation/FormationCard.jsx
// Session 57 — Carte formation du catalogue
// ============================================================
import { motion } from 'framer-motion'
import {
  Clock, Users, Star, Award, BookOpen,
  Monitor, Video, Mic2, UserCheck, Globe, ExternalLink,
} from 'lucide-react'
import {
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS,
  LEVEL_LABELS, LEVEL_COLORS,
} from '../../hooks/useFormations'

const TYPE_ICONS = {
  presentiel:   UserCheck,
  'e-learning': Monitor,
  blended:      BookOpen,
  webinar:      Video,
  coaching:     Mic2,
  conference:   Globe,
}

function StarRating({ value, max = 5, size = 12 }) {
  if (!value) return <span className="text-white/20 text-xs">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={size}
          className={i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-white/10'}
        />
      ))}
      <span className="text-xs text-white/40 ml-1">{Number(value).toFixed(1)}</span>
    </div>
  )
}

export default function FormationCard({ training, onSelect, enrolled, compact = false }) {
  const {
    title, type, provider, duration_hours, level,
    is_mandatory, tags = [], description,
    mv_training_popularity,
  } = training

  const TypeIcon   = TYPE_ICONS[type] || BookOpen
  const typeColor  = TRAINING_TYPE_COLORS[type]  || '#6366F1'
  const levelColor = LEVEL_COLORS[level] || '#6B7280'
  const stats      = mv_training_popularity?.[0] || mv_training_popularity || null

  const completionRate = stats?.completion_rate
  const avgRating      = stats?.avg_rating
  const totalEnroll    = stats?.total_enrollments

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.18 }}
      onClick={() => onSelect?.(training)}
      className="rounded-xl border border-white/[0.07] cursor-pointer group overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)' }}
    >
      {/* Barre couleur type */}
      <div className="h-1" style={{ background: typeColor }}/>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${typeColor}20` }}>
              <TypeIcon size={16} style={{ color: typeColor }}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-indigo-300 transition-colors">
                {title}
              </p>
              {provider && (
                <p className="text-[11px] text-white/35 truncate">{provider}</p>
              )}
            </div>
          </div>
          {is_mandatory && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
              Obligatoire
            </span>
          )}
        </div>

        {/* Description (si non compact) */}
        {!compact && description && (
          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${typeColor}18`, color: typeColor }}>
            {TRAINING_TYPE_LABELS[type]}
          </span>
          {level && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${levelColor}18`, color: levelColor }}>
              {LEVEL_LABELS[level]}
            </span>
          )}
          {enrolled && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-400">
              ✓ Inscrit
            </span>
          )}
        </div>

        {/* Stats + durée */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-3">
            {duration_hours && (
              <div className="flex items-center gap-1 text-xs text-white/35">
                <Clock size={11}/>
                <span>{duration_hours}h</span>
              </div>
            )}
            {totalEnroll > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/35">
                <Users size={11}/>
                <span>{totalEnroll}</span>
              </div>
            )}
          </div>
          {avgRating ? (
            <StarRating value={avgRating}/>
          ) : completionRate ? (
            <span className="text-xs text-white/30">{completionRate}% taux</span>
          ) : null}
        </div>

        {/* Tags */}
        {!compact && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25">
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-white/20">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
