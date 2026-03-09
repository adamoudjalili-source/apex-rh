// ============================================================
// APEX RH — SuiviTempsA.jsx — S124 enrichi
// Onglets : Saisie du temps (grille éditable) · Timer
// ============================================================
import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, AlertTriangle, ChevronLeft, ChevronRight,
         Send, Copy, Play, Square, MessageSquare } from 'lucide-react'

import {
  useMyCurrentTimeSheet, useCreateTimeSheet, useTimeEntries,
  useAddTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry,
  useSubmitTimeSheet, useLastClockEvent, useClockIn, useClockOut,
  useTimeStats, formatHours, getWeekDates, getCurrentWeekStart,
  ENTRY_TYPE_LABELS,
} from '../../hooks/useTemps'
import { useProjects } from '../../hooks/useProjects'
import { KpiCard, SectionCard, ProgressBar, StatusBadge,
         SubmitBtn, NavBtn, formatDateFR } from './SuiviTempsShared'

const TYPES = [
  { value: 'regular',  label: 'Régulier'    },
  { value: 'overtime', label: 'Heures sup.' },
  { value: 'training', label: 'Formation'   },
  { value: 'travel',   label: 'Déplacement' },
  { value: 'remote',   label: 'Télétravail' },
  { value: 'project',  label: 'Projet'      },
]
const OBJ_SEMAINE = 37

const INP = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,.08)',
  background: 'rgba(255,255,255,.04)',
  color: 'rgba(255,255,255,.75)', fontSize: 12,
  outline: 'none', fontFamily: 'inherit',
}
const SEL = { ...INP, cursor: 'pointer' }

// ─── Ligne d'entrée éditable ─────────────────────────────────
function EntryRow({ entry, timesheetId, projects }) {
  const update  = useUpdateTimeEntry()
  const destroy = useDeleteTimeEntry()
  const [local, setLocal] = useState({
    hours:       entry.hours ?? 0,
    entry_type:  entry.entry_type ?? 'regular',
    project_id:  entry.project_id ?? '',
    description: entry.description ?? '',
  })

  const save = useCallback((field, value) => {
    const val = value === '' ? null : value
    setLocal(l => ({ ...l, [field]: value }))
    update.mutate({ id: entry.id, timesheetId, [field]: val })
  }, [entry.id, timesheetId, update])

  const anomaly = local.hours > 10

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '70px 120px 1fr 28px',
      gap: 6, alignItems: 'center', padding: '8px 10px', borderRadius: 10,
      background: anomaly ? 'rgba(251,146,60,.05)' : 'rgba(255,255,255,.025)',
      border: `1px solid ${anomaly ? 'rgba(251,146,60,.2)' : 'rgba(255,255,255,.05)'}`,
    }}>
      <div style={{ position: 'relative' }}>
        <input type="number" min="0" max="24" step="0.5" value={local.hours}
          onChange={e => setLocal(l => ({ ...l, hours: +e.target.value }))}
          onBlur={e => save('hours', +e.target.value)}
          style={{ ...INP, width: '100%', color: local.hours >= 8 ? '#34D399' : local.hours > 0 ? '#fff' : 'rgba(255,255,255,.3)' }}
        />
        {anomaly && <AlertTriangle size={10} style={{ color: '#FB923C', position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }} />}
      </div>

      <select value={local.entry_type} onChange={e => save('entry_type', e.target.value)} style={SEL}>
        {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 6 }}>
        <select value={local.project_id} onChange={e => save('project_id', e.target.value)} style={SEL}>
          <option value="">— Projet —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="text" placeholder="Description…" value={local.description}
          onChange={e => setLocal(l => ({ ...l, description: e.target.value }))}
          onBlur={e => save('description', e.target.value)}
          style={{ ...INP, width: '100%' }}
        />
      </div>

      <button onClick={() => destroy.mutate({ id: entry.id, timesheetId })}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.2)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.2)'}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Bloc jour ───────────────────────────────────────────────
