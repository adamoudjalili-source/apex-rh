// ============================================================
// APEX RH — supabase/functions/send-brief-reminder/index.ts
// Session 27 — Rappel brief matinal (cron lun–ven 07h30)
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailBatch } from '../_shared/resendClient.ts'
import { briefReminderTemplate } from '../_shared/emailTemplates.ts'

// ─── HELPERS ─────────────────────────────────────────────────

function isWeekday(): boolean {
  const day = new Date().getDay()
  return day >= 1 && day <= 5 // lundi–vendredi
}

function todayDateRef(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────

serve(async (req) => {
  // Autoriser uniquement POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Vérifier que c'est un jour ouvré
  if (!isWeekday()) {
    console.log('[brief-reminder] Dimanche ou samedi → skip')
    return new Response(JSON.stringify({ skipped: true, reason: 'weekend' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = todayDateRef()
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  try {
    // 1. Récupérer tous les users avec notif_brief_enabled = true
    const { data: settings, error: settingsErr } = await supabase
      .from('notification_settings')
      .select(`
        user_id,
        brief_reminder_time,
        users!inner (
          id, first_name, last_name, email, is_active
        )
      `)
      .eq('notif_brief_enabled', true)

    if (settingsErr) throw settingsErr

    // 2. Récupérer les paramètres globaux pour les horaires
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['pulse_brief_deadline', 'pulse_brief_start'])

    const globalDeadline = appSettings?.find((s) => s.key === 'pulse_brief_deadline')?.value ?? '10:00'

    // 3. Récupérer les brefs déjà soumis aujourd'hui
    const { data: submittedToday } = await supabase
      .from('morning_plans')
      .select('user_id')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)

    const submittedUserIds = new Set((submittedToday ?? []).map((r: any) => r.user_id))

    // 4. Récupérer les emails brief déjà envoyés aujourd'hui
    const { data: alreadySent } = await supabase
      .from('notification_logs')
      .select('user_id')
      .eq('notification_type', 'brief_reminder')
      .eq('date_ref', today)

    const alreadySentUserIds = new Set((alreadySent ?? []).map((r: any) => r.user_id))

    // 5. Préparer les emails à envoyer
    const toSend: { userId: string; email: string; firstName: string }[] = []

    for (const setting of settings ?? []) {
      const user = (setting as any).users
      if (!user?.is_active || !user?.email) continue

      const userId = setting.user_id

      // Skip si brief déjà soumis
      if (submittedUserIds.has(userId)) {
        skipped++
        continue
      }

      // Skip si email déjà envoyé aujourd'hui
      if (alreadySentUserIds.has(userId)) {
        skipped++
        continue
      }

      toSend.push({
        userId,
        email: user.email,
        firstName: user.first_name,
      })
    }

    console.log(`[brief-reminder] ${toSend.length} emails à envoyer, ${skipped} ignorés`)

    // 6. Envoyer les emails
    const emailPayloads = toSend.map(({ email, firstName }) => {
      const { subject, html } = briefReminderTemplate({
        firstName,
        email,
        briefStartTime: '07:30',
        briefDeadlineTime: globalDeadline,
      })
      return { to: email, subject, html }
    })

    const results = await sendEmailBatch(emailPayloads)

    // 7. Logger les envois réussis
    const logsToInsert = toSend
      .filter((_, i) => results[i]?.success)
      .map(({ userId }) => ({
        user_id: userId,
        notification_type: 'brief_reminder',
        date_ref: today,
        metadata: { resend_id: results[toSend.findIndex((t) => t.userId === userId)]?.id },
      }))

    if (logsToInsert.length > 0) {
      const { error: logErr } = await supabase
        .from('notification_logs')
        .insert(logsToInsert)

      if (logErr) console.error('[brief-reminder] Erreur log:', logErr)
    }

    sent = logsToInsert.length
    const failed = results.filter((r) => !r.success).length
    if (failed > 0) errors.push(`${failed} emails en échec`)

    console.log(`[brief-reminder] Terminé — ${sent} envoyés, ${skipped} ignorés, ${failed} échecs`)

    return new Response(
      JSON.stringify({ success: true, sent, skipped, errors }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[brief-reminder] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
