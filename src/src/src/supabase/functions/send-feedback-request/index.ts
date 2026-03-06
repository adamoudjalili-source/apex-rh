// ============================================================
// APEX RH — supabase/functions/send-feedback-request/index.ts
// Session 28 — Notification email lors d'une demande de feedback
// Modèle : send-award-notification (Session 27)
// Peut être appelée :
//   - directement depuis le hook useCreateCampaign (après création)
//   - manuellement depuis les Settings pour tester
// Body attendu : { request_ids?: string[] } ou vide (→ toutes les nouvelles)
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resendClient.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app'

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  self:    'Auto-évaluation',
  peer:    'Feedback pair',
  manager: 'Feedback manager',
}

// ─── TEMPLATE EMAIL ──────────────────────────────────────────

function feedbackRequestTemplate(data: {
  firstName: string
  evaluatedName: string
  feedbackType: string
  campaignTitle: string
  endDate: string
}): { subject: string; html: string } {
  const subject = `📝 ${data.firstName}, vous avez un feedback à remplir — ${data.campaignTitle}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback à remplir — APEX RH</title>
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:580px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header gradient -->
    <div style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%); padding:32px 32px 28px;">
      <div style="color:rgba(255,255,255,0.7); font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px;">
        APEX RH — NITA
      </div>
      <div style="font-size:28px; margin-bottom:12px;">📝</div>
      <h1 style="color:#fff; font-size:22px; font-weight:700; margin:0; line-height:1.3;">
        Bonjour ${data.firstName},<br/>vous avez un feedback à remplir !
      </h1>
    </div>

    <!-- Contenu -->
    <div style="padding:32px;">

      <!-- Carte feedback -->
      <div style="background:#f8f7ff; border:2px solid #e0d9ff; border-radius:12px; padding:20px 24px; margin-bottom:24px;">
        <p style="color:#6366f1; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px;">
          Demande de feedback
        </p>
        <p style="color:#1e293b; font-size:16px; font-weight:700; margin:0 0 6px;">
          ${data.evaluatedName}
        </p>
        <p style="color:#64748b; font-size:14px; margin:0 0 4px;">
          Type : <strong>${data.feedbackType}</strong>
        </p>
        <p style="color:#64748b; font-size:14px; margin:0;">
          Campagne : <strong>${data.campaignTitle}</strong>
        </p>
      </div>

      <!-- Délai -->
      <div style="background:#fef9c3; border:1px solid #fde047; border-radius:10px; padding:14px 18px; margin-bottom:24px;">
        <p style="color:#854d0e; font-size:13px; font-weight:600; margin:0;">
          ⏰ À remplir avant le : <strong>${data.endDate}</strong>
        </p>
      </div>

      <!-- Instructions -->
      <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 20px;">
        Votre évaluation porte sur <strong>5 compétences</strong> notées de 0 à 10 
        (qualité du travail, respect des délais, communication, esprit d'équipe, initiative), 
        avec possibilité d'ajouter un commentaire libre.
      </p>

      <!-- CTA -->
      <div style="text-align:center; margin:28px 0;">
        <a href="${APP_URL}/tasks?tab=feedback360"
          style="display:inline-block; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:#fff; text-decoration:none; font-size:15px; font-weight:700; padding:14px 32px; border-radius:12px; letter-spacing:0.3px;">
          Remplir mon feedback →
        </a>
      </div>

      <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />

      <p style="color:#94a3b8; font-size:13px; line-height:1.6; text-align:center; margin:0;">
        Cordialement,<br/>
        <strong style="color:#64748b;">L'équipe APEX RH — NITA</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return { subject, html }
}

// ─── HANDLER ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: { request_ids?: string[] } = {}
  try {
    body = await req.json()
  } catch {
    // body vide → traiter toutes les nouvelles demandes
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const todayStr = new Date().toISOString().split('T')[0]
  let sent = 0
  let skipped = 0

  try {
    let requestsToNotify: any[] = []

    if (body.request_ids && body.request_ids.length > 0) {
      // Mode direct : des demandes spécifiques
      const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
          id, type, status,
          evaluator:users!feedback_requests_evaluator_id_fkey(id, first_name, last_name, email, is_active),
          evaluated:users!feedback_requests_evaluated_id_fkey(id, first_name, last_name),
          campaign:feedback_campaigns(id, title, end_date)
        `)
        .in('id', body.request_ids)
        .eq('status', 'pending')

      if (error) throw error
      requestsToNotify = data ?? []
    } else {
      // Mode batch : demandes créées aujourd'hui non encore notifiées
      const { data: recentRequests, error } = await supabase
        .from('feedback_requests')
        .select(`
          id, type, status, created_at,
          evaluator:users!feedback_requests_evaluator_id_fkey(id, first_name, last_name, email, is_active),
          evaluated:users!feedback_requests_evaluated_id_fkey(id, first_name, last_name),
          campaign:feedback_campaigns(id, title, end_date)
        `)
        .eq('status', 'pending')
        .gte('created_at', `${todayStr}T00:00:00Z`)

      if (error) throw error

      if (recentRequests && recentRequests.length > 0) {
        // Filtrer ceux déjà notifiés
        const reqIds = recentRequests.map((r: any) => r.id)
        const { data: existingLogs } = await supabase
          .from('notification_logs')
          .select('metadata')
          .eq('notification_type', 'feedback_request')
          .eq('date_ref', todayStr)

        const notifiedIds = new Set(
          (existingLogs ?? []).map((l: any) => l.metadata?.request_id)
        )
        requestsToNotify = recentRequests.filter((r: any) => !notifiedIds.has(r.id))
      }
    }

    // Envoyer les emails
    for (const req of requestsToNotify) {
      const evaluator = req.evaluator
      if (!evaluator?.is_active || !evaluator?.email) {
        skipped++
        continue
      }

      // Vérifier préférences notifications de l'utilisateur
      const { data: userSettings } = await supabase
        .from('notification_settings')
        .select('notif_award_enabled')
        .eq('user_id', evaluator.id)
        .maybeSingle()

      // On réutilise notif_award_enabled comme proxy général pour les notifs PULSE
      // (en attendant un champ dédié feedback_notif_enabled en Session 29)
      if (userSettings?.notif_award_enabled === false) {
        console.log(`[feedback-request] User ${evaluator.id} a désactivé les notifications`)
        skipped++
        continue
      }

      const endDateFormatted = req.campaign?.end_date
        ? new Date(req.campaign.end_date).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
          })
        : '—'

      const { subject, html } = feedbackRequestTemplate({
        firstName:     evaluator.first_name,
        evaluatedName: `${req.evaluated?.first_name} ${req.evaluated?.last_name}`,
        feedbackType:  FEEDBACK_TYPE_LABELS[req.type] ?? req.type,
        campaignTitle: req.campaign?.title ?? 'Campagne feedback',
        endDate:       endDateFormatted,
      })

      const result = await sendEmail({ to: evaluator.email, subject, html })

      if (result.success) {
        await supabase.from('notification_logs').insert({
          user_id:           evaluator.id,
          notification_type: 'feedback_request',
          date_ref:          todayStr,
          metadata: {
            request_id:    req.id,
            campaign_id:   req.campaign?.id,
            evaluated_id:  req.evaluated?.id,
            feedback_type: req.type,
            resend_id:     result.id,
          },
        })
        sent++
        console.log(`[feedback-request] Email envoyé à ${evaluator.email} pour évaluer ${req.evaluated?.first_name}`)
      } else {
        console.error(`[feedback-request] Échec ${evaluator.email}:`, result.error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[feedback-request] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