function DayBlock({ dateStr, entries, timesheetId, projects, sheetStatus, rejectionReason }) {
  const addEntry  = useAddTimeEntry()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState({ hours: 8, entry_type: 'regular', project_id: '', description: '' })

  const todayStr   = new Date().toISOString().slice(0, 10)
  const dayEntries = entries.filter(e => e.entry_date === dateStr)
  const totalH     = dayEntries.reduce((s, e) => s + (e.hours ?? 0), 0)
  const isToday    = dateStr === todayStr
  const isLeave    = dayEntries.some(e => e.entry_type === 'leave')
  const isEmpty    = !isLeave && dayEntries.length === 0
  const isOverload = totalH > 10

  async function handleAdd() {
    if (!timesheetId) return
    await addEntry.mutateAsync({
      timesheetId, entryDate: dateStr,
      hours: draft.hours, entryType: draft.entry_type,
      projectId: draft.project_id || null, description: draft.description || null,
    })
    setDraft({ hours: 8, entry_type: 'regular', project_id: '', description: '' })
    setAdding(false)
  }

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: isToday ? 'rgba(129,140,248,.04)' : 'rgba(255,255,255,.02)',
      border: `1px solid ${isToday ? 'rgba(129,140,248,.15)' : 'rgba(255,255,255,.05)'}`,
    }}>
      {/* En-tête jour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: isToday ? '#818CF8' : 'rgba(255,255,255,.7)', minWidth: 130 }}>
          {formatDateFR(dateStr, { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: totalH >= 8 ? '#34D399' : totalH > 0 ? '#FCD34D' : 'rgba(255,255,255,.2)' }}>
          {totalH > 0 ? formatHours(totalH) : '—'}
        </span>
        {isEmpty && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#F87171', background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 7, padding: '2px 8px' }}>
            <AlertTriangle size={11} /> Jour vide
          </span>
        )}
        {isOverload && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#FB923C', background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.2)', borderRadius: 7, padding: '2px 8px' }}>
            <AlertTriangle size={11} /> &gt; 10h
          </span>
        )}
        <div style={{ flex: 1 }} />
        <StatusBadge status={sheetStatus ?? 'draft'} />
      </div>

      {/* Commentaire de rejet */}
      {sheetStatus === 'rejected' && rejectionReason && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '8px 14px 0', padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)' }}>
          <MessageSquare size={13} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '.05em' }}>Motif de rejet</span>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: '2px 0 0' }}>{rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Corps */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLeave ? (
          <div style={{ padding: '8px 10px', fontSize: 12, color: '#10B981', fontStyle: 'italic', background: 'rgba(16,185,129,.05)', border: '1px solid rgba(16,185,129,.12)', borderRadius: 10 }}>
            🌿 Congé — journée non travaillée
          </div>
        ) : dayEntries.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', fontStyle: 'italic', margin: 0 }}>Aucune saisie</p>
        ) : dayEntries.map(e => (
          <EntryRow key={e.id} entry={e} timesheetId={timesheetId} projects={projects} />
        ))}

        {/* Formulaire +ligne inline */}
        {adding && !isLeave && (
          <div style={{ display: 'grid', gridTemplateColumns: '70px 120px 1fr 64px', gap: 6, alignItems: 'center', padding: '8px 10px', borderRadius: 10, background: 'rgba(129,140,248,.06)', border: '1px solid rgba(129,140,248,.15)' }}>
            <input type="number" min="0" max="24" step="0.5" value={draft.hours}
              onChange={e => setDraft(d => ({ ...d, hours: +e.target.value }))}
              style={{ ...INP, width: '100%' }} />
            <select value={draft.entry_type} onChange={e => setDraft(d => ({ ...d, entry_type: e.target.value }))} style={SEL}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 6 }}>
              <select value={draft.project_id} onChange={e => setDraft(d => ({ ...d, project_id: e.target.value }))} style={SEL}>
                <option value="">— Projet —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="text" placeholder="Description…" value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                style={{ ...INP, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={handleAdd} disabled={addEntry.isPending}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                {addEntry.isPending ? '…' : 'OK'}
              </button>
              <button onClick={() => setAdding(false)}
                style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          </div>
        )}

        {!isLeave && !adding && (
          <button onClick={() => setAdding(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 9, border: '1px dashed rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, width: 'fit-content', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,.4)'; e.currentTarget.style.color = '#818CF8' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.3)' }}>
            <Plus size={13} /> Ajouter une ligne
          </button>
        )}
      </div>
    </div>
  )
}

