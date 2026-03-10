// ============================================================
// APEX RH — Header.jsx · S134
// Design Glacé #7 — glass bleu nuit, accents bleu froid
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
import { useAuth }    from '../../contexts/AuthContext'
import CommandPalette from '../ui/CommandPalette'
import NotificationCenter from '../ui/NotificationCenter'

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
  administrateur: '#EF4444',
  directeur:      '#FDE68A',
  chef_division:  '#C4B5FD',
  chef_service:   '#38BDF8',
  collaborateur:  '#6EE7B7',
}
const ROLE_LABELS = {
  administrateur: 'Administrateur',
  directeur:      'Directeur',
  chef_division:  'Chef de Division',
  chef_service:   'Chef de Service',
  collaborateur:  'Collaborateur',
}

export default function Header() {
  const location = useLocation()
  const { profile, role } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  const initiale = profile?.first_name?.charAt(0) || profile?.last_name?.charAt(0) || 'U'
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'

  // Trouver la meta de la page courante — match exact ou par prefix
  const meta = PAGE_META[location.pathname]
    || Object.entries(PAGE_META).find(([k]) => location.pathname.startsWith(k))?.[1]
    || { label:'APEX RH', Icon:LayoutDashboard, description:'' }
  const { Icon } = meta

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault(); setSearchOpen(p => !p)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const roleColor = ROLE_COLORS[role] || '#38BDF8'

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 flex-shrink-0"
        style={{
          // Glacé — bleu nuit glass, harmonisé avec la sidebar
          background:'rgba(15,23,42,.80)',
          backdropFilter:'blur(40px) saturate(140%)',
          WebkitBackdropFilter:'blur(40px) saturate(140%)',
          borderBottom:'1px solid rgba(56,189,248,.09)',
          boxShadow:'0 1px 0 rgba(56,189,248,.06)',
        }}>

        {/* Gauche — titre page */}
        <div className="flex items-center gap-3">
          <div style={{
            width:34, height:34, borderRadius:10,
            background:'rgba(14,165,233,.15)',
            backdropFilter:'blur(20px)',
            border:'1px solid rgba(56,189,248,.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 12px rgba(14,165,233,.15)',
          }}>
            <Icon size={15} style={{ color:'#7DD3FC', filter:'drop-shadow(0 0 5px rgba(56,189,248,.55))' }}/>
          </div>
          <div>
            <h1 style={{
              fontSize:14, fontWeight:800, color:'#E0F2FE',
              letterSpacing:'-0.2px', lineHeight:1.2,
              fontFamily:"'Syne',sans-serif",
            }}>
              {meta.label}
            </h1>
            <p style={{ fontSize:10, color:'rgba(125,211,252,.38)', lineHeight:1 }}>
              {meta.description}
            </p>
          </div>
        </div>

        {/* Droite — search + notifs + user */}
        <div className="flex items-center gap-2.5">

          {/* Search bar — Glacé glass */}
          <button onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all"
            style={{
              background:'rgba(14,165,233,.08)',
              backdropFilter:'blur(20px)',
              border:'1px solid rgba(56,189,248,.14)',
              color:'rgba(125,211,252,.45)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(14,165,233,.14)'; e.currentTarget.style.borderColor='rgba(56,189,248,.28)'; e.currentTarget.style.color='rgba(125,211,252,.75)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(14,165,233,.08)'; e.currentTarget.style.borderColor='rgba(56,189,248,.14)'; e.currentTarget.style.color='rgba(125,211,252,.45)' }}>
            <Search size={13}/>
            <span style={{ fontSize:12 }}>Recherche...</span>
            <span style={{
              padding:'2px 6px', borderRadius:6, fontSize:9, fontFamily:'monospace',
              background:'rgba(56,189,248,.10)', color:'rgba(186,230,253,.40)',
              border:'1px solid rgba(56,189,248,.14)',
            }}>⌘K</span>
          </button>

          <button onClick={() => setSearchOpen(true)}
            className="md:hidden flex items-center justify-center transition-all"
            style={{ width:36, height:36, borderRadius:10,
              background:'rgba(14,165,233,.08)', border:'1px solid rgba(56,189,248,.14)',
              color:'rgba(125,211,252,.45)' }}>
            <Search size={15}/>
          </button>

          <NotificationCenter />

          {/* User pill — Glacé */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'6px 12px 6px 8px', borderRadius:12, cursor:'pointer',
            background:'rgba(14,165,233,.08)',
            backdropFilter:'blur(20px)',
            border:'1px solid rgba(56,189,248,.14)',
          }}>
            {/* Avatar */}
            <div style={{
              width:28, height:28, borderRadius:8, flexShrink:0,
              background:`linear-gradient(135deg, ${roleColor}, ${roleColor}66)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:'white', textTransform:'uppercase',
              boxShadow:`0 0 10px ${roleColor}44`,
            }}>{initiale}</div>

            {/* Nom + rôle */}
            <div className="hidden md:block">
              <p style={{ fontSize:12, fontWeight:700, color:'#E0F2FE',
                lineHeight:1.2, whiteSpace:'nowrap' }}>{fullName}</p>
              <p style={{ fontSize:10, fontWeight:500, color:roleColor,
                lineHeight:1, whiteSpace:'nowrap' }}>
                {ROLE_LABELS[role] || role}
              </p>
            </div>

            <ChevronDown size={12} style={{ color:'rgba(125,211,252,.35)', flexShrink:0 }}/>
          </div>
        </div>
      </header>

      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)}/>
    </>
  )
}
