// ============================================================
// APEX RH — supabase/functions/generate-pdi-suggestions/index.ts
// Session 43 — Génération automatique de suggestions PDI par IA
// Récupère les données de performance et génère des actions PDI structurées
// ============================================================
import { serve }         from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COMPETENCIES = [
  { key: 'quality',        label: 'Qualité du travail'     },
  { key: 'deadlines',      label: 'Respect des délais'     },
  { key: 'communication',  label: 'Communication'          },
  { key: 'teamwork',       label: 'Esprit d\'équipe'       },
  { key: 'initiative',     label: 'Initiative & proactivité' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { user_id } = await req.json()
    if (!user_id) return new Response(JSON.stringify({ error: 'user_id requis' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY non configuré' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Informations utilisateur
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, job_family_id')
      .eq('id', user_id)
      .single()

    // 2. Évaluations formelles validées (3 dernières)
    const { data: evaluations } = await supabase
      .from('review_evaluations')
      .select('overall_rating, final_comment, synthesis, created_at')
      .eq('evaluated_id', user_id)
      .eq('status', 'validated')
      .order('created_at', { ascending: false })
      .limit(3)

    // 3. Feedbacks 360° reçus (validés, 30 derniers jours)
    const since60d = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]
    const { data: feedbackRequests } = await supabase
      .from('feedback_requests')
      .select('id, type')
      .eq('evaluated_id', user_id)
      .eq('status', 'validated')
      .gte('submitted_at', since60d)

    let feedbackScores: Record<string, number[]> = {}
    if (feedbackRequests?.length) {
      const reqIds = feedbackRequests.map((r: any) => r.id)
      const { data: responses } = await supabase
        .from('feedback_responses')
        .select('question_key, score, comment')
        .in('request_id', reqIds)
      for (const r of responses ?? []) {
        if (!feedbackScores[r.question_key]) feedbackScores[r.question_key] = []
        if (r.score !== null) feedbackScores[r.question_key].push(r.score)
      }
    }

    // Moyennes F360 par compétence
    const f360Avgs: Record<string, number> = {}
    for (const [key, scores] of Object.entries(feedbackScores)) {
      f360Avgs[key] = Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
    }

    // 4. PULSE moyen (30 derniers jours)
    const { data: pulseData } = await supabase
      .from('performance_scores')
      .select('score_total, score_delivery, score_quality, score_regularity')
      .eq('user_id', user_id)
      .gte('score_date', since60d)
    const pulseAvg = pulseData?.length
      ? Math.round(pulseData.reduce((s: number, p: any) => s + (p.score_total ?? 0), 0) / pulseData.length)
      : null

    // 5. PDI existant (actions en cours)
    const { data: plan } = await supabase
      .from('development_plans')
      .select('id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let existingActions: any[] = []
    if (plan) {
      const { data: actions } = await supabase
        .from('pdi_actions')
        .select('title, competency_key, status')
        .eq('plan_id', plan.id)
        .neq('status', 'done')
      existingActions = actions ?? []
    }

    // ── Construire le prompt ──────────────────────────────────

    const contextSummary = `
Collaborateur : ${user?.first_name} ${user?.last_name} (${user?.role})

Scores F360 par compétence (sur 10) :
${COMPETENCIES.map(c => `- ${c.label} : ${f360Avgs[c.key] !== undefined ? f360Avgs[c.key] + '/10' : 'N/A'}`).join('\n')}

PULSE moyen (30 derniers jours) : ${pulseAvg !== null ? pulseAvg + '/100' : 'Non disponible'}

Dernières évaluations formelles :
${evaluations?.length
  ? evaluations.map((e: any) => `- ${e.overall_rating ?? 'N/A'} : "${e.final_comment ?? 'Aucun commentaire'}" (${new Date(e.created_at).toLocaleDateString('fr-FR')})`).join('\n')
  : '- Aucune évaluation formelle disponible'}

Actions PDI en cours :
${existingActions.length
  ? existingActions.map((a: any) => `- [${a.competency_key}] ${a.title}`).join('\n')
  : '- Aucune action en cours'}
`

    const systemPrompt = `Tu es un expert en développement des compétences professionnelles pour NITA Transfert d'Argent.
Tu génères des suggestions d'actions de développement CONCRÈTES et RÉALISABLES basées sur les données de performance.
Tu réponds UNIQUEMENT en JSON valide, sans texte avant ni après.`

    const userMessage = `${contextSummary}

Génère 3 à 5 suggestions d'actions PDI prioritaires pour ce collaborateur.
Concentre-toi sur les compétences avec les scores les plus faibles et les retours des évaluations.
N'inclus PAS les actions déjà en cours dans le PDI.

Réponds EXACTEMENT avec ce JSON (tableau d'objets) :
[
  {
    "competency_key": "quality|deadlines|communication|teamwork|initiative",
    "suggested_action": "Action concrète et mesurable (max 80 caractères)",
    "rationale": "Explication courte du pourquoi basée sur les données (max 120 caractères)",
    "priority": "high|medium|low"
  }
]`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'x-api-key'        : apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model     : 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system    : systemPrompt,
        messages  : [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return new Response(JSON.stringify({ error: `Erreur Claude API: ${claudeRes.status} — ${errText}` }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const rawText    = claudeData.content?.[0]?.text ?? '[]'

    let suggestions: any[]
    try {
      // Nettoyer les éventuels backticks
      const clean = rawText.replace(/```json|```/g, '').trim()
      suggestions = JSON.parse(clean)
      if (!Array.isArray(suggestions)) suggestions = []
    } catch {
      console.error('[generate-pdi-suggestions] JSON parse error:', rawText)
      suggestions = []
    }

    // Persister en base
    if (suggestions.length > 0) {
      // Supprimer les suggestions non-acceptées précédentes
      await supabase
        .from('ai_pdi_suggestions')
        .delete()
        .eq('user_id', user_id)
        .eq('accepted', false)

      await supabase.from('ai_pdi_suggestions').insert(
        suggestions.map((s: any) => ({
          user_id         : user_id,
          competency_key  : s.competency_key,
          suggested_action: s.suggested_action,
          rationale       : s.rationale,
          priority        : s.priority ?? 'medium',
        }))
      )
    }

    return new Response(JSON.stringify({ suggestions, total: suggestions.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-pdi-suggestions]', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur interne' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
