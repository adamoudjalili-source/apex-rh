// ============================================================
// APEX RH — StatCard.jsx  (composant partagé — S112c)
// Remplace les 19 StatCard/KpiCard locaux éparpillés dans le projet
//
// Props:
//   icon       : composant Lucide (optionnel)
//   label      : string
//   value      : string | number
//   sub        : string (ligne secondaire sous la valeur)
//   color      : CSS color string ex: '#6366F1'
//   trend      : number (% variation, positif/négatif, optionnel)
//   prevVal    : string (valeur précédente, optionnel)
//   unit       : string (unité après la valeur, optionnel)
//   loading    : bool
//   alert      : bool (bordure orange si vrai)
//   onClick    : function (optionnel)
//   animate    : bool (motion.div, défaut true)
// ============================================================

import { motion } from 'framer-motion'

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color     = '#6366F1',
  trend,
  prevVal,
  unit      = '',
  loading   = false,
  alert     = false,
  onClick,
  animate   = true,
}) {
  const Wrapper = animate ? motion.div : 'div'
  const motionProps = animate
    ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }
    : {}

  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] mb-3" />
        <div className="h-6 w-16 bg-white/[0.06] rounded mb-1" />
        <div className="h-3 w-24 bg-white/[0.04] rounded" />
      </div>
    )
  }

  const borderColor = alert ? 'rgba(251,146,60,0.3)' : 'rgba(255,255,255,0.06)'

  return (
    <Wrapper
      {...motionProps}
      onClick={onClick}
      className={`rounded-2xl p-4 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} transition-transform duration-200`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header : icône + trend */}
      <div className="flex items-center justify-between">
        {Icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}25` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
        )}
        {trend !== undefined && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
            style={{
              background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: trend >= 0 ? '#10B981' : '#EF4444',
            }}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Valeur principale */}
      <div>
        <p
          className="text-2xl font-black text-white leading-none"
          style={{ fontFamily: "'Syne', sans-serif", color: color || 'white' }}
        >
          {value ?? '—'}{unit ? <span className="text-sm font-normal ml-1 text-white/50">{unit}</span> : null}
        </p>
        <p className="text-[11px] text-white/40 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
        {prevVal && (
          <p className="text-[10px] text-white/20 mt-0.5">Précédent : {prevVal}</p>
        )}
      </div>
    </Wrapper>
  )
}