// ─── OngletSaisie ────────────────────────────────────────────
export function OngletSaisie() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getCurrentWeekStart(new Date(Date.now() + weekOffset * 7 * 86400000))
  const weekDates = getWeekDates(weekStart).slice(0, 5)

  const { data: sheet,    isLoading: loadingSheet   } = useMyCurrentTimeSheet()
  const { data: entries = [], isLoading: loadingE   } = useTimeEntries(sheet?.id)
  const { data: projects = [] }                        = useProjects({})
  const { data: stats }                                = useTimeStats({ period: 'month' })
  const createSheet = useCreateTimeSheet()
  const submitSheet = useSubmitTimeSheet()

  const totalWeek = entries.reduce((s, e) => s + (e.hours ?? 0), 0)
  const dispo     = Math.round((totalWeek / OBJ_SEMAINE) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="Disponibilité"  value={`${dispo}%`}             sub="semaine en cours"           color="#818CF8" bar={dispo}           barMax={100} />
        <KpiCard label="Heures semaine" value={formatHours(totalWeek)}   sub={`objectif : ${OBJ_SEMAINE}h`} color="#34D399" bar={totalWeek}     barMax={OBJ_SEMAINE} />
        <KpiCard label="H. supp. mois"  value={formatHours(stats?.overtime ?? 0)} sub="seuil : 10h/mois" color="#FB923C" bar={stats?.overtime ?? 0} barMax={10} />
        <KpiCard label="Statut feuille" value={sheet?.status ?? '—'}     sub={sheet?.status === 'rejected' ? 'rejetée — voir motif' : sheet?.status === 'submitted' ? 'en attente validation' : 'non soumise'} color={sheet?.status === 'rejected' ? '#F87171' : '#FCD34D'} />
      </div>

      {/* Nav semaine */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NavBtn onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={13} style={{ display: 'inline' }} /> Préc.</NavBtn>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>
            {formatDateFR(weekStart, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <NavBtn onClick={() => setWeekOffset(w => w + 1)}>Suiv. <ChevronRight size={13} style={{ display: 'inline' }} /></NavBtn>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 190 }}>
            <div style={{ flex: 1 }}><ProgressBar value={totalWeek} max={OBJ_SEMAINE} color="#818CF8" /></div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}>{formatHours(totalWeek)} / {OBJ_SEMAINE}h</span>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <Copy size={12} /> Copier sem. préc.
          </button>
        </div>
      </div>

      {/* Grille jours */}
      {(loadingSheet || loadingE) ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #818CF8', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : weekDates.map(d => (
        <DayBlock key={d} dateStr={d} entries={entries} timesheetId={sheet?.id}
          projects={projects} sheetStatus={sheet?.status} rejectionReason={sheet?.rejection_reason} />
      ))}

      {/* Actions bas */}
      {sheet?.status === 'draft' && totalWeek > 0 && (
        <SubmitBtn onClick={() => submitSheet.mutate(sheet.id)} color="linear-gradient(135deg,#6366F1,#4F46E5)">
          <Send size={14} /> Soumettre la semaine ({formatHours(totalWeek)})
        </SubmitBtn>
      )}
      {!sheet && (
        <button onClick={() => createSheet.mutate({ weekStart })}
          style={{ padding: '13px 0', borderRadius: 14, border: '1px dashed rgba(129,140,248,.3)', background: 'rgba(129,140,248,.05)', color: '#818CF8', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={14} /> Créer la feuille de cette semaine
        </button>
      )}
    </div>
  )
}

// ─── OngletTimer ─────────────────────────────────────────────
export function OngletTimer() {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [project, setProject] = useState('')
  const intervalRef = useRef(null)

  const { data: lastEvent }     = useLastClockEvent()
  const { data: projects = [] } = useProjects({})
  const clockIn                 = useClockIn()
  const clockOut                = useClockOut()
  const { data: sheet }        = useMyCurrentTimeSheet()
  const { data: entries = [] } = useTimeEntries(sheet?.id)

  useEffect(() => {
    if (lastEvent?.event_type === 'clock_in' && !lastEvent?.clock_out_time) {
      setRunning(true)
      const elapsed = Math.floor((Date.now() - new Date(lastEvent.clock_in_time)) / 1000)
      setSeconds(elapsed > 0 ? elapsed : 0)
    }
  }, [lastEvent])

  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    else clearInterval(intervalRef.current)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const hh = Math.floor(seconds / 3600)
  const mm = Math.floor((seconds % 3600) / 60)
  const ss = seconds % 60
  const display = hh > 0 ? `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}` : `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  const todayLog = entries.filter(e => e.entry_date === new Date().toISOString().slice(0, 10))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
      <SectionCard title="Timer en temps réel">
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div style={{ fontSize: 54, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: running ? '#34D399' : '#fff', textShadow: running ? '0 0 28px rgba(52,211,153,.4)' : 'none', transition: 'all .3s' }}>
            {display}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 8 }}>{running ? 'en cours' : 'prêt'}</div>
        </div>
        <select value={project} onChange={e => setProject(e.target.value)} style={{ ...SEL, width: '100%', marginBottom: 12 }}>
          <option value="">— Projet en cours —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => { if (running) { clockOut.mutate({}); setRunning(false) } else { clockIn.mutate({ description: project }); setRunning(true) } }}
          style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: running ? '1px solid rgba(239,68,68,.28)' : 'none', cursor: 'pointer', background: running ? 'rgba(239,68,68,.12)' : 'linear-gradient(135deg,#34D399,#10B981)', color: running ? '#F87171' : '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {running ? <><Square size={16} fill="#F87171" stroke="none" /> Arrêter</> : <><Play size={16} fill="#fff" stroke="none" /> Démarrer</>}
        </button>
      </SectionCard>
      <SectionCard title="Log du jour">
        {todayLog.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'rgba(255,255,255,.25)', margin: 0 }}>Aucune saisie aujourd'hui</p>
        ) : todayLog.map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>{e.description || ENTRY_TYPE_LABELS[e.entry_type] || 'Travail'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 2 }}>{e.entry_date}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8' }}>{formatHours(e.hours)}</span>
          </div>
        ))}
      </SectionCard>
    </div>
  )
}
