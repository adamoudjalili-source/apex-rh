// ============================================================
// APEX RH — components/compensation/SimulationBudget.jsx
// S74 — Simulation d'impact budget révision salariale
// Calcul temps réel, comparaison enveloppe, distribution
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, BarChart3, PieChart, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useCompensationCycles, useRevisionBudgetSimulation,
  formatSalary, formatSalaryShort
} from '../../hooks/useCompensation'

// ─── SVG Barres horizontales ─────────────────────────────────
function HBarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex flex-col gap-2 mt-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <div className="text-xs text-white/40 w-24 truncate text-right">{d.label}</div>
          <div className="flex-1 rounded-full overflow-hidden h-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.6 }}
              style={{ background: colorFn ? colorFn(i) : '#6366F1' }} />
          </div>
          <div className="text-xs font-semibold text-white/70 w-20 text-right">
            {d.isCFA ? formatSalaryShort(d.value) : d.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Jauge budget ─────────────────────────────────────────────
function BudgetGauge({ impact, envelope }) {
  const pct = envelope > 0 ? Math.min(100, (impact / envelope) * 100) : 0
  const over = envelope > 0 && impact > envelope
  const radius = 54
  const circ   = 2 * Math.PI * radius
  const strokeFill = circ * (1 - pct / 100)

  const color = over ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="80" viewBox="0 0 140 90">
        <path d={`M 10 80 A 60 60 0 0 1 130 80`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" strokeLinecap="round" />
        <path d={`M 10 80 A 60 60 0 0 1 130 80`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * Math.PI * 60} 9999`}
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="70" y="75" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <div className="text-center">
        <div className="text-xs text-white/40">Impact / Enveloppe</div>
        <div className="flex gap-3 mt-1 text-xs justify-center">
          <span style={{ color: '#10B981' }}>+{formatSalaryShort(impact)}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/50">{formatSalaryShort(envelope)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Donut SVG distribution ───────────────────────────────────
function TrancheDonut({ tranches }) {
  const total = Object.values(tranches).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444']
  const entries = Object.entries(tranches)
  let cumAngle = -90

  const paths = entries.map(([key, count], i) => {
    if (count === 0) return null
    const angle = (count / total) * 360
    const startRad = (cumAngle * Math.PI) / 180
    cumAngle += angle
    const endRad = (cumAngle * Math.PI) / 180
    const r = 40
    const cx = 60, cy = 60
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const large = angle > 180 ? 1 : 0
    return (
      <path key={key}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={colors[i] ?? '#6B7280'} opacity={0.85} />
    )
  }).filter(Boolean)

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {paths}
        <circle cx="60" cy="60" r="22" fill="#0F1117" />
        <text x="60" y="64" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="bold">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {entries.map(([key, count], i) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] ?? '#6B7280' }} />
            <span className="text-xs text-white/50">{key}</span>
            <span className="text-xs font-semibold text-white/80 ml-auto">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function SimulationBudget() {
  const { canAdmin } = useAuth()
  const { data: cycles = [] } = useCompensationCycles()
  const [selectedCycleId, setSelectedCycleId] = useState('')

  const activeCycles = cycles.filter(c => c.status !== 'cloture')
  const selectedCycle = cycles.find(c => c.id === selectedCycleId)

  const { data: sim, isLoading } = useRevisionBudgetSimulation(selectedCycleId)

  const deptData = sim ? Object.entries(sim.byDept).map(([label, d]) => ({
    label, value: d.impact, isCFA: true
  })).sort((a, b) => b.value - a.value).slice(0, 6) : []

  const DEPT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899']

  return (
    <div className="flex flex-col gap-5">
      {/* Header + sélecteur cycle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-white">Simulation d'impact budget</h2>
          <p className="text-xs text-white/35 mt-0.5">Calculez l'impact masse salariale avant validation</p>
        </div>
        <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm text-white"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <option value="">— Sélectionner un cycle —</option>
          {activeCycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
          {cycles.filter(c => c.status === 'cloture').map(c =>
            <option key={c.id} value={c.id}>{c.name} (clôturé)</option>
          )}
        </select>
      </div>

      {!selectedCycleId ? (
        <div className="rounded-xl p-10 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <BarChart3 size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm text-white/30">Sélectionnez un cycle pour simuler l'impact</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center p-10 gap-2 text-white/30">
          <RefreshCw size={18} className="animate-spin" /> Calcul en cours…
        </div>
      ) : !sim || sim.count === 0 ? (
        <div className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm text-white/30">Aucune révision dans ce cycle</p>
        </div>
      ) : (
        <>
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Révisions concernées', value: sim.count,                        color: '#6366F1' },
              { label: 'Impact total',          value: `+${formatSalaryShort(sim.totalImpact)}`, color: '#10B981' },
              { label: 'Hausse moyenne',        value: `+${(sim.avgPct ?? 0).toFixed(1)}%`, color: '#F59E0B' },
              { label: 'Budget utilisé',        value: selectedCycle?.budget_envelope > 0
                  ? `${Math.min(100, (sim.totalImpact / selectedCycle.budget_envelope * 100)).toFixed(0)}%`
                  : '—', color: '#8B5CF6' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Alerte dépassement */}
          {selectedCycle?.budget_envelope > 0 && sim.totalImpact > selectedCycle.budget_envelope && (
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={18} style={{ color: '#F87171' }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: '#F87171' }}>Dépassement de budget</div>
                <div className="text-xs text-white/40">
                  Dépassement de {formatSalary(sim.totalImpact - selectedCycle.budget_envelope)} par rapport à l'enveloppe allouée.
                  Réduisez certaines révisions avant de valider.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jauge budget (si enveloppe définie) */}
            {selectedCycle?.budget_envelope > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-xs font-semibold text-white/60 mb-3">Utilisation de l'enveloppe</h3>
                <BudgetGauge impact={sim.totalImpact} envelope={selectedCycle.budget_envelope} />
              </div>
            )}

            {/* Distribution par tranche */}
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-semibold text-white/60 mb-3">Distribution augmentations</h3>
              <TrancheDonut tranches={sim.tranches} />
            </div>
          </div>

          {/* Impact par département */}
          {deptData.length > 0 && (
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-semibold text-white/60 mb-1">Impact par département</h3>
              <HBarChart data={deptData} colorFn={i => DEPT_COLORS[i % DEPT_COLORS.length]} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
