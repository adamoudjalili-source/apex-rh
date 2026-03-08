// ============================================================
// APEX RH — AdministrationHub.jsx · Réorg UX Hub & Spoke
// Hub administration — accessible aux admins uniquement
// Session 91 — Ajout carte "Contrôle d'accès" (Matrice RBAC + Journal)
//   Utilisateurs · Organisation · Contrôle d'accès · API & Connecteurs · Paramètres · Super Admin
// ============================================================
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserCog, Building2, Plug, Settings, ShieldCheck, ArrowRight, KeyRound,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const fadeUp  = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } } }

function HubCard({ icon: Icon, label, description, path, color, badge }) {
  const navigate = useNavigate()
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={() => navigate(path)}
      className="relative rounded-2xl p-5 cursor-pointer group transition-all overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}0d 0%, ${color}05 100%)`, border: `1px solid ${color}22` }}>
      <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }}/>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-[15px] font-bold text-white leading-tight">{label}</h3>
        {badge && (
          <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[12px] text-white/35 leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: `${color}99` }}>
        <span>Gérer</span>
        <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform duration-200"/>
      </div>
    </motion.div>
  )
}

export default function AdministrationHub() {
  const { isSuperAdmin } = useAuth()
  return (
    <motion.div
      variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.04) 0%, transparent 200px)' }}>

      <div className="px-6 pt-8 pb-6">

        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <ShieldCheck size={16} style={{ color: '#EF4444' }}/>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}>Administration</h1>
              <p className="text-sm text-white/35">Configuration, utilisateurs et gestion de la plateforme.</p>
            </div>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <HubCard
            icon={UserCog} label="Utilisateurs" color="#EF4444"
            description="Créer, modifier et gérer les comptes collaborateurs, rôles et permissions."
            path="/admin/users"
          />

          <HubCard
            icon={Building2} label="Organisation" color="#F97316"
            description="Structure de l'entreprise, divisions, services et hiérarchie."
            path="/admin/organisation"
          />

          <HubCard
            icon={KeyRound} label="Contrôle d'accès" color="#F59E0B"
            description="Matrice des permissions par rôle et journal d'audit RBAC."
            path="/admin/access-control"
            badge="S91"
          />

          <HubCard
            icon={Plug} label="API & Connecteurs" color="#8B5CF6"
            description="Intégrations tierces, webhooks, clés API et connecteurs de données."
            path="/admin/api-manager"
            badge="S53"
          />

          <HubCard
            icon={Settings} label="Paramètres" color="#6B7280"
            description="Configuration générale de la plateforme, modules activables et préférences."
            path="/admin/settings"
          />

          {isSuperAdmin && (
            <HubCard
              icon={ShieldCheck} label="Super Admin" color="#C9A227"
              description="Gestion multi-tenant, organisations et configuration avancée."
              path="/admin/super-admin"
              badge="Multi-tenant"
            />
          )}

        </div>
      </div>
    </motion.div>
  )
}
