// ============================================================
// APEX RH — Objectives.jsx (page principale)
// Session 10 — Module OKR complet
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Target, Plus, LayoutList, GitBranch, BarChart3,
  TrendingUp, AlertCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useObjectives, useUpdateKeyResult, useDeleteKeyResult, useDeleteObjective, useOKRAlignment } from '../../hooks/useObjectives'
import OKRTreeView from '../../components/objectives/OKRTreeView'
import EmptyState from '../../components/ui/EmptyState'
import {
  canCreateObjective, getLevelInfo, getScoreColor, formatScore,
  formatScorePercent, LEVEL_ORDER, OBJECTIVE_LEVELS
} from '../../lib/objectiveHelpers'

// Composants
import OkrPeriodSelector from '../../components/objectives/OkrPeriodSelector'
import OkrFilters from '../../components/objectives/OkrFilters'
import ObjectiveCard from '../../components/objectives/ObjectiveCard'
import ObjectiveCascade from '../../components/objectives/ObjectiveCascade'
import ObjectiveForm from '../../components/objectives/ObjectiveForm'
import KeyResultForm from '../../components/objectives/KeyResultForm'
import ObjectiveDetailPanel from '../../components/objectives/ObjectiveDetailPanel'
import ExportButton from '../../components/ui/ExportButton'
import { exportObjectives } from '../../lib/exportExcel'

export default function Objectives() {
  const { profile } = useAuth()

  // État
  const [selectedPeriodId, setSelectedPeriodId] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'cascade' | 'tree' | 'stats'
  const [filters, setFilters] = useState({ search: '', level: '', status: '' })

  // Modales
  const [showObjForm, setShowObjForm] = useState(false)
  const [editingObj, setEditingObj] = useState(null)
  const [showKrForm, setShowKrForm] = useState(false)
  const [krFormObjId, setKrFormObjId] = useState(null)
  const [editingKr, setEditingKr] = useState(null)
  const [detailObjId, setDetailObjId] = useState(null)

  // Data
  const { data: objectives = [], isLoading, error } = useObjectives(selectedPeriodId, filters)
  const updateKr = useUpdateKeyResult()
  const deleteKr = useDeleteKeyResult()
  const deleteObj = useDeleteObjective()
  const { data: alignmentData = [] } = useOKRAlignment(selectedPeriodId)

  // S50 : map d'alignement parent_id → données
  const alignmentMap = Object.fromEntries(alignmentData.map(a => [a.parent_id, a]))
  // Nombre d'OKRs désalignés (gap > 15%)
  const misalignedCount = alignmentData.filter(a => a.alignment_score < 0.8 && a.children_count > 0).length

  // Statistiques
  const stats = useMemo(() => {
    if (!objectives.length) return null
    const avgScore = objectives.reduce((sum, o) => sum + (o.progress_score || 0), 0) / objectives.length
    const totalKrs = objectives.reduce((sum, o) => sum + (o.key_results?.length || 0), 0)
    const byLevel = {}
    LEVEL_ORDER.forEach((l) => {
      const objs = objectives.filter((o) => o.level === l)
      byLevel[l] = {
        count: objs.length,
        avgScore: objs.length ? objs.reduce((s, o) => s + (o.progress_score || 0), 0) / objs.length : 0,
      }
    })
    return { total: objectives.length, avgScore, totalKrs, byLevel }
  }, [objectives])

  // Comptage des enfants
  const childCounts = useMemo(() => {
    const counts = {}
    objectives.forEach((o) => {
      if (o.parent_objective_id) {
        counts[o.parent_objective_id] = (counts[o.parent_objective_id] || 0) + 1
      }
    })
    return counts
  }, [objectives])

  // Handlers
  const handleEditObj = (obj) => { setEditingObj(obj); setShowObjForm(true) }
  const handleDeleteObj = async (obj) => {
    if (!confirm('Supprimer cet objectif et tous ses Key Results ?')) return
    try { await deleteObj.mutateAsync(obj.id) } catch (err) { console.error(err) }
  }
  const handleAddKr = (objId) => { setKrFormObjId(objId); setEditingKr(null); setShowKrForm(true) }
  const handleEditKr = (kr) => { setKrFormObjId(kr.objective_id); setEditingKr(kr); setShowKrForm(true) }
  const handleDeleteKr = async (kr) => {
    if (!confirm('Supprimer ce Key Result ?')) return
    try { await deleteKr.mutateAsync({ id: kr.id, objectiveId: kr.objective_id }) } catch (err) { console.error(err) }
  }
  const handleUpdateKrValue = async (krId, newValue) => {
    try { await updateKr.mutateAsync({ id: krId, updates: { current_value: newValue } }) } catch (err) { console.error(err) }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Target size={22} className="text-indigo-400" />
            </div>
            Objectifs OKR
          </h1>
          <p className="text-sm text-white/30 mt-1 ml-[52px]">
            Cascade stratégique · Score 0 → 1.0
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton onExport={() => exportObjectives(objectives)} label="Excel" disabled={objectives.length === 0} />
          {canCreateObjective(profile?.role) && selectedPeriodId && (
            <button
              onClick={() => { setEditingObj(null); setShowObjForm(true) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              <Plus size={16} />
              Nouvel objectif
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur de période */}
      <OkrPeriodSelector selectedPeriodId={selectedPeriodId} onSelect={setSelectedPeriodId} />

      {/* Contenu conditionnel */}
      {!selectedPeriodId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Target size={28} className="text-indigo-400/50" />
          </div>
          <p className="text-white/30 text-sm">
            Sélectionnez ou créez une période pour afficher les objectifs
          </p>
        </div>
      ) : (
        <>
          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={Target}
                label="Objectifs"
                value={stats.total}
                color="#4F46E5"
              />
              <StatCard
                icon={TrendingUp}
                label="Score moyen"
                value={formatScore(stats.avgScore)}
                color={getScoreColor(stats.avgScore)}
              />
              <StatCard
                icon={BarChart3}
                label="Key Results"
                value={stats.totalKrs}
                color="#10B981"
              />
              <StatCard
                icon={AlertCircle}
                label="En retard"
                value={objectives.filter((o) => o.progress_score < 0.4 && o.status === 'actif').length}
                color="#EF4444"
              />
            </div>
          )}

          {/* S50 : Indicateur d'alignement OKR */}
          {misalignedCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/25"
              style={{ background: 'rgba(245,158,11,0.08)' }}>
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-amber-300">
                  {misalignedCount} OKR parent{misalignedCount > 1 ? 's' : ''} désaligné{misalignedCount > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-amber-400/60 ml-2">
                  Le score déclaré diffère de &gt;15% du score calculé depuis les enfants
                </span>
              </div>
              <button
                onClick={() => setView('tree')}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#FCD34D' }}
              >
                Voir l'arbre
              </button>
            </div>
          )}

          {/* Barre vue + filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
              {[
                { id: 'list', icon: LayoutList, label: 'Liste' },
                { id: 'tree', icon: GitBranch, label: 'Arbre OKR' },
                { id: 'cascade', icon: GitBranch, label: 'Cascade' },
                { id: 'stats', icon: BarChart3, label: 'Stats' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    view === v.id
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  <v.icon size={13} /> {v.label}
                </button>
              ))}
            </div>

            <div className="flex-1">
              <OkrFilters filters={filters} onChange={setFilters} />
            </div>
          </div>

          {/* Loading / Error */}
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-white/30 text-sm">
              Chargement des objectifs…
            </div>
          )}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              Erreur : {error.message}
            </div>
          )}

          {/* Vue Liste */}
          {!isLoading && view === 'list' && (
            <div className="space-y-3">
              {objectives.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Aucun objectif trouvé"
                  description="Créez votre premier objectif OKR ou ajustez vos filtres."
                  action={canCreateObjective(profile?.role) && selectedPeriodId ? { label: 'Nouvel objectif', onClick: () => { setEditingObj(null); setShowObjForm(true) } } : undefined}
                />
              ) : (
                objectives.map((obj) => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    childCount={childCounts[obj.id] || 0}
                    onEdit={handleEditObj}
                    onDelete={handleDeleteObj}
                    onViewDetail={(o) => setDetailObjId(o.id)}
                    onAddKr={handleAddKr}
                    onEditKr={handleEditKr}
                    onDeleteKr={handleDeleteKr}
                    onUpdateKrValue={handleUpdateKrValue}
                  />
                ))
              )}
            </div>
          )}

          {/* Vue Arbre OKR — S50 */}
          {!isLoading && view === 'tree' && (
            <OKRTreeView
              objectives={objectives}
              onSelectObjective={(obj) => setDetailObjId(obj.id)}
            />
          )}

          {/* Vue Cascade */}
          {!isLoading && view === 'cascade' && (
            <ObjectiveCascade
              objectives={objectives}
              onSelect={(obj) => setDetailObjId(obj.id)}
            />
          )}

          {/* Vue Stats */}
          {!isLoading && view === 'stats' && stats && (
            <StatsView objectives={objectives} stats={stats} />
          )}
        </>
      )}

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
          onEdit={(obj) => { setDetailObjId(null); handleEditObj(obj) }}
        />
      )}
    </div>
  )
}

