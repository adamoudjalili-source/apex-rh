// ============================================================
// APEX RH — supabase/functions/apex-webhooks/index.ts
// Session 53 — Moteur de dispatch Webhooks sortants
// Reçoit : { event_type, org_id, payload }
// Livre  : POST signé HMAC-SHA256 vers endpoint(s) configuré(s)
// ============================================================
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type'                : 'application/json',
}

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─── Types ───────────────────────────────────────────────────
interface WebhookEvent {
  event_type : string
  org_id     : string
  payload    : Record<string, unknown>
  timestamp  : string
}

interface WebhookEndpoint {
  id             : string
  url            : string
  secret_prefix  : string
  events         : string[]
  headers        : Record<string, string>
  retry_count    : number
  timeout_seconds: number
}

// ─── Signature HMAC-SHA256 (crypto.subtle natif Deno) ────────
// Format identique à Stripe : "t=<timestamp>,v1=<signature>"
async function signPayload(secret: string, payload: string, timestamp: string): Promise<string> {
  const encoder     = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `t=${timestamp},v1=${hex}`
}

// ─── Récupération secret réel ─────────────────────────────────
async function getWebhookSecret(webhookId: string): Promise<string | null> {
  try {
    const secret = Deno.env.get(`WEBHOOK_SECRET_${webhookId.replace(/-/g, '_').toUpperCase()}`)
    return secret ?? null
  } catch {
    return null
  }
}

// ─── Livraison HTTP ───────────────────────────────────────────
async function deliverWebhook(
  endpoint  : WebhookEndpoint,
  event     : WebhookEvent,
  attempt   : number
): Promise<{ success: boolean; status: number; error?: string; ms: number }> {
  const start     = Date.now()
  const payload   = JSON.stringify(event)
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const secret    = await getWebhookSecret(endpoint.id)
  const signature = secret
    ? await signPayload(secret, payload, timestamp)
    : `t=${timestamp},v1=unsigned`

  const headers: Record<string, string> = {
    'Content-Type'          : 'application/json',
    'X-Apex-Signature-256'  : signature,
    'X-Apex-Event'          : event.event_type,
    'X-Apex-Delivery'       : crypto.randomUUID(),
    'X-Apex-Attempt'        : attempt.toString(),
    'User-Agent'            : 'APEX-RH-Webhooks/1.0',
    ...endpoint.headers,
  }

  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), endpoint.timeout_seconds * 1000)

    const response = await fetch(endpoint.url, {
      method  : 'POST',
      headers,
      body    : payload,
      signal  : controller.signal,
    })
    clearTimeout(timeout)

    return { success: response.ok, status: response.status, ms: Date.now() - start }
  } catch (err) {
    return {
      success : false,
      status  : 0,
      error   : err instanceof Error ? err.message : 'Network error',
      ms      : Date.now() - start,
    }
  }
}

// ─── Handler principal ────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: CORS })

  const authHeader = req.headers.get('authorization') ?? ''
  const token      = authHeader.replace('Bearer ', '')
  if (token !== SUPABASE_SERVICE) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  let body: WebhookEvent
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS })
  }

  const { event_type, org_id, payload } = body
  if (!event_type || !org_id || !payload) {
    return new Response(JSON.stringify({ error: 'Missing event_type, org_id or payload' }), { status: 400, headers: CORS })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const { data: endpoints, error: endpErr } = await db
    .from('webhook_endpoints')
    .select('id, url, secret_prefix, events, headers, retry_count, timeout_seconds')
    .eq('organization_id', org_id)
    .eq('is_active', true)
    .contains('events', [event_type])

  if (endpErr) {
    return new Response(JSON.stringify({ error: 'DB error fetching endpoints' }), { status: 500, headers: CORS })
  }

  if (!endpoints?.length) {
    return new Response(JSON.stringify({ delivered: 0, message: 'No active endpoints for this event' }), { status: 200, headers: CORS })
  }

  const event: WebhookEvent = {
    event_type,
    org_id,
    payload,
    timestamp: new Date().toISOString(),
  }

  const results = await Promise.all(
    endpoints.map(async (ep: WebhookEndpoint) => {
      let lastResult = { success: false, status: 0, error: 'Not attempted', ms: 0 }
      const maxAttempts = ep.retry_count + 1

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        lastResult = await deliverWebhook(ep, event, attempt)
        if (lastResult.success) break
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
        }
      }

      await db.from('webhook_delivery_logs').insert({
        webhook_id      : ep.id,
        organization_id : org_id,
        event_type,
        payload_preview : JSON.stringify(payload).substring(0, 500),
        http_status     : lastResult.status || null,
        attempt         : ep.retry_count + 1,
        response_time_ms: lastResult.ms,
        error_message   : lastResult.error ?? null,
        delivered_at    : lastResult.success ? new Date().toISOString() : null,
        next_retry_at   : null,
      })

      if (lastResult.success) {
        await db.from('webhook_endpoints')
          .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
          .eq('id', ep.id)
      } else {
        await db.from('webhook_endpoints')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', ep.id)
      }

      return {
        endpoint_id : ep.id,
        url         : ep.url,
        success     : lastResult.success,
        status      : lastResult.status,
        ms          : lastResult.ms,
      }
    })
  )

  const delivered = results.filter(r => r.success).length

  return new Response(JSON.stringify({
    event_type,
    delivered,
    total  : results.length,
    results,
  }), { status: 200, headers: CORS })
})