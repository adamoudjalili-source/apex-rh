// ============================================================
// APEX RH — SuiviTempsA.jsx — S124
// Onglets : Saisie du temps · Timer automatique
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { Clock, TrendingUp, AlertTriangle, Send, ChevronLeft, ChevronRight, Play, Square, Briefcase } from 'lucide-react'

import { useMyCurrentTimeSheet, useTimeEntries, useAddTimeEntry, useSubmitTimeSheet, useLastClockEvent, useClockIn, useClockOut, useTimeStats, formatHours, getWeekDates, getCurrentWeekStart, TIMESHEET_STATUS_COLORS, ENTRY_TYPE_LABELS } from '../../hooks/useTemps'
import { GLASS_STYLE } from '../../utils/constants'
import { KpiCard, SectionCard, ProgressBar, StatusBadge, SubmitBtn, NavBtn, formatDateFR } from './SuiviTempsShared'

const OBJECTIF_SEMAINE = 37

// ─── Onglet Saisie ───────────────────────────────────────────
export function OngletSaisie() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart  = getCurrentWeekStart(new Date(Date.now() + weekOffset * 7 * 86400000))
  const weekDates  = getWeekDates(weekStart)

  const { data: sheet, isLoading: loadingSheet } = useMyCurrentTimeSheet()
  const { data: entries = [], isLoading: loadingEntries } = useTimeEntries(sheet?.id)
  const { data: stats } = useTimeStats({ period: 'month' })
  const submitSheet = useSubmitTimeSheet()

  const totalWeek = entries.reduce((s, e) => s + (e.hours ?? 0), 0)
  const dispo     = Math.round((totalWeek / OBJECTIF_SEMAINE) * 100)

  const dayMap = {}
  entries.forEach(e => { dayMap[e.entry_date] = e })

  function handleSubmit() {
    if (sheet?.id) submitSheet.mutate({ timesheetId: sheet.id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="Disponibilité"  value={`${dispo}%`}          sub="semaine en cours"    color="#818CF8" icon={TrendingUp} bar={dispo}     barMax={100} />
        <KpiCard label="Heures semaine" value={formatHours(totalWeek)} sub={`objectif : ${OBJECTIF_SEMAINE}h`} color="#34D399" icon={Clock}      bar={totalWeek} barMax={OBJECTIF_SEMAINE} />
        <KpiCard label="H. supp. mois"  value={formatHours(stats?.overtime ?? 0)} sub="seuil : 10h/mois" color="#FB923C" icon={AlertTriangle} bar={stats?.overtime ?? 0} barMax={10} />
        <KpiCard label="Statut feuille" value={sheet ? (TIMESHEET_STATUS_COLORS[sheet.status] ? sheet.status : 'Brouillon') : '—'} sub={sheet?.status === 'submitted' ? 'en attente validation' : 'non soumise'} color="#FCD34D" icon={Send} />
      </div>

      {/* Grille semaine */}
      <SectionCard
        title={`Semaine — ${formatDateFR(weekStart, { day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <NavBtn onClick={() => setWeekOffset(w => w - 7)}>
              <ChevronLeft size={13} style={{ display: 'inline' }} /> Préc.
            </NavBtn>
            <NavBtn onClick={() => setWeekOffset(w => w + 7)}>
              Suiv. <ChevronRight size={13} style={{ display: 'inline' }} />
            </NavBtn>
          </div>
        }
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
            <span>{formatHours(totalWeek)} saisies</span><span>objectif {OBJECTIF_SEMAINE}h</span>
          </div>
          <ProgressBar value={totalWeek} max={OBJECTIF_SEMAINE} color="#818CF8" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loadingSheet || loadingEntries ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #818CF8', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : weekDates.map((d, i) => {
            const key     = typeof d === 'string' ? d : d.toISOString().slice(0, 10)
            const entry   = dayMap[key]
            const h       = entry?.hours ?? 0
            const isToday = key === new Date().toISOString().slice(0, 10)
            const isAbsent = entry?.entry_type === 'leave'
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 48px auto',
                alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12,
                background: isAbsent ? 'rgba(16,185,129,0.05)' : isToday ? 'rgba(129,140,248,0.07)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isAbsent ? 'rgba(16,185,129,0.15)' : isToday ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isAbsent ? '#10B981' : isToday ? '#818CF8' : 'rgba(255,255,255,0.5)' }}>
                  {formatDateFR(d, { weekday: 'short', day: '2-digit' })}
                </span>
                <span style={{ fontSize: 12, color: isAbsent ? '#10B981' : 'rgba(255,255,255,0.55)', fontStyle: isAbsent || isToday ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isAbsent ? '🌿 Congé' : entry?.description || (isToday ? 'Saisie en cours…' : '—')}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', color: h >= 8 ? '#34D399' : h > 0 ? '#FCD34D' : 'rgba(255,255,255,0.2)' }}>
                  {h > 0 ? formatHours(h) : '—'}
                </span>
                <StatusBadge status={isAbsent ? 'approved' : entry?.status ?? 'draft'} />
              </div>
            )
          })}
        </div>
        {sheet?.status === 'draft' && (
          <div style={{ marginTop: 14 }}>
            <SubmitBtn onClick={handleSubmit} color="linear-gradient(135deg,#6366F1,#4F46E5)">
              <Send size={14} /> Soumettre la feuille de la semaine
            </SubmitBtn>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Onglet Timer ─────────────────────────────────────────────
export function OngletTimer() {
  const [running, setRunning]   = useState(false)
  const [seconds, setSeconds]   = useState(0)
  const [project, setProject]   = useState('Développement module OKR')
  const intervalRef              = useRef(null)

  const { data: lastEvent }      = useLastClockEvent()
  const clockIn                  = useClockIn()
  const clockOut                 = useClockOut()
  const { data: sheet }          = useMyCurrentTimeSheet()
  const { data: entries = [] }   = useTimeEntries(sheet?.id)

  useEffect(() => {
    if (lastEvent?.event_type === 'clock_in' && !lastEvent?.clock_out_time) {
      setRunning(true)
      const elapsed = Math.floor((Date.now() - new Date(lastEvent.clock_in_time)) / 1000)
      setSeconds(elapsed)
    }
  }, [lastEvent])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function toggleTimer() {
    if (running) {
      clockOut.mutate({})
      setRunning(false)
    } else {
      clockIn.mutate({ description: project })
      setRunning(true)
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const hh = Math.floor(seconds / 3600)
  const display = hh > 0 ? `${String(hh).padStart(2,'0')}:${mm}` : `${mm}:${ss}`

  const todayKey  = new Date().toISOString().slice(0, 10)
  const todayLog  = entries.filter(e => e.entry_date === todayKey)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

      {/* Timer card */}
      <SectionCard title="Timer en temps réel">
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div style={{
            fontSize: 54, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            color: running ? '#34D399' : '#fff',
            textShadow: running ? '0 0 28px rgba(52,211,153,.4)' : 'none',
            transition: 'all .3s',
          }}>
            {display}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 8 }}>
            {running ? 'en cours' : 'prêt'}
          </div>
        </div>

        {/* Projet */}
        <div style={{ ...GLASS_STYLE, borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Briefcase size={13} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project}</span>
        </div>

        <button onClick={toggleTimer} style={{
          width: '100%', padding: '13px 0', borderRadius: 14, border: running ? '1px solid rgba(239,68,68,.28)' : 'none', cursor: 'pointer',
          background: running ? 'rgba(239,68,68,.12)' : 'linear-gradient(135deg,#34D399,#10B981)',
          color: running ? '#F87171' : '#fff', fontWeight: 800, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .25s',
        }}>
          {running
            ? <><Square size={16} fill="#F87171" stroke="none" /> Arrêter le timer</>
            : <><Play size={16} fill="#fff" stroke="none" /> Démarrer le timer</>
          }
        </button>
      </SectionCard>

      {/* Log + breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionCard title="Log du jour">
          {todayLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'rgba(255,255,255,.25)' }}>
              Aucune saisie aujourd'hui
            </div>
          ) : todayLog.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>{e.description || ENTRY_TYPE_LABELS[e.entry_type] || 'Temps de travail'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 2 }}>{e.entry_date}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8' }}>{formatHours(e.hours)}</span>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Répartition du jour">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { l: 'Productif', pct: 68, c: '#34D399' },
              { l: 'Admin',     pct: 21, c: '#818CF8' },
              { l: 'Réunions',  pct: 11, c: '#FCD34D' },
            ].map(t => (
              <span key={t.l} style={{ background: `${t.c}18`, color: t.c, border: `1px solid ${t.c}30`, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                {t.l} {t.pct}%
              </span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
