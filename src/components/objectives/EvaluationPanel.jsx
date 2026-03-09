// ============================================================
// APEX RH — EvaluationPanel.jsx
// Session 10 — Workflow évaluation 3 étapes
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Shield, Star } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSelfEvaluate, useValidateN1, useCalibrateRH } from '../../hooks/useObjectives'
import {
  EVALUATION_STATUS, getEvalStatusInfo, formatScore,
  canSelfEvaluate, canValidateN1, canCalibrateRH
} from '../../lib/objectiveHelpers'

const STEPS = [
  { key: 'auto_evaluation', label: 'Auto-évaluation', icon: Star, color: '#F59E0B' },
  { key: 'validation_n1', label: 'Validation N+1', icon: Shield, color: '#8B5CF6' },
  { key: 'calibration_rh', label: 'Calibration RH', icon: CheckCircle2, color: '#3B82F6' },
]

export default function EvaluationPanel({ objective }) {
  const { profile } = useAuth()
  const selfEval = useSelfEvaluate()
  const validateN1 = useValidateN1()
  const calibrateRH = useCalibrateRH()

  const [score, setScore] = useState('')
  const [comment, setComment] = useState('')

  if (!objective || objective.status !== 'en_evaluation') return null

  const evalStatus = objective.evaluation_status
  const evalInfo = getEvalStatusInfo(evalStatus)
  const currentStep = evalInfo.step

  const userCanSelfEval = canSelfEvaluate(objective, profile)
  const userCanValidate = canValidateN1(objective, profile)
  const userCanCalibrate = canCalibrateRH(objective, profile)

  const handleSubmit = async () => {
    const numScore = parseFloat(score)
    if (isNaN(numScore) || numScore < 0 || numScore > 1) return

    try {
      if (userCanSelfEval) {
        await selfEval.mutateAsync({ id: objective.id, selfScore: numScore, selfComment: comment })
      } else if (userCanValidate) {
        await validateN1.mutateAsync({ id: objective.id, managerScore: numScore, managerComment: comment })
      } else if (userCanCalibrate) {
        await calibrateRH.mutateAsync({ id: objective.id, finalScore: numScore, rhComment: comment })
      }
      setScore('')
      setComment('')
    } catch (err) {
    }
  }

  const isPending = selfEval.isPending || validateN1.isPending || calibrateRH.isPending
  const canAct = userCanSelfEval || userCanValidate || userCanCalibrate

  return (
    <div className="space-y-4">
      {/* Stepper visuel */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isDone = currentStep > stepNum
          const isCurrent = currentStep === stepNum - 1 && canAct
          const isFuture = currentStep < stepNum

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isDone
                      ? 'ring-2'
                      : isCurrent
                      ? 'ring-2 animate-pulse'
                      : 'opacity-30'
                  }`}
                  style={{
                    background: isDone || isCurrent ? `${step.color}22` : 'rgba(255,255,255,0.05)',
                    ringColor: isDone || isCurrent ? step.color : 'transparent',
                  }}
                >
                  <step.icon size={14} style={{ color: isDone || isCurrent ? step.color : '#666' }} />
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className={`text-[10px] font-medium truncate ${isDone || isCurrent ? 'text-white/60' : 'text-white/20'}`}>
                    {step.label}
                  </p>
                  {isDone && (
                    <p className="text-[10px] text-emerald-400/60">
                      {step.key === 'auto_evaluation' && objective.self_score != null && formatScore(objective.self_score)}
                      {step.key === 'validation_n1' && objective.manager_score != null && formatScore(objective.manager_score)}
                      {step.key === 'calibration_rh' && objective.final_score != null && formatScore(objective.final_score)}
                    </p>
                  )}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-shrink-0 w-4 mx-1 ${isDone ? 'bg-white/20' : 'bg-white/5'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Scores déjà soumis */}
      {objective.self_score != null && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <Star size={14} className="text-amber-400" />
          <span className="text-xs text-white/50">Auto-évaluation :</span>
          <span className="text-xs font-bold text-amber-400">{formatScore(objective.self_score)}</span>
          {objective.self_comment && <span className="text-xs text-white/30 truncate">— {objective.self_comment}</span>}
        </div>
      )}
      {objective.manager_score != null && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
          <Shield size={14} className="text-violet-400" />
          <span className="text-xs text-white/50">Validation N+1 :</span>
          <span className="text-xs font-bold text-violet-400">{formatScore(objective.manager_score)}</span>
          {objective.manager_comment && <span className="text-xs text-white/30 truncate">— {objective.manager_comment}</span>}
        </div>
      )}
      {objective.final_score != null && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <CheckCircle2 size={14} className="text-blue-400" />
          <span className="text-xs text-white/50">Score final :</span>
          <span className="text-xs font-bold text-blue-400">{formatScore(objective.final_score)}</span>
          {objective.rh_comment && <span className="text-xs text-white/30 truncate">— {objective.rh_comment}</span>}
        </div>
      )}

      {/* Formulaire d'action */}
      {canAct && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
        >
          <p className="text-xs font-semibold text-white/60">
            {userCanSelfEval && '📝 Votre auto-évaluation'}
            {userCanValidate && '🔒 Validation N+1'}
            {userCanCalibrate && '⚖️ Calibration RH'}
          </p>

          <div className="flex gap-3">
            <div>
              <label className="block text-[10px] text-white/30 mb-1">Score (0 à 1.0)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0.75"
                className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-white/30 mb-1">Commentaire</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Observations…"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending || !score}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isPending ? 'Envoi…' : 'Soumettre'}
          </button>
        </motion.div>
      )}

      {/* Finalisé */}
      {evalStatus === 'finalise' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            Évaluation finalisée — Score final : {formatScore(objective.final_score)}
          </span>
        </div>
      )}
    </div>
  )
}
