// APEX RH — ReviewCyclesList.jsx — S123 — Vue manager : cycles, évaluations, validation, calibration
import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CYCLE_FREQUENCY_LABELS,
  EVAL_STATUS_LABELS,
  EVAL_STATUS_COLORS,
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  CYCLE_STATUS_LABELS,
  formatCyclePeriod,
  countEvalStatuses,
  useAllCycles,
  useCycleEvaluations,
  useManagerPendingEvals,
  useCreateCycle,
  useActivateCycle,
  useStartReviewPhase,
  useCloseCycle,
  useValidateEvaluation,
  useArchiveEvaluation,
  useReviewTemplates,
} from '../../hooks/useReviewCycles'
import { REVIEW_STATUS } from '../../utils/constants'
import { fmtDate, Modal, Spinner, Card, Badge, SectionTitle } from './ReviewCycleStats'
import { ManagerEvalForm } from './ReviewCycleDetail'

const CalibrationPage = lazy(() => import('../intelligence/CalibrationPage'))

function CreateCycleForm({ onClose }) {
  const { data: templates = [] } = useReviewTemplates()
  const createCycle = useCreateCycle()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const defaultTemplate = templates.find(t => t.is_default)

  const [form, setForm] = useState({
    title: '', frequency: 'annual',
    period_start: '', period_end: '',
    template_id: defaultTemplate?.id || '',
  })

  useEffect(() => {
    if (defaultTemplate && !form.template_id) {
      setForm(prev => ({ ...prev, template_id: defaultTemplate.id }))
    }
  }, [defaultTemplate?.id])

  const valid = form.title && form.period_start && form.period_end && form.frequency
  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-indigo-500/50"

  async function handleSubmit() {
    if (!valid) return
    setSaving(true)
    try {
      await createCycle.mutateAsync({ ...form, template_id: form.template_id || null, collaborator_ids: [] })
      setSuccess(true)
      setTimeout(() => { onClose(); setSuccess(false) }, 1500)
    } catch { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Titre du cycle *</label>
        <input className={inputCls} placeholder="Ex : Revue annuelle 2025 — Service Commercial"
          value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Fréquence *</label>
          <select className={inputCls} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
            {Object.entries(CYCLE_FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Date début *</label>
          <input type="date" className={inputCls} value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Date fin *</label>
          <input type="date" className={inputCls} value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} />
        </div>
      </div>
      {templates.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Grille d'évaluation</label>
          <select className={inputCls} value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}>
            <option value="">— Grille standard (5 compétences) —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Défaut)' : ''}</option>)}
          </select>
        </div>
      )}
      <p className="text-xs text-gray-600">💡 Le cycle sera créé en brouillon. Vous pourrez y ajouter des collaborateurs puis l'activer.</p>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white px-4 py-2">Annuler</button>
        <button onClick={handleSubmit} disabled={!valid || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
          {saving ? <Spinner /> : success ? '✓ Créé !' : 'Créer le cycle'}
        </button>
      </div>
    </div>
  )
}

