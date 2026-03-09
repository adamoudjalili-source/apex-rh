// ============================================================
// APEX RH — useIPR.js  ·  Session 37
// Profil de Performance Multi-Dimensionnel
//
// ⚠️ DÉCISION ARCHITECTURALE PLAN V2 :
//   Le score IPR composite unique EST SUPPRIMÉ de l'affichage employé.
//   Il est remplacé par un profil 5 dimensions avec libellés qualitatifs.
//   Le chiffre `ipr` est conservé en interne UNIQUEMENT pour les managers.
//
// Formule IPR (dimensions) :
//   PULSE / Exécution        30%  → performance_scores.score_total
//   OKR / Objectifs          25%  → objectives.progress_score
//   Perception (F360+Review) 20%  → feedback_responses + review_evaluations
//   Activité Réelle          15%  → agent_activity_logs (S37: NITA) — fallback briefs
//   Engagement / Surveys     10%  → survey_responses.scores
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase }  from '../lib/supabase'
import { useAuth }   from '../contexts/AuthContext'
import { ROLES } from '../utils/constants'

const today      = () => new Date()
const isoDate    = d => d.toISOString().split('T')[0]
const monthStart = (d = today()) =>
  isoDate(new Date(d.getFullYear(), d.getMonth(), 1))
const monthEnd   = (d = today()) =>
  isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
const prevStart  = () =>
  isoDate(new Date(today().getFullYear(), today().getMonth() - 1, 1))
const prevEnd    = () =>
  isoDate(new Date(today().getFullYear(), today().getMonth(), 0))

const ratingToScore = r => ({
  insuffisant: 20, a_ameliorer: 40, satisfaisant: 65, bien: 80, excellent: 100,
}[r] ?? null)

const weightedIPR = dims => {
  let wSum = 0, wTotal = 0
  for (const d of Object.values(dims)) {
    if (d.score !== null && d.score !== undefined) {
      wSum   += d.score * d.weight
      wTotal += d.weight
    }
  }
  return wTotal > 0 ? Math.round(wSum / wTotal) : null
}

const calcEngagementScore = responses => {
  if (!responses?.length) return null
  const allValues = responses.flatMap(r => Object.values(r.scores || {})).filter(v => typeof v === 'number')
  if (!allValues.length) return null
  return Math.round(((allValues.reduce((a, b) => a + b, 0) / allValues.length) - 1) / 4 * 100)
}

