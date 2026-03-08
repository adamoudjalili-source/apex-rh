// ============================================================
// APEX RH — Sidebar.jsx  ·  Session 38
// 3 EXPÉRIENCES DISTINCTES, 1 PLATEFORME COHÉRENTE
//
// VUE COLLABORATEUR (5 sections) :
//   1. Mon Tableau de Bord  → /mon-tableau-de-bord
//   2. Mon Travail ▾        → Tâches · Projets · Objectifs
//   3. Ma Performance       → /ma-performance
//   4. Mon Développement    → /mon-developpement
//   5. Mes Reconnaissances  → /mes-reconnaissances
//
// VUE MANAGER (+ sections) :
//   + Mon Équipe            → /mon-equipe
//   + Intelligence RH       → /intelligence
//   + Engagement équipe     → /engagement
//
// VUE ADMIN/RH :
//   1. Tableau de Bord Global → /mon-tableau-de-bord
//   2. Intelligence RH        → /intelligence
//   3. Gestion ▾              → Utilisateurs · Organisation · Paramètres
//   4. Rapports               → /engagement
// ============================================================
import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Target, FolderKanban,
  Activity, BookOpen, Trophy, Users, BarChart3,
  ChevronLeft, ChevronRight, ChevronDown,
  LogOut, Settings, Building2, UserCog, GraduationCap, DollarSign, BriefcaseIcon, ClipboardList, MessageCircle,
  MapPin, CalendarDays, Clock, UserMinus, // FIX S88 : icônes Congés, Temps, Offboarding
} from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayScore }  from '../../hooks/usePulse'
import { getScoreColor, isPulseEnabled } from '../../lib/pulseHelpers'
import { useUnreadCount } from '../../hooks/useCommunication'
import NotificationBell   from '../NotificationBell'  /* S86 */
import logoNita from '../../assets/logo-nita.png'

const ROLE_COLORS = {
  administrateur:'#EF4444', directeur:'#C9A227',
  chef_division:'#8B5CF6',  chef_service:'#3B82F6', collaborateur:'#10B981',
}
const ROLE_LABELS = {
  administrateur:'Administrateur', directeur:'Directeur',
  chef_division:'Chef de Division', chef_service:'Chef de Service', collaborateur:'Collaborateur',
}
import { MANAGER_ROLES as MANAGERS } from './lib/roles'
const ADMINS   = ['administrateur','directeur']  // 'direction' supprimé décision B-1

const TRAVAIL_ITEMS = [
  { label:'Tâches',        icon:CheckSquare,  path:'/travail/taches',    moduleKey:'tasks_enabled' },
  { label:'Projets',       icon:FolderKanban, path:'/travail/projets',   moduleKey:'projects_enabled' },
  { label:'Objectifs OKR', icon:Target,       path:'/travail/objectifs', moduleKey:'okr_enabled' },
]

const GESTION_ITEMS = [
  { label:'Utilisateurs', icon:UserCog,   path:'/admin/users',        roles:['administrateur'] },
  { label:'Organisation', icon:Building2, path:'/admin/organisation', roles:['administrateur'] },
  { label:'API & Connecteurs', icon:Settings, path:'/admin/api-manager', roles:['administrateur'] },  /* S53 */
  { label:'Paramètres',   icon:Settings,  path:'/admin/settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed]     = useState(false)
  const [travailOpen, setTravailOpen] = useState(true)
  const [gestionOpen, setGestionOpen] = useState(false)

  const { profile, signOut }  = useAuth()
  const navigate               = useNavigate()
  const location               = useLocation()
  const { data: settings }    = useAppSettings()
  const { data: todayScore }  = useTodayScore()

  const modules   = settings?.modules || {}
  const pulseOn   = isPulseEnabled(settings)
  const isManager = MANAGERS.includes(profile?.role)
  const isAdmin   = ADMINS.includes(profile?.role)
  const role      = profile?.role
  const { data: unreadCount = 0 } = useUnreadCount()

  const initiale = profile?.first_name?.charAt(0) || profile?.last_name?.charAt(0) || 'U'
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'

  const travailItems  = TRAVAIL_ITEMS.filter(i => !i.moduleKey || modules[i.moduleKey] !== false)
  const gestionItems  = GESTION_ITEMS.filter(i => !i.roles || i.roles.includes(role))
  const isTravailActive = travailItems.some(i => location.pathname.startsWith(i.path))
  const isGestionActive = gestionItems.some(i => location.pathname.startsWith(i.path))

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration:0.28, ease:[0.4,0,0.2,1] }}
      className="relative flex flex-col h-screen border-r border-white/[0.06] overflow-hidden flex-shrink-0"
      style={{ background:'linear-gradient(180deg,#090920 0%,#070718 100%)' }}>

      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background:'linear-gradient(90deg,#C9A227,#4F46E5,transparent)' }}/>

      {/* Logo */}
      <div className="border-b border-white/[0.06] flex-shrink-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div key="full" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}>
              <img src={logoNita} alt="NITA" className="w-full h-auto"/>
            </motion.div>
          ) : (
            <motion.div key="icon" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
              className="flex items-center justify-center h-16">
              <img src={logoNita} alt="NITA" className="w-10 h-10 object-contain"/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden space-y-0.5">

        {/* ═══ VUE ADMIN / RH ═══ */}
        {isAdmin ? (
          <>
            <NavItem icon={LayoutDashboard} label="Tableau de Bord" path="/mon-tableau-de-bord" collapsed={collapsed}/>

            <Divider label="Mon Travail" collapsed={collapsed}/>
            <GroupItem label="Mon Travail" icon={CheckSquare}
              open={travailOpen || isTravailActive}
              onToggle={() => setTravailOpen(o=>!o)}
              collapsed={collapsed} active={isTravailActive}/>
            <AnimatePresence>
              {(travailOpen || isTravailActive) && !collapsed && (
                <motion.div key="travail-items-admin"
                  initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  transition={{duration:0.22}} style={{overflow:'hidden'}}>
                  {travailItems.map(item => (
                    <SubItem key={item.path} icon={item.icon} label={item.label} path={item.path}/>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {(travailOpen || isTravailActive) && collapsed && travailItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} collapsed={collapsed}/>
            ))}

            <Divider label="Performance" collapsed={collapsed}/>
            <NavItem icon={Activity} label="Ma Performance" path="/ma-performance" color="#4F46E5" collapsed={collapsed}/>

            <Divider label="Management" collapsed={collapsed}/>
            <NavItem icon={Users}    label="Mon Équipe"    path="/mon-equipe"   color="#3B82F6" collapsed={collapsed}/>

            <Divider label="Analyse" collapsed={collapsed}/>
            <NavItem icon={BarChart3} label="Intelligence RH"  path="/intelligence" color="#8B5CF6" collapsed={collapsed}/>
            <NavItem icon={Trophy}   label="Engagement & Rapports" path="/engagement" color="#C9A227" collapsed={collapsed}/>
            <NavItem icon={GraduationCap} label="Formation & Certifications" path="/formation" color="#10B981" collapsed={collapsed}/> {/* S57 */}
            <NavItem icon={MapPin}        label="Onboarding"                 path="/onboarding" color="#6366F1" collapsed={collapsed}/> {/* S75 */}
            <NavItem icon={UserMinus}     label="Offboarding"                path="/offboarding" color="#F87171" collapsed={collapsed}/> {/* S68+S85 — FIX S88 */}
            <NavItem icon={CalendarDays}  label="Congés & Absences"          path="/conges"      color="#34D399" collapsed={collapsed}/> {/* S67+S70 — FIX S88 */}
            <NavItem icon={Clock}         label="Gestion des Temps"          path="/temps"       color="#FBBF24" collapsed={collapsed}/> {/* S66+S71 — FIX S88 */}
            <NavItem icon={DollarSign}    label="Compensation & Benchmark"   path="/compensation" color="#34D399" collapsed={collapsed}/> {/* S58 */}
            <NavItem icon={BriefcaseIcon} label="Recrutement"                 path="/recrutement"  color="#818CF8" collapsed={collapsed}/> {/* S59 */}
            <NavItem icon={ClipboardList} label="Entretiens Annuels"          path="/entretiens"   color="#A78BFA" collapsed={collapsed}/> {/* S60 */}
            <Divider label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle} label="Communication" path="/communication" color="#06B6D4"
              badge={unreadCount || null} collapsed={collapsed}/> {/* S65 */}
              open={gestionOpen || isGestionActive}
              onToggle={() => setGestionOpen(o=>!o)}
              collapsed={collapsed} active={isGestionActive}/>
            <AnimatePresence>
              {(gestionOpen || isGestionActive) && !collapsed && (
                <motion.div key="gestion-items"
                  initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  transition={{duration:0.22, overflow:'hidden'}} style={{overflow:'hidden'}}>
                  {gestionItems.map(item => (
                    <SubItem key={item.path} icon={item.icon} label={item.label} path={item.path}/>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {(gestionOpen || isGestionActive) && collapsed && gestionItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} collapsed={collapsed}/>
            ))}
          </>

        /* ═══ VUE MANAGER ═══ */
        ) : isManager ? (
          <>
            <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord" path="/mon-tableau-de-bord" collapsed={collapsed}/>
            <Divider label="Mon Travail" collapsed={collapsed}/>
            <GroupItem label="Mon Travail" icon={CheckSquare}
              open={travailOpen || isTravailActive}
              onToggle={() => setTravailOpen(o=>!o)}
              collapsed={collapsed} active={isTravailActive}/>
            <AnimatePresence>
              {(travailOpen || isTravailActive) && !collapsed && (
                <motion.div key="travail-items-mgr"
                  initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  transition={{duration:0.22}} style={{overflow:'hidden'}}>
                  {travailItems.map(item => (
                    <SubItem key={item.path} icon={item.icon} label={item.label} path={item.path}/>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {(travailOpen || isTravailActive) && collapsed && travailItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} collapsed={collapsed}/>
            ))}
            {pulseOn && (
              <>
                <Divider label="Performance" collapsed={collapsed}/>
                <NavItem icon={Activity} label="Ma Performance" path="/ma-performance" color="#4F46E5" collapsed={collapsed}/>
              </>
            )}
            <Divider label="Management" collapsed={collapsed}/>
            <NavItem icon={Users}    label="Mon Équipe"         path="/mon-equipe"    color="#3B82F6" collapsed={collapsed}/>
            <NavItem icon={BarChart3} label="Intelligence RH"   path="/intelligence"  color="#8B5CF6" collapsed={collapsed}/>
            <NavItem icon={Trophy}   label="Engagement équipe"  path="/engagement"    color="#C9A227" collapsed={collapsed}/>
            <NavItem icon={GraduationCap} label="Formation"     path="/formation"     color="#10B981" collapsed={collapsed}/> {/* S57 */}
            <NavItem icon={MapPin}        label="Onboarding"    path="/onboarding"    color="#6366F1" collapsed={collapsed}/> {/* S75 */}
            <NavItem icon={UserMinus}     label="Offboarding"   path="/offboarding"   color="#F87171" collapsed={collapsed}/> {/* S85 — FIX S88 */}
            <NavItem icon={CalendarDays}  label="Congés"        path="/conges"        color="#34D399" collapsed={collapsed}/> {/* S70 — FIX S88 */}
            <NavItem icon={Clock}         label="Temps"         path="/temps"         color="#FBBF24" collapsed={collapsed}/> {/* S71 — FIX S88 */}
            <NavItem icon={DollarSign}    label="Compensation"   path="/compensation"  color="#34D399" collapsed={collapsed}/> {/* S58 */}
            <NavItem icon={BriefcaseIcon} label="Recrutement"    path="/recrutement"   color="#818CF8" collapsed={collapsed}/> {/* S59 */}
            <NavItem icon={ClipboardList} label="Entretiens"      path="/entretiens"    color="#A78BFA" collapsed={collapsed}/> {/* S60 */}
            <Divider label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle} label="Communication" path="/communication" color="#06B6D4"
              badge={unreadCount || null} collapsed={collapsed}/> {/* S65 */}
            <NavItem icon={Settings} label="Paramètres" path="/admin/settings" collapsed={collapsed}/>
          </>

        /* ═══ VUE COLLABORATEUR ═══ */
        ) : (
          <>
            {/* 1 — Mon Tableau de Bord */}
            <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord" path="/mon-tableau-de-bord" collapsed={collapsed}/>

            {/* 2 — Mon Travail */}
            <Divider label="Mon Travail" collapsed={collapsed}/>
            <GroupItem label="Mon Travail" icon={CheckSquare}
              open={travailOpen || isTravailActive}
              onToggle={() => setTravailOpen(o=>!o)}
              collapsed={collapsed} active={isTravailActive}/>
            <AnimatePresence>
              {(travailOpen || isTravailActive) && !collapsed && (
                <motion.div key="travail-items-collab"
                  initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  transition={{duration:0.22}} style={{overflow:'hidden'}}>
                  {travailItems.map(item => (
                    <SubItem key={item.path} icon={item.icon} label={item.label} path={item.path}/>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {(travailOpen || isTravailActive) && collapsed && travailItems.map(item => (
              <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path} collapsed={collapsed}/>
            ))}

            {/* 3 — Ma Performance */}
            {pulseOn && (
              <>
                <Divider label="Performance" collapsed={collapsed}/>
                <NavItem icon={Activity} label="Ma Performance" path="/ma-performance" color="#4F46E5" collapsed={collapsed}/>
              </>
            )}

            {/* 4 — Mon Développement */}
            <Divider label="Développement" collapsed={collapsed}/>
            <NavItem icon={BookOpen} label="Mon Développement" path="/mon-developpement" color="#10B981" collapsed={collapsed}/>

            {/* 4b — Formation */}
            <NavItem icon={GraduationCap} label="Formation" path="/formation" color="#6366F1" collapsed={collapsed}/> {/* S57 */}

            {/* 4b2 — Onboarding S75 */}
            <NavItem icon={MapPin} label="Onboarding" path="/onboarding" color="#6366F1" collapsed={collapsed}/> {/* S75 */}

            {/* 4c — Compensation */}
            <NavItem icon={DollarSign} label="Compensation" path="/compensation" color="#34D399" collapsed={collapsed}/> {/* S58 */}

            {/* 4d — Recrutement */}
            <NavItem icon={BriefcaseIcon} label="Recrutement" path="/recrutement" color="#818CF8" collapsed={collapsed}/> {/* S59 */}
            <NavItem icon={ClipboardList} label="Entretiens" path="/entretiens" color="#A78BFA" collapsed={collapsed}/> {/* S60 */}
            <Divider label="Reconnaissances" collapsed={collapsed}/>
            <NavItem icon={Trophy} label="Mes Reconnaissances" path="/mes-reconnaissances" color="#C9A227" collapsed={collapsed}/>

            {/* Communication S65 */}
            <Divider label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle} label="Communication" path="/communication" color="#06B6D4"
              badge={unreadCount || null} collapsed={collapsed}/>

            {/* Paramètres */}
            <Divider label="Administration" collapsed={collapsed}/>
            <NavItem icon={Settings} label="Paramètres" path="/admin/settings" collapsed={collapsed}/>
          </>
        )}
      </nav>

      {/* Profil */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 flex-shrink-0">
        {/* Cloche notifications S86 */}
        <div className="flex items-center justify-center px-1 pb-1">
          <NotificationBell collapsed={collapsed} />
        </div>
        <div className="rounded-xl p-3 flex items-center gap-3 overflow-hidden"
          style={{ background:'rgba(255,255,255,0.03)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white uppercase"
            style={{ background:ROLE_COLORS[role]||'#4F46E5' }}>{initiale}</div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
                className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">{fullName}</p>
                <p className="text-[10px] font-medium truncate" style={{ color:ROLE_COLORS[role] }}>
                  {ROLE_LABELS[role]||role}
                </p>
                {pulseOn && todayScore && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] text-white/20">PULSE</span>
                    <span className="text-[11px] font-black" style={{ color:getScoreColor(todayScore.score_total) }}>
                      {todayScore.score_total}%
                    </span>
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width:`${todayScore.score_total}%`, background:getScoreColor(todayScore.score_total) }}/>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full rounded-lg px-3 py-2.5 flex items-center gap-3 text-white/25 hover:text-red-400 hover:bg-red-500/[0.06] transition-all">
          <LogOut size={17} className="flex-shrink-0"/>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
                className="text-sm">Déconnexion</motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Bouton collapse */}
      <button onClick={() => setCollapsed(c=>!c)}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#1a1a3e] border border-white/10 flex items-center justify-center text-white/35 hover:text-white hover:bg-indigo-600 transition-colors z-10">
        {collapsed ? <ChevronRight size={11}/> : <ChevronLeft size={11}/>}
      </button>
    </motion.aside>
  )
}

function NavItem({ icon: Icon, label, path, collapsed, color, badge }) {
  return (
    <NavLink to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden group ${
          isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-white/35 hover:text-white/75 hover:bg-white/[0.03]'
        }`
      }>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div layoutId="nav-active"
              className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r"
              transition={{ type:'spring', stiffness:500, damping:30 }}/>
          )}
          <div className="relative flex-shrink-0">
            <Icon size={17} style={color && isActive ? { color } : undefined}/>
            {badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: '#06B6D4', padding: '0 2px', boxShadow: '0 0 6px rgba(6,182,212,0.5)' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
                className="text-sm font-medium truncate flex-1">{label}</motion.span>
            )}
          </AnimatePresence>
          {!collapsed && badge > 0 && (
            <motion.span initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}
              className="ml-auto min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', padding: '0 4px' }}>
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  )
}

function SubItem({ icon: Icon, label, path }) {
  return (
    <NavLink to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg transition-all text-sm ${
          isActive ? 'text-indigo-400 bg-indigo-500/[0.07]' : 'text-white/25 hover:text-white/55 hover:bg-white/[0.02]'
        }`
      }>
      <Icon size={14} className="flex-shrink-0"/>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function GroupItem({ icon: Icon, label, open, onToggle, collapsed, active }) {
  return (
    <button onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        active ? 'text-indigo-300' : 'text-white/35 hover:text-white/65 hover:bg-white/[0.03]'
      }`}>
      <Icon size={17} className="flex-shrink-0"/>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
            className="flex items-center flex-1 min-w-0 justify-between">
            <span className="text-sm font-medium truncate">{label}</span>
            <ChevronDown size={13}
              className={`transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}/>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

function Divider({ label, collapsed }) {
  return (
    <div className="pt-3 pb-1">
      {!collapsed ? (
        <p className="text-[10px] text-white/15 uppercase tracking-widest px-3">{label}</p>
      ) : (
        <div className="h-px bg-white/[0.06] mx-3"/>
      )}
    </div>
  )
}
