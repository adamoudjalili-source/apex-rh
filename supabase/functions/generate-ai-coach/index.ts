// ============================================================
// APEX RH — supabase/functions/generate-ai-coach/index.ts
// Session 30 — Génération d'analyse IA via API Anthropic (Claude)
//
// POST Body :
//   { type: 'individual', user_id: string, period_days?: number }
//   { type: 'team', service_id: string, period_days?: number }
//
// Retourne :
//   { success, analysis_id, insights: { performance, wellbeing, blockers, team_summary? } }
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Prompt builder ─────────────────────────────────────────

function buildIndividualPrompt(
  firstName: string,
  lastName: string,
  role: string,
  journals: any[]
): string {
  const journalText = journals.length === 0
    ? 'Aucun journal soumis sur la période.'
    : journals.map((j: any) => {
        const lines = []
        lines.push(`--- Journée du ${j.date} ---`)
        if (j.morning_objectives) lines.push(`Brief matinal : ${j.morning_objectives}`)
        if (j.accomplishments)    lines.push(`Accomplissements : ${j.accomplishments}`)
        if (j.difficulties)       lines.push(`Difficultés : ${j.difficulties}`)
        if (j.next_day_plan)      lines.push(`Plan demain : ${j.next_day_plan}`)
        if (j.mood_score)         lines.push(`Humeur : ${j.mood_score}/5`)
        if (j.energy_level)       lines.push(`Énergie : ${j.energy_level}/5`)
        if (j.pulse_score !== null && j.pulse_score !== undefined) {
          lines.push(`Score PULSE : ${j.pulse_score}/100`)
        }
        return lines.join('\n')
      }).join('\n\n')

  return `Tu es un coach RH expert travaillant pour APEX RH, une application de gestion de performance pour NITA Transfert d'Argent en Afrique de l'Ouest.

Tu reçois les journaux quotidiens de ${firstName} ${lastName} (${role}) sur les 7 derniers jours.

${journalText}

Génère une analyse structurée en JSON avec exactement ces 3 clés :
- "performance" : string — 2 à 4 suggestions concrètes pour améliorer la performance opérationnelle (délais, qualité, organisation). Ton : professionnel, direct, encourageant. 150 mots max.
- "wellbeing" : string — 2 à 3 observations sur le bien-être (humeur, énergie, charge de travail) + recommandations pratiques. Ton : bienveillant, empathique. 120 mots max.
- "blockers" : string — Identifie 1 à 3 blocages ou freins récurrents détectés dans les journaux + suggestions de résolution pour le manager. Ton : analytique, actionnable. 120 mots max.

Réponds UNIQUEMENT avec le JSON, sans markdown ni explication. Exemple de format :
{"performance":"...","wellbeing":"...","blockers":"..."}`
}

function buildTeamPrompt(
  teamName: string,
  members: any[],
  allJournals: any[]
): string {
  const memberStats = members.map((m: any) => {
    const userJournals = allJournals.filter((j: any) => j.user_id === m.id)
    const avgMood = userJournals.length > 0
      ? (userJournals.reduce((a: number, j: any) => a + (j.mood_score || 3), 0) / userJournals.length).toFixed(1)
      : 'n/a'
    const avgEnergy = userJournals.length > 0
      ? (userJournals.reduce((a: number, j: any) => a + (j.energy_level || 3), 0) / userJournals.length).toFixed(1)
      : 'n/a'
    const avgScore = userJournals.length > 0
      ? Math.round(userJournals.reduce((a: number, j: any) => a + (j.pulse_score || 0), 0) / userJournals.length)
      : null
    const hasBlockers = userJournals.some((j: any) => j.difficulties && j.difficulties.trim().length > 10)

    return `- ${m.first_name} ${m.last_name} : ${userJournals.length} journal(x) soumis, humeur moy. ${avgMood}/5, énergie moy. ${avgEnergy}/5${avgScore !== null ? `, score PULSE moy. ${avgScore}/100` : ''}${hasBlockers ? ', a signalé des difficultés' : ''}`
  }).join('\n')

  return `Tu es un coach RH expert travaillant pour APEX RH, une application de gestion de performance pour NITA Transfert d'Argent en Afrique de l'Ouest.

Voici le résumé de l'équipe "${teamName}" sur les 7 derniers jours (${members.length} collaborateurs) :

${memberStats}

Génère un résumé de coaching d'équipe structuré en JSON avec exactement cette clé :
- "team_summary" : string — Un résumé structuré en 3 paragraphes distincts :
  1. **Dynamique d'équipe** : état général de l'équipe (engagement, énergie, régularité des soumissions).
  2. **Points d'attention** : collaborateurs ou tendances nécessitant l'attention du manager (sans nommer négativement, utiliser des tournures bienveillantes).
  3. **Recommandations manager** : 2 à 3 actions concrètes que le manager peut mettre en place cette semaine. Ton : stratégique, pragmatique, orienté action. 250 mots max.

Réponds UNIQUEMENT avec le JSON, sans markdown ni explication. Format :
{"team_summary":"..."}`
}

