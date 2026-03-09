// ============================================================
// APEX RH — ManagementHub.jsx · Réorg UX Hub & Spoke
// Hub management — accessible aux managers et supérieurs
//   Mon Équipe · Formation équipe · Compensation équipe
// Entretiens Annuels a son entrée dédiée dans la sidebar
// ============================================================
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { ROLES } from '../../utils/constants'
import {
  Users, GraduationCap, DollarSign,
  TrendingUp, ArrowRight, Shield,
} from 'lucide-react'

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
        <span>Accéder</span>
        <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform duration-200"/>
      </div>
    </motion.div>
  )
}

export default function ManagementHub() {
  const { profile } = useAuth()
  const { hasRole } = usePermission()
  const isChefDivision = hasRole(ROLES.CHEF_DIVISION)
  const isChefService = hasRole(ROLES.CHEF_SERVICE)
  const { can } = usePermission()
  const canManageOrg = can('intelligence', 'overview', 'read')
  const hasStrategic = can('intelligence', 'succession', 'read')
  const isAdmin = can('admin', 'users', 'read')
  const isSuperAdmin = can('admin', ROLES.SUPER_ADMIN, 'admin')
  const firstName   = profile?.first_name || ''
  const role        = profile?.role

  // Label adapté au rôle
  const teamLabel = isChefDivision ? 'Ma Division'
    : isChefService ? 'Mon Service'
    : 'Mon Équipe'

  // Formation admin & comp admin : canManageOrg + chef_division
  const canFormationAdmin   = canManageOrg || isChefDivision
  const canCompensationAdmin = canManageOrg

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 200px)' }}>

      <div className="px-6 pt-8 pb-6">

        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Shield size={16} style={{ color: '#3B82F6' }}/>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}>Management</h1>
              <p className="text-sm text-white/35">Piloter, former et valoriser votre équipe.</p>
            </div>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <HubCard
            icon={Users} label={teamLabel} color="#3B82F6"
            description="Vue complète des collaborateurs : performance, objectifs, feedbacks et suivi individuel."
            path="/mon-equipe"
          />

          {canFormationAdmin && (
            <HubCard
              icon={GraduationCap} label="Formation équipe" color="#10B981"
              description="Catalogue, plans de formation, certifications et tableau de bord équipe."
              path="/formation"
              badge="Équipe"
            />
          )}

          {canCompensationAdmin && (
            <HubCard
              icon={DollarSign} label="Compensation équipe" color="#34D399"
              description="Rémunérations, benchmark marché et gestion des révisions salariales."
              path="/compensation"
              badge="Équipe"
            />
          )}

          {hasStrategic && (
            <HubCard
              icon={TrendingUp} label="Intelligence RH" color="#8B5CF6"
              description="Analytiques d'équipe, prédictifs, évaluations 360° et cartographie des talents."
              path="/intelligence"
            />
          )}

        </div>
      </div>
    </motion.div>
  )
}
