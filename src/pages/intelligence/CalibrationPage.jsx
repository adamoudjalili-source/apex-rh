// ============================================================
// APEX RH — src/pages/intelligence/CalibrationPage.jsx
// Session 55 — Calibration Multi-niveaux (N/N+1/N+2)
// Intégré dans ReviewCycles via onglet "Calibration"
// ============================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import {
  CALIBRATION_STATUS_LABELS,
  CALIBRATION_STATUS_COLORS,
  CALIBRATION_LEVEL_LABELS,
  useCalibrationSessions,
  useCycleEvalsForCalibration,
  useCalibrationMatrix,
  useCalibrationHistory,
  useCreateCalibrationSession,
  useSubmitForN2Validation,
  useValidateCalibrationSession,
  useCloseCalibrationSession,
} from '../../hooks/useCalibration'
import CalibrationMatrix from '../../components/calibration/CalibrationMatrix'
import CalibrationHistory from '../../components/calibration/CalibrationHistory'
import { useAllCycles } from '../../hooks/useReviewCycles'
import { ROLES } from '../../utils/constants'

// ─── HELPERS ─────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }) {
  const color = CALIBRATION_STATUS_COLORS[status] || '#6B7280'
  const label = CALIBRATION_STATUS_LABELS[status] || status
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  )
}

// ─── MODAL CRÉATION SESSION ──────────────────────────────────

