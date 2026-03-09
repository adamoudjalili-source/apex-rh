// ============================================================
// APEX RH — SuiviTempsB.jsx — S124
// Onglets : Validation hiérarchique · Planning · Productivité
// ============================================================
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useTimeSheets, useTimeStats, formatHours, getCurrentWeekStart, getWeekDates, TIMESHEET_STATUS_LABELS } from '../../hooks/useTemps'
import { GLASS_STYLE } from '../../utils/constants'
import { KpiCard, SectionCard, ProgressBar, StatusBadge, NavBtn } from './SuiviTempsShared'

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const HOURS_SLOTS = ['08h', '09h', '10h', '11h', '13h', '14h', '15h', '16h', '17h']

// ─── Onglet Validation ────────────────────────────────────────
export function OngletValidation() {
  const { data: sheets = [], isLoading } = useTimeSheets({})

  const draft     = sheets.filter(s => s.status === 'draft').length
  const submitted = sheets.filter(s => s.status === 'submitted').length
  const approved  = sheets.filter(s => s.status === 'approved').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KpiCard label="En brouillon" value={draft}     sub="semaine courante"  color="rgba(255,255,255,.5)" />
        <KpiCard label="Soumises"     value={submitted} sub="en attente chef"   color="#FCD34D" />
        <KpiCard label="Validées"     value={approved}  sub="ce mois-ci"        color="#34D399" />
      </div>

      <SectionCard title="Historique des feuilles">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #818CF8', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : sheets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
            Aucune feuille de temps
          </div>
        ) : sheets.slice(0, 8).map(s => {
          const totalH = s.time_entries?.reduce((acc, e) => acc + (e.hours ?? 0), 0) ?? 0
          const steps  = ['Employé', 'Chef', 'RH']
          const done   = s.status === 'draft' ? 0 : s.status === 'submitted' ? 1 : s.status === 'approved' ? 3 : 1
          return (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '150px 60px auto auto 1fr',
              alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>
                {new Date(s.week_start).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{formatHours(totalH)}</span>
              <StatusBadge status={s.status} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>{steps[Math.min(done, 2)]}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                  <div style={{ width: `${(done / 3) * 100}%`, height: '100%', borderRadius: 99, background: done === 3 ? '#34D399' : '#FCD34D', transition: 'width .4s' }} />
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{done}/3</span>
              </div>
            </div>
          )
        })}
      </SectionCard>
    </div>
  )
}

