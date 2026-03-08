// ============================================================
// APEX RH — src/components/calibration/CalibrationMatrix.jsx
// Session 55 — Matrice de calibration multi-niveaux
// Affiche tous les collaborateurs avec scores + overrides
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RATING_OPTIONS,
  DISTRIBUTION_BENCHMARK,
  CALIBRATION_LEVEL_LABELS,
  CALIBRATION_LEVEL_COLORS,
  OVERRIDE_STATUS_LABELS,
  OVERRIDE_STATUS_COLORS,
  useDistributionStats,
  useProposeOverride,
  useApproveOverride,
} from '../../hooks/useCalibration'

// ─── HELPERS ─────────────────────────────────────────────────

const RATING_COLOR = {
  insuffisant:  '#EF4444',
  a_ameliorer:  '#F97316',
  satisfaisant: '#F59E0B',
  bien:         '#3B82F6',
  excellent:    '#10B981',
}
const RATING_LABEL = {
  insuffisant:  'Insuffisant',
  a_ameliorer:  'À améliorer',
  satisfaisant: 'Satisfaisant',
  bien:         'Bien',
  excellent:    'Excellent',
}

function RatingBadge({ rating, size = 'sm' }) {
  if (!rating) return <span className="text-gray-600 text-xs">—</span>
  const color = RATING_COLOR[rating] || '#6B7280'
  const label = RATING_LABEL[rating] || rating
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

function ScorePill({ score }) {
  if (score == null) return <span className="text-gray-600 text-xs">—</span>
  const color = score >= 7.5 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444'
  return (
    <span className="text-sm font-bold" style={{ color }}>{score}/10</span>
  )
}

function DistributionBar({ distribution, total }) {
  if (!total) return null
  return (
    <div className="flex items-center gap-0.5 h-4 rounded-full overflow-hidden">
      {RATING_OPTIONS.map(opt => {
        const count = distribution[opt.value] || 0
        const pct = total > 0 ? (count / total * 100) : 0
        if (pct === 0) return null
        return (
          <div
            key={opt.value}
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: opt.color }}
            title={`${opt.label}: ${count} (${Math.round(pct)}%)`}
          />
        )
      })}
    </div>
  )
}

// ─── OVERRIDE MODAL ──────────────────────────────────────────

