// @ts-nocheck
// ============================================================
// APEX RH — supabase/functions/send-push-notification/index.ts
// Session 56 — Envoi notifications Web Push (VAPID)
// Appelée par triggers DB ou autres Edge Functions
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@apex-rh.fr'

// ─── UTILITAIRES VAPID / ECDH ─────────────────────────────────

/** Encode une chaîne en base64url */
function base64UrlEncode(data) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Decode base64url → Uint8Array */
function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - str.length % 4) % 4)
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

/** Crée le header d'autorisation VAPID */
async function createVapidAuthHeader(endpoint, vapidPublicKey, vapidPrivateKey, subject) {
  const url   = new URL(endpoint)
  const aud   = `${url.protocol}//${url.host}`
  const exp   = Math.floor(Date.now() / 1000) + 43200 // 12h

  // Header JWT
  const headerB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  )
  // Payload JWT
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ aud, exp, sub: subject }))
  )

  const sigInput = `${headerB64}.${payloadB64}`

  // Import de la clé privée VAPID (format raw base64url)
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey)
  const keyPair = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair,
    new TextEncoder().encode(sigInput)
  )

  const sigB64 = base64UrlEncode(signature)
  const jwt = `${sigInput}.${sigB64}`

  return `vapid t=${jwt}, k=${vapidPublicKey}`
}

/** Chiffre le payload pour Web Push (RFC 8291) */
async function encryptPayload(payload, p256dh, auth) {
  const recipientPublicKey = base64UrlDecode(p256dh)
  const authSecret         = base64UrlDecode(auth)

  // Génère une clé éphémère
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
  const senderPublicKeyRaw = await crypto.subtle.exportKey('raw', senderKeyPair.publicKey)

  // Import de la clé publique du destinataire
  const recipientKey = await crypto.subtle.importKey(
    'raw',
    recipientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientKey },
    senderKeyPair.privateKey,
    256
  )

  // Salt aléatoire
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF pour dériver la clé de chiffrement (simplifié)
  const hkdfKey = await crypto.subtle.importKey(
    'raw', sharedBits, { name: 'HKDF' }, false, ['deriveBits']
  )

  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    hkdfKey,
    256
  )

  const encKey = await crypto.subtle.importKey(
    'raw', ikm, { name: 'AES-GCM' }, false, ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const payloadBytes = new TextEncoder().encode(
    typeof payload === 'string' ? payload : JSON.stringify(payload)
  )

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encKey,
    payloadBytes
  )

  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    senderPublicKey: new Uint8Array(senderPublicKeyRaw),
    iv,
  }
}

// ─── ENVOI D'UNE NOTIFICATION PUSH ───────────────────────────
async function sendPushNotification({ endpoint, p256dh, auth, payload }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[APEX] VAPID keys not configured — skipping push')
    return { ok: false, reason: 'vapid_not_configured' }
  }

  const authHeader = await createVapidAuthHeader(
    endpoint, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
  )

  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload)

  const response = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/octet-stream',
      'Authorization':   authHeader,
      'TTL':             '86400',
      'Urgency':         payload?.urgency || 'normal',
    },
    body: new TextEncoder().encode(payloadStr),
  })

  return {
    ok:     response.status === 201 || response.status === 200,
    status: response.status,
    expired: response.status === 410 || response.status === 404,
  }
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const body     = await req.json()

    const {
      user_id,          // UUID utilisateur cible (ou)
      user_ids,         // tableau UUID utilisateurs cibles
      notification_id,  // ID notif DB (optionnel)
      title,
      body: msgBody,
      url      = '/',
      type     = 'system',
      urgency  = 'normal',
      actions  = [],
    } = body

    if (!user_id && (!user_ids || user_ids.length === 0)) {
      return new Response(JSON.stringify({ error: 'user_id or user_ids required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetIds = user_ids || [user_id]

    // Récupérer les subscriptions actives
    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .in('user_id', targetIds)
      .eq('is_active', true)

    if (subsErr) throw subsErr

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active subscriptions' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = { title, body: msgBody, url, type, urgency, actions }
    const results = []
    const expiredIds = []

    for (const sub of subs) {
      const result = await sendPushNotification({
        endpoint: sub.endpoint,
        p256dh:   sub.p256dh,
        auth:     sub.auth,
        payload,
      })

      results.push({ subscription_id: sub.id, ...result })

      // Log dans push_notification_logs
      await supabase.from('push_notification_logs').insert({
        user_id:         sub.user_id,
        organization_id: sub.organization_id,
        notification_id: notification_id || null,
        subscription_id: sub.id,
        status:          result.ok ? 'sent' : (result.expired ? 'expired' : 'failed'),
        sent_at:         result.ok ? new Date().toISOString() : null,
      })

      // Marquer les subscriptions expirées
      if (result.expired) {
        expiredIds.push(sub.id)
        // Mettre à jour last_used_at pour les succès
        await supabase.from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id)
      } else if (result.ok) {
        await supabase.from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
      }
    }

    const sentCount = results.filter(r => r.ok).length

    return new Response(
      JSON.stringify({ sent: sentCount, total: subs.length, expired: expiredIds.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[APEX] send-push-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
