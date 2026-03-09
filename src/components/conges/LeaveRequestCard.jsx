// ============================================================
// APEX RH — src/components/conges/LeaveRequestCard.jsx
// Session 67 — Card demande de congé avec statut + actions
// ============================================================
import { useState } from 'react'
import { Calendar, Send, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { LEAVE_STATUS } from '../../utils/constants'
import {
  LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS, LEAVE_STATUS_BG,
  useSubmitLeaveRequest, formatDate,
} from '../../hooks/useConges'

export default function LeaveRequestCard({ request, onDeleted, showUser = false }) {
  const [expanded, setExpanded] = useState(false)
  const submitReq = useSubmitLeaveRequest()

  if (!request) return null

  const type      = request.leave_types
  const user      = request.users
  const status    = request.status
  const statusCol = LEAVE_STATUS_COLORS[status] || '#6B7280'
  const statusBg  = LEAVE_STATUS_BG[status]     || 'rgba(107,114,128,0.1)'
  const color     = type?.color || '#6366F1'

  async function handleSubmit(e) {
    e.stopPropagation()
    await submitReq.mutateAsync(request.id)
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${color}20` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Type badge */}
        <div
          className="w-1.5 self-stretch rounded-full flex-shrink-0"
          style={{ background: color }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {showUser && user && (
              <span className="text-xs font-semibold text-white/80">
                {user.first_name} {user.last_name}
              </span>
            )}
            <span className="text-xs font-medium text-white/60">{type?.name || '—'}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusBg, color: statusCol }}
            >
              {LEAVE_STATUS_LABELS[status] || status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/35">
            <Calendar size={10}/>
            {formatDate(request.start_date)} — {formatDate(request.end_date)}
            <span className="mx-1">·</span>
            <strong className="text-white/55">{request.days_count} j</strong>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {status === 'draft' && (
            <button
              onClick={handleSubmit}
              disabled={submitReq.isPending}
              title="Soumettre"
              className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <Send size={13}/>
            </button>
          )}
          <button
            className="p-1.5 rounded-lg text-white/25 hover:text-white/50 transition-colors"
            onClick={e => { e.stopPropagation(); setExpanded(x => !x) }}
          >
            {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
        </div>
      </div>

      {/* Détail expandé */}
      {expanded && (
        <div className="px-5 pb-4 pt-0 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {request.reason && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Motif</p>
              <p className="text-xs text-white/60">{request.reason}</p>
            </div>
          )}

          {request.rejection_reason && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              <strong>Refus :</strong> {request.rejection_reason}
            </div>
          )}

          {request.attachment_url && (
            <a
              href={request.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
            >
              <FileText size={12}/> Voir le justificatif
            </a>
          )}

          {/* Workflow */}
          <div className="flex items-center gap-3 text-[10px] text-white/30">
            {['draft',LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED,LEAVE_STATUS.HR_APPROVED].map((s, i) => {
              const active  = status === s
              const passed  = ['draft',LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED,LEAVE_STATUS.HR_APPROVED].indexOf(status)
                            > ['draft',LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED,LEAVE_STATUS.HR_APPROVED].indexOf(s)
              const isFinal = status === 'rejected'
              const dotColor = passed || active ? statusCol : 'rgba(255,255,255,0.12)'
              return (
                <div key={s} className="flex items-center gap-1">
                  {i > 0 && <div className="w-4 h-px" style={{ background: passed ? statusCol : 'rgba(255,255,255,0.1)' }}/>}
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }}/>
                  <span style={{ color: active ? statusCol : passed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }}>
                    {LEAVE_STATUS_LABELS[s]}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Dates approbations */}
          {request.manager_approved_at && (
            <p className="text-[10px] text-white/25">
              Approuvé manager : {formatDate(request.manager_approved_at)}
              {request.manager?.first_name && ` — ${request.manager.first_name} ${request.manager.last_name}`}
            </p>
          )}
          {request.hr_approved_at && (
            <p className="text-[10px] text-white/25">
              Validé RH : {formatDate(request.hr_approved_at)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
