// ============================================================
// APEX RH — MesConges.jsx — S124
// Route : /mes-conges
// Module autonome : soldes, demandes, justificatifs, pipeline
// ============================================================
import { useState } from 'react'
import { CalendarDays, Plus, CalendarOff, Upload, FileText, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import {
  useMyBalances, useMyLeaveRequests, useActiveLeaveTypes,
  useCreateLeaveRequest, useSubmitLeaveRequest,
  countWorkDays, LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS, LEAVE_STATUS_BG,
} from '../../hooks/useConges'
import { GLASS_STYLE } from '../../utils/constants'
import { KpiCard, SectionCard, ProgressBar, PipelineSteps, formatDateFR } from './SuiviTempsShared'

const fadeIn = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
}

const PALETTE = ['#818CF8', '#F87171', '#FCD34D', '#34D399', '#FB923C', '#A78BFA']

// ─── Card solde par type ──────────────────────────────────────
function SoldeCard({ type, balance, idx }) {
  const color = PALETTE[idx % PALETTE.length]
  const total = balance?.total_days ?? 0
  const used  = balance?.used_days  ?? 0
  const left  = Math.max(0, total - used)
  return (
    <div style={{ ...GLASS_STYLE, borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{type.name}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>{used} pris</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color }}>{left}</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>/ {total} j</span>
      </div>
      <ProgressBar value={left} max={total} color={color} />
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', textAlign: 'right', marginTop: 5 }}>
        {total > 0 ? Math.round((left / total) * 100) : 0}% restants
      </div>
    </div>
  )
}

