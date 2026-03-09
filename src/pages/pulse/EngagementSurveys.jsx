// ============================================================
// APEX RH — src/pages/pulse/EngagementSurveys.jsx
// Session 29 — Module Surveys d'Engagement
// Vue collaborateur : répondre aux surveys actifs
// Vue manager : créer/gérer les surveys + dashboard score équipe
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePermission } from '../../hooks/usePermission'
import {
  SURVEY_DIMENSIONS,
  SURVEY_STATUS_LABELS,
  SURVEY_STATUS_COLORS,
  computeEngagementScore,
  engagementScoreColor,
  engagementScoreBg,
  engagementScoreLabel,
  useMySurveys,
  useAllSurveys,
  useSurveyQuestions,
  useMyResponse,
  useSurveyResponses,
  useSurveyTrend,
  useSurveySummary,
  useCreateSurvey,
  useActivateSurvey,
  useCloseSurvey,
  useSubmitSurveyResponse,
} from '../../hooks/useEngagementSurveys'

// ─── HELPERS ─────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function ScoreGauge({ score, size = 'md' }) {
  const radius   = size === 'lg' ? 52 : 36
  const stroke   = size === 'lg' ? 8 : 6
  const cx       = radius + stroke
  const circumf  = 2 * Math.PI * radius
  const pct      = score !== null ? score / 100 : 0
  const offset   = circumf * (1 - pct)

  const colorClass = engagementScoreColor(score)
  const colorHex   = score === null ? '#6b7280'
    : score >= 75 ? '#10b981'
    : score >= 50 ? '#f59e0b'
    : '#ef4444'

  const dim = (cx) * 2

  return (
    <div className="relative inline-flex items-center justify-center flex-col">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={cx} cy={cx} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx} cy={cx} r={radius}
          fill="none"
          stroke={colorHex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumf}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-bold ${colorClass} ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
          {score !== null ? score : '—'}
        </span>
        {size === 'lg' && (
          <span className="text-xs text-gray-500 mt-0.5">{engagementScoreLabel(score)}</span>
        )}
      </div>
    </div>
  )
}

