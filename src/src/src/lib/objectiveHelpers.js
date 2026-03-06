// ============================================================
// APEX RH — objectiveHelpers.js
// Session 10 — Constantes, helpers, permissions OKR
// Session 16 — Fix canEditObjective + canDeleteObjective pour managers
// Session 16 — Calibration N+2 hierarchique
// ============================================================

export const OBJECTIVE_LEVELS = {
  strategique: {
    label: 'Strategique', color: '#C9A227', bg: 'bg-amber-500/10',
    text: 'text-amber-400', border: 'border-amber-500/30', icon: '🎯',
  },
  division: {
    label: 'Division', color: '#8B5CF6', bg: 'bg-violet-500/10',
    text: 'text-violet-400', border: 'border-violet-500/30', icon: '◈',
  },
  service: {
    label: 'Service', color: '#3B82F6', bg: 'bg-blue-500/10',
    text: 'text-blue-400', border: 'border-blue-500/30', icon: '◉',
  },
  individuel: {
    label: 'Individuel', color: '#10B981', bg: 'bg-emerald-500/10',
    text: 'text-emerald-400', border: 'border-emerald-500/30', icon: '○',
  },
}

export const LEVEL_ORDER = ['strategique', 'division', 'service', 'individuel']

export const OBJECTIVE_STATUS = {
  brouillon:     { label: 'Brouillon',      color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-400' },
  actif:         { label: 'Actif',           color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  en_evaluation: { label: 'En evaluation',  color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  valide:        { label: 'Valide',          color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  archive:       { label: 'Archive',         color: '#6B7280', bg: 'bg-gray-500/10',    text: 'text-gray-500' },
}

export const EVALUATION_STATUS = {
  non_evalue:      { label: 'Non evalue',       color: '#6B7280', step: 0 },
  auto_evaluation: { label: 'Auto-evaluation',  color: '#F59E0B', step: 1 },
  validation_n1:   { label: 'Validation N+1',   color: '#8B5CF6', step: 2 },
  calibration_rh:  { label: 'Calibration N+2',  color: '#3B82F6', step: 3 },
  finalise:        { label: 'Finalise',          color: '#10B981', step: 4 },
}

export const KR_TYPES = {
  number:     { label: 'Numerique',   icon: '#', placeholder: 'ex: 50 clients' },
  percentage: { label: 'Pourcentage', icon: '%', placeholder: 'ex: 80%' },
  binary:     { label: 'Oui / Non',   icon: '✓', placeholder: 'Fait ou non fait' },
  currency:   { label: 'Monetaire',   icon: '₣', placeholder: 'ex: 5 000 000 FCFA' },
}

export const KR_STATUS = {
  en_cours:    { label: 'En cours',    color: '#3B82F6', text: 'text-blue-400' },
  atteint:     { label: 'Atteint',     color: '#10B981', text: 'text-emerald-400' },
  non_atteint: { label: 'Non atteint', color: '#EF4444', text: 'text-red-400' },
  abandonne:   { label: 'Abandonne',   color: '#6B7280', text: 'text-gray-400' },
}

// --- HELPERS ---

export function getLevelInfo(level) {
  return OBJECTIVE_LEVELS[level] || OBJECTIVE_LEVELS.individuel
}
export function getObjStatusInfo(status) {
  return OBJECTIVE_STATUS[status] || OBJECTIVE_STATUS.brouillon
}
export function getEvalStatusInfo(s) {
  return EVALUATION_STATUS[s] || EVALUATION_STATUS.non_evalue
}
export function getKrTypeInfo(t) {
  return KR_TYPES[t] || KR_TYPES.number
}
export function getKrStatusInfo(s) {
  return KR_STATUS[s] || KR_STATUS.en_cours
}

export function getScoreColor(score) {
  if (score >= 0.7) return '#10B981'
  if (score >= 0.4) return '#F59E0B'
  return '#EF4444'
}

export function formatScore(score) {
  if (score == null) return '—'
  return Number(score).toFixed(2)
}

export function formatScorePercent(score) {
  if (score == null) return '0%'
  return `${Math.round(score * 100)}%`
}

export function formatKrValue(value, krType, unit) {
  if (value == null) return '—'
  if (krType === 'binary') return value >= 1 ? 'Oui' : 'Non'
  if (krType === 'percentage') return `${value}%`
  if (krType === 'currency') return `${Number(value).toLocaleString('fr-FR')} ${unit || 'FCFA'}`
  return `${Number(value).toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`
}

export function formatDateFr(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// --- PERMISSIONS ---

export function getAllowedLevels(role) {
  switch (role) {
    case 'administrateur': return ['strategique', 'division', 'service', 'individuel']
    case 'directeur':      return ['strategique']
    case 'chef_division':  return ['division']
    case 'chef_service':   return ['service', 'individuel']
    default:               return []
  }
}

export function canCreateObjective(role) {
  return getAllowedLevels(role).length > 0
}

// Session 16 — Autorise les managers hierarchiques a modifier les objectifs de leur perimetre
export function canEditObjective(obj, user) {
  if (!obj || !user) return false
  if (user.role === 'administrateur') return true
  if (obj.owner_id === user.id) return true
  if (user.role === 'directeur' && obj.direction_id && obj.direction_id === user.direction_id) return true
  if (user.role === 'chef_division' && obj.division_id && obj.division_id === user.division_id) return true
  if (user.role === 'chef_service' && obj.service_id && obj.service_id === user.service_id) return true
  return false
}

// Session 16 — Meme logique pour la suppression
export function canDeleteObjective(obj, user) {
  if (!obj || !user) return false
  if (user.role === 'administrateur') return true
  if (obj.owner_id === user.id) return true
  if (user.role === 'directeur' && obj.direction_id && obj.direction_id === user.direction_id) return true
  if (user.role === 'chef_division' && obj.division_id && obj.division_id === user.division_id) return true
  if (user.role === 'chef_service' && obj.service_id && obj.service_id === user.service_id) return true
  return false
}

// Etape 1 — Auto-evaluation : le proprietaire s'evalue
export function canSelfEvaluate(obj, user) {
  if (!obj || !user) return false
  if (obj.status !== 'en_evaluation') return false
  if (obj.evaluation_status !== 'non_evalue') return false
  return obj.owner_id === user.id
}

// Etape 2 — Validation N+1 : le manager direct valide
//   Individuel  -> Chef de Service (meme service)
//   Service     -> Chef de Division (meme division)
//   Division    -> Directeur (meme direction)
//   Strategique -> Admin
export function canValidateN1(obj, user) {
  if (!obj || !user) return false
  if (obj.evaluation_status !== 'auto_evaluation') return false
  if (obj.level === 'individuel')
    return user.role === 'chef_service' && user.service_id === obj.service_id
  if (obj.level === 'service')
    return user.role === 'chef_division' && user.division_id === obj.division_id
  if (obj.level === 'division')
    return user.role === 'directeur' && user.direction_id === obj.direction_id
  if (obj.level === 'strategique')
    return user.role === 'administrateur'
  return false
}

// Session 16 — Etape 3 — Calibration N+2 : le superieur du N+1 calibre
//   Individuel  -> Chef de Division (meme division) OU Admin
//   Service     -> Directeur (meme direction) OU Admin
//   Division    -> Admin
//   Strategique -> Admin
export function canCalibrateRH(obj, user) {
  if (!obj || !user) return false
  if (obj.evaluation_status !== 'validation_n1') return false
  // Admin peut toujours calibrer
  if (user.role === 'administrateur') return true
  // Individuel -> N+2 = Chef de Division
  if (obj.level === 'individuel')
    return user.role === 'chef_division' && user.division_id === obj.division_id
  // Service -> N+2 = Directeur
  if (obj.level === 'service')
    return user.role === 'directeur' && user.direction_id === obj.direction_id
  // Division et Strategique -> Admin (deja couvert ci-dessus)
  return false
}