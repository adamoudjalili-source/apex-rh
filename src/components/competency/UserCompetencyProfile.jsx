// ============================================================
// APEX RH — src/components/competency/UserCompetencyProfile.jsx · S84
// Profil radar SVG individuel + écarts vs rôle
// Props : userId (requis)
// ============================================================
import { useState, useMemo } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { motion, AnimatePresence } from 'framer-motion'
import { User, TrendingDown, TrendingUp, Minus, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useUserAssessments,
  useUpsertAssessment,
  useCompetenciesList,
  useRoleRequirements,
  COMPETENCY_LEVEL_LABELS,
  SOURCE_LABELS,
} from '../../hooks/useCompetencyFramework'
import { useUsersList } from '../../hooks/useSettings'

// ─── Radar SVG ───────────────────────────────────────────────
function RadarChart({ competencies, assessed, required }) {
  const N    = competencies.length
  const CX   = 130
  const CY   = 130
  const R    = 100
  const MAX  = 5

  if (N < 3) return (
    <div className="flex items-center justify-center h-full text-xs"
      style={{ color: 'rgba(255,255,255,0.3)' }}>
      Minimum 3 compétences pour le radar
    </div>
  )

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2

  const toXY = (i, val) => {
    const a = angle(i)
    const r = (val / MAX) * R
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
  }

  // Polygone assessed
  const assessedPts = competencies
    .map((c, i) => toXY(i, assessed[c.id] || 0))
    .map(p => `${p.x},${p.y}`).join(' ')

  // Polygone required (si disponible)
  const requiredPts = required && competencies
    .map((c, i) => toXY(i, required[c.id] || 0))
    .map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={260} height={260} viewBox="0 0 260 260">
      {/* Grilles circulaires */}
      {[1, 2, 3, 4, 5].map(level => {
        const pts = competencies
          .map((_, i) => toXY(i, level))
          .map(p => `${p.x},${p.y}`).join(' ')
        return (
          <polygon key={level} points={pts}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        )
      })}

      {/* Axes */}
      {competencies.map((_, i) => {
        const { x, y } = toXY(i, MAX)
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        )
      })}

      {/* Polygone requis */}
      {requiredPts && (
        <polygon points={requiredPts}
          fill="rgba(245,158,11,0.08)"
          stroke="rgba(245,158,11,0.5)"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
      )}

      {/* Polygone évalué */}
      <polygon points={assessedPts}
        fill="rgba(79,70,229,0.2)"
        stroke="#4F46E5"
        strokeWidth={2}
      />

      {/* Points évalués */}
      {competencies.map((c, i) => {
        const { x, y } = toXY(i, assessed[c.id] || 0)
        return (
          <circle key={c.id} cx={x} cy={y} r={4}
            fill="#4F46E5" stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} />
        )
      })}

      {/* Labels axes */}
      {competencies.map((c, i) => {
        const { x, y } = toXY(i, MAX + 0.8)
        const cat = c.competency_categories
        return (
          <text key={c.id} x={x} y={y}
            textAnchor="middle" fontSize={9}
            fill={cat?.color || 'rgba(255,255,255,0.6)'}
          >
            {c.name.length > 14 ? c.name.slice(0, 12) + '…' : c.name}
          </text>
        )
      })}

      {/* Légende centre */}
      <text x={CX} y={CY + 3} textAnchor="middle" fontSize={9}
        fill="rgba(255,255,255,0.25)">
        Compétences
      </text>
    </svg>
  )
}

