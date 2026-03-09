// ============================================================
// APEX RH — SuiviTempsShared.jsx — S124
// Composants partagés : KpiCard, SectionCard, ProgressBar, Badge
// ============================================================
import { GLASS_STYLE } from '../../utils/constants'

// ─── Couleurs statuts ─────────────────────────────────────────
export const TS_STATUS = {
  draft:     { label: 'Brouillon',  bg: 'rgba(255,255,255,0.07)', color: '#9CA3AF' },
  submitted: { label: 'Soumis',    bg: 'rgba(252,211,77,0.12)',  color: '#FCD34D' },
  approved:  { label: 'Validé',    bg: 'rgba(99,102,241,0.12)',  color: '#818CF8' },
  rejected:  { label: 'Rejeté',    bg: 'rgba(239,68,68,0.12)',   color: '#F87171' },
}

// ─── ProgressBar ──────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#818CF8' }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 99,
        background: `linear-gradient(90deg,${color}88,${color})`,
        transition: 'width .6s ease',
      }} />
    </div>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────
export function StatusBadge({ status }) {
  const s = TS_STATUS[status] ?? TS_STATUS.draft
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 8,
      padding: '3px 10px', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────
export function KpiCard({ label, value, sub, color, icon: Icon, bar, barMax }) {
  return (
    <div style={{ ...GLASS_STYLE, borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          {label}
        </span>
        {Icon && (
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} style={{ color }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: color ?? '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>{sub}</div>}
      {bar !== undefined && (
        <div style={{ marginTop: 10 }}>
          <ProgressBar value={bar} max={barMax ?? 100} color={color} />
        </div>
      )}
    </div>
  )
}

// ─── SectionCard ──────────────────────────────────────────────
export function SectionCard({ title, action, children, style }) {
  return (
    <div style={{ ...GLASS_STYLE, borderRadius: 16, padding: '20px 22px', ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {title && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</span>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── PipelineSteps (workflow validation) ──────────────────────
export function PipelineSteps({ status }) {
  const steps = [
    { done: true },
    { done: status === 'approved' || status === 'rejected' },
    { done: status === 'approved' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {steps.map((s, i) => {
        const c = s.done ? '#34D399' : 'rgba(255,255,255,0.15)'
        const bg = s.done ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.04)'
        const bc = s.done ? 'rgba(52,211,153,0.4)'  : 'rgba(255,255,255,0.08)'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: bg, border: `1px solid ${bc}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            {i < 2 && <div style={{ width: 12, height: 1, background: s.done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)' }} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── NavBtn ───────────────────────────────────────────────────
export function NavBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...GLASS_STYLE, borderRadius: 10, padding: '6px 14px',
      fontSize: 11, color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

// ─── SubmitBtn ────────────────────────────────────────────────
export function SubmitBtn({ children, color = 'linear-gradient(135deg,#6366F1,#4F46E5)', onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
      background: color, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {children}
    </button>
  )
}

// ─── formatDateFR — safe date formatter ───────────────────────
export function formatDateFR(d, opts = {}) {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00' : d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', opts)
}
