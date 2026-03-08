// ============================================================
// APEX RH — ProjectDetailPanel.jsx
// Session 11 — Panneau détail projet avec onglets
// Session 16 fix — Chef de projet = membre avec rôle chef_projet (pas owner)
// Session 79 — +3 onglets : OKR / Budget / Jalons avancés
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Info, Calendar, Milestone, FileCheck, ShieldAlert,
  Users, Pencil, Trash2, DollarSign, TrendingUp, Target, Diamond,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useProject, useDeleteProject } from '../../hooks/useProjects'
import {
  getProjectStatusInfo, getProjectPriorityInfo, formatBudget,
  formatDateFr, getProgressColor, getUserFullName, daysRemaining,
  canEditProject, canDeleteProject, canManageMembers, canEditMilestones,
  canEditDeliverables, canEditRisks,
} from '../../lib/projectHelpers'

// Sous-composants existants
import MilestoneList from './MilestoneList'
import DeliverableList from './DeliverableList'
import RiskRegister from './RiskRegister'
import ProjectMembers from './ProjectMembers'
import GanttChart from './GanttChart'

// Sous-composants S79
import ProjectOKRLinker from './ProjectOKRLinker'
import ProjectBudgetPanel from './ProjectBudgetPanel'
import ProjectAdvancedMilestones from './ProjectAdvancedMilestones'

const TABS = [
  { id: 'overview', icon: Info, label: 'Aperçu' },
  { id: 'gantt', icon: Calendar, label: 'Gantt' },
  { id: 'milestones', icon: Milestone, label: 'Jalons' },
  { id: 'deliverables', icon: FileCheck, label: 'Livrables' },
  { id: 'risks', icon: ShieldAlert, label: 'Risques' },
  { id: 'team', icon: Users, label: 'Équipe' },
  // S79
  { id: 'okr', icon: Target, label: 'OKR' },
  { id: 'budget', icon: DollarSign, label: 'Budget' },
  { id: 'jalons', icon: Diamond, label: 'Jalons+' },
]

