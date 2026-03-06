// ============================================================
// APEX RH — supabase/functions/generate-ai-response/index.ts
// Session 43 — Edge Function générique Claude API
// Reçoit : context_type, messages[], context_data
// Retourne : { reply: string }
// ============================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── System prompts par contexte ─────────────────────────────

function buildSystemPrompt(contextType: string, contextData: Record<string, unknown>): string {
  const base = `Tu es l'assistant IA intégré à APEX RH, la plateforme de performance humaine de NITA Transfert d'Argent.
Tu réponds en français, de manière concise, bienveillante et orientée action.
Tu ne mentionnes jamais de noms d'outils, d'APIs ou de technologies internes.
Tes réponses sont courtes (max 200 mots sauf si demandé), directes et pratiques.`

  const contexts: Record<string, string> = {
    developpement: `${base}
Ton rôle : coach de développement professionnel.
Tu aides le collaborateur à progresser sur son PDI, comprendre ses feedbacks 360° et ses évaluations.
Tu fournis des conseils concrets basés sur les données de performance disponibles.
Contexte collaborateur : ${JSON.stringify(contextData)}`,

    manager: `${base}
Ton rôle : assistant manager RH.
Tu aides le manager à interpréter les données de son équipe, préparer les entretiens 1:1,
détecter les risques et prendre de meilleures décisions RH.
Tu es factuel, pragmatique et discret sur les données individuelles.
Contexte équipe : ${JSON.stringify(contextData)}`,

    coach: `${base}
Ton rôle : coach personnel de performance.
Tu analyses les journaux PULSE, les scores NITA et l'historique de performance pour fournir
des insights personnalisés sur la semaine écoulée.
Contexte : ${JSON.stringify(contextData)}`,

    pdi: `${base}
Ton rôle : expert en développement des compétences.
Tu génères des suggestions d'actions de développement concrètes et réalisables
basées sur les évaluations et les feedbacks reçus.
Contexte : ${JSON.stringify(contextData)}`,
  }

  return contexts[contextType] ?? base
}

// ─── Handler principal ────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { context_type, messages, context_data = {} } = await req.json()

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'messages[] requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY non configuré dans Supabase Secrets' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = buildSystemPrompt(context_type ?? 'coach', context_data)

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'x-api-key'        : apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model     : 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system    : systemPrompt,
        messages  : messages.slice(-10), // max 10 messages d'historique
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[generate-ai-response] Claude API error:', errText)
      return new Response(JSON.stringify({ error: `Erreur Claude API: ${claudeRes.status}` }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const reply      = claudeData.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ reply, tokens_used: claudeData.usage?.output_tokens }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-ai-response]', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur interne' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
