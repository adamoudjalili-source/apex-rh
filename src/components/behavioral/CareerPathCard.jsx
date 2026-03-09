// ============================================================
// APEX RH — src/components/behavioral/CareerPathCard.jsx
// Session 54 — Carte trajectoire & prédictions carrière
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Target, Briefcase, Star, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Zap } from 'lucide-react'
import { useCareerPredictions, getTrajectoryConfig } from '../../hooks/useBehavioralIntelligence'
import { CRITICALITY_CONFIG } from '../../hooks/useSuccessionPlanning'

function TrajectoryBadge({ label, score }) {
  const cfg = getTrajectoryConfig(label)
  return (
    <div
      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2"
      style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
    >
      <span className="text-xl">{cfg.icon}</span>
      <div>
        <p className="text-sm font-bold" style={{ color: cfg.color }}>{label}</p>
        <p className="text-[10px] text-white/40">{cfg.description}</p>
      </div>
      <div className="ml-2 text-right">
        <p className="text-lg font-bold text-white">{Math.round(score || 0)}%</p>
        <p className="text-[10px] text-white/30">confiance</p>
      </div>
    </div>
  )
}

function MatchedPositionItem({ position }) {
  const crit = CRITICALITY_CONFIG[position.criticality_level] || CRITICALITY_CONFIG.medium

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${crit.color}20` }}
      >
        <Briefcase size={14} style={{ color: crit.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{position.title}</p>
        <p className="text-[10px] text-white/40">
          {position.divisions?.name || position.directions?.name || 'Organisation'}
          {position.vacancy_horizon_months && (
            <span className="ml-2 text-yellow-400/60">
              Horizon : {position.vacancy_horizon_months} mois
            </span>
          )}
        </p>
      </div>
      <span
        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
        style={{ background: `${crit.color}20`, color: crit.color }}
      >
        {crit.label}
      </span>
    </div>
  )
}

function PdiRecommendation({ rec, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="flex items-start gap-2.5 p-2.5 rounded-xl"
      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
    >
      <Zap size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-white/70">{rec}</p>
    </motion.div>
  )
}

export default function CareerPathCard({ userId, showFull = true }) {
  const { data, isLoading, error } = useCareerPredictions(userId)
  const [expandPdi, setExpandPdi] = useState(false)
  const [expandPos, setExpandPos] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
        <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
        Prédictions non disponibles
      </div>
    )
  }

  const { prediction, matchedPositions } = data

  if (!prediction) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
        <MapPin size={24} className="mx-auto mb-2 opacity-40" />
        Exécutez <code className="text-purple-400 text-xs">refresh_behavioral_scores()</code> pour générer les prédictions
      </div>
    )
  }

  const pdiRecs = prediction.pdi_recommendations
    ? (Array.isArray(prediction.pdi_recommendations) ? prediction.pdi_recommendations : [])
    : [
        'Renforcer les compétences de communication transversale',
        'Suivre une formation en gestion de projet (PMP ou équivalent)',
        'Prendre en charge un projet pilote à visibilité étendue',
        'Solliciter un mentor interne dans la trajectoire ciblée',
      ]

  return (
    <div className="space-y-4">
      {/* Trajectoire principale */}
      <div>
        <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Trajectoire probable (12 mois)</p>
        <TrajectoryBadge
          label={prediction.trajectory_label || 'Socle Opérationnel'}
          score={prediction.trajectory_score}
        />
      </div>

      {/* Stats profil actuel */}
      {showFull && (prediction.current_pulse_avg || prediction.current_okr_avg) && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'PULSE', value: prediction.current_pulse_avg, color: '#8B5CF6' },
            { label: 'OKR',   value: prediction.current_okr_avg,   color: '#3B82F6' },
            { label: 'F360',  value: prediction.current_f360_avg,  color: '#10B981' },
            { label: 'NITA',  value: prediction.current_nita_avg,  color: '#F59E0B' },
          ].map(({ label, value, color }) => (
            value != null ? (
              <div
                key={label}
                className="rounded-xl p-2 text-center"
                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
              >
                <p className="text-base font-bold" style={{ color }}>
                  {typeof value === 'number' ? value.toFixed(1) : '—'}
                </p>
                <p className="text-[10px] text-white/40">{label}</p>
              </div>
            ) : null
          )).filter(Boolean)}
        </div>
      )}

      {/* Postes clés matchés */}
      {matchedPositions.length > 0 && (
        <div>
          <button
            onClick={() => setExpandPos(v => !v)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors mb-2 w-full"
          >
            <Target size={14} className="text-yellow-400" />
            <span>{matchedPositions.length} poste(s) correspondant à votre profil</span>
            {expandPos ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
          </button>
          <AnimatePresence>
            {expandPos && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {matchedPositions.map(pos => (
                  <MatchedPositionItem key={pos.id} position={pos} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Recommandations PDI */}
      <div>
        <button
          onClick={() => setExpandPdi(v => !v)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors mb-2 w-full"
        >
          <Star size={14} className="text-purple-400" />
          <span>Recommandations PDI personnalisées</span>
          {expandPdi ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
        </button>
        <AnimatePresence>
          {expandPdi && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {pdiRecs.map((rec, i) => (
                <PdiRecommendation key={i} rec={rec} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Strengths / development areas */}
      {showFull && (prediction.strengths?.length || prediction.development_areas?.length) && (
        <div className="grid grid-cols-2 gap-3">
          {prediction.strengths?.length > 0 && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <p className="text-xs font-semibold text-green-400 mb-2">Points forts</p>
              <div className="space-y-1">
                {prediction.strengths.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle size={10} className="text-green-400 flex-shrink-0" />
                    <p className="text-[11px] text-white/60">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {prediction.development_areas?.length > 0 && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <p className="text-xs font-semibold text-yellow-400 mb-2">Axes de développement</p>
              <div className="space-y-1">
                {prediction.development_areas.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Target size={10} className="text-yellow-400 flex-shrink-0" />
                    <p className="text-[11px] text-white/60">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