function CreateSessionModal({ cycleId, onClose }) {
  const [title, setTitle]     = useState('')
  const [n2Deadline, setN2D]  = useState('')
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const createSession = useCreateCalibrationSession()

  const valid = title.trim().length > 0

  async function handleCreate() {
    if (!valid) return
    setSaving(true)
    try {
      await createSession.mutateAsync({ cycleId, title: title.trim(), n2Deadline, notes })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-indigo-500/50 placeholder-gray-600"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: '#0F1117' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Nouvelle session de calibration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Titre *</label>
            <input
              className={inputCls}
              placeholder="Ex : Calibration Q1 2026 — Division Commerciale"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Date limite validation N+2</label>
            <input type="date" className={inputCls} value={n2Deadline} onChange={e => setN2D(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Notes</label>
            <textarea
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder="Instructions ou contexte particulier pour cette session"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-600">
            💡 La session sera créée en mode ouvert. Vous pourrez ensuite calibrer les notes puis soumettre au N+2.
          </p>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">Annuler</button>
            <button
              onClick={handleCreate}
              disabled={!valid || saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
            >
              {saving ? <Spinner /> : 'Créer la session'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── VUE DÉTAIL D'UNE SESSION ────────────────────────────────

function SessionDetail({ session, cycleId, isN2, onBack }) {
  const [activeTab, setActiveTab] = useState('matrix')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: evals = [], isLoading } = useCalibrationMatrix(session.id)
  const { data: history = [] } = useCalibrationHistory(session.id)
  const submitForN2    = useSubmitForN2Validation()
  const validateSession = useValidateCalibrationSession()
  const closeSession   = useCloseCalibrationSession()

  function notify(m) { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  async function handleSubmitN2() {
    setSaving(true)
    try { await submitForN2.mutateAsync({ sessionId: session.id, cycleId }); notify('Soumis au N+2 ✓') }
    catch { setSaving(false) }
  }
  async function handleValidate() {
    setSaving(true)
    try { await validateSession.mutateAsync({ sessionId: session.id, cycleId }); notify('Session validée ✓') }
    catch { setSaving(false) }
  }
  async function handleClose() {
    if (!window.confirm('Clôturer cette session ? Action irréversible.')) return
    setSaving(true)
    try { await closeSession.mutateAsync({ sessionId: session.id, cycleId }); notify('Session clôturée ✓') }
    catch { setSaving(false) }
  }

  const tabs = [
    { id: 'matrix',  label: 'Matrice', icon: '📊' },
    { id: 'history', label: `Historique (${history.length})`, icon: '📋' },
  ]

  return (
    <div className="space-y-4">
      {/* En-tête session */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-indigo-400 hover:text-indigo-300 mb-2 flex items-center gap-1"
          >
            ← Retour aux sessions
          </button>
          <h3 className="text-base font-bold text-white">{session.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={session.status} />
            {session.n2_deadline && (
              <span className="text-xs text-gray-500">Échéance N+2 : {fmtDate(session.n2_deadline)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {session.status === 'in_progress' && !isN2 && (
            <button
              onClick={handleSubmitN2}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600/80 hover:bg-blue-500 disabled:opacity-40"
            >
              📤 Soumettre N+2
            </button>
          )}
          {session.status === 'pending_n2' && isN2 && (
            <button
              onClick={handleValidate}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
            >
              ✓ Valider la session
            </button>
          )}
          {session.status === 'validated' && isN2 && (
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10"
            >
              🔒 Clôturer
            </button>
          )}
        </div>
      </div>

      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-2"
        >
          {msg}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === t.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'matrix' && (
        isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <CalibrationMatrix
            evals={evals}
            sessionId={session.id}
            sessionStatus={session.status}
            isN2={isN2}
          />
        )
      )}
      {activeTab === 'history' && <CalibrationHistory history={history} />}
    </div>
  )
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────

export default function CalibrationPage() {
  const { profile } = useAuth()
  const { can, hasRole } = usePermission()
  const isAdmin = can('intelligence', 'succession', 'admin')
  const isDirecteur = can('intelligence', 'overview', 'read')
  const isChefDivision = hasRole(ROLES.CHEF_DIVISION) && !isAdmin
  const isChefService = hasRole(ROLES.CHEF_SERVICE) && !isDirecteur && !isChefDivision && !isAdmin
  const isManager = isAdmin || isDirecteur || isChefDivision || isChefService
  const isN2      = isAdmin || isDirecteur

  const { data: allCycles = [] } = useAllCycles()
  const closedCycles = allCycles.filter(c => ['in_review', 'closed'].includes(c.status))

  const [selectedCycleId, setSelectedCycleId] = useState(closedCycles[0]?.id || null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  const { data: sessions = [], isLoading } = useCalibrationSessions(selectedCycleId)

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="text-3xl mb-2">🔒</div>
          <div className="text-sm text-gray-500">Accès réservé aux managers et directeurs</div>
        </div>
      </div>
    )
  }

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        cycleId={selectedCycleId}
        isN2={isN2}
        onBack={() => setSelectedSession(null)}
      />
    )
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Sélection du cycle */}
      <div className="flex items-center gap-3">
        <select
          className="rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-indigo-500/50"
          value={selectedCycleId || ''}
          onChange={e => { setSelectedCycleId(e.target.value || null); setSelectedSession(null) }}
        >
          <option value="">— Sélectionner un cycle —</option>
          {allCycles.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {selectedCycleId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
          >
            + Nouvelle session
          </button>
        )}
      </div>

      {/* Sessions */}
      {!selectedCycleId ? (
        <Card>
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-sm text-gray-500">Sélectionnez un cycle pour voir les sessions de calibration</div>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm text-gray-500 mb-4">Aucune session de calibration pour ce cycle</div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}
            >
              Créer la première session
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card key={session.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{session.title}</span>
                    <StatusBadge status={session.status} />
                    {session.status === 'pending_n2' && isN2 && (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full animate-pulse">
                        Action requise
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Créé le {fmtDate(session.created_at)}
                    {session.n2_deadline && ` · Échéance N+2 : ${fmtDate(session.n2_deadline)}`}
                    {session.initiator && ` · Par ${session.initiator.first_name} ${session.initiator.last_name}`}
                  </div>
                  {session.notes && (
                    <p className="text-xs text-gray-600 mt-1">{session.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSession(session)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all"
                >
                  Ouvrir →
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info sur le workflow */}
      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-4">
        <div className="text-xs font-semibold text-gray-400 mb-3">Workflow calibration</div>
        <div className="flex items-center gap-2 text-xs">
          {[
            { step: '1', label: 'Créer la session', level: 'N+1', color: '#6366F1' },
            { sep: true },
            { step: '2', label: 'Proposer les overrides', level: 'N+1', color: '#6366F1' },
            { sep: true },
            { step: '3', label: 'Soumettre au N+2', level: 'N+1', color: '#8B5CF6' },
            { sep: true },
            { step: '4', label: 'Valider / Rejeter', level: 'N+2', color: '#EC4899' },
            { sep: true },
            { step: '5', label: 'Clôturer', level: 'DRH', color: '#10B981' },
          ].map((item, i) => {
            if (item.sep) return <div key={i} className="text-gray-700">→</div>
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: item.color }}
                >
                  {item.step}
                </div>
                <div className="text-[10px] text-gray-500 text-center">{item.label}</div>
                <div className="text-[9px] font-semibold" style={{ color: item.color }}>{item.level}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal création */}
      <AnimatePresence>
        {showCreate && selectedCycleId && (
          <CreateSessionModal
            cycleId={selectedCycleId}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
