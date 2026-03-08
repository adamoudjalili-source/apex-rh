// @ts-nocheck
// ============================================================
// APEX RH — supabase/functions/ai-recruitment-match/index.ts
// Session 61 — IA Recrutement : scoring & matching candidats
// Reçoit : { job_application_id, organization_id }
// Retourne : { score, breakdown, strengths, gaps, recommendation, summary }
// ============================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Prompt système ───────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert RH senior spécialisé dans l'évaluation et le matching de candidats.
Tu analyses objectivement les profils de candidats en fonction des exigences d'un poste.
Tu réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après.
Tu es factuel, bienveillant, et évites tout biais discriminatoire.
Tes scores sont calibrés : 90+ = profil exceptionnel, 70-89 = bon profil, 50-69 = profil correct, <50 = profil insuffisant.`

function buildAnalysisPrompt(job: Record<string, unknown>, application: Record<string, unknown>): string {
  return `Analyse ce candidat pour le poste suivant et retourne un JSON structuré.

## POSTE
Titre : ${job.title}
Division : ${job.division_name ?? 'N/A'}
Type de contrat : ${job.contract_type}
Description : ${job.description ?? 'Non fournie'}
Exigences : ${job.requirements ?? 'Non fournie'}
Expérience requise : ${job.min_experience_years ?? 0} ans
Niveau d'éducation requis : ${job.education_level ?? 'Non spécifié'}

## CANDIDAT
Nom : ${application.candidate_name}
Email : ${application.candidate_email}
Expérience déclarée : ${application.years_experience ?? 'Non indiquée'} ans
Formation : ${application.education ?? 'Non indiquée'}
Compétences déclarées : ${Array.isArray(application.skills) ? application.skills.join(', ') : (application.skills ?? 'Non indiquées')}
Lettre de motivation : ${application.cover_letter ?? 'Aucune lettre fournie'}
Source : ${application.source ?? 'N/A'}
Candidature interne : ${application.is_internal ? 'Oui' : 'Non'}

## INSTRUCTIONS
Retourne UNIQUEMENT ce JSON (sans backticks, sans commentaires) :
{
  "overall_score": <entier 0-100>,
  "score_breakdown": {
    "skills": <entier 0-100>,
    "experience": <entier 0-100>,
    "education": <entier 0-100>,
    "motivation": <entier 0-100>
  },
  "strengths": [<string>, <string>, <string max>],
  "gaps": [<string>, <string max>],
  "key_highlights": [<string>, <string max>],
  "recommendation": "<strongly_recommend|recommend|neutral|not_recommend|strong_reject>",
  "ai_summary": "<résumé 2-3 phrases en français, professionnel et objectif>"
}

Règles :
- overall_score = moyenne pondérée (skills×40% + experience×30% + education×15% + motivation×15%)
- strengths : 1 à 3 points forts concrets
- gaps : 0 à 3 lacunes réelles (vide [] si le profil est excellent)
- key_highlights : 1 à 3 points remarquables du CV/profil
- ai_summary : synthèse neutre et professionnelle en français`
}

// ─── Handler principal ────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { job_application_id, force_reanalyze = false } = await req.json()

    if (!job_application_id) {
      return new Response(
        JSON.stringify({ error: 'job_application_id requis' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Init Supabase ─────────────────────────────────────────
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const supabaseKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY')!

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY non configuré' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ── Vérifier si analyse existante (sauf force) ────────────
    if (!force_reanalyze) {
      const { data: existing } = await supabase
        .from('ai_candidate_scores')
        .select('id, overall_score, recommendation, analyzed_at')
        .eq('job_application_id', job_application_id)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({ cached: true, data: existing }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── Charger la candidature + l'offre ──────────────────────
    const { data: application, error: appErr } = await supabase
      .from('job_applications')
      .select(`
        id, candidate_name, candidate_email, cover_letter,
        years_experience, education, skills, source, is_internal,
        organization_id,
        job:job_postings(
          id, title, description, requirements, contract_type,
          min_experience_years, education_level,
          division:divisions(name),
          service:services(name)
        )
      `)
      .eq('id', job_application_id)
      .single()

    if (appErr || !application) {
      return new Response(
        JSON.stringify({ error: 'Candidature introuvable', details: appErr?.message }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const job = {
      ...application.job,
      division_name: application.job?.division?.name,
      service_name:  application.job?.service?.name,
    }

    const appData = {
      candidate_name:    application.candidate_name,
      candidate_email:   application.candidate_email,
      cover_letter:      application.cover_letter,
      years_experience:  application.years_experience,
      education:         application.education,
      skills:            application.skills,
      source:            application.source,
      is_internal:       application.is_internal,
    }

    // ── Appel Claude API ──────────────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'x-api-key'        : anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildAnalysisPrompt(job, appData) }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return new Response(
        JSON.stringify({ error: 'Erreur Claude API', details: errText }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''

    // ── Parser le JSON retourné par Claude ────────────────────
    let parsed: Record<string, unknown>
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Réponse IA non parseable', raw: rawText }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Valider et normaliser les données ─────────────────────
    const VALID_RECOMMENDATIONS = [
      'strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strong_reject'
    ]
    const recommendation = VALID_RECOMMENDATIONS.includes(parsed.recommendation as string)
      ? parsed.recommendation as string
      : 'neutral'

    const overallScore = Math.min(100, Math.max(0, Number(parsed.overall_score) || 0))

    const scoreRecord = {
      organization_id:    application.organization_id,
      job_application_id: job_application_id,
      job_posting_id:     application.job?.id,
      overall_score:      overallScore,
      score_breakdown:    parsed.score_breakdown ?? {},
      strengths:          parsed.strengths ?? [],
      gaps:               parsed.gaps ?? [],
      key_highlights:     parsed.key_highlights ?? [],
      recommendation,
      ai_summary:         parsed.ai_summary ?? '',
      analyzed_at:        new Date().toISOString(),
      model_version:      'claude-sonnet-4-20250514',
    }

    // ── Upsert dans ai_candidate_scores ───────────────────────
    const { data: saved, error: saveErr } = await supabase
      .from('ai_candidate_scores')
      .upsert(scoreRecord, { onConflict: 'job_application_id' })
      .select()
      .single()

    if (saveErr) {
      return new Response(
        JSON.stringify({ error: 'Erreur sauvegarde', details: saveErr.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Mettre à jour les percentile_ranks pour l'offre ───────
    // (asynchrone, non bloquant)
    supabase.rpc('refresh_ai_recruitment_views').then(() => {})

    return new Response(
      JSON.stringify({ cached: false, data: saved }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
