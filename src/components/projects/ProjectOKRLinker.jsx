// ============================================================
// APEX RH — ProjectOKRLinker.jsx
// Session 79 — Lier un projet à des objectifs OKR du cycle actif
// ============================================================
import { useState } from 'react'
import { Target, Link2, Unlink, Plus, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import { useProjectOKRLinks, useLinkProjectToOKR, useUnlinkProjectOKR } from '../../hooks/useProjects'
import { useObjectives } from '../../hooks/useObjectives'
import { useCurrentCycle } from '../../hooks/useObjectives'

const CONFIDENCE_COLORS = {
  high: '#10B981',
  medium: '#F59E0B',
  low: '#EF4444',
  at_risk: '#7C3AED',
}

const CONFIDENCE_LABELS = {
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
  at_risk: 'À risque',
}

const STATUS_COLORS = {
  draft: '#6B7280',
  active: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
}

function KRProgressBar({ kr }) {
  const pct = kr.target_value > 0 ? Math.min(100, (kr.current_value / kr.target_value) * 100) : 0
  const color = CONFIDENCE_COLORS[kr.confidence_level] || '#6B7280'

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-white/70 truncate">{kr.title}</span>
          <span className="text-xs font-medium ml-2" style={{ color }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
      {kr.confidence_level && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {CONFIDENCE_LABELS[kr.confidence_level]}
        </span>
      )}
    </div>
  )
}

function LinkedObjectiveCard({ link, onUnlink, canEdit }) {
  const [expanded, setExpanded] = useState(false)
  const obj = link.objective
  const krs = obj?.key_results || []
  const avgProgress = obj?.progress || 0
  const color = STATUS_COLORS[obj?.status] || '#6B7280'

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${color}20` }}
        >
          <Target className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-white truncate">{obj?.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              {krs.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 rounded text-white/50 hover:text-white transition-colors"
                >
                  {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onUnlink(link.id)}
                  className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                  title="Délier"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar objectif */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${avgProgress}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs text-white/60">{Math.round(avgProgress)}%</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {krs.length} KR{krs.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* KRs détaillés */}
      {expanded && krs.length > 0 && (
        <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-0.5">
          {krs.map((kr) => (
            <KRProgressBar key={kr.id} kr={kr} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectOKRLinker({ projectId, canEdit = false }) {
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const { data: links = [], isLoading } = useProjectOKRLinks(projectId)
  const { data: currentCycle } = useCurrentCycle()
  const { data: objectives = [] } = useObjectives(null, {})
  const linkOKR = useLinkProjectToOKR()
  const unlinkOKR = useUnlinkProjectOKR()

  const linkedObjectiveIds = new Set(links.map((l) => l.objective_id))

  const availableObjectives = objectives.filter(
    (obj) =>
      !linkedObjectiveIds.has(obj.id) &&
      (search === '' || obj.title.toLowerCase().includes(search.toLowerCase()))
  )

  const handleLink = async (objectiveId) => {
    try {
      await linkOKR.mutateAsync({ projectId, objectiveId })
      setShowPicker(false)
      setSearch('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleUnlink = async (linkId) => {
    if (!confirm('Délier cet objectif du projet ?')) return
    try {
      await unlinkOKR.mutateAsync({ linkId, projectId })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Objectifs OKR liés</span>
          {currentCycle && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              {currentCycle.name}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Lier un OKR
          </button>
        )}
      </div>

      {/* Picker */}
      {showPicker && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un objectif…"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {availableObjectives.length === 0 && (
              <p className="text-sm text-white/40 text-center py-3">
                {search ? 'Aucun résultat' : 'Tous les objectifs sont déjà liés'}
              </p>
            )}
            {availableObjectives.map((obj) => (
              <button
                key={obj.id}
                onClick={() => handleLink(obj.id)}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-white/40 group-hover:text-indigo-400 shrink-0" />
                  <span className="text-sm text-white/80 group-hover:text-white truncate">{obj.title}</span>
                  <span className="ml-auto text-xs text-white/40">{Math.round(obj.progress || 0)}%</span>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowPicker(false); setSearch('') }}
            className="text-xs text-white/40 hover:text-white/70 w-full text-center py-1"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Liste des liens */}
      {isLoading ? (
        <div className="text-sm text-white/40 py-4 text-center">Chargement…</div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-white/10">
          <TrendingUp className="w-8 h-8 text-white/20 mb-2" />
          <p className="text-sm text-white/40">Aucun objectif OKR lié</p>
          {canEdit && (
            <p className="text-xs text-white/25 mt-1">Cliquez sur « Lier un OKR » pour commencer</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <LinkedObjectiveCard
              key={link.id}
              link={link}
              onUnlink={handleUnlink}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
