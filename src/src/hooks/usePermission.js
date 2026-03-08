// ============================================================
// APEX RH — usePermission.js
// Session 91 — Phase A RBAC (wrapper transparent AuthContext)
// Hook unifié V2 : can() · scope() · hasRole()
// Zéro requête Supabase — wraps les helpers AuthContext existants
// ============================================================
import { useAuth } from '../contexts/AuthContext'

// Ordre hiérarchique des rôles (index = niveau, plus haut = plus de droits)
const ROLE_ORDER = ['collaborateur', 'chef_service', 'chef_division', 'directeur', 'administrateur', 'super_admin']

// ============================================================
// MATRICE des permissions — module × resource × action → fn(helpers) → boolean
// Phase A : traduit les helpers AuthContext vers l'API can() unifié
// Phase D (si besoin) : remplacée par lookup en base, même API
// ============================================================
const PERMISSION_MATRIX = {

  // --- Module 1 : Mon Espace ---
  dashboard: {
    own: {
      read: () => true,
    },
  },
  tasks: {
    own: {
      read: () => true,
      create: () => true,
      update: () => true,
      delete: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
  },
  profile: {
    own: {
      read: () => true,
      update: () => true,
    },
  },

  // --- Module 2 : Gestion des Employés ---
  employes: {
    annuaire: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    fiche: {
      read: ({ canManageTeam }) => canManageTeam,
      update: ({ canAdmin }) => canAdmin,
    },
    orgchart: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    structure: {
      read: ({ canAdmin }) => canAdmin,
      update: ({ canAdmin }) => canAdmin,
    },
    career_events: {
      read: ({ canManageTeam, isChefDivision, canManageOrg }) =>
        isChefDivision || canManageOrg || canManageTeam,
    },
    acces_droits: {
      read: ({ canAdmin }) => canAdmin,
      update: ({ canAdmin }) => canAdmin,
    },
    users: {
      create: ({ canAdmin }) => canAdmin,
      delete: ({ canAdmin }) => canAdmin,
      update: ({ canAdmin }) => canAdmin,
    },
    role: {
      update: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Module 3 : Temps & Absences ---
  temps: {
    own: {
      read: () => true,
      create: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
      validate: ({ canValidate }) => canValidate,
    },
    export_paie: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    regles: {
      admin: ({ canManageOrg }) => canManageOrg,
    },
    feries: {
      admin: ({ canAdmin }) => canAdmin,
    },
  },
  conges: {
    own: {
      read: () => true,
      create: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
      validate: ({ canValidate }) => canValidate,
    },
    regles: {
      admin: ({ canManageOrg }) => canManageOrg,
    },
  },

  // --- Module 4 : Cycle RH ---
  recrutement: {
    candidatures: {
      read: () => true,
    },
    offres: {
      create: ({ isChefDivision, canManageOrg }) => isChefDivision || canManageOrg,
    },
    pipeline: {
      read: ({ isChefDivision, canManageOrg }) => isChefDivision || canManageOrg,
      update: ({ isChefDivision, canManageOrg }) => isChefDivision || canManageOrg,
    },
    templates: {
      admin: ({ canAdmin }) => canAdmin,
    },
  },
  onboarding: {
    team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    parcours: {
      create: ({ canAdmin }) => canAdmin,
    },
  },
  offboarding: {
    team: {
      read: ({ canManageTeam }) => canManageTeam,
      create: ({ canManageTeam }) => canManageTeam,
    },
    solde: {
      validate: ({ canManageOrg }) => canManageOrg,
    },
  },

  // --- Module 5 : Performance ---
  performance: {
    okr_own: {
      read: () => true,
      create: () => true,
    },
    okr_team: {
      read: ({ canManageTeam }) => canManageTeam,
      create: ({ canManageTeam }) => canManageTeam,
    },
    okr_division: {
      read: ({ isChefDivision, canManageOrg }) => isChefDivision || canManageOrg,
      create: ({ isChefDivision, canManageOrg }) => isChefDivision || canManageOrg,
    },
    okr_strategic: {
      read: ({ canManageOrg }) => canManageOrg,
      create: ({ canManageOrg }) => canManageOrg,
    },
    okr_cycle: {
      admin: ({ canManageOrg }) => canManageOrg,
    },
    pulse_own: {
      read: () => true,
      create: () => true,
    },
    pulse_team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    pulse_heatmap: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    dashboard_equipe: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    calibration: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Module 6 : Évaluations ---
  evaluations: {
    entretiens_own: {
      read: () => true,
    },
    entretiens_team: {
      read: ({ canManageTeam }) => canManageTeam,
      create: ({ canManageTeam }) => canManageTeam,
    },
    feedback360: {
      read: ({ hasStrategic }) => hasStrategic,
      admin: ({ canAdmin }) => canAdmin,
    },
    surveys: {
      read: ({ canManageTeam }) => canManageTeam,
      create: ({ canAdmin }) => canAdmin,
    },
    cycles: {
      admin: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Module 7 : Formation & Développement ---
  developpement: {
    own: {
      read: () => true,
    },
    catalogue: {
      read: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    competences: {
      read: () => true,
      admin: ({ canAdmin }) => canAdmin,
    },
    budget: {
      read: ({ canManageOrg }) => canManageOrg,
      admin: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Module 8 : Intelligence RH ---
  intelligence: {
    // V2 — 7 onglets (S95)
    overview: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    effectifs: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    absenteisme: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    competences: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    succession: {
      read: ({ hasStrategic }) => hasStrategic,   // chef_division+
      admin: ({ canAdmin }) => canAdmin,
    },
    predictif: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    exports: {
      read: ({ canManageOrg }) => canManageOrg,
      export: ({ canManageOrg }) => canManageOrg,
    },
    // Legacy — conservé pour rétrocompatibilité Phase C
    drh_dashboard: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    bilan_social: {
      read: ({ canManageOrg }) => canManageOrg,
      export: ({ canManageOrg }) => canManageOrg,
    },
    talents: {
      read: ({ hasStrategic }) => hasStrategic,
    },
    behavioral: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    analytics_predictifs: {
      read: ({ canManageOrg }) => canManageOrg,
    },
    adoption: {
      read: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Module 9 : Administration ---
  admin: {
    users: {
      read: ({ canAdmin }) => canAdmin,
      create: ({ canAdmin }) => canAdmin,
      update: ({ canAdmin }) => canAdmin,
      delete: ({ canAdmin }) => canAdmin,
    },
    organisation: {
      read: ({ canAdmin }) => canAdmin,
      update: ({ canAdmin }) => canAdmin,
    },
    modules: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ canAdmin }) => canAdmin,
    },
    integrations: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ canAdmin }) => canAdmin,
    },
    api_keys: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ canAdmin }) => canAdmin,
    },
    audit_logs: {
      read: ({ canAdmin }) => canAdmin,
    },
    access_control: {
      read: ({ canAdmin }) => canAdmin,
    },
    rbac: {
      read: ({ canAdmin }) => canAdmin,
      update: ({ canAdmin }) => canAdmin,
    },
    super_admin: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ isSuperAdmin }) => isSuperAdmin,
    },
    notifications: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Compensation (module transverse) ---
  compensation: {
    own: {
      read: () => true,
    },
    benchmark: {
      read: () => true,
    },
    history: {
      read: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    revisions: {
      read: ({ canAdmin, canValidate, canManageTeam }) => canAdmin || canValidate || canManageTeam,
    },
    cycles: {
      admin: ({ canAdmin }) => canAdmin,
    },
    simulation: {
      admin: ({ canAdmin }) => canAdmin,
    },
    admin: {
      read: ({ canAdmin }) => canAdmin,
    },
    stats: {
      read: ({ canAdmin, canValidate }) => canAdmin || canValidate,
    },
  },

  // --- Reconnaissances (module transverse) ---
  reconnaissances: {
    own: {
      read: () => true,
      create: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    admin: {
      read: ({ canAdmin }) => canAdmin,
      admin: ({ canAdmin }) => canAdmin,
    },
  },

  // --- Pulse (hors module 5, composants transverses) ---
  pulse: {
    own: {
      read: () => true,
      create: () => true,
    },
    journal: {
      read: () => true,
      create: () => true,
    },
    board: {
      read: () => true,
    },
    team: {
      read: ({ canManageTeam }) => canManageTeam,
    },
    alerts: {
      read: ({ canManageTeam }) => canManageTeam,
      admin: ({ canAdmin }) => canAdmin,
    },
    calibration: {
      admin: ({ canAdmin }) => canAdmin,
    },
    analytics: {
      read: ({ canManageTeam }) => canManageTeam,
      org:  ({ canManageOrg })  => canManageOrg,
    },
  },
}

// ============================================================
// Hook principal
// ============================================================
export function usePermission() {
  const {
    canAdmin,
    canManageOrg,
    canManageTeam,
    canValidate,
    hasStrategic,
    isChefService,
    isChefDivision,
    isDirecteur,
    isSuperAdmin,
    role,
  } = useAuth()

  const helpers = {
    canAdmin,
    canManageOrg,
    canManageTeam,
    canValidate,
    hasStrategic,
    isChefService,
    isChefDivision,
    isDirecteur,
    isSuperAdmin,
  }

  /**
   * Vérifie si l'utilisateur peut effectuer une action sur une ressource d'un module.
   * @param {string} module   — ex: 'conges', 'admin', 'intelligence'
   * @param {string} resource — ex: 'requests', 'users', 'drh_dashboard'
   * @param {string} action   — ex: 'read', 'create', 'update', 'delete', 'validate', 'export', 'admin'
   * @returns {boolean}
   */
  function can(module, resource, action) {
    const fn = PERMISSION_MATRIX[module]?.[resource]?.[action]
    if (!fn) return false
    return fn(helpers) ?? false
  }

  /**
   * Retourne la portée de données effective pour l'utilisateur.
   * @param {string} _module   — ignoré en Phase A (portée uniforme par rôle)
   * @param {string} _resource — ignoré en Phase A
   * @returns {'own'|'team'|'division'|'org'|'all'}
   */
  function scope(_module, _resource) {
    if (canAdmin)     return 'all'
    if (isDirecteur)  return 'org'
    if (isChefDivision) return 'division'
    if (isChefService)  return 'team'
    return 'own'
  }

  /**
   * Vérifie si l'utilisateur a au moins le rôle donné (inclut héritage vers le haut).
   * @param {string} targetRole — ex: 'chef_service', 'administrateur'
   * @returns {boolean}
   */
  function hasRole(targetRole) {
    const myIdx  = ROLE_ORDER.indexOf(role)
    const reqIdx = ROLE_ORDER.indexOf(targetRole)
    if (myIdx === -1 || reqIdx === -1) return false
    return myIdx >= reqIdx
  }

  return { can, scope, hasRole }
}
