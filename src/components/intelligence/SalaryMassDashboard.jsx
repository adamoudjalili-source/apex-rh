// ============================================================
// APEX RH — SalaryMassDashboard.jsx  ·  S82
// Masse salariale : total, moyenne, médiane, répartition par rôle
// ============================================================
import { useSalaryMassStats } from '../../hooks/useHRIntelligence'
import { DollarSign, TrendingUp, Users } from 'lucide-react'

const ROLE_LABELS = {
  collaborateur:  { label: 'Collaborateurs',    color: '#6366F1' },
  chef_service:   { label: 'Chefs de service',  color: '#3B82F6' },
  chef_division:  { label: 'Chefs de division', color: '#8B5CF6' },
  administrateur: { label: 'Administrateurs',   color: '#EC4899' },
  directeur:      { label: 'Direction',          color: '#F59E0B' },
}

function fmt(val) {
  if (!val) return '0 €'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M €`
  if (val >= 1_000)     return `${(val / 1_000).toFixed(0)}k €`
  return `${Math.round(val)} €`
}

function HorizontalBar({ label, value, max, color, subLabel }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/60">{label}</span>
        <div className="text-right">
          <span className="text-xs font-semibold text-white">{fmt(value * 12)}</span>
          {subLabel && <span className="text-xs text-white/30 ml-1">{subLabel}</span>}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}88)` }}/>
      </div>
    </div>
  )
}

function DistributionBar({ ranges }) {
  const max = Math.max(...ranges.map(r => r.count), 1)
  return (
    <div className="space-y-2">
      {ranges.map((r, i) => {
        const pct = max ? (r.count / max) * 100 : 0
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-16 text-right flex-shrink-0">{r.label}</span>
            <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded transition-all duration-500"
                style={{ width: `${pct}%`, background: 'rgba(99,102,241,0.5)' }}/>
              {r.count > 0 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white">{r.count}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SalaryMassDashboard({ year }) {
  const { data, isLoading } = useSalaryMassStats(year)

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-white/30 text-sm">
      Chargement de la masse salariale…
    </div>
  )

  const {
    totalMass = 0, avgSalary = 0, medianSalary = 0,
    byRole = {}, distribution = [], covered = 0, total = 0
  } = data || {}

  const maxRoleTotal = Math.max(...Object.values(byRole).map(r => r?.total || 0), 1)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: DollarSign,  label: 'Masse salariale annuelle', value: fmt(totalMass),          color: '#10B981' },
          { icon: TrendingUp,  label: 'Salaire mensuel moyen',    value: fmt(avgSalary),           color: '#6366F1' },
          { icon: Users,       label: 'Collaborateurs couverts',  value: `${covered} / ${total}`, color: '#F59E0B' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} style={{ color: k.color }}/>
              <span className="text-xs text-white/40">{k.label}</span>
            </div>
            <div className="text-xl font-bold text-white">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Répartition par rôle */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="text-xs text-white/50 mb-4 font-medium">Masse salariale par rôle (mensuelle)</div>
          {Object.entries(byRole).length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">Aucune donnée salariale</p>
          ) : (
            Object.entries(byRole).map(([role, val]) => {
              const cfg = ROLE_LABELS[role] || { label: role, color: '#6B7280' }
              return (
                <HorizontalBar
                  key={role}
                  label={`${cfg.label} (${val.count})`}
                  value={val.total}
                  max={maxRoleTotal}
                  color={cfg.color}
                  subLabel={`~${fmt(val.count ? val.total / val.count : 0)}/pers`}
                />
              )
            })
          )}
        </div>

        {/* Distribution des salaires */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-white/50 mb-4 font-medium">Distribution des salaires annuels</div>
          {distribution.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">Aucune donnée</p>
          ) : (
            <DistributionBar ranges={distribution}/>
          )}
          <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-white/40">Salaire médian</div>
              <div className="text-sm font-bold text-white mt-0.5">{fmt(medianSalary * 12)}/an</div>
            </div>
            <div>
              <div className="text-xs text-white/40">Salaire moyen</div>
              <div className="text-sm font-bold text-white mt-0.5">{fmt(avgSalary * 12)}/an</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
