// ============================================================
// APEX RH — Header.jsx · S134 + S135 light mode complet
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, ChevronDown, CheckSquare, Target, FolderKanban,
  LayoutDashboard, Users, Building2, Settings,
  Clock, CalendarDays, GraduationCap, ClipboardList,
  RefreshCw, Wallet, BarChart3, ShieldCheck,
  MessageCircle, Gauge, Activity, Trophy,
} from 'lucide-react'
import { useAuth }          from '../../contexts/AuthContext'
import { useTheme }         from '../../contexts/ThemeContext'
import CommandPalette        from '../ui/CommandPalette'
import NotificationCenter    from '../ui/NotificationCenter'

const PAGE_META = {
  '/dashboard':              { label:'Tableau de bord',    Icon:LayoutDashboard, description:"Vue d'ensemble de votre activité" },
  '/mon-tableau-de-bord':    { label:'Tableau de bord',    Icon:LayoutDashboard, description:"Vue d'ensemble de votre activité" },
  '/tasks':                  { label:'Tâches',             Icon:CheckSquare,     description:'Gérez vos tâches et assignations' },
  '/mon-travail':            { label:'Mon Travail',        Icon:CheckSquare,     description:'Tâches, projets et objectifs OKR' },
  '/objectives':             { label:'Objectifs OKR',      Icon:Target,          description:'Suivez vos objectifs et résultats clés' },
  '/projects':               { label:'Projets',            Icon:FolderKanban,    description:'Pilotez vos projets et livrables' },
  '/employes':               { label:'Gestion Employés',   Icon:Users,           description:'Gestion des collaborateurs' },
  '/admin/users':            { label:'Utilisateurs',       Icon:Users,           description:'Gestion des comptes utilisateurs' },
  '/admin/organisation':     { label:'Organisation',       Icon:Building2,       description:'Divisions, services et équipes' },
  '/admin/settings':         { label:'Paramètres',         Icon:Settings,        description:"Configuration de l'application" },
  '/admin/access-control':   { label:'Accès & RBAC',       Icon:ShieldCheck,     description:'Rôles et permissions' },
  '/communication':          { label:'Communication',      Icon:MessageCircle,   description:'Messagerie et annonces' },
  '/mon-suivi-temps':        { label:'Suivi du temps',     Icon:Clock,           description:'Pointage et temps de travail' },
  '/mes-conges':             { label:'Mes Congés',         Icon:CalendarDays,    description:'Demandes et soldes de congés' },
  '/mon-developpement':      { label:'Mon Développement',  Icon:GraduationCap,   description:'Formations et compétences' },
  '/mes-entretiens':         { label:'Mes Entretiens',     Icon:ClipboardList,   description:'Entretiens et évaluations' },
  '/mon-suivi-rh':           { label:'Mon Suivi RH',       Icon:RefreshCw,       description:'Suivi administratif RH' },
  '/ma-remuneration':        { label:'Ma Rémunération',    Icon:Wallet,          description:'Salaire et avantages' },
  '/performance':            { label:'Performance',        Icon:BarChart3,       description:'Indicateurs de performance' },
  '/intelligence':           { label:'Intelligence RH',    Icon:BarChart3,       description:'Analyses et insights RH' },
  '/analytics':              { label:'Analytics RH',       Icon:Gauge,           description:'Tableaux de bord analytiques' },
  '/ma-performance':         { label:'Ma Performance',     Icon:Activity,        description:'Score et progression' },
  '/engagement':             { label:'Récompenses',        Icon:Trophy,          description:'Badges et reconnaissances' },
}

const ROLE_COLORS = {
  administrateur: '#EF4444', directeur: '#FDE68A', chef_division: '#C4B5FD',
  chef_service: '#38BDF8',   collaborateur: '#6EE7B7',
}
const ROLE_LABELS_MAP = {
  administrateur: 'Administrateur', directeur: 'Directeur', chef_division: 'Chef de Division',
  chef_service: 'Chef de Service',  collaborateur: 'Collaborateur',
}

