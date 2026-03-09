// ============================================================
// APEX RH — src/utils/constants.js
// Session 112 — Centralisation des magic strings domaine
// Source unique de vérité pour tous les enums métier
// ============================================================

// ─── RÔLES UTILISATEURS ──────────────────────────────────────
// ⚠️  Ces valeurs correspondent exactement aux valeurs en base (role::text)
// ⚠️  NE PAS utiliser 'admin', 'rh', 'manager', 'direction' — jamais

export const ROLES = {
  SUPER_ADMIN:   'super_admin',
  ADMINISTRATEUR:'administrateur',
  DIRECTEUR:     'directeur',
  CHEF_DIVISION: 'chef_division',
  CHEF_SERVICE:  'chef_service',
  COLLABORATEUR: 'collaborateur',
}

// Ordre hiérarchique croissant (utile pour comparaisons)
export const ROLE_HIERARCHY = [
  ROLES.COLLABORATEUR,
  ROLES.CHEF_SERVICE,
  ROLES.CHEF_DIVISION,
  ROLES.DIRECTEUR,
  ROLES.ADMINISTRATEUR,
  ROLES.SUPER_ADMIN,
]

// Labels affichage
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]:    'Super Admin',
  [ROLES.ADMINISTRATEUR]: 'Administrateur',
  [ROLES.DIRECTEUR]:      'Directeur',
  [ROLES.CHEF_DIVISION]:  'Chef de Division',
  [ROLES.CHEF_SERVICE]:   'Chef de Service',
  [ROLES.COLLABORATEUR]:  'Collaborateur',
}

// ─── STATUTS GÉNÉRAUX ────────────────────────────────────────

export const STATUS = {
  DRAFT:       'draft',
  ACTIVE:      'active',
  PENDING:     'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  VALIDATED:   'validated',
  REJECTED:    'rejected',
  ARCHIVED:    'archived',
  SUBMITTED:   'submitted',
}

// ─── STATUTS ENTRETIENS ANNUELS ───────────────────────────────

export const REVIEW_STATUS = {
  PENDING:              'pending',
  SELF_IN_PROGRESS:     'self_in_progress',
  SELF_SUBMITTED:       'self_submitted',
  MEETING_SCHEDULED:    'meeting_scheduled',
  MANAGER_IN_PROGRESS:  'manager_in_progress',
  EN_REVUE:             'en_revue',
  COMPLETED:            'completed',
  SIGNED:               'signed',
  ARCHIVED:             'archived',
}

export const REVIEW_STATUS_LABELS = {
  [REVIEW_STATUS.PENDING]:             'En attente',
  [REVIEW_STATUS.SELF_IN_PROGRESS]:    'Auto-évaluation en cours',
  [REVIEW_STATUS.SELF_SUBMITTED]:      'Auto-évaluation soumise',
  [REVIEW_STATUS.MEETING_SCHEDULED]:   'Entretien planifié',
  [REVIEW_STATUS.MANAGER_IN_PROGRESS]: 'Évaluation manager',
  [REVIEW_STATUS.EN_REVUE]:            'En revue',
  [REVIEW_STATUS.COMPLETED]:           'Complété',
  [REVIEW_STATUS.SIGNED]:              'Signé',
  [REVIEW_STATUS.ARCHIVED]:            'Archivé',
}

// ─── STATUTS CONGÉS / FEUILLES DE TEMPS ──────────────────────

export const LEAVE_STATUS = {
  DRAFT:            'draft',
  SUBMITTED:        'submitted',
  MANAGER_APPROVED: 'manager_approved',
  HR_APPROVED:      'hr_approved',
  VALIDATED:        'validated',
  REJECTED:         'rejected',
  CANCELLED:        'cancelled',
}

export const LEAVE_STATUS_LABELS = {
  [LEAVE_STATUS.DRAFT]:            'Brouillon',
  [LEAVE_STATUS.SUBMITTED]:        'Soumis',
  [LEAVE_STATUS.MANAGER_APPROVED]: 'Approuvé manager',
  [LEAVE_STATUS.HR_APPROVED]:      'Approuvé RH',
  [LEAVE_STATUS.VALIDATED]:        'Validé',
  [LEAVE_STATUS.REJECTED]:         'Refusé',
  [LEAVE_STATUS.CANCELLED]:        'Annulé',
}

// ─── STATUTS TÂCHES ──────────────────────────────────────────

export const TASK_STATUS = {
  A_FAIRE:    'a_faire',
  EN_COURS:   'en_cours',
  EN_REVUE:   'en_revue',
  TERMINE:    'termine',
  ARCHIVE:    'archived',
  OVERDUE:    'overdue',
}

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.A_FAIRE]:  'À faire',
  [TASK_STATUS.EN_COURS]: 'En cours',
  [TASK_STATUS.EN_REVUE]: 'En revue',
  [TASK_STATUS.TERMINE]:  'Terminé',
  [TASK_STATUS.ARCHIVE]:  'Archivé',
  [TASK_STATUS.OVERDUE]:  'En retard',
}

// ─── STATUTS PULSE (BRIEF / DAILY LOG) ───────────────────────

export const PULSE_STATUS = {
  DRAFT:       'draft',
  SUBMITTED:   'submitted',
  ACKNOWLEDGED:'acknowledged',
  VALIDATED:   'validated',
}

// ─── STATUTS FEEDBACK 360 ────────────────────────────────────

export const FEEDBACK_STATUS = {
  PENDING:   'pending',
  SUBMITTED: 'submitted',
  EXPIRED:   'expired',
}

// ─── NIVEAUX DE CRITICITÉ ────────────────────────────────────

export const CRITICALITY = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
}

export const CRITICALITY_LABELS = {
  [CRITICALITY.LOW]:      'Faible',
  [CRITICALITY.MEDIUM]:   'Moyen',
  [CRITICALITY.HIGH]:     'Élevé',
  [CRITICALITY.CRITICAL]: 'Critique',
}

// ─── MODULES RBAC ────────────────────────────────────────────
// Utilisés avec can('MODULE', 'resource', 'action')

export const MODULES = {
  COMPENSATION:   'compensation',
  DEVELOPPEMENT:  'developpement',
  ENTRETIENS:     'entretiens',
  FORMATION:      'formation',
  OBJECTIFS:      'objectifs',
  RECRUTEMENT:    'recrutement',
  CONGES:         'conges',
  PERFORMANCE:    'performance',
  INTELLIGENCE:   'intelligence',
  PULSE:          'pulse',
}

// ─── TYPES DE FEEDBACK ────────────────────────────────────────

export const FEEDBACK_TYPES = {
  POSITIVE:      'positive',
  CONSTRUCTIVE:  'constructive',
  NEUTRE:        'neutre',
}

// ─── PÉRIODICITÉ ─────────────────────────────────────────────

export const FREQUENCY = {
  DAILY:   'daily',
  WEEKLY:  'weekly',
  MONTHLY: 'monthly',
  YEARLY:  'yearly',
}