export function useMyIPR() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['ipr', 'mine', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      const ms  = monthStart()
      const now = isoDate(today())

      // DIM 1 : PULSE 30%
      const { data: pulseRows } = await supabase
        .from('performance_scores')
        .select('score_total, score_date')
        .eq('user_id', profile.id)
        .eq('score_period', 'daily')
        .gte('score_date', ms)
        .lte('score_date', now)
        .order('score_date', { ascending: true })

      const pulseScores = (pulseRows || []).map(r => r.score_total)
      const pulseAvg    = pulseScores.length
        ? Math.round(pulseScores.reduce((a, b) => a + b, 0) / pulseScores.length)
        : null
      const sparkline   = pulseScores.slice(-30)

      // DIM 2 : OKR 25%
      const { data: objectives } = await supabase
        .from('objectives')
        .select('progress_score, status')
        .eq('owner_id', profile.id)
        .eq('level', 'individual')
        .not('status', 'eq', 'archived')

      const okrRows  = objectives || []
      const okrScore = okrRows.length
        ? Math.round(okrRows.reduce((s, o) => s + (o.progress_score ?? 0), 0) / okrRows.length)
        : null

      // DIM 3 : Perception 20%
      const { data: fbRequests } = await supabase
        .from('feedback_requests')
        .select('feedback_responses(score)')
        .eq('evaluated_id', profile.id)
        .eq('status', 'validated')

      const fbScores = (fbRequests || [])
        .flatMap(fr => (fr.feedback_responses || []).map(r => r.score))
        .filter(s => s !== null && s !== undefined)
      const f360Score = fbScores.length
        ? Math.round(fbScores.reduce((a, b) => a + b, 0) / fbScores.length * 10)
        : null

      const { data: reviews } = await supabase
        .from('review_evaluations')
        .select('overall_rating')
        .eq('evaluatee_id', profile.id)
        .eq('status', 'validated')
        .order('validated_at', { ascending: false })
        .limit(2)

      const reviewScores = (reviews || [])
        .map(r => ratingToScore(r.overall_rating))
        .filter(s => s !== null)
      const reviewScore = reviewScores.length
        ? Math.round(reviewScores.reduce((a, b) => a + b, 0) / reviewScores.length)
        : null

      let perceptionScore = null
      if (f360Score !== null && reviewScore !== null)
        perceptionScore = Math.round(f360Score * 0.7 + reviewScore * 0.3)
      else if (f360Score !== null)   perceptionScore = f360Score
      else if (reviewScore !== null) perceptionScore = reviewScore

      // DIM 4 : Activité Réelle 15% — S37 : NITA en priorité, fallback briefs
      let activiteScore = null
      const { data: nitaLogs } = await supabase
        .from('agent_activity_logs')
        .select('resilience_score, reliability_score, endurance_score, date')
        .eq('user_id', profile.id)
        .gte('date', ms)
        .lte('date', now)
        .order('date', { ascending: false })

      if (nitaLogs?.length) {
        const avgKey = key => {
          const vals = nitaLogs.map(l => l[key]).filter(v => v !== null && v !== undefined)
          return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null
        }
        const res = avgKey('resilience_score')
        const rel = avgKey('reliability_score')
        const end = avgKey('endurance_score')
        if (res !== null && rel !== null && end !== null)
          activiteScore = Math.round(res * 0.35 + rel * 0.40 + end * 0.25)
        else if (res !== null) activiteScore = res
      } else {
        const { data: briefs } = await supabase
          .from('morning_plans')
          .select('status, plan_date')
          .eq('user_id', profile.id)
          .gte('plan_date', ms)
          .lte('plan_date', now)
        const briefsAll       = briefs || []
        const briefsSubmitted = briefsAll.filter(b => b.status === 'submitted').length
        const workDays        = Math.max(
          Math.round((today() - new Date(ms)) / (1000 * 60 * 60 * 24) * (5 / 7)), 1
        )
        activiteScore = Math.min(Math.round((briefsSubmitted / workDays) * 100), 100)
      }

      // DIM 5 : Engagement 10%
      const { data: surveyRows } = await supabase
        .from('survey_responses')
        .select('scores')
        .eq('respondent_id', profile.id)
      const engagementScore = calcEngagementScore(surveyRows)

      const dimensions = {
        pulse: {
          score: pulseAvg, weight: 0.30,
          label: 'Exécution (PULSE)', shortLabel: 'PULSE', color: '#4F46E5',
        },
        okr: {
          score: okrScore, weight: 0.25,
          label: 'Objectifs (OKR)', shortLabel: 'Objectifs', color: '#C9A227',
        },
        perception: {
          score: perceptionScore, weight: 0.20,
          label: 'Perception (Feedback)', shortLabel: 'Perception', color: '#8B5CF6',
        },
        activite: {
          score: activiteScore, weight: 0.15,
          label: 'Activité Réelle (NITA)', shortLabel: 'Activité', color: '#10B981',
          hasNitaData: !!(nitaLogs?.length),
        },
        engagement: {
          score: engagementScore, weight: 0.10,
          label: 'Engagement (Surveys)', shortLabel: 'Engagement', color: '#F59E0B',
        },
      }

      const ipr = weightedIPR(dimensions)

      const { data: prevRows } = await supabase
        .from('performance_scores')
        .select('score_total')
        .eq('user_id', profile.id)
        .eq('score_period', 'daily')
        .gte('score_date', prevStart())
        .lte('score_date', prevEnd())

      const prevAvg = (prevRows || []).length
        ? Math.round((prevRows).reduce((s, r) => s + r.score_total, 0) / prevRows.length)
        : null
      const trend = ipr !== null && prevAvg !== null ? ipr - prevAvg : null

      return {
        ipr, trend, sparkline, dimensions,
        daysWithData: pulseScores.length,
        okrCount: okrRows.length, reviewScore, f360Score,
        hasNitaData: !!(nitaLogs?.length),
      }
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTeamIPR(options = {}) {
  const { profile } = useAuth()
  const { enabled: externalEnabled = true } = options

  return useQuery({
    queryKey: ['ipr', 'team', profile?.id, profile?.role],
    queryFn: async () => {
      if (!profile?.id) return []
      const ms  = monthStart()
      const now = isoDate(today())

      let q = supabase
        .from('users')
        .select('id, first_name, last_name, role, service_id, division_id')
        .eq('is_active', true)
        .neq('id', profile.id)

      if (profile.role === ROLES.CHEF_SERVICE  && profile.service_id)
        q = q.eq('service_id', profile.service_id)
      else if (profile.role === ROLES.CHEF_DIVISION && profile.division_id)
        q = q.eq('division_id', profile.division_id)
      else if (profile.role === ROLES.DIRECTEUR && profile.direction_id)
        q = q.eq('direction_id', profile.direction_id)

      const { data: users } = await q
      if (!users?.length) return []
      const ids = users.map(u => u.id)

      const [{ data: allScores }, { data: allBriefs }, { data: allFB }, { data: allOKR }, { data: allReviews }, { data: allNita }] =
        await Promise.all([
          supabase.from('performance_scores').select('user_id,score_total,score_date')
            .in('user_id',ids).eq('score_period','daily').gte('score_date',ms).lte('score_date',now)
            .order('score_date',{ascending:true}),
          supabase.from('morning_plans').select('user_id,status,plan_date')
            .in('user_id',ids).gte('plan_date',ms).lte('plan_date',now),
          supabase.from('feedback_requests').select('evaluated_id,feedback_responses(score)')
            .in('evaluated_id',ids).eq('status','validated'),
          supabase.from('objectives').select('owner_id,progress_score')
            .in('owner_id',ids).eq('level','individual').not('status','eq','archived'),
          supabase.from('review_evaluations').select('evaluatee_id,overall_rating,validated_at')
            .in('evaluatee_id',ids).eq('status','validated').order('validated_at',{ascending:false}),
          supabase.from('agent_activity_logs')
            .select('user_id,resilience_score,reliability_score,endurance_score')
            .in('user_id',ids).gte('date',ms).lte('date',now),
        ])

      const byScore  = {}; for (const r of (allScores  ||[])) { (byScore[r.user_id]  ||=[]).push(r.score_total) }
      const byBrief  = {}; for (const b of (allBriefs  ||[])) { (byBrief[b.user_id]  ||=[]).push(b) }
      const byFB     = {}; for (const f of (allFB      ||[])) {
        for (const r of (f.feedback_responses||[]))
          if (r.score!==null) (byFB[f.evaluated_id]||=[]).push(r.score)
      }
      const byOKR    = {}; for (const o of (allOKR    ||[])) { (byOKR[o.owner_id]    ||=[]).push(o.progress_score??0) }
      const byReview = {}; for (const r of (allReviews||[])) {
        if (!byReview[r.evaluatee_id]) byReview[r.evaluatee_id]=[]
        byReview[r.evaluatee_id].push(r.overall_rating)
      }
      const byNita   = {}; for (const n of (allNita   ||[])) { (byNita[n.user_id]||=[]).push(n) }

      const workDays = Math.max(
        Math.round((today() - new Date(ms)) / (1000 * 60 * 60 * 24) * (5 / 7)), 1
      )

      return users.map(u => {
        const scores  = byScore[u.id]  || []
        const briefs  = byBrief[u.id]  || []
        const fbList  = byFB[u.id]     || []
        const okrList = byOKR[u.id]    || []
        const reviews = byReview[u.id] || []
        const nita    = byNita[u.id]   || []

        const pulseAvg    = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null
        const submitted   = briefs.filter(b=>b.status==='submitted')
        const f360Score   = fbList.length ? Math.round(fbList.reduce((a,b)=>a+b,0)/fbList.length*10) : null
        const reviewScore = reviews.length ? ratingToScore(reviews[0]) : null
        const okrScore    = okrList.length ? Math.round(okrList.reduce((a,b)=>a+b,0)/okrList.length) : null

        let perceptionScore = null
        if (f360Score!==null && reviewScore!==null) perceptionScore = Math.round(f360Score*0.7+reviewScore*0.3)
        else if (f360Score!==null) perceptionScore = f360Score
        else if (reviewScore!==null) perceptionScore = reviewScore

        let activiteScore = null
        if (nita.length) {
          const avg = key => { const v=nita.map(n=>n[key]).filter(x=>x!==null&&x!==undefined); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null }
          const res=avg('resilience_score'), rel=avg('reliability_score'), end=avg('endurance_score')
          if (res!==null&&rel!==null&&end!==null) activiteScore=Math.round(res*0.35+rel*0.40+end*0.25)
        } else {
          activiteScore = Math.min(Math.round((submitted.length/workDays)*100),100)
        }

        const dims = {
          pulse:      { score: pulseAvg,       weight: 0.30 },
          okr:        { score: okrScore,        weight: 0.25 },
          perception: { score: perceptionScore, weight: 0.20 },
          activite:   { score: activiteScore,   weight: 0.15 },
        }
        const ipr = weightedIPR(dims)

        const lastBrief   = submitted.map(b=>b.plan_date).sort().at(-1) ?? null
        const daysSince   = lastBrief ? Math.round((today()-new Date(lastBrief))/(1000*60*60*24)) : workDays
        const sparkline14 = scores.slice(-14)

        return {
          userId: u.id, firstName: u.first_name, lastName: u.last_name, role: u.role,
          ipr, pulseAvg, f360Score, reviewScore, okrScore, perceptionScore, activiteScore,
          briefsSubmitted: submitted.length, workDays, daysWithData: scores.length,
          daysSinceLastBrief: daysSince, sparkline: sparkline14,
          hasNitaData: nita.length > 0,
          alert: daysSince>=3 ? 'no_brief' : (ipr!==null&&ipr<40) ? 'low_ipr' : null,
        }
      }).sort((a,b) => (b.ipr??-1)-(a.ipr??-1))
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}
