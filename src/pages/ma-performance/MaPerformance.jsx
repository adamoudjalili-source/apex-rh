// ============================================================
// APEX RH — MaPerformance.jsx  ·  Session 38
// Route /ma-performance — Vue consolidée performance personnelle
//   • Profil multi-dimensionnel (ProfilPerformance.jsx)
//   • PULSE trend (sparkline + score du jour)
//   • Activité Réelle NITA (données agent_activity_logs)
//   • Historique profil (via usePerformanceScores)
// Session 40 : contenu complet avec comparatifs et radar interactif
// ============================================================
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useSettings'
import { isPulseEnabled } from '../../lib/pulseHelpers'
import { useTodayScore, useMyActiveTasks } from '../../hooks/usePulse'
import { useMyIPR } from '../../hooks/useIPR'
import { useUserScoreHistory, getPeriodDates } from '../../hooks/usePerformanceScores'
import { Sparkline, GaugeRing, TrendBadge, iprColor } from '../../components/ui/premium'
import ProfilPerformance, { getQualitativeLabel } from '../../components/ui/ProfilPerformance'
import {
  Activity, TrendingUp, Zap, BarChart2, Clock, ChevronRight,
} from 'lucide-react'

const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:12 }, visible:{ opacity:1, y:0, transition:{ duration:0.35, ease:[0.4,0,0.2,1] } } }

const PERIODS = [
  { label:'7j',  value:'week' },
  { label:'1m',  value:'month' },
  { label:'3m',  value:'3months' },
]

export default function MaPerformance() {
  const { profile }           = useAuth()
  const { data: settings }    = useAppSettings()
  const pulseOn               = isPulseEnabled(settings)
  const [period, setPeriod]   = useState('month')

  const { data: todayScore }  = useTodayScore()
  const { data: iprData }     = useMyIPR()
  const { start, end }        = getPeriodDates(period)
  const { data: history = [] } = useUserScoreHistory(profile?.id, start, end)

  const sparkData  = history.map(h => h.score_total ?? 0)
  const latestIPR  = iprData?.ipr ?? null
  const qualLabel  = latestIPR !== null ? getQualitativeLabel(latestIPR) : null

  return (
    <motion.div
      variants={stagger} initial="hidden" animate="visible"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background:'linear-gradient(180deg,rgba(79,70,229,0.04) 0%,transparent 180px)' }}
    >
      {/* ── Header ── */}
      <motion.div variants={fadeUp} className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(79,70,229,0.12)', border:'1px solid rgba(79,70,229,0.2)' }}>
            <Activity size={16} style={{ color:'#4F46E5' }}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
              Ma Performance
            </h1>
            <p className="text-xs text-white/30">Profil multi-dimensionnel · PULSE · Activité NITA</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 px-6 py-5 space-y-5">

        {/* ── Profil Multi-Dimensionnel ── */}
        {pulseOn && iprData && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                Profil de Performance
              </h2>
              {qualLabel && (
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: `${qualLabel.color}18`,
                    color: qualLabel.color,
                    border: `1px solid ${qualLabel.color}30`
                  }}>
                  {qualLabel.label}
                </span>
              )}
            </div>
            <ProfilPerformance data={iprData} showDetails />
          </motion.div>
        )}

        {/* ── PULSE Aujourd'hui ── */}
        {pulseOn && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-5 border border-white/[0.06]"
            style={{ background:'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-indigo-400"/>
                <span className="text-sm font-semibold text-white">PULSE — Aujourd'hui</span>
              </div>
              <div className="flex items-center gap-1">
                {PERIODS.map(p => (
                  <button key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                      period === p.value
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-white/25 hover:text-white/50'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {todayScore ? (
              <div className="flex items-center gap-6">
                <GaugeRing value={todayScore.score_total ?? 0} size={80}
                  color={iprColor(todayScore.score_total ?? 0)}/>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {[
                    { label:'Exécution',  value: todayScore.delivery_score  ?? 0, color:'#4F46E5' },
                    { label:'Qualité',    value: todayScore.quality_score   ?? 0, color:'#10B981' },
                    { label:'Régularité', value: todayScore.regularity_score?? 0, color:'#F59E0B' },
                    { label:'Bonus',      value: todayScore.bonus_score     ?? 0, color:'#EC4899' },
                  ].map(d => (
                    <div key={d.label} className="rounded-xl p-2.5"
                      style={{ background:`${d.color}08`, border:`1px solid ${d.color}18` }}>
                      <p className="text-[10px] text-white/35 mb-1">{d.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black" style={{ color:d.color }}>
                          {d.value}%
                        </span>
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width:`${d.value}%`, background:d.color }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/25 py-2">Aucune donnée PULSE pour aujourd'hui.</p>
            )}

            {/* Sparkline historique */}
            {sparkData.length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[11px] text-white/25 mb-2">Évolution sur la période</p>
                <Sparkline data={sparkData} height={40} color="#4F46E5"/>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Activité Réelle NITA ── */}
        {pulseOn && iprData?.nita && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-5 border border-white/[0.06]"
            style={{ background:'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={15} className="text-amber-400"/>
              <span className="text-sm font-semibold text-white">Activité Réelle NITA</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                style={{ background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>S37</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:'Résilience', value: iprData.nita.resilience ?? 0, color:'#4F46E5',
                  desc:'Performance jours de pic' },
                { label:'Fiabilité',  value: iprData.nita.reliability ?? 0, color:'#10B981',
                  desc:'Taux erreur/rejets' },
                { label:'Endurance',  value: iprData.nita.endurance ?? 0,  color:'#F59E0B',
                  desc:'Qualité sur shifts longs' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center"
                  style={{ background:`${s.color}08`, border:`1px solid ${s.color}18` }}>
                  <p className="text-2xl font-black mb-0.5" style={{ color:s.color }}>{s.value}%</p>
                  <p className="text-[11px] font-semibold text-white/70">{s.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Placeholder S40 ── */}
        {!pulseOn && (
          <motion.div variants={fadeUp}
            className="rounded-2xl p-8 border border-dashed border-white/[0.08] text-center">
            <Activity size={32} className="text-white/15 mx-auto mb-3"/>
            <p className="text-sm text-white/30">Activez PULSE dans les Paramètres pour accéder à votre profil de performance.</p>
          </motion.div>
        )}

        {/* ── Note S40 ── */}
        <motion.div variants={fadeUp}
          className="rounded-xl p-3 border border-white/[0.04] flex items-center gap-3">
          <Clock size={13} className="text-white/15 flex-shrink-0"/>
          <p className="text-[11px] text-white/20">
            Contenu complet disponible en Session 40 : radar interactif 12 mois, comparatif équipe, analyse par dimension.
          </p>
        </motion.div>

      </div>
    </motion.div>
  )
}
