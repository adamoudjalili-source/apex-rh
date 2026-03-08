// ============================================================
// APEX RH — src/components/conges/LeaveBalanceCard.jsx
// Session 67 — Soldes de congés par type avec barre de progression
// ============================================================
import { useMyBalances, useLeaveTypes } from '../../hooks/useConges'

function BalanceBar({ used, pending, initial, carried, max, color }) {
  const total     = (initial || 0) + (carried || 0)
  const effective = max ? Math.min(total, max) : total
  if (effective <= 0) return null

  const usedPct    = Math.min((used    / effective) * 100, 100)
  const pendingPct = Math.min((pending / effective) * 100, 100 - usedPct)
  const remaining  = Math.max(effective - (used || 0) - (pending || 0), 0)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-white/40">
        <span>{remaining.toFixed(1)} j restants</span>
        <span>{effective} j total</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full flex">
          <div
            className="h-full rounded-l transition-all duration-500"
            style={{ width: `${usedPct}%`, background: color, opacity: 0.9 }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pendingPct}%`, background: color, opacity: 0.4 }}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }}/>
          Pris : {(used || 0).toFixed(1)} j
        </span>
        {pending > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color, opacity: 0.4 }}/>
            En attente : {pending.toFixed(1)} j
          </span>
        )}
      </div>
    </div>
  )
}

export default function LeaveBalanceCard({ year }) {
  const { data: balances = [], isLoading } = useMyBalances(year)
  const { data: types    = [] }            = useLeaveTypes()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-4 w-24 rounded mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}/>
            <div className="h-2 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}/>
          </div>
        ))}
      </div>
    )
  }

  // Si aucun solde initialisé, afficher les types actifs avec 0
  const activeTypes = types.filter(t => t.is_active)
  const cards = activeTypes.map(type => {
    const bal = balances.find(b => b.leave_type_id === type.id)
    return { type, bal }
  })

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-white/30 text-sm">
        Aucun type de congé configuré.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ type, bal }) => {
        const initial   = bal?.initial_days   ?? 0
        const carried   = bal?.carried_over   ?? 0
        const used      = bal?.used_days      ?? 0
        const pending   = bal?.pending_days   ?? 0
        const total     = initial + carried
        const remaining = Math.max(total - used - pending, 0)
        const color     = type.color || '#6366F1'

        return (
          <div
            key={type.id}
            className="rounded-2xl p-5 border transition-all"
            style={{
              background:   'rgba(255,255,255,0.03)',
              borderColor:  `${color}20`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }}/>
                <span className="text-sm font-semibold text-white/85">{type.name}</span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color }}
              >
                {type.code}
              </span>
            </div>

            {/* Solde principal */}
            <div className="mb-3">
              <span className="text-3xl font-bold" style={{ color }}>
                {remaining % 1 === 0 ? remaining : remaining.toFixed(1)}
              </span>
              <span className="text-white/40 text-sm ml-1.5">
                {type.max_days ? `/ ${type.max_days} j` : 'j restants'}
              </span>
            </div>

            {/* Barre progression */}
            {total > 0 ? (
              <BalanceBar
                used={used}
                pending={pending}
                initial={initial}
                carried={carried}
                max={type.max_days}
                color={color}
              />
            ) : (
              <p className="text-[11px] text-white/25 italic">Solde non initialisé</p>
            )}

            {/* Report éventuel */}
            {carried > 0 && (
              <p className="mt-2 text-[10px] text-white/30">
                dont {carried} j reportés N-1
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
