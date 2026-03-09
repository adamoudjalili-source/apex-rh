// ============================================================
// APEX RH — AccessControlMatrix.jsx
// Session 91 (rev) — Matrice dynamique rôles × modules
// - Lit org_module_settings → modules désactivés grisés/masqués
// - Lecture seule Phase A/B (édition = Phase D post-S107)
// - Se met à jour automatiquement si un module est activé/désactivé
// ============================================================
import { useState } from 'react'
import { ChevronDown, ChevronRight, Info, EyeOff, RefreshCw } from 'lucide-react'
import { useOrgModuleSettings } from '../../hooks/useSettings'
import { ROLES } from '../../utils/constants'

const ROLES = [
  { key: ROLES.COLLABORATEUR,  label: 'Collaborateur',    color: '#22C55E', short: 'Collab'    },
  { key: ROLES.CHEF_SERVICE,   label: 'Chef de Service',  color: '#06B6D4', short: 'Chef svc'  },
  { key: ROLES.CHEF_DIVISION,  label: 'Chef de Division', color: '#3B82F6', short: 'Chef div'  },
  { key: ROLES.DIRECTEUR,      label: 'Directeur',        color: '#A855F7', short: 'Directeur' },
  { key: ROLES.ADMINISTRATEUR, label: 'Administrateur',   color: '#F59E0B', short: 'Admin'     },
]

// MODULES_DEF — source de vérité
// moduleKey doit matcher org_module_settings.module_key
// Fallback : module affiché actif si clé absente de la table
const MODULES_DEF = [
  {
    key: 'mon_espace',
    label: 'Mon Espace',
    color: '#6B7280',
    rows: [
      { label: 'Tableau de bord personnel',  perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Saisir ses heures / congés', perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Voir ses OKR',               perms: ['✅', '✅', '✅', '✅', '✅'] },
      { label: 'Score Pulse personnel',      perms: ['✅', '✅', '✅', '✅', '✅'] },
    ],
  },
  {
    key: 'employes',
    label: 'Gestion des Employés',
    color: '#EF4444',
    rows: [
      { label: 'Voir annuaire',                  perms: ['❌', '✅ équipe', '✅ div.', '✅ org',  '✅ tout'] },
      { label: 'Voir fiche employé',             perms: ['❌', '✅ équipe', '✅ div.', '✅ org',  '✅ tout'] },
      { label: 'Modifier fiche',                 perms: ['❌', '❌',        '❌',      '❌',      '✅'] },
      { label: 'Voir organigramme',              perms: ['❌', '✅',        '✅',      '✅',      '✅'] },
      { label: 'Gérer structure org',            perms: ['❌', '❌',        '❌',      '❌',      '✅'] },
      { label: 'Créer / désactiver utilisateur', perms: ['❌', '❌',        '❌',      '❌',      '✅'] },
      { label: 'Changer un rôle',                perms: ['❌', '❌',        '❌',      '❌',      '✅'] },
      { label: 'Gérer surcharges RBAC',          perms: ['❌', '❌',        '❌',      '❌',      '✅'] },
    ],
  },
  {
    key: 'temps_absences',
    label: 'Temps & Absences',
    color: '#F97316',
    rows: [
      { label: 'Saisir heures / demander congé', perms: ['✅', '✅',        '✅',      '✅',     '✅'] },
      { label: 'Voir feuille équipe',            perms: ['❌', '✅ équipe', '✅ div.', '✅ org', '✅'] },
      { label: 'Approuver congé / HS',           perms: ['❌', '✅ équipe', '✅ div.', '✅',     '✅'] },
      { label: 'Exporter vers paie',             perms: ['❌', '❌',        '❌',      '✅',     '✅'] },
      { label: 'Gérer règles congés',            perms: ['❌', '❌',        '❌',      '✅',     '✅'] },
      { label: 'Gérer jours fériés',             perms: ['❌', '❌',        '❌',      '❌',     '✅'] },
    ],
  },
  {
    key: 'cycle_rh',
    label: 'Cycle RH',
    color: '#10B981',
    rows: [
      { label: 'Voir ses candidatures',       perms: ['✅', '✅',        '✅',      '✅', '✅'] },
      { label: "Créer offre d'emploi",        perms: ['❌', '❌',        '✅',      '✅', '✅'] },
      { label: 'Gérer pipeline recrutement',  perms: ['❌', '❌',        '✅',      '✅', '✅'] },
      { label: 'Voir onboarding équipe',      perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Créer parcours onboarding',   perms: ['❌', '❌',        '❌',      '❌', '✅'] },
      { label: 'Initier offboarding',         perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Valider solde départ',        perms: ['❌', '❌',        '❌',      '✅', '✅'] },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    color: '#8B5CF6',
    rows: [
      { label: 'OKR individuel (voir / créer)', perms: ['✅', '✅',        '✅',      '✅',     '✅'] },
      { label: 'OKR service',                   perms: ['❌', '✅',        '✅',      '✅',     '✅'] },
      { label: 'OKR division',                  perms: ['❌', '❌',        '✅',      '✅',     '✅'] },
      { label: 'OKR stratégique',               perms: ['❌', '❌',        '❌',      '✅',     '✅'] },
      { label: 'Voir score Pulse équipe',        perms: ['❌', '✅ équipe', '✅ div.', '✅ org', '✅'] },
      { label: 'Dashboard équipe',              perms: ['❌', '✅',        '✅',      '✅',     '✅'] },
      { label: 'Calibration Pulse',             perms: ['❌', '❌',        '❌',      '❌',     '✅'] },
    ],
  },
  {
    key: 'evaluations',
    label: 'Évaluations',
    color: '#EC4899',
    rows: [
      { label: 'Voir ses entretiens',      perms: ['✅', '✅',        '✅',      '✅', '✅'] },
      { label: 'Créer entretien équipe',   perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Feedback 360 (lire)',      perms: ['❌', '❌',        '✅',      '✅', '✅'] },
      { label: 'Enquêtes engagement',      perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Gérer cycles évaluation',  perms: ['❌', '❌',        '❌',      '❌', '✅'] },
    ],
  },
  {
    key: 'developpement',
    label: 'Formation & Développement',
    color: '#14B8A6',
    rows: [
      { label: 'Voir plan de dév. personnel', perms: ['✅', '✅',        '✅',      '✅', '✅'] },
      { label: 'Accès catalogue formations',  perms: ['✅', '✅',        '✅',      '✅', '✅'] },
      { label: 'Voir formations équipe',      perms: ['❌', '✅ équipe', '✅ div.', '✅', '✅'] },
      { label: 'Gérer budget formation',      perms: ['❌', '❌',        '❌',      '✅', '✅'] },
      { label: 'Administrer référentiel',     perms: ['❌', '❌',        '❌',      '❌', '✅'] },
    ],
  },
  {
    key: 'intelligence',
    label: 'Intelligence RH',
    color: '#6366F1',
    rows: [
      { label: 'Dashboard DRH',        perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Bilan social',         perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Vivier de talents',    perms: ['❌', '❌', '✅', '✅', '✅'] },
      { label: 'Analytics prédictifs', perms: ['❌', '❌', '❌', '✅', '✅'] },
      { label: 'Adoption plateforme',  perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    color: '#EF4444',
    rows: [
      { label: 'Gestion utilisateurs',      perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Structure organisation',    perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'Modules activables',        perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: 'API & Intégrations',        perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: "Contrôle d'accès (RBAC)",   perms: ['❌', '❌', '❌', '❌', '✅'] },
      { label: "Journal d'audit",           perms: ['❌', '❌', '❌', '❌', '✅'] },
    ],
  },
]

// ---- Cellule ----
function PermCell({ value, disabled }) {
  const dim = disabled ? 'opacity-30' : ''
  if (value === '✅') {
    return (
      <div className={`flex items-center justify-center ${dim}`}>
        <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-[10px] text-green-400">✓</span>
      </div>
    )
  }
  if (value === '❌') {
    return (
      <div className={`flex items-center justify-center ${dim}`}>
        <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/20">—</span>
      </div>
    )
  }
  const color = value.includes('tout') ? '#F59E0B'
              : value.includes('org')  ? '#A855F7'
              : value.includes('div')  ? '#3B82F6'
              : value.includes('éq')   ? '#06B6D4'
              : '#22C55E'
  return (
    <div className={`flex items-center justify-center ${dim}`}>
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
        style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
        {value.replace('✅', '').trim()}
      </span>
    </div>
  )
}

// ---- Composant ----
export default function AccessControlMatrix() {
  const [expanded, setExpanded]         = useState(new Set(MODULES_DEF.map(m => m.key)))
  const [showDisabled, setShowDisabled] = useState(true)
  const [hoveredRole, setHoveredRole]   = useState(null)

  const { data: moduleSettings, isLoading, refetch } = useOrgModuleSettings()

  // true si module actif — fallback permissif si clé absente
  function isEnabled(key) {
    if (!moduleSettings) return true
    return moduleSettings[key] !== false   // undefined → true, false → false
  }

  function toggle(key) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const disabledCount  = MODULES_DEF.filter(m => !isEnabled(m.key)).length
  const visibleModules = showDisabled ? MODULES_DEF : MODULES_DEF.filter(m => isEnabled(m.key))

  return (
    <div className="space-y-3">

      {/* Barre de contrôle */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        <div className="flex items-center gap-5 text-[11px] text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-[9px] text-green-400">✓</span>
            Autorisé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
              style={{ color: '#06B6D4', background: '#06B6D415', borderColor: '#06B6D430' }}>équipe</span>
            Portée limitée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] text-white/20">—</span>
            Non autorisé
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {disabledCount > 0 && (
            <button
              onClick={() => setShowDisabled(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors"
              style={{
                background: 'rgba(107,114,128,0.08)',
                borderColor: 'rgba(107,114,128,0.2)',
                color: 'rgba(255,255,255,0.4)',
              }}>
              <EyeOff size={11} />
              {showDisabled ? `Masquer désactivés (${disabledCount})` : `Voir désactivés (${disabledCount})`}
            </button>
          )}
          <button onClick={() => refetch()} disabled={isLoading}
            className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
            title="Actualiser depuis org_module_settings">
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <span className="flex items-center gap-1 text-[10px] text-white/25">
            <Info size={10} />
            Lecture seule — Phase A
          </span>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>

        {/* Header */}
        <div className="grid border-b border-white/8 sticky top-0 z-10"
          style={{ gridTemplateColumns: '240px repeat(5, 1fr)', background: 'rgba(15,15,25,0.95)', backdropFilter: 'blur(8px)' }}>
          <div className="px-4 py-3 text-xs text-white/30 font-medium">Module / Action</div>
          {ROLES.map((r, i) => (
            <div key={r.key} className="px-2 py-3 text-center cursor-default transition-colors"
              style={{ background: hoveredRole === i ? `${r.color}08` : 'transparent' }}
              onMouseEnter={() => setHoveredRole(i)} onMouseLeave={() => setHoveredRole(null)}>
              <div className="text-[11px] font-bold" style={{ color: r.color }}>{r.short}</div>
            </div>
          ))}
        </div>

        {/* Indicateur chargement */}
        {isLoading && (
          <div className="flex items-center gap-2 justify-center py-4 text-xs text-white/30">
            <RefreshCw size={11} className="animate-spin" />
            Lecture de org_module_settings…
          </div>
        )}

        {/* Modules */}
        {visibleModules.map(mod => {
          const active = isEnabled(mod.key)
          const open   = expanded.has(mod.key)
          return (
            <div key={mod.key} className="border-b border-white/5 last:border-0"
              style={{ opacity: active ? 1 : 0.4 }}>

              {/* En-tête module */}
              <button onClick={() => toggle(mod.key)}
                className="w-full grid items-center py-2.5 px-4 hover:bg-white/3 transition-colors text-left"
                style={{ gridTemplateColumns: '240px repeat(5, 1fr)' }}>
                <div className="flex items-center gap-2">
                  {open ? <ChevronDown size={13} className="text-white/40 flex-shrink-0" />
                        : <ChevronRight size={13} className="text-white/40 flex-shrink-0" />}
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: active ? mod.color : '#6B7280' }} />
                  <span className={`text-[12px] font-semibold ${active ? 'text-white/80' : 'text-white/35'}`}>
                    {mod.label}
                  </span>
                  {!active && (
                    <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ml-1"
                      style={{ color: '#6B7280', background: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.2)' }}>
                      <EyeOff size={8} /> Désactivé
                    </span>
                  )}
                </div>
                {ROLES.map((_, i) => (
                  <div key={i} style={{ background: hoveredRole === i ? `${ROLES[i].color}06` : 'transparent' }} className="h-full" />
                ))}
              </button>

              {/* Lignes */}
              {open && mod.rows.map((row, ri) => (
                <div key={ri} className="grid items-center py-2 hover:bg-white/2 transition-colors"
                  style={{ gridTemplateColumns: '240px repeat(5, 1fr)' }}>
                  <div className="px-4 pl-10">
                    <span className={`text-[11px] ${active ? 'text-white/50' : 'text-white/25'}`}>{row.label}</span>
                  </div>
                  {ROLES.map((r, i) => (
                    <div key={i} className="px-2 transition-colors"
                      style={{ background: hoveredRole === i ? `${r.color}06` : 'transparent' }}>
                      <PermCell value={row.perms[i]} disabled={!active} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="text-[11px] text-white/25 px-1 pt-1">
        Les modules grisés sont désactivés dans <span className="text-white/40">org_module_settings</span> — ils se mettent à jour automatiquement.
        Les surcharges individuelles (onglet <span className="text-white/40">Accès &amp; Droits</span> dans la fiche employé) affinent les droits par utilisateur.
        La modification des droits par rôle sera disponible en <em>Phase D</em>.
      </p>
    </div>
  )
}
