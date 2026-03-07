// @ts-nocheck
// ============================================================
// APEX RH — supabase/functions/send-message-notification/index.ts
// Session S65 — Push notification pour nouveaux messages
// Appelée via pg_net ou invoke depuis le client après envoi
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { message_id, channel_id, author_id, content, org_id } = body

    if (!message_id || !channel_id) {
      return new Response(JSON.stringify({ error: 'message_id and channel_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

    // Récupérer les infos du canal
    const { data: channel } = await supabase
      .from('communication_channels')
      .select('name, members, is_private, org_id')
      .eq('id', channel_id)
      .single()

    if (!channel) {
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer l'auteur
    const { data: author } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', author_id)
      .single()

    const authorName = author
      ? `${author.first_name} ${author.last_name}`.trim()
      : 'Quelqu\'un'

    // Trouver les destinataires :
    // - Canal privé : membres uniquement
    // - Canal public : tous les membres de l'org sauf l'auteur
    let recipientsQuery = supabase
      .from('profiles')
      .select('id')
      .eq('org_id', channel.org_id || org_id)
      .neq('id', author_id)

    if (channel.is_private && channel.members?.length) {
      recipientsQuery = recipientsQuery.in('id', channel.members)
    }

    const { data: recipients } = await recipientsQuery

    if (!recipients?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer les push subscriptions des destinataires
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', recipients.map(r => r.id))

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, note: 'No push subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Préparer la notification
    const notification = {
      title: `#${channel.name} — ${authorName}`,
      body:  content.length > 100 ? content.slice(0, 97) + '…' : content,
      icon:  '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        type: 'new_message',
        channel_id,
        message_id,
        url: `/communication/messages`,
      },
      tag:   `msg-${channel_id}`,
      renotify: true,
    }

    // Appeler la fonction push existante pour chaque subscription
    let sent = 0
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const res = await supabase.functions.invoke('send-push-notification', {
          body: {
            subscription: sub.subscription_data,
            notification,
          },
        })
        if (!res.error) sent++
        return res
      })
    )

    // Logger les erreurs
    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length) {
      console.warn(`${failed.length} push notifications failed`)
    }

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('send-message-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
