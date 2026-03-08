// ============================================================
// APEX RH — src/components/offboarding/FinalSettlementCard.jsx
// Session 85 — Solde de tout compte calculé automatiquement
// Lit leave_balances + compensation_records via RPC S85
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calculator, CheckCircle2, AlertCircle,
  TrendingUp, Calendar, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  useFinalSettlement,
  useApplySettlementToProcess,
} from '../../hooks/useOffboardingS85'
import { useAuth } from '../../contexts/AuthContext'

// ─── Ligne de détail ─────────────────────────────────────────

function DetailRow({ label, value, sub, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <p className={`text-sm ${highlight ? 'text-white font-semibold' : 'text-white/70'}`}>{label}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
      <span className={`text-sm font-bold ${highlight ? 'text-emerald-400' : 'text-white/80'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

export default function FinalSettlementCard({ userId, processId, currentAmount }) {
  const { canAdmin, canManageTeam } = useAuth()
  const canApply = canAdmin || canManageTeam

  const { data: settlement, isLoading, isError, refetch, isFetching } = useFinalSettlement(userId)
  const applyMutation = useApplySettlementToProcess()

  const [expanded, setExpanded]     = useState(true)
  const [applied,  setApplied]      = useState(false)

  const fmt = (n) => typeof n === 'number'
    ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    : '—'

  const handleApply = async () => {
    if (!processId || !settlement) return
    await applyMutation.mutateAsync({ processId, settlement })
    setApplied(true)
    setTimeout(() => setApplied(false), 3000)
  }

  const diffFromCurrent = settlement?.total_amount != null && currentAmount != null
    ? settlement.total_amount - currentAmount
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Calculator size={16} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Calcul automatique du solde</p>
          <p className="text-xs text-white/40">Depuis congés et salaire en base</p>
        </div>
        {settlement?.total_amount != null && (
          <span className="text-base font-bold text-emerald-400 mr-2">
            {fmt(settlement.total_amount)}
          </span>
        )}
        {expanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {/* Corps */}
      {expanded && (
        <div className="px-4 pb-4">

          {/* État chargement */}
          {isLoading && (
            <div className="flex items-center gap-2 py-4">
              <RefreshCw size={14} className="animate-spin text-white/40" />
              <span className="text-xs text-white/40">Calcul en cours…</span>
            </div>
          )}

          {/* Erreur */}
          {isError && (
            <div className="flex items-center gap-2 py-3 px-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="text-red-400" />
              <p className="text-xs text-red-300">
                Impossible de calculer le solde — données manquantes (salaire ou congés non renseignés)
              </p>
            </div>
          )}

          {/* Résultats */}
          {settlement && !isLoading && (
            <>
              {/* Base de calcul */}
              <div className="mb-3 p-3 rounded-xl space-y-1"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Salaire mensuel brut</span>
                  <span className="text-white/70 font-medium">{fmt(settlement.monthly_salary)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Taux journalier (÷ 21,67)</span>
                  <span className="text-white/70 font-medium">{fmt(settlement.daily_rate)}</span>
                </div>
              </div>

              {/* Détail */}
              <div>
                <DetailRow
                  label="Congés Payés restants"
                  sub={`${settlement.cp_balance} jour${settlement.cp_balance !== 1 ? 's' : ''} × ${fmt(settlement.daily_rate)}`}
                  value={fmt(settlement.cp_amount)}
                />
                <DetailRow
                  label="RTT restants"
                  sub={`${settlement.rtt_balance} jour${settlement.rtt_balance !== 1 ? 's' : ''} × ${fmt(settlement.daily_rate)}`}
                  value={fmt(settlement.rtt_amount)}
                />
                <DetailRow
                  label="TOTAL SOLDE DE TOUT COMPTE"
                  value={fmt(settlement.total_amount)}
                  highlight
                />
              </div>

              {/* Écart vs montant enregistré */}
              {diffFromCurrent !== null && Math.abs(diffFromCurrent) > 0.01 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: diffFromCurrent > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                    border: `1px solid ${diffFromCurrent > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  }}>
                  <TrendingUp size={12} className={diffFromCurrent > 0 ? 'text-amber-400' : 'text-emerald-400'} />
                  <p className="text-xs" style={{ color: diffFromCurrent > 0 ? '#FCD34D' : '#6EE7B7' }}>
                    Écart de {fmt(Math.abs(diffFromCurrent))} vs montant enregistré ({fmt(currentAmount)})
                  </p>
                </div>
              )}

              {/* Date calcul */}
              {settlement.computed_at && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Calendar size={10} className="text-white/20" />
                  <span className="text-[10px] text-white/20">
                    Calculé le {new Date(settlement.computed_at).toLocaleString('fr-FR')}
                  </span>
                  <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="ml-auto flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
                  >
                    <RefreshCw size={9} className={isFetching ? 'animate-spin' : ''} />
                    Recalculer
                  </button>
                </div>
              )}

              {/* Bouton appliquer */}
              {canApply && processId && (
                <button
                  onClick={handleApply}
                  disabled={applyMutation.isPending || applied}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: applied
                      ? 'rgba(16,185,129,0.2)'
                      : 'rgba(16,185,129,0.15)',
                    border: `1px solid ${applied ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.25)'}`,
                    color: '#6EE7B7',
                    opacity: applyMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {applied ? (
                    <><CheckCircle2 size={14} /> Appliqué au dossier</>
                  ) : applyMutation.isPending ? (
                    <><RefreshCw size={14} className="animate-spin" /> Application…</>
                  ) : (
                    <><CheckCircle2 size={14} /> Appliquer au dossier</>
                  )}
                </button>
              )}

              {/* Avertissement si données manquantes */}
              {(settlement.monthly_salary === 0 || (settlement.cp_balance === 0 && settlement.rtt_balance === 0)) && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <AlertCircle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300/70">
                    {settlement.monthly_salary === 0 && 'Salaire non renseigné. '}
                    {settlement.cp_balance === 0 && settlement.rtt_balance === 0 && 'Solde de congés introuvable ou nul. '}
                    Vérifiez les données de paie et de congés pour ce collaborateur.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}
