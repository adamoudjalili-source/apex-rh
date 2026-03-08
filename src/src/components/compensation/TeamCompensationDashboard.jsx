// ============================================================
// APEX RH — components/compensation/TeamCompensationDashboard.jsx
// Session 58 — Vue manager : équipe compensation
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, TrendingUp, AlertTriangle, Award, Loader2,
  Search, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react'
import {
  useTeamCompensationStats, useTeamReviews, useTeamBonuses,
  useOrgCompensationStats,
  formatSalary, formatSalaryShort,
  getCompaRatioColor, getCompaRatioLabel, REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS, BONUS_TYPE_LABELS, BONUS_STATUS_LABELS,
} from '../../hooks/useCompensation'

// ── Distribution histogramme SVG ─────────────────────────────
function SalaryDistribution({ records }) {
  if (!records || records.length === 0) return null

  const W = 300, H = 80
  const salaries = records.map(r => Number(r.base_salary)).filter(Boolean).sort((a, b) => a - b)
  const min = salaries[0]
  const max = salaries[salaries.length - 1]
  const BINS = 8
  const binSize = (max - min) / BINS || 1

  const bins = Array.from({ length: BINS }, (_, i) => {
    const lo = min + i * binSize
    const hi = lo + binSize
    return salaries.filter(s => s >= lo && (i === BINS - 1 ? s <= hi : s < hi)).length
  })

  const maxBin = Math.max(...bins, 1)
  const barW = (W - 20) / BINS - 2

  return (
    <svg width={W} height={H} className="block">
      {bins.map((count, i) => {
        const barH = (count / maxBin) * (H - 20)
        const x = 10 + i * ((W - 20) / BINS)
        return (
          <g key={i}>
            <rect x={x} y={H - 15 - barH} width={barW} height={barH}
              fill="rgba(99,102,241,0.5)" rx="2"/>
            {i % 2 === 0 && (
              <text x={x + barW / 2} y={H - 2} textAnchor="middle"
                style={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)', fontFamily: 'inherit' }}>
                {formatSalaryShort(min + i * binSize)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Ligne collaborateur ───────────────────────────────────────
function MemberRow({ member }) {
  const [expanded, setExpanded] = useState(false)
  const ratio = member.compa_ratio ? Number(member.compa_ratio) : null
  const ratioColor = getCompaRatioColor(ratio)

  const isAtRisk = (member.grade_min && Number(member.base_salary) < Number(member.grade_min))
               || (member.grade_max && Number(member.base_salary) > Number(member.grade_max))

  return (
    <div className="border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#6366F1' }}>
          {(member.first_name?.[0] || '?').toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/80 font-medium truncate">
              {member.first_name} {member.last_name}
            </p>
            {isAtRisk && <AlertTriangle size={11} style={{ color: '#EF4444' }} className="flex-shrink-0"/>}
          </div>
          <p className="text-[11px] text-white/30 truncate">
            {member.grade_label ? `Grille ${member.grade_code} — ${member.grade_label}` : 'Grille non attribuée'}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-white/80">{formatSalary(member.base_salary, member.currency)}</p>
          {ratio != null && (
            <p className="text-[11px] font-medium" style={{ color: ratioColor }}>
              Compa {ratio.toFixed(0)}%
            </p>
          )}
        </div>

        {expanded
          ? <ChevronUp size={13} className="text-white/25 flex-shrink-0"/>
          : <ChevronDown size={13} className="text-white/25 flex-shrink-0"/>}
      </div>

      {/* Détail expandé */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4 grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Variable annuel',  value: member.variable_salary > 0 ? formatSalary(member.variable_salary, member.currency) : '—' },
            { label: 'Avantages',        value: member.benefits_value > 0 ? formatSalary(member.benefits_value, member.currency) : '—' },
            { label: 'Rémunération totale', value: member.total_comp > 0 ? formatSalary(member.total_comp, member.currency) : '—' },
            { label: 'Compa-ratio',      value: ratio != null ? `${ratio.toFixed(1)}%` : '—', valueColor: ratioColor },
            { label: 'Position grille',  value: member.range_position != null ? `${Number(member.range_position).toFixed(0)}%` : '—' },
            { label: 'Bonus (année)',    value: member.total_bonus_this_year > 0 ? formatSalary(member.total_bonus_this_year, member.currency) : '—', valueColor: '#C9A227' },
          ].map(({ label, value, valueColor }) => (
            <div key={label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] text-white/30 mb-0.5">{label}</p>
              <p className="text-xs font-semibold" style={{ color: valueColor || 'rgba(255,255,255,0.65)' }}>{value}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default function TeamCompensationDashboard() {
  const [search, setSearch]         = useState('')
  const [activeTab, setActiveTab]   = useState('team')

  const { data: members = [], isLoading: loadM }  = useTeamCompensationStats()
  const { data: reviews = [], isLoading: loadR }  = useTeamReviews()
  const { data: bonuses = [], isLoading: loadB }  = useTeamBonuses()
  const { data: orgStats, isLoading: loadO }      = useOrgCompensationStats()

  const loading = loadM || loadR || loadB || loadO

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.first_name + ' ' + m.last_name).toLowerCase().includes(q)
  })

  const atRisk = members.filter(m =>
    (m.grade_min && Number(m.base_salary) < Number(m.grade_min)) ||
    (m.grade_max && Number(m.base_salary) > Number(m.grade_max))
  )

  const pendingReviews = reviews.filter(r => ['propose', 'valide'].includes(r.status))

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-white/30"/></div>
  }

  const TABS = [
    { id: 'team',    label: 'Équipe',    count: members.length },
    { id: 'reviews', label: 'Révisions', count: pendingReviews.length },
    { id: 'bonuses', label: 'Primes',    count: bonuses.length },
  ]

  return (
    <div className="space-y-5">

      {/* Stats org */}
      {orgStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users,    label: 'Collaborateurs',    value: orgStats.count,                     color: '#6366F1' },
            { icon: BarChart3, label: 'Salaire moyen',    value: formatSalaryShort(orgStats.avg_base) + ' F CFA', color: '#3B82F6' },
            { icon: TrendingUp, label: 'Médiane',         value: formatSalaryShort(orgStats.median_base) + ' F CFA', color: '#10B981' },
            { icon: AlertTriangle, label: 'Hors fourchette', value: atRisk.length,                   color: '#EF4444' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl p-3.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={12} style={{ color }}/>
                <span className="text-[10px] text-white/35">{label}</span>
              </div>
              <p className="text-lg font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Distribution */}
      {orgStats?.records?.length > 3 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs text-white/35 mb-3">Distribution salariale</p>
          <SalaryDistribution records={orgStats.records}/>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all"
            style={activeTab === t.id
              ? { background: 'rgba(99,102,241,0.25)', color: '#fff' }
              : { color: 'rgba(255,255,255,0.35)' }}>
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ background: activeTab === t.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab équipe */}
      {activeTab === 'team' && (
        <>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un collaborateur…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white/70 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}/>
          </div>

          {atRisk.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl p-3.5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={14} style={{ color: '#EF4444' }} className="mt-0.5 flex-shrink-0"/>
              <p className="text-xs text-red-300/70">
                <span className="font-semibold">{atRisk.length} collaborateur{atRisk.length > 1 ? 's' : ''}</span> hors fourchette de grille.
                Vérifiez leur dossier de rémunération.
              </p>
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {filtered.length === 0 ? (
              <div className="p-8 text-center"><p className="text-white/25 text-sm">Aucun résultat</p></div>
            ) : (
              <div>
                {filtered.map(m => <MemberRow key={m.user_id} member={m}/>)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab révisions */}
      {activeTab === 'reviews' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {reviews.length === 0 ? (
            <div className="p-8 text-center"><p className="text-white/25 text-sm">Aucune révision</p></div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {reviews.map(rev => (
                <div key={rev.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/75 font-medium">
                      {rev.employee?.first_name} {rev.employee?.last_name}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {new Date(rev.review_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{rev.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: Number(rev.increase_pct) >= 0 ? '#10B981' : '#EF4444' }}>
                      {Number(rev.increase_pct) >= 0 ? '+' : ''}{Number(rev.increase_pct).toFixed(2)}%
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${REVIEW_STATUS_COLORS[rev.status]}20`, color: REVIEW_STATUS_COLORS[rev.status] }}>
                      {REVIEW_STATUS_LABELS[rev.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab bonus */}
      {activeTab === 'bonuses' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {bonuses.length === 0 ? (
            <div className="p-8 text-center"><p className="text-white/25 text-sm">Aucun bonus</p></div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {bonuses.slice(0, 50).map(bon => (
                <div key={bon.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/75 font-medium">
                      {bon.employee?.first_name} {bon.employee?.last_name}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {bon.label || BONUS_TYPE_LABELS[bon.type]} · {bon.period || new Date(bon.reference_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: bon.status === 'paye' ? '#10B981' : '#F59E0B' }}>
                      +{formatSalary(bon.amount, bon.currency)}
                    </p>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {BONUS_STATUS_LABELS[bon.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
