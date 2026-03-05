// ============================================================
// APEX RH — MonDeveloppement.jsx  ·  Session 38
// Route /mon-developpement — Placeholder
// Contenu complet : Session 41
//   • Plan de Développement Individuel (PDI)
//   • Feedbacks 360° reçus
//   • Référentiel compétences
//   • Progression vers les objectifs de carrière
// ============================================================
import { motion } from 'framer-motion'
import { BookOpen, MessageSquare, Award, TrendingUp, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.08 } } }
const fadeUp  = { hidden:{ opacity:0, y:14 }, visible:{ opacity:1, y:0, transition:{ duration:0.38, ease:[0.4,0,0.2,1] } } }

const UPCOMING = [
  {
    icon: BookOpen,
    color: '#4F46E5',
    title: 'Plan de Développement Individuel',
    desc: 'Objectifs de progression personnalisés, actions à réaliser, suivi dans le temps.',
    session: 'S41',
  },
  {
    icon: MessageSquare,
    color: '#3B82F6',
    title: 'Feedbacks 360° Reçus',
    desc: 'Synthèse de vos évaluations par vos pairs et votre manager, radar de compétences.',
    session: 'S41',
  },
  {
    icon: TrendingUp,
    color: '#10B981',
    title: 'Référentiel Compétences',
    desc: 'Cartographie de vos compétences clés, niveaux attendus vs réalisés.',
    session: 'S42',
  },
  {
    icon: Award,
    color: '#C9A227',
    title: 'Progression de Carrière',
    desc: 'Visualisez votre trajectoire et les étapes vers votre prochain niveau.',
    session: 'S42',
  },
]

export default function MonDeveloppement() {
  const { profile } = useAuth()
  const firstName   = profile?.first_name || 'Vous'

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background:'linear-gradient(180deg,rgba(16,185,129,0.03) 0%,transparent 180px)' }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)' }}>
            <BookOpen size={16} style={{ color:'#10B981' }}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
              Mon Développement
            </h1>
            <p className="text-xs text-white/30">PDI · Feedbacks · Compétences · Progression</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
        {/* Badge À venir */}
        <motion.div variants={fadeUp}
          className="mb-6 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
          <Clock size={12} className="text-white/30"/>
          <span className="text-xs text-white/30 font-medium">Disponible en Session 41</span>
        </motion.div>

        <motion.h2 variants={fadeUp}
          className="text-2xl font-bold text-white text-center mb-2"
          style={{ fontFamily:"'Syne',sans-serif" }}>
          {firstName}, votre espace de développement
          <br/>arrive bientôt
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm text-white/30 text-center mb-10 max-w-md">
          Cette section centralisera tout ce qui concerne votre progression professionnelle —
          objectifs de développement, feedbacks reçus, compétences et plan de carrière.
        </motion.p>

        {/* Cards à venir */}
        <motion.div variants={fadeUp} className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {UPCOMING.map(item => {
            const Icon = item.icon
            return (
              <div key={item.title}
                className="rounded-2xl p-4 border border-white/[0.06] flex gap-3 items-start"
                style={{ background:'rgba(255,255,255,0.02)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background:`${item.color}15`, border:`1px solid ${item.color}25` }}>
                  <Icon size={14} style={{ color:item.color }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white/80 truncate">{item.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background:`${item.color}15`, color:item.color }}>
                      {item.session}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  )
}