export default function Header() {
  const { profile }       = useAuth()
  const { resolvedTheme } = useTheme()
  const isLight           = resolvedTheme === 'light'
  const location          = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)

  const pathKey = '/' + location.pathname.split('/').slice(1,3).join('/')
  const meta = PAGE_META[location.pathname]
           || PAGE_META['/' + location.pathname.split('/')[1]]
           || { label: 'APEX RH', Icon: LayoutDashboard, description: '' }
  const { Icon } = meta

  const role     = profile?.role || 'collaborateur'
  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '—'
  const initiale = fullName.charAt(0).toUpperCase()
  const roleColor = ROLE_COLORS[role] || '#38BDF8'

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(p => !p) }
  }, [])
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  /* ── Tokens thème ───────────────────────────────────────── */
  const titleColor    = isLight ? '#1A1F36'                : '#E0F2FE'
  const subtitleColor = isLight ? 'rgba(26,31,54,0.40)'   : 'rgba(125,211,252,.38)'
  const iconBg        = isLight ? '#EEF2FF'                : 'rgba(14,165,233,.15)'
  const iconColor     = isLight ? '#635BFF'                : '#7DD3FC'
  const searchBg      = isLight ? 'rgba(99,102,241,0.06)'  : 'rgba(14,165,233,.08)'
  const searchBorder  = isLight ? 'rgba(99,102,241,0.18)'  : 'rgba(56,189,248,.14)'
  const searchColor   = isLight ? 'rgba(26,31,54,0.45)'    : 'rgba(125,211,252,.45)'
  const searchHoverBg = isLight ? 'rgba(99,102,241,0.12)'  : 'rgba(14,165,233,.14)'
  const kbdBg         = isLight ? 'rgba(99,102,241,0.08)'  : 'rgba(56,189,248,.10)'
  const kbdColor      = isLight ? 'rgba(26,31,54,0.35)'    : 'rgba(186,230,253,.40)'
  const userBg        = isLight ? 'rgba(99,102,241,0.06)'  : 'rgba(14,165,233,.08)'
  const userBorder    = isLight ? 'rgba(99,102,241,0.15)'  : 'rgba(56,189,248,.14)'
  const chevronColor  = isLight ? 'rgba(26,31,54,0.25)'    : 'rgba(125,211,252,.35)'

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 flex-shrink-0"
        style={{
          background:         isLight ? 'rgba(255,255,255,.97)' : 'rgba(15,23,42,.80)',
          backdropFilter:     'blur(40px) saturate(140%)',
          WebkitBackdropFilter:'blur(40px) saturate(140%)',
          borderBottom:       isLight ? '1px solid rgba(99,102,241,.10)' : '1px solid rgba(56,189,248,.09)',
          boxShadow:          isLight ? '0 1px 0 rgba(99,102,241,.06)' : '0 1px 0 rgba(56,189,248,.06)',
        }}>

        {/* Gauche — titre page */}
        <div className="flex items-center gap-3">
          <div style={{
            width:34, height:34, borderRadius:10,
            background: iconBg, border:'1px solid rgba(56,189,248,.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Icon size={15} style={{ color: iconColor }} />
          </div>
          <div>
            <h1 style={{ fontSize:14, fontWeight:800, color: titleColor,
                         letterSpacing:'-0.2px', lineHeight:1.2, fontFamily:"'Syne',sans-serif" }}>
              {meta.label}
            </h1>
            <p style={{ fontSize:10, color: subtitleColor, lineHeight:1 }}>
              {meta.description}
            </p>
          </div>
        </div>

        {/* Droite */}
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <button onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all"
            style={{ background: searchBg, border:`1px solid ${searchBorder}`, color: searchColor }}
            onMouseEnter={e => { e.currentTarget.style.background=searchHoverBg; e.currentTarget.style.color=isLight?'rgba(26,31,54,0.80)':'rgba(125,211,252,.75)' }}
            onMouseLeave={e => { e.currentTarget.style.background=searchBg; e.currentTarget.style.color=searchColor }}>
            <Search size={13}/>
            <span style={{ fontSize:12 }}>Recherche...</span>
            <span style={{ padding:'2px 6px', borderRadius:6, fontSize:9, fontFamily:'monospace',
                           background: kbdBg, color: kbdColor, border:`1px solid ${searchBorder}` }}>⌘K</span>
          </button>

          <button onClick={() => setSearchOpen(true)}
            className="md:hidden flex items-center justify-center"
            style={{ width:36, height:36, borderRadius:10,
                     background: searchBg, border:`1px solid ${searchBorder}`, color: searchColor }}>
            <Search size={15}/>
          </button>

          <NotificationCenter />

          {/* User pill */}
          <div style={{ display:'flex', alignItems:'center', gap:10,
                        padding:'6px 12px 6px 8px', borderRadius:12, cursor:'pointer',
                        background: userBg, border:`1px solid ${userBorder}` }}>
            <div style={{
              width:28, height:28, borderRadius:8, flexShrink:0,
              background:`linear-gradient(135deg,${roleColor},${roleColor}66)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:'white', textTransform:'uppercase',
            }}>{initiale}</div>
            <div className="hidden md:block">
              <p style={{ fontSize:12, fontWeight:700, color: isLight ? '#1A1F36' : '#E0F2FE',
                          lineHeight:1.2, whiteSpace:'nowrap' }}>{fullName}</p>
              <p style={{ fontSize:10, fontWeight:500, color:roleColor,
                          lineHeight:1, whiteSpace:'nowrap' }}>
                {ROLE_LABELS_MAP[role] || role}
              </p>
            </div>
            <ChevronDown size={12} style={{ color: chevronColor, flexShrink:0 }}/>
          </div>
        </div>
      </header>

      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)}/>
    </>
  )
}
