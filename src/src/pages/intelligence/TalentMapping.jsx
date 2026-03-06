// ============================================================
// APEX RH — src/pages/intelligence/TalentMapping.jsx
// Session 51 — Succession Planning & Cartographie 9-Box
//
// Onglets :
//   1. Cartographie 9-Box — NineBoxGrid + stats hauts potentiels
//   2. Postes Clés — liste + gestion successeurs
//   3. Rapport Risques — postes sans successeur identifié
//
// Accès : managers + admin (isAdmin || isDirecteur || isChefDivision || isChefService)
// Graphiques : SVG pur
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Grid3x3, Shield, AlertTriangle, Plus, ChevronRight,
  Users, TrendingUp, Zap, Eye, Pencil, Archive,
  RefreshCw, Filter, Clock, Check,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNineBoxStats, NINEBOX_CELLS } from '../../hooks/useTalentNineBox'
import {
  useKeyPositions,
  usePositionsAtRisk,
  useArchiveKeyPosition,
  CRITICALITY_CONFIG,
  READINESS_CONFIG,
} from '../../hooks/useSuccessionPlanning'
import NineBoxGrid from '../../components/talent/NineBoxGrid'
import SuccessionModal from '../../components/talent/SuccessionModal'
import KeyPositionForm from '../../components/talent/KeyPositionForm'
import EmptyState from '../../components/ui/EmptyState'

// ─── Animations ──────────────────────────────────────────────
const fadeUp  = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }

// ─── Skeleton ────────────────────────────────────────────────
function Sk({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sublabel }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl p-3 flex flex-col gap-1"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} />
        <span className="text-[10px] text-white/40">{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sublabel && <div className="text-[9px] text-white/25">{sublabel}</div>}
    </div>
  )
}