// ─── Onglet Planning ──────────────────────────────────────────
export function OngletPlanning() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getCurrentWeekStart(new Date(Date.now() + weekOffset * 7 * 86400000))
  const weekDates = getWeekDates(weekStart)

  const COLOR_MAP = {
    'OKR':     '#818CF8', 'Réunion': '#34D399',
    'Audit':   '#FCD34D', 'Dev.':    '#818CF8',
    'Congé':   '#10B981', 'RH':      '#F87171',
  }
  const MOCK_GRID = {
    'Lun-08h':{t:'OKR'},'Lun-09h':{t:'OKR'},'Lun-10h':{t:'Réunion'},'Lun-13h':{t:'Audit'},'Lun-14h':{t:'Audit'},'Lun-15h':{t:'Dev.'},'Lun-16h':{t:'Dev.'},
    'Mar-08h':{t:'Dev.'},'Mar-09h':{t:'Dev.'},'Mar-10h':{t:'Dev.'},'Mar-13h':{t:'RH'},'Mar-14h':{t:'RH'},
    'Mer-08h':{t:'Audit'},'Mer-09h':{t:'Audit'},'Mer-10h':{t:'Réunion'},'Mer-11h':{t:'Réunion'},'Mer-13h':{t:'Audit'},'Mer-14h':{t:'Audit'},'Mer-15h':{t:'Audit'},
    'Jeu-08h':{t:'Congé'},'Jeu-09h':{t:'Congé'},'Jeu-10h':{t:'Congé'},'Jeu-11h':{t:'Congé'},'Jeu-13h':{t:'Congé'},'Jeu-14h':{t:'Congé'},
    'Ven-13h':{t:'Dev.'},'Ven-14h':{t:'Dev.'},'Ven-15h':{t:'Dev.'},
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionCard
        title={`Planning — semaine du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <NavBtn onClick={() => setWeekOffset(w => w - 7)}><ChevronLeft size={13} style={{ display: 'inline' }} /> Préc.</NavBtn>
            <NavBtn onClick={() => setWeekOffset(w => w + 7)}>Suiv. <ChevronRight size={13} style={{ display: 'inline' }} /></NavBtn>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(5,1fr)', gap: 3, marginTop: 6 }}>
          <div />
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', padding: '4px 0' }}>{d}</div>
          ))}
          {HOURS_SLOTS.map(h => (
            <>
              <div key={h} style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', padding: '8px 4px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{h}</div>
              {DAYS_SHORT.map(d => {
                const cell = MOCK_GRID[`${d}-${h}`]
                const c    = cell ? (COLOR_MAP[cell.t] ?? '#818CF8') : null
                return (
                  <div key={d} style={{
                    height: 36, borderRadius: 6,
                    background: c ? `${c}18` : 'rgba(255,255,255,.02)',
                    border: `1px solid ${c ? `${c}30` : 'rgba(255,255,255,.04)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, color: c ?? 'transparent',
                  }}>
                    {cell?.t ?? ''}
                  </div>
                )
              })}
            </>
          ))}
        </div>
        {/* Légende */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {Object.entries(COLOR_MAP).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{k}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KpiCard label="Charge moy./jour" value="7.8h"  sub="cette semaine"   color="#818CF8" />
        <KpiCard label="Journée chargée"  value="Mer"   sub="pic : 9h saisies" color="#F87171" />
        <KpiCard label="Jours complets"   value="3 / 5" sub="≥ 8h saisies"    color="#34D399" />
      </div>
    </div>
  )
}

// ─── Onglet Productivité ──────────────────────────────────────
export function OngletProductivite() {
  const { data: stats } = useTimeStats({ period: 'month' })

  const prodPct  = 68
  const adminPct = 21
  const autrePct = 11

  const evoData = [
    { l: 'S5', h: 62 }, { l: 'S6', h: 78 }, { l: 'S7', h: 55 },
    { l: 'S8', h: 82 }, { l: 'S9', h: 88 }, { l: 'S10', h: 65 },
  ]
  const types = [
    { l: 'Développement', pct: 42, c: '#34D399' },
    { l: 'Réunions',      pct: 21, c: '#818CF8' },
    { l: 'Reporting',     pct: 18, c: '#FCD34D' },
    { l: 'Autre',         pct: 19, c: 'rgba(255,255,255,.3)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="Temps productif"  value={`${prodPct}%`}  sub="sur le mois"  color="#34D399" bar={prodPct}  barMax={100} />
        <KpiCard label="Temps admin."     value={`${adminPct}%`} sub="réunions…"    color="#818CF8" bar={adminPct} barMax={100} />
        <KpiCard label="Non productif"    value={`${autrePct}%`} sub="temps perdu"  color="#F87171" bar={autrePct} barMax={100} />
        <KpiCard label="Projet principal" value="Module OKR"     sub="42h ce mois"  color="#FCD34D" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SectionCard title="Répartition par type">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {types.map(t => (
              <div key={t.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>
                  <span>{t.l}</span>
                  <span style={{ color: t.c, fontWeight: 700 }}>{t.pct}%</span>
                </div>
                <ProgressBar value={t.pct} max={100} color={t.c} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Évolution hebdomadaire (%)">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, paddingTop: 10 }}>
            {evoData.map(d => (
              <div key={d.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>{d.h}%</span>
                <div style={{ width: '100%', borderRadius: '5px 5px 0 0', background: 'linear-gradient(180deg,rgba(129,140,248,.8),rgba(129,140,248,.3))', height: `${d.h * 1.1}px`, minHeight: 6 }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{d.l}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
