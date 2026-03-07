// src/lib/roles.js
// Sprint 1 — Étape 5 — Source unique de vérité pour les rôles APEX RH
// ⚠️ Le rôle 'direction' N'EXISTE PAS en production — absent de tous les tableaux (décision B-1 · 2026-03-07)

// ---------------------------------------------------------------------------
// Tableaux de rôles
// ---------------------------------------------------------------------------

/** Rôles avec droits d'administration complète (accès total plateforme) */
export const ADMIN_ROLES = ['administrateur', 'directeur']

/** Rôles avec droits manager ou supérieur (encadrement + reporting) */
export const MANAGER_ROLES = ['administrateur', 'directeur', 'chef_division', 'chef_service']

/** Tous les rôles valides de la plateforme */
export const ALL_ROLES = ['super_admin', 'administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur']

// ---------------------------------------------------------------------------
// Guards — fonctions pures (acceptent un string `role`)
// ---------------------------------------------------------------------------

/**
 * Vérifie si le rôle donné est un rôle admin (administrateur ou directeur).
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export const isAdminRole = (role) => ADMIN_ROLES.includes(role)

/**
 * Vérifie si le rôle donné est manager ou supérieur.
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export const isManagerRole = (role) => MANAGER_ROLES.includes(role)

/**
 * Vérifie si le rôle donné est exactement 'administrateur'.
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export const isAdmin = (role) => role === 'administrateur'

/**
 * Vérifie si le rôle donné est exactement 'directeur'.
 * ⚠️ Ne pas confondre avec l'ancien rôle fantôme 'direction' (inexistant en prod).
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export const isDirecteur = (role) => role === 'directeur'

/**
 * Alias sémantique de isManagerRole — préférer dans les guards de composants.
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export const isManagerOrAbove = (role) => MANAGER_ROLES.includes(role)

/**
 * Alias sémantique de isAdminRole — préférer dans les guards de composants.
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export const isAdminOrAbove = (role) => ADMIN_ROLES.includes(role)

/**
 * Vérifie si le rôle donné figure dans la liste fournie.
 * @param {string|null|undefined} role
 * @param {string[]} allowedRoles
 * @returns {boolean}
 */
export const hasRole = (role, allowedRoles) => Array.isArray(allowedRoles) && allowedRoles.includes(role)

// ---------------------------------------------------------------------------
// Labels & couleurs (synchronisés avec le design system dark)
// ---------------------------------------------------------------------------

/** Labels affichés dans l'UI (Sidebar, profils, badges) */
export const ROLE_LABELS = {
  super_admin:    'Super Administrateur',
  administrateur: 'Administrateur',
  directeur:      'Directeur',
  chef_division:  'Chef de Division',
  chef_service:   'Chef de Service',
  collaborateur:  'Collaborateur',
}

/** Couleurs associées aux rôles (identiques au design system Sidebar) */
export const ROLE_COLORS = {
  super_admin:    '#C9A227',
  administrateur: '#EF4444',
  directeur:      '#C9A227',
  chef_division:  '#8B5CF6',
  chef_service:   '#3B82F6',
  collaborateur:  '#10B981',
}