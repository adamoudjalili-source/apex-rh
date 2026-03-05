// ============================================================
// APEX RH — Sidebar.jsx  ·  Session 36 v3
// Navigation 6 sections — vision originale complète
//   🏠 Accueil
//   ⚡ Mon Espace      [Nouveau]
//   👥 Mon Équipe      [Nouveau — managers]
//   ── TRAVAIL ──
//   🎯 Tâches
//   🎯 Projets
//   🎯 Objectifs OKR
//   ── MESURE & ANALYSE ──
//   📊 Intelligence RH
//   🏆 Engagement
//   ── ADMINISTRATION ──
//   Utilisateurs · Organisation · Paramètres
// ============================================================
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Zap, Users, CheckSquare, Target, FolderKanban,
  BarChart3, Trophy, ChevronLeft, ChevronRight,
  LogOut, Settings, Building2, UserCog,
} from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayScore }  from '../../hooks/usePulse'
import { getScoreColor, isPulseEnabled } from '../../lib/pulseHelpers'
import logoNita from '../../assets/logo-nita.png'

const ROLE_COLORS = {
  administrateur:'#EF4444', directeur:'#C9A227',
  chef_division:'#8B5CF6', chef_service:'#3B82F6', collaborateur:'#10B981',
}
const ROLE_LABELS = {
  administrateur:'Administrateur', directeur:'Directeur',
  chef_division:'Chef de Division', chef_service:'Chef de Service', collaborateur:'Collaborateur',
}
const MANAGERS = ['administrateur','directeur','chef_division','chef_service']

const MAIN_ITEMS = [
  { label:'Tableau de bord', icon:LayoutDashboard, path:'/dashboard', roles:['administrateur','directeur','chef_division','chef_service','collaborateur'] },
  { label:'Mon Espace',      icon:Zap,             path:'/mon-espace', roles:['administrateur','directeur','chef_division','chef_service','collaborateur'], badge:'Nouveau', badgeColor:'#C9A227' },
  { label:'Mon Équipe',      icon:Users,           path:'/mon-equipe', roles:['administrateur','directeur','chef_division','chef_service'], badge:'Nouveau', badgeColor:'#C9A227' },
]

const TRAVAIL_ITEMS = [
  { label:'Tâches',       icon:CheckSquare, path:'/travail/taches',    moduleKey:'tasks_enabled' },
  { label:'Projets',      icon:FolderKanban,path:'/travail/projets',   moduleKey:'projects_enabled' },
  { label:'Objectifs OKR',icon:Target,      path:'/travail/objectifs', moduleKey:'okr_enabled' },
]

const MESURE_ITEMS = [
  { label:'Intelligence RH', icon:BarChart3, path:'/intelligence', color:'#8B5CF6' },
  { label:'Engagement',      icon:Trophy,    path:'/engagement',   color:'#C9A227' },
]

const ADMIN_ITEMS = [
  { label:'Utilisateurs', icon:UserCog,   path:'/admin/users',        roles:['administrateur'] },
  { label:'Organisation', icon:Building2, path:'/admin/organisation', roles:['administrateur'] },
  { label:'Paramètres',   icon:Settings,  path:'/admin/settings',     roles:['administrateur','directeur','chef_division','chef_service','collaborateur'] },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, signOut }      = useAuth()
  const navigate                   = useNavigate()
  const { data: settings }        = useAppSettings()
  const { data: todayScore }      = useTodayScore()

  const modules    = settings?.modules || {}
  const pulseOn    = isPulseEnabled(settings)
  const isManager  = MANAGERS.includes(profile?.role)

  const visibleMain   = MAIN_ITEMS.filter(i => {
    if (!i.roles.includes(profile?.role)) return false
    if (i.path==='/mon-equipe' && !isManager) return false
    return true
  })
  const visibleTravail = TRAVAIL_ITEMS.filter(i => !i.moduleKey || modules[i.moduleKey] !== false)
  const visibleMesure  = pulseOn ? MESURE_ITEMS : []
  const visibleAdmin   = ADMIN_ITEMS.filter(i => !i.roles || i.roles.includes(profile?.role))

  const initiale = profile?.first_name?.charAt(0) || profile?.last_name?.charAt(0) || 'U'
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration:0.28, ease:[0.4,0,0.2,1] }}
      className="relative flex flex-col h-screen border-r border-white/[0.06] overflow-hidden flex-shrink-0"
      style={{ background:'linear-gradient(180deg,#090920 0%,#070718 100%)' }}>

      {/* Ligne dorée */}
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden space-y-0.5">
        {visibleMain.map(item => <NavItem key={item.path} item={item} collapsed={collapsed}/>)}

        {visibleTravail.length > 0 && (
          <>
            <Divider label="Travail" collapsed={collapsed}/>
            {visibleTravail.map(item => <NavItem key={item.path} item={item} collapsed={collapsed}/>)}
          </>
        )}

        {visibleMesure.length > 0 && (
          <>
            <Divider label="Mesure & Analyse" collapsed={collapsed}/>
            {visibleMesure.map(item => <NavItem key={item.path} item={item} collapsed={collapsed}/>)}
          </>
        )}

        {visibleAdmin.length > 0 && (
          <>
            <Divider label="Administration" collapsed={collapsed}/>
            {visibleAdmin.map(item => <NavItem key={item.path} item={item} collapsed={collapsed}/>)}
          </>
        )}
      </nav>

      {/* Profil */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 flex-shrink-0">
        <div className="rounded-xl p-3 flex items-center gap-3 overflow-hidden"
          style={{ background:'rgba(255,255,255,0.03)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white uppercase"
            style={{ background:ROLE_COLORS[profile?.role]||'#4F46E5' }}>{initiale}</div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
                className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">{fullName}</p>
                <p className="text-[10px] font-medium truncate" style={{ color:ROLE_COLORS[profile?.role] }}>
                  {ROLE_LABELS[profile?.role]||profile?.role}
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

function NavItem({ item, collapsed }) {
  const Icon = item.icon
  return (
    <NavLink to={item.path}
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
          <Icon size={17} className="flex-shrink-0"
            style={item.color && isActive ? { color:item.color } : undefined}/>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
                className="text-sm font-medium truncate flex-1">{item.label}</motion.span>
            )}
          </AnimatePresence>
          {!collapsed && item.badge && (
            <motion.span initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background:`${item.badgeColor}20`, color:item.badgeColor, border:`1px solid ${item.badgeColor}25` }}>
              {item.badge}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
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
