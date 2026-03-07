// @ts-nocheck
// ============================================================
// APEX RH — supabase/functions/ai-cv-parser/index.ts
// Session 63 — Parsing IA automatique des CVs
// Reçoit : { cv_parse_result_id }
// Flow   : Storage → base64 → Claude API (document PDF) → JSON → upsert
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL             = 'claude-sonnet-4-20250514'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Prompt système ───────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un expert en analyse de CV et de profils professionnels.
Tu reçois un document CV (PDF ou texte) et tu dois en extraire toutes les informations structurées.
Tu DOIS répondre UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.
Ne mets pas de backticks ni de markdown. Retourne le JSON brut directement.

Structure JSON attendue :
{
  "full_name": "Prénom Nom ou null",
  "email": "email@example.com ou null",
  "phone": "+33 6 xx xx xx xx ou null",
  "location": "Ville, Pays ou null",
  "linkedin_url": "https://linkedin.com/in/... ou null",
  "summary": "Résumé professionnel en 2-4 phrases ou null",
  "total_experience_years": 5,
  "skills": ["Compétence1", "Compétence2"],
  "languages": [
    { "language": "Français", "level": "Natif" },
    { "language": "Anglais", "level": "Courant" }
  ],
  "experience": [
    {
      "title": "Intitulé du poste",
      "company": "Nom de l'entreprise",
      "location": "Ville ou null",
      "start_date": "YYYY-MM ou YYYY",
      "end_date": "YYYY-MM ou YYYY ou null si poste actuel",
      "is_current": false,
      "description": "Description du rôle en 1-3 phrases",
      "technologies": ["Tech1", "Tech2"]
    }
  ],
  "education": [
    {
      "degree": "Intitulé du diplôme",
      "institution": "Nom de l'établissement",
      "field": "Domaine d'étude",
      "year_start": "YYYY ou null",
      "year_end": "YYYY ou null"
    }
  ],
  "certifications": [
    {
      "name": "Nom de la certification",
      "issuer": "Organisme émetteur",
      "year": "YYYY ou null"
    }
  ]
}

Règles :
- Si une information est absente, utilise null (pas de chaîne vide).
- total_experience_years : calcule la durée totale d'expérience professionnelle en années (entier).
- skills : liste toutes les compétences techniques ET transversales mentionnées.
- Pour les dates, préfère le format YYYY-MM si disponible, sinon YYYY.
- Si le CV est incomplet ou illisible, extrait ce qui est disponible sans inventer.`

// ─── Helper : télécharger fichier Storage → base64 ────────────
async function downloadFileAsBase64(supabase, filePath) {
  const { data, error } = await supabase.storage
    .from('cv-uploads')
    .download(filePath)

  if (error) throw new Error(`Storage download error: ${error.message}`)

  const arrayBuffer = await data.arrayBuffer()
  const bytes       = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ─── Helper : détecter media_type ─────────────────────────────
function getMediaType(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')  return 'application/pdf'
  // Pour DOCX/DOC on fallback en text/plain car Claude ne supporte pas DOCX nativement
  return 'application/pdf'
}

// ─── Helper : appeler Claude API ──────────────────────────────
async function parseWithClaude(base64Data, mediaType, apiKey) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method : 'POST',
    headers: {
      'Content-Type'     : 'application/json',
      'x-api-key'        : apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model     : MODEL,
      max_tokens: 2000,
      system    : SYSTEM_PROMPT,
      messages  : [
        {
          role   : 'user',
          content: [
            {
              type  : 'document',
              source: {
                type      : 'base64',
                media_type: mediaType,
                data      : base64Data,
              },
            },
            {
              type: 'text',
              text: 'Analyse ce CV et retourne les données structurées en JSON selon le format demandé.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const rawText = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  // Nettoyage des éventuels backticks Markdown
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/,      '')
    .replace(/\s*```$/,      '')
    .trim()

  let parsedData
  try {
    parsedData = JSON.parse(cleaned)
  } catch {
    throw new Error(`JSON parse error — réponse Claude invalide: ${cleaned.slice(0, 200)}`)
  }

  return {
    parsedData,
    tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
  }
}

// ─── Handler principal ────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { cv_parse_result_id } = await req.json()
    if (!cv_parse_result_id) {
      return new Response(
        JSON.stringify({ error: 'cv_parse_result_id requis' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Init Supabase admin ──────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    const supabase = createClient(supabaseUrl, serviceKey)

    // ── Récupérer l'enregistrement ───────────────────────────
    const { data: record, error: fetchErr } = await supabase
      .from('cv_parse_results')
      .select('*')
      .eq('id', cv_parse_result_id)
      .single()

    if (fetchErr || !record) {
      return new Response(
        JSON.stringify({ error: 'cv_parse_result introuvable' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Marquer comme "en cours" ─────────────────────────────
    await supabase
      .from('cv_parse_results')
      .update({ parsing_status: 'processing' })
      .eq('id', cv_parse_result_id)

    // ── Télécharger le fichier ───────────────────────────────
    const base64Data = await downloadFileAsBase64(supabase, record.file_path)
    const mediaType  = getMediaType(record.file_name)

    // ── Appel Claude API ─────────────────────────────────────
    const { parsedData, tokensUsed } = await parseWithClaude(base64Data, mediaType, anthropicKey)

    // ── Mettre à jour l'enregistrement avec les données extraites
    const { error: updateErr } = await supabase
      .from('cv_parse_results')
      .update({
        parsing_status: 'completed',
        parsed_data   : parsedData,
        tokens_used   : tokensUsed,
        error_message : null,
      })
      .eq('id', cv_parse_result_id)

    if (updateErr) throw new Error(`Update error: ${updateErr.message}`)

    // ── Si lié à une candidature : enrichir candidate_name/email ──
    if (record.job_application_id && parsedData.full_name) {
      const updates = {}
      if (parsedData.full_name) updates.candidate_name = parsedData.full_name
      if (parsedData.email)     updates.candidate_email = parsedData.email
      if (parsedData.phone)     updates.candidate_phone = parsedData.phone

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('job_applications')
          .update(updates)
          .eq('id', record.job_application_id)
          // Ne pas throw si échec — non bloquant
      }
    }

    return new Response(
      JSON.stringify({
        success     : true,
        parsed_data : parsedData,
        tokens_used : tokensUsed,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[ai-cv-parser] Erreur:', err)

    // Tenter de marquer l'enregistrement comme "failed"
    try {
      const { cv_parse_result_id } = await req.clone().json().catch(() => ({}))
      if (cv_parse_result_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL'),
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        )
        await supabase
          .from('cv_parse_results')
          .update({
            parsing_status: 'failed',
            error_message : err.message?.slice(0, 500) ?? 'Erreur inconnue',
          })
          .eq('id', cv_parse_result_id)
      }
    } catch { /* silencieux */ }

    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur interne' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
