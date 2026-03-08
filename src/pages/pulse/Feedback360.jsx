// S69 — MANAGER_ROLES remplacé par canManageTeam
// ============================================================
// APEX RH — src/pages/pulse/Feedback360.jsx
// Session 28 — Page principale du module Feedback 360°
// Vue collaborateur : feedbacks à remplir + mes résultats (radar SVG)
// Vue manager : campagnes + tableau des évaluations + validation + résumé équipe
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import {
  useFeedbackToGive,
  useMyFeedbackRequests,
  useFeedbackReceived,
  useTeamFeedbackSummary,
  useAllCampaigns,
  useCampaignRequests,
  useCreateCampaign,
  useSubmitFeedback,
  useValidateFeedback,
  useCloseCampaign,
  FEEDBACK_QUESTIONS,
  FEEDBACK_TYPE_LABELS,
  computeAverageScores,
} from '../../hooks/useFeedback360'

// ─── COMPOSANTS UTILITAIRES ──────────────────────────────────

function ScorePill({ score }) {
  if (score === null || score === undefined)
    return <span className="text-gray-600 text-sm">—</span>
  const color = score >= 7 ? 'text-emerald-400' : score >= 4 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-bold text-sm ${color}`}>{score}/10</span>
}

function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: 'En attente',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    submitted: { label: 'Soumis',      cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    validated: { label: 'Validé',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  }
  const { label, cls } = cfg[status] ?? { label: status, cls: 'bg-white/10 text-gray-400' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

// ─── RADAR CHART SVG ─────────────────────────────────────────
// Radar SVG 5 axes pour visualiser les scores moyens

function RadarChart({ scores }) {
  const questions = FEEDBACK_QUESTIONS
  const N = questions.length
  const cx = 120, cy = 120, R = 90

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2

  const point = (i, val) => {
    const r = (val / 10) * R
    return [
      cx + r * Math.cos(angle(i)),
      cy + r * Math.sin(angle(i)),
    ]
  }

  const labelPoint = (i) => {
    const r = R + 22
    return [
      cx + r * Math.cos(angle(i)),
      cy + r * Math.sin(angle(i)),
    ]
  }

  const gridValues = [2, 4, 6, 8, 10]

  const dataPoints = questions.map((q, i) => point(i, scores?.[q.key] ?? 0))
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-xs mx-auto">
      {/* Grilles */}
      {gridValues.map(v =>
        questions.map((_, i) => {
          const [ax, ay] = point(i, v)
          const [bx, by] = point((i + 1) % N, v)
          return (
            <line
              key={`grid-${v}-${i}`}
              x1={ax} y1={ay} x2={bx} y2={by}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
          )
        })
      )}
      {/* Axes */}
      {questions.map((_, i) => {
        const [ax, ay] = point(i, 10)
        return (
          <line key={`axis-${i}`} x1={cx} y1={cy} x2={ax} y2={ay}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        )
      })}
      {/* Données */}
      <path d={dataPath}
        fill="rgba(99,102,241,0.25)"
        stroke="#6366f1"
        strokeWidth="2"
      />
      {/* Points */}
      {dataPoints.map(([x, y], i) => (
        <circle key={`dot-${i}`} cx={x} cy={y} r="4"
          fill="#6366f1" stroke="#1e1e2e" strokeWidth="2" />
      ))}
      {/* Labels */}
      {questions.map((q, i) => {
        const [lx, ly] = labelPoint(i)
        return (
          <text key={`label-${i}`} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="rgba(255,255,255,0.55)"
          >
            {q.icon} {q.label.split(' ')[0]}
          </text>
        )
      })}
    </svg>
  )
}

// ─── FORMULAIRE DE FEEDBACK ──────────────────────────────────

function FeedbackForm({ request, onClose }) {
  const submitFeedback = useSubmitFeedback()
  const [scores, setScores] = useState(
    Object.fromEntries(FEEDBACK_QUESTIONS.map(q => [q.key, 5]))
  )
  const [comments, setComments] = useState({})
  const [generalComment, setGeneralComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const evaluated = request.evaluated

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const responses = FEEDBACK_QUESTIONS.map(q => ({
        question_key: q.key,
        score: scores[q.key],
        comment: comments[q.key] ?? null,
      }))
      // Ajouter un commentaire général comme réponse spéciale
      if (generalComment.trim()) {
        responses.push({ question_key: 'general', score: null, comment: generalComment.trim() })
      }
      await submitFeedback.mutateAsync({ requestId: request.id, responses })
      setSuccess(true)
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      console.error('[Feedback360] Erreur soumission:', err)
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-emerald-400 font-semibold">Feedback soumis avec succès !</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">
          {evaluated?.first_name?.[0]}{evaluated?.last_name?.[0]}
        </div>
        <div>
          <p className="text-white font-semibold">{evaluated?.first_name} {evaluated?.last_name}</p>
          <p className="text-xs text-gray-500">{FEEDBACK_TYPE_LABELS[request.type]} · {request.campaign?.title}</p>
        </div>
      </div>

      {FEEDBACK_QUESTIONS.map(q => (
        <div key={q.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300 font-medium">
              {q.icon} {q.label}
            </label>
            <span className={`text-sm font-bold ${
              scores[q.key] >= 7 ? 'text-emerald-400' :
              scores[q.key] >= 4 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {scores[q.key]}/10
            </span>
          </div>
          <input
            type="range"
            min="0" max="10" step="1"
            value={scores[q.key]}
            onChange={e => setScores(prev => ({ ...prev, [q.key]: parseInt(e.target.value) }))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Insuffisant</span>
            <span>Excellent</span>
          </div>
        </div>
      ))}

      <div>
        <label className="block text-sm text-gray-300 font-medium mb-1.5">
          💬 Commentaire général (facultatif)
        </label>
        <textarea
          value={generalComment}
          onChange={e => setGeneralComment(e.target.value)}
          placeholder="Points forts, axes d'amélioration, exemples concrets..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? 'Envoi...' : 'Soumettre le feedback'}
        </button>
      </div>
    </div>
  )
}

