// ============================================================
// APEX RH — src/components/behavioral/AttritionRiskBadge.jsx
// Session 54 — Badge niveau de risque d'attrition
// ============================================================
import { getRiskConfig } from '../../hooks/useBehavioralIntelligence'
import { CRITICALITY } from '../../utils/constants'

export default function AttritionRiskBadge({ level = 'low', score, size = 'sm', showScore = false }) {
  const cfg = getRiskConfig(level)

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizes[size] || sizes.sm}`}
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span className="leading-none">{cfg.icon}</span>
      {cfg.label}
      {showScore && score !== undefined && (
        <span className="ml-0.5 font-bold">{Math.round(score)}</span>
      )}
    </span>
  )
}

// Mini jauge de risque horizontale
export function AttritionRiskBar({ score = 0, height = 4 }) {
  const level = score >= 75 ? CRITICALITY.CRITICAL : score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low'
  const cfg = getRiskConfig(level)

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${score}%`, background: cfg.color }}
      />
    </div>
  )
}

// Cercle de score
export function AttritionRiskCircle({ score = 0, size = 56 }) {
  const level = score >= 75 ? CRITICALITY.CRITICAL : score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low'
  const cfg = getRiskConfig(level)
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3}
        />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={cfg.color} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: `rotate(-90deg)`, transformOrigin: 'center', transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color: cfg.text }}
      >
        {Math.round(score)}
      </span>
    </div>
  )
}