// ─── Readiness badge ─────────────────────────────────────────
function ReadinessBadge({ level, compact = false }) {
  const cfg = READINESS_CONFIG[level] || READINESS_CONFIG.potential
  if (compact) return (
    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} title={cfg.label} />
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ─── Onglet 1 : Grille 9-Box ─────────────────────────────────
function Tab9Box({ stats, isLoading }) {
  const totalMapped   = stats?.totalMapped ?? 0
  const starsHiPot    = stats?.starsAndHiPot ?? 0
  const atRisk        = stats?.atRisk ?? 0
  const starsCount    = stats?.stats?.star?.count ?? 0

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* KPIs rapides */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex gap-3">
        <motion.div variants={fadeUp} className="flex-1">
          <StatCard icon={Users} label="Collaborateurs cartographiés" value={isLoading ? '—' : totalMapped}
            color="#8B5CF6" sublabel="Actifs PULSE + OKR" />
        </motion.div>
        <motion.div variants={fadeUp} className="flex-1">
          <StatCard icon={Zap} label="Stars & Hauts Potentiels" value={isLoading ? '—' : starsHiPot}
            color="#10B981" sublabel={totalMapped > 0 ? `${Math.round(starsHiPot/totalMapped*100)}% de l'effectif` : ''} />
        </motion.div>
        <motion.div variants={fadeUp} className="flex-1">
          <StatCard icon={AlertTriangle} label="Sous-performers" value={isLoading ? '—' : atRisk}
            color="#EF4444" sublabel="Nécessitent intervention" />
        </motion.div>
        <motion.div variants={fadeUp} className="flex-1">
          <StatCard icon={TrendingUp} label="Stars (top 9-box)" value={isLoading ? '—' : starsCount}
            color="#F59E0B" sublabel="Potentiel + Performance élevés" />
        </motion.div>
      </motion.div>

      {/* Grille */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <NineBoxGrid stats={stats?.stats || {}} isLoading={isLoading} />
      </motion.div>

      {/* Insight */}
      {!isLoading && totalMapped > 0 && (
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="rounded-xl p-3.5 text-xs text-white/50 leading-relaxed"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
        >
          <span className="font-semibold text-purple-400">Méthodologie :</span> La performance est calculée sur
          la moyenne PULSE des 90 derniers jours. Le potentiel intègre la progression OKR (40%),
          les feedbacks 360° reçus (40%) et l'ancienneté inversée (20%).
          Cliquez sur une cellule pour voir le détail des collaborateurs.
        </motion.div>
      )}
    </div>
  )
}

// ─── Onglet 2 : Postes Clés ──────────────────────────────────
function TabKeyPositions({ isAdmin }) {
  const { data: positions = [], isLoading } = useKeyPositions()
  const archivePos = useArchiveKeyPosition()

  const [showForm,    setShowForm]    = useState(false)
  const [editPos,     setEditPos]     = useState(null)
  const [modalPos,    setModalPos]    = useState(null)
  const [filterCrit,  setFilterCrit]  = useState('all')

  const filtered = filterCrit === 'all'
    ? positions
    : positions.filter(p => p.criticality_level === filterCrit)

  if (isLoading) return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => <Sk key={i} className="h-28" />)}
    </div>
  )

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Barre actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Filtre criticité */}
          <div className="flex gap-1">
            {[{ v: 'all', l: 'Tous' }, ...Object.entries(CRITICALITY_CONFIG).map(([k,v]) => ({ v: k, l: v.label }))].map(opt => (
              <button
                key={opt.v}
                onClick={() => setFilterCrit(opt.v)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                style={{
                  background: filterCrit === opt.v ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
                  color: filterCrit === opt.v ? '#C4B5FD' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${filterCrit === opt.v ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => { setEditPos(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <Plus size={12} />
            Nouveau poste
          </button>
        )}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Aucun poste clé défini"
          description="Identifiez les postes stratégiques de votre organisation pour planifier les successions."
          action={isAdmin ? { label: 'Créer un poste clé', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <motion.div
          variants={stagger} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {filtered.map(pos => {
            const critCfg   = CRITICALITY_CONFIG[pos.criticality_level] || CRITICALITY_CONFIG.medium
            const candidates = pos.succession_plans || []
            const readyCount = candidates.filter(c => ['ready_now','ready_in_1_year'].includes(c.readiness_level)).length
            const isRisk     = readyCount === 0

            return (
              <motion.div
                key={pos.id}
                variants={fadeUp}
                className="rounded-2xl overflow-hidden transition-all group"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isRisk ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                {/* Header */}
                <div className="p-3.5 flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: critCfg.bg, border: `1px solid ${critCfg.color}40` }}
                  >
                    <Shield size={14} style={{ color: critCfg.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: critCfg.bg, color: critCfg.color }}
                      >
                        {critCfg.label}
                      </span>
                      {isRisk && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                          <AlertTriangle size={8} />
                          À risque
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white truncate">{pos.title}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {pos.divisions?.name || pos.directions?.name || 'Transversal'}
                      {pos.vacancy_horizon_months && (
                        <span className="ml-2 text-white/25">
                          <Clock size={8} className="inline mr-0.5" />
                          {pos.vacancy_horizon_months} mois
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setModalPos(pos)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all text-white/30 hover:text-white/70"
                      title="Gérer les successeurs"
                    >
                      <Users size={12} />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditPos(pos); setShowForm(true) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all text-white/20 hover:text-white/60"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => archivePos.mutate(pos.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all text-white/20 hover:text-red-400"
                        >
                          <Archive size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Titulaire actuel */}
                {pos.current_holder && (
                  <div className="px-3.5 pb-2 flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D' }}
                    >
                      {pos.current_holder.first_name?.[0]}{pos.current_holder.last_name?.[0]}
                    </div>
                    <span className="text-[10px] text-white/35">
                      {pos.current_holder.first_name} {pos.current_holder.last_name}
                    </span>
                  </div>
                )}

                {/* Footer successeurs */}
                <div
                  className="px-3.5 py-2.5 flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/60">
                      {candidates.length} successeur{candidates.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      {candidates.slice(0, 4).map(c => (
                        <ReadinessBadge key={c.id} level={c.readiness_level} compact />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setModalPos(pos)}
                    className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/70 transition-all"
                  >
                    Gérer <ChevronRight size={10} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <KeyPositionForm
            position={editPos}
            onClose={() => { setShowForm(false); setEditPos(null) }}
          />
        )}
        {modalPos && (
          <SuccessionModal
            position={modalPos}
            onClose={() => setModalPos(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Onglet 3 : Rapport Risques ──────────────────────────────
function TabRisks() {
  const { data: atRisk = [], total, isLoading } = usePositionsAtRisk()

  const byLevel = {
    critical: atRisk.filter(p => p.criticality_level === 'critical'),
    high:     atRisk.filter(p => p.criticality_level === 'high'),
    medium:   atRisk.filter(p => p.criticality_level === 'medium'),
    low:      atRisk.filter(p => p.criticality_level === 'low'),
  }

  const coverage = total > 0 ? Math.round(((total - atRisk.length) / total) * 100) : 100

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Jauge couverture */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-white">Taux de couverture succession</div>
            <div className="text-xs text-white/40 mt-0.5">
              {total - atRisk.length} postes couverts sur {total} au total
            </div>
          </div>
          <div
            className="text-2xl font-black"
            style={{ color: coverage >= 80 ? '#10B981' : coverage >= 50 ? '#F59E0B' : '#EF4444' }}
          >
            {isLoading ? '—' : `${coverage}%`}
          </div>
        </div>
        {/* Barre de progression SVG */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${coverage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: coverage >= 80
                ? 'linear-gradient(90deg, #059669, #10B981)'
                : coverage >= 50
                  ? 'linear-gradient(90deg, #D97706, #F59E0B)'
                  : 'linear-gradient(90deg, #DC2626, #EF4444)',
            }}
          />
        </div>
      </div>

      {/* Liste par criticité */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-20" />)}
        </div>
      ) : atRisk.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Tous les postes sont couverts !"
          description="Chaque poste clé a au moins un successeur identifié prêt ou en cours de développement."
        />
      ) : (
        <>
          {Object.entries(byLevel).map(([level, posts]) => {
            if (posts.length === 0) return null
            const cfg = CRITICALITY_CONFIG[level]
            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="text-xs text-white/30">— {posts.length} poste{posts.length > 1 ? 's' : ''} sans successeur immédiat</span>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {posts.map(pos => (
                    <div
                      key={pos.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${cfg.color}30`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg }}
                      >
                        <AlertTriangle size={13} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{pos.title}</div>
                        <div className="text-xs text-white/40">
                          {pos.divisions?.name || pos.directions?.name || 'Transversal'}
                          {pos.succession_plans?.length > 0 && (
                            <span className="ml-2 text-yellow-500/70">
                              {pos.succession_plans.length} candidat{pos.succession_plans.length > 1 ? 's' : ''} potentiel{pos.succession_plans.length > 1 ? 's' : ''} — aucun prêt à court terme
                            </span>
                          )}
                        </div>
                      </div>
                      {pos.vacancy_horizon_months && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold" style={{ color: cfg.color }}>{pos.vacancy_horizon_months} mois</div>
                          <div className="text-[9px] text-white/30">avant vacance</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function TalentMapping() {
  const { isAdmin, isDirecteur, isChefDivision, isChefService } = useAuth()
  const isManager = isAdmin || isDirecteur || isChefDivision || isChefService
  const canManage = isAdmin || isDirecteur

  const [activeTab, setTab] = useState('ninebox')
  const nineBoxData = useNineBoxStats()

  const TABS = [
    { id: 'ninebox',    label: 'Cartographie 9-Box',  icon: Grid3x3,      badge: 'S51' },
    { id: 'positions',  label: 'Postes Clés',          icon: Shield        },
    { id: 'risks',      label: 'Rapport Risques',      icon: AlertTriangle },
  ]

  if (!isManager) {
    return (
      <EmptyState
        icon={Shield}
        title="Accès réservé aux managers"
        description="La cartographie des talents est accessible aux chefs de service, chefs de division, directeurs et administrateurs."
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 pt-6 pb-0 border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(245,158,11,0.04) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <Grid3x3 size={16} style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne',sans-serif" }}>
              Cartographie Talents
            </h1>
            <p className="text-xs text-white/30">Grille 9-Box · Succession Planning · Postes à risque</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-all flex-shrink-0 ${active ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                style={active ? {
                  background: 'rgba(255,255,255,0.04)',
                  borderTop: '2px solid #F59E0B',
                  borderLeft: '1px solid rgba(255,255,255,0.08)',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                } : undefined}
              >
                <Icon size={13} style={active ? { color: '#F59E0B' } : undefined} />
                {tab.label}
                {tab.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'ninebox'   && <Tab9Box stats={nineBoxData} isLoading={nineBoxData.isLoading} />}
            {activeTab === 'positions' && <TabKeyPositions isAdmin={canManage} />}
            {activeTab === 'risks'     && <TabRisks />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
