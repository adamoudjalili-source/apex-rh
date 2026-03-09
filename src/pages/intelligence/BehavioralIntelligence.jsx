// ============================================================
// APEX RH — src/pages/intelligence/BehavioralIntelligence.jsx
// Session 54 — Behavioral Intelligence Engine
//
// Onglets :
//   1. Attrition Prédictive  — liste collaborateurs + heatmap DRH
//   2. Trajectoires Carrière — prédictions évolution + matching postes
//   3. Alertes Comportementales — alertes managers temps réel
//
// Accès : manager, directeur, admin
// ============================================================
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, AlertTriangle, MapPin, Bell, Search, Filter,
  RefreshCw, Download, ChevronDown, Users, TrendingUp, TrendingDown,
  Shield, Eye, EyeOff,
} from 'lucide-react'
import { usePermission } from '../../hooks/usePermission'
import {
  useAttritionRisk,
  useAttritionStats,
  useBehavioralAlerts,
  useRefreshBehavioralScores,
  RISK_CONFIG,
  TREND_CONFIG,
  getRiskConfig,
  getTrendConfig,
} from '../../hooks/useBehavioralIntelligence'
import AttritionRiskBadge, { AttritionRiskBar, AttritionRiskCircle } from '../../components/behavioral/AttritionRiskBadge'
import AttritionHeatmap from '../../components/behavioral/AttritionHeatmap'
import RiskFactorBreakdown from '../../components/behavioral/RiskFactorBreakdown'
import CareerPathCard from '../../components/behavioral/CareerPathCard'
import BehavioralAlerts from '../../components/behavioral/BehavioralAlerts'
import { CRITICALITY } from '../../utils/constants'

// ─── Onglet 1 : Attrition Prédictive ─────────────────────────

