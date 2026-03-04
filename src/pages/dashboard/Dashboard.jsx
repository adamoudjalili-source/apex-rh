// ============================================================
// APEX RH — Dashboard.jsx
// ✅ Session 12 — Dashboard dynamique pour 5 profils
// ✅ Session 18 — Fix animation Vue d'ensemble + fix police nom
// ✅ Session 24 — Widget PulseSnapshot (Phase F) — conditionnel isPulseEnabled
// Stats temps réel, graphiques, activité récente
// ============================================================
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare,
  Target,
  FolderKanban,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  ArrowRight,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useTaskStats,
  useOkrStats,
  useProjectStats,
  useRecentActivity,
  useTeamStats,
} from '../../hooks/useDashboard'
import { useAppSettings } from '../../hooks/useSettings'
import { isPulseEnabled } from '../../lib/pulseHelpers'

// Components
import StatCard from '../../components/dashboard/StatCard'
import TasksOverview from '../../components/dashboard/TasksOverview'
import OkrOverview from '../../components/dashboard/OkrOverview'
import ProjectsOverview from '../../components/dashboard/ProjectsOverview'
import RecentActivity from '../../components/dashboard/RecentActivity'
import TeamOverview from '../../components/dashboard/TeamOverview'
// ✅ Session 24 — Widget PULSE
import PulseSnapshot from '../../components/pulse/PulseSnapshot'

// ─── CONSTANTES ──────────────────────────────────────────────
const ROLE_LABELS = {
  administrateur: 'Administrateur',
  directeur: 'Directeur',
  chef_division: 'Chef de Division',
  chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}

const ROLE_COLORS = {
  administrateur: '#EF4444',
  directeur: '#C9A227',
  chef_division: '#8B5CF6',
  chef_service: '#3B82F6',
  collaborateur: '#10B981',
}

const ROLE_DESCRIPTIONS = {
  administrateur: 'Vision globale de la plateforme',
  directeur: 'Pilotage stratégique de votre Direction',
  chef_division: 'Performance de votre Division',
  chef_service: 'Suivi opérationnel de votre Service',
  collaborateur: 'Votre espace de travail personnel',
}

// ─── ANIMATIONS ──────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
}

// ✅ Session 18 — Wrapper autonome pour animer chaque widget indépendamment
function FadeIn({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function Dashboard() {
  const { profile, role, isAdmin } = useAuth()
  const navigate = useNavigate()

  // Hooks de données
  const taskStats = useTaskStats()
  const okrStats = useOkrStats()
  const projectStats = useProjectStats()
  const recentActivity = useRecentActivity()
  const teamStats = useTeamStats()

  // ✅ Session 24 — PULSE : guard conditionnel
  const { data: settings } = useAppSettings()
  const pulseEnabled = isPulseEnabled(settings)

  // Salutation
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const fullName = profile?.first_name || profile?.last_name
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : 'Utilisateur'

  // Score de performance global
  const perfScore = okrStats.data?.avgScore
    ? `${(okrStats.data.avgScore * 100).toFixed(0)}%`
    : '—'

  return (
    <motion.div
      className="p-6 md:p-8 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ═══════ BANDEAU DE BIENVENUE ═══════ */}
      <motion.div
        variants={itemVariants}
        className="relative rounded-2xl overflow-hidden mb-8 p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.08) 50%, rgba(201,162,39,0.04) 100%)',
          border: '1px solid rgba(79,70,229,0.15)',
        }}
      >
        {/* Effets décoratifs */}
        <div
          className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-32 h-32 opacity-5 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C9A227 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-white/40 text-sm mb-1">{greeting},</p>
            <h2
              className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-wide"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {fullName}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${ROLE_COLORS[role] || '#4F46E5'}20`,
                  color: ROLE_COLORS[role] || '#4F46E5',
                  border: `1px solid ${ROLE_COLORS[role] || '#4F46E5'}40`,
                }}
              >
                <Zap size={10} />
                {ROLE_LABELS[role] || role}
              </span>
              <span className="text-[11px] text-white/25">
                {ROLE_DESCRIPTIONS[role] || ''}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Clock size={12} />
              <span>
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Alertes rapides */}
            {taskStats.data?.overdue > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-500/15 transition-colors"
                onClick={() => navigate('/tasks')}
              >
                <AlertTriangle size={10} />
                {taskStats.data.overdue} tâche{taskStats.data.overdue > 1 ? 's' : ''} en retard
                <ArrowRight size={9} />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══════ STATS RAPIDES ═══════ */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Tâches actives"
          value={taskStats.data?.active ?? '—'}
          icon={CheckSquare}
          color="#3B82F6"
          subtitle={taskStats.data?.inProgress ? `${taskStats.data.inProgress} en cours` : null}
        />
        <StatCard
          label="Objectifs en cours"
          value={okrStats.data?.byStatus?.actif ?? '—'}
          icon={Target}
          color="#C9A227"
          subtitle={okrStats.data?.periodName || null}
        />
        <StatCard
          label="Projets actifs"
          value={projectStats.data?.active ?? '—'}
          icon={FolderKanban}
          color="#8B5CF6"
          subtitle={projectStats.data?.completed ? `${projectStats.data.completed} terminé${projectStats.data.completed > 1 ? 's' : ''}` : null}
        />
        <StatCard
          label="Score performance"
          value={perfScore}
          icon={TrendingUp}
          color="#10B981"
          subtitle="Score OKR moyen"
        />
      </motion.div>

      {/* ═══════ ACCÈS RAPIDE AUX MODULES ═══════ */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-xs font-bold text-white/30 uppercase tracking-widest"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Accès rapide
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <QuickAccessCard
            label="Tâches"
            icon={CheckSquare}
            color="#3B82F6"
            count={taskStats.data?.dueToday}
            countLabel="aujourd'hui"
            onClick={() => navigate('/tasks')}
          />
          <QuickAccessCard
            label="Objectifs"
            icon={Target}
            color="#C9A227"
            count={okrStats.data?.total}
            countLabel="objectifs"
            onClick={() => navigate('/objectives')}
          />
          <QuickAccessCard
            label="Projets"
            icon={FolderKanban}
            color="#8B5CF6"
            count={projectStats.data?.active}
            countLabel="actifs"
            onClick={() => navigate('/projects')}
          />
        </div>
      </motion.div>

      {/* ═══════ CONTENU PRINCIPAL (adapté au rôle) ═══════ */}
      <motion.div variants={itemVariants}>
        <h3
          className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <BarChart3 size={11} className="inline mr-1.5 -mt-0.5" />
          Vue d'ensemble
        </h3>
      </motion.div>

      {/* Layout adapté : 2 colonnes collaborateur, 3 colonnes managers */}
      {role === 'collaborateur' ? (
        <CollaborateurLayout
          taskStats={taskStats}
          okrStats={okrStats}
          projectStats={projectStats}
          recentActivity={recentActivity}
          pulseEnabled={pulseEnabled}
        />
      ) : (
        <ManagerLayout
          taskStats={taskStats}
          okrStats={okrStats}
          projectStats={projectStats}
          recentActivity={recentActivity}
          teamStats={teamStats}
          isAdmin={isAdmin}
          pulseEnabled={pulseEnabled}
        />
      )}

      {/* ═══════ FOOTER ═══════ */}
      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-8">
        <div className="h-px flex-1 bg-white/5" />
        <p className="text-[10px] text-white/10 px-4 whitespace-nowrap">
          APEX RH · Performance Platform · v1.0
        </p>
        <div className="h-px flex-1 bg-white/5" />
      </motion.div>
    </motion.div>
  )
}

