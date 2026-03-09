// ============================================================
// APEX RH — Sidebar.jsx · S110 — 6 profils × architecture cible
//
// collaborateur  : Mon Tableau de Bord
//                  MON ESPACE (7) : Mon Travail · Mon Timesheet · Mes Congés
//                                   Mon Développement · Mes Entretiens
//                                   Mon Suivi RH · Ma Rémunération
//                  Communication · Paramètres
//
// chef_service   : Mon Tableau de Bord
//                  MON ESPACE (7)
//                  MON SERVICE (6) : Mon Équipe · Performance équipe
//                                    Évaluations équipe · Formation équipe
//                                    Temps & Congés · Validations
//                  Communication · Paramètres
//
// chef_division  : Mon Tableau de Bord
//                  MON ESPACE (7)
//                  MA DIVISION (7) : Mon Équipe · Performance division
//                                    Évaluations division · Formation division
//                                    Temps & Congés · Validations · Intelligence RH
//                  Communication · Paramètres
//
// directeur      : Tableau de Bord
//                  MON ESPACE (7)
//                  PILOTAGE (4) : Performance org · Évaluations
//                                 Formation & Dév · Intelligence RH
//                  Communication · Paramètres
//
// administrateur : Tableau de Bord
//                  MON ESPACE (7)
//                  MODULES RH (7) : Gestion Employés · Performance · Évaluations
//                                   Formation & Dév · Temps & Absences
//                                   Cycle RH · Intelligence RH
//                  ADMINISTRATION (5) : Organisation · Accès & RBAC · Paramètres
//                                       Notifications · API & Intégrations
//                  Communication
//
// super_admin    : Tableau de Bord
//                  MON ESPACE (7)
//                  MODULES RH (7)
//                  ADMINISTRATION (5)
//                  MULTI-TENANT : Organisations
//                  Communication
// ============================================================
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BarChart3, TrendingUp,
  ChevronLeft, ChevronRight, LogOut,
  ClipboardList, ClipboardCheck, Settings,
  ShieldCheck, MessageCircle, Clock,
  Globe, UserSquare2, GraduationCap, RefreshCw,
  Briefcase, CalendarDays, Wallet, Trophy,
  Activity, Building2, Bell, Zap,
  CheckSquare, UserCircle2, Gauge, Target,
} from 'lucide-react'
import { useAuth }        from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { useTodayScore }  from '../../hooks/usePulse'
import { useUnreadCount } from '../../hooks/useCommunication'
import { getScoreColor, isPulseEnabled } from '../../lib/pulseHelpers'
import { ROLE_COLORS, ROLE_LABELS } from '../../lib/roles'
import logoNita from '../../assets/logo-nita.png'

// ─── NavItem ─────────────────────────────────────────────────
function NavItem({ icon: Icon, label, path, collapsed, color, badge, indent = false }) {
  return (
    <NavLink to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group ${
          indent ? 'ml-3' : ''
        } ${isActive ? 'text-white' : 'text-white/35 hover:text-white/75 hover:bg-white/[0.03]'}`
      }>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div layoutId="nav-active-hub"
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: color ? `${color}12` : 'rgba(99,102,241,0.1)' }}
              transition={{ type:'spring', stiffness:500, damping:30 }}/>
          )}
          {isActive && (
            <motion.div
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
              style={{ background: color || '#6366F1' }}
              transition={{ type:'spring', stiffness:500, damping:30 }}/>
          )}
          <div className="relative flex-shrink-0 z-10">
            <Icon size={indent ? 15 : 17} style={isActive && color ? { color } : undefined}/>
            {badge > 0 && collapsed && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: '#06B6D4', padding: '0 2px' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
                className={`font-medium truncate flex-1 relative z-10 ${indent ? 'text-xs' : 'text-sm'}`}>{label}</motion.span>
            )}
          </AnimatePresence>
          {!collapsed && badge > 0 && (
            <motion.span initial={{scale:0}} animate={{scale:1}}
              className="ml-auto min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 relative z-10"
              style={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', padding: '0 4px' }}>
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── Section label ────────────────────────────────────────────
function Section({ label, collapsed }) {
  if (collapsed) return <div className="h-px bg-white/[0.05] mx-3 my-2"/>
  return <p className="text-[9px] text-white/15 uppercase tracking-[0.15em] px-3 pt-3 pb-1 font-semibold">{label}</p>
}

// ─── MonEspace — bloc identique pour tous les profils ────────
function MonEspace({ collapsed, pulseOn }) {
  return (
    <>
      <Section label="Mon Espace" collapsed={collapsed}/>
      <NavItem icon={Briefcase}     label="Mon Travail"        path="/mon-travail"       color="#4F46E5" collapsed={collapsed}/>
      <NavItem icon={UserCircle2}   label="Mon Profil"         path="/mon-profil"        color="#8B5CF6" collapsed={collapsed}/>
      <NavItem icon={Clock}         label="Mon suivi du temps de travail" path="/mon-suivi-temps"   color="#818CF8" collapsed={collapsed}/>
      <NavItem icon={CalendarDays}  label="Mes Congés"                   path="/mes-conges"       color="#10B981" collapsed={collapsed}/>
      <NavItem icon={GraduationCap} label="Mon Développement"  path="/mon-developpement" color="#8B5CF6" collapsed={collapsed}/>
      <NavItem icon={ClipboardList} label="Mes Entretiens"     path="/mes-entretiens"    color="#A78BFA" collapsed={collapsed}/>
      <NavItem icon={RefreshCw}     label="Mon Suivi RH"       path="/mon-suivi-rh"      color="#C9A227" collapsed={collapsed}/>
      <NavItem icon={Wallet}        label="Ma Rémunération"    path="/ma-remuneration"   color="#F59E0B" collapsed={collapsed}/>
      <NavItem icon={Trophy}        label="Récompenses"        path="/engagement"        color="#C9A227" collapsed={collapsed}/>
      {pulseOn && (
        <NavItem icon={Activity}    label="Ma Performance"     path="/ma-performance"    color="#4F46E5" collapsed={collapsed}/>
      )}
    </>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  const { profile, signOut, isSuperAdmin, isAdmin, isDirecteur, isChefDivision, isChefService, isCollab } = useAuth()
  const navigate                  = useNavigate()
  const { data: settings }        = useAppSettings()
  const { data: todayScore }      = useTodayScore()
  const { data: unreadCount = 0 } = useUnreadCount()

  const pulseOn  = isPulseEnabled(settings)
  const role     = profile?.role
  const initiale = profile?.first_name?.charAt(0) || profile?.last_name?.charAt(0) || 'U'
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur'

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

        {/* ═══ SUPER ADMINISTRATEUR ═══ */}
        {isSuperAdmin && (
          <>
            <NavItem icon={LayoutDashboard} label="Tableau de Bord"     path="/dashboard"            color="#C9A227" collapsed={collapsed}/>

            <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>

            <Section label="Modules RH" collapsed={collapsed}/>
            <NavItem icon={UserSquare2}    label="Gestion Employés"      path="/employes"             color="#3B82F6" collapsed={collapsed}/>
            <NavItem icon={TrendingUp}     label="Performance"           path="/performance"          color="#818CF8" collapsed={collapsed}/>
            <NavItem icon={ClipboardCheck} label="Évaluations"           path="/evaluations"          color="#A78BFA" collapsed={collapsed}/>
            <NavItem icon={GraduationCap}  label="Formation & Dév"       path="/developpement"        color="#10B981" collapsed={collapsed}/>
            <NavItem icon={Clock}          label="Temps & Absences"      path="/temps-absences"       color="#34D399" collapsed={collapsed}/>
            <NavItem icon={RefreshCw}      label="Cycle RH"              path="/cycle-rh"             color="#C9A227" collapsed={collapsed}/>
            <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"         color="#8B5CF6" collapsed={collapsed}/>
            <NavItem icon={Gauge}          label="Analytics RH"          path="/analytics"            color="#6366F1" collapsed={collapsed}/>
            <NavItem icon={Target}         label="Hub OKR"               path="/okr"                  color="#A5B4FC" collapsed={collapsed}/>

            <Section label="Administration" collapsed={collapsed}/>
            <NavItem icon={Building2}      label="Organisation"          path="/admin/organisation"   color="#6B7280" collapsed={collapsed}/>
            <NavItem icon={ShieldCheck}    label="Accès & RBAC"          path="/admin/access-control" color="#EF4444" collapsed={collapsed}/>
            <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings"       color="#6B7280" collapsed={collapsed}/>
            <NavItem icon={Bell}           label="Notifications"         path="/admin/notifications"  color="#F59E0B" collapsed={collapsed}/>
            <NavItem icon={Zap}            label="API & Intégrations"    path="/admin/api-manager"    color="#06B6D4" collapsed={collapsed}/>

            <Section label="Multi-Tenant" collapsed={collapsed}/>
            <NavItem icon={Globe}          label="Organisations"         path="/super-admin"          color="#C9A227" collapsed={collapsed}/>

            <Section label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle}  label="Communication"         path="/communication"        color="#06B6D4" badge={unreadCount || null} collapsed={collapsed}/>
          </>
        )}

        {/* ═══ ADMINISTRATEUR ═══ */}
        {isAdmin && (
          <>
            <NavItem icon={LayoutDashboard} label="Tableau de Bord"     path="/dashboard"            color="#C9A227" collapsed={collapsed}/>

            <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>

            <Section label="Modules RH" collapsed={collapsed}/>
            <NavItem icon={UserSquare2}    label="Gestion Employés"      path="/employes"             color="#3B82F6" collapsed={collapsed}/>
            <NavItem icon={TrendingUp}     label="Performance"           path="/performance"          color="#818CF8" collapsed={collapsed}/>
            <NavItem icon={ClipboardCheck} label="Évaluations"           path="/evaluations"          color="#A78BFA" collapsed={collapsed}/>
            <NavItem icon={GraduationCap}  label="Formation & Dév"       path="/developpement"        color="#10B981" collapsed={collapsed}/>
            <NavItem icon={Clock}          label="Temps & Absences"      path="/temps-absences"       color="#34D399" collapsed={collapsed}/>
            <NavItem icon={RefreshCw}      label="Cycle RH"              path="/cycle-rh"             color="#C9A227" collapsed={collapsed}/>
            <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"         color="#8B5CF6" collapsed={collapsed}/>
            <NavItem icon={Gauge}          label="Analytics RH"          path="/analytics"            color="#6366F1" collapsed={collapsed}/>
            <NavItem icon={Target}         label="Hub OKR"               path="/okr"                  color="#A5B4FC" collapsed={collapsed}/>

            <Section label="Administration" collapsed={collapsed}/>
            <NavItem icon={Building2}      label="Organisation"          path="/admin/organisation"   color="#6B7280" collapsed={collapsed}/>
            <NavItem icon={ShieldCheck}    label="Accès & RBAC"          path="/admin/access-control" color="#EF4444" collapsed={collapsed}/>
            <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings"       color="#6B7280" collapsed={collapsed}/>
            <NavItem icon={Bell}           label="Notifications"         path="/admin/notifications"  color="#F59E0B" collapsed={collapsed}/>
            <NavItem icon={Zap}            label="API & Intégrations"    path="/admin/api-manager"    color="#06B6D4" collapsed={collapsed}/>

            <Section label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle}  label="Communication"         path="/communication"        color="#06B6D4" badge={unreadCount || null} collapsed={collapsed}/>
          </>
        )}

        {/* ═══ DIRECTEUR ═══ */}
        {isDirecteur && (
          <>
            <NavItem icon={LayoutDashboard} label="Tableau de Bord"     path="/dashboard"     color="#C9A227" collapsed={collapsed}/>

            <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>

            <Section label="Pilotage" collapsed={collapsed}/>
            <NavItem icon={Gauge}          label="Pilotage"              path="/pilotage"      color="#6366F1" collapsed={collapsed}/>
            <NavItem icon={Activity}       label="Performance org"       path="/performance"   color="#818CF8" collapsed={collapsed}/>
            <NavItem icon={ClipboardCheck} label="Évaluations"           path="/evaluations"   color="#A78BFA" collapsed={collapsed}/>
            <NavItem icon={GraduationCap}  label="Formation & Dév"       path="/developpement" color="#10B981" collapsed={collapsed}/>
            <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"  color="#8B5CF6" collapsed={collapsed}/>
            <NavItem icon={Gauge}          label="Analytics RH"          path="/analytics"     color="#6366F1" collapsed={collapsed}/>
            <NavItem icon={Target}         label="Hub OKR"               path="/okr"           color="#A5B4FC" collapsed={collapsed}/>

            <Section label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle}  label="Communication"         path="/communication" color="#06B6D4" badge={unreadCount || null} collapsed={collapsed}/>
            <Section label="Préférences" collapsed={collapsed}/>
            <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" color="#6B7280" collapsed={collapsed}/>
          </>
        )}

        {/* ═══ CHEF DE DIVISION ═══ */}
        {isChefDivision && (
          <>
            <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord"  path="/mon-tableau-de-bord" color="#C9A227" collapsed={collapsed}/>

            <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>

            <Section label="Ma Division" collapsed={collapsed}/>
            <NavItem icon={Briefcase}      label="Ma Division"           path="/ma-division"   color="#6366F1" collapsed={collapsed}/>
            <NavItem icon={Users}          label="Mon Équipe"            path="/mon-equipe"     color="#3B82F6" collapsed={collapsed}/>
            <NavItem icon={TrendingUp}     label="Performance division"  path="/performance"    color="#818CF8" collapsed={collapsed}/>
            <NavItem icon={ClipboardCheck} label="Évaluations division"  path="/evaluations"    color="#A78BFA" collapsed={collapsed}/>
            <NavItem icon={GraduationCap}  label="Formation division"    path="/developpement"  color="#10B981" collapsed={collapsed}/>
            <NavItem icon={Clock}          label="Temps & Congés"        path="/temps-absences" color="#34D399" collapsed={collapsed}/>
            <NavItem icon={CheckSquare}    label="Validations"           path="/validations" color="#10B981" collapsed={collapsed}/>
            <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"   color="#8B5CF6" collapsed={collapsed}/>
            <NavItem icon={Wallet}         label="Compensation équipe"   path="/compensation?tab=team" color="#34D399" collapsed={collapsed}/>

            <Section label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle}  label="Communication"         path="/communication"  color="#06B6D4" badge={unreadCount || null} collapsed={collapsed}/>
            <Section label="Préférences" collapsed={collapsed}/>
            <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" color="#6B7280" collapsed={collapsed}/>
          </>
        )}

        {/* ═══ CHEF DE SERVICE ═══ */}
        {isChefService && (
          <>
            <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord"  path="/mon-tableau-de-bord" color="#C9A227" collapsed={collapsed}/>

            <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>

            <Section label="Mon Service" collapsed={collapsed}/>
            <NavItem icon={Briefcase}      label="Mon Service"           path="/mon-service"   color="#6366F1" collapsed={collapsed}/>
            <NavItem icon={Users}          label="Mon Équipe"            path="/mon-equipe"     color="#3B82F6" collapsed={collapsed}/>
            <NavItem icon={TrendingUp}     label="Performance équipe"    path="/performance"    color="#818CF8" collapsed={collapsed}/>
            <NavItem icon={ClipboardCheck} label="Évaluations équipe"    path="/evaluations"    color="#A78BFA" collapsed={collapsed}/>
            <NavItem icon={GraduationCap}  label="Formation équipe"      path="/developpement"  color="#10B981" collapsed={collapsed}/>
            <NavItem icon={Clock}          label="Temps & Congés"        path="/temps-absences" color="#34D399" collapsed={collapsed}/>
            <NavItem icon={CheckSquare}    label="Validations"           path="/validations" color="#10B981" collapsed={collapsed}/>
            <NavItem icon={Target}         label="Hub OKR"               path="/okr"            color="#A5B4FC" collapsed={collapsed}/>

            <Section label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle}  label="Communication"         path="/communication"  color="#06B6D4" badge={unreadCount || null} collapsed={collapsed}/>
            <Section label="Préférences" collapsed={collapsed}/>
            <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" color="#6B7280" collapsed={collapsed}/>
          </>
        )}

        {/* ═══ COLLABORATEUR ═══ */}
        {isCollab && (
          <>
            <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord"  path="/mon-tableau-de-bord" color="#C9A227" collapsed={collapsed}/>

            <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>

            <Section label="Communication" collapsed={collapsed}/>
            <NavItem icon={MessageCircle}  label="Communication"         path="/communication"  color="#06B6D4" badge={unreadCount || null} collapsed={collapsed}/>
            <Section label="Préférences" collapsed={collapsed}/>
            <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" color="#6B7280" collapsed={collapsed}/>
          </>
        )}

      </nav>

      {/* Profil utilisateur */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-2 flex-shrink-0">
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
