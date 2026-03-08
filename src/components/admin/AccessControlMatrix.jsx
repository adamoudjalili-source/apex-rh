// ============================================================
// APEX RH — AccessControlMatrix.jsx
// Session 91 — Matrice rôles × modules (lecture seule Phase A/B)
// Affiche les droits par rôle pour chaque module et action clé
// ============================================================
import { useState } from 'react'
import { Shield, ChevronDown, ChevronRight, Info } from 'lucide-react'

// ---- Définition de la matrice affichée ----

const ROLES = [
  { key: 'collaborateur', label: 'Collaborateur', color: '#22C55E', short: 'Collab' },
  { key: 'chef_service',  label: 'Chef de Service', color: '#06B6D4', short: 'Chef svc' },
  { key: 'chef_division', label: 'Chef de Division', color: '#3B82F6', short: 'Chef div' },
  { key: 'directeur',     label: 'Directeur', color: '#A855F7', short: 'Directeur' },
  { key: 'administrateur', label: 'Administrateur', color: '#F59E0B', short: 'Admin' },
]

const MODULES = [
  {
    key: 'mon_espace',
    label: 'Mon Espace',
    color: '#6B7280',
    rows: [
      { label: 'Tableau de bord personnel', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Saisir ses heures / congés', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Voir ses OKR', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Score Pulse personnel', perms: ['✅', '✅', '✅', '✅', '✅'] },
    ],
  },
  {
    key: 'employes',
    label: 'Gestion des Employés',
    color: '#EF4444',
    rows: [
      { label: 'Voir annuaire', perms: ['❌', '✅ équipe', '✅ div.', '✅ org', '✅ tout'] },
      { label: 'Voir fiche employé', perms: ['❌', '✅ équipe', '✅ div.', '✅ org', '✅ tout'] },
      { label: 'Modifier fiche', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Voir organigramme', perms: ['❌', '✅', '✅', '✅', '✅'] },
      { label: 'Gérer structure org', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Créer / désactiver utilisateur', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Changer un rôle', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Gérer surcharges RBAC', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'temps',
    label: 'Temps & Absences',
    color: '#F97316',
    rows: [
      { label: 'Saisir heures / demander congé', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Voir feuille équipe', perms: ['❌', '✅ équipe', '✅ div.', '✅ org', '✅'] },
      { label: 'Approuver congé / HS', perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Exporter vers paie', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Gérer règles congés', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Gérer jours fériés', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'cycle_rh',
    label: 'Cycle RH',
    color: '#10B981',
    rows: [
      { label: 'Voir ses candidatures', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Créer offre d\'emploi', perms: ['❌', '❌', '✅', '✅', '✅'] },
      { label: 'Gérer pipeline recrutement', perms: ['❌', '❌', '✅', '✅', '✅'] },
      { label: 'Voir onboarding équipe', perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Créer parcours onboarding', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Initier offboarding', perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Valider solde départ', perms: ['❌', '❌', '❌', '✅', '✅'] },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    color: '#8B5CF6',
    rows: [
      { label: 'OKR individuel (voir / créer)', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'OKR service', perms: ['❌', '✅', '✅', '✅', '✅'] },
      { label: 'OKR division', perms: ['❌', '❌', '✅', '✅', '✅'] },
      { label: 'OKR stratégique', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Voir score Pulse équipe', perms: ['❌', '✅ équipe', '✅ div.', '✅ org', '✅'] },
      { label: 'Dashboard équipe', perms: ['❌', '✅', '✅', '✅', '✅'] },
      { label: 'Calibration Pulse', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'evaluations',
    label: 'Évaluations',
    color: '#EC4899',
    rows: [
      { label: 'Voir ses entretiens', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Créer entretien équipe', perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Feedback 360 (lire)', perms: ['❌', '❌', '✅', '✅', '✅'] },
      { label: 'Enquêtes engagement', perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Gérer cycles évaluation', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'developpement',
    label: 'Formation & Développement',
    color: '#14B8A6',
    rows: [
      { label: 'Voir plan de dev. personnel', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Accès catalogue formations', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Voir formations équipe', perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Gérer budget formation', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Administrer référentiel', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'intelligence',
    label: 'Intelligence RH',
    color: '#6366F1',
    rows: [
      { label: 'Dashboard DRH', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Bilan social', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Vivier de talents / succession', perms: ['❌', '❌', '✅', '✅', '✅'] },
      { label: 'Analytics prédictifs', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Adoption plateforme', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    color: '#EF4444',
    rows: [
      { label: 'Gestion utilisateurs', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Structure organisation', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Modules activables', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'API & Intégrations', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Contrôle d\'accès (RBAC)', perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Journal d\'audit', perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
]

// ---- Utilitaire rendu cellule ----
function PermCell({ value }) {
  if (value === '✅') {
    return (
      <div className="flex items-center justify-center">
        <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-[10px] text-green-400">✓</span>
      </div>
    )
  }
  if (value === '❌') {
    return (
      <div className="flex items-center justify-center">
        <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/20">—</span>
      </div>
    )
  }
  // Partial (équipe, div., org, tout)
  const scopeColor = value.includes('tout') ? '#F59E0B' :
                     value.includes('org')  ? '#A855F7' :
                     value.includes('div')  ? '#3B82F6' :
                     value.includes('éq')   ? '#06B6D4' : '#22C55E'
  const scopeText = value.replace('✅', '').trim()
  return (
    <div className="flex items-center justify-center">
      <span
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
        style={{ color: scopeColor, background: `${scopeColor}15`, border: `1px solid ${scopeColor}30` }}>
        {scopeText}
      </span>
    </div>
  )
}

export default function AccessControlMatrix() {
  const [expanded, setExpanded] = useState(new Set(MODULES.map(m => m.key)))
  const [hoveredRole, setHoveredRole] = useState(null)

  function toggleModule(key) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">

      {/* Legend */}
      <div className="flex items-center gap-6 px-1 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-[9px] text-green-400">✓</span>
          <span className="text-xs text-white/40">Autorisé (toutes portées)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
            style={{ color: '#06B6D4', background: '#06B6D415', borderColor: '#06B6D430' }}>équipe</span>
          <span className="text-xs text-white/40">Portée limitée</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-white/20">—</span>
          <span className="text-xs text-white/40">Non autorisé</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-white/30">
          <Info size={11} />
          <span>Lecture seule — Phase A (wrapper AuthContext)</span>
        </div>
      </div>

      {/* Sticky role headers */}
      <div className="rounded-xl overflow-hidden border border-white/8"
        style={{ background: 'rgba(255,255,255,0.02)' }}>

        {/* Header row */}
        <div className="grid border-b border-white/8 sticky top-0 z-10"
          style={{
            gridTemplateColumns: '240px repeat(5, 1fr)',
            background: 'rgba(15,15,25,0.95)',
            backdropFilter: 'blur(8px)',
          }}>
          <div className="px-4 py-3 text-xs text-white/30 font-medium">Module / Action</div>
          {ROLES.map((r, i) => (
            <div
              key={r.key}
              className="px-2 py-3 text-center cursor-default transition-colors"
              style={{ background: hoveredRole === i ? `${r.color}08` : 'transparent' }}
              onMouseEnter={() => setHoveredRole(i)}
              onMouseLeave={() => setHoveredRole(null)}>
              <div className="text-[11px] font-bold text-center" style={{ color: r.color }}>
                {r.short}
              </div>
            </div>
          ))}
        </div>

        {/* Module blocks */}
        {MODULES.map(mod => {
          const isOpen = expanded.has(mod.key)
          return (
            <div key={mod.key} className="border-b border-white/5 last:border-0">
              {/* Module header */}
              <button
                onClick={() => toggleModule(mod.key)}
                className="w-full grid items-center py-2.5 px-4 hover:bg-white/3 transition-colors text-left"
                style={{ gridTemplateColumns: '240px repeat(5, 1fr)' }}>
                <div className="flex items-center gap-2">
                  {isOpen
                    ? <ChevronDown size={13} className="text-white/40 flex-shrink-0" />
                    : <ChevronRight size={13} className="text-white/40 flex-shrink-0" />}
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: mod.color }} />
                  <span className="text-[12px] font-semibold text-white/80">{mod.label}</span>
                </div>
                {ROLES.map((_, i) => (
                  <div key={i} style={{ background: hoveredRole === i ? `${ROLES[i].color}06` : 'transparent' }} className="h-full" />
                ))}
              </button>

              {/* Rows */}
              {isOpen && mod.rows.map((row, ri) => (
                <div
                  key={ri}
                  className="grid items-center py-2 hover:bg-white/2 transition-colors"
                  style={{ gridTemplateColumns: '240px repeat(5, 1fr)' }}>
                  <div className="px-4 pl-10">
                    <span className="text-[11px] text-white/50">{row.label}</span>
                  </div>
                  {ROLES.map((r, i) => (
                    <div
                      key={i}
                      className="px-2 transition-colors"
                      style={{ background: hoveredRole === i ? `${r.color}06` : 'transparent' }}>
                      <PermCell value={row.perms[i]} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-white/25 px-1 pt-1">
        Les surcharges individuelles (onglet <span className="text-white/40">Accès &amp; Droits</span> dans la fiche employé)
        peuvent affiner ces droits pour un utilisateur spécifique. Les droits <em>super_admin</em> incluent tous ceux de l'administrateur.
      </p>
    </div>
  )
}