// ─── LAYOUT COLLABORATEUR (2 colonnes) ───────────────────────
function CollaborateurLayout({ taskStats, okrStats, projectStats, recentActivity, pulseEnabled }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="space-y-6">
        <FadeIn delay={0.1}>
          <TasksOverview stats={taskStats.data} isLoading={taskStats.isLoading} />
        </FadeIn>
        <FadeIn delay={0.2}>
          <OkrOverview stats={okrStats.data} isLoading={okrStats.isLoading} />
        </FadeIn>
      </div>
      <div className="space-y-6">
        <FadeIn delay={0.15}>
          <ProjectsOverview stats={projectStats.data} isLoading={projectStats.isLoading} />
        </FadeIn>
        {/* ✅ Session 24 — Widget PULSE conditionnel */}
        {pulseEnabled && (
          <FadeIn delay={0.22}>
            <PulseSnapshot />
          </FadeIn>
        )}
        <FadeIn delay={0.25}>
          <RecentActivity data={recentActivity.data} isLoading={recentActivity.isLoading} />
        </FadeIn>
      </div>
    </div>
  )
}

// ─── LAYOUT MANAGER (3 colonnes) ─────────────────────────────
function ManagerLayout({ taskStats, okrStats, projectStats, recentActivity, teamStats, isAdmin, pulseEnabled }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Colonne gauche */}
      <div className="space-y-6">
        <FadeIn delay={0.1}>
          <TasksOverview stats={taskStats.data} isLoading={taskStats.isLoading} />
        </FadeIn>
        <FadeIn delay={0.25}>
          <TeamOverview stats={teamStats.data} isLoading={teamStats.isLoading} isAdmin={isAdmin} />
        </FadeIn>
      </div>

      {/* Colonne centre */}
      <div className="space-y-6">
        <FadeIn delay={0.15}>
          <OkrOverview stats={okrStats.data} isLoading={okrStats.isLoading} />
        </FadeIn>
        <FadeIn delay={0.3}>
          <ProjectsOverview stats={projectStats.data} isLoading={projectStats.isLoading} />
        </FadeIn>
      </div>

      {/* Colonne droite */}
      <div className="space-y-6">
        {/* ✅ Session 24 — Widget PULSE conditionnel */}
        {pulseEnabled && (
          <FadeIn delay={0.18}>
            <PulseSnapshot />
          </FadeIn>
        )}
        <FadeIn delay={0.2}>
          <RecentActivity data={recentActivity.data} isLoading={recentActivity.isLoading} />
        </FadeIn>
      </div>
    </div>
  )
}

// ─── CARTE ACCÈS RAPIDE ──────────────────────────────────────
function QuickAccessCard({ label, icon: Icon, color, count, countLabel, onClick }) {
  return (
    <motion.div
      className="rounded-xl p-4 cursor-pointer group relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)` }}
      />

      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}20` }}
        >
          <Icon size={15} style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">{label}</p>
          {count !== undefined && count !== null && (
            <p className="text-[10px] text-white/30">
              <span className="font-bold text-white/50">{count}</span> {countLabel}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