// ─── VUE COLLABORATEUR ───────────────────────────────────────

function CollaborateurView() {
  const { data: toGive = [], isLoading: loadingToGive } = useFeedbackToGive()
  const { data: received = [], isLoading: loadingReceived } = useFeedbackReceived()
  const [activeForm, setActiveForm] = useState(null) // request.id

  const avgScores = computeAverageScores(
    received.flatMap(r => r.responses ?? [])
  )
  const hasResults = received.length > 0

  return (
    <div className="space-y-6">
      {/* Section : À remplir */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Feedbacks à remplir
          {toGive.length > 0 && (
            <span className="ml-1 bg-amber-500/20 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {toGive.length}
            </span>
          )}
        </h2>

        {loadingToGive ? (
          <div className="h-20 bg-white/3 rounded-xl animate-pulse" />
        ) : toGive.length === 0 ? (
          <div className="bg-white/3 border border-white/8 rounded-xl px-5 py-6 text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-gray-500 text-sm">Aucun feedback en attente. Vous êtes à jour !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {toGive.map(req => (
              <div key={req.id}>
                <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-sm font-bold flex-shrink-0">
                        {req.evaluated?.first_name?.[0]}{req.evaluated?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {req.evaluated?.first_name} {req.evaluated?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {FEEDBACK_TYPE_LABELS[req.type]} · {req.campaign?.title}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveForm(activeForm === req.id ? null : req.id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      {activeForm === req.id ? 'Fermer' : 'Remplir'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {activeForm === req.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
                      >
                        <FeedbackForm
                          request={req}
                          onClose={() => setActiveForm(null)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section : Mes résultats */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          Mes résultats (feedbacks validés)
        </h2>

        {loadingReceived ? (
          <div className="h-40 bg-white/3 rounded-xl animate-pulse" />
        ) : !hasResults ? (
          <div className="bg-white/3 border border-white/8 rounded-xl px-5 py-6 text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-gray-500 text-sm">
              Aucun feedback validé pour l'instant. Vos résultats apparaîtront ici une fois que votre manager les aura validés.
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/8 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Radar */}
              <div>
                <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wide">
                  Profil de compétences ({received.length} évaluation{received.length > 1 ? 's' : ''})
                </p>
                <RadarChart scores={avgScores} />
              </div>

              {/* Scores détaillés */}
              <div className="space-y-3">
                {FEEDBACK_QUESTIONS.map(q => (
                  <div key={q.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{q.icon} {q.label}</span>
                      <ScorePill score={avgScores[q.key]} />
                    </div>
                    {avgScores[q.key] !== null && (
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${(avgScores[q.key] / 10) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── VUE MANAGER ─────────────────────────────────────────────

function ManagerView() {
  const { profile } = useAuth()
  const { data: campaigns = [], isLoading: loadingCampaigns } = useAllCampaigns()
  const { data: teamSummary = [], isLoading: loadingSummary } = useTeamFeedbackSummary()
  const createCampaign = useCreateCampaign()
  const closeCampaign = useCloseCampaign()

  const [activeTab, setActiveTab] = useState('campaigns')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const managerTabs = [
    { id: 'campaigns', label: '📋 Campagnes' },
    { id: 'validation', label: '✅ Validation' },
    { id: 'summary', label: '📊 Résumé équipe' },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {managerTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet Campagnes */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">
              {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}
            </h3>
            <button
              onClick={() => setShowCreateForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
            >
              + Nouvelle campagne
            </button>
          </div>

          {/* Mini-formulaire de création */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <CreateCampaignForm
                  onClose={() => setShowCreateForm(false)}
                  onCreate={createCampaign}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {loadingCampaigns ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-16 bg-white/3 rounded-xl animate-pulse" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white/3 border border-white/8 rounded-xl px-5 py-6 text-center">
              <p className="text-gray-500 text-sm">Aucune campagne. Créez la première !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onSelect={() => { setSelectedCampaign(c.id); setActiveTab('validation') }}
                  onClose={() => closeCampaign.mutate(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Validation */}
      {activeTab === 'validation' && (
        <ValidationTab
          campaigns={campaigns}
          selectedCampaignId={selectedCampaign}
          onSelectCampaign={setSelectedCampaign}
        />
      )}

      {/* Onglet Résumé équipe */}
      {activeTab === 'summary' && (
        <TeamSummaryTab teamSummary={teamSummary} isLoading={loadingSummary} />
      )}
    </div>
  )
}

// ─── FORMULAIRE CRÉATION CAMPAGNE ────────────────────────────

function CreateCampaignForm({ onClose, onCreate }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    if (!form.title || !form.end_date) return
    setSaving(true)
    try {
      await onCreate.mutateAsync({ ...form, participants: [] })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1200)
    } catch (err) {
      console.error('[CreateCampaign] Erreur:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-semibold text-indigo-300">Nouvelle campagne de feedback</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Titre *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Ex: Évaluation Q1 2025"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date de début *</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date de fin *</label>
          <input
            type="date"
            value={form.end_date}
            onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Description (facultatif)</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Objectif de cette campagne..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      <p className="text-xs text-gray-600">
        💡 Après création, ajoutez les participants depuis la campagne pour générer les demandes de feedback automatiquement.
      </p>

      <div className="flex gap-2">
        <button onClick={onClose} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-lg">
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={!form.title || !form.end_date || saving}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            success
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
          }`}
        >
          {success ? '✓ Créée !' : saving ? 'Création...' : 'Créer la campagne'}
        </button>
      </div>
    </div>
  )
}

// ─── CARTE CAMPAGNE ──────────────────────────────────────────

function CampaignCard({ campaign, onSelect, onClose }) {
  const statusCfg = {
    draft:  { label: 'Brouillon', cls: 'text-gray-400 bg-gray-500/15' },
    active: { label: 'Active',    cls: 'text-emerald-400 bg-emerald-500/15' },
    closed: { label: 'Fermée',    cls: 'text-gray-500 bg-gray-600/10' },
  }
  const { label, cls } = statusCfg[campaign.status] ?? {}

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white text-sm font-medium truncate">{campaign.title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cls}`}>{label}</span>
        </div>
        <p className="text-xs text-gray-500">
          {campaign.start_date} → {campaign.end_date}
          {campaign.service?.name && ` · ${campaign.service.name}`}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onSelect}
          className="px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10 transition-colors"
        >
          Voir
        </button>
        {campaign.status === 'active' && (
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-gray-500 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ONGLET VALIDATION ───────────────────────────────────────

function ValidationTab({ campaigns, selectedCampaignId, onSelectCampaign }) {
  const { data: requests = [], isLoading } = useCampaignRequests(selectedCampaignId)
  const validateFeedback = useValidateFeedback()
  const [validating, setValidating] = useState(null)

  const handleValidate = async (requestId) => {
    setValidating(requestId)
    try {
      await validateFeedback.mutateAsync(requestId)
    } finally {
      setValidating(null)
    }
  }

  const submittedRequests = requests.filter(r => r.status === 'submitted')
  const validatedRequests = requests.filter(r => r.status === 'validated')
  const pendingRequests   = requests.filter(r => r.status === 'pending')

  return (
    <div className="space-y-4">
      {/* Sélecteur de campagne */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Campagne à valider</label>
        <select
          value={selectedCampaignId ?? ''}
          onChange={e => onSelectCampaign(e.target.value || null)}
          className="w-full max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          <option value="">— Sélectionner une campagne —</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
          ))}
        </select>
      </div>

      {!selectedCampaignId ? (
        <p className="text-gray-600 text-sm">Sélectionnez une campagne pour voir les feedbacks soumis.</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/3 rounded-xl animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-xl px-5 py-6 text-center">
          <p className="text-gray-500 text-sm">Aucune demande pour cette campagne.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Récap */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'En attente', count: pendingRequests.length,   color: 'text-amber-400' },
              { label: 'Soumis',     count: submittedRequests.length, color: 'text-blue-400' },
              { label: 'Validés',    count: validatedRequests.length, color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Liste des feedbacks soumis à valider */}
          {submittedRequests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                À valider ({submittedRequests.length})
              </p>
              <div className="space-y-2">
                {submittedRequests.map(req => (
                  <FeedbackRequestRow
                    key={req.id}
                    request={req}
                    onValidate={() => handleValidate(req.id)}
                    isValidating={validating === req.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Feedbacks déjà validés */}
          {validatedRequests.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Déjà validés ({validatedRequests.length})
              </p>
              <div className="space-y-2">
                {validatedRequests.map(req => (
                  <FeedbackRequestRow key={req.id} request={req} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── LIGNE FEEDBACK REQUEST ───────────────────────────────────

function FeedbackRequestRow({ request, onValidate, isValidating }) {
  const [expanded, setExpanded] = useState(false)
  const avgScores = computeAverageScores(request.responses ?? [])

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-white/3 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
            {request.evaluator?.first_name?.[0]}{request.evaluator?.last_name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">
              <span className="text-gray-400">De : </span>
              {request.evaluator?.first_name} {request.evaluator?.last_name}
              <span className="text-gray-500 mx-1">→</span>
              {request.evaluated?.first_name} {request.evaluated?.last_name}
            </p>
            <p className="text-xs text-gray-600">{FEEDBACK_TYPE_LABELS[request.type]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={request.status} />
          {request.status === 'submitted' && onValidate && (
            <button
              onClick={e => { e.stopPropagation(); onValidate() }}
              disabled={isValidating}
              className="px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
            >
              {isValidating ? '...' : 'Valider'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && request.responses?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/6 pt-3 space-y-2">
              {FEEDBACK_QUESTIONS.map(q => (
                <div key={q.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{q.icon} {q.label}</span>
                  <ScorePill score={avgScores[q.key]} />
                </div>
              ))}
              {request.responses.find(r => r.question_key === 'general')?.comment && (
                <div className="mt-2 pt-2 border-t border-white/6">
                  <p className="text-xs text-gray-500 italic">
                    💬 {request.responses.find(r => r.question_key === 'general').comment}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ONGLET RÉSUMÉ ÉQUIPE ────────────────────────────────────

function TeamSummaryTab({ teamSummary, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/3 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (teamSummary.length === 0) {
    return (
      <div className="bg-white/3 border border-white/8 rounded-xl px-5 py-8 text-center">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-gray-500 text-sm">
          Aucun feedback validé pour votre équipe pour l'instant.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">{teamSummary.length} collaborateur{teamSummary.length > 1 ? 's' : ''} évalué{teamSummary.length > 1 ? 's' : ''}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="text-xs text-gray-500 font-medium pb-2 pr-4">Collaborateur</th>
              {FEEDBACK_QUESTIONS.map(q => (
                <th key={q.key} className="text-xs text-gray-500 font-medium pb-2 px-2 text-center whitespace-nowrap">
                  {q.icon}
                </th>
              ))}
              <th className="text-xs text-gray-500 font-medium pb-2 pl-2 text-center">Moy.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {teamSummary.map((entry, idx) => (
              <tr key={entry.user?.id ?? idx}>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <span className="text-base">🥇</span>}
                    {idx === 1 && <span className="text-base">🥈</span>}
                    {idx === 2 && <span className="text-base">🥉</span>}
                    {idx > 2 && <span className="text-xs text-gray-600 w-5 text-center">{idx + 1}</span>}
                    <span className="text-white">
                      {entry.user?.first_name} {entry.user?.last_name}
                    </span>
                  </div>
                </td>
                {FEEDBACK_QUESTIONS.map(q => (
                  <td key={q.key} className="py-2.5 px-2 text-center">
                    <ScorePill score={entry.avgScores[q.key]} />
                  </td>
                ))}
                <td className="py-2.5 pl-2 text-center">
                  <span className={`font-bold text-sm ${
                    (entry.globalAvg ?? 0) >= 7 ? 'text-emerald-400' :
                    (entry.globalAvg ?? 0) >= 4 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {entry.globalAvg ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function Feedback360() {
  const { profile } = useAuth()
  const { can } = usePermission()
  const canManageTeam = can('pulse', 'team', 'read')
  const isManager = canManageTeam
  const { data: toGive = [] } = useFeedbackToGive()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Feedback 360°
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManager
              ? 'Gérez les campagnes et validez les évaluations de votre équipe'
              : 'Donnez et recevez des feedbacks structurés avec vos pairs'}
          </p>
        </div>

        {/* Badge feedbacks en attente */}
        {toGive.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-sm font-semibold">
              {toGive.length} feedback{toGive.length > 1 ? 's' : ''} en attente
            </span>
          </div>
        )}
      </div>

      {/* Contenu selon le rôle */}
      {isManager ? <ManagerView /> : <CollaborateurView />}

      {/* Collaborateurs = vue réduite (sans onglets manager) */}
      {isManager && (
        <div className="mt-4 pt-4 border-t border-white/8">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Mes feedbacks à remplir</h3>
          <CollaborateurView />
        </div>
      )}
    </div>
  )
}
