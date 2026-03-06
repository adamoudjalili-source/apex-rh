// ============================================================
// APEX RH — Supabase Edge Function : send-notification-emails
// ✅ Session 12 — Envoi des emails depuis email_queue
// 
// DÉPLOIEMENT :
// 1. Installer Supabase CLI : npm install -g supabase
// 2. Créer un compte Resend (resend.com) et obtenir une API key
// 3. Configurer le secret :
//    supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
// 4. Déployer :
//    supabase functions deploy send-notification-emails
// 5. Programmer un appel via un cron (pg_cron) toutes les 5 min :
//    SELECT cron.schedule('send-emails', '*/5 * * * *',
//      $$ SELECT net.http_post(
//        url := '<SUPABASE_URL>/functions/v1/send-notification-emails',
//        headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//      ); $$
//    );
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FROM_EMAIL = 'APEX RH <notifications@votre-domaine.com>' // À personnaliser
const MAX_BATCH = 10
const MAX_ATTEMPTS = 3

Deno.serve(async (req) => {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Récupérer les emails en attente
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH)

    if (fetchError) throw fetchError
    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No emails to send' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let failed = 0

    for (const email of emails) {
      try {
        // Envoyer via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email.to_email],
            subject: email.subject,
            html: email.body_html,
          }),
        })

        if (resendResponse.ok) {
          // Marquer comme envoyé
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: email.attempts + 1,
            })
            .eq('id', email.id)
          sent++
        } else {
          const errorBody = await resendResponse.text()
          throw new Error(`Resend error: ${resendResponse.status} - ${errorBody}`)
        }
      } catch (sendError) {
        // Marquer comme échoué (réessai au prochain cycle si < MAX_ATTEMPTS)
        const newAttempts = email.attempts + 1
        await supabase
          .from('email_queue')
          .update({
            status: newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
            attempts: newAttempts,
            last_error: sendError.message,
          })
          .eq('id', email.id)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: emails.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
