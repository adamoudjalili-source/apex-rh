// ============================================================
// APEX RH — ReviewCycleStats.jsx
// S123 — Composants : SynthesisCard, StepIndicator + helpers
// ============================================================
import { REVIEW_COMPETENCIES, CYCLE_FREQUENCY_LABELS, formatCyclePeriod } from '../../hooks/useReviewCycles'

// ─── HELPERS ─────────────────────────────────────────────────

export function scoreColor(score) {
  if (score == null) return '#6B7280'
  if (score >= 7.5) return '#10B981'
  if (score >= 5)   return '#F59E0B'
  return '#EF4444'
}

export function pulseScoreColor(score) {
  if (score == null) return '#6B7280'
  if (score >= 75) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── SCORE BAR ───────────────────────────────────────────────

export function ScoreBar({ score, max = 10, color }) {
  const pct = Math.round((score / max) * 100)
  const c = color || scoreColor(score)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color: c }}>
        {score != null ? score : '—'}
      </span>
    </div>
  )
}

// ─── STEP INDICATOR ──────────────────────────────────────────

export function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Auto-évaluation' },
    { n: 2, label: 'Évaluation manager' },
    { n: 3, label: 'Validation & Archivage' },
  ]
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                current >= s.n ? 'text-white' : 'bg-white/5 text-gray-600 border border-white/10'
              }`}
              style={current >= s.n ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}
            >
              {current > s.n ? '✓' : s.n}
            </div>
            <span className={`text-[10px] mt-1 text-center w-20 ${current >= s.n ? 'text-indigo-300' : 'text-gray-600'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-14 mx-1 mb-5 ${current > s.n ? 'bg-indigo-500' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── SYNTHESIS CARD ──────────────────────────────────────────

export function SynthesisCard({ synthesis, periodStart, periodEnd }) {
  if (!synthesis) return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-center text-gray-600 text-sm">
      Calcul de la synthèse en cours…
    </div>
  )

  const hasPulse = synthesis.pulse_avg_score != null
  const hasF360  = synthesis.feedback360_avg != null
  const hasOkr   = synthesis.okr_completion_rate != null

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Synthèse automatique</span>
        <span className="text-gray-600 text-[10px]">{formatCyclePeriod(periodStart, periodEnd)}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 border ${hasPulse ? 'border-green-500/20 bg-green-500/5' : 'border-white/8 bg-white/3'}`}>
          <div className="text-[10px] text-gray-500 mb-1">📊 Score PULSE moyen</div>
          {hasPulse ? (
            <>
              <div className="text-xl font-bold" style={{ color: pulseScoreColor(synthesis.pulse_avg_score) }}>
                {synthesis.pulse_avg_score}/100
              </div>
              <div className="text-[10px] text-gray-600">{synthesis.pulse_period_days} jours enregistrés</div>
            </>
          ) : <div className="text-sm text-gray-600">Non disponible</div>}
        </div>

        <div className={`rounded-lg p-3 border ${hasF360 ? 'border-violet-500/20 bg-violet-500/5' : 'border-white/8 bg-white/3'}`}>
          <div className="text-[10px] text-gray-500 mb-1">💬 Feedback 360° moyen</div>
          {hasF360 ? (
            <>
              <div className="text-xl font-bold" style={{ color: scoreColor(synthesis.feedback360_avg) }}>
                {synthesis.feedback360_avg}/10
              </div>
              <div className="text-[10px] text-gray-600">{synthesis.feedback360_response_count} réponses</div>
            </>
          ) : <div className="text-sm text-gray-600">Non disponible</div>}
        </div>

        <div className={`rounded-lg p-3 border ${hasOkr ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/8 bg-white/3'}`}>
          <div className="text-[10px] text-gray-500 mb-1">🎯 OKRs complétés</div>
          {hasOkr ? (
            <>
              <div className="text-xl font-bold" style={{ color: synthesis.okr_completion_rate >= 70 ? '#10B981' : '#F59E0B' }}>
                {synthesis.okr_completion_rate}%
              </div>
              <div className="text-[10px] text-gray-600">{synthesis.okr_completed_count}/{synthesis.okr_count} objectifs</div>
            </>
          ) : <div className="text-sm text-gray-600">Non disponible</div>}
        </div>
      </div>

      {hasF360 && synthesis.feedback360_by_competency && (
        <div className="pt-2 border-t border-white/8">
          <div className="text-[10px] text-gray-500 mb-2">Feedback 360° — détail par compétence</div>
          <div className="space-y-1.5">
            {REVIEW_COMPETENCIES.map(c => {
              const s = synthesis.feedback360_by_competency[c.key]
              return (
                <div key={c.key} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 w-36">{c.icon} {c.label}</span>
                  <div className="flex-1"><ScoreBar score={s ?? null} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MODAL PARTAGÉE ──────────────────────────────────────────
import { motion } from 'framer-motion'

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className={`relative rounded-2xl border border-white/10 overflow-y-auto max-h-[90vh] ${wide ? 'w-full max-w-3xl' : 'w-full max-w-xl'}`}
        style={{ background: '#0F1117' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 sticky top-0 bg-[#0F1117] z-10">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </motion.div>
    </div>
  )
}

// ─── UI PARTAGÉS ─────────────────────────────────────────────

export function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  )
}

export function Badge({ label, color }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}22`, color }}>
      {label}
    </span>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{children}</h3>
      {action}
    </div>
  )
}
