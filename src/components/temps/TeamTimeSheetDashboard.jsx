// ============================================================
// APEX RH — src/components/temps/TeamTimeSheetDashboard.jsx
// Session 66 — Dashboard manager : vue équipe + validations
// ============================================================
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, X, Users, Clock } from 'lucide-react'
import { LEAVE_STATUS } from '../../utils/constants'
import {
  useTeamTimeSheets, useApproveTimeSheet, useRejectTimeSheet,
  getCurrentWeekStart, formatHours,
  TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS,
} from '../../hooks/useTemps'

function addWeeks(ws, n) {
  const d = new Date(ws)
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

export default function TeamTimeSheetDashboard({ orgView = false }) {
  const [weekStart,    setWeekStart]    = useState(getCurrentWeekStart())
  const [rejectId,     setRejectId]     = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: sheets = [], isLoading } = useTeamTimeSheets({ weekStart })
  const approve = useApproveTimeSheet()
  const reject  = useRejectTimeSheet()

  const handleApprove = async (id, asManager) => {
    await approve.mutateAsync({ id, asManager })
  }

  const handleReject = async () => {
    if (!rejectId) return
    await reject.mutateAsync({ id: rejectId, reason: rejectReason })
    setRejectId(null)
    setRejectReason('')
  }

  const summary = {
    total:    sheets.length,
    draft:    sheets.filter(s => s.status === 'draft').length,
    pending:  sheets.filter(s => [LEAVE_STATUS.SUBMITTED,LEAVE_STATUS.MANAGER_APPROVED].includes(s.status)).length,
    approved: sheets.filter(s => s.status === LEAVE_STATUS.HR_APPROVED).length,
  }

  return (
    <div className="space-y-4">
      {/* Navigation semaine */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addWeeks(weekStart, -1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft size={15}/>
          </button>
          <span className="text-sm font-semibold text-white/80">
            Semaine du {new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            disabled={weekStart >= getCurrentWeekStart()}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30">
            <ChevronRight size={15}/>
          </button>
        </div>

        {/* Résumé rapide */}
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1"><Users size={11}/>{summary.total} collaborateurs</span>
          {summary.pending > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <Clock size={11}/>{summary.pending} en attente
            </span>
          )}
        </div>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-indigo-400 animate-spin"/>
        </div>
      ) : sheets.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
          Aucune feuille de temps cette semaine
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left py-2 px-3 text-xs text-white/30 font-medium">Collaborateur</th>
                <th className="text-center py-2 px-3 text-xs text-white/30 font-medium">Heures</th>
                <th className="text-center py-2 px-3 text-xs text-white/30 font-medium">Sup.</th>
                <th className="text-center py-2 px-3 text-xs text-white/30 font-medium">Statut</th>
                <th className="text-center py-2 px-3 text-xs text-white/30 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {sheets.map(sheet => {
                const user  = sheet.users || {}
                const name  = `${user.first_name || ''} ${user.last_name || ''}`.trim()
                const color = TIMESHEET_STATUS_COLORS[sheet.status]
                const canManagerApprove = sheet.status === LEAVE_STATUS.SUBMITTED
                const canHRApprove      = sheet.status === LEAVE_STATUS.MANAGER_APPROVED

                return (
                  <tr key={sheet.id} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-white/80 font-medium">{name}</p>
                        <p className="text-[10px] text-white/30">{user.role || ''}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-white/60 font-mono text-xs">
                      {formatHours(sheet.total_hours)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs">
                      {Number(sheet.overtime_hours) > 0
                        ? <span className="text-amber-400">{formatHours(sheet.overtime_hours)}</span>
                        : <span className="text-white/20">—</span>
                      }
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {TIMESHEET_STATUS_LABELS[sheet.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {canManagerApprove && (
                          <>
                            <button onClick={() => handleApprove(sheet.id, true)}
                              disabled={approve.isPending}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              title="Approuver (Manager)">
                              <Check size={13}/>
                            </button>
                            <button onClick={() => setRejectId(sheet.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Refuser">
                              <X size={13}/>
                            </button>
                          </>
                        )}
                        {canHRApprove && (
                          <>
                            <button onClick={() => handleApprove(sheet.id, false)}
                              disabled={approve.isPending}
                              className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Valider (RH)">
                              <Check size={13}/>
                            </button>
                            <button onClick={() => setRejectId(sheet.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Refuser">
                              <X size={13}/>
                            </button>
                          </>
                        )}
                        {sheet.status === 'rejected' && sheet.rejection_reason && (
                          <span className="text-[10px] text-red-400/70 italic truncate max-w-[100px]" title={sheet.rejection_reason}>
                            {sheet.rejection_reason}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal refus */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#0F0F24', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-base font-semibold text-white mb-2">Motif du refus</h3>
            <p className="text-xs text-white/40 mb-4">Ce motif sera visible par le collaborateur.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Indiquez la raison du refus…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setRejectId(null); setRejectReason('') }}
                className="flex-1 py-2 rounded-xl text-sm text-white/50 border border-white/[0.08] hover:border-white/20 transition-colors">
                Annuler
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || reject.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
                {reject.isPending
                  ? <div className="w-4 h-4 mx-auto rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                  : 'Refuser'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
