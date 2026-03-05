// ============================================================
// APEX RH — supabase/functions/send-survey-invitation/index.ts
// Session 29 — Notification invitation survey d'engagement
// Body optionnel : { survey_id?: string } pour cibler un survey
// Sans body → tous les surveys actifs ouverts aujourd'hui non encore notifiés
// Idempotent via notification_logs
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resendClient.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://apex-rh-h372.vercel.app'

// ─── Template email survey ────────────────────────────────────

function surveyInvitationTemplate({
  firstName,
  surveyTitle,
  periodLabel,
  endDate,
  isAnonymous,
}: {
  firstName: string
  surveyTitle: string
  periodLabel: string
  endDate: string
  isAnonymous: boolean
}): { subject: string; html: string } {
  const subject = `📊 ${firstName}, votre avis compte — ${surveyTitle}`

  const endDateFormatted = new Date(endDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>APEX RH — Survey d'Engagement</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
    @media only screen and (max-width: 600px) { .container { width: 100% !important; padding: 0 16px !important; } }
  </style>
</head>
<body style="background-color:#f1f5f9; margin:0; padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius:16px 16px 0 0; padding: 32px 40px; text-align:center;">
              <div style="display:inline-flex; align-items:center; gap:10px;">
                <div style="width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:8px; display:inline-block; line-height:36px; text-align:center; font-size:18px;">⚡</div>
                <span style="color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.5px;">APEX RH</span>
              </div>
              <p style="color:rgba(255,255,255,0.65); font-size:12px; margin-top:6px; letter-spacing:1px; text-transform:uppercase;">NITA Transfert d'Argent</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff; padding: 40px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">

              <!-- Icon + Titre -->
              <div style="text-align:center; margin-bottom:28px;">
                <div style="width:64px; height:64px; background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); border-radius:16px; display:inline-flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px;">📊</div>
                <h1 style="font-size:22px; font-weight:700; color:#1e293b; letter-spacing:-0.5px; margin-bottom:8px;">
                  ${firstName}, votre avis nous importe !
                </h1>
                <p style="color:#64748b; font-size:15px; line-height:1.6;">
                  Un nouveau survey d'engagement est disponible pour vous.
                </p>
              </div>

              <!-- Carte Survey -->
              <div style="background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%); border:1px solid #e0e7ff; border-radius:12px; padding:24px; margin-bottom:28px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                  <div style="width:40px; height:40px; background:linear-gradient(135deg, #6366f1, #7c3aed); border-radius:10px; display:inline-flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">📝</div>
                  <div>
                    <div style="font-size:15px; font-weight:600; color:#1e293b;">${surveyTitle}</div>
                    <div style="font-size:13px; color:#64748b; margin-top:2px;">Période : ${periodLabel}</div>
                  </div>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0; border-bottom:1px solid #e0e7ff;">
                      <span style="font-size:13px; color:#64748b;">⏰ Date limite</span>
                    </td>
                    <td style="padding:8px 0; border-bottom:1px solid #e0e7ff; text-align:right;">
                      <span style="font-size:13px; font-weight:600; color:#ef4444;">${endDateFormatted}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0; border-bottom:1px solid #e0e7ff;">
                      <span style="font-size:13px; color:#64748b;">⏱️ Durée estimée</span>
                    </td>
                    <td style="padding:8px 0; border-bottom:1px solid #e0e7ff; text-align:right;">
                      <span style="font-size:13px; font-weight:600; color:#1e293b;">2–3 minutes</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;">
                      <span style="font-size:13px; color:#64748b;">🔒 Anonymat</span>
                    </td>
                    <td style="padding:8px 0; text-align:right;">
                      <span style="font-size:13px; font-weight:600; color:${isAnonymous ? '#10b981' : '#f59e0b'};">
                        ${isAnonymous ? '✓ Réponses anonymes' : 'Non anonyme'}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- 5 Dimensions -->
              <div style="margin-bottom:28px;">
                <p style="font-size:13px; font-weight:600; color:#475569; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">Dimensions évaluées</p>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  ${['😊 Satisfaction', '⚡ Motivation', '🤝 Management', '🏢 Environnement', '⚖️ Équilibre'].map(label =>
                    `<span style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px; padding:4px 12px; font-size:12px; color:#475569;">${label}</span>`
                  ).join('')}
                </div>
              </div>

              <!-- CTA -->
              <div style="text-align:center;">
                <a href="${APP_URL}/tasks?tab=surveys"
                  style="display:inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; padding:14px 36px; border-radius:12px; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">
                  Répondre au survey →
                </a>
                <p style="margin-top:12px; font-size:12px; color:#94a3b8;">
                  Cela prend moins de 3 minutes et vos réponses sont précieuses.
                </p>
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc; border: 1px solid #e2e8f0; border-top:0; border-radius:0 0 16px 16px; padding: 24px 40px; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; line-height:1.6;">
                Cet email a été envoyé automatiquement par APEX RH.<br />
                <a href="${APP_URL}/admin/settings?tab=pulse-notifications" style="color:#6366f1; text-decoration:underline;">Gérer mes préférences de notifications</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#6366f1; text-decoration:underline;">Accéder à APEX RH</a>
              </p>
              <p style="color:#cbd5e1; font-size:11px; margin-top:12px;">
                © ${new Date().getFullYear()} NITA Transfert d'Argent — APEX RH
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}

// ─── HANDLER ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: { survey_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Body vide → mode batch
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const todayStr = new Date().toISOString().split('T')[0]
  let sent = 0
  let skipped = 0

  try {
    // 1. Trouver le(s) survey(s) à notifier
    let surveysToNotify: any[] = []

    if (body.survey_id) {
      // Mode ciblé : un survey spécifique
      const { data, error } = await supabase
        .from('engagement_surveys')
        .select('id, title, period_label, end_date, is_anonymous, service_id')
        .eq('id', body.survey_id)
        .eq('status', 'active')
        .single()

      if (error) throw error
      if (data) surveysToNotify = [data]
    } else {
      // Mode batch : surveys actifs dont la date de début est aujourd'hui
      // (ou activés aujourd'hui — pour invitation initiale)
      const { data, error } = await supabase
        .from('engagement_surveys')
        .select('id, title, period_label, end_date, is_anonymous, service_id')
        .eq('status', 'active')

      if (error) throw error
      surveysToNotify = data ?? []
    }

    if (surveysToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, skipped: 0, reason: 'no_active_surveys' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Pour chaque survey, trouver les utilisateurs non encore notifiés
    for (const survey of surveysToNotify) {
      // Récupérer les utilisateurs actifs du service (ou tous si pas de service)
      let usersQuery = supabase
        .from('users')
        .select('id, first_name, last_name, email, is_active')
        .eq('is_active', true)
        .not('email', 'is', null)

      if (survey.service_id) {
        usersQuery = usersQuery.eq('service_id', survey.service_id)
      }

      const { data: users, error: usersErr } = await usersQuery
      if (usersErr) throw usersErr

      if (!users || users.length === 0) continue

      // Trouver ceux déjà notifiés pour ce survey
      const { data: existingLogs } = await supabase
        .from('notification_logs')
        .select('user_id')
        .eq('notification_type', 'survey_invitation')
        .eq('date_ref', todayStr)

      const alreadyNotified = new Set((existingLogs ?? []).map((l: any) => l.user_id))

      // Trouver ceux ayant déjà répondu (pas besoin de les notifier)
      const { data: existingResponses } = await supabase
        .from('survey_responses')
        .select('respondent_id')
        .eq('survey_id', survey.id)

      const alreadyAnswered = new Set((existingResponses ?? []).map((r: any) => r.respondent_id))

      // 3. Envoyer les emails
      for (const user of users) {
        if (alreadyNotified.has(user.id)) {
          skipped++
          continue
        }
        if (alreadyAnswered.has(user.id)) {
          skipped++
          continue
        }

        const { subject, html } = surveyInvitationTemplate({
          firstName:   user.first_name,
          surveyTitle: survey.title,
          periodLabel: survey.period_label,
          endDate:     survey.end_date,
          isAnonymous: survey.is_anonymous,
        })

        const result = await sendEmail({ to: user.email, subject, html })

        if (result.success) {
          await supabase.from('notification_logs').insert({
            user_id:           user.id,
            notification_type: 'survey_invitation',
            date_ref:          todayStr,
            metadata: {
              survey_id:    survey.id,
              survey_title: survey.title,
              resend_id:    result.id,
            },
          })
          sent++
          console.log(`[survey-invite] Envoyé à ${user.email} — ${survey.title}`)
        } else {
          console.error(`[survey-invite] Échec ${user.email}:`, result.error)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[survey-invite] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