// ─── Formulaire demande ───────────────────────────────────────
function FormulaireConge({ types, onSuccess }) {
  const [typeId,   setTypeId]  = useState(types[0]?.id ?? '')
  const [fromDate, setFrom]    = useState('')
  const [toDate,   setTo]      = useState('')
  const [motif,    setMotif]   = useState('')
  const [hasFile,  setHasFile] = useState(false)

  const createReq  = useCreateLeaveRequest()
  const submitReq  = useSubmitLeaveRequest()

  const workDays = fromDate && toDate
    ? countWorkDays(new Date(fromDate), new Date(toDate))
    : 0

  async function handleSubmit() {
    if (!typeId || !fromDate || !toDate) return
    const { data } = await createReq.mutateAsync({ leaveTypeId: typeId, startDate: fromDate, endDate: toDate, reason: motif })
    if (data?.[0]?.id) {
      await submitReq.mutateAsync({ id: data[0].id })
      onSuccess?.()
    }
  }

  return (
    <SectionCard title="Nouvelle demande" action={
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={14} style={{ color: '#10B981' }} />
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Types */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Type de congé</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {types.slice(0, 6).map((t, i) => {
              const c = PALETTE[i % PALETTE.length]
              const active = typeId === t.id
              return (
                <button key={t.id} onClick={() => setTypeId(t.id)} style={{
                  padding: '8px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
                  background: active ? `${c}18` : 'rgba(255,255,255,.03)',
                  color:      active ? c : 'rgba(255,255,255,.4)',
                  border:     active ? `1px solid ${c}40` : '1px solid rgba(255,255,255,.07)',
                  transition: 'all .15s',
                }}>
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['Du', fromDate, setFrom], ['Au', toDate, setTo]].map(([lbl, val, set]) => (
            <div key={lbl}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{lbl}</label>
              <input type="date" value={val} onChange={e => set(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: val ? '#fff' : 'rgba(255,255,255,.3)', fontSize: 12, outline: 'none' }} />
            </div>
          ))}
        </div>

        {/* Motif */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Motif (optionnel)</label>
          <textarea rows={2} value={motif} onChange={e => setMotif(e.target.value)} placeholder="Précisez si nécessaire…"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
        </div>

        {/* Justificatif */}
        <div>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Justificatif</label>
          <div
            onClick={() => setHasFile(f => !f)}
            style={{
              padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
              border: hasFile ? '1px solid rgba(52,211,153,.3)' : '1px dashed rgba(255,255,255,.1)',
              background: hasFile ? 'rgba(52,211,153,.06)' : 'rgba(255,255,255,.02)',
            }}>
            {hasFile
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#34D399', fontSize: 12, fontWeight: 600 }}><FileText size={14} /> certificat.pdf</div>
              : <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 12 }}><Upload size={20} style={{ display: 'block', margin: '0 auto 6px' }} />Glisser ou cliquer pour importer</div>
            }
          </div>
        </div>

        {/* Récap */}
        {workDays > 0 && (
          <div style={{ background: 'rgba(129,140,248,.08)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Durée estimée</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#818CF8' }}>{workDays} jour{workDays > 1 ? 's' : ''} ouvré{workDays > 1 ? 's' : ''}</span>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!typeId || !fromDate || !toDate || createReq.isPending}
          style={{ padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!typeId || !fromDate || !toDate) ? .5 : 1 }}>
          <Send size={14} /> Soumettre la demande
        </button>
      </div>
    </SectionCard>
  )
}

// ─── Page principale ──────────────────────────────────────────
export default function MesConges() {
  const year = new Date().getFullYear()
  const { data: types    = [] } = useActiveLeaveTypes()
  const { data: balances = [] } = useMyBalances(year)
  const { data: requests = [], refetch } = useMyLeaveRequests(year)

  const nextApproved = requests
    .filter(r => r.status === 'approved' && new Date(r.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0]

  const daysUntil = nextApproved
    ? Math.round((new Date(nextApproved.start_date) - new Date()) / 86400000)
    : null

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(180deg,rgba(16,185,129,0.04) 0%,transparent 200px)' }}>
      <div className="px-6 pt-8 pb-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CalendarDays size={18} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
              Mes Congés
            </h1>
            <p className="text-sm text-white/35">Soldes, demandes, justificatifs et suivi des approbations.</p>
          </div>
        </div>

        {/* Soldes */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {types.slice(0, 4).map((t, i) => (
            <SoldeCard key={t.id} type={t} balance={balances.find(b => b.leave_type_id === t.id)} idx={i} />
          ))}
        </motion.div>

        {/* Prochain congé */}
        {nextApproved && (
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.15)', borderRadius: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,211,153,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarDays size={16} style={{ color: '#34D399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 3 }}>Prochain congé validé</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {types.find(t => t.id === nextApproved.leave_type_id)?.name ?? 'Congé'} —{' '}
                {formatDateFR(nextApproved.start_date, { day: 'numeric', month: 'long' })} au{' '}
                {formatDateFR(nextApproved.end_date, { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#34D399', whiteSpace: 'nowrap' }}>
              dans {daysUntil} jour{daysUntil !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Formulaire + Liste */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
          <FormulaireConge types={types} onSuccess={refetch} />

          <SectionCard title="Mes demandes" action={<span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>{requests.length} au total</span>}>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CalendarOff size={32} style={{ color: 'rgba(255,255,255,.15)', display: 'block', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>Aucune demande de congé</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {requests.map((r, i) => {
                  const typeName = types.find(t => t.id === r.leave_type_id)?.name ?? 'Congé'
                  const c = PALETTE[i % PALETTE.length]
                  const sBg    = LEAVE_STATUS_BG[r.status]    ?? 'rgba(255,255,255,.07)'
                  const sColor = LEAVE_STATUS_COLORS[r.status] ?? '#9CA3AF'
                  const sLabel = LEAVE_STATUS_LABELS[r.status] ?? r.status
                  return (
                    <div key={r.id} style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>
                          {typeName}
                          {r.justification_file && <span style={{ marginLeft: 7, fontSize: 10, color: '#34D399', background: 'rgba(52,211,153,.1)', borderRadius: 6, padding: '1px 7px' }}>📎</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 3 }}>
                          {formatDateFR(r.start_date)} → {formatDateFR(r.end_date)} · {r.working_days ?? '—'} j
                        </div>
                      </div>
                      <PipelineSteps status={r.status} />
                      <span style={{ background: sBg, color: sColor, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                        {sLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

      </div>
    </div>
  )
}
