// ============================================================
// APEX RH — ProjectCard.jsx
// Session 11 — Carte projet dans la liste
// ============================================================
import { motion } from 'framer-motion'
import {
  Calendar, Users, Flag, MoreVertical, Pencil, Trash2,
  Milestone, FileCheck, AlertTriangle, DollarSign,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import {
  getProjectStatusInfo, getProjectPriorityInfo,
  formatDateFr, formatBudget, getProgressColor, getUserFullName,
} from '../../lib/projectHelpers'

export default function ProjectCard({ project, onEdit, onDelete, onViewDetail }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const statusInfo = getProjectStatusInfo(project.status)
  const priorityInfo = getProjectPriorityInfo(project.priority)
  const progressPct = project.progress || 0
  const progressColor = getProgressColor(progressPct)

  const msCount = project.milestones?.length || 0
  const delCount = project.deliverables?.length || 0
  const riskCount = project.risks?.length || 0
  const memberCount = project.project_members?.length || 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
      onClick={() => onViewDetail(project)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Colonne gauche */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Titre + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate max-w-[300px]">
              {project.name}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.bg} ${statusInfo.text}`}
            >
              {statusInfo.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityInfo.bg} ${priorityInfo.text}`}
            >
              {priorityInfo.label}
            </span>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-xs text-white/30 line-clamp-1">{project.description}</p>
          )}

          {/* Progression */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden max-w-[200px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full"
                style={{ background: progressColor }}
              />
            </div>
            <span className="text-[10px] font-bold" style={{ color: progressColor }}>
              {Math.round(progressPct)}%
            </span>
          </div>

          {/* Méta-infos */}
          <div className="flex items-center gap-4 text-[10px] text-white/25">
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {formatDateFr(project.start_date)} → {formatDateFr(project.end_date)}
              </span>
            )}
            {project.owner && (
              <span className="flex items-center gap-1">
                <Users size={10} />
                {getUserFullName(project.owner)}
              </span>
            )}
          </div>

          {/* Compteurs */}
          <div className="flex items-center gap-3 text-[10px] text-white/20">
            <span className="flex items-center gap-1" title="Membres">
              <Users size={10} /> {memberCount}
            </span>
            <span className="flex items-center gap-1" title="Jalons">
              <Milestone size={10} /> {msCount}
            </span>
            <span className="flex items-center gap-1" title="Livrables">
              <FileCheck size={10} /> {delCount}
            </span>
            {riskCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400/50" title="Risques">
                <AlertTriangle size={10} /> {riskCount}
              </span>
            )}
            {project.budget > 0 && (
              <span className="flex items-center gap-1" title="Budget">
                <DollarSign size={10} /> {formatBudget(project.budget)}
              </span>
            )}
          </div>
        </div>

        {/* Menu contextuel */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-40 py-1 rounded-xl bg-[#1a1a35] border border-white/10 shadow-xl z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(project) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Pencil size={12} /> Modifier
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(project) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <Trash2 size={12} /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
