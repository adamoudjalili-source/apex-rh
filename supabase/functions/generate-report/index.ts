// ============================================================
// APEX RH — supabase/functions/generate-report/index.ts
// Session 44 — Génération de rapports IA (mensuel individuel / équipe)
// ============================================================
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONTHS_FR = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
]

function periodLabel(year: number, month: number | null, week: number | null): string {
  if (week) return `Semaine ${week} — ${year}`
  if (month) return `${MONTHS_FR[(month - 1)]} ${year}`
  return `${year}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { report_type, service_id, user_id, year, month, week } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY manquant' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const label = periodLabel(year, month, week)

    // ── Compute date range ────────────────────────────────────
    let dateFrom: string, dateTo: string
    if (month) {
      dateFrom = `${year}-${String(month).padStart(2,'0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      dateTo   = `${year}-${String(month).padStart(2,'0')}-${lastDay}`
    } else if (week) {
      const jan1 = new Date(year, 0, 1)
      const dayOfWeek = jan1.getDay() || 7
      const mondayOfW1 = new Date(jan1.getTime() - (dayOfWeek - 1) * 86400000)
      const weekStart = new Date(mondayOfW1.getTime() + (week - 1) * 7 * 86400000)
      const weekEnd   = new Date(weekStart.getTime() + 6 * 86400000)
      dateFrom = weekStart.toISOString().split('T')[0]
      dateTo   = weekEnd.toISOString().split('T')[0]
    } else {
      dateFrom = `${year}-01-01`
      dateTo   = `${year}-12-31`
    }

    let stats: any = {}
    let highlights: any[] = []
    let promptContext = ''

    // ══════════════════════════════════════════════════════════
    // RAPPORT INDIVIDUEL MENSUEL
    // ══════════════════════════════════════════════════════════
    if (report_type === 'monthly_individual' && user_id) {

      // Infos utilisateur
      const { data: user } = await supabase
        .from('users')
        .select('first_name, last_name, role, service_id')
        .eq('id', user_id).single()

      // PULSE scores
      const { data: pulseScores } = await supabase
        .from('performance_scores')
        .select('score_total, score_delivery, score_quality, score_regularity, score_bonus, score_date')
        .eq('user_id', user_id)
        .gte('score_date', dateFrom)
        .lte('score_date', dateTo)
        .order('score_date', { ascending: true })

      // Briefs soumis
      const { data: briefs } = await supabase
        .from('pulse_morning_plans')
        .select('plan_date')
        .eq('user_id', user_id)
        .gte('plan_date', dateFrom)
        .lte('plan_date', dateTo)

      // Journaux soumis
      const { data: journals } = await supabase
        .from('pulse_daily_logs')
        .select('log_date, day_score')
        .eq('user_id', user_id)
        .gte('log_date', dateFrom)
        .lte('log_date', dateTo)

      // OKR
      const { data: objectives } = await supabase
        .from('objectives')
        .select('title, progress_score, status')
        .eq('owner_id', user_id)

      // Feedbacks reçus validés
      const { data: feedbackReqs } = await supabase
        .from('feedback_requests')
        .select('id')
        .eq('evaluated_id', user_id)
        .eq('status', 'validated')
        .gte('submitted_at', dateFrom)

      let f360Avgs: Record<string,number> = {}
      if (feedbackReqs?.length) {
        const reqIds = feedbackReqs.map((r: any) => r.id)
        const { data: fbResp } = await supabase
          .from('feedback_responses')
          .select('question_key, score')
          .in('request_id', reqIds)
        const grouped: Record<string, number[]> = {}
        for (const r of fbResp ?? []) {
          if (!grouped[r.question_key]) grouped[r.question_key] = []
          if (r.score !== null) grouped[r.question_key].push(r.score)
        }
        for (const [k, v] of Object.entries(grouped)) {
          f360Avgs[k] = Math.round((v.reduce((s: number, x: number) => s+x, 0) / v.length) * 10) / 10
        }
      }

      // NITA
      const { data: nitaData } = await supabase
        .from('agent_activity_logs')
        .select('resilience_score, fiabilite_score, endurance_score')
        .eq('user_id', user_id)
        .gte('log_date', dateFrom)
        .lte('log_date', dateTo)

      // Calcul stats
      const pulseAvg   = pulseScores?.length
        ? Math.round(pulseScores.reduce((s: number, p: any) => s + p.score_total, 0) / pulseScores.length) : null
      const pulseMax   = pulseScores?.length ? Math.max(...pulseScores.map((p: any) => p.score_total)) : null
      const pulseMin   = pulseScores?.length ? Math.min(...pulseScores.map((p: any) => p.score_total)) : null
      const briefRate  = briefs?.length && pulseScores?.length
        ? Math.round((briefs.length / Math.max(pulseScores.length, 1)) * 100) : null
      const okrAvg     = objectives?.length
        ? Math.round(objectives.reduce((s: number, o: any) => s + (o.progress_score ?? 0), 0) / objectives.length) : null
      const nitaAvg    = nitaData?.length ? Math.round(
        nitaData.reduce((s: number, n: any) =>
          s + (n.resilience_score * 0.35 + n.fiabilite_score * 0.4 + n.endurance_score * 0.25), 0
        ) / nitaData.length
      ) : null

      // PULSE trend
      let pulseTrend = null
      if (pulseScores && pulseScores.length >= 4) {
        const first = pulseScores.slice(0, Math.ceil(pulseScores.length / 2))
        const last  = pulseScores.slice(Math.floor(pulseScores.length / 2))
        const avgFirst = first.reduce((s: number, p: any) => s + p.score_total, 0) / first.length
        const avgLast  = last.reduce((s: number, p: any)  => s + p.score_total, 0) / last.length
        pulseTrend = Math.round(avgLast - avgFirst)
      }

      stats = {
        name       : `${user?.first_name} ${user?.last_name}`,
        role       : user?.role,
        period     : label,
        pulse_avg  : pulseAvg,
        pulse_max  : pulseMax,
        pulse_min  : pulseMin,
        pulse_days : pulseScores?.length ?? 0,
        brief_rate : briefRate,
        okr_avg    : okrAvg,
        nita_avg   : nitaAvg,
        f360       : f360Avgs,
        pulse_trend: pulseTrend,
        objectives_count : objectives?.length ?? 0,
        journals_count   : journals?.length ?? 0,
      }

      highlights = [
        pulseAvg !== null && { type:'pulse',    label:'PULSE moyen',        value:`${pulseAvg}/100`,  trend: pulseTrend !== null ? (pulseTrend >= 0 ? 'up' : 'down') : null },
        briefRate !== null && { type:'briefs',  label:'Taux soumission briefs', value:`${briefRate}%`, trend: briefRate >= 80 ? 'up' : 'down' },
        okrAvg !== null && { type:'okr',        label:'Progression OKR',    value:`${okrAvg}%`,      trend: okrAvg >= 60 ? 'up' : 'neutral' },
        nitaAvg !== null && { type:'nita',       label:'Score NITA moyen',   value:`${nitaAvg}/100`,  trend: nitaAvg >= 70 ? 'up' : 'down' },
        Object.keys(f360Avgs).length > 0 && { type:'f360', label:'F360 Communication', value:`${f360Avgs.communication ?? '—'}/10`, trend: null },
      ].filter(Boolean)

      promptContext = `
Rapport de performance individuel de ${user?.first_name} ${user?.last_name} pour ${label} :

Score PULSE moyen : ${pulseAvg ?? 'N/A'}/100 (${pulseScores?.length ?? 0} jours mesurés)
Score PULSE max : ${pulseMax ?? 'N/A'} / min : ${pulseMin ?? 'N/A'}
Tendance PULSE sur la période : ${pulseTrend !== null ? (pulseTrend >= 0 ? '+' : '') + pulseTrend + ' points' : 'N/A'}
Taux de soumission briefs : ${briefRate ?? 'N/A'}%
Progression OKR moyenne : ${okrAvg ?? 'N/A'}%
Score NITA moyen : ${nitaAvg ?? 'N/A'}/100
Feedbacks 360° reçus ce mois : ${feedbackReqs?.length ?? 0}
Scores F360 : ${JSON.stringify(f360Avgs)}
Objectifs en cours : ${objectives?.length ?? 0}
`
    }

    // ══════════════════════════════════════════════════════════
    // RAPPORT ÉQUIPE (mensuel ou hebdo)
    // ══════════════════════════════════════════════════════════
    else if ((report_type === 'monthly_team' || report_type === 'weekly_team') && service_id) {

      // Infos service
      const { data: serviceInfo } = await supabase
        .from('services')
        .select('name')
        .eq('id', service_id).single()

      // Membres du service
      const { data: members } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('service_id', service_id)
        .eq('is_active', true)
        .eq('role', 'collaborateur')

      if (!members?.length) {
        return new Response(JSON.stringify({ error: 'Aucun collaborateur dans ce service' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }

      const memberIds = members.map((m: any) => m.id)

      // PULSE de l'équipe
      const { data: pulseData } = await supabase
        .from('performance_scores')
        .select('user_id, score_total, score_date')
        .in('user_id', memberIds)
        .gte('score_date', dateFrom)
        .lte('score_date', dateTo)

      // Briefs
      const { data: briefData } = await supabase
        .from('pulse_morning_plans')
        .select('user_id, plan_date')
        .in('user_id', memberIds)
        .gte('plan_date', dateFrom)
        .lte('plan_date', dateTo)

      // Calculs par membre
      const memberStats = members.map((m: any) => {
        const mp = (pulseData ?? []).filter((p: any) => p.user_id === m.id)
        const mb = (briefData ?? []).filter((b: any) => b.user_id === m.id)
        const avg = mp.length ? Math.round(mp.reduce((s: number, p: any) => s + p.score_total, 0) / mp.length) : null
        const briefRate = mp.length ? Math.round((mb.length / mp.length) * 100) : null
        return {
          id       : m.id,
          name     : `${m.first_name} ${m.last_name}`,
          pulse_avg: avg,
          brief_rate: briefRate,
          days_measured: mp.length,
        }
      })

      const teamAvg  = memberStats.filter((m: any) => m.pulse_avg !== null)
      const avgPulse = teamAvg.length ? Math.round(teamAvg.reduce((s: number, m: any) => s + m.pulse_avg, 0) / teamAvg.length) : null
      const topPerf  = [...memberStats].sort((a: any, b: any) => (b.pulse_avg ?? 0) - (a.pulse_avg ?? 0))[0]
      const lowPerf  = [...memberStats].sort((a: any, b: any) => (a.pulse_avg ?? 100) - (b.pulse_avg ?? 100))[0]
      const alertCount = memberStats.filter((m: any) => m.pulse_avg !== null && m.pulse_avg < 40).length
      const avgBriefRate = memberStats.filter((m: any) => m.brief_rate !== null)
      const teamBriefRate = avgBriefRate.length
        ? Math.round(avgBriefRate.reduce((s: number, m: any) => s + m.brief_rate, 0) / avgBriefRate.length) : null

      stats = {
        service        : serviceInfo?.name ?? 'Service',
        period         : label,
        members_count  : members.length,
        team_pulse_avg : avgPulse,
        team_brief_rate: teamBriefRate,
        alert_count    : alertCount,
        top_performer  : topPerf?.name,
        top_score      : topPerf?.pulse_avg,
        low_performer  : lowPerf?.name,
        low_score      : lowPerf?.pulse_avg,
        member_details : memberStats,
      }

      highlights = [
        { type:'pulse',   label:'PULSE équipe moyen',      value: avgPulse !== null ? `${avgPulse}/100` : 'N/A', trend: avgPulse !== null ? (avgPulse >= 60 ? 'up' : 'down') : null },
        { type:'briefs',  label:'Taux soumission briefs',   value: teamBriefRate !== null ? `${teamBriefRate}%` : 'N/A', trend: teamBriefRate !== null ? (teamBriefRate >= 75 ? 'up' : 'down') : null },
        { type:'members', label:'Collaborateurs actifs',    value: `${members.length}`, trend: null },
        { type:'alert',   label:'Alertes performance',      value: `${alertCount}`, trend: alertCount > 0 ? 'down' : 'up' },
        topPerf?.pulse_avg && { type:'top', label:`Top performer — ${topPerf.name}`, value: `${topPerf.pulse_avg}/100`, trend: 'up' },
      ].filter(Boolean)

      promptContext = `
Rapport de performance de l'équipe "${serviceInfo?.name}" pour ${label} :

Nombre de collaborateurs : ${members.length}
Score PULSE moyen équipe : ${avgPulse ?? 'N/A'}/100
Taux soumission briefs moyen : ${teamBriefRate ?? 'N/A'}%
Nombre d'alertes (PULSE < 40) : ${alertCount}
Meilleur performer : ${topPerf?.name ?? 'N/A'} (${topPerf?.pulse_avg ?? 'N/A'}/100)
Collaborateur à accompagner : ${lowPerf?.name ?? 'N/A'} (${lowPerf?.pulse_avg ?? 'N/A'}/100)

Détails par collaborateur :
${memberStats.map((m: any) => `- ${m.name} : PULSE ${m.pulse_avg ?? 'N/A'}/100, briefs ${m.brief_rate ?? 'N/A'}%`).join('\n')}
`
    }

    // ── Appel Claude ─────────────────────────────────────────

    const isTeam = report_type.includes('team')
    const systemPrompt = `Tu es expert RH chez NITA Transfert d'Argent. 
Tu rédiges des rapports de performance concis, analytiques et bienveillants en français.
Tu identifies des tendances claires, des forces et des axes d'amélioration.
Tes recommandations sont concrètes, actionnables et adaptées au contexte africain.
Tu ne révèles jamais d'informations sensibles individuelles dans les rapports d'équipe.`

    const userPrompt = `${promptContext}

Rédige le résumé narratif de ce rapport en 3 parties distinctes :
1. **Synthèse** (2-3 phrases) : bilan global de la période
2. **Points forts** (2-3 points) : ce qui s'est bien passé
3. **Recommandations** (2-3 actions concrètes) : ce qu'il faut améliorer ou maintenir

Sois direct, factuel et encourageant. Maximum 250 mots au total.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'x-api-key'        : apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model     : 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system    : systemPrompt,
        messages  : [{ role: 'user', content: userPrompt }],
      }),
    })

    let aiSummary = ''
    let recommendations: any[] = []

    if (claudeRes.ok) {
      const claudeData = await claudeRes.json()
      aiSummary = claudeData.content?.[0]?.text ?? ''

      // Extraire recommandations (lignes commençant par - ou numéro dans la section Recommandations)
      const recSection = aiSummary.split(/recommandations?/i)[1] ?? ''
      const recLines = recSection.split('\n')
        .filter((l: string) => l.trim().match(/^[-•\d\.]/))
        .slice(0, 3)
        .map((l: string, i: number) => ({
          priority: i === 0 ? 'high' : 'medium',
          text: l.replace(/^[-•\d\.\s]+/, '').trim(),
        }))
        .filter((r: any) => r.text.length > 5)
      recommendations = recLines
    }

    // ── Sauvegarder en base ──────────────────────────────────

    const reportPayload: any = {
      report_type   : report_type,
      period_label  : label,
      year,
      month         : month ?? null,
      week          : week  ?? null,
      status        : 'ready',
      stats,
      ai_summary    : aiSummary,
      highlights    : highlights,
      recommendations,
      generated_at  : new Date().toISOString(),
    }

    if (report_type === 'monthly_individual') {
      reportPayload.user_id = user_id
    } else {
      reportPayload.service_id = service_id
    }

    // Upsert (remplace si même période + type)
    const { data: savedReport, error: saveErr } = await supabase
      .from('ai_reports')
      .upsert(reportPayload, {
        onConflict: report_type === 'monthly_individual'
          ? 'user_id,report_type,year,month,week'
          : 'service_id,report_type,year,month,week',
      })
      .select()
      .single()

    if (saveErr) {
      console.error('[generate-report] Save error:', saveErr)
      // Retourner quand même le rapport même si la sauvegarde échoue
    }

    return new Response(JSON.stringify({
      success: true,
      report : savedReport ?? reportPayload,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[generate-report]', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur interne' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