// Graphique tendance SVG 6 mois
function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
        Aucun historique disponible — fermez votre premier survey pour voir la tendance.
      </div>
    )
  }

  const W = 520, H = 140, PAD = { top: 20, right: 20, bottom: 30, left: 40 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const points = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: PAD.top + innerH - ((d.overall ?? 0) / 100) * innerH,
    score: d.overall,
    label: d.period,
  }))

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  // Area fill
  const areaD = [
    `M ${points[0].x} ${PAD.top + innerH}`,
    ...points.map(p => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${PAD.top + innerH}`,
    'Z',
  ].join(' ')

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '160px' }}>
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grille */}
      {yLabels.map(y => {
        const cy = PAD.top + innerH - (y / 100) * innerH
        return (
          <g key={y}>
            <line
              x1={PAD.left} y1={cy} x2={W - PAD.right} y2={cy}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
            <text x={PAD.left - 6} y={cy + 4}
              textAnchor="end" fill="#6b7280" fontSize="9">
              {y}
            </text>
          </g>
        )
      })}

      {/* Ligne seuil 60 */}
      <line
        x1={PAD.left} y1={PAD.top + innerH - 0.6 * innerH}
        x2={W - PAD.right} y2={PAD.top + innerH - 0.6 * innerH}
        stroke="rgba(16,185,129,0.25)" strokeWidth="1" strokeDasharray="4 4"
      />

      {/* Area */}
      <path d={areaD} fill="url(#trend-fill)" />

      {/* Courbe */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
          <text x={p.x} y={H - 4}
            textAnchor="middle" fill="#6b7280" fontSize="9">
            {p.label?.length > 8 ? p.label.slice(0, 8) + '…' : p.label}
          </text>
          {/* Score tooltip au-dessus */}
          {p.score !== null && (
            <text x={p.x} y={p.y - 9}
              textAnchor="middle"
              fill={p.score >= 75 ? '#10b981' : p.score >= 50 ? '#f59e0b' : '#ef4444'}
              fontSize="9" fontWeight="600">
              {p.score}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// Radar SVG 5 dimensions
function RadarChart({ scores }) {
  const dims = SURVEY_DIMENSIONS
  const n = dims.length
  const SIZE = 160
  const cx = SIZE / 2, cy = SIZE / 2, R = 60

  const angle = (i) => (i / n) * 2 * Math.PI - Math.PI / 2

  const toXY = (i, r) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  })

  const gridLevels = [1, 2, 3, 4, 5]

  const valuePoints = dims.map((d, i) => {
    const val = scores?.[d.key] ?? 0 // 0–100
    const r = (val / 100) * R
    return toXY(i, r)
  })

  const valuePathD = valuePoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" style={{ maxWidth: '180px' }}>
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Grille */}
      {gridLevels.map(lv => {
        const pts = dims.map((_, i) => toXY(i, R * lv / 5))
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
        return <path key={lv} d={d} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      })}

      {/* Axes */}
      {dims.map((_, i) => {
        const end = toXY(i, R)
        return (
          <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        )
      })}

      {/* Valeurs */}
      <path d={valuePathD} fill="url(#radar-fill)" stroke="#6366f1" strokeWidth="1.5" />

      {/* Labels */}
      {dims.map((d, i) => {
        const labelR = R + 14
        const pos = toXY(i, labelR)
        return (
          <text key={i} x={pos.x.toFixed(1)} y={pos.y.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fill="#9ca3af" fontSize="7">
            {d.icon}
          </text>
        )
      })}
    </svg>
  )
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────

// Formulaire de réponse inline
function SurveyResponseForm({ survey, onDone }) {
  const { data: questions = [] } = useSurveyQuestions(survey.id)
  const { data: myResponse }     = useMyResponse(survey.id)
  const submitMutation           = useSubmitSurveyResponse()

  const [scores, setScores]     = useState(() => {
    if (myResponse?.scores) return { ...myResponse.scores }
    const init = {}
    SURVEY_DIMENSIONS.forEach(d => { init[d.key] = 3 })
    return init
  })
  const [comment, setComment]   = useState(myResponse?.comment ?? '')
  const [saved, setSaved]       = useState(false)

  const alreadyAnswered = !!myResponse

  const handleSubmit = async () => {
    await submitMutation.mutateAsync({ surveyId: survey.id, scores, comment })
    setSaved(true)
    setTimeout(() => { setSaved(false); onDone?.() }, 1500)
  }

  const usedQuestions = questions.length > 0
    ? questions
    : SURVEY_DIMENSIONS.map((d, i) => ({
        id: d.key, question_key: d.key, question_text: d.desc,
        scale_min: 1, scale_max: 5, position: i,
      }))

  return (
    <div className="space-y-5">
      {alreadyAnswered && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <span className="text-emerald-400 text-sm">✓ Vous avez déjà répondu à ce survey.</span>
          <span className="text-gray-500 text-xs">Vous pouvez modifier vos réponses.</span>
        </div>
      )}

      {/* Survey anonymat */}
      {survey.is_anonymous && (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <span className="text-indigo-400">🔒</span>
          Ce survey est anonyme — vos réponses individuelles ne seront pas identifiées.
        </div>
      )}

      {usedQuestions.map(q => {
        const dim = SURVEY_DIMENSIONS.find(d => d.key === q.question_key)
        const val = scores[q.question_key] ?? 3
        const labels = ['Très insatisfait', 'Insatisfait', 'Neutre', 'Satisfait', 'Très satisfait']

        return (
          <div key={q.id || q.question_key} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              {dim && <span className="text-2xl flex-shrink-0">{dim.icon}</span>}
              <div>
                <div className="text-sm font-semibold text-white">{dim?.label ?? q.question_key}</div>
                <div className="text-xs text-gray-500 mt-0.5">{q.question_text}</div>
              </div>
            </div>

            {/* Sélecteur 1–5 */}
            <div className="flex gap-2 justify-between">
              {[1,2,3,4,5].map(v => (
                <button
                  key={v}
                  onClick={() => setScores(prev => ({ ...prev, [q.question_key]: v }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                    val === v
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="text-xs text-gray-600">{labels[0]}</span>
              <span className="text-xs text-indigo-400 font-medium">{labels[val - 1]}</span>
              <span className="text-xs text-gray-600">{labels[4]}</span>
            </div>
          </div>
        )
      })}

      {/* Commentaire libre */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="block text-sm font-medium text-white mb-2">
          💬 Commentaire libre <span className="text-gray-600 text-xs">(optionnel)</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="Partagez vos suggestions, observations ou retours..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitMutation.isPending || saved}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/20'
        }`}
      >
        {saved
          ? '✓ Réponse enregistrée !'
          : submitMutation.isPending
          ? 'Envoi...'
          : alreadyAnswered
          ? 'Mettre à jour mes réponses'
          : 'Soumettre mes réponses'}
      </button>
    </div>
  )
}

