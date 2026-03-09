// ============================================================
import { ROLES } from '../utils/constants'
// APEX RH — projectHelpers.js
// Session 11 — Constantes, helpers, permissions Projets
// Session 16 fix — canEditProject/canDeleteProject vérifient
// aussi le rôle chef_projet dans project_members
// Session 19 — getUserFullName aligné sur taskHelpers (retourne '—' au lieu de 'Inconnu'/'Sans nom')
// ⚠️ Les valeurs DOIVENT correspondre aux ENUMs Supabase
// ============================================================

export const PROJECT_STATUS = {
  planifie:  { label: 'Planifié',  color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-400',    icon: '📋' },
  en_cours:  { label: 'En cours',  color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-400',    icon: '🚀' },
  en_pause:  { label: 'En pause',  color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-400',   icon: '⏸' },
  termine:   { label: 'Terminé',   color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✅' },
  annule:    { label: 'Annulé',    color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-400',     icon: '❌' },
}

export const PROJECT_PRIORITY = {
  basse:    { label: 'Basse',    color: '#6B7280', bg: 'bg-gray-500/10',   text: 'text-gray-400' },
  moyenne:  { label: 'Moyenne',  color: '#3B82F6', bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  haute:    { label: 'Haute',    color: '#F59E0B', bg: 'bg-amber-500/10',  text: 'text-amber-400' },
  critique: { label: 'Critique', color: '#EF4444', bg: 'bg-red-500/10',    text: 'text-red-400' },
}

// ⚠️ Valeurs alignées sur ENUM milestone_status : en_attente, en_cours, atteint, en_retard
export const MILESTONE_STATUS = {
  en_attente: { label: 'En attente', color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-400' },
  en_cours:   { label: 'En cours',   color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  atteint:    { label: 'Atteint',    color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  en_retard:  { label: 'En retard',  color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-400' },
}

// ⚠️ Valeurs alignées sur ENUM deliverable_status : a_faire, en_cours, soumis, valide, rejete
export const DELIVERABLE_STATUS = {
  a_faire:  { label: 'À faire',  color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-400' },
  en_cours: { label: 'En cours', color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  soumis:   { label: 'Soumis',   color: '#8B5CF6', bg: 'bg-violet-500/10',  text: 'text-violet-400' },
  valide:   { label: 'Validé',   color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  rejete:   { label: 'Rejeté',   color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-400' },
}

// ⚠️ Valeurs alignées sur ENUM risk_level : faible, moyen, eleve, critique
export const RISK_LEVEL = {
  faible:   { label: 'Faible',   color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', score: 1 },
  moyen:    { label: 'Moyen',    color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-400',   score: 2 },
  eleve:    { label: 'Élevé',    color: '#F97316', bg: 'bg-orange-500/10',  text: 'text-orange-400',  score: 3 },
  critique: { label: 'Critique', color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-400',     score: 4 },
}

// ⚠️ Valeurs alignées sur ENUM risk_status : identifie, en_cours, resolu, accepte
export const RISK_STATUS = {
  identifie: { label: 'Identifié', color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  en_cours:  { label: 'En cours',  color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  resolu:    { label: 'Résolu',    color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  accepte:   { label: 'Accepté',   color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-400' },
}

// ⚠️ Valeurs alignées sur ENUM project_member_role : chef_projet, membre, observateur
export const MEMBER_ROLE = {
  chef_projet:  { label: 'Chef de projet', color: '#C9A227', text: 'text-amber-400' },
  membre:       { label: 'Membre',         color: '#3B82F6', text: 'text-blue-400' },
  observateur:  { label: 'Observateur',    color: '#6B7280', text: 'text-gray-400' },
}

// ─── GETTERS ─────────────────────────────────────────────
export function getProjectStatusInfo(s)   { return PROJECT_STATUS[s] || PROJECT_STATUS.planifie }
export function getProjectPriorityInfo(p) { return PROJECT_PRIORITY[p] || PROJECT_PRIORITY.moyenne }
export function getMilestoneStatusInfo(s)  { return MILESTONE_STATUS[s] || MILESTONE_STATUS.en_attente }
export function getDeliverableStatusInfo(s){ return DELIVERABLE_STATUS[s] || DELIVERABLE_STATUS.a_faire }
export function getRiskLevelInfo(l)        { return RISK_LEVEL[l] || RISK_LEVEL.moyen }
export function getRiskStatusInfo(s)       { return RISK_STATUS[s] || RISK_STATUS.identifie }
export function getMemberRoleInfo(r)       { return MEMBER_ROLE[r] || MEMBER_ROLE.membre }

// ─── HELPERS ─────────────────────────────────────────────
export function formatDateFr(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function formatBudget(amount) {
  if (amount == null || amount === 0) return '—'
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`
}

export function getProgressColor(pct) {
  if (pct >= 75) return '#10B981'
  if (pct >= 40) return '#F59E0B'
  if (pct > 0) return '#F97316'
  return '#6B7280'
}

export function getRiskScore(probability, impact) {
  const pScore = RISK_LEVEL[probability]?.score || 2
  const iScore = RISK_LEVEL[impact]?.score || 2
  return pScore * iScore
}

export function getRiskScoreColor(score) {
  if (score >= 12) return '#EF4444'
  if (score >= 6) return '#F97316'
  if (score >= 3) return '#F59E0B'
  return '#10B981'
}

export function daysRemaining(endDate) {
  if (!endDate) return null
  return Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
}

export function getDaysLabel(days) {
  if (days === null) return ''
  if (days < 0) return `${Math.abs(days)}j de retard`
  if (days === 0) return "Aujourd'hui"
  return `${days}j restants`
}

export function daysBetween(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24))
}

// ✅ Session 19 — Aligné sur taskHelpers : retourne '—' partout (au lieu de 'Inconnu'/'Sans nom')
export function getUserFullName(user) {
  if (!user) return '—'
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return full || '—'
}

// ─── HELPER INTERNE : est chef_projet dans les membres ──
function isChefProjet(project, profile) {
  const members = project?.project_members || []
  const myMembership = members.find((m) => m.user_id === profile.id)
  return myMembership?.role === 'chef_projet'
}

// ─── PERMISSIONS ─────────────────────────────────────────
// Session 16 fix : le chef_projet (membre) peut aussi éditer/supprimer
export function canEditProject(project, profile) {
  if (!project || !profile) return false
  if (profile.role === ROLES.ADMINISTRATEUR) return true
  if (project.owner_id === profile.id) return true
  if (isChefProjet(project, profile)) return true
  return false
}

export function canDeleteProject(project, profile) {
  if (!project || !profile) return false
  if (profile.role === ROLES.ADMINISTRATEUR) return true
  if (project.owner_id === profile.id) return true
  if (isChefProjet(project, profile)) return true
  return false
}

export function canManageMembers(project, profile, members = []) {
  if (!project || !profile) return false
  if (profile.role === ROLES.ADMINISTRATEUR) return true
  if (project.owner_id === profile.id) return true
  const allMembers = members.length > 0 ? members : (project?.project_members || [])
  const myMembership = allMembers.find((m) => m.user_id === profile.id)
  return myMembership?.role === 'chef_projet'
}

export function canEditMilestones(project, profile, members = []) {
  return canManageMembers(project, profile, members)
}

export function canEditDeliverables(project, profile, members = []) {
  if (!project || !profile) return false
  if (canManageMembers(project, profile, members)) return true
  const allMembers = members.length > 0 ? members : (project?.project_members || [])
  const myMembership = allMembers.find((m) => m.user_id === profile.id)
  return myMembership?.role === 'membre'
}

export function canEditRisks(project, profile, members = []) {
  return canEditDeliverables(project, profile, members)
}