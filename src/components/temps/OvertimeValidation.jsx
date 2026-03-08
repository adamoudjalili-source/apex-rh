// ============================================================
// APEX RH — src/components/temps/OvertimeValidation.jsx
// Session 71 — Workflow validation heures supplémentaires
// Managers : approuver / refuser les HS soumises
// ============================================================
import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Users, Filter } from 'lucide-react'
import { usePermission }       from '../../hooks/usePermission'
import {
  usePendingOvertimeSheets,
  useApproveOvertime,
  useRejectOvertime,
  useTimeSheets,
  useTimeSettings,
  formatHours,
  TIMESHEET_STATUS_LABELS,
  TIMESHEET_STATUS_COLORS,
} from '../../hooks/useTemps'

// ─── Carte feuille à valider ──────────────────────────────────
function OtSheetCard({ sheet, onApproved, onRejected }) {
  const approve = useApproveOvertime()
  const reject  = useRejectOvertime()
  const [expanded,  setExpanded]  = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [reason,    setReason]    = useState('')

  const user = sheet.users || {}
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  const otH  = Number(sheet.overtime_hours || 0)
  const ot25 = Number(sheet.ot_25_hours    || 0)
  const ot50 = Number(sheet.ot_50_hours    || 0)
  const ot100= Number(sheet.ot_100_hours   || 0)

  const handleApprove = async () => {
    await approve.mutateAsync(sheet.id)
    onApproved?.()
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    await reject.mutateAsync({ timesheetId: sheet.id, reason })
    setRejectMode(false)
    setReason('')
    onRejected?.()
  }

  const isLoading = approve.isPending || reject.isPending

  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden transition-all hover:border-white/15"
      style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))' }}>

      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7C3AED44,#4F46E544)' }}>
              {(user.first_name?.[0] || '?').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{name || '—'}</p>
              <p className="text-xs text-white/40">
                Semaine du {new Date(sheet.week_start + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-amber-400">+{formatHours(otH)}</p>
            <p className="text-xs text-white/40">heures sup.</p>
          </div>
        </div>

        {/* Barres HS */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Taux 25%', val: ot25,  color: '#F59E0B' },
            { label: 'Taux 50%', val: ot50,  color: '#EF4444' },
            { label: 'Taux 100%',val: ot100, color: '#7C3AED' },
          ].map((item, i) => (
            <div key={i} className="rounded-lg px-3 py-2 text-center"
              style={{ background: item.color + '15', border: `1px solid ${item.color}30` }}>
              <p className="text-sm font-bold" style={{ color: item.color }}>{formatHours(item.val)}</p>
              <p className="text-xs" style={{ color: item.color + 'aa' }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Total feuille */}
        <div className="flex justify-between text-xs text-white/50 mb-4">
          <span>Total semaine : <span className="text-white font-medium">{formatHours(sheet.total_hours)}</span></span>
          <span>Normales : <span className="text-green-400 font-medium">{formatHours(sheet.regular_hours)}</span></span>
        </div>

        {/* Boutons action */}
        {!rejectMode ? (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
                         text-white transition-all disabled:opacity-50 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
            >
              <CheckCircle className="w-4 h-4"/>
              Valider les HS
            </button>
            <button
              onClick={() => setRejectMode(true)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
                         text-white/70 transition-all disabled:opacity-50 hover:text-white
                         border border-white/10 hover:border-red-500/40"
            >
              <XCircle className="w-4 h-4"/>
              Refuser
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motif du refus (obligatoire)…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs text-white bg-white/5 border border-red-500/30
                         focus:outline-none focus:border-red-500/60 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={!reason.trim() || isLoading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#DC2626,#B91C1C)' }}
              >
                Confirmer refus
              </button>
              <button
                onClick={() => { setRejectMode(false); setReason('') }}
                className="px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all
                           border border-white/10"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Historique des validations ───────────────────────────────
function OtHistory() {
  const { data: sheets } = useTimeSheets({ status: 'hr_approved' })
  const recent = (sheets || []).filter(s => s.overtime_hours > 0).slice(0, 8)

  if (!recent.length) return (
    <p className="text-xs text-white/30 text-center py-6">Aucun historique</p>
  )

  return (
    <div className="space-y-2">
      {recent.map(sheet => {
        const u = sheet.users || {}
        return (
          <div key={sheet.id} className="flex items-center justify-between px-4 py-3 rounded-xl
                                          border border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div>
              <p className="text-xs font-medium text-white">
                {u.first_name} {u.last_name}
              </p>
              <p className="text-xs text-white/40">
                Sem. {sheet.week_start}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-amber-400">
                +{formatHours(sheet.overtime_hours)} HS
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: '#10B98120', color: '#10B981' }}>
                ✓ Validées
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────
export default function OvertimeValidation() {
  const { can } = usePermission()
  const canValidate = can('temps', 'team', 'validate')
  const { data: pending = [], isLoading } = usePendingOvertimeSheets()
  const [tab, setTab] = useState('pending')

  if (!canValidate) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <XCircle className="w-10 h-10 text-white/20"/>
      <p className="text-sm text-white/40">Accès réservé aux managers</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
            <Clock className="w-4 h-4 text-white"/>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Validation heures supplémentaires</h3>
            <p className="text-xs text-white/40">Approuver ou refuser les HS soumises</p>
          </div>
        </div>
        {pending.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: '#EF444490' }}>
            {pending.length} en attente
          </span>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.02)', width: 'fit-content' }}>
        {[
          { key: 'pending',  label: `En attente (${pending.length})` },
          { key: 'history',  label: 'Historique' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={tab === t.key ? {
              background: 'rgba(124,58,237,0.3)', color: '#C4B5FD'
            } : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === 'pending' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin"/>
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <CheckCircle className="w-10 h-10 text-green-500/40"/>
              <p className="text-sm text-white/50">Toutes les HS ont été traitées</p>
              <p className="text-xs text-white/30">Aucune feuille en attente de validation</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pending.map(sheet => (
                <OtSheetCard key={sheet.id} sheet={sheet}/>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'history' && <OtHistory/>}
    </div>
  )
}
