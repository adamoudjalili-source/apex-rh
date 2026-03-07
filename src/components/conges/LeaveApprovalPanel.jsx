// ============================================================
// APEX RH — src/components/conges/LeaveApprovalPanel.jsx
// Session 67 — Panel approbation manager / RH
// ============================================================
import { useState } from 'react'
import { Check, X, MessageSquare, Calendar, Loader2, AlertCircle } from 'lucide-react'
import {
  useTeamLeaveRequests,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useAddLeaveComment,
  LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS,
  formatDate,
} from '../../hooks/useConges'
import { useAuth } from '../../contexts/AuthContext'
import { ADMIN_ROLES as ADMINS } from '../../lib/roles'

function RejectModal({ onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: '#0D0D2B', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-bold text-white">Refuser la demande</h3>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs text-white/50 mb-2 block">Motif du refus *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Expliquez la raison du refus..."
            rows={4}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white/80 border outline-none focus:ring-1 focus:ring-red-500 resize-none placeholder:text-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm text-white/60 border transition-colors hover:text-white/80"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            Annuler
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
            {loading && <Loader2 size={13} className="animate-spin"/>}
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestRow({ request, approveLevel, onApprove, onReject, approving, rejecting }) {
  const [showComment, setShowComment] = useState(false)
  const [comment,     setComment]     = useState('')
  const addComment = useAddLeaveComment()
  const user  = request.users
  const type  = request.leave_types
  const color = type?.color || '#6366F1'

  async function handleComment() {
    if (!comment.trim()) return
    await addComment.mutateAsync({ requestId: request.id, content: comment })
    setComment('')
    setShowComment(false)
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: `${color}18` }}>

      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: `${color}30` }}>
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/85">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}20`, color }}>
              {type?.name || '—'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: LEAVE_STATUS_COLORS[request.status] + '18',
                color:      LEAVE_STATUS_COLORS[request.status],
              }}>
              {LEAVE_STATUS_LABELS[request.status]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-white/35">
            <Calendar size={10}/>
            {formatDate(request.start_date)} — {formatDate(request.end_date)}
            <span className="mx-1 text-white/20">·</span>
            <strong className="text-white/50">{request.days_count} j</strong>
          </div>

          {request.reason && (
            <p className="mt-1.5 text-xs text-white/40 italic">"{request.reason}"</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowComment(s => !s)}
            title="Commenter"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
            <MessageSquare size={13}/>
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={rejecting}
            title="Refuser"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
            {rejecting ? <Loader2 size={13} className="animate-spin"/> : <X size={13}/>}
          </button>
          <button
            onClick={() => onApprove(request.id)}
            disabled={approving}
            title="Approuver"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40">
            {approving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
          </button>
        </div>
      </div>

      {/* Zone commentaire */}
      {showComment && (
        <div className="px-4 pb-3 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="flex-1 rounded-xl px-3 py-2 text-xs text-white/70 border outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-white/20"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            onKeyDown={e => e.key === 'Enter' && handleComment()}
          />
          <button
            onClick={handleComment}
            disabled={!comment.trim() || addComment.isPending}
            className="px-3 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-30 transition-all"
            style={{ background: 'rgba(79,70,229,0.3)' }}>
            Envoyer
          </button>
        </div>
      )}
    </div>
  )
}

export default function LeaveApprovalPanel() {
  const { profile, isAdmin } = useAuth()
  const role = profile?.role
  const isHR = ADMINS.includes(role)

  // Managers voient les 'submitted', RH/admin voient aussi les 'manager_approved'
  const statusFilter = isHR ? undefined : 'submitted'
  const { data: requests = [], isLoading } = useTeamLeaveRequests(statusFilter)

  const approveReq = useApproveLeaveRequest()
  const rejectReq  = useRejectLeaveRequest()

  const [rejectModal, setRejectModal] = useState(null) // id en attente de refus
  const [processingId, setProcessingId] = useState(null)

  // Filtrer selon rôle
  const pending = requests.filter(r => {
    if (isHR) return ['submitted','manager_approved'].includes(r.status)
    return r.status === 'submitted'
  })

  async function handleApprove(id) {
    setProcessingId(id)
    const level = isHR && requests.find(r => r.id === id)?.status === 'manager_approved'
      ? 'hr' : 'manager'
    await approveReq.mutateAsync({ id, level })
    setProcessingId(null)
  }

  async function handleRejectConfirm(reason) {
    setProcessingId(rejectModal)
    await rejectReq.mutateAsync({ id: rejectModal, rejection_reason: reason })
    setRejectModal(null)
    setProcessingId(null)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-3">
      {rejectModal && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectModal(null)}
          loading={rejectReq.isPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">
          Demandes en attente
          {pending.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: '#EF4444' }}>
              {pending.length}
            </span>
          )}
        </h3>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl px-5 py-10 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-white/30 text-sm">Aucune demande en attente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map(r => (
            <RequestRow
              key={r.id}
              request={r}
              approveLevel={isHR && r.status === 'manager_approved' ? 'hr' : 'manager'}
              onApprove={handleApprove}
              onReject={id => setRejectModal(id)}
              approving={approveReq.isPending && processingId === r.id}
              rejecting={rejectReq.isPending  && processingId === r.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