function OverrideModal({ evaluation, sessionId, onClose, isN2, existingOverride }) {
  const [calibratedRating, setCalibratedRating] = useState(existingOverride?.calibrated_rating || evaluation.overall_rating || '')
  const [justification, setJustification]       = useState(existingOverride?.justification || '')
  const [saving, setSaving] = useState(false)
  const proposeOverride = useProposeOverride()
  const approveOverride = useApproveOverride()

  const originalRating = evaluation.overall_rating

  async function handleSave() {
    if (!calibratedRating || !justification.trim()) return
    setSaving(true)
    try {
      await proposeOverride.mutateAsync({
        sessionId,
        evaluationId:    evaluation.evaluation_id,
        originalRating,
        calibratedRating,
        deltaScore:      null,
        justification,
        level:           isN2 ? 'n2' : 'n1',
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  async function handleApprove(approved) {
    if (!existingOverride) return
    setSaving(true)
    try {
      await approveOverride.mutateAsync({
        overrideId: existingOverride.id,
        sessionId,
        approved,
        comment: justification,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const changed = calibratedRating !== originalRating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: '#0F1117' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <div>
            <h2 className="text-base font-semibold text-white">Calibration — {evaluation.collaborateur_name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{isN2 ? 'Validation N+2' : 'Override N+1'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Scores auto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
              <div className="text-[10px] text-gray-500 mb-1">Auto-évaluation</div>
              <ScorePill score={evaluation.self_avg_score} />
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
              <div className="text-[10px] text-gray-500 mb-1">Score manager</div>
              <ScorePill score={evaluation.manager_avg_score} />
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
              <div className="text-[10px] text-gray-500 mb-1">Note manager</div>
              <RatingBadge rating={originalRating} />
            </div>
          </div>

          {/* Sélection note calibrée */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Note calibrée *</label>
            <div className="grid grid-cols-5 gap-2">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCalibratedRating(opt.value)}
                  className={`rounded-lg p-2 text-xs font-medium border transition-all text-center ${
                    calibratedRating === opt.value
                      ? 'border-transparent text-white'
                      : 'border-white/10 bg-white/3 text-gray-500 hover:border-white/20'
                  }`}
                  style={calibratedRating === opt.value ? { background: opt.color, borderColor: opt.color } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {changed && (
              <p className="text-xs text-amber-400 mt-1.5">
                ⚠️ Changement : {RATING_LABEL[originalRating] || originalRating} → {RATING_LABEL[calibratedRating]}
              </p>
            )}
          </div>

          {/* Justification */}
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              Justification * {isN2 ? '(décision finale)' : '(transmise au N+2)'}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 resize-none focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"
              placeholder="Motif de l'ajustement de note (contexte, éléments non capturés par les scores…)"
              value={justification}
              onChange={e => setJustification(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">Annuler</button>

            {isN2 && existingOverride?.status === 'pending' ? (
              <>
                <button
                  onClick={() => handleApprove(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600/80 hover:bg-red-500 disabled:opacity-40"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => handleApprove(true)}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                >
                  ✓ Approuver
                </button>
              </>
            ) : (
              <button
                onClick={handleSave}
                disabled={!calibratedRating || !justification.trim() || saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
              >
                {saving ? '⏳' : '💾'} Enregistrer
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL : CalibrationMatrix ─────────────────

export default function CalibrationMatrix({ evals, sessionId, sessionStatus, isN2 }) {
  const [overrideTarget, setOverrideTarget] = useState(null)
  const [filter, setFilter] = useState('all')
  const { distribution, benchmark, delta, total } = useDistributionStats(evals)

  const filtered = evals.filter(ev => {
    if (filter === 'overridden')    return !!ev.override_id
    if (filter === 'not_overridden') return !ev.override_id
    if (filter === 'pending_n2')    return ev.override_status === 'pending'
    return true
  })

  const canEdit = sessionStatus !== 'closed' && sessionStatus !== 'validated'
  const isReadonly = !canEdit && !isN2

  if (!evals || evals.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
        <div className="text-3xl mb-2">📋</div>
        <div className="text-sm text-gray-500">Aucune évaluation disponible pour cette session</div>
        <div className="text-xs text-gray-600 mt-1">Assurez-vous que des évaluations ont été soumises dans ce cycle</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Distribution actuelle vs benchmark */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Distribution de la population</h3>
          <span className="text-xs text-gray-600">{total} collaborateurs</span>
        </div>
        <div className="space-y-2">
          <DistributionBar distribution={distribution} total={total} />
          <div className="grid grid-cols-5 gap-1 text-center">
            {RATING_OPTIONS.map(opt => {
              const count  = distribution[opt.value] || 0
              const pct    = total > 0 ? Math.round(count / total * 100) : 0
              const diff   = delta[opt.value] || 0
              return (
                <div key={opt.value} className="text-[10px]">
                  <div className="font-bold" style={{ color: opt.color }}>{pct}%</div>
                  <div className="text-gray-600">{opt.label.slice(0, 4)}.</div>
                  {diff !== 0 && (
                    <div className={diff > 0 ? 'text-green-500' : 'text-red-500'}>
                      {diff > 0 ? '+' : ''}{diff}%
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-[10px] text-gray-600 text-center">vs benchmark (Idéal : 5/15/45/25/10%)</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: `Tous (${evals.length})` },
          { id: 'overridden', label: `Modifiés (${evals.filter(e => e.override_id).length})` },
          { id: 'not_overridden', label: 'Non modifiés' },
          ...(isN2 ? [{ id: 'pending_n2', label: `À valider (${evals.filter(e => e.override_status === 'pending').length})` }] : []),
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.id ? 'text-white' : 'text-gray-500 hover:text-white bg-white/3 border border-white/10'
            }`}
            style={filter === f.id ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Collaborateur</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Auto-éval</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Score mgr</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Note mgr</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Calibré</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Statut</th>
              {!isReadonly && (
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev, idx) => {
              const hasOverride = !!ev.override_id
              const isChanged = hasOverride && ev.calibrated_rating !== ev.overall_rating
              return (
                <tr
                  key={ev.evaluation_id}
                  className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${isChanged ? 'bg-amber-500/[0.03]' : ''}`}
                >
                  {/* Collaborateur */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                        {ev.collaborateur_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">{ev.collaborateur_name}</div>
                        <div className="text-[10px] text-gray-600">{ev.division_name || ev.service_name || ''}</div>
                      </div>
                    </div>
                  </td>

                  {/* Scores */}
                  <td className="px-3 py-3 text-center"><ScorePill score={ev.self_avg_score} /></td>
                  <td className="px-3 py-3 text-center"><ScorePill score={ev.manager_avg_score} /></td>
                  <td className="px-3 py-3 text-center"><RatingBadge rating={ev.overall_rating} /></td>

                  {/* Note calibrée */}
                  <td className="px-3 py-3 text-center">
                    {hasOverride ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <RatingBadge rating={ev.calibrated_rating} />
                        {isChanged && (
                          <span className="text-[9px] text-amber-400">modifié</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Statut override */}
                  <td className="px-3 py-3 text-center">
                    {hasOverride ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${OVERRIDE_STATUS_COLORS[ev.override_status]}22`,
                          color: OVERRIDE_STATUS_COLORS[ev.override_status],
                        }}
                      >
                        {OVERRIDE_STATUS_LABELS[ev.override_status]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  {!isReadonly && (
                    <td className="px-4 py-3 text-right">
                      {isN2 && ev.override_status === 'pending' ? (
                        <button
                          onClick={() => setOverrideTarget(ev)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-amber-600/80 hover:bg-amber-500"
                        >
                          Valider →
                        </button>
                      ) : canEdit ? (
                        <button
                          onClick={() => setOverrideTarget(ev)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                        >
                          {hasOverride ? 'Modifier' : 'Calibrer'}
                        </button>
                      ) : null}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal override */}
      <AnimatePresence>
        {overrideTarget && (
          <OverrideModal
            key={overrideTarget.evaluation_id}
            evaluation={overrideTarget}
            sessionId={sessionId}
            onClose={() => setOverrideTarget(null)}
            isN2={isN2}
            existingOverride={overrideTarget.override_id ? {
              id:               overrideTarget.override_id,
              calibrated_rating: overrideTarget.calibrated_rating,
              justification:    overrideTarget.justification,
              status:           overrideTarget.override_status,
            } : null}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
