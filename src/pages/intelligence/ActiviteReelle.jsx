// ============================================================
// APEX RH — ActiviteReelle.jsx  ·  Session 37
// Vue "Activité Réelle" dans Intelligence RH
// Affiche les 3 scores opérationnels NITA :
//   - Résilience : perf pendant pics transactions
//   - Fiabilité : taux erreur pondéré complexité
//   - Endurance : maintien qualité shifts longs
// ============================================================
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Wifi, TrendingUp, Shield, Zap, AlertCircle, Info, Users, BarChart2 } from 'lucide-react'
import { useAuth }          from '../../contexts/AuthContext'
import { supabase }         from '../../lib/supabase'
import { Sparkline, TrendBadge } from '../../components/ui/premium'
import { getQualitativeLabel }   from '../../components/ui/ProfilPerformance'

// ─── Animations ──────────────────────────────────────────────
const fadeUp = { hidden:{ opacity:0, y:10 }, visible:{ opacity:1, y:0, transition:{ duration:0.35 } } }
const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.07 } } }

// ─── Hooks données NITA ───────────────────────────────────────

function useMyNitaActivity(months = 3) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['nita-activity', 'mine', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id) return []
      const from = new Date()
      from.setMonth(from.getMonth() - months)
      const { data } = await supabase
        .from('agent_activity_logs')
        .select('date,nb_transactions,avg_processing_time_s,error_rate,amount_processed,is_peak_day,shift_duration_hours,resilience_score,reliability_score,endurance_score')
        .eq('user_id', profile.id)
        .gte('date', from.toISOString().split('T')[0])
        .order('date', { ascending: true })
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 10 * 60 * 1000,
  })
}