// Card survey pour collaborateur
function SurveyCard({ survey, onSelect, isSelected }) {
  const { data: myResponse } = useMyResponse(survey.id)
  const answered = !!myResponse

  return (
    <motion.div
      layout
      className={`bg-white/3 border rounded-xl p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-indigo-500/50 bg-indigo-500/5'
          : answered
          ? 'border-emerald-500/20 hover:border-emerald-500/30'
          : 'border-white/8 hover:border-white/15'
      }`}
      onClick={() => onSelect(isSelected ? null : survey.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{survey.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${SURVEY_STATUS_COLORS[survey.status]}`}>
              {SURVEY_STATUS_LABELS[survey.status]}
            </span>
            {answered && (
              <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                ✓ Répondu
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">{survey.period_label}</div>
          {survey.description && (
            <div className="text-xs text-gray-600 mt-1 truncate">{survey.description}</div>
          )}
          <div className="text-xs text-gray-700 mt-1">
            {formatDate(survey.start_date)} → {formatDate(survey.end_date)}
          </div>
        </div>
        <div className="flex-shrink-0 text-gray-600">
          <svg
            className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </motion.div>
  )
}

// ─── VUE COLLABORATEUR ────────────────────────────────────────

function CollaborateurView() {
  const { data: surveys = [], isLoading } = useMySurveys()
  const { data: trend = [] } = useSurveyTrend(null)
  const [selectedId, setSelectedId] = useState(null)

  const activeSurveys = surveys.filter(s => s.status === 'active')
  const closedSurveys = surveys.filter(s => s.status === 'closed')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Tendance 6 mois */}
      {trend.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base font-semibold text-white">📈 Tendance d'engagement — 6 derniers surveys</span>
          </div>
          <TrendChart data={trend} />
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {trend.slice(-1)[0] && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Score actuel :</span>
                <span className={`text-sm font-bold ${engagementScoreColor(trend.slice(-1)[0].overall)}`}>
                  {trend.slice(-1)[0].overall ?? '—'}
                </span>
                <span className="text-xs text-gray-600">
                  ({engagementScoreLabel(trend.slice(-1)[0].overall)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Surveys actifs */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Surveys en cours ({activeSurveys.length})
        </h3>

        {activeSurveys.length === 0 ? (
          <div className="bg-white/2 border border-white/5 rounded-xl py-10 text-center text-gray-600 text-sm">
            Aucun survey actif pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {activeSurveys.map(s => (
              <div key={s.id}>
                <SurveyCard
                  survey={s}
                  isSelected={selectedId === s.id}
                  onSelect={setSelectedId}
                />
                <AnimatePresence>
                  {selectedId === s.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 bg-white/2 border border-white/8 rounded-xl p-4">
                        <SurveyResponseForm
                          survey={s}
                          onDone={() => setSelectedId(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Surveys fermés */}
      {closedSurveys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">
            Surveys terminés ({closedSurveys.length})
          </h3>
          <div className="space-y-2">
            {closedSurveys.map(s => (
              <SurveyCard
                key={s.id}
                survey={s}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── VUE MANAGER ─────────────────────────────────────────────

function ManagerCreateForm({ onClose }) {
  const createMutation = useActivateSurvey()
  const createSurvey   = useCreateSurvey()

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    periodLabel:  '',
    startDate:    new Date().toISOString().split('T')[0],
    endDate:      '',
    isAnonymous:  true,
    activateNow:  true,
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  const handleCreate = async () => {
    if (!form.title || !form.periodLabel || !form.endDate) return
    setSaving(true)
    try {
      const { id } = await createSurvey.mutateAsync(form)
      if (form.activateNow) {
        await createMutation.mutateAsync(id)
      }
      setDone(true)
      setTimeout(onClose, 1200)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center justify-center py-8 text-emerald-400 gap-2">
        <span className="text-xl">✓</span>
        <span className="text-sm font-medium">Survey créé et activé !</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500 mb-1.5">Titre du survey *</label>
          <input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="ex: Survey d'engagement Q2 2025"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Période *</label>
          <input
            value={form.periodLabel}
            onChange={e => setForm(p => ({ ...p, periodLabel: e.target.value }))}
            placeholder="ex: Q1 2025, Janvier 2025"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Date de fin *</label>
          <input
            type="date"
            value={form.endDate}
            onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500 mb-1.5">Description (optionnel)</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Contexte ou objectif de ce survey..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setForm(p => ({ ...p, isAnonymous: !p.isAnonymous }))}
            className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
              form.isAnonymous ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <span className={`absolute w-3.5 h-3.5 bg-white rounded-full top-0.5 transition-all ${
              form.isAnonymous ? 'left-4' : 'left-0.5'
            }`} />
          </button>
          <span className="text-xs text-gray-400">Survey anonyme (recommandé)</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setForm(p => ({ ...p, activateNow: !p.activateNow }))}
            className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
              form.activateNow ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <span className={`absolute w-3.5 h-3.5 bg-white rounded-full top-0.5 transition-all ${
              form.activateNow ? 'left-4' : 'left-0.5'
            }`} />
          </button>
          <span className="text-xs text-gray-400">Activer immédiatement</span>
        </div>
      </div>

      <div className="bg-white/2 border border-white/5 rounded-xl p-3">
        <div className="text-xs text-gray-500 mb-2">Questions incluses automatiquement :</div>
        <div className="flex flex-wrap gap-2">
          {SURVEY_DIMENSIONS.map(d => (
            <span key={d.key} className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/8 px-2.5 py-1 rounded-full text-gray-400">
              {d.icon} {d.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || !form.title || !form.periodLabel || !form.endDate}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all"
        >
          {saving ? 'Création...' : form.activateNow ? 'Créer & Activer' : 'Créer (brouillon)'}
        </button>
      </div>
    </div>
  )
}

// Dashboard d'un survey (résultats manager)
function SurveyDashboard({ survey }) {
  const { data: responses = [] } = useSurveyResponses(survey.id)
  const { data: summary }        = useSurveySummary(survey.id, survey.service_id)
  const closeMutation            = useCloseSurvey()
  const activateMutation         = useActivateSurvey()

  const result     = computeEngagementScore(responses)
  const { overall, byDimension } = result

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-bold text-white">{survey.title}</div>
          <div className="text-xs text-gray-500">{survey.period_label} · {formatDate(survey.end_date)}</div>
        </div>
        <div className="flex gap-2">
          {survey.status === 'draft' && (
            <button
              onClick={() => activateMutation.mutate(survey.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all"
            >
              Activer
            </button>
          )}
          {survey.status === 'active' && (
            <button
              onClick={() => closeMutation.mutate(survey.id)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-all"
            >
              Clôturer
            </button>
          )}
        </div>
      </div>

      {/* Stats participation */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Réponses', value: responses.length, icon: '📝' },
          { label: 'Attendues', value: summary?.total ?? '—', icon: '👥' },
          { label: 'Taux', value: summary ? `${summary.rate}%` : '—', icon: '📊' },
        ].map(s => (
          <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
            <div className="text-base mb-1">{s.icon}</div>
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score global + radar */}
      {responses.length > 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex flex-col items-center gap-1">
              <ScoreGauge score={overall} size="lg" />
              <span className="text-xs text-gray-500">Score global</span>
            </div>
            <RadarChart scores={byDimension} />
            <div className="flex-1 min-w-[140px] space-y-2">
              {SURVEY_DIMENSIONS.map(d => {
                const val = byDimension[d.key] ?? 0
                return (
                  <div key={d.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        {d.icon} {d.label}
                      </span>
                      <span className={`text-xs font-bold ${engagementScoreColor(val)}`}>{val}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${val}%`,
                          background: d.color,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/2 border border-white/5 rounded-xl py-8 text-center text-gray-600 text-sm">
          Aucune réponse reçue pour l'instant.
        </div>
      )}

      {/* Commentaires libres */}
      {responses.filter(r => r.comment).length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 mb-3">
            💬 Commentaires ({responses.filter(r => r.comment).length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {responses.filter(r => r.comment).map((r, i) => (
              <div key={i} className="text-xs text-gray-400 bg-white/3 border border-white/5 rounded-lg px-3 py-2 italic">
                "{r.comment}"
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ManagerView() {
  const { data: surveys = [], isLoading } = useAllSurveys()
  const { data: trend = [] }              = useSurveyTrend(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedId, setSelectedId]         = useState(null)
  const [activeTab, setActiveTab]           = useState('surveys') // 'surveys' | 'tendance'

  const selectedSurvey = surveys.find(s => s.id === selectedId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Tabs manager */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {[
          { id: 'surveys', label: '📋 Surveys' },
          { id: 'tendance', label: '📈 Tendance équipe' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Surveys */}
      {activeTab === 'surveys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{surveys.length} survey(s) au total</span>
            <button
              onClick={() => setShowCreateForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau survey
            </button>
          </div>

          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5">
                  <div className="text-sm font-semibold text-white mb-4">Créer un nouveau survey</div>
                  <ManagerCreateForm onClose={() => setShowCreateForm(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Liste surveys + dashboard inline */}
          {surveys.length === 0 ? (
            <div className="bg-white/2 border border-white/5 rounded-xl py-12 text-center text-gray-600 text-sm">
              Aucun survey créé. Commencez par créer votre premier survey d'engagement.
            </div>
          ) : (
            <div className="space-y-2">
              {surveys.map(s => (
                <div key={s.id}>
                  <div
                    onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                    className={`bg-white/3 border rounded-xl p-4 cursor-pointer transition-all ${
                      selectedId === s.id
                        ? 'border-indigo-500/50 bg-indigo-500/5'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${SURVEY_STATUS_COLORS[s.status]}`}>
                          {SURVEY_STATUS_LABELS[s.status]}
                        </span>
                        <span className="text-sm font-medium text-white truncate">{s.title}</span>
                        <span className="text-xs text-gray-600 hidden sm:inline">{s.period_label}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${selectedId === s.id ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedId === s.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 bg-white/2 border border-white/8 rounded-xl p-4">
                          <SurveyDashboard survey={s} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Tendance équipe */}
      {activeTab === 'tendance' && (
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-4">
              📈 Évolution du score d'engagement équipe (6 derniers surveys)
            </div>
            <TrendChart data={trend} />
          </div>

          {/* Tableau récapitulatif */}
          {trend.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Période</th>
                    <th className="text-center px-3 py-3 text-gray-500 font-medium">Score</th>
                    {SURVEY_DIMENSIONS.map(d => (
                      <th key={d.key} className="text-center px-3 py-3 text-gray-500 font-medium hidden md:table-cell">
                        {d.icon}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 text-gray-500 font-medium">Réponses</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trend].reverse().map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                      <td className="px-4 py-3 text-gray-300 font-medium">{row.period}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${engagementScoreColor(row.overall)}`}>
                          {row.overall ?? '—'}
                        </span>
                      </td>
                      {SURVEY_DIMENSIONS.map(d => (
                        <td key={d.key} className="px-3 py-3 text-center hidden md:table-cell">
                          <span className={`text-xs ${engagementScoreColor(row.byDimension?.[d.key])}`}>
                            {row.byDimension?.[d.key] ?? '—'}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center text-gray-500">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {trend.length === 0 && (
            <div className="bg-white/2 border border-white/5 rounded-xl py-10 text-center text-gray-600 text-sm">
              Aucun survey clôturé pour afficher la tendance.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function EngagementSurveysPage() {
  const { can } = usePermission()
  const isManager = can('evaluations', 'surveys', 'read')

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)' }}
        >
          <span className="text-lg">📊</span>
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Surveys d'Engagement</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isManager
              ? 'Créez des surveys périodiques et mesurez l\'engagement de votre équipe'
              : 'Répondez aux surveys anonymes et consultez la tendance d\'engagement'}
          </p>
        </div>
      </div>

      {/* Contenu selon le rôle */}
      {isManager ? <ManagerView /> : <CollaborateurView />}
    </div>
  )
}
