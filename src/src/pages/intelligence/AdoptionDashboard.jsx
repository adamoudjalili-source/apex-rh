// ============================================================
// APEX RH — AdoptionDashboard.jsx  ·  Session 40
// Tableau de bord d'adoption interne — visible admin/directeur
// Intégré dans IntelligenceRH.jsx comme onglet "Adoption"
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAdoptionSummary } from '../../hooks/usePerformanceHistory'
import { Users, Activity, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react'

const fadeUp = { hidden:{ opacity:0, y:8 }, visible:{ opacity:1, y:0, transition:{ duration:0.3 } } }
const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.05 } } }

// ─── KPI card ────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, subtitle, color }) {
  return (
    <motion.div variants={fadeUp}
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}15`, border:`1px solid ${color}25` }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-sm font-medium text-white/60">{label}</p>
        {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  )
}

// ─── Barre d'adoption ────────────────────────────────────────
function AdoptionBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}/>
      </div>
      <span className="text-[11px] text-white/40 w-8 text-right">{value}</span>
    </div>
  )
}

// ─── Badge rôle ──────────────────────────────────────────────
const ROLE_COLORS = {
  administrateur: { bg:'rgba(79,70,229,0.15)', color:'#4F46E5', label:'Admin' },
  directeur:      { bg:'rgba(139,92,246,0.15)', color:'#8B5CF6', label:'Directeur' },
  chef_division:  { bg:'rgba(59,130,246,0.15)', color:'#3B82F6', label:'Chef Div.' },
  chef_service:   { bg:'rgba(16,185,129,0.15)', color:'#10B981', label:'Chef Svc' },
  collaborateur:  { bg:'rgba(245,158,11,0.15)', color:'#F59E0B', label:'Collab.' },
}

function RoleBadge({ role }) {
  const cfg = ROLE_COLORS[role] || ROLE_COLORS.collaborateur
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background:cfg.bg, color:cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ─── Score adoption individuel ────────────────────────────────
function adoptionScore(user) {
  let score = 0
  if (user.active_days_30 >= 15) score += 40
  else if (user.active_days_30 >= 7) score += 20
  else if (user.active_days_30 >= 1) score += 10

  if (user.pages_visited >= 5) score += 25
  else if (user.pages_visited >= 3) score += 15
  else if (user.pages_visited >= 1) score += 5

  if (user.onboarding_steps_total > 0) {
    score += Math.round((user.onboarding_steps_done / user.onboarding_steps_total) * 25)
  }

  if (user.pulse_days_this_month >= 10) score += 10
  else if (user.pulse_days_this_month >= 5) score += 5

  return Math.min(100, score)
}

function getAdoptionLabel(score) {
  if (score >= 80) return { label:'Actif', color:'#10B981' }
  if (score >= 50) return { label:'En cours', color:'#F59E0B' }
  if (score >= 20) return { label:'Démarré', color:'#4F46E5' }
  return { label:'Inactif', color:'#EF4444' }
}

// ─── Tableau utilisateurs ────────────────────────────────────
function UserRow({ user, maxDays }) {
  const score = adoptionScore(user)
  const lbl   = getAdoptionLabel(score)
  const last  = user.last_seen
    ? new Date(user.last_seen).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
    : '—'

  return (
    <motion.tr variants={fadeUp}
      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4">
        <div>
          <p className="text-sm font-medium text-white">
            {user.first_name} {user.last_name}
          </p>
          {user.service_name && (
            <p className="text-xs text-white/30">{user.service_name}</p>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <RoleBadge role={user.role}/>
      </td>
      <td className="py-3 px-4">
        <AdoptionBar value={user.active_days_30} max={maxDays} color="#4F46E5"/>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm text-white/60">{user.pages_visited}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm text-white/60">{user.pulse_days_this_month}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-xs text-white/40">{last}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ background:`${lbl.color}18`, color:lbl.color }}>
          {lbl.label}
        </span>
      </td>
    </motion.tr>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function AdoptionDashboard() {
  const { data: users = [], isLoading } = useAdoptionSummary()
  const [sortKey, setSortKey]           = useState('active_days_30')
  const [filter, setFilter]            = useState('all')

  const sorted = [...users]
    .filter(u => filter === 'all' || getAdoptionLabel(adoptionScore(u)).label.toLowerCase() === filter)
    .sort((a, b) => {
      if (sortKey === 'score')         return adoptionScore(b) - adoptionScore(a)
      if (sortKey === 'active_days_30') return (b.active_days_30||0) - (a.active_days_30||0)
      if (sortKey === 'pulse_days')    return (b.pulse_days_this_month||0) - (a.pulse_days_this_month||0)
      return 0
    })

  const maxDays = Math.max(...users.map(u => u.active_days_30 || 0), 1)
  const totalActive   = users.filter(u => (u.active_days_30||0) >= 5).length
  const totalOnboarded = users.filter(u =>
    u.onboarding_steps_total > 0 && u.onboarding_steps_done >= u.onboarding_steps_total
  ).length
  const avgPulseDays   = users.length
    ? Math.round(users.reduce((s,u)=>s+(u.pulse_days_this_month||0),0)/users.length) : 0
  const adoptionRate   = users.length
    ? Math.round((totalActive/users.length)*100) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin"/>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto px-6 py-5 space-y-6">

      {/* KPIs */}
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          Vue globale — 30 derniers jours
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={Users}       label="Utilisateurs actifs"   value={`${totalActive}/${users.length}`} subtitle="≥ 5 jours de connexion"  color="#4F46E5"/>
          <KpiCard icon={TrendingUp}  label="Taux d'adoption"       value={`${adoptionRate}%`}               subtitle="Actifs / Total"          color="#10B981"/>
          <KpiCard icon={CheckCircle} label="Onboarding complété"   value={`${totalOnboarded}`}              subtitle={`sur ${users.length} utilisateurs`} color="#8B5CF6"/>
          <KpiCard icon={Activity}    label="PULSE moy. ce mois"    value={`${avgPulseDays}j`}               subtitle="Jours de soumission"     color="#F59E0B"/>
        </div>
      </motion.div>

      {/* Barre adoption globale */}
      <motion.div variants={fadeUp}
        className="rounded-2xl p-5 border border-white/[0.06]"
        style={{ background:'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Répartition par statut</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Actifs',    key:'actif',    color:'#10B981' },
            { label:'En cours',  key:'en cours', color:'#F59E0B' },
            { label:'Démarrés',  key:'démarré',  color:'#4F46E5' },
            { label:'Inactifs',  key:'inactif',  color:'#EF4444' },
          ].map(s => {
            const cnt = users.filter(u =>
              getAdoptionLabel(adoptionScore(u)).label.toLowerCase() === s.key
            ).length
            const pct = users.length ? Math.round((cnt/users.length)*100) : 0
            return (
              <div key={s.key} className="rounded-xl p-3"
                style={{ background:`${s.color}08`, border:`1px solid ${s.color}18` }}>
                <p className="text-2xl font-black mb-0.5" style={{ color:s.color }}>{cnt}</p>
                <p className="text-[11px] text-white/60">{s.label}</p>
                <p className="text-[10px] text-white/30">{pct}%</p>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Tableau détaillé */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Détail par utilisateur</p>
          <div className="flex items-center gap-2">
            {/* Filtre */}
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              className="text-[11px] px-2 py-1.5 rounded-lg text-white/60 outline-none"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <option value="all">Tous</option>
              <option value="actif">Actifs</option>
              <option value="en cours">En cours</option>
              <option value="inactif">Inactifs</option>
            </select>
            {/* Tri */}
            <select value={sortKey} onChange={e=>setSortKey(e.target.value)}
              className="text-[11px] px-2 py-1.5 rounded-lg text-white/60 outline-none"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <option value="active_days_30">Trier: Connexions</option>
              <option value="score">Trier: Score</option>
              <option value="pulse_days">Trier: PULSE</option>
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-2xl p-10 border border-dashed border-white/[0.08] text-center">
            <AlertCircle size={28} className="text-white/15 mx-auto mb-2"/>
            <p className="text-sm text-white/25">
              Aucune donnée d'adoption disponible.
              <br/>
              <span className="text-[11px]">Exécutez migration_s40_onboarding.sql dans Supabase.</span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06]"
            style={{ background:'rgba(255,255,255,0.01)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]"
                  style={{ background:'rgba(255,255,255,0.02)' }}>
                  {['Utilisateur','Rôle','Connexions (30j)','Pages','PULSE','Dernière vue','Statut'].map(h=>(
                    <th key={h} className="py-3 px-4 text-left text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={stagger} initial="hidden" animate="visible">
                {sorted.map(u => <UserRow key={u.user_id} user={u} maxDays={maxDays}/>)}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
