// ============================================================
// APEX RH — src/components/offboarding/OffboardingProcessCard.jsx
// Session 68 — Card processus avec progression globale
// ============================================================
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Calendar, Clock, ChevronRight, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import {
  OFFBOARDING_STATUS_LABELS,
  OFFBOARDING_STATUS_COLORS,
  EXIT_REASON_LABELS,
  useOffboardingChecklist,
} from '../../hooks/useOffboarding'

function ProgressRing({ pct, color, size = 48 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }}/>
      <text x={size/2} y={size/2} fill="white" fontSize={10} fontWeight={700}
        textAnchor="middle" dominantBaseline="middle" className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0px, -${size/2 - size/2}px)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  )
}

function ChecklistProgress({ processId }) {
  const { data: items = [] } = useOffboardingChecklist(processId)
  const done  = items.filter(i => i.status === 'done').length
  const total = items.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}

export default function OffboardingProcessCard({ process, onClick }) {
  const navigate  = useNavigate()
  const { data: checklistItems = [] } = useOffboardingChecklist(process.id)

  const done  = checklistItems.filter(i => i.status === 'done').length
  const total = checklistItems.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  const statusColor = OFFBOARDING_STATUS_COLORS[process.status] || '#6B7280'
  const statusLabel = OFFBOARDING_STATUS_LABELS[process.status] || process.status

  const userName = [process.user?.first_name, process.user?.last_name].filter(Boolean).join(' ') || '—'
  const exitLabel = EXIT_REASON_LABELS[process.exit_reason] || process.exit_reason || '—'

  const daysLeft = useMemo(() => {
    if (!process.exit_date) return null
    const diff = Math.ceil((new Date(process.exit_date) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }, [process.exit_date])

  const StatusIcon = process.status === 'completed' ? CheckCircle2
    : process.status === 'cancelled' ? XCircle : Clock

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => onClick ? onClick(process) : navigate(`/offboarding/${process.id}`)}
      className="cursor-pointer rounded-2xl border border-white/[0.07] overflow-hidden transition-all duration-200 hover:border-white/[0.15]"
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      {/* Header */}
      <div className="p-4 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${statusColor}15` }}>
          <User size={18} style={{ color: statusColor }}/>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-white text-sm truncate">{userName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ color: statusColor, background: `${statusColor}18` }}>
              <StatusIcon size={9} className="inline mr-1"/>
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-white/40 truncate">{exitLabel}</p>
        </div>

        {/* Ring */}
        {total > 0 && (
          <ProgressRing pct={pct} color={statusColor}/>
        )}

        <ChevronRight size={16} className="text-white/20 flex-shrink-0 mt-1"/>
      </div>

      {/* Dates */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-white/40">
        {process.exit_date && (
          <span className="flex items-center gap-1">
            <Calendar size={11}/>
            Départ : {new Date(process.exit_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
        {daysLeft !== null && process.status === 'in_progress' && (
          <span className={`flex items-center gap-1 font-medium ${daysLeft <= 7 ? 'text-red-400' : daysLeft <= 14 ? 'text-amber-400' : 'text-white/40'}`}>
            {daysLeft <= 0 ? (
              <><AlertCircle size={11}/> Départ passé</>
            ) : (
              <><Clock size={11}/> J-{daysLeft}</>
            )}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-[10px] text-white/35 mb-1">
            <span>Checklist</span>
            <span>{done}/{total} tâches</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: statusColor }}/>
          </div>
        </div>
      )}
    </motion.div>
  )
}
