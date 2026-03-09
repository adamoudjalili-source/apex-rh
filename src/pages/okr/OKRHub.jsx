// ============================================================
// APEX RH — OKRHub.jsx · S123
// Batch 4 — Hub OKR unifié (periods + cycles en un seul point)
// Route : /okr  |  Tabs via useSearchParams(?tab=...)
// Remplace la double navigation okr_periods / okr_cycles
// Max 400 lignes
// ============================================================
import { useState }               from 'react'
import { useSearchParams }        from 'react-router-dom'
import { motion }                 from 'framer-motion'
import {
  Target, RefreshCw, Network, LayoutDashboard,
  LayoutList, GitBranch, BarChart3, Lock,
  TrendingUp, AlertCircle,
} from 'lucide-react'

import {
  GLASS_STYLE, GLASS_STYLE_STRONG, GLASS_STYLE_SUBTLE, ROLES,
} from '../../utils/constants'
import StatCard   from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'

import { useAuth }           from '../../contexts/AuthContext'
import { usePermission }     from '../../hooks/usePermission'
import { MANAGER_ROLES }     from '../../lib/roles'
import { useCurrentCycle }   from '../../hooks/useOkrCycles'
import {
  useObjectives,
  useUpdateKeyResult,
  useDeleteKeyResult,
  useDeleteObjective,
} from '../../hooks/useObjectives'
import {
  canCreateObjective,
  getLevelInfo,
  getScoreColor,
  formatScore,
  LEVEL_ORDER,
} from '../../lib/objectiveHelpers'
import { useOkrPeriods }         from '../../hooks/useOkrPeriods'
import OkrPeriodSelector         from '../../components/objectives/OkrPeriodSelector'
import OkrFilters                from '../../components/objectives/OkrFilters'
import ObjectiveCard             from '../../components/objectives/ObjectiveCard'
import ObjectiveCascade          from '../../components/objectives/ObjectiveCascade'
import ObjectiveForm             from '../../components/objectives/ObjectiveForm'
import KeyResultForm             from '../../components/objectives/KeyResultForm'
import ObjectiveDetailPanel      from '../../components/objectives/ObjectiveDetailPanel'
import OKRCycleManager           from '../../components/okr/OKRCycleManager'
import OKRCascadeView            from '../../components/okr/OKRCascadeView'
import OKRDashboard              from '../../components/okr/OKRDashboard'
import ExportButton              from '../../components/ui/ExportButton'
import { exportObjectives }      from '../../lib/exportExcel'
import { useMemo }               from 'react'

// ─── ONGLETS ─────────────────────────────────────────────────
const TABS = [
  { id: 'liste',       label: 'Objectifs',   icon: LayoutList,      color: '#6366F1' },
  { id: 'cascade',     label: 'Cascade',     icon: GitBranch,       color: '#10B981' },
  { id: 'stats',       label: 'Stats',       icon: BarChart3,       color: '#3B82F6' },
  { id: 'cycles',      label: 'Cycles',      icon: RefreshCw,       color: '#F59E0B' },
  { id: 'alignement',  label: 'Alignement',  icon: Network,         color: '#8B5CF6' },
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard, color: '#EF4444' },
]
const DEFAULT_TAB = 'liste'

