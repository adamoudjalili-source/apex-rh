// ============================================================
// APEX RH — pulseHelpers.js
// ✅ Session 21 — Constantes, helpers, calculs PULSE
// ============================================================

// ─── PALETTE DE COULEURS ─────────────────────────────────────
export const PULSE_COLORS = {
  primary:    '#4F46E5',  // Indigo — couleur principale PULSE
  gold:       '#C9A227',  // Or — awards, scores élevés
  success:    '#10B981',  // Vert — score > 70, journal soumis
  warning:    '#F59E0B',  // Orange — score 40–70, alerte modérée
  danger:     '#EF4444',  // Rouge — score < 40, alerte critique
  neutral:    '#6B7280',  // Gris — inactif, non soumis
  delivery:   '#3B82F6',  // Bleu — dimension Delivery
  quality:    '#8B5CF6',  // Violet — dimension Quality
  regularity: '#10B981',  // Vert — dimension Regularity
  bonus:      '#C9A227',  // Or — dimension Bonus OKR
}

// ─── SEUILS DE SCORE ─────────────────────────────────────────
export const SCORE_THRESHOLDS = {
  high: 70,
  medium: 40,
}

// ─── COULEUR EN FONCTION DU SCORE ────────────────────────────
/**
 * Retourne la couleur hex correspondant au score PULSE
 * @param {number} score — valeur entre 0 et 100
 * @returns {string} — couleur hex
 */
export function getScoreColor(score) {
  if (score === null || score === undefined) return PULSE_COLORS.neutral
  if (score >= SCORE_THRESHOLDS.high)   return PULSE_COLORS.success
  if (score >= SCORE_THRESHOLDS.medium) return PULSE_COLORS.warning
  return PULSE_COLORS.danger
}

/**
 * Retourne le libellé textuel du score
 */
export function getScoreLabel(score) {
  if (score === null || score === undefined) return 'Non calculé'
  if (score >= SCORE_THRESHOLDS.high)   return 'Excellent'
  if (score >= SCORE_THRESHOLDS.medium) return 'Moyen'
  return 'Insuffisant'
}

// ─── FORMATAGE DU TEMPS ──────────────────────────────────────
/**
 * Convertit des minutes en "Xh Ymin" ou "Xmin"
 */
export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Convertit des heures décimales (8.5) en "8h 30min"
 */
