// ============================================================
// APEX RH — supabase/functions/test-integration-webhook/index.ts
// Session 35 — Test d'un webhook d'intégration tierce
// Envoie un message de test formaté selon le type (Slack, Teams, Zapier)
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── MESSAGE SLACK (Block Kit) ───────────────────────────────
function buildSlackPayload(isTest = true) {
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: isTest ? '🔔 APEX RH — Test de connexion' : '🔔 APEX RH — Notification',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: isTest
            ? '✅ Votre intégration Slack avec *APEX RH* fonctionne correctement.\nVous recevrez ici les notifications importantes de la plateforme.'
            : 'Nouvelle notification depuis APEX RH.',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*APEX RH* · NITA Transfert d'Argent · ${new Date().toLocaleDateString('fr-FR')}`,
          },
        ],
      },
    ],
  }
}

// ─── MESSAGE TEAMS (Adaptive Card) ──────────────────────────
function buildTeamsPayload(isTest = true) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type:    'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type:   'TextBlock',
              text:   isTest ? '🔔 APEX RH — Test de connexion' : '🔔 APEX RH — Notification',
              weight: 'Bolder',
              size:   'Medium',
              color:  'Accent',
            },
            {
              type: 'TextBlock',
              text: isTest
                ? "✅ Votre intégration Microsoft Teams avec APEX RH fonctionne correctement. Vous recevrez ici les notifications importantes."
                : "Nouvelle notification depuis APEX RH.",
              wrap: true,
            },
            {
              type: 'ColumnSet',
              columns: [
                {
                  type:  'Column',
                  width: 'auto',
                  items: [
                    {
                      type:  'TextBlock',
                      text:  `APEX RH · NITA · ${new Date().toLocaleDateString('fr-FR')}`,
                      size:  'Small',
                      color: 'Light',
                    },
                  ],
                },
              ],
            },
          ],
          actions: [
            {
              type:  'Action.OpenUrl',
              title: 'Ouvrir APEX RH',
              url:   Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app',
            },
          ],
        },
      },
    ],
  }
}

// ─── MESSAGE ZAPIER (JSON générique) ────────────────────────
function buildZapierPayload() {
  return {
    source:     'APEX RH',
    company:    'NITA Transfert d\'Argent',
    event_type: 'test',
    event_label:'Test de connexion',
    message:    'APEX RH est connecté à votre Zap. Les événements seront transmis ici.',
    timestamp:  new Date().toISOString(),
    app_url:    Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  try {
    const { webhook_id, type, webhook_url } = await req.json()

    if (!webhook_url || !type) {
      return new Response(JSON.stringify({ success: false, error: 'webhook_url et type requis' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // Construire le payload selon le type
    let payload: object
    if (type === 'slack') {
      payload = buildSlackPayload(true)
    } else if (type === 'teams') {
      payload = buildTeamsPayload(true)
    } else {
      payload = buildZapierPayload()
    }

    // Envoyer au webhook
    const response = await fetch(webhook_url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const success = response.ok
    const httpStatus = response.status

    // Logger dans integration_logs si webhook_id fourni
    if (webhook_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('integration_logs').insert({
        webhook_id,
        event_type:   'test',
        payload,
        success,
        http_status:  httpStatus,
        error_message: success ? null : `HTTP ${httpStatus}`,
      })
    }

    return new Response(
      JSON.stringify({ success, http_status: httpStatus }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[test-integration-webhook]', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
