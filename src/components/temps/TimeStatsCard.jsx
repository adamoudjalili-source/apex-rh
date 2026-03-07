// ============================================================
// APEX RH — src/components/temps/TimeStatsCard.jsx
// Session 66 — Carte statistiques heures
// ============================================================
import { Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { useTimeStats, formatHours } from '../../hooks/useTemps'

export default function TimeStatsCard({ userId, period = 'month' }) {
  const { data: stats, isLoading } = useTimeStats({ userId, period })

  const PERIOD_LABELS = { week: 'Cette semaine', month: 'Ce mois', year: 'Cette année' }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] p-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="h-4 w-32 bg-white/10 rounded mb-4"/>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl"/>)}
        </div>
      </div>
    )
  }

  const cards = [
    {
      icon: Clock,
      label: 'Heures travaillées',
      value: formatHours(stats?.totalHours || 0),
      color: '#6366F1',
    },
    {
      icon: TrendingUp,
      label: 'Heures supplémentaires',
      value: formatHours(stats?.overtimeHours || 0),
      color: stats?.overtimeHours > 0 ? '#F59E0B' : '#6B7280',
    },
    {
      icon: CheckCircle,
      label: 'Feuilles validées',
      value: stats?.approved || 0,
      color: '#10B981',
    },
    {
      icon: AlertCircle,
      label: 'En attente',
      value: stats?.pending || 0,
      color: stats?.pending > 0 ? '#F59E0B' : '#6B7280',
    },
  ]

  return (
    <div className="rounded-2xl border border-white/[0.08] p-5"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))' }}>
      <p className="text-xs text-white/40 uppercase tracking-wider mb-4">{PERIOD_LABELS[period]}</p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl p-3"
            style={{ background: `${color}0D`, border: `1px solid ${color}20` }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={12} style={{ color }}/>
              <span className="text-[10px] text-white/40 leading-tight">{label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tendance par semaine */}
      {stats?.sheets && stats.sheets.length > 1 && (
        <div className="mt-4 pt-4 border-t border-white/[0.05]">
          <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wide">Progression semaines</p>
          <div className="flex items-end gap-1 h-10">
            {stats.sheets.slice(-8).map((s, i) => {
              const max = Math.max(...stats.sheets.slice(-8).map(x => Number(x.total_hours)), 40)
              const pct = max ? (Number(s.total_hours) / max) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${formatHours(s.total_hours)}`}>
                  <div className="w-full rounded-sm transition-all"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: s.status === 'hr_approved' ? '#10B981' : s.status === 'rejected' ? '#EF4444' : '#6366F1',
                      opacity: 0.6,
                    }}/>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
