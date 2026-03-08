// ============================================================
// APEX RH — src/components/behavioral/RiskFactorBreakdown.jsx
// Session 54 — Détail des facteurs de risque d'attrition
// ============================================================
import { Activity, MessageSquare, Target, Clock, Wifi } from 'lucide-react'
import { RISK_CONFIG } from '../../hooks/useBehavioralIntelligence'

const FACTORS = [
  {
    key: 'factor_pulse',
    label: 'PULSE Trend',
    icon: Activity,
    weight: '30%',
    color: '#8B5CF6',
    description: 'Évolution de la performance PULSE sur 3 mois',
    invert: false,
  },
  {
    key: 'factor_feedback',
    label: 'Feedback 360°',
    icon: MessageSquare,
    weight: '20%',
    color: '#3B82F6',
    description: 'Score moyen des évaluations croisées',
    invert: false,
  },
  {
    key: 'factor_okr',
    label: 'Avancement OKR',
    icon: Target,
    weight: '20%',
    color: '#10B981',
    description: 'Progression des objectifs actifs',
    invert: false,
  },
  {
    key: 'factor_seniority',
    label: 'Ancienneté',
    icon: Clock,
    weight: '15%',
    color: '#F59E0B',
    description: 'Risque inversement proportionnel à l\'ancienneté',
    invert: false,
  },
  {
    key: 'factor_activity',
    label: 'Activité NITA',
    icon: Wifi,
    weight: '15%',
    color: '#EC4899',
    description: 'Niveau d\'activité réelle sur le mois écoulé',
    invert: false,
  },
]

function FactorBar({ value = 0, color }) {
  const riskColor = value >= 75 ? '#EF4444' : value >= 55 ? '#F97316' : value >= 30 ? '#F59E0B' : '#10B981'
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: riskColor }}
        />
      </div>
      <span className="text-xs font-bold w-7 text-right" style={{ color: riskColor }}>
        {Math.round(value)}
      </span>
    </div>
  )
}

export default function RiskFactorBreakdown({ risk, compact = false }) {
  if (!risk) return null

  if (compact) {
    return (
      <div className="space-y-2">
        {FACTORS.map(f => {
          const Icon = f.icon
          const val = risk[f.key] || 0
          return (
            <div key={f.key} className="flex items-center gap-2">
              <Icon size={12} style={{ color: f.color, flexShrink: 0 }} />
              <span className="text-[11px] text-white/50 w-20 truncate">{f.label}</span>
              <div className="flex-1">
                <FactorBar value={val} color={f.color} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 mb-3">Contribution au score de risque global</p>
      {FACTORS.map(f => {
        const Icon = f.icon
        const val = risk[f.key] || 0
        const riskLevel = val >= 75 ? 'critical' : val >= 55 ? 'high' : val >= 30 ? 'medium' : 'low'
        const cfg = RISK_CONFIG[riskLevel]

        return (
          <div
            key={f.key}
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: `${f.color}20` }}
                >
                  <Icon size={12} style={{ color: f.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-[10px] text-white/30">{f.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.icon} {cfg.label}
                </span>
                <p className="text-[10px] text-white/30 mt-0.5 text-right">Poids : {f.weight}</p>
              </div>
            </div>
            <FactorBar value={val} color={f.color} />
          </div>
        )
      })}

      <div
        className="rounded-xl p-3 mt-2"
        style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Score global pondéré</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{Math.round(risk.risk_score || 0)}</span>
            <span className="text-white/30 text-sm">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  )
}