function AttritionTab() {
  const { can } = usePermission()
  const isAdmin = can('intelligence', 'succession', 'admin')
  const isDirecteur = can('intelligence', 'overview', 'read')
  const isTopLevel = isAdmin || isDirecteur
  const [search, setSearch]     = useState('')
  const [riskFilter, setRisk]   = useState('all')
  const [viewMode, setView]     = useState(isTopLevel ? 'heatmap' : 'list')
  const [selected, setSelected] = useState(null)

  const { data: all = [], isLoading, refetch } = useAttritionRisk({
    risk_level: riskFilter !== 'all' ? riskFilter : undefined,
  })
  const { stats } = useAttritionStats()
  const refresh = useRefreshBehavioralScores()

  const filtered = useMemo(() => {
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter(u =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      (u.division_name || '').toLowerCase().includes(q) ||
      (u.service_name  || '').toLowerCase().includes(q)
    )
  }, [all, search])

  return (
    <div className="space-y-6">
      {/* Barre de contrôle */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-48"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={14} className="text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un collaborateur..."
            className="bg-transparent text-sm text-white placeholder-white/30 outline-none flex-1"
          />
        </div>

        {/* Filtre risque */}
        <div className="flex items-center gap-1">
          {['all', CRITICALITY.CRITICAL, 'high', 'medium', 'low'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setRisk(lvl)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                riskFilter === lvl
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
              style={riskFilter === lvl && lvl !== 'all' ? {
                background: `${RISK_CONFIG[lvl]?.bg}`,
                border: `1px solid ${RISK_CONFIG[lvl]?.border}`,
                color: RISK_CONFIG[lvl]?.text,
              } : riskFilter === lvl ? {
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              } : undefined}
            >
              {lvl === 'all' ? 'Tous' : RISK_CONFIG[lvl]?.label}
            </button>
          ))}
        </div>

        {/* Vue switcher (top-level seulement) */}
        {isTopLevel && (
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <button
              onClick={() => setView('list')}
              className={`text-xs px-2.5 py-1 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40'}`}
            >
              Liste
            </button>
            <button
              onClick={() => setView('heatmap')}
              className={`text-xs px-2.5 py-1 rounded-md transition-all ${viewMode === 'heatmap' ? 'bg-white/10 text-white' : 'text-white/40'}`}
            >
              Heatmap
            </button>
          </div>
        )}

        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors ml-auto"
        >
          <RefreshCw size={13} className={refresh.isPending ? 'animate-spin' : ''} />
          Recalculer
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Analysés', value: stats.total,    color: '#8B5CF6' },
          { label: 'Critique',  value: stats.critical, color: '#EF4444' },
          { label: 'Élevé',     value: stats.high,     color: '#F97316' },
          { label: 'Modéré',    value: stats.medium,   color: '#F59E0B' },
          { label: 'Faible',    value: stats.low,      color: '#10B981' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: `${color}10`, border: `1px solid ${color}20` }}
          >
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
        </div>
      ) : viewMode === 'heatmap' ? (
        <AttritionHeatmap />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Liste */}
          <div className="col-span-2 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Shield size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Aucun collaborateur dans ce segment</p>
              </div>
            ) : (
              filtered.map(u => {
                const trendCfg = getTrendConfig(u.trend_direction)
                const isSelected = selected?.user_id === u.user_id
                return (
                  <motion.button
                    key={u.user_id}
                    onClick={() => setSelected(isSelected ? null : u)}
                    whileHover={{ scale: 1.005 }}
                    className="w-full rounded-2xl p-4 text-left transition-all"
                    style={{
                      background: isSelected ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: `${getRiskConfig(u.risk_level).color}20`,
                          color: getRiskConfig(u.risk_level).text,
                        }}
                      >
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>

                      {/* Identité */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {u.division_name && `${u.division_name}`}
                          {u.service_name && ` · ${u.service_name}`}
                        </p>
                      </div>

                      {/* Tendance */}
                      <span className="text-xs font-medium" style={{ color: trendCfg.color }}>
                        {trendCfg.arrow} {trendCfg.label}
                      </span>

                      {/* Badge + Score */}
                      <div className="flex items-center gap-2">
                        <AttritionRiskBadge level={u.risk_level} />
                        <AttritionRiskCircle score={u.risk_score} size={36} />
                      </div>
                    </div>

                    {/* Barre de risque compacte */}
                    <div className="mt-2.5">
                      <AttritionRiskBar score={u.risk_score} height={3} />
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>

          {/* Panneau détail */}
          <div
            className="rounded-2xl p-4 sticky top-4 self-start"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: `${getRiskConfig(selected.risk_level).color}20`, color: getRiskConfig(selected.risk_level).text }}
                    >
                      {selected.first_name?.[0]}{selected.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{selected.first_name} {selected.last_name}</p>
                      <AttritionRiskBadge level={selected.risk_level} score={selected.risk_score} showScore size="xs" />
                    </div>
                  </div>
                  <RiskFactorBreakdown risk={selected} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <Eye size={28} className="text-white/20 mb-3" />
                  <p className="text-sm text-white/30">
                    Sélectionnez un collaborateur pour voir le détail des facteurs
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet 2 : Trajectoires Carrière ─────────────────────────

function CareerTab() {
  const { data: all = [], isLoading } = useAttritionRisk()
  const [search, setSearch]  = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter(u => `${u.first_name} ${u.last_name}`.toLowerCase().includes(q))
  }, [all, search])

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Liste collaborateurs */}
      <div className="space-y-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={14} className="text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer..."
            className="bg-transparent text-sm text-white placeholder-white/30 outline-none flex-1"
          />
        </div>

        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
            </div>
          ) : filtered.map(u => (
            <button
              key={u.user_id}
              onClick={() => setSelected(u)}
              className="w-full rounded-xl p-3 text-left transition-all"
              style={{
                background: selected?.user_id === u.user_id ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selected?.user_id === u.user_id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${getRiskConfig(u.risk_level).color}20`, color: getRiskConfig(u.risk_level).text }}
                >
                  {u.first_name?.[0]}{u.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.first_name} {u.last_name}</p>
                  <p className="text-[10px] text-white/40 truncate">{u.division_name || u.role}</p>
                </div>
                <ChevronDown size={12} className={`text-white/30 transition-transform ${selected?.user_id === u.user_id ? '-rotate-90' : ''}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panneau prédiction */}
      <div
        className="col-span-2 rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold"
                  style={{ background: `${getRiskConfig(selected.risk_level).color}20`, color: getRiskConfig(selected.risk_level).text }}
                >
                  {selected.first_name?.[0]}{selected.last_name?.[0]}
                </div>
                <div>
                  <p className="font-bold text-white">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs text-white/40">{selected.division_name} {selected.service_name && `· ${selected.service_name}`}</p>
                </div>
              </div>
              <CareerPathCard userId={selected.user_id} showFull />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full min-h-64 text-center py-16"
            >
              <MapPin size={36} className="text-white/15 mb-4" />
              <p className="text-sm text-white/40">
                Sélectionnez un collaborateur pour afficher sa trajectoire carrière
              </p>
              <p className="text-xs text-white/25 mt-2">
                Trajectoires générées par le modèle comportemental S54
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────

const TABS = [
  { id: 'attrition', label: 'Attrition Prédictive', icon: AlertTriangle, color: '#EF4444' },
  { id: 'career',    label: 'Trajectoires Carrière', icon: MapPin,        color: '#8B5CF6' },
  { id: 'alerts',    label: 'Alertes',               icon: Bell,          color: '#F59E0B' },
]

export default function BehavioralIntelligence() {
  const [activeTab, setActive] = useState('attrition')
  const { data: alerts = [] } = useBehavioralAlerts()
  const unreadAlerts = alerts.filter(a => !a.is_read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Brain size={18} style={{ color: '#EF4444' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Behavioral Intelligence Engine
          </h2>
          <p className="text-xs text-white/35">
            Modèle prédictif attrition · Trajectoires carrière · Alertes comportementales
          </p>
        </div>
        <span
          className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          S54
        </span>
      </div>

      {/* Onglets */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center relative"
              style={active ? {
                background: `${tab.color}15`,
                color: tab.color,
                border: `1px solid ${tab.color}30`,
              } : { color: 'rgba(255,255,255,0.4)' }}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'alerts' && unreadAlerts > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: '#EF4444', color: 'white' }}
                >
                  {unreadAlerts}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Contenu onglet */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'attrition' && <AttritionTab />}
          {activeTab === 'career'    && <CareerTab />}
          {activeTab === 'alerts'    && <BehavioralAlerts />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