// ─── PANEL STATS ─────────────────────────────────────────────
function StatsPanel({ objectives }) {
  const stats = useMemo(() => {
    if (!objectives.length) return null
    const avgScore = objectives.reduce((s, o) => s + (o.progress_score || 0), 0) / objectives.length
    const byLevel  = {}
    LEVEL_ORDER.forEach(l => {
      const objs = objectives.filter(o => o.level === l)
      byLevel[l] = {
        count:    objs.length,
        avgScore: objs.length
          ? objs.reduce((s, o) => s + (o.progress_score || 0), 0) / objs.length
          : 0,
      }
    })
    return { total: objectives.length, avgScore, byLevel }
  }, [objectives])

  if (!stats) return <EmptyState icon={BarChart3} title="Aucun objectif" description="Sélectionnez une période pour voir les stats." />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={GLASS_STYLE_STRONG}>
        <h3 className="text-sm font-semibold text-white mb-4">Score moyen par niveau</h3>
        <div className="space-y-3">
          {LEVEL_ORDER.map(lvl => {
            const info = getLevelInfo(lvl)
            const data = stats.byLevel[lvl]
            if (!data.count) return null
            const pct = Math.round(data.avgScore * 100)
            return (
              <div key={lvl} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: info.color }}>
                    {info.icon} {info.label}
                    <span className="text-white/20 ml-2">({data.count})</span>
                  </span>
                  <span className="text-sm font-bold" style={{ color: getScoreColor(data.avgScore) }}>
                    {formatScore(data.avgScore)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: info.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={GLASS_STYLE}>
          <h3 className="text-xs font-semibold text-emerald-400 mb-3">🏆 Top 5</h3>
          <div className="space-y-2">
            {[...objectives]
              .sort((a, b) => (b.progress_score || 0) - (a.progress_score || 0))
              .slice(0, 5)
              .map(o => (
                <div key={o.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: getLevelInfo(o.level).color }} />
                  <span className="flex-1 text-white/60 truncate">{o.title}</span>
                  <span className="font-bold" style={{ color: getScoreColor(o.progress_score) }}>{formatScore(o.progress_score)}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="rounded-2xl p-4" style={GLASS_STYLE}>
          <h3 className="text-xs font-semibold text-red-400 mb-3">⚠️ À surveiller</h3>
          <div className="space-y-2">
            {[...objectives]
              .filter(o => o.status === 'actif')
              .sort((a, b) => (a.progress_score || 0) - (b.progress_score || 0))
              .slice(0, 5)
              .map(o => (
                <div key={o.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: getLevelInfo(o.level).color }} />
                  <span className="flex-1 text-white/60 truncate">{o.title}</span>
                  <span className="font-bold" style={{ color: getScoreColor(o.progress_score) }}>{formatScore(o.progress_score)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────
export default function OKRHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? DEFAULT_TAB

  const { profile }               = useAuth()
  const { can }                   = usePermission()
  const { data: currentCycle }    = useCurrentCycle()

  const [selectedPeriodId, setSelectedPeriodId] = useState(null)
  const [activeCycleId,    setActiveCycleId]    = useState(null)
  const [filters,          setFilters]          = useState({ search: '', level: '', status: '' })

  // Modales
  const [showObjForm,  setShowObjForm]  = useState(false)
  const [editingObj,   setEditingObj]   = useState(null)
  const [showKrForm,   setShowKrForm]   = useState(false)
  const [krFormObjId,  setKrFormObjId]  = useState(null)
  const [editingKr,    setEditingKr]    = useState(null)
  const [detailObjId,  setDetailObjId]  = useState(null)

  const { data: objectives = [], isLoading } = useObjectives(selectedPeriodId, filters)
  const updateKr  = useUpdateKeyResult()
  const deleteKr  = useDeleteKeyResult()
  const deleteObj = useDeleteObjective()

  const kpis = useMemo(() => {
    if (!objectives.length) return { total: 0, avgScore: null, totalKrs: 0, enRetard: 0 }
    const avgScore = objectives.reduce((s, o) => s + (o.progress_score || 0), 0) / objectives.length
    return {
      total:    objectives.length,
      avgScore,
      totalKrs: objectives.reduce((s, o) => s + (o.key_results?.length || 0), 0),
      enRetard: objectives.filter(o => o.progress_score < 0.4 && o.status === 'actif').length,
    }
  }, [objectives])

  const childCounts = useMemo(() => {
    const counts = {}
    objectives.forEach(o => {
      if (o.parent_objective_id) counts[o.parent_objective_id] = (counts[o.parent_objective_id] || 0) + 1
    })
    return counts
  }, [objectives])

  const handleEditObj   = (obj) => { setEditingObj(obj); setShowObjForm(true) }
  const handleDeleteObj = async (obj) => {
    if (!confirm('Supprimer cet objectif et tous ses Key Results ?')) return
    try { await deleteObj.mutateAsync(obj.id) } catch {}
  }
  const handleAddKr    = (objId) => { setKrFormObjId(objId); setEditingKr(null); setShowKrForm(true) }
  const handleEditKr   = (kr)    => { setKrFormObjId(kr.objective_id); setEditingKr(kr); setShowKrForm(true) }
  const handleDeleteKr = async (kr) => {
    if (!confirm('Supprimer ce Key Result ?')) return
    try { await deleteKr.mutateAsync({ id: kr.id, objectiveId: kr.objective_id }) } catch {}
  }
  const handleUpdateKrValue = async (krId, val) => {
    try { await updateKr.mutateAsync({ id: krId, updates: { current_value: val } }) } catch {}
  }

  const resolvedCycleId = activeCycleId || currentCycle?.id

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Target size={18} style={{ color: '#A5B4FC' }} />
            </div>
            Hub OKR
          </h1>
          <p className="text-sm text-white/35 mt-0.5 ml-12">Objectifs · Cycles · Cascade stratégique</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton onExport={() => exportObjectives(objectives)} label="Excel" disabled={objectives.length === 0} />
          {canCreateObjective(profile?.role) && selectedPeriodId && (
            <button onClick={() => { setEditingObj(null); setShowObjForm(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              + Nouvel objectif
            </button>
          )}
        </div>
      </div>

      {/* KPIs — affichés uniquement si période sélectionnée */}
      {selectedPeriodId && kpis.total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Target}      label="Objectifs"    value={kpis.total}                                  color="#6366F1" />
          <StatCard icon={TrendingUp}  label="Score moyen"  value={formatScore(kpis.avgScore)}                  color={getScoreColor(kpis.avgScore ?? 0)} />
          <StatCard icon={BarChart3}   label="Key Results"  value={kpis.totalKrs}                               color="#10B981" />
          <StatCard icon={AlertCircle} label="En retard"    value={kpis.enRetard}                               color="#EF4444" />
        </div>
      )}

      {/* Sélecteur de période (affiché uniquement sur les onglets période) */}
      {['liste','cascade','stats'].includes(activeTab) && (
        <OkrPeriodSelector selectedPeriodId={selectedPeriodId} onSelect={setSelectedPeriodId} />
      )}

      {/* Barre d'onglets */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl" style={GLASS_STYLE_SUBTLE}>
        {TABS.map(tab => {
          const active = tab.id === activeTab
          const Icon   = tab.icon
          return (
            <button key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
              style={active
                ? { background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}30` }
                : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
              }>
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
        {/* Filtres inline sur onglet liste */}
        {activeTab === 'liste' && selectedPeriodId && (
          <div className="flex-1 min-w-0">
            <OkrFilters filters={filters} onChange={setFilters} />
          </div>
        )}
      </div>

      {/* Contenu par onglet */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ── LISTE ── */}
        {activeTab === 'liste' && (
          !selectedPeriodId
            ? <EmptyState icon={Target} title="Sélectionnez une période" description="Choisissez ou créez une période OKR pour afficher les objectifs." />
            : isLoading
              ? <div className="h-32 animate-pulse rounded-2xl" style={GLASS_STYLE} />
              : objectives.length === 0
                ? <EmptyState icon={Target} title="Aucun objectif" description="Créez votre premier objectif pour cette période." />
                : (
                  <div className="space-y-3">
                    {objectives.map(obj => (
                      <ObjectiveCard key={obj.id} objective={obj}
                        childCount={childCounts[obj.id] || 0}
                        onEdit={handleEditObj} onDelete={handleDeleteObj}
                        onViewDetail={o => setDetailObjId(o.id)}
                        onAddKr={handleAddKr} onEditKr={handleEditKr}
                        onDeleteKr={handleDeleteKr} onUpdateKrValue={handleUpdateKrValue}
                      />
                    ))}
                  </div>
                )
        )}

        {/* ── CASCADE PÉRIODE ── */}
        {activeTab === 'cascade' && (
          !selectedPeriodId
            ? <EmptyState icon={GitBranch} title="Sélectionnez une période" description="Choisissez une période pour voir la cascade." />
            : <ObjectiveCascade objectives={objectives} onSelect={o => setDetailObjId(o.id)} />
        )}

        {/* ── STATS ── */}
        {activeTab === 'stats' && (
          !selectedPeriodId
            ? <EmptyState icon={BarChart3} title="Sélectionnez une période" description="Choisissez une période pour voir les statistiques." />
            : <StatsPanel objectives={objectives} />
        )}

        {/* ── CYCLES ── */}
        {activeTab === 'cycles' && (
          <OKRCycleManager
            onCycleSelect={cycle => { setActiveCycleId(cycle.id); setSearchParams({ tab: 'alignement' }) }}
          />
        )}

        {/* ── ALIGNEMENT ── */}
        {activeTab === 'alignement' && (
          <OKRCascadeView cycleId={resolvedCycleId} />
        )}

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <OKRDashboard cycleId={resolvedCycleId} />
        )}
      </motion.div>

      {/* Modales */}
      <ObjectiveForm
        isOpen={showObjForm}
        onClose={() => { setShowObjForm(false); setEditingObj(null) }}
        periodId={selectedPeriodId}
        objective={editingObj}
        parentObjectives={objectives}
      />
      <KeyResultForm
        isOpen={showKrForm}
        onClose={() => { setShowKrForm(false); setEditingKr(null); setKrFormObjId(null) }}
        objectiveId={krFormObjId}
        keyResult={editingKr}
      />
      {detailObjId && (
        <ObjectiveDetailPanel
          objectiveId={detailObjId}
          onClose={() => setDetailObjId(null)}
          onEdit={obj => { setDetailObjId(null); handleEditObj(obj) }}
        />
      )}
    </div>
  )
}