export default function ProjectDetailPanel({ projectId, onClose, onEdit }) {
  const { profile } = useAuth()
  const { data: project, isLoading, error } = useProject(projectId)
  const deleteProject = useDeleteProject()
  const [activeTab, setActiveTab] = useState('overview')

  if (!projectId) return null

  const handleDelete = async () => {
    if (!project) return
    if (!confirm(`Supprimer le projet "${project.name}" et tout son contenu ?`)) return
    try {
      await deleteProject.mutateAsync(project.id)
      onClose()
    } catch (err) { console.error(err) }
  }

  const members = project?.project_members || []
  const milestones = project?.milestones || []
  const deliverables = project?.deliverables || []
  const risks = project?.risks || []

  const userCanEdit = project ? canEditProject(project, profile) : false
  const userCanDelete = project ? canDeleteProject(project, profile) : false
  const userCanManageMembers = project ? canManageMembers(project, profile, members) : false
  const userCanEditMs = project ? canEditMilestones(project, profile, members) : false
  const userCanEditDel = project ? canEditDeliverables(project, profile, members) : false
  const userCanEditRisk = project ? canEditRisks(project, profile, members) : false

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={onClose}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-3xl h-full overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #0F0F23 0%, #0A0A1E 100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-64 text-white/30 text-sm">
              Chargement…
            </div>
          )}

          {error && (
            <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              Erreur : {error.message}
            </div>
          )}

          {project && (
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getProjectStatusInfo(project.status).bg} ${getProjectStatusInfo(project.status).text}`}>
                      {getProjectStatusInfo(project.status).icon} {getProjectStatusInfo(project.status).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getProjectPriorityInfo(project.priority).bg} ${getProjectPriorityInfo(project.priority).text}`}>
                      {getProjectPriorityInfo(project.priority).label}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className="text-xs text-white/30 mt-1">{project.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {userCanEdit && (
                    <button
                      onClick={() => onEdit(project)}
                      className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {userCanDelete && (
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-3">
                <QuickStat
                  icon={TrendingUp}
                  label="Progression"
                  value={`${Math.round(project.progress || 0)}%`}
                  color={getProgressColor(project.progress || 0)}
                />
                <QuickStat
                  icon={DollarSign}
                  label="Budget"
                  value={formatBudget(project.budget)}
                  color="#C9A227"
                />
                <QuickStat
                  icon={Users}
                  label="Membres"
                  value={members.length}
                  color="#3B82F6"
                />
                <QuickStat
                  icon={Calendar}
                  label="Jours restants"
                  value={daysRemaining(project.end_date) ?? '—'}
                  color={daysRemaining(project.end_date) < 0 ? '#EF4444' : '#10B981'}
                />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                    {tab.id === 'milestones' && milestones.length > 0 && (
                      <span className="text-[9px] text-white/20 ml-0.5">{milestones.length}</span>
                    )}
                    {tab.id === 'risks' && risks.length > 0 && (
                      <span className="text-[9px] text-amber-400/50 ml-0.5">{risks.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="min-h-[300px]">
                {activeTab === 'overview' && (
                  <OverviewTab project={project} members={members} milestones={milestones} />
                )}
                {activeTab === 'gantt' && (
                  <GanttChart project={project} milestones={milestones} canEdit={userCanEdit} />
                )}
                {activeTab === 'milestones' && (
                  <MilestoneList milestones={milestones} projectId={project.id} canEdit={userCanEditMs} />
                )}
                {activeTab === 'deliverables' && (
                  <DeliverableList
                    deliverables={deliverables}
                    milestones={milestones}
                    members={members}
                    projectId={project.id}
                    canEdit={userCanEditDel}
                  />
                )}
                {activeTab === 'risks' && (
                  <RiskRegister risks={risks} members={members} projectId={project.id} canEdit={userCanEditRisk} />
                )}
                {activeTab === 'team' && (
                  <ProjectMembers members={members} projectId={project.id} canManage={userCanManageMembers} />
                )}
                {/* S79 — nouveaux onglets */}
                {activeTab === 'okr' && (
                  <div className="p-1">
                    <ProjectOKRLinker projectId={project.id} canEdit={userCanEdit} />
                  </div>
                )}
                {activeTab === 'budget' && (
                  <div className="p-1">
                    <ProjectBudgetPanel projectId={project.id} canEdit={userCanEdit} />
                  </div>
                )}
                {activeTab === 'jalons' && (
                  <div className="p-1">
                    <ProjectAdvancedMilestones projectId={project.id} canEdit={userCanEditMs} />
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Quick stat ──────────────────────────────────────────────
function QuickStat({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} style={{ color }} />
        <span className="text-[10px] text-white/25">{label}</span>
      </div>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

// ─── Overview tab ────────────────────────────────────────────
function OverviewTab({ project, members, milestones }) {
  const progressPct = project.progress || 0
  const progressColor = getProgressColor(progressPct)
  const msDone = milestones.filter((m) => m.status === 'atteint').length
  const msTotal = milestones.length

  // Chercher le membre avec le rôle chef_projet, sinon fallback sur le owner
  const chefProjet = members.find((m) => m.role === 'chef_projet')
  const chefProjetName = chefProjet
    ? getUserFullName(chefProjet.user)
    : getUserFullName(project.owner)

  return (
    <div className="space-y-5">
      {/* Barre de progression */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Progression globale</span>
          <span className="text-sm font-bold" style={{ color: progressColor }}>
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: progressColor }}
          />
        </div>
        <p className="text-[10px] text-white/20">
          {msDone}/{msTotal} jalons terminés
        </p>
      </div>

      {/* Infos projet */}
      <div className="grid grid-cols-2 gap-4">
        <InfoRow label="Chef de projet" value={chefProjetName} />
        <InfoRow label="Dates" value={`${formatDateFr(project.start_date)} → ${formatDateFr(project.end_date)}`} />
        <InfoRow label="Budget" value={formatBudget(project.budget)} />
        <InfoRow label="Coût réel" value={formatBudget(project.budget_spent)} />
        <InfoRow label="Direction" value={project.directions?.name || '—'} />
        <InfoRow label="Division" value={project.divisions?.name || '—'} />
        <InfoRow label="Service" value={project.services?.name || '—'} />
        <InfoRow label="Membres" value={`${members.length} personnes`} />
      </div>

      {/* Budget chart simple */}
      {project.budget > 0 && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
          <h4 className="text-xs font-semibold text-white/60 flex items-center gap-2">
            <DollarSign size={12} className="text-amber-400" />
            Suivi budgétaire
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(((project.budget_spent || 0) / project.budget) * 100, 100)}%`,
                  background: (project.budget_spent || 0) > project.budget ? '#EF4444' : '#C9A227',
                }}
              />
            </div>
            <span className="text-[10px] text-white/30">
              {formatBudget(project.budget_spent)} / {formatBudget(project.budget)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-white/25 mb-0.5">{label}</p>
      <p className="text-xs text-white/60">{value}</p>
    </div>
  )
}