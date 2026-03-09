// ============================================================
// APEX RH — components/compensation/CompensationHistory.jsx
// Session 58 — Historique révisions + bonus
// ============================================================
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Award, Loader2, Clock, CheckCircle2 } from 'lucide-react'
import {
  useMyReviews, useMyBonuses,
  REVIEW_REASON_LABELS, REVIEW_REASON_COLORS,
  REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS,
  BONUS_TYPE_LABELS, BONUS_TYPE_COLORS,
  BONUS_STATUS_LABELS,
  formatSalary,
} from '../../hooks/useCompensation'

function StatusBadge({ status, labels, colors }) {
  const color = colors[status] || '#6B7280'
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {labels[status] || status}
    </span>
  )
}

// ── Ligne révision ────────────────────────────────────────────
function ReviewRow({ review }) {
  const increase = Number(review.increase_amount)
  const pct      = Number(review.increase_pct)
  const isUp     = increase >= 0
  const color    = isUp ? '#10B981' : '#EF4444'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${REVIEW_REASON_COLORS[review.reason] || '#6B7280'}20` }}>
        {isUp
          ? <TrendingUp size={14} style={{ color: '#10B981' }}/>
          : <TrendingDown size={14} style={{ color: '#EF4444' }}/>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/75 font-medium truncate">
          {REVIEW_REASON_LABELS[review.reason] || review.reason}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-white/30">
            {new Date(review.review_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {review.effective_date && (
            <p className="text-[11px] text-white/20">
              · Effectif le {new Date(review.effective_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        {review.justification && (
          <p className="text-[11px] text-white/25 mt-0.5 truncate">{review.justification}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-sm font-bold" style={{ color }}>
          {isUp ? '+' : ''}{formatSalary(increase, review.currency)}
        </span>
        <span className="text-[11px]" style={{ color }}>
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </span>
        <StatusBadge status={review.status} labels={REVIEW_STATUS_LABELS} colors={REVIEW_STATUS_COLORS}/>
      </div>
    </motion.div>
  )
}

// ── Ligne bonus ───────────────────────────────────────────────
function BonusRow({ bonus }) {
  const typeColor = BONUS_TYPE_COLORS[bonus.type] || '#6B7280'
  const isPaid    = bonus.status === 'paye'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${typeColor}20` }}>
        <Award size={14} style={{ color: typeColor }}/>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/75 font-medium truncate">
          {bonus.label || BONUS_TYPE_LABELS[bonus.type] || bonus.type}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-white/30">
            {bonus.period || new Date(bonus.reference_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          {bonus.paid_at && isPaid && (
            <p className="text-[11px] text-white/20">
              · Versé le {new Date(bonus.paid_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-sm font-bold" style={{ color: isPaid ? '#10B981' : '#F59E0B' }}>
          +{formatSalary(bonus.amount, bonus.currency)}
        </span>
        <StatusBadge status={bonus.status} labels={BONUS_STATUS_LABELS} colors={{
          propose:  '#F59E0B',
          valide:   '#3B82F6',
          paye:     '#10B981',
          annule:   '#EF4444',
        }}/>
      </div>
    </motion.div>
  )
}

export default function CompensationHistory() {
  const { data: reviews = [], isLoading: loadR } = useMyReviews()
  const { data: bonuses = [], isLoading: loadB }  = useMyBonuses()

  const loading = loadR || loadB

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={18} className="animate-spin text-white/30"/>
      </div>
    )
  }

  // Stats rapides
  const applied  = reviews.filter(r => r.status === 'applique')
  const pending  = reviews.filter(r => ['propose','valide'].includes(r.status))
  const paidBon  = bonuses.filter(b => b.status === 'paye')
  const totalBon = paidBon.reduce((a, b) => a + Number(b.amount), 0)

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, label: 'Révisions appliquées', value: applied.length, color: '#10B981' },
          { icon: Clock,        label: 'En attente',           value: pending.length, color: '#F59E0B' },
          { icon: Award,        label: 'Bonus reçus',          value: paidBon.length, color: '#C9A227' },
          { icon: TrendingUp,   label: 'Total bonus (brut)',   value: totalBon > 0 ? formatSalary(totalBon) : '—', color: '#3B82F6' },
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

      {/* Révisions */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <TrendingUp size={14} style={{ color: '#6366F1' }}/>
          <h3 className="text-sm font-semibold text-white/70">Révisions salariales</h3>
          <span className="ml-auto text-[11px] text-white/25">{reviews.length} au total</span>
        </div>
        {reviews.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-white/25 text-sm">Aucune révision enregistrée</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {reviews.map(rev => <ReviewRow key={rev.id} review={rev}/>)}
          </div>
        )}
      </div>

      {/* Bonus */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Award size={14} style={{ color: '#C9A227' }}/>
          <h3 className="text-sm font-semibold text-white/70">Primes & Bonus</h3>
          <span className="ml-auto text-[11px] text-white/25">{bonuses.length} au total</span>
        </div>
        {bonuses.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-white/25 text-sm">Aucune prime enregistrée</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {bonuses.map(bon => <BonusRow key={bon.id} bonus={bon}/>)}
          </div>
        )}
      </div>
    </div>
  )
}
