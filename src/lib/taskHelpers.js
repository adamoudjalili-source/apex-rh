// APEX RH — taskHelpers.js
// ✅ Session 19   — Fix isOverdue() : exclut les tâches terminées
// ✅ Session 19b  — Fix isDueSoon() : même logique
// ✅ Session 125  — 8 statuts + 7 colonnes Kanban
// ✅ Session 127  — getSLAStatus() + SLA_HOURS par priorité
// ============================================================
import { ROLES } from '../utils/constants'

export const TASK_STATUS = {
  backlog:    { label: 'Backlog',     color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-400',   border: 'border-gray-500/30',   dot: '#6B7280' },
  a_faire:    { label: 'À faire',     color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-400',   border: 'border-blue-500/30',   dot: '#3B82F6' },
  en_cours:   { label: 'En cours',    color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-400',  border: 'border-amber-500/30',  dot: '#F59E0B' },
  en_attente: { label: 'En attente',  color: '#F97316', bg: 'bg-orange-500/10',  text: 'text-orange-400', border: 'border-orange-500/30', dot: '#F97316' },
  en_revue:   { label: 'En revue',    color: '#8B5CF6', bg: 'bg-violet-500/10',  text: 'text-violet-400', border: 'border-violet-500/30', dot: '#8B5CF6' },
  terminee:   { label: 'Terminée',    color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400',border: 'border-emerald-500/30',dot: '#10B981' },
  bloquee:    { label: 'Bloquée',     color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-400',    border: 'border-red-500/30',    dot: '#EF4444' },
  annule:     { label: 'Annulé',      color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-500',   border: 'border-gray-500/20',   dot: '#6B7280' },
}

export const TASK_PRIORITY = {
  basse:   { label: 'Basse',   color: '#6B7280', icon: '▼', textClass: 'text-gray-400' },
  normale: { label: 'Normale', color: '#3B82F6', icon: '●', textClass: 'text-blue-400' },
  haute:   { label: 'Haute',   color: '#F59E0B', icon: '▲', textClass: 'text-amber-400' },
  urgente: { label: 'Urgente', color: '#EF4444', icon: '⚡', textClass: 'text-red-400' },
}

export const STATUS_ORDER = ['backlog','a_faire','en_cours','en_attente','en_revue','terminee','bloquee','annule']

export const KANBAN_COLUMNS = [
  { id: 'backlog',    label: 'Backlog',    icon: '○', accent: 'border-gray-500/30'   },
  { id: 'a_faire',   label: 'À faire',    icon: '◎', accent: 'border-blue-500/40'   },
  { id: 'en_cours',  label: 'En cours',   icon: '◉', accent: 'border-amber-500/40'  },
  { id: 'en_attente',label: 'En attente', icon: '⏸', accent: 'border-orange-500/40' },
  { id: 'en_revue',  label: 'En revue',   icon: '◈', accent: 'border-violet-500/40' },
  { id: 'terminee',  label: 'Terminée',   icon: '✓', accent: 'border-emerald-500/40'},
  { id: 'bloquee',   label: 'Bloquée',    icon: '✕', accent: 'border-red-500/40'    },
  // Annulé exclu du Kanban — visible liste/filtres uniquement
]

// ─── SLA par priorité (en heures) ──────────────────────────
// S127 : SLA applicables aux tâches actives uniquement
export const SLA_HOURS = {
  urgente: 24,
  haute:   72,
  normale: 168, // 7 jours
  basse:   null, // Pas de SLA
}

/**
 * getSLAStatus(task)
 * Retourne null si pas de SLA applicable, sinon :
 * { status: 'ok'|'warning'|'breach', pct: number, label: string, hoursLeft: number }
 */
export function getSLAStatus(task) {
  if (!task?.created_at) return null
  const slaHours = SLA_HOURS[task.priority]
  if (!slaHours) return null
  if (['terminee', 'annule'].includes(task.status)) return null

  const createdAt    = new Date(task.created_at)
  const now          = new Date()
  const elapsedHours = (now - createdAt) / (1000 * 60 * 60)
  const pct          = Math.min(100, Math.round((elapsedHours / slaHours) * 100))
  const hoursLeft    = Math.max(0, Math.round(slaHours - elapsedHours))

  if (elapsedHours > slaHours)
    return { status: 'breach',  pct: 100, label: 'SLA dépassé',   hoursLeft: 0 }
  if (elapsedHours > slaHours * 0.75)
    return { status: 'warning', pct,      label: `SLA : ${hoursLeft}h`,  hoursLeft }
  return   { status: 'ok',     pct,      label: `SLA : ${hoursLeft}h`,  hoursLeft }
}

// ─── Helpers de base ───────────────────────────────────────
export function getStatusInfo(status)   { return TASK_STATUS[status]   || TASK_STATUS.backlog  }
export function getPriorityInfo(priority){ return TASK_PRIORITY[priority]|| TASK_PRIORITY.normale }

export function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function formatDateShort(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function isOverdue(dueDateStr, status = null) {
  if (!dueDateStr) return false
  if (status === 'terminee') return false
  return new Date(dueDateStr) < new Date()
}

export function isDueSoon(dueDateStr, days = 3, status = null) {
  if (!dueDateStr) return false
  if (status === 'terminee') return false
  const due  = new Date(dueDateStr)
  const now  = new Date()
  const diff = (due - now) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= days
}

export function getChecklistProgress(checklists) {
  if (!checklists?.length) return null
  const allItems = checklists.flatMap(cl => cl.task_checklist_items || [])
  if (!allItems.length) return null
  const done = allItems.filter(i => i.is_done).length
  return { done, total: allItems.length, pct: Math.round((done / allItems.length) * 100) }
}

export function getUserFullName(user) {
  if (!user) return '—'
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'
}
export function getUserInitials(user) {
  if (!user) return '?'
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
}

// ─── Permissions ───────────────────────────────────────────
export function canValidateTask(task, currentUser) {
  if (!task || !currentUser) return false
  if (currentUser.role === ROLES.ADMINISTRATEUR) return true
  if (task.status !== 'en_revue') return false
  if (currentUser.role === ROLES.CHEF_SERVICE   && task.service_id  === currentUser.service_id)   return true
  if (currentUser.role === ROLES.CHEF_DIVISION  && task.division_id === currentUser.division_id)  return true
  if (currentUser.role === ROLES.DIRECTEUR      && task.direction_id=== currentUser.direction_id) return true
  return false
}
export function canEditTask(task, currentUser) {
  if (!task || !currentUser) return false
  if (currentUser.role === ROLES.ADMINISTRATEUR) return true
  if (task.created_by === currentUser.id) return true
  if (task.task_assignees?.some(a => a.user_id === currentUser.id)) return true
  if (currentUser.role === ROLES.CHEF_SERVICE   && task.service_id  === currentUser.service_id)   return true
  if (currentUser.role === ROLES.CHEF_DIVISION  && task.division_id === currentUser.division_id)  return true
  if (currentUser.role === ROLES.DIRECTEUR      && task.direction_id=== currentUser.direction_id) return true
  return false
}
export function canDeleteTask(task, currentUser) {
  if (!task || !currentUser) return false
  if (currentUser.role === ROLES.ADMINISTRATEUR) return true
  return task.created_by === currentUser.id
}

export const ACTION_LABELS = {
  created:        'a créé la tâche',
  status_changed: 'a changé le statut',
  assigned:       'a assigné',
  unassigned:     "a retiré l'assignation de",
  priority_changed:'a changé la priorité',
  due_date_changed:"a modifié la date d'échéance",
  title_changed:  'a renommé la tâche',
  approved:       'a approuvé la tâche ✓',
  rejected:       'a refusé la tâche ✗',
  checklist_added:'a ajouté une checklist',
  comment_added:  'a commenté',
}

export function getAllowedStatuses(task, currentUser) {
  if (!task || !currentUser) return []
  const current = task.status
  const role    = currentUser.role
  if (role === ROLES.ADMINISTRATEUR) return Object.keys(TASK_STATUS).filter(s => s !== current)
  const isValidator = canValidateTask(task, currentUser)
  switch (current) {
    case 'backlog':    return ['a_faire', 'en_cours', 'bloquee']
    case 'a_faire':   return ['backlog',  'en_cours', 'bloquee']
    case 'en_cours':  return ['backlog',  'a_faire',  'en_revue', 'bloquee', 'en_attente']
    case 'en_attente':return ['en_cours', 'bloquee']
    case 'en_revue':  return isValidator ? ['en_cours', 'terminee'] : []
    case 'terminee':  return isValidator ? ['en_cours'] : []
    case 'bloquee':   return ['backlog',  'a_faire',  'en_cours']
    default:          return []
  }
}