// ─── Appel API Anthropic ─────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non configurée dans les secrets Supabase')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  // Parser le JSON retourné par Claude
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim()
  return cleaned
}

// ─── Handler principal ───────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { type, user_id, service_id, period_days = 7 } = body

  if (!type || (type === 'individual' && !user_id) || (type === 'team' && !service_id)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Paramètres manquants : type + user_id ou service_id requis' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Plage de dates
  const endDate   = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - period_days)
  const startStr = startDate.toISOString().split('T')[0]
  const endStr   = endDate.toISOString().split('T')[0]

  try {
    // ── Analyse individuelle ─────────────────────────────────
    if (type === 'individual') {
      // 1. Infos collaborateur
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, service_id')
        .eq('id', user_id)
        .single()

      if (userErr || !user) throw new Error('Utilisateur introuvable')

      // 2. Journaux PULSE sur la période (morning_plans + daily_logs joint)
      const { data: logs } = await supabase
        .from('pulse_daily_logs')
        .select(`
          id, log_date, accomplishments, difficulties, next_day_plan,
          mood_score, energy_level, total_score,
          pulse_morning_plans!inner ( date, objectives )
        `)
        .eq('user_id', user_id)
        .gte('log_date', startStr)
        .lte('log_date', endStr)
        .order('log_date', { ascending: true })

      // 3. Construire les journaux pour le prompt
      const journals = (logs ?? []).map((l: any) => ({
        date:               l.log_date,
        morning_objectives: l.pulse_morning_plans?.objectives ?? null,
        accomplishments:    l.accomplishments,
        difficulties:       l.difficulties,
        next_day_plan:      l.next_day_plan,
        mood_score:         l.mood_score,
        energy_level:       l.energy_level,
        pulse_score:        l.total_score,
      }))

      // 4. Appel Claude
      const prompt   = buildIndividualPrompt(user.first_name, user.last_name, user.role, journals)
      const rawJson  = await callClaude(prompt)
      const parsed   = JSON.parse(rawJson)

      // 5. Sauvegarder en base
      const { data: saved, error: saveErr } = await supabase
        .from('ai_coach_analyses')
        .insert({
          user_id,
          generated_by: user_id, // auto-généré (ou passé dans le body si manager)
          analysis_type: 'individual',
          period_start:  startStr,
          period_end:    endStr,
          service_id:    user.service_id,
          performance_insights: parsed.performance ?? null,
          wellbeing_insights:   parsed.wellbeing   ?? null,
          blockers_insights:    parsed.blockers     ?? null,
          journal_count: journals.length,
        })
        .select('id')
        .single()

      if (saveErr) throw saveErr

      return new Response(
        JSON.stringify({
          success:     true,
          analysis_id: saved.id,
          journal_count: journals.length,
          insights: {
            performance: parsed.performance ?? '',
            wellbeing:   parsed.wellbeing   ?? '',
            blockers:    parsed.blockers     ?? '',
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── Analyse équipe ───────────────────────────────────────
    if (type === 'team') {
      // 1. Service
      const { data: service } = await supabase
        .from('services')
        .select('id, name')
        .eq('id', service_id)
        .single()

      // 2. Collaborateurs du service
      const { data: members } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('service_id', service_id)
        .eq('role', 'collaborateur')
        .eq('is_active', true)

      if (!members || members.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Aucun collaborateur dans ce service' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const memberIds = members.map((m: any) => m.id)

      // 3. Journaux de tous les membres
      const { data: allLogs } = await supabase
        .from('pulse_daily_logs')
        .select('user_id, log_date, mood_score, energy_level, total_score, difficulties')
        .in('user_id', memberIds)
        .gte('log_date', startStr)
        .lte('log_date', endStr)

      // 4. Appel Claude
      const prompt  = buildTeamPrompt(service?.name ?? 'Équipe', members, allLogs ?? [])
      const rawJson = await callClaude(prompt)
      const parsed  = JSON.parse(rawJson)

      // 5. Sauvegarder
      const { data: saved, error: saveErr } = await supabase
        .from('ai_coach_analyses')
        .insert({
          analysis_type: 'team',
          period_start:  startStr,
          period_end:    endStr,
          service_id,
          team_summary:  parsed.team_summary ?? null,
          journal_count: (allLogs ?? []).length,
        })
        .select('id')
        .single()

      if (saveErr) throw saveErr

      return new Response(
        JSON.stringify({
          success:     true,
          analysis_id: saved.id,
          member_count: members.length,
          journal_count: (allLogs ?? []).length,
          insights: {
            team_summary: parsed.team_summary ?? '',
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'type invalide (individual | team)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[generate-ai-coach] Erreur:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
