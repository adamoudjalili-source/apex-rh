// ============================================================
// APEX RH — src/components/calibration/CalibrationHistory.jsx
// Session 55 — Historique audit trail de calibration
// ============================================================
import { CALIBRATION_LEVEL_LABELS, CALIBRATION_LEVEL_COLORS } from '../../hooks/useCalibration'

const ACTION_CONFIG = {
  session_created:    { label: 'Session créée',          icon: '🆕', color: '#6366F1' },
  override_proposed:  { label: 'Override proposé',       icon: '✏️', color: '#F59E0B' },
  override_approved:  { label: 'Override approuvé',      icon: '✅', color: '#10B981' },
  override_rejected:  { label: 'Override rejeté',        icon: '❌', color: '#EF4444' },
  submitted_for_n2:   { label: 'Soumis pour validation', icon: '📤', color: '#3B82F6' },
  session_validated:  { label: 'Session validée',        icon: '🎯', color: '#10B981' },
  session_closed:     { label: 'Session clôturée',       icon: '🔒', color: '#9CA3AF' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CalibrationHistory({ history = [] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-6 text-center">
        <div className="text-2xl mb-2">📋</div>
        <div className="text-sm text-gray-500">Aucune action enregistrée</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {history.map((entry, idx) => {
        const config = ACTION_CONFIG[entry.action] || { label: entry.action, icon: '📌', color: '#6B7280' }
        const actorName = entry.actor
          ? `${entry.actor.first_name} ${entry.actor.last_name}`
          : 'Système'

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center mt-0.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: `${config.color}22` }}
              >
                {config.icon}
              </div>
              {idx < history.length - 1 && (
                <div className="w-px flex-1 mt-1 bg-white/8 min-h-[12px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: config.color }}>
                    {config.label}
                  </span>
                  {entry.level && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${CALIBRATION_LEVEL_COLORS[entry.level] || '#6B7280'}22`,
                        color: CALIBRATION_LEVEL_COLORS[entry.level] || '#6B7280',
                      }}
                    >
                      {CALIBRATION_LEVEL_LABELS[entry.level]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 flex-shrink-0">{fmtDate(entry.created_at)}</span>
              </div>

              <div className="text-xs text-gray-500 mt-0.5">Par <strong className="text-gray-400">{actorName}</strong></div>

              {/* Before / After */}
              {(entry.before_value || entry.after_value) && (
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  {entry.before_value?.rating && (
                    <>
                      <span className="text-gray-600">{entry.before_value.rating}</span>
                      <span className="text-gray-600">→</span>
                    </>
                  )}
                  {entry.after_value?.rating && (
                    <span className="text-indigo-300 font-medium">{entry.after_value.rating}</span>
                  )}
                  {entry.after_value?.justification && (
                    <span className="text-gray-600 italic">«&nbsp;{entry.after_value.justification}&nbsp;»</span>
                  )}
                </div>
              )}

              {entry.comment && (
                <p className="text-xs text-gray-600 italic mt-1">
                  «&nbsp;{entry.comment}&nbsp;»
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