function useTeamNitaActivity(months = 1) {
  const { profile } = useAuth()
  const isManager = ['chef_service','chef_division','directeur','administrateur'].includes(profile?.role)

  return useQuery({
    queryKey: ['nita-activity', 'team', profile?.id, months],
    queryFn: async () => {
      if (!profile?.id || !isManager) return []
      const from = new Date()
      from.setMonth(from.getMonth() - months)

      let q = supabase
        .from('agent_activity_logs')
        .select(`date, user_id, resilience_score, reliability_score, endurance_score, nb_transactions, error_rate,
          users!inner(first_name, last_name, service_id, division_id)`)
        .gte('date', from.toISOString().split('T')[0])

      if (profile.role === 'chef_service' && profile.service_id)
        q = q.eq('users.service_id', profile.service_id)
      else if (profile.role === 'chef_division' && profile.division_id)
        q = q.eq('users.division_id', profile.division_id)

      const { data } = await q.order('date', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id && isManager,
    staleTime: 10 * 60 * 1000,
  })
}

// ─── Carte score NITA ─────────────────────────────────────────

function NitaScoreCard({ icon: Icon, label, score, description, delay = 0, sparklineData }) {
  const ql = getQualitativeLabel(score)
  return (
    <motion.div variants={fadeUp} transition={{ delay }}
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background:'rgba(255,255,255,0.025)', border:`1px solid ${ql.border}` }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: ql.bg }}>
            <Icon size={16} style={{ color: ql.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{label}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{description}</p>
          </div>
        </div>
        {score !== null && score !== undefined ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded-xl"
            style={{ background: ql.bg, color: ql.color, border: `1px solid ${ql.border}` }}>
            {ql.label}
          </span>
        ) : (
          <span className="text-[11px] text-white/25">—</span>
        )}
      </div>

      {/* Barre de progression + valeur */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-white/25">Performance</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: ql.color }}>
            {score ?? '—'}{score !== null ? '/100' : ''}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${ql.color}88, ${ql.color})` }}
            initial={{ width: 0 }}
            animate={{ width: `${score ?? 0}%` }}
            transition={{ duration: 0.9, delay: delay + 0.2, ease: [0.4, 0, 0.2, 1] }} />
        </div>
      </div>

      {/* Sparkline */}
      {sparklineData?.length > 2 && (
        <Sparkline data={sparklineData} width="100%" height={28} color={ql.color} filled />
      )}
    </motion.div>
  )
}

// ─── Métriques brutes ─────────────────────────────────────────

function RawMetrics({ logs }) {
  if (!logs?.length) return null
  const last30 = logs.slice(-30)
  const avg = key => {
    const vals = last30.map(l => l[key]).filter(v => v !== null && v !== undefined)
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null
  }
  const avgTxn      = avg('nb_transactions')
  const avgErr      = last30.map(l => l.error_rate).filter(Boolean)
  const avgErrPct   = avgErr.length ? (avgErr.reduce((a,b)=>a+b,0)/avgErr.length*100).toFixed(2) : null
  const peakDays    = last30.filter(l => l.is_peak_day).length

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label:'Transactions/j (moy.)', value: avgTxn ? `${avgTxn}` : '—', color:'#4F46E5' },
        { label:'Taux erreur (moy.)', value: avgErrPct ? `${avgErrPct}%` : '—', color:'#EF4444' },
        { label:'Jours pic (30j)', value: `${peakDays}`, color:'#F59E0B' },
      ].map(m => (
        <div key={m.label} className="rounded-xl p-3 text-center"
          style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{m.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Vue équipe managers ──────────────────────────────────────

function TeamNitaView({ teamData }) {
  if (!teamData?.length) return (
    <div className="text-center py-12">
      <Wifi size={28} className="mx-auto mb-3 opacity-20" style={{ color:'#F59E0B' }}/>
      <p className="text-sm text-white/30">Aucune donnée d'activité NITA pour votre équipe</p>
      <p className="text-xs text-white/20 mt-1">Les données se synchronisent toutes les heures depuis l'API NITA</p>
    </div>
  )

  // Agréger par user
  const byUser = {}
  for (const row of teamData) {
    const uid = row.user_id
    if (!byUser[uid]) byUser[uid] = {
      name: `${row.users?.first_name||''} ${row.users?.last_name||''}`.trim(),
      rows: [],
    }
    byUser[uid].rows.push(row)
  }

  const userSummaries = Object.entries(byUser).map(([uid, u]) => {
    const avg = key => {
      const vals = u.rows.map(r=>r[key]).filter(v=>v!==null&&v!==undefined)
      return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null
    }
    const res = avg('resilience_score')
    const rel = avg('reliability_score')
    const end = avg('endurance_score')
    const activite = (res!==null && rel!==null && end!==null)
      ? Math.round(res*0.35 + rel*0.40 + end*0.25) : null
    return { uid, name: u.name, res, rel, end, activite, daysLogged: u.rows.length }
  }).sort((a,b) => (b.activite??-1)-(a.activite??-1))

  return (
    <div className="space-y-2">
      {userSummaries.map((u, i) => {
        const ql = getQualitativeLabel(u.activite)
        return (
          <motion.div key={u.uid}
            initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
            transition={{ delay: i*0.04 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: ql.bg, color: ql.color }}>{i+1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{u.name}</p>
              <p className="text-[10px] text-white/25">{u.daysLogged} jour{u.daysLogged>1?'s':''} loggué{u.daysLogged>1?'s':''}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex gap-1.5 text-[10px]">
                {[{l:'R', v:u.res},{l:'F', v:u.rel},{l:'E', v:u.end}].map(s => (
                  <span key={s.l} className="px-1.5 py-0.5 rounded" title={s.l==='R'?'Résilience':s.l==='F'?'Fiabilité':'Endurance'}
                    style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>
                    {s.l} {s.v??'—'}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: ql.bg, color: ql.color, border:`1px solid ${ql.border}` }}>
                {ql.label}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Cartographie des charges NITA ───────────────────────────

function NitaCorrelationMap({ teamData }) {
  // Agréger par agent
  const agentMap = {}
  for (const log of teamData) {
    const uid = log.user_id
    const u = log.users
    if (!agentMap[uid]) agentMap[uid] = {
      uid, name: u ? `${u.first_name} ${u.last_name}` : uid,
      logs: [], resilience: [], reliability: [], endurance: [], transactions: [],
    }
    agentMap[uid].logs.push(log)
    if (log.resilience_score  != null) agentMap[uid].resilience.push(log.resilience_score)
    if (log.reliability_score != null) agentMap[uid].reliability.push(log.reliability_score)
    if (log.endurance_score   != null) agentMap[uid].endurance.push(log.endurance_score)
    if (log.nb_transactions   != null) agentMap[uid].transactions.push(log.nb_transactions)
  }

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null

  const agents = Object.values(agentMap).map(a => ({
    ...a,
    avgRes:  avg(a.resilience),
    avgRel:  avg(a.reliability),
    avgEnd:  avg(a.endurance),
    avgTx:   avg(a.transactions),
    activite: (avg(a.resilience)!==null && avg(a.reliability)!==null && avg(a.endurance)!==null)
      ? Math.round(avg(a.resilience)*0.35 + avg(a.reliability)*0.40 + avg(a.endurance)*0.25)
      : null,
  })).filter(a => a.activite !== null).sort((a,b)=>(b.activite??0)-(a.activite??0))

  if (agents.length === 0) return (
    <div className="text-center py-6 text-white/20 text-xs">Données insuffisantes pour la cartographie.</div>
  )

  // Quadrant: axe X = charge (nb transactions moyen), axe Y = performance (activité score)
  const maxTx  = Math.max(...agents.map(a=>a.avgTx??0), 1)
  const svgW = 440, svgH = 220, pad = 36

  const toX = tx  => pad + ((tx??0)/maxTx) * (svgW - pad*2)
  const toY = act => (svgH - pad) - ((act??0)/100) * (svgH - pad*1.5)

  const color = score => score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
      {/* Légende quadrants */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {[
          {label:'Haute charge · Haute perf', c:'#10B981', desc:'Stars opérationnelles'},
          {label:'Faible charge · Haute perf', c:'#3B82F6', desc:'Capacité disponible'},
          {label:'Haute charge · Faible perf', c:'#F97316', desc:'Risque surcharge'},
          {label:'Faible charge · Faible perf', c:'#EF4444', desc:'À accompagner'},
        ].map(q => (
          <div key={q.label} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{background:`${q.c}08`,border:`1px solid ${q.c}15`}}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:q.c}}/>
            <div>
              <p style={{color:q.c}} className="font-semibold">{q.label}</p>
              <p className="text-white/25">{q.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Scatter plot */}
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{overflow:'visible'}}>
        {/* Grille */}
        <line x1={pad} y1={pad/2} x2={pad} y2={svgH-pad/2} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        <line x1={pad/2} y1={svgH-pad} x2={svgW-pad/2} y2={svgH-pad} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        {/* Ligne médiane performance */}
        <line x1={pad} y1={toY(50)} x2={svgW-pad} y2={toY(50)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3"/>
        {/* Ligne médiane charge */}
        <line x1={toX(maxTx/2)} y1={pad/2} x2={toX(maxTx/2)} y2={svgH-pad} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3"/>
        {/* Labels axes */}
        <text x={svgW/2} y={svgH-4} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9">Charge opérationnelle →</text>
        <text x={10} y={svgH/2} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9" transform={`rotate(-90,10,${svgH/2})`}>Performance →</text>
        {/* Points agents */}
        {agents.map(a => {
          const cx = toX(a.avgTx), cy = toY(a.activite)
          const c = color(a.activite)
          const initials = a.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
          return (
            <g key={a.uid}>
              <circle cx={cx} cy={cy} r="14" fill={`${c}15`} stroke={c} strokeWidth="1.5"/>
              <text x={cx} y={cy+4} textAnchor="middle" fill={c} fontSize="8.5" fontWeight="700">{initials}</text>
              <title>{a.name} — Perf: {a.activite} · Tx moy: {a.avgTx}</title>
            </g>
          )
        })}
      </svg>

      {/* Tableau résumé */}
      <div className="grid grid-cols-1 gap-1.5">
        {agents.slice(0,5).map(a => (
          <div key={a.uid} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{background:color(a.activite)+'22'}}>
              {a.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <span className="text-xs text-white/60 flex-1 truncate">{a.name}</span>
            {[
              {label:'Rés.', v:a.avgRes, c:'#4F46E5'},
              {label:'Fiab.', v:a.avgRel, c:'#10B981'},
              {label:'End.', v:a.avgEnd, c:'#F59E0B'},
            ].map(d=>(
              <div key={d.label} className="text-center w-12">
                <p className="text-[9px] text-white/20">{d.label}</p>
                <p className="text-xs font-bold" style={{color:d.c}}>{d.v??'—'}</p>
              </div>
            ))}
            <div className="text-center w-14">
              <p className="text-[9px] text-white/20">Score</p>
              <p className="text-xs font-black" style={{color:color(a.activite)}}>{a.activite}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────

export default function ActiviteReelle() {
  const { profile } = useAuth()
  const isManager = ['chef_service','chef_division','directeur','administrateur'].includes(profile?.role)
  const [view, setView] = useState('personal')

  const { data: myLogs = [], isLoading } = useMyNitaActivity(3)
  const { data: teamData = [], isLoading: teamLoading } = useTeamNitaActivity(1)

  // Calculer les scores moyens depuis les 30 derniers jours
  const last30 = myLogs.slice(-30)
  const avgScore = key => {
    const vals = last30.map(l=>l[key]).filter(v=>v!==null&&v!==undefined)
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null
  }
  const resAvg = avgScore('resilience_score')
  const relAvg = avgScore('reliability_score')
  const endAvg = avgScore('endurance_score')

  // Sparklines par score
  const sparkRes = myLogs.slice(-30).map(l => l.resilience_score ?? 0)
  const sparkRel = myLogs.slice(-30).map(l => l.reliability_score ?? 0)
  const sparkEnd = myLogs.slice(-30).map(l => l.endurance_score ?? 0)

  // Score Activité global = pondération 35/40/25
  const activiteScore = (resAvg!==null && relAvg!==null && endAvg!==null)
    ? Math.round(resAvg*0.35 + relAvg*0.40 + endAvg*0.25) : null

  const noData = !isLoading && !myLogs.length

  return (
    <motion.div className="p-6 space-y-6 max-w-4xl mx-auto"
      variants={stagger} initial="hidden" animate="visible">

      {/* En-tête */}
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily:"'Syne',sans-serif" }}>
            Activité Réelle
          </h2>
          <p className="text-xs text-white/30 mt-0.5">
            3 scores opérationnels mesurés depuis les données de transaction NITA
          </p>
        </div>
        {isManager && (
          <div className="flex rounded-xl overflow-hidden flex-shrink-0"
            style={{ border:'1px solid rgba(255,255,255,0.1)' }}>
            {[{id:'personal',label:'Personnel', icon:Zap},{id:'team',label:'Équipe', icon:Users}].map(t => (
              <button key={t.id} onClick={() => setView(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                style={view===t.id
                  ? { background:'rgba(79,70,229,0.2)', color:'#818CF8' }
                  : { background:'transparent', color:'rgba(255,255,255,0.35)' }}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Vue personnelle */}
      {view === 'personal' && (
        <>
          {/* Bannière "API en attente" si pas de données */}
          {noData && (
            <motion.div variants={fadeUp}
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color:'#F59E0B' }}/>
              <div>
                <p className="text-sm font-semibold text-white">Connexion API NITA en cours de configuration</p>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                  Les données d'activité opérationnelle seront disponibles une fois l'API NITA connectée.
                  La synchronisation s'effectue toutes les heures.
                  En attendant, les scores seront alimentés depuis les briefs matinaux.
                </p>
              </div>
            </motion.div>
          )}

          {/* 3 scores NITA */}
          <motion.div variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NitaScoreCard
              icon={Zap} label="Résilience" score={resAvg}
              description="Performance pendant les pics de transactions (jours marché, fin de mois)"
              delay={0} sparklineData={sparkRes} />
            <NitaScoreCard
              icon={Shield} label="Fiabilité" score={relAvg}
              description="Taux d'erreur et de rejets pondéré par la complexité des transactions"
              delay={0.07} sparklineData={sparkRel} />
            <NitaScoreCard
              icon={TrendingUp} label="Endurance" score={endAvg}
              description="Maintien de la qualité sur les shifts longs et les journées chargées"
              delay={0.14} sparklineData={sparkEnd} />
          </motion.div>

          {/* Score Activité global */}
          {activiteScore !== null && (
            <motion.div variants={fadeUp}
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background:'rgba(79,70,229,0.06)', border:'1px solid rgba(79,70,229,0.15)' }}>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Score Activité Réelle (pondéré)</p>
                <p className="text-xs text-white/25">Résilience ×35% + Fiabilité ×40% + Endurance ×25%</p>
              </div>
              <div className="text-right">
                {(() => {
                  const ql = getQualitativeLabel(activiteScore)
                  return (
                    <span className="text-sm font-bold px-3 py-1.5 rounded-xl"
                      style={{ background: ql.bg, color: ql.color, border: `1px solid ${ql.border}` }}>
                      {ql.label}
                    </span>
                  )
                })()}
              </div>
            </motion.div>
          )}

          {/* Métriques brutes (si données) */}
          {myLogs.length > 0 && (
            <motion.div variants={fadeUp}>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Données brutes — 30 derniers jours</p>
              <RawMetrics logs={myLogs} />
            </motion.div>
          )}

          {/* Explication des 3 scores */}
          <motion.div variants={fadeUp}
            className="rounded-2xl p-5"
            style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Info size={13} style={{ color:'#8B5CF6' }}/>
              <p className="text-xs font-semibold text-white/50">Comment ces scores sont calculés</p>
            </div>
            <div className="space-y-2.5 text-[11px] text-white/30 leading-relaxed">
              <p><span className="text-yellow-400/70 font-semibold">Résilience :</span> Ratio entre vos transactions réalisées et le benchmark service, avec un bonus les jours de pic de charge (jours de marché, fin de mois).</p>
              <p><span className="text-emerald-400/70 font-semibold">Fiabilité :</span> Basée sur votre taux d'erreur et de rejet, pondéré par la complexité des transactions traitées. Les erreurs sur des transactions complexes comptent davantage.</p>
              <p><span className="text-blue-400/70 font-semibold">Endurance :</span> Mesure le maintien de votre temps de traitement par rapport au benchmark sur la durée du shift. Un léger ajustement est appliqué pour les shifts de plus de 9h.</p>
            </div>
          </motion.div>
        </>
      )}

      {/* Vue équipe */}
      {view === 'team' && isManager && (
        <motion.div variants={fadeUp}>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-4">
            Classement équipe — Activité Réelle ({teamLoading ? '…' : `${new Set(teamData.map(d=>d.user_id)).size} agents`})
          </p>
          {teamLoading ? (
            <div className="text-center py-8 text-white/25 text-sm">Chargement…</div>
          ) : (
            <TeamNitaView teamData={teamData} />
          )}

          {/* Cartographie des charges */}
          {!teamLoading && teamData.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-3 flex items-center gap-2">
                Cartographie des charges <span className="text-[9px] text-amber-400/70 normal-case font-normal">Corrélations NITA avancées</span>
              </p>
              <NitaCorrelationMap teamData={teamData} />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