// ─── Composants internes ─────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] text-white/30">{label}</span>
      </div>
      <p className="text-xl font-black text-white" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Target size={24} className="text-white/15" />
      </div>
      <p className="text-white/30 text-sm mb-1">Aucun objectif trouvé</p>
      <p className="text-white/15 text-xs">Créez votre premier objectif pour commencer</p>
    </div>
  )
}

function StatsView({ objectives, stats }) {
  return (
    <div className="space-y-6">
      {/* Score par niveau */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-4">Score moyen par niveau</h3>
        <div className="space-y-4">
          {LEVEL_ORDER.map((lvl) => {
            const info = getLevelInfo(lvl)
            const data = stats.byLevel[lvl]
            if (!data.count) return null
            const pct = Math.round(data.avgScore * 100)

            return (
              <div key={lvl} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${info.text}`}>
                      {info.icon} {info.label}
                    </span>
                    <span className="text-[10px] text-white/20">
                      ({data.count} objectif{data.count > 1 ? 's' : ''})
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: getScoreColor(data.avgScore) }}>
                    {formatScore(data.avgScore)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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

      {/* Top / Bottom objectifs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-3">🏆 Top 5 — Meilleurs scores</h3>
          <div className="space-y-2">
            {[...objectives]
              .sort((a, b) => (b.progress_score || 0) - (a.progress_score || 0))
              .slice(0, 5)
              .map((o) => (
                <div key={o.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: getLevelInfo(o.level).color }} />
                  <span className="flex-1 text-white/60 truncate">{o.title}</span>
                  <span className="font-bold" style={{ color: getScoreColor(o.progress_score) }}>
                    {formatScore(o.progress_score)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-sm font-semibold text-red-400 mb-3">⚠️ À surveiller — Scores les plus bas</h3>
          <div className="space-y-2">
            {[...objectives]
              .filter((o) => o.status === 'actif')
              .sort((a, b) => (a.progress_score || 0) - (b.progress_score || 0))
              .slice(0, 5)
              .map((o) => (
                <div key={o.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: getLevelInfo(o.level).color }} />
                  <span className="flex-1 text-white/60 truncate">{o.title}</span>
                  <span className="font-bold" style={{ color: getScoreColor(o.progress_score) }}>
                    {formatScore(o.progress_score)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
