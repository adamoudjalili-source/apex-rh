// ============================================================
// APEX RH — TaskWeightForm.jsx  ·  Session 39
// Formulaire de pondération : 4 critères × 1–5
// ============================================================
import { useState } from 'react'
import {
  WEIGHT_CRITERIA,
  WEIGHT_LEVEL_LABELS,
  computeWeightScore,
  getWeightLabel,
} from '../../hooks/useTaskWeight'

export default function TaskWeightForm({ weights = {}, onChange, compact = false }) {
  const current = {
    weight_complexity: weights.weight_complexity ?? 1,
    weight_impact:     weights.weight_impact     ?? 1,
    weight_urgency:    weights.weight_urgency    ?? 1,
    weight_strategic:  weights.weight_strategic  ?? 1,
  }

  const score100   = computeWeightScore(current)
  const weightInfo = getWeightLabel(score100)

  function setWeight(key, val) {
    onChange?.({ ...current, [key]: val })
  }

  if (compact) {
    return (
      <div
        className="rounded-lg p-3 space-y-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Pondération</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${weightInfo.color}20`, color: weightInfo.color }}
          >
            {weightInfo.emoji} {score100}/100
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WEIGHT_CRITERIA.map(c => (
            <div key={c.key}>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs">{c.icon}</span>
                <span className="text-xs text-white/50">{c.label}</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWeight(c.key, v)}
                    className="flex-1 h-5 rounded transition-all"
                    style={{
                      background: v <= current[c.key]
                        ? c.color
                        : 'rgba(255,255,255,0.08)',
                    }}
                    title={WEIGHT_LEVEL_LABELS[v]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">Pondération de la tâche</h4>
          <p className="text-xs text-white/40 mt-0.5">4 critères × 1–5 points</p>
        </div>
        <div
          className="text-center px-3 py-1.5 rounded-lg"
          style={{ background: `${weightInfo.color}15`, border: `1px solid ${weightInfo.color}30` }}
        >
          <div className="text-lg font-black" style={{ color: weightInfo.color }}>
            {score100}
          </div>
          <div className="text-xs font-medium" style={{ color: weightInfo.color }}>
            {weightInfo.label}
          </div>
        </div>
      </div>

      {/* Critères */}
      <div className="space-y-3">
        {WEIGHT_CRITERIA.map(c => (
          <div key={c.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span>{c.icon}</span>
                <span className="text-sm font-medium text-white">{c.label}</span>
                <span className="text-xs text-white/30">{c.desc}</span>
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: c.color }}
              >
                {WEIGHT_LEVEL_LABELS[current[c.key]]}
              </span>
            </div>

            {/* Barre de sélection 1–5 */}
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setWeight(c.key, v)}
                  className="flex-1 h-7 rounded-lg text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: v <= current[c.key]
                      ? c.color
                      : 'rgba(255,255,255,0.06)',
                    color: v <= current[c.key] ? '#fff' : 'rgba(255,255,255,0.3)',
                    border: v === current[c.key]
                      ? `2px solid ${c.color}`
                      : '2px solid transparent',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Explication */}
      <p className="text-xs text-white/30 border-t border-white/5 pt-3">
        Le score pondéré influence le calcul PULSE Delivery — une tâche critique terminée compte davantage qu'une tâche légère.
      </p>
    </div>
  )
}