function CycleEvalsList({ cycleId, cycle, onManagerEval, onValidate, onArchive }) {
  const { data: evals = [], isLoading } = useCycleEvaluations(cycleId)

  if (isLoading) return <div className="pt-3 flex justify-center"><Spinner /></div>
  if (evals.length === 0) return (
    <div className="pt-3 text-xs text-gray-600 text-center py-4 border-t border-white/8 mt-3">
      Aucun collaborateur ajouté à ce cycle.
    </div>
  )

  const stats = countEvalStatuses(evals)

  return (
    <div className="mt-4 pt-4 border-t border-white/8">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${stats.completion_rate}%` }} />
        </div>
        <span className="text-xs text-gray-500">{stats.completion_rate}% validées ({stats.validated + stats.archived}/{stats.total})</span>
      </div>
      <div className="space-y-2">
        {evals.map(ev => {
          const name = ev.evaluatee ? `${ev.evaluatee.first_name} ${ev.evaluatee.last_name}` : '—'
          return (
            <div key={ev.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/3 border border-white/8 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 font-semibold">
                  {ev.evaluatee?.first_name?.[0]}{ev.evaluatee?.last_name?.[0]}
                </div>
                <span className="text-sm text-white">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={EVAL_STATUS_LABELS[ev.status]} color={EVAL_STATUS_COLORS[ev.status]} />
                {ev.status === REVIEW_STATUS.SELF_SUBMITTED && (
                  <button onClick={() => onManagerEval(ev)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-indigo-600/80 hover:bg-indigo-500">
                    Évaluer
                  </button>
                )}
                {ev.status === 'manager_submitted' && (
                  <button onClick={() => onValidate(ev.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-green-600/80 hover:bg-green-500">
                    Valider
                  </button>
                )}
                {ev.status === 'validated' && (
                  <button onClick={() => onArchive(ev.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-400 border border-white/10 hover:border-white/20">
                    Archiver
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ManagerView() {
  const { data: allCycles = [], isLoading } = useAllCycles()
  const { data: pendingEvals = [] } = useManagerPendingEvals()
  const [activeTab, setActiveTab] = useState('cycles')
  const [selectedCycleId, setSelectedCycleId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [modalEval, setModalEval] = useState(null)
  const [modalCycle, setModalCycle] = useState(null)
  const [actionMsg, setActionMsg] = useState('')

  const activateCycle = useActivateCycle()
  const startReview   = useStartReviewPhase()
  const closeCycle    = useCloseCycle()
  const validateEval  = useValidateEvaluation()
  const archiveEval   = useArchiveEvaluation()

  const { data: cycleEvals = [] } = useCycleEvaluations(selectedCycleId)

  function notify(msg) { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2000) }

  async function handleActivate(cycleId) { await activateCycle.mutateAsync(cycleId); notify('Cycle activé ✓') }
  async function handleStartReview(cycleId) { await startReview.mutateAsync(cycleId); notify('Phase révision lancée ✓') }
  async function handleClose(cycleId) {
    if (!window.confirm('Clôturer ce cycle ? Cette action est définitive.')) return
    await closeCycle.mutateAsync(cycleId); notify('Cycle clôturé ✓')
  }
  async function handleValidate(evalId) { await validateEval.mutateAsync(evalId); notify('Évaluation validée ✓') }
  async function handleArchive(evalId) { await archiveEval.mutateAsync(evalId); notify('Évaluation archivée ✓') }

  const TABS = [
    { id: 'cycles', label: 'Cycles', count: allCycles.length },
    { id: 'pending', label: 'À évaluer', count: pendingEvals.length, badge: pendingEvals.length > 0 },
    { id: 'validation', label: 'Validation', count: cycleEvals.filter(e => e.status === 'manager_submitted').length },
    { id: 'calibration', label: 'Calibration' },
  ]
  const STATUS_COLORS = { draft: '#6B7280', active: '#10B981', in_review: '#3B82F6', closed: '#9CA3AF' }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' } : {}}>
            {t.label}
            {t.badge && t.count > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {actionMsg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-2">
          {actionMsg}
        </motion.div>
      )}

      {/* ── Onglet Cycles ────────────────────────────────── */}
      {activeTab === 'cycles' && (
        <div>
          <SectionTitle action={<button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>+ Nouveau cycle</button>}>Tous les cycles</SectionTitle>
          {isLoading ? <div className="flex justify-center py-8"><Spinner /></div>
          : allCycles.length === 0 ? (
            <Card>
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🔄</div>
                <div className="text-sm text-gray-500 mb-4">Aucun cycle créé</div>
                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                  Créer le premier cycle
                </button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {allCycles.map(cycle => {
                const isSelected = selectedCycleId === cycle.id
                return (
                  <Card key={cycle.id} className={isSelected ? 'border-indigo-500/30' : ''}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">{cycle.title}</span>
                          <Badge label={CYCLE_STATUS_LABELS[cycle.status]} color={STATUS_COLORS[cycle.status]} />
                          <Badge label={CYCLE_FREQUENCY_LABELS[cycle.frequency]} color="#6366F1" />
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCyclePeriod(cycle.period_start, cycle.period_end)}
                          {cycle.service?.name && ` · ${cycle.service.name}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cycle.status === 'draft' && (
                          <button onClick={() => handleActivate(cycle.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600/80 hover:bg-green-500">Activer</button>
                        )}
                        {cycle.status === 'active' && (
                          <button onClick={() => handleStartReview(cycle.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600/80 hover:bg-blue-500">Lancer révision</button>
                        )}
                        {cycle.status === 'in_review' && (
                          <button onClick={() => handleClose(cycle.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-600/80 hover:bg-gray-500">Clôturer</button>
                        )}
                        <button onClick={() => setSelectedCycleId(isSelected ? null : cycle.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/20">
                          {isSelected ? 'Masquer' : 'Voir évals'}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <CycleEvalsList cycleId={cycle.id} cycle={cycle}
                            onManagerEval={(ev) => { setModalEval(ev); setModalCycle(cycle) }}
                            onValidate={handleValidate} onArchive={handleArchive} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet À évaluer ─────────────────────────────── */}
      {activeTab === 'pending' && (
        <div>
          <SectionTitle>Auto-évaluations soumises — à traiter</SectionTitle>
          {pendingEvals.length === 0 ? (
            <Card><div className="text-center py-6"><div className="text-3xl mb-2">✅</div><div className="text-sm text-gray-500">Aucune évaluation en attente</div></div></Card>
          ) : (
            <div className="space-y-3">
              {pendingEvals.map(ev => {
                const evaluateeName = ev.evaluatee ? `${ev.evaluatee.first_name} ${ev.evaluatee.last_name}` : '—'
                return (
                  <Card key={ev.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white mb-0.5">{evaluateeName}</div>
                        <div className="text-xs text-gray-500">{ev.cycle?.title} · Soumis le {fmtDate(ev.self_submitted_at)}</div>
                      </div>
                      <button onClick={() => { setModalEval(ev); setModalCycle(ev.cycle) }}
                        className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                        Évaluer →
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Validation ──────────────────────────────── */}
      {activeTab === 'validation' && (
        <div>
          <SectionTitle>Évaluations à valider</SectionTitle>
          <div className="mb-3">
            <select className="rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 py-2 focus:outline-none focus:border-indigo-500/50"
              value={selectedCycleId || ''} onChange={e => setSelectedCycleId(e.target.value || null)}>
              <option value="">— Sélectionner un cycle —</option>
              {allCycles.filter(c => ['active', 'in_review'].includes(c.status)).map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          {selectedCycleId && (
            <div className="space-y-3">
              {cycleEvals.filter(e => e.status === 'manager_submitted').map(ev => {
                const name = ev.evaluatee ? `${ev.evaluatee.first_name} ${ev.evaluatee.last_name}` : '—'
                return (
                  <Card key={ev.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white mb-0.5">{name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {ev.overall_rating && (
                            <span className="font-medium" style={{ color: OVERALL_RATING_COLORS[ev.overall_rating] }}>
                              {OVERALL_RATING_LABELS[ev.overall_rating]}
                            </span>
                          )}
                          · Soumis le {fmtDate(ev.manager_submitted_at)}
                        </div>
                      </div>
                      <button onClick={() => handleValidate(ev.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600/80 hover:bg-green-500">
                        ✓ Valider
                      </button>
                    </div>
                    {ev.final_comment && (
                      <p className="mt-2 text-xs text-gray-500 bg-white/3 rounded-lg px-3 py-2">« {ev.final_comment} »</p>
                    )}
                  </Card>
                )
              })}
              {cycleEvals.filter(e => e.status === 'manager_submitted').length === 0 && (
                <div className="text-center text-sm text-gray-600 py-6">Aucune évaluation en attente de validation pour ce cycle</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Calibration ─────────────────────────────── */}
      {activeTab === 'calibration' && (
        <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
          <CalibrationPage />
        </Suspense>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal title="Nouveau cycle d'évaluation" onClose={() => setShowCreateModal(false)} wide>
            <CreateCycleForm onClose={() => setShowCreateModal(false)} />
          </Modal>
        )}
        {modalEval && modalCycle && (
          <Modal title={`Évaluation — ${modalEval.evaluatee?.first_name} ${modalEval.evaluatee?.last_name}`} onClose={() => setModalEval(null)} wide>
            <ManagerEvalForm evaluation={modalEval} cycle={modalCycle} onClose={() => setModalEval(null)} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
