// ============================================================
// APEX RH — components/formation/FormationDetail.jsx
// Session 57 — Panel détail d'une formation
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Clock, Users, Star, Award, BookOpen, ExternalLink,
  CheckCircle2, PlayCircle, AlertCircle, Loader2, Tag,
} from 'lucide-react'
import {
  TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS,
  LEVEL_LABELS, LEVEL_COLORS,
  useEnrollUser,
} from '../../hooks/useFormations'
import { useAuth } from '../../contexts/AuthContext'

function InfoRow({ icon: Icon, label, value, color }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-white/30 flex-shrink-0"/>
      <span className="text-white/35">{label}</span>
      <span className="text-white/70 font-medium ml-auto" style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  )
}

export default function FormationDetail({ training, onClose, enrolledStatus }) {
  const { profile } = useAuth()
  const enroll = useEnrollUser()
  const [enrollSuccess, setEnrollSuccess] = useState(false)

  if (!training) return null

  const {
    title, description, type, provider, duration_hours, level,
    price_xof, skills_covered = [], tags = [], is_mandatory, link_url,
    mv_training_popularity,
  } = training

  const typeColor  = TRAINING_TYPE_COLORS[type] || '#6366F1'
  const levelColor = LEVEL_COLORS[level]         || '#6B7280'
  const stats      = Array.isArray(mv_training_popularity)
    ? mv_training_popularity[0]
    : mv_training_popularity

  const isEnrolled = !!enrolledStatus

  async function handleEnroll() {
    await enroll.mutateAsync({
      userId:     profile.id,
      trainingId: training.id,
    })
    setEnrollSuccess(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="relative w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          style={{ background: '#0d0d24', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Barre couleur */}
          <div className="h-1 flex-shrink-0" style={{ background: typeColor }}/>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-5 pb-4 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${typeColor}20`, color: typeColor }}>
                  {TRAINING_TYPE_LABELS[type]}
                </span>
                {level && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${levelColor}20`, color: levelColor }}>
                    {LEVEL_LABELS[level]}
                  </span>
                )}
                {is_mandatory && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-400">
                    Obligatoire
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white leading-snug">{title}</h2>
              {provider && <p className="text-xs text-white/40 mt-0.5">{provider}</p>}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0">
              <X size={16}/>
            </button>
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-5">

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Inscrits',    value: stats.total_enrollments || 0, icon: Users },
                  { label: 'Taux complet', value: stats.completion_rate ? `${stats.completion_rate}%` : '—', icon: CheckCircle2 },
                  { label: 'Note moy.',   value: stats.avg_rating ? stats.avg_rating.toFixed(1) : '—', icon: Star },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg p-2.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Icon size={14} className="text-white/30 mx-auto mb-1"/>
                    <p className="text-base font-bold text-white">{value}</p>
                    <p className="text-[10px] text-white/30">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {description && (
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-white/60 leading-relaxed">{description}</p>
              </div>
            )}

            {/* Infos */}
            <div className="space-y-2 rounded-lg p-3"
              style={{ background: 'rgba(255,255,255,0.025)' }}>
              <InfoRow icon={Clock} label="Durée" value={duration_hours ? `${duration_hours}h` : null}/>
              <InfoRow icon={Award} label="Niveau" value={LEVEL_LABELS[level]} color={levelColor}/>
              {price_xof > 0 && (
                <InfoRow icon={Tag} label="Coût"
                  value={new Intl.NumberFormat('fr-FR').format(price_xof) + ' XOF'}/>
              )}
            </div>

            {/* Compétences */}
            {skills_covered.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Compétences développées
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skills_covered.map(skill => (
                    <span key={skill}
                      className="text-xs px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-5 pt-4 border-t border-white/[0.06] flex items-center gap-3 flex-shrink-0">
            {link_url && (
              <a href={link_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
                <ExternalLink size={14}/>
                <span>Voir détails</span>
              </a>
            )}
            <div className="flex-1"/>
            {enrollSuccess || (isEnrolled && enrolledStatus !== 'annule') ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 size={16}/>
                <span>{enrollSuccess ? 'Inscription confirmée !' : 'Déjà inscrit'}</span>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enroll.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: typeColor }}>
                {enroll.isPending ? (
                  <Loader2 size={14} className="animate-spin"/>
                ) : (
                  <PlayCircle size={14}/>
                )}
                <span>S'inscrire</span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
