// ============================================================
// APEX RH — MonEspaceHub.jsx · Réorg UX Hub & Spoke
// Hub personnel du collaborateur — 5 domaines
//   Ma Performance · Mon Développement (+ Formation)
//   Compensation · Récompenses & Engagement · Mon Travail
// Accessible à tous les rôles
// ============================================================
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayScore } from '../../hooks/usePulse'
import { getScoreColor, isPulseEnabled } from '../../lib/pulseHelpers'
import {
  Activity, BookOpen, DollarSign, Trophy,
  CheckSquare, FolderKanban, Target,
  ArrowRight, Sparkles,
} from 'lucide-react'

// ── animations ────────────────────────────────────────────────
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const fadeUp  = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } } }

// ── Hub card ─────────────────────────────────────────────────
function HubCard({ icon: Icon, label, description, path, color, badge, subItems, pulse }) {
  const navigate = useNavigate()
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={() => navigate(path)}
      className="relative rounded-2xl p-5 cursor-pointer group transition-all overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}0d 0%, ${color}05 100%)`,
        border: `1px solid ${color}22`,
      }}>

      {/* Glow top-left */}
      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }}/>

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={18} style={{ color }}/>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-[15px] font-bold text-white leading-tight">{label}</h3>
        {badge && (
          <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[12px] text-white/35 leading-relaxed mb-3">{description}</p>

      {/* Pulse score */}
      {pulse && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">PULSE</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pulse.score_total}%`, background: getScoreColor(pulse.score_total) }}/>
          </div>
          <span className="text-[13px] font-black" style={{ color: getScoreColor(pulse.score_total) }}>
            {pulse.score_total}%
          </span>
        </div>
      )}

      {/* Sub items */}
      {subItems && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {subItems.map(s => (
            <button key={s.label}
              onClick={e => { e.stopPropagation(); navigate(s.path) }}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}>
              <s.icon size={10}/>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* CTA arrow */}
      <div className="flex items-center gap-1 text-[11px] font-semibold transition-all"
        style={{ color: `${color}99` }}>
        <span>Accéder</span>
        <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform duration-200"/>
      </div>
    </motion.div>
  )
}

// ── Main Hub ─────────────────────────────────────────────────
export default function MonEspaceHub() {
  const { profile }        = useAuth()
  const { data: settings } = useAppSettings()
  const { data: todayScore } = useTodayScore()
  const modules             = settings?.modules || {}
  const pulseOn             = isPulseEnabled(settings)

  const firstName = profile?.first_name || 'vous'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const TRAVAIL_ITEMS = [
    { label: 'Tâches',   icon: CheckSquare,  path: '/travail/taches',    show: modules.tasks_enabled !== false },
    { label: 'Projets',  icon: FolderKanban, path: '/travail/projets',   show: modules.projects_enabled !== false },
    { label: 'Objectifs',icon: Target,       path: '/travail/objectifs', show: modules.okr_enabled !== false },
  ].filter(i => i.show)

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, rgba(79,70,229,0.04) 0%, transparent 200px)' }}>

      <div className="px-6 pt-8 pb-6">

        {/* Greeting */}
        <motion.div variants={fadeUp} className="mb-8">
          <p className="text-sm text-white/30 mb-1 font-medium">{greeting},</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight capitalize"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            {firstName}
          </h1>
          <p className="text-sm text-white/35 mt-1">Votre espace personnel — performance, développement et bien-être.</p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Ma Performance */}
          {pulseOn && (
            <HubCard
              icon={Activity} label="Ma Performance" color="#4F46E5"
              description="Scores PULSE, OKR, feedbacks reçus et suivi de performance."
              path="/ma-performance"
              pulse={todayScore || undefined}
              badge="PULSE actif"
            />
          )}

          {/* Mon Développement + Formation */}
          <HubCard
            icon={BookOpen} label="Mon Développement" color="#10B981"
            description="PDI, compétences, formations et certifications en un seul endroit."
            path="/mon-developpement"
            badge="Formation incluse"
          />

          {/* Compensation */}
          <HubCard
            icon={DollarSign} label="Ma Compensation" color="#34D399"
            description="Salaire, avantages, benchmark marché et historique de rémunération."
            path="/compensation"
          />

          {/* Récompenses & Engagement */}
          <HubCard
            icon={Trophy} label="Récompenses & Engagement" color="#C9A227"
            description="Badges, classements, IA Coach personnel et rapports d'engagement."
            path="/engagement"
            badge="IA Coach"
          />

          {/* Mon Travail */}
          <HubCard
            icon={CheckSquare} label="Mon Travail" color="#3B82F6"
            description="Tâches, projets et objectifs OKR assignés."
            path="/travail/taches"
            subItems={TRAVAIL_ITEMS}
          />

        </div>
      </div>
    </motion.div>
  )
}
