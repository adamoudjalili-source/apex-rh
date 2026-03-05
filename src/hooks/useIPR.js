// ============================================================
// APEX RH — useIPR.js  ·  Session 36 v3
// Indice de Performance Réel — formule vision originale validée
//
// Champs Supabase confirmés par lecture du schéma :
//   performance_scores  → score_total, score_period='daily', score_date
//   objectives          → progress_score (0-100), level='individual', owner_id
//   feedback_responses  → score (1-10), question_key
//   feedback_requests   → evaluated_id, status='validated'
//   morning_plans       → status='submitted', plan_date, user_id
//   review_evaluations  → overall_rating (text enum), evaluatee_id, status='validated'
//   survey_responses    → scores (jsonb {key:1-5}), respondent_id
//
// Dimensions IPR (vision originale) :
//   PULSE / Exécution        30%
//   OKR / Objectifs          25%
//   Perception (F360+Review) 20%
//   Activité Réelle          15%  (proxy briefs jusqu'à S39)
//   Engagement / Surveys     10%
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase }  from '../lib/supabase'
import { useAuth }   from '../contexts/AuthContext'

// ─── Utilitaires ─────────────────────────────────────────────
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

// overall_rating enum → score numérique 0-100
const ratingToScore = r => ({
  insuffisant: 20, a_ameliorer: 40, satisfaisant: 65, bien: 80, excellent: 100,
}[r] ?? null)

// Calcul pondéré — ignore les dimensions sans données
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

// Calcul score engagement depuis survey_responses.scores (jsonb {key:1-5})
const calcEngagementScore = responses => {
  if (!responses?.length) return null
  const allValues = responses.flatMap(r => Object.values(r.scores || {})).filter(v => typeof v === 'number')
  if (!allValues.length) return null
  // Échelle 1-5 → 0-100
  return Math.round(((allValues.reduce((a, b) => a + b, 0) / allValues.length) - 1) / 4 * 100)
}

