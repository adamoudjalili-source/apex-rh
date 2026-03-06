// ============================================================
// APEX RH — Design System Premium  ·  Session 36 v3
// Fichier unique : GaugeRing + Sparkline + TrendBadge + MetricCard
// Export nommé pour tout importer depuis un seul chemin
// ============================================================
import { useEffect, useRef, useState } from 'react'

// ─── Couleurs IPR ─────────────────────────────────────────────
export const iprColor = s =>
  (s === null || s === undefined) ? '#6B7280'
  : s >= 70 ? '#10B981' : s >= 40 ? '#F59E0B' : '#EF4444'

export const iprLabel = s =>
  (s === null || s === undefined) ? '—'
  : s >= 80 ? 'Excellent' : s >= 70 ? 'Très bien'
  : s >= 55 ? 'Bien' : s >= 40 ? 'Moyen' : 'Insuffisant'

// ─── GaugeRing ───────────────────────────────────────────────
export function GaugeRing({ score = 0, size = 96, stroke = 8, color, trackColor = 'rgba(255,255,255,0.06)', children }) {
  const [animated, setAnimated] = useState(0)
  const resolvedColor = color || iprColor(score)
  useEffect(() => { const t = setTimeout(() => setAnimated(score ?? 0), 120); return () => clearTimeout(t) }, [score])
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (animated / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={resolvedColor} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${resolvedColor}55)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

// ─── Sparkline ───────────────────────────────────────────────
export function Sparkline({ data = [], width = 120, height = 36, color = '#4F46E5', filled = true }) {
  if (!data?.length || data.length < 2) {
    return (
      <svg width={width} height={height}>
        <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4,4" />
      </svg>
    )
  }
  const p = 3, min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => [
    p + (i / (data.length - 1)) * (width - p * 2),
    p + (1 - (v - min) / range) * (height - p * 2),
  ])
  const d    = pts.map(([x,y],i) => `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const fill = filled ? `${d} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z` : null
  const gid  = `sg${color.replace(/[^a-z0-9]/gi,'')}`
  const [lx, ly] = pts.at(-1)
  return (
    <svg width={width} height={height} overflow="visible">
      {filled && <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
        <stop offset="100%" stopColor={color} stopOpacity="0.01" />
      </linearGradient></defs>}
      {filled && <path d={fill} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
      <circle cx={lx} cy={ly} r={5}   fill={color} fillOpacity={0.18} />
    </svg>
  )
}

// ─── TrendBadge ──────────────────────────────────────────────
export function TrendBadge({ value, suffix = 'pts', size = 'sm' }) {
  if (value === null || value === undefined) return null
  const pos = value > 0, neu = value === 0
  const c   = neu
    ? { bg:'rgba(107,114,128,0.12)', text:'#9CA3AF', border:'rgba(107,114,128,0.2)' }
    : pos
    ? { bg:'rgba(16,185,129,0.1)',   text:'#10B981', border:'rgba(16,185,129,0.25)' }
    : { bg:'rgba(239,68,68,0.1)',    text:'#EF4444', border:'rgba(239,68,68,0.25)' }
  const cls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${cls}`}
      style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>
      {neu ? '→' : pos ? '↑' : '↓'} {Math.abs(value)}{suffix}
    </span>
  )
}

// ─── AnimatedCounter ─────────────────────────────────────────
function AnimatedCounter({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (value === null || value === undefined) return
    const start = performance.now()
    const from  = display
    const run   = ts => {
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (value - from) * ease))
      if (p < 1) raf.current = requestAnimationFrame(run)
    }
    raf.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf.current)
  }, [value]) // eslint-disable-line
  return <>{display ?? '—'}</>
}

// ─── MetricCard ──────────────────────────────────────────────
// Compteur animé + sparkline intégrée + trend badge + glassmorphism
export function MetricCard({
  label, value, suffix = '', sparklineData, color = '#4F46E5',
  trend, trendSuffix = 'pts', icon, size = 'md', onClick,
}) {
  const [hovered, setHovered] = useState(false)
  const sizes = {
    sm: { card:'p-4', val:'text-2xl', lbl:'text-[10px]' },
    md: { card:'p-5', val:'text-3xl', lbl:'text-xs' },
    lg: { card:'p-6', val:'text-4xl', lbl:'text-sm' },
  }
  const s = sizes[size] || sizes.md
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${onClick?'cursor-pointer':''} ${s.card}`}
      style={{
        background: hovered
          ? 'rgba(255,255,255,0.045)'
          : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? `${color}35` : 'rgba(255,255,255,0.07)'}`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 32px ${color}15` : 'none',
      }}
    >
      {/* Orbe décoratif */}
      {hovered && (
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />
      )}

      <div className="relative z-10">
        {/* Label + icône */}
        <div className="flex items-center justify-between mb-3">
          <p className={`${s.lbl} font-semibold text-white/40 uppercase tracking-wider`}>{label}</p>
          {icon && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background:`${color}15`, color }}>
              {icon}
            </div>
          )}
        </div>

        {/* Valeur animée */}
        <div className="flex items-end gap-2 mb-3">
          <p className={`${s.val} font-black leading-none`}
            style={{ color, fontFamily:"'Syne',sans-serif" }}>
            {value !== null && value !== undefined
              ? <AnimatedCounter value={value} />
              : '—'}
            {value !== null && value !== undefined && suffix && (
              <span className="text-sm font-normal text-white/25 ml-1">{suffix}</span>
            )}
          </p>
          {trend !== null && trend !== undefined && (
            <div className="mb-1"><TrendBadge value={trend} suffix={trendSuffix} /></div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData?.length > 1 && (
          <Sparkline data={sparklineData} width="100%" height={32} color={color} filled />
        )}
      </div>
    </div>
  )
}
