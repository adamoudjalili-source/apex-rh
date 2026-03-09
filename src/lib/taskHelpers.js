// APEX RH — taskHelpers.js
import { ROLES } from '../utils/constants'
// Session 19 — Fix isOverdue() : exclut les tâches terminées
// Session 19 bis — Fix isDueSoon() : même logique, exclut les tâches terminées
// ============================================================

export const TASK_STATUS = {
  backlog:   { label: 'Backlog',    color: '#6B7280', bg: 'bg-gray-500/10',   text: 'text-gray-400',   border: 'border-gray-500/30',  dot: '#6B7280' },
  a_faire:   { label: 'À faire',    color: '#3B82F6', bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30',  dot: '#3B82F6' },
  en_cours:  { label: 'En cours',   color: '#F59E0B', bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30', dot: '#F59E0B' },
  en_revue:  { label: 'En revue',   color: '#8B5CF6', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30',dot: '#8B5CF6' },
  terminee:  { label: 'Terminée',   color: '#10B981', bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/30',dot: '#10B981' },
  bloquee:   { label: 'Bloquée',    color: '#EF4444', bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30',   dot: '#EF4444' },
}

export const TASK_PRIORITY = {
  basse:    { label: 'Basse',    color: '#6B7280', icon: '▼', textClass: 'text-gray-400' },
  normale:  { label: 'Normale',  color: '#3B82F6', icon: '●', textClass: 'text-blue-400' },
  haute:    { label: 'Haute',    color: '#F59E0B', icon: '▲', textClass: 'text-amber-400' },
  urgente:  { label: 'Urgente',  color: '#EF4444', icon: '⚡', textClass: 'text-red-400' },
}

export const STATUS_ORDER = ['backlog', TASK_STATUS.A_FAIRE, TASK_STATUS.EN_COURS, 'en_revue', 'terminee', 'bloquee']

export const KANBAN_COLUMNS = [
  { id: 'backlog',  label: 'Backlog',   icon: '○' },
  { id: TASK_STATUS.A_FAIRE,  label: 'À faire',   icon: '◎' },
  { id: TASK_STATUS.EN_COURS, label: 'En cours',  icon: '◉' },
  { id: 'en_revue', label: 'En revue',  icon: '◈' },
  { id: 'terminee', label: 'Terminée',  icon: '✓' },
  { id: 'bloquee',  label: 'Bloquée',   icon: '✕' },
]

export function getStatusInfo(status) {
  return TASK_STATUS[status] || TASK_STATUS.backlog
}

export function getPriorityInfo(priority) {
  return TASK_PRIORITY[priority] || TASK_PRIORITY.normale
}

export function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ✅ Session 19 — Ajout paramètre optionnel `status`
// Avant : une tâche terminée avec date passée était marquée "en retard" visuellement
// Maintenant : les tâches terminées ne sont jamais considérées en retard
export function isOverdue(dueDateStr, status = null) {
  if (!dueDateStr) return false
  if (status === 'terminee') return false
  return new Date(dueDateStr) < new Date()
}

// ✅ Session 19 bis — Même fix que isOverdue : exclut les tâches terminées
export function isDueSoon(dueDateStr, days = 3, status = null) {
  if (!dueDateStr) return false
  if (status === 'terminee') return false
  const due = new Date(dueDateStr)
  const now = new Date()
  const diff = (due - now) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= days
}

export function getChecklistProgress(checklists) {
  if (!checklists || checklists.length === 0) return null
  const allItems = checklists.flatMap(cl => cl.task_checklist_items || [])
  if (allItems.length === 0) return null
  const done = allItems.filter(i => i.is_done).length
  return { done, total: allItems.length, pct: Math.round((done / allItems.length) * 100) }
}

export function getUserFullName(user) {
  if (!user) return '—'
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return full || '—'
}

export function getUserInitials(user) {
  if (!user) return '?'
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
}

export function canValidateTask(task, currentUser) {
  if (!task || !currentUser) return false
  if (currentUser.role === ROLES.ADMINISTRATEUR) return true
  if (task.status !== 'en_revue') return false
  // Chef de service valide les tâches de son service
  if (currentUser.role === ROLES.CHEF_SERVICE && task.service_id === currentUser.service_id) return true
  // Chef de division valide les tâches de sa division
  if (currentUser.role === ROLES.CHEF_DIVISION && task.division_id === currentUser.division_id) return true
  // Directeur valide les tâches de sa direction
  if (currentUser.role === ROLES.DIRECTEUR && task.direction_id === currentUser.direction_id) return true
  return false
}

export function canEditTask(task, currentUser) {
  if (!task || !currentUser) return false
  if (currentUser.role === ROLES.ADMINISTRATEUR) return true
  if (task.created_by === currentUser.id) return true
  if (task.task_assignees?.some(a => a.user_id === currentUser.id)) return true
  if (currentUser.role === ROLES.CHEF_SERVICE && task.service_id === currentUser.service_id) return true
  if (currentUser.role === ROLES.CHEF_DIVISION && task.division_id === currentUser.division_id) return true
  if (currentUser.role === ROLES.DIRECTEUR && task.direction_id === currentUser.direction_id) return true
  return false
}

export function canDeleteTask(task, currentUser) {
  if (!task || !currentUser) return false
  if (currentUser.role === ROLES.ADMINISTRATEUR) return true
  return task.created_by === currentUser.id
}

export const ACTION_LABELS = {
  created: 'a créé la tâche',
  status_changed: 'a changé le statut',
  assigned: 'a assigné',
  unassigned: 'a retiré l\'assignation de',
  priority_changed: 'a changé la priorité',
  due_date_changed: 'a modifié la date d\'échéance',
  title_changed: 'a renommé la tâche',
  approved: 'a approuvé la tâche ✓',
  rejected: 'a refusé la tâche ✗',
  checklist_added: 'a ajouté une checklist',
  comment_added: 'a commenté',
}

// ─── TRANSITIONS DE STATUT AUTORISÉES ─────────────────────
// Retourne les statuts vers lesquels l'utilisateur peut déplacer la tâche
export function getAllowedStatuses(task, currentUser) {
  if (!task || !currentUser) return []
  const current = task.status
  const role = currentUser.role
  const allStatuses = Object.keys(TASK_STATUS)

  // Admin → tout est permis
  if (role === ROLES.ADMINISTRATEUR) return allStatuses.filter(s => s !== current)

  const isValidator = canValidateTask(task, currentUser)

  // Transitions selon le statut actuel
  switch (current) {
    case 'backlog':
      return [TASK_STATUS.A_FAIRE, TASK_STATUS.EN_COURS, 'bloquee']

    case TASK_STATUS.A_FAIRE:
      return ['backlog', TASK_STATUS.EN_COURS, 'bloquee']

    case TASK_STATUS.EN_COURS:
      // Tout le monde peut soumettre pour validation ou bloquer
      return ['backlog', TASK_STATUS.A_FAIRE, 'en_revue', 'bloquee']

    case 'en_revue':
      // Seul un validateur (chef) peut approuver ou rejeter
      if (isValidator) return [TASK_STATUS.EN_COURS, 'terminee']
      // Le collaborateur ne peut rien faire une fois soumis
      return []

    case 'terminee':
      // Seul un validateur ou admin peut réouvrir
      if (isValidator) return [TASK_STATUS.EN_COURS]
      return []

    case 'bloquee':
      return ['backlog', TASK_STATUS.A_FAIRE, TASK_STATUS.EN_COURS]

    default:
      return []
  }
}