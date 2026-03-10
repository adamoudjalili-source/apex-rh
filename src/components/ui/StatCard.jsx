// ============================================================
// APEX RH — StatCard.jsx  (composant partagé — S112c)
// S135 — Theme-aware : dark/light via useTheme()
// ============================================================
import { motion }    from 'framer-motion'
import { useTheme }  from '../../contexts/ThemeContext'

export default function StatCard({
  icon: Icon,
  label, value, sub,
  color     = '#6366F1',
  trend, prevVal, unit = '',
  loading   = false,
  alert     = false,
  onClick,
  animate   = true,
}) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  const cardStyle = {
    background:  isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
    border:      `1px solid ${alert
                    ? 'rgba(251,146,60,0.3)'
                    : isLight ? '#E8ECF2' : 'rgba(255,255,255,0.06)'}`,
    boxShadow:   isLight
                    ? '0 1px 4px rgba(50,50,93,0.07), 0 1px 2px rgba(0,0,0,0.04)'
                    : 'none',
  }

  const Wrapper = animate ? motion.div : 'div'
  const motionProps = animate
    ? { initial: { opacity:0, y:8 }, animate: { opacity:1, y:0 }, transition: { duration:0.3 } }
    : {}

  if (loading) {
    return (
      <div className="rounded-2xl p-4 animate-pulse" style={cardStyle}>
        <div className="w-8 h-8 rounded-xl mb-3"
             style={{ background: isLight ? '#E8ECF2' : 'rgba(255,255,255,0.06)' }} />
        <div className="h-6 w-16 rounded mb-1"
             style={{ background: isLight ? '#E8ECF2' : 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 w-24 rounded"
             style={{ background: isLight ? '#EEF1F7' : 'rgba(255,255,255,0.04)' }} />
      </div>
    )
  }

  return (
    <Wrapper
      {...motionProps}
      onClick={onClick}
      className={`rounded-2xl p-4 flex flex-col gap-3 transition-transform duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      style={cardStyle}
    >
      {/* Header : icône + trend */}
      <div className="flex items-center justify-between">
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
            <Icon size={14} style={{ color }} />
          </div>
        )}
        {trend !== undefined && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
                style={{
                  background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color:      trend >= 0 ? '#10B981' : '#EF4444',
                }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Valeur principale */}
      <div>
        <p className="text-2xl font-black leading-none"
           style={{ fontFamily:"'Syne',sans-serif", color }}>
          {value ?? '—'}
          {unit
            ? <span className="text-sm font-normal ml-1"
                    style={{ color: isLight ? 'rgba(26,31,54,0.40)' : 'rgba(255,255,255,0.50)' }}>
                {unit}
              </span>
            : null}
        </p>
        <p className="text-[11px] mt-1"
           style={{ color: isLight ? 'rgba(26,31,54,0.45)' : 'rgba(255,255,255,0.40)' }}>
          {label}
        </p>
        {sub && (
          <p className="text-[10px] mt-0.5"
             style={{ color: isLight ? 'rgba(26,31,54,0.30)' : 'rgba(255,255,255,0.25)' }}>
            {sub}
          </p>
        )}
        {prevVal && (
          <p className="text-[10px] mt-0.5"
             style={{ color: isLight ? 'rgba(26,31,54,0.25)' : 'rgba(255,255,255,0.20)' }}>
            Précédent : {prevVal}
          </p>
        )}
      </div>
    </Wrapper>
  )
}
