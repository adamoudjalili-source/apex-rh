// ============================================================
// APEX RH — supabase/functions/send-integration-event/index.ts
// Session 35 — Dispatcher d'événements vers Slack, Teams, Zapier
// Appelée par les autres Edge Functions (award, review_cycle, etc.)
// ou directement depuis l'UI pour déclencher un événement
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app'

// ─── FORMATTERS SLACK ────────────────────────────────────────

function slackAward(event: Record<string, unknown>) {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `🏆 Award attribué — ${event.award_label}`, emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Lauréat(e)*\n${event.user_name}` },
          { type: 'mrkdwn', text: `*Service*\n${event.service ?? '—'}` },
          { type: 'mrkdwn', text: `*Award*\n${event.award_label}` },
          { type: 'mrkdwn', text: `*Mois*\n${event.month_label}` },
        ],
      },
      event.manager_note ? {
        type: 'section',
        text: { type: 'mrkdwn', text: `> 💬 _${event.manager_note}_` },
      } : null,
      { type: 'context', elements: [{ type: 'mrkdwn', text: `APEX RH · NITA · <${APP_URL}|Voir la plateforme>` }] },
    ].filter(Boolean),
  }
}

function slackAlertManager(event: Record<string, unknown>) {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🚨 Alerte absence — Collaborateurs sans journal', emoji: true } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${event.count}* collaborateur(s) n'ont pas soumis leur journal depuis *${event.threshold_days}* jour(s).`,
        },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: (event.users as string[])?.slice(0, 5).map((u: string) => `• ${u}`).join('\n') ?? '' },
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `APEX RH · <${APP_URL}|Voir les alertes>` }] },
    ],
  }
}

function slackReviewCycle(event: Record<string, unknown>) {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `📋 Review Cycle activé — ${event.cycle_title}`, emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Période*\n${event.period_start} → ${event.period_end}` },
          { type: 'mrkdwn', text: `*Fréquence*\n${event.frequency}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '📝 Les collaborateurs peuvent maintenant soumettre leur auto-évaluation.' },
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `APEX RH · <${APP_URL}|Ouvrir APEX RH>` }] },
    ],
  }
}

function slackSurvey(event: Record<string, unknown>) {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `📊 Survey ouvert — ${event.survey_title}`, emoji: true } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Un nouveau survey d'engagement est disponible.\n*Date limite :* ${event.end_date ?? 'Non précisée'}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type:  'button',
            text:  { type: 'plain_text', text: 'Répondre au survey', emoji: true },
            url:   `${APP_URL}/tasks?tab=surveys`,
            style: 'primary',
          },
        ],
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `APEX RH · NITA` }] },
    ],
  }
}

// ─── FORMATTERS TEAMS (Adaptive Cards) ──────────────────────

function buildTeamsCard(title: string, body: string, url?: string) {
  const card: Record<string, unknown> = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type:    'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', color: 'Accent', wrap: true },
            { type: 'TextBlock', text: body, wrap: true },
            { type: 'TextBlock', text: `APEX RH · NITA · ${new Date().toLocaleDateString('fr-FR')}`, size: 'Small', color: 'Light' },
          ],
          actions: url ? [{ type: 'Action.OpenUrl', title: 'Ouvrir APEX RH', url }] : [],
        },
      },
    ],
  }
  return card
}

// ─── FORMATTERS ZAPIER (JSON générique) ─────────────────────

function buildZapierPayload(event_type: string, event: Record<string, unknown>) {
  return {
    source:     'APEX RH',
    company:    "NITA Transfert d'Argent",
    event_type,
    timestamp:  new Date().toISOString(),
    app_url:    APP_URL,
    data:       event,
  }
}

// ─── DISPATCHER ─────────────────────────────────────────────

async function sendToWebhook(
  webhook: { id: string; type: string; webhook_url: string },
  event_type: string,
  event: Record<string, unknown>
) {
  let payload: object

  if (webhook.type === 'slack') {
    switch (event_type) {
      case 'award':         payload = slackAward(event);         break
      case 'alert_manager': payload = slackAlertManager(event);  break
      case 'review_cycle':  payload = slackReviewCycle(event);   break
      case 'survey':        payload = slackSurvey(event);        break
      default:
        payload = { text: `APEX RH — Événement : ${event_type}` }
    }
  } else if (webhook.type === 'teams') {
    const titles: Record<string, string> = {
      award:          `🏆 Award attribué — ${event.award_label ?? ''}`,
      alert_manager:  '🚨 Alerte absence collaborateurs',
      review_cycle:   `📋 Review Cycle activé — ${event.cycle_title ?? ''}`,
      survey:         `📊 Survey ouvert — ${event.survey_title ?? ''}`,
    }
    const bodies: Record<string, string> = {
      award:         `${event.user_name} a reçu l'award "${event.award_label}" pour ${event.month_label}.`,
      alert_manager: `${event.count} collaborateur(s) sans journal depuis ${event.threshold_days} jours.`,
      review_cycle:  `Période : ${event.period_start} → ${event.period_end}. Les auto-évaluations sont ouvertes.`,
      survey:        `Un nouveau survey est disponible. Date limite : ${event.end_date ?? 'non précisée'}.`,
    }
    payload = buildTeamsCard(
      titles[event_type]  ?? `APEX RH — ${event_type}`,
      bodies[event_type]  ?? JSON.stringify(event),
      APP_URL
    )
  } else {
    payload = buildZapierPayload(event_type, event)
  }

  let success = false
  let httpStatus = 0
  let errorMessage: string | null = null

  try {
    const res = await fetch(webhook.webhook_url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    success    = res.ok
    httpStatus = res.status
    if (!res.ok) errorMessage = `HTTP ${res.status}`
  } catch (err) {
    errorMessage = String(err)
  }

  return { success, httpStatus, errorMessage, payload }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { event_type, event_data } = body as {
      event_type: string
      event_data: Record<string, unknown>
    }

    if (!event_type) {
      return new Response(JSON.stringify({ error: 'event_type requis' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Récupérer tous les webhooks actifs qui écoutent cet événement
    const { data: webhooks, error } = await supabase
      .from('integration_webhooks')
      .select('id, type, webhook_url, triggers')
      .eq('is_active', true)

    if (error) throw error

    const matching = (webhooks ?? []).filter(w => {
      const triggers = Array.isArray(w.triggers) ? w.triggers : []
      return triggers.includes(event_type)
    })

    const results = await Promise.all(
      matching.map(async w => {
        const { success, httpStatus, errorMessage, payload } = await sendToWebhook(w, event_type, event_data ?? {})

        // Logger
        await supabase.from('integration_logs').insert({
          webhook_id:    w.id,
          event_type,
          payload,
          success,
          http_status:   httpStatus,
          error_message: errorMessage,
        })

        return { webhook_id: w.id, type: w.type, success, httpStatus }
      })
    )

    return new Response(
      JSON.stringify({ sent: results.length, results }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[send-integration-event]', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