// ─── Formulaire évaluation ────────────────────────────────────
function AssessmentForm({ userId, competencies, existing, onSave, onCancel }) {
  const { user: me } = useAuth()
  const [competencyId, setCompetencyId] = useState(existing?.competency_id || competencies[0]?.id || '')
  const [level, setLevel]               = useState(existing?.assessed_level || 3)
  const [source, setSource]             = useState(existing?.source || 'manager')
  const [notes, setNotes]               = useState(existing?.notes || '')
  const [saving, setSaving]             = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ user_id: userId, competency_id: competencyId, assessed_level: level, source, notes })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Compétence</label>
          <select
            value={competencyId}
            onChange={e => setCompetencyId(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          >
            {competencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Source</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
          >
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sélecteur niveau */}
      <div>
        <label className="block text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Niveau évalué
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => {
            const cfg = COMPETENCY_LEVEL_LABELS[n]
            return (
              <button
                key={n}
                onClick={() => setLevel(n)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: level === n ? cfg.bg : 'rgba(255,255,255,0.04)',
                  color:      level === n ? cfg.color : 'rgba(255,255,255,0.4)',
                  border:     `1px solid ${level === n ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {n}
              </button>
            )
          })}
        </div>
        <p className="text-xs mt-1 text-center" style={{ color: COMPETENCY_LEVEL_LABELS[level]?.color }}>
          {COMPETENCY_LEVEL_LABELS[level]?.label}
        </p>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Contexte de l'évaluation…"
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-lg"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 text-sm font-semibold rounded-lg disabled:opacity-50"
          style={{ background: '#4F46E5', color: 'white' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────
export default function UserCompetencyProfile({ userId }) {
  const { user: me } = useAuth()
  const { can } = usePermission()
  const canAdmin = can('developpement', 'competences', 'admin')
  const canManageTeam = can('developpement', 'team', 'read')
  const canWrite = canAdmin || canManageTeam
  const { data: users = [] }           = useUsersList()
  const { data: assessments = [], isLoading } = useUserAssessments(userId)
  const { data: competencies = [] }    = useCompetenciesList()
  const targetUser = users.find(u => u.id === userId)

  const { data: roleReqs = [] } = useRoleRequirements({
    roleName: targetUser?.role,
  })

  const upsert = useUpsertAssessment()
  const [showForm, setShowForm] = useState(false)

  // Map niveau max par compétence
  const assessedMap = useMemo(() => {
    const m = {}
    assessments.forEach(a => {
      if (!m[a.competency_id] || a.assessed_level > m[a.competency_id])
        m[a.competency_id] = a.assessed_level
    })
    return m
  }, [assessments])

  // Map niveau requis par compétence
  const requiredMap = useMemo(() => {
    const m = {}
    roleReqs.forEach(r => { m[r.competency_id] = r.required_level })
    return m
  }, [roleReqs])

  // Compétences avec gap pour le tableau
  const gapList = useMemo(() => {
    return competencies
      .map(c => {
        const assessed = assessedMap[c.id] || 0
        const required = requiredMap[c.id] || null
        const gap      = required !== null ? required - assessed : null
        return { ...c, assessed, required, gap }
      })
      .filter(c => c.assessed > 0 || c.required !== null)
      .sort((a, b) => (b.gap || 0) - (a.gap || 0))
  }, [competencies, assessedMap, requiredMap])

  // Compétences pour le radar (max 8)
  const radarComps = useMemo(() => {
    return competencies.filter(c => assessedMap[c.id] > 0).slice(0, 8)
  }, [competencies, assessedMap])

  const handleSave = async (payload) => {
    await upsert.mutateAsync(payload)
    setShowForm(false)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: '#4F46E5', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!targetUser) return (
    <div className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
      Sélectionnez un collaborateur
    </div>
  )

  return (
    <div className="space-y-5">
      {/* En-tête utilisateur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)', color: '#818CF8' }}>
            {targetUser.first_name?.[0]}{targetUser.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'white' }}>
              {targetUser.first_name} {targetUser.last_name}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {targetUser.role} · {assessments.length} évaluation(s)
            </p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#4F46E5', color: 'white' }}
          >
            <Plus size={14} />
            Évaluer
          </button>
        )}
      </div>

      {/* Formulaire */}
      <AnimatePresence>
        {showForm && (
          <AssessmentForm
            userId={userId}
            competencies={competencies}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {assessments.length === 0 ? (
        <div className="rounded-xl p-8 text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
          <User size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Aucune évaluation pour ce collaborateur.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Radar */}
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Radar compétences
              {roleReqs.length > 0 && (
                <span className="ml-2 text-xs" style={{ color: 'rgba(245,158,11,0.7)' }}>
                  — — requis (rôle)
                </span>
              )}
            </p>
            <div className="flex justify-center">
              <RadarChart
                competencies={radarComps}
                assessed={assessedMap}
                required={roleReqs.length > 0 ? requiredMap : null}
              />
            </div>
          </div>

          {/* Tableau gaps */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Écarts vs rôle ({roleReqs.length > 0 ? targetUser.role : 'aucun référentiel défini'})
              </p>
            </div>
            <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.06)' }}>
              {gapList.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Aucune donnée
                </p>
              ) : gapList.map(c => {
                const cfg = COMPETENCY_LEVEL_LABELS[c.assessed] || {}
                const GapIcon = c.gap > 0 ? TrendingDown : c.gap < 0 ? TrendingUp : Minus
                const gapColor = c.gap > 1 ? '#EF4444' : c.gap === 1 ? '#F59E0B' : c.gap === 0 ? '#10B981' : '#3B82F6'
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'white' }}>{c.name}</p>
                      {c.competency_categories && (
                        <p className="text-xs" style={{ color: c.competency_categories.color }}>
                          {c.competency_categories.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Barre niveau */}
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n}
                            className="rounded-sm"
                            style={{
                              width: 8, height: 14,
                              background: n <= c.assessed ? cfg.color : 'rgba(255,255,255,0.08)',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs w-5 text-center font-bold"
                        style={{ color: cfg.color }}>
                        {c.assessed > 0 ? c.assessed : '—'}
                      </span>
                      {c.gap !== null && (
                        <div className="flex items-center gap-0.5">
                          <GapIcon size={12} style={{ color: gapColor }} />
                          <span className="text-xs font-semibold" style={{ color: gapColor }}>
                            {c.gap > 0 ? `+${c.gap}` : c.gap}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