export function formatHoursDecimal(hours) {
  if (!hours) return '0h'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/**
 * Convertit "HH:MM" en minutes
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Convertit des minutes en "HH:MM"
 */
export function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── DATE HELPERS ────────────────────────────────────────────
/**
 * Retourne la date du jour au format 'YYYY-MM-DD'
 */
export function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Formate une date pour l'affichage en français
 */
export function formatDateFr(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/**
 * Vérifie si une date est un jour ouvré.
 * Décision session 21 : journaux disponibles 7j/7 → retourne toujours true.
 * Conserver la fonction pour éventuelle configuration future.
 */
export function isWorkday(_dateStr) {
  return true
}

/**
 * Vérifie si aujourd'hui est disponible pour le journal PULSE.
 * 7j/7 — décision session 21.
 */
export function isTodayWorkday() {
  return true
}

// ─── FENÊTRES HORAIRES ───────────────────────────────────────
/**
 * Retourne l'heure actuelle au format HH:MM
 */
function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * Vérifie si l'heure courante est entre start et end (format HH:MM)
 */
function isTimeBetween(start, end) {
  const now = getCurrentTime()
  return now >= start && now <= end
}

/**
 * Vérifie si on est dans la fenêtre de saisie du brief matinal
 * @param {object} settings — retour de useAppSettings()
 */
export function isInsideBriefWindow(settings) {
  if (!settings) return false
  const start    = settings.pulse_brief_start    || '07:00'
  const deadline = settings.pulse_brief_deadline || '10:00'
  return isTimeBetween(start, deadline)
}

/**
 * Vérifie si le brief est encore accessible (fenêtre ouverte ou passée mais pas encore soumis)
 */
export function isBriefAccessible(settings) {
  if (!settings) return false
  const start = settings.pulse_brief_start || '07:00'
  return getCurrentTime() >= start
}

/**
 * Vérifie si la deadline du brief est dépassée
 */
export function isBriefDeadlinePassed(settings) {
  if (!settings) return false
  const deadline = settings.pulse_brief_deadline || '10:00'
  return getCurrentTime() > deadline
}

/**
 * Vérifie si on est dans la fenêtre de saisie du journal du soir
 */
export function isInsideJournalWindow(settings) {
  if (!settings) return false
  const start    = settings.pulse_journal_start    || '16:00'
  const deadline = settings.pulse_journal_deadline || '18:30'
  return isTimeBetween(start, deadline)
}

/**
 * Vérifie si le journal est accessible (fenêtre ouverte ou en retard)
 */
export function isJournalAccessible(settings) {
  if (!settings) return false
  const start = settings.pulse_journal_start || '16:00'
  return getCurrentTime() >= start
}

/**
 * Vérifie si la deadline du journal est dépassée
 */
export function isJournalDeadlinePassed(settings) {
  if (!settings) return false
  const deadline = settings.pulse_journal_deadline || '18:30'
  return getCurrentTime() > deadline
}

// ─── PONDÉRATIONS SCORE ──────────────────────────────────────
/**
 * Retourne les pondérations du score depuis les paramètres
 * Fallback sur les valeurs par défaut si non configuré
 */
export function getPulseWeights(settings) {
  const raw = settings?.pulse_score_weights
  if (raw && typeof raw === 'object') {
    return {
      delivery:   Number(raw.delivery   ?? 40) / 100,
      quality:    Number(raw.quality    ?? 30) / 100,
      regularity: Number(raw.regularity ?? 20) / 100,
      bonus:      Number(raw.bonus      ?? 10) / 100,
    }
  }
  return { delivery: 0.40, quality: 0.30, regularity: 0.20, bonus: 0.10 }
}

// ─── MODULE ACTIVÉ ───────────────────────────────────────────
/**
 * Vérifie si le module PULSE est activé dans les paramètres
 */
export function isPulseEnabled(settings) {
  if (!settings) return false
  // stocké dans settings.modules.pulse_enabled (jsonb)
  return settings.modules?.pulse_enabled !== false
}

// ─── STATUT JOURNÉE ──────────────────────────────────────────
/**
 * Calcule l'état global de la journée à partir du plan et du log
 * Retourne : 'empty' | 'brief_only' | 'journal_draft' | 'complete' | 'validated' | 'rejected'
 */
export function getDayStatus(morningPlan, dailyLog) {
  if (!morningPlan && !dailyLog)                   return 'empty'
  if (!dailyLog && morningPlan?.status === 'submitted') return 'brief_only'
  if (dailyLog?.status === 'validated')             return 'validated'
  if (dailyLog?.status === 'rejected')              return 'rejected'
  if (dailyLog?.status === 'submitted')             return 'complete'
  if (dailyLog?.status === 'draft')                 return 'journal_draft'
  return 'brief_only'
}

export const DAY_STATUS_CONFIG = {
  empty: {
    label: 'Journée non commencée',
    color: PULSE_COLORS.neutral,
    bg: 'rgba(107,114,128,0.1)',
  },
  brief_only: {
    label: 'Brief soumis',
    color: PULSE_COLORS.warning,
    bg: 'rgba(245,158,11,0.1)',
  },
  journal_draft: {
    label: 'Journal en cours',
    color: PULSE_COLORS.warning,
    bg: 'rgba(245,158,11,0.1)',
  },
  complete: {
    label: 'Journal soumis',
    color: PULSE_COLORS.success,
    bg: 'rgba(16,185,129,0.1)',
  },
  validated: {
    label: 'Validé ✓',
    color: PULSE_COLORS.success,
    bg: 'rgba(16,185,129,0.1)',
  },
  rejected: {
    label: 'Correction demandée',
    color: PULSE_COLORS.danger,
    bg: 'rgba(239,68,68,0.1)',
  },
}

// ─── LABELS STATUTS ──────────────────────────────────────────
export const TASK_STATUS_LABELS = {
  en_cours: 'En cours',
  terminee: 'Terminée',
  bloquee:  'Bloquée',
  reporte:  'Reportée',
}

export const BLOCK_TYPE_LABELS = {
  technique:       'Technique',
  organisationnel: 'Organisationnel',
  rh:              'RH',
  ressources:      'Ressources',
}

export const SATISFACTION_LABELS = {
  1: '😞 Très difficile',
  2: '😕 Difficile',
  3: '😐 Neutre',
  4: '🙂 Bonne journée',
  5: '😊 Excellente journée',
}

// ─── DISPONIBILITÉ SLIDER ────────────────────────────────────
/**
 * Génère les options de disponibilité (0 à 10h, tranches 30min)
 */
export function getAvailabilityOptions() {
  const opts = []
  for (let h = 0; h <= 10; h += 0.5) {
    opts.push({ value: h, label: formatHoursDecimal(h) })
  }
  return opts
}

// ─── FEEDBACK 360° ──────────────────────────────────────────
/**
 * Vérifie si le module Feedback 360° est activé
 * (stocké dans settings.modules.feedback360_enabled)
 */
export function isFeedback360Enabled(settings) {
  if (!settings) return false
  return settings.modules?.feedback360_enabled === true
}

// ─── IA COACH ────────────────────────────────────────────────
/**
 * Vérifie si le module IA Coach est activé
 * (stocké dans settings.modules.ia_coach_enabled)
 */
export function isAICoachEnabled(settings) {
  if (!settings) return false
  return settings.modules?.ia_coach_enabled === true
}
