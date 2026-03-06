import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nita-signature, x-nita-timestamp',
}

async function verifySignature(body, signature, secret) {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = hexToBytes(signature.replace('sha256=', ''))
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
  } catch { return false }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return bytes
}

function computeNitaScores(nbTxn, avgTimeS, errorCount, totalTxn, isPeakDay, shiftHours, complexity, benchTxn, benchTimeS, benchError) {
  const errorRate = totalTxn > 0 ? errorCount / totalTxn : 0
  const resilience = Math.max(Math.round(Math.min((nbTxn / Math.max(benchTxn, 1)) * 100 * (isPeakDay ? 1.2 : 1.0), 100)), 0)
  const reliability = Math.max(Math.round(100 - Math.min(((errorRate * complexity) / Math.max(benchError * complexity, 0.001)) * 100, 100)), 0)
  const endurance = Math.max(Math.round(Math.min((benchTimeS / Math.max(avgTimeS, 1)) * 100 * (shiftHours > 9 ? 0.92 : 1.0), 100)), 0)
  return { resilience_score: resilience, reliability_score: reliability, endurance_score: endurance }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const webhookSecret = Deno.env.get('NITA_WEBHOOK_SECRET') || ''
  const benchTxn = parseInt(Deno.env.get('NITA_BENCH_TXN') || '150')
  const benchTimeS = parseFloat(Deno.env.get('NITA_BENCH_TIME_S') || '45')
  const benchError = parseFloat(Deno.env.get('NITA_BENCH_ERROR') || '0.02')

  const rawBody = await req.text()

  if (webhookSecret) {
    const sig = req.headers.get('x-nita-signature') || ''
    const valid = await verifySignature(rawBody, sig, webhookSecret)
    if (!valid) {
      await supabase.from('nita_webhook_logs').insert({ event_type: 'invalid_signature', status: 'rejected', error_msg: 'Invalid HMAC-SHA256 signature', raw_payload: rawBody.slice(0, 500) })
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { event, agent_email, date, data } = payload
  if (!['activity.updated', 'activity.daily_close', 'activity.correction'].includes(event))
    return new Response(JSON.stringify({ skipped: true, reason: 'Unknown event' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (!agent_email || !date || !data)
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { data: user, error: userErr } = await supabase.from('users').select('id').eq('email', agent_email).single()
  if (userErr || !user) {
    await supabase.from('nita_webhook_logs').insert({ event_type: event, agent_email, date, status: 'error', error_msg: 'Agent not found' })
    return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const nbTxn = data.transactions_count ?? 0
  const avgTimeS = data.avg_processing_time ?? 45
  const errorCount = data.error_count ?? 0
  const isPeak = data.is_peak_day ?? false
  const shiftH = data.shift_duration_hours ?? 8
  const complexity = data.complexity_index ?? 1.0
  const scores = computeNitaScores(nbTxn, avgTimeS, errorCount, nbTxn, isPeak, shiftH, complexity, benchTxn, benchTimeS, benchError)

  const { error: upsertErr } = await supabase.from('agent_activity_logs').upsert({
    user_id: user.id, date,
    nb_transactions: nbTxn, avg_processing_time_s: avgTimeS,
    error_rate: nbTxn > 0 ? errorCount / nbTxn : 0,
    amount_processed: data.total_amount_fcfa ?? 0,
    is_peak_day: isPeak, shift_duration_hours: shiftH, transaction_complexity: complexity,
    ...scores, synced_at: new Date().toISOString(), source: 'webhook_nita',
  }, { onConflict: 'user_id,date' })

  await supabase.from('nita_webhook_logs').insert({ event_type: event, agent_email, date, status: upsertErr ? 'error' : 'success', error_msg: upsertErr?.message ?? null })

  if (upsertErr) return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  return new Response(JSON.stringify({ ok: true, agent: agent_email, date, scores }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
