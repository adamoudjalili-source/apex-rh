// ============================================================
// APEX RH — Sidebar.jsx · S134
// Design Glacé #7 — fond bleu nuit iceberg, accents bleu froid
// Logo NITA intact — architecture nav INCHANGÉE
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
import { ROLE_COLORS, ROLE_LABELS }      from '../../lib/roles'
import logoNita from '../../assets/logo-nita.png'

// ─── NavItem Glacé ───────────────────────────────────────────
function NavItem({ icon: Icon, label, path, collapsed, color, badge, indent = false }) {
  return (
    <NavLink to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group ${
          indent ? 'ml-3' : ''
        } ${isActive ? 'text-white' : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'}`
      }>
      {({ isActive }) => (
        <>
          {/* Fond actif — glass bleu froid */}
          {isActive && (
            <motion.div layoutId="nav-active-hub"
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background:'rgba(14,165,233,.12)', backdropFilter:'blur(12px)' }}
              transition={{ type:'spring', stiffness:500, damping:30 }}/>
          )}
          {/* Barre active — bleu glacé */}
          {isActive && (
            <motion.div
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
              style={{
                background:'linear-gradient(180deg, #38BDF8, rgba(56,189,248,.3))',
                boxShadow:'0 0 8px rgba(56,189,248,.60)',
              }}
              transition={{ type:'spring', stiffness:500, damping:30 }}/>
          )}
          {/* Icône */}
          <div className="relative flex-shrink-0 z-10">
            <Icon size={indent ? 15 : 17}
              style={isActive ? { color:'#7DD3FC', filter:'drop-shadow(0 0 6px rgba(56,189,248,.55))' } : undefined}/>
            {badge > 0 && collapsed && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background:'#0EA5E9', padding:'0 2px' }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          {/* Label */}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.15 }}
                className={`font-medium truncate flex-1 relative z-10 ${indent ? 'text-xs' : 'text-sm'}`}
                style={isActive ? { color:'#E0F2FE' } : undefined}>
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {/* Badge */}
          {!collapsed && badge > 0 && (
            <motion.span initial={{ scale:0 }} animate={{ scale:1 }}
              className="ml-auto min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 relative z-10"
              style={{ background:'linear-gradient(135deg,#0EA5E9,#0284C7)', padding:'0 4px' }}>
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ─── Section label Glacé ─────────────────────────────────────
function Section({ label, collapsed }) {
  if (collapsed) return (
    <div style={{ height:1, margin:'8px 12px',
      background:'linear-gradient(90deg, transparent, rgba(56,189,248,.18), transparent)' }}/>
  )
  return (
    <p style={{
      fontSize:9, fontWeight:700, letterSpacing:'0.14em',
      textTransform:'uppercase', padding:'10px 12px 4px',
      color:'rgba(125,211,252,.35)',
    }}>
      {label}
    </p>
  )
}

// ─── MonEspace — identique pour tous les profils ─────────────
function MonEspace({ collapsed, pulseOn }) {
  return (
    <>
      <Section label="Mon Espace" collapsed={collapsed}/>
      <NavItem icon={Briefcase}     label="Mon Travail"        path="/mon-travail"       color="#38BDF8" collapsed={collapsed}/>
      <NavItem icon={UserCircle2}   label="Mon Profil"         path="/mon-profil"        color="#7DD3FC" collapsed={collapsed}/>
      <NavItem icon={Clock}         label="Mon suivi du temps de travail" path="/mon-suivi-temps"   color="#BAE6FD" collapsed={collapsed}/>
      <NavItem icon={CalendarDays}  label="Mes Congés"         path="/mes-conges"        color="#6EE7B7" collapsed={collapsed}/>
      <NavItem icon={GraduationCap} label="Mon Développement"  path="/mon-developpement" color="#A5B4FC" collapsed={collapsed}/>
      <NavItem icon={ClipboardList} label="Mes Entretiens"     path="/mes-entretiens"    color="#C4B5FD" collapsed={collapsed}/>
      <NavItem icon={RefreshCw}     label="Mon Suivi RH"       path="/mon-suivi-rh"      color="#FDE68A" collapsed={collapsed}/>
      <NavItem icon={Wallet}        label="Ma Rémunération"    path="/ma-remuneration"   color="#FDE68A" collapsed={collapsed}/>
      <NavItem icon={Trophy}        label="Récompenses"        path="/engagement"        color="#FDE68A" collapsed={collapsed}/>
      {pulseOn && (
        <NavItem icon={Activity}    label="Ma Performance"     path="/ma-performance"    color="#7DD3FC" collapsed={collapsed}/>
      )}
    </>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────
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
      className="relative flex flex-col h-screen overflow-hidden flex-shrink-0"
      style={{
        // Fond Glacé — bleu nuit iceberg, légèrement plus chaud que les pages
        background:'linear-gradient(180deg, #010D1A 0%, #010B16 50%, #010912 100%)',
        borderRight:'1px solid rgba(56,189,248,.10)',
      }}>

      {/* Ligne de réfraction glaciaire en haut */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2,
        background:'linear-gradient(90deg, transparent, rgba(56,189,248,.45), rgba(186,230,253,.30), transparent)',
      }}/>

      {/* Halo latéral gauche discret */}
      <div style={{
        position:'absolute', top:'15%', left:'-30%',
        width:'80%', height:'50%',
        background:'radial-gradient(ellipse, rgba(14,165,233,.10) 0%, transparent 70%)',
        filter:'blur(30px)', pointerEvents:'none',
      }}/>

      {/* Logo NITA — INTACT */}
      <div style={{ borderBottom:'1px solid rgba(56,189,248,.08)', flexShrink:0, overflow:'hidden' }}>
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div key="full"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.18 }}>
              <img src={logoNita} alt="NITA" className="w-full h-auto"/>
            </motion.div>
          ) : (
            <motion.div key="icon"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.18 }}
              className="flex items-center justify-center h-16">
              <img src={logoNita} alt="NITA" className="w-10 h-10 object-contain"/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden space-y-0.5">

        {/* ═══ SUPER ADMINISTRATEUR ═══ */}
        {isSuperAdmin && (<>
          <NavItem icon={LayoutDashboard} label="Tableau de Bord"     path="/dashboard"            collapsed={collapsed}/>
          <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>
          <Section label="Modules RH" collapsed={collapsed}/>
          <NavItem icon={UserSquare2}    label="Gestion Employés"      path="/employes"             collapsed={collapsed}/>
          <NavItem icon={TrendingUp}     label="Performance"           path="/performance"          collapsed={collapsed}/>
          <NavItem icon={ClipboardCheck} label="Évaluations"           path="/evaluations"          collapsed={collapsed}/>
          <NavItem icon={GraduationCap}  label="Formation & Dév"       path="/developpement"        collapsed={collapsed}/>
          <NavItem icon={Clock}          label="Temps & Absences"      path="/temps-absences"       collapsed={collapsed}/>
          <NavItem icon={RefreshCw}      label="Cycle RH"              path="/cycle-rh"             collapsed={collapsed}/>
          <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"         collapsed={collapsed}/>
          <NavItem icon={Gauge}          label="Analytics RH"          path="/analytics"            collapsed={collapsed}/>
          <NavItem icon={Target}         label="Hub OKR"               path="/okr"                  collapsed={collapsed}/>
          <Section label="Administration" collapsed={collapsed}/>
          <NavItem icon={Building2}      label="Organisation"          path="/admin/organisation"   collapsed={collapsed}/>
          <NavItem icon={ShieldCheck}    label="Accès & RBAC"          path="/admin/access-control" collapsed={collapsed}/>
          <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings"       collapsed={collapsed}/>
          <NavItem icon={Bell}           label="Notifications"         path="/admin/notifications"  collapsed={collapsed}/>
          <NavItem icon={Zap}            label="API & Intégrations"    path="/admin/api-manager"    collapsed={collapsed}/>
          <Section label="Multi-Tenant" collapsed={collapsed}/>
          <NavItem icon={Globe}          label="Organisations"         path="/super-admin"          collapsed={collapsed}/>
          <Section label="Communication" collapsed={collapsed}/>
          <NavItem icon={MessageCircle}  label="Communication"         path="/communication"        badge={unreadCount||null} collapsed={collapsed}/>
        </>)}

        {/* ═══ ADMINISTRATEUR ═══ */}
        {isAdmin && (<>
          <NavItem icon={LayoutDashboard} label="Tableau de Bord"     path="/dashboard"            collapsed={collapsed}/>
          <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>
          <Section label="Modules RH" collapsed={collapsed}/>
          <NavItem icon={UserSquare2}    label="Gestion Employés"      path="/employes"             collapsed={collapsed}/>
          <NavItem icon={TrendingUp}     label="Performance"           path="/performance"          collapsed={collapsed}/>
          <NavItem icon={ClipboardCheck} label="Évaluations"           path="/evaluations"          collapsed={collapsed}/>
          <NavItem icon={GraduationCap}  label="Formation & Dév"       path="/developpement"        collapsed={collapsed}/>
          <NavItem icon={Clock}          label="Temps & Absences"      path="/temps-absences"       collapsed={collapsed}/>
          <NavItem icon={RefreshCw}      label="Cycle RH"              path="/cycle-rh"             collapsed={collapsed}/>
          <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"         collapsed={collapsed}/>
          <NavItem icon={Gauge}          label="Analytics RH"          path="/analytics"            collapsed={collapsed}/>
          <NavItem icon={Target}         label="Hub OKR"               path="/okr"                  collapsed={collapsed}/>
          <Section label="Administration" collapsed={collapsed}/>
          <NavItem icon={Building2}      label="Organisation"          path="/admin/organisation"   collapsed={collapsed}/>
          <NavItem icon={ShieldCheck}    label="Accès & RBAC"          path="/admin/access-control" collapsed={collapsed}/>
          <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings"       collapsed={collapsed}/>
          <NavItem icon={Bell}           label="Notifications"         path="/admin/notifications"  collapsed={collapsed}/>
          <NavItem icon={Zap}            label="API & Intégrations"    path="/admin/api-manager"    collapsed={collapsed}/>
          <Section label="Communication" collapsed={collapsed}/>
          <NavItem icon={MessageCircle}  label="Communication"         path="/communication"        badge={unreadCount||null} collapsed={collapsed}/>
        </>)}

        {/* ═══ DIRECTEUR ═══ */}
        {isDirecteur && (<>
          <NavItem icon={LayoutDashboard} label="Tableau de Bord"     path="/dashboard"     collapsed={collapsed}/>
          <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>
          <Section label="Pilotage" collapsed={collapsed}/>
          <NavItem icon={Gauge}          label="Pilotage"              path="/pilotage"      collapsed={collapsed}/>
          <NavItem icon={Activity}       label="Performance org"       path="/performance"   collapsed={collapsed}/>
          <NavItem icon={ClipboardCheck} label="Évaluations"           path="/evaluations"   collapsed={collapsed}/>
          <NavItem icon={GraduationCap}  label="Formation & Dév"       path="/developpement" collapsed={collapsed}/>
          <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"  collapsed={collapsed}/>
          <NavItem icon={Gauge}          label="Analytics RH"          path="/analytics"     collapsed={collapsed}/>
          <NavItem icon={Target}         label="Hub OKR"               path="/okr"           collapsed={collapsed}/>
          <Section label="Communication" collapsed={collapsed}/>
          <NavItem icon={MessageCircle}  label="Communication"         path="/communication" badge={unreadCount||null} collapsed={collapsed}/>
          <Section label="Préférences" collapsed={collapsed}/>
          <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" collapsed={collapsed}/>
        </>)}

        {/* ═══ CHEF DE DIVISION ═══ */}
        {isChefDivision && (<>
          <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord"  path="/mon-tableau-de-bord" collapsed={collapsed}/>
          <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>
          <Section label="Ma Division" collapsed={collapsed}/>
          <NavItem icon={Briefcase}      label="Ma Division"           path="/ma-division"   collapsed={collapsed}/>
          <NavItem icon={Users}          label="Mon Équipe"            path="/mon-equipe"     collapsed={collapsed}/>
          <NavItem icon={TrendingUp}     label="Performance division"  path="/performance"    collapsed={collapsed}/>
          <NavItem icon={ClipboardCheck} label="Évaluations division"  path="/evaluations"    collapsed={collapsed}/>
          <NavItem icon={GraduationCap}  label="Formation division"    path="/developpement"  collapsed={collapsed}/>
          <NavItem icon={Clock}          label="Temps & Congés"        path="/temps-absences" collapsed={collapsed}/>
          <NavItem icon={CheckSquare}    label="Validations"           path="/validations"    collapsed={collapsed}/>
          <NavItem icon={BarChart3}      label="Intelligence RH"       path="/intelligence"   collapsed={collapsed}/>
          <NavItem icon={Wallet}         label="Compensation équipe"   path="/compensation?tab=team" collapsed={collapsed}/>
          <Section label="Communication" collapsed={collapsed}/>
          <NavItem icon={MessageCircle}  label="Communication"         path="/communication"  badge={unreadCount||null} collapsed={collapsed}/>
          <Section label="Préférences" collapsed={collapsed}/>
          <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" collapsed={collapsed}/>
        </>)}

        {/* ═══ CHEF DE SERVICE ═══ */}
        {isChefService && (<>
          <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord"  path="/mon-tableau-de-bord" collapsed={collapsed}/>
          <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>
          <Section label="Mon Service" collapsed={collapsed}/>
          <NavItem icon={Briefcase}      label="Mon Service"           path="/mon-service"   collapsed={collapsed}/>
          <NavItem icon={Users}          label="Mon Équipe"            path="/mon-equipe"     collapsed={collapsed}/>
          <NavItem icon={TrendingUp}     label="Performance équipe"    path="/performance"    collapsed={collapsed}/>
          <NavItem icon={ClipboardCheck} label="Évaluations équipe"    path="/evaluations"    collapsed={collapsed}/>
          <NavItem icon={GraduationCap}  label="Formation équipe"      path="/developpement"  collapsed={collapsed}/>
          <NavItem icon={Clock}          label="Temps & Congés"        path="/temps-absences" collapsed={collapsed}/>
          <NavItem icon={CheckSquare}    label="Validations"           path="/validations"    collapsed={collapsed}/>
          <NavItem icon={Target}         label="Hub OKR"               path="/okr"            collapsed={collapsed}/>
          <Section label="Communication" collapsed={collapsed}/>
          <NavItem icon={MessageCircle}  label="Communication"         path="/communication"  badge={unreadCount||null} collapsed={collapsed}/>
          <Section label="Préférences" collapsed={collapsed}/>
          <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" collapsed={collapsed}/>
        </>)}

        {/* ═══ COLLABORATEUR ═══ */}
        {isCollab && (<>
          <NavItem icon={LayoutDashboard} label="Mon Tableau de Bord"  path="/mon-tableau-de-bord" collapsed={collapsed}/>
          <MonEspace collapsed={collapsed} pulseOn={pulseOn}/>
          <Section label="Communication" collapsed={collapsed}/>
          <NavItem icon={MessageCircle}  label="Communication"         path="/communication"  badge={unreadCount||null} collapsed={collapsed}/>
          <Section label="Préférences" collapsed={collapsed}/>
          <NavItem icon={Settings}       label="Paramètres"            path="/admin/settings" collapsed={collapsed}/>
        </>)}

      </nav>

      {/* Profil utilisateur — Glacé */}
      <div style={{ padding:'12px', borderTop:'1px solid rgba(56,189,248,.08)', flexShrink:0 }}
        className="space-y-1.5">
        <div style={{
          borderRadius:14, padding:'10px 12px',
          background:'rgba(14,165,233,.08)',
          backdropFilter:'blur(20px)',
          border:'1px solid rgba(56,189,248,.14)',
          display:'flex', alignItems:'center', gap:10, overflow:'hidden',
        }}>
          <div style={{
            width:32, height:32, borderRadius:10, flexShrink:0,
            background:`linear-gradient(135deg, ${ROLE_COLORS[role]||'#0EA5E9'}, ${ROLE_COLORS[role]||'#0EA5E9'}88)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700, color:'white', textTransform:'uppercase',
          }}>{initiale}</div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.18 }} style={{ overflow:'hidden', flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#E0F2FE',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2, marginBottom:2 }}>
                  {fullName}
                </p>
                <p style={{ fontSize:10, fontWeight:500,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  color: ROLE_COLORS[role] || '#38BDF8' }}>
                  {ROLE_LABELS[role] || role}
                </p>
                {pulseOn && todayScore && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                    <span style={{ fontSize:9, color:'rgba(186,230,253,.30)' }}>PULSE</span>
                    <span style={{ fontSize:11, fontWeight:900, color:getScoreColor(todayScore.score_total) }}>
                      {todayScore.score_total}%
                    </span>
                    <div style={{ flex:1, height:3, borderRadius:3, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, transition:'width .5s',
                        width:`${todayScore.score_total}%`, background:getScoreColor(todayScore.score_total) }}/>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          style={{ width:'100%', borderRadius:10, padding:'8px 12px',
            display:'flex', alignItems:'center', gap:10, transition:'all .2s',
            color:'rgba(255,255,255,.25)', background:'transparent', border:'none', cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color='#FCA5A5'; e.currentTarget.style.background='rgba(239,68,68,.06)' }}
          onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,.25)'; e.currentTarget.style.background='transparent' }}>
          <LogOut size={16} style={{ flexShrink:0 }}/>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.18 }} style={{ fontSize:13 }}>
                Déconnexion
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Bouton collapse — Glacé */}
      <button onClick={() => setCollapsed(c => !c)} style={{
        position:'absolute', top:'50%', right:-13, transform:'translateY(-50%)',
        width:26, height:26, borderRadius:'50%',
        background:'rgba(2,14,26,.90)',
        backdropFilter:'blur(20px)',
        border:'1px solid rgba(56,189,248,.28)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'rgba(125,211,252,.55)',
        cursor:'pointer', zIndex:10, transition:'all .2s',
        boxShadow:'0 0 12px rgba(14,165,233,.20)',
      }}
        onMouseEnter={e => { e.currentTarget.style.color='#38BDF8'; e.currentTarget.style.borderColor='rgba(56,189,248,.60)'; e.currentTarget.style.boxShadow='0 0 18px rgba(14,165,233,.40)' }}
        onMouseLeave={e => { e.currentTarget.style.color='rgba(125,211,252,.55)'; e.currentTarget.style.borderColor='rgba(56,189,248,.28)'; e.currentTarget.style.boxShadow='0 0 12px rgba(14,165,233,.20)' }}>
        {collapsed ? <ChevronRight size={11}/> : <ChevronLeft size={11}/>}
      </button>
    </motion.aside>
  )
}
