// ============================================================
// APEX RH — SuiviTempsC.jsx — S124
// Onglets : Charge de travail · Rappels · Score d'occupation
// ============================================================
import { useState } from 'react'
import { Bell, ToggleLeft, ToggleRight } from 'lucide-react'

import { useTimeStats, useOvertimeAlerts, formatHours } from '../../hooks/useTemps'
import { GLASS_STYLE } from '../../utils/constants'
import { KpiCard, SectionCard, ProgressBar, SubmitBtn, formatDateFR } from './SuiviTempsShared'

// ─── Onglet Charge ────────────────────────────────────────────
export function OngletCharge() {
  const { data: stats }   = useTimeStats({ period: 'week' })
  const { data: alerts = [] } = useOvertimeAlerts()

  const chargeData = [
    { l: 'Lun', h: 8.5, c: '#34D399' },
    { l: 'Mar', h: 7.0, c: '#34D399' },
    { l: 'Mer', h: 9.2, c: '#FCD34D', warn: true },
    { l: 'Jeu', h: 0,   c: 'rgba(255,255,255,.1)', abs: true },
    { l: 'Ven', h: 4.0, c: '#818CF8' },
  ]
  const totalH = chargeData.reduce((s, d) => s + d.h, 0)
  const occRate = Math.round((totalH / 37) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KpiCard label="Taux occupation" value={`${occRate}%`} sub="semaine courante" color="#818CF8" bar={occRate} barMax={100} />
        <KpiCard label="Statut charge"   value={occRate > 90 ? 'Surchargé' : occRate > 75 ? 'Chargé' : 'Normal'} sub={`${occRate > 75 ? 'au-dessus' : 'en-dessous'} de 80%`} color={occRate > 90 ? '#F87171' : occRate > 75 ? '#FCD34D' : '#34D399'} />
        <KpiCard label="H. sup. estimées" value={totalH > 37 ? `+${formatHours(totalH - 37)}` : '—'} sub="fin de semaine" color="#F87171" />
      </div>

      {/* Histogramme */}
      <SectionCard title="Charge par jour — semaine 10">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 150, paddingTop: 10, marginTop: 4 }}>
          {chargeData.map(d => {
            const barH = (d.h / 10) * 140
            return (
              <div key={d.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                {d.warn && <span style={{ fontSize: 10, color: '#F87171' }}>⚠</span>}
                {!d.warn && <span style={{ fontSize: 11, fontWeight: 700, color: d.abs ? '#10B981' : 'rgba(255,255,255,.5)' }}>{d.abs ? 'Congé' : `${d.h}h`}</span>}
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: d.c, minHeight: 6, height: barH, transition: 'height .4s' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{d.l}</span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          {[['#34D399', 'Normal'], ['#FCD34D', 'Chargé (>8h)'], ['#F87171', 'Surchargé (>9h)']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{l}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Alertes H.sup */}
      {alerts.length > 0 && (
        <SectionCard title="Alertes heures supplémentaires">
          {alerts.slice(0, 4).map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(251,146,60,.06)', border: '1px solid rgba(251,146,60,.15)', marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{a.message}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{a.created_at ? formatDateFR(a.created_at) : ''}</div>
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  )
}

// ─── Onglet Rappels ───────────────────────────────────────────
export function OngletRappels() {
  const [rappels, setRappels] = useState([
    { id: 1, icon: '⏰', title: 'Feuille non remplie',     desc: 'Lundi 08:30 si vide',  active: true,  color: '#FCD34D' },
    { id: 2, icon: '✅', title: 'Validation en attente',   desc: 'Dès soumission',        active: true,  color: '#34D399' },
    { id: 3, icon: '⚠️', title: 'Anomalie détectée',       desc: 'Immédiat',              active: false, color: '#F87171' },
  ])
  const [type, setType]   = useState('Feuille non remplie')
  const [freq, setFreq]   = useState('Chaque jour ouvré')
  const [heure, setHeure] = useState('08:30')

  function toggle(id) {
    setRappels(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Liste rappels */}
      <SectionCard title="Rappels actifs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rappels.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderRadius: 12, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)',
            }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{r.desc}</div>
              </div>
              <button
                onClick={() => toggle(r.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: r.active ? r.color : 'rgba(255,255,255,.2)' }}
              >
                {r.active
                  ? <ToggleRight size={28} />
                  : <ToggleLeft size={28} />
                }
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Config */}
      <SectionCard title="Configurer un rappel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Type de rappel</label>
            <select
              value={type} onChange={e => setType(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.7)', fontSize: 12, outline: 'none' }}>
              <option>Feuille non remplie</option>
              <option>Validation en attente</option>
              <option>Anomalie détectée</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Fréquence</label>
            <select
              value={freq} onChange={e => setFreq(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.7)', fontSize: 12, outline: 'none' }}>
              <option>Chaque jour ouvré</option>
              <option>Hebdomadaire</option>
              <option>À la demande</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Heure d'envoi</label>
            <input
              type="time" value={heure} onChange={e => setHeure(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.7)', fontSize: 12, outline: 'none' }} />
          </div>
          <SubmitBtn color="linear-gradient(135deg,#6366F1,#4F46E5)">
            <Bell size={14} /> Enregistrer le rappel
          </SubmitBtn>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Onglet Score d'occupation ────────────────────────────────
export function OngletScore() {
  const { data: stats } = useTimeStats({ period: 'month' })
  const score = 78

  const evoMois = [
    { l: 'Oct', v: 72 }, { l: 'Nov', v: 80 }, { l: 'Déc', v: 76 },
    { l: 'Jan', v: 83 }, { l: 'Fév', v: 82 }, { l: 'Mar', v: score },
  ]
  const r = 58, circ = 2 * Math.PI * r, dash = circ * score / 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

        {/* Anneau */}
        <SectionCard title="Score d'occupation" style={{ alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 160, height: 160, margin: '12px auto' }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
              <circle cx="80" cy="80" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
                stroke="url(#scoreGrad)"
                strokeDasharray={`${dash} ${circ}`}
                transform="rotate(-90 80 80)" />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#818CF8" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#fff' }}>{score}%</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>score</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Indice de disponibilité</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 4 }}>Temps travaillé / Temps théorique</div>
          </div>
          <ProgressBar value={score} max={100} color="#818CF8" />
        </SectionCard>

        {/* KPIs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <KpiCard label="Ce mois"        value={`${score}%`} sub="140h / 178h théoriques" color="#34D399" bar={score}    barMax={100} />
          <KpiCard label="Mois précédent" value="82%"         sub="Tendance : stable"       color="#818CF8" bar={82}      barMax={100} />
          <KpiCard label="Objectif annuel" value="85%"        sub="à atteindre d'ici déc." color="#FCD34D" bar={score}   barMax={85} />
        </div>
      </div>

      {/* Évolution */}
      <SectionCard title="Évolution du score — 6 derniers mois">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120, paddingTop: 10, marginTop: 4 }}>
          {evoMois.map((m, i) => (
            <div key={m.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: i === evoMois.length - 1 ? '#818CF8' : 'rgba(255,255,255,.45)' }}>{m.v}%</span>
              <div style={{ width: '100%', borderRadius: '5px 5px 0 0', background: i === evoMois.length - 1 ? 'linear-gradient(180deg,#818CF8,#34D39966)' : 'linear-gradient(180deg,rgba(129,140,248,.5),rgba(52,211,153,.2))', height: `${m.v * 1.15}px`, minHeight: 6 }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{m.l}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