// ─── IPR personnel ────────────────────────────────────────────
export function useMyIPR() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['ipr', 'mine', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null

      const ms  = monthStart()
      const me  = monthEnd()
      const now = isoDate(today())

      // ── DIM 1 : PULSE 30% ──────────────────────────────────
      const { data: pulseRows } = await supabase
        .from('performance_scores')
        .select('score_total, score_date')
        .eq('user_id', profile.id)
        .eq('score_period', 'daily')
        .gte('score_date', ms)
        .lte('score_date', now)
        .order('score_date', { ascending: true })

      const pulseScores  = (pulseRows || []).map(r => r.score_total)
      const pulseAvg     = pulseScores.length
        ? Math.round(pulseScores.reduce((a, b) => a + b, 0) / pulseScores.length)
        : null
      const sparkline    = pulseScores.slice(-30)

      // ── DIM 2 : OKR 25% ────────────────────────────────────
      // objectives.progress_score (0-100) + key_results.score (0-1 → ×100)
      const { data: objectives } = await supabase
        .from('objectives')
        .select('progress_score, status')
        .eq('owner_id', profile.id)
        .eq('level', 'individual')
        .not('status', 'eq', 'archived')

      const okrRows    = objectives || []
      const okrScore   = okrRows.length
        ? Math.round(okrRows.reduce((s, o) => s + (o.progress_score ?? 0), 0) / okrRows.length)
        : null

      // ── DIM 3 : Perception 20% (F360 + Review) ─────────────
      // Feedback 360 : feedback_responses.score (1-10) → ×10 = 0-100
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

      // Review cycles : overall_rating → numérique
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

      // Perception = moyenne pondérée F360 (70%) + Review (30%)
      let perceptionScore = null
      if (f360Score !== null && reviewScore !== null)
        perceptionScore = Math.round(f360Score * 0.7 + reviewScore * 0.3)
      else if (f360Score !== null)  perceptionScore = f360Score
      else if (reviewScore !== null) perceptionScore = reviewScore

      // ── DIM 4 : Activité Réelle 15% (proxy briefs, S39) ────
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
      const activiteScore   = Math.min(Math.round((briefsSubmitted / workDays) * 100), 100)

      // ── DIM 5 : Engagement 10% (surveys) ───────────────────
      // survey_responses.scores = jsonb { dimension_key: 1-5 }
      const { data: surveyRows } = await supabase
        .from('survey_responses')
        .select('scores')
        .eq('respondent_id', profile.id)

      const engagementScore = calcEngagementScore(surveyRows)

      // ── Calcul IPR ─────────────────────────────────────────
      const dimensions = {
        pulse:      { score: pulseAvg,       weight: 0.30, label: 'Exécution (PULSE)',      color: '#4F46E5' },
        okr:        { score: okrScore,        weight: 0.25, label: 'Objectifs (OKR)',        color: '#C9A227' },
        perception: { score: perceptionScore, weight: 0.20, label: 'Perception (Feedback)',  color: '#8B5CF6' },
        activite:   { score: activiteScore,   weight: 0.15, label: 'Activité Réelle',        color: '#10B981' },
        engagement: { score: engagementScore, weight: 0.10, label: 'Engagement (Surveys)',   color: '#F59E0B' },
      }
      const ipr = weightedIPR(dimensions)

      // ── Tendance vs mois précédent ──────────────────────────
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

      // ── Dates derniers briefs ───────────────────────────────
      const sortedBriefs = briefsAll
        .filter(b => b.status === 'submitted')
        .map(b => b.plan_date)
        .sort()
      const lastBriefDate = sortedBriefs.at(-1) ?? null

      return {
        ipr, trend, sparkline, dimensions,
        daysWithData: pulseScores.length,
        briefsSubmitted, workDays, lastBriefDate,
        okrCount: okrRows.length, reviewScore, f360Score,
      }
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── IPR équipe (manager) ─────────────────────────────────────
export function useTeamIPR(options = {}) {
  const { profile } = useAuth()
  const { enabled: externalEnabled = true } = options

  return useQuery({
    queryKey: ['ipr', 'team', profile?.id, profile?.role],
    queryFn: async () => {
      if (!profile?.id) return []

      const ms  = monthStart()
      const now = isoDate(today())

      // Scope utilisateurs selon hiérarchie
      let q = supabase
        .from('users')
        .select('id, first_name, last_name, role, service_id, division_id')
        .eq('is_active', true)
        .neq('id', profile.id)

      if (profile.role === 'chef_service'  && profile.service_id)
        q = q.eq('service_id', profile.service_id)
      else if (profile.role === 'chef_division' && profile.division_id)
        q = q.eq('division_id', profile.division_id)
      else if (profile.role === 'directeur' && profile.direction_id)
        q = q.eq('direction_id', profile.direction_id)

      const { data: users } = await q
      if (!users?.length) return []
      const ids = users.map(u => u.id)

      // Batch : scores PULSE
      const { data: allScores } = await supabase
        .from('performance_scores')
        .select('user_id, score_total, score_date')
        .in('user_id', ids)
        .eq('score_period', 'daily')
        .gte('score_date', ms)
        .lte('score_date', now)
        .order('score_date', { ascending: true })

      // Batch : briefs
      const { data: allBriefs } = await supabase
        .from('morning_plans')
        .select('user_id, status, plan_date')
        .in('user_id', ids)
        .gte('plan_date', ms)
        .lte('plan_date', now)

      // Batch : feedback 360
      const { data: allFB } = await supabase
        .from('feedback_requests')
        .select('evaluated_id, feedback_responses(score)')
        .in('evaluated_id', ids)
        .eq('status', 'validated')

      // Batch : OKR
      const { data: allOKR } = await supabase
        .from('objectives')
        .select('owner_id, progress_score')
        .in('owner_id', ids)
        .eq('level', 'individual')
        .not('status', 'eq', 'archived')

      // Batch : review evaluations
      const { data: allReviews } = await supabase
        .from('review_evaluations')
        .select('evaluatee_id, overall_rating, validated_at')
        .in('evaluatee_id', ids)
        .eq('status', 'validated')
        .order('validated_at', { ascending: false })

      // Indexation
      const byScore  = {}; for (const r of (allScores  || [])) { (byScore[r.user_id]  ||= []).push(r.score_total) }
      const byBrief  = {}; for (const b of (allBriefs  || [])) { (byBrief[b.user_id]  ||= []).push(b) }
      const byFB     = {}; for (const f of (allFB      || [])) {
        for (const r of (f.feedback_responses || []))
          if (r.score !== null) (byFB[f.evaluated_id] ||= []).push(r.score)
      }
      const byOKR    = {}; for (const o of (allOKR    || [])) { (byOKR[o.owner_id]    ||= []).push(o.progress_score ?? 0) }
      const byReview = {}; for (const r of (allReviews || [])) {
        if (!byReview[r.evaluatee_id]) byReview[r.evaluatee_id] = []
        byReview[r.evaluatee_id].push(r.overall_rating)
      }

      const workDays = Math.max(
        Math.round((today() - new Date(ms)) / (1000 * 60 * 60 * 24) * (5 / 7)), 1
      )

      return users.map(u => {
        const scores  = byScore[u.id]  || []
        const briefs  = byBrief[u.id]  || []
        const fbList  = byFB[u.id]     || []
        const okrList = byOKR[u.id]    || []
        const reviews = byReview[u.id] || []

        const pulseAvg    = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null
        const submitted   = briefs.filter(b=>b.status==='submitted')
        const briefRate   = Math.min(Math.round((submitted.length/workDays)*100), 100)
        const f360Score   = fbList.length ? Math.round(fbList.reduce((a,b)=>a+b,0)/fbList.length*10) : null
        const reviewScore = reviews.length ? ratingToScore(reviews[0]) : null
        const okrScore    = okrList.length ? Math.round(okrList.reduce((a,b)=>a+b,0)/okrList.length) : null

        let perceptionScore = null
        if (f360Score !== null && reviewScore !== null)
          perceptionScore = Math.round(f360Score * 0.7 + reviewScore * 0.3)
        else if (f360Score  !== null) perceptionScore = f360Score
        else if (reviewScore !== null) perceptionScore = reviewScore

        const dims = {
          pulse:      { score: pulseAvg,       weight: 0.30 },
          okr:        { score: okrScore,        weight: 0.25 },
          perception: { score: perceptionScore, weight: 0.20 },
          activite:   { score: briefRate,       weight: 0.15 },
        }
        const ipr = weightedIPR(dims)

        const lastBrief    = submitted.map(b=>b.plan_date).sort().at(-1) ?? null
        const daysSince    = lastBrief
          ? Math.round((today()-new Date(lastBrief))/(1000*60*60*24))
          : workDays

        const sparkline14  = scores.slice(-14)

        return {
          userId: u.id, firstName: u.first_name, lastName: u.last_name, role: u.role,
          ipr, pulseAvg, briefRate, f360Score, reviewScore, okrScore, perceptionScore,
          briefsSubmitted: submitted.length, workDays, daysWithData: scores.length,
          daysSinceLastBrief: daysSince, sparkline: sparkline14,
          alert: daysSince >= 3 ? 'no_brief' : (ipr !== null && ipr < 40) ? 'low_ipr' : null,
        }
      }).sort((a,b) => (b.ipr??-1)-(a.ipr??-1))
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}
