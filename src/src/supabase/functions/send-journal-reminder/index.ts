// ============================================================
// APEX RH — supabase/functions/send-journal-reminder/index.ts
// Session 27 — Rappel journal du soir (cron lun–ven 16h30)
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmailBatch } from '../_shared/resendClient.ts'
import { journalReminderTemplate } from '../_shared/emailTemplates.ts'

function isWeekday(): boolean {
  const day = new Date().getDay()
  return day >= 1 && day <= 5
}

function todayDateRef(): string {
  return new Date().toISOString().split('T')[0]
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!isWeekday()) {
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

  try {
    // 1. Users avec notif_journal_enabled = true
    const { data: settings, error: settingsErr } = await supabase
      .from('notification_settings')
      .select(`
        user_id,
        journal_reminder_time,
        users!inner (
          id, first_name, last_name, email, is_active
        )
      `)
      .eq('notif_journal_enabled', true)

    if (settingsErr) throw settingsErr

    // 2. Paramètre global journal_deadline
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('key', 'pulse_journal_deadline')

    const globalDeadline = appSettings?.[0]?.value ?? '18:30'

    // 3. Journaux déjà soumis aujourd'hui
    const { data: submittedToday } = await supabase
      .from('evening_journals')
      .select('user_id')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)

    const submittedUserIds = new Set((submittedToday ?? []).map((r: any) => r.user_id))

    // 4. Emails journal déjà envoyés aujourd'hui
    const { data: alreadySent } = await supabase
      .from('notification_logs')
      .select('user_id')
      .eq('notification_type', 'journal_reminder')
      .eq('date_ref', today)

    const alreadySentUserIds = new Set((alreadySent ?? []).map((r: any) => r.user_id))

    // 5. Scores du jour (pour afficher dans l'email)
    const allUserIds = (settings ?? []).map((s: any) => s.user_id)
    const { data: todayScores } = await supabase
      .from('performance_scores')
      .select('user_id, total_score')
      .in('user_id', allUserIds)
      .eq('score_date', today)

    const scoreMap = new Map((todayScores ?? []).map((s: any) => [s.user_id, s.total_score]))

    // 6. Préparer les emails
    const toSend: { userId: string; email: string; firstName: string; score: number | null }[] = []

    for (const setting of settings ?? []) {
      const user = (setting as any).users
      if (!user?.is_active || !user?.email) continue

      const userId = setting.user_id

      if (submittedUserIds.has(userId)) { skipped++; continue }
      if (alreadySentUserIds.has(userId)) { skipped++; continue }

      toSend.push({
        userId,
        email: user.email,
        firstName: user.first_name,
        score: scoreMap.get(userId) ?? null,
      })
    }

    console.log(`[journal-reminder] ${toSend.length} emails à envoyer, ${skipped} ignorés`)

    // 7. Envoyer
    const emailPayloads = toSend.map(({ email, firstName, score }) => {
      const { subject, html } = journalReminderTemplate({
        firstName,
        email,
        currentScore: score,
        journalDeadlineTime: globalDeadline,
      })
      return { to: email, subject, html }
    })

    const results = await sendEmailBatch(emailPayloads)

    // 8. Logger
    const logsToInsert = toSend
      .filter((_, i) => results[i]?.success)
      .map(({ userId }) => ({
        user_id: userId,
        notification_type: 'journal_reminder',
        date_ref: today,
      }))

    if (logsToInsert.length > 0) {
      await supabase.from('notification_logs').insert(logsToInsert)
    }

    sent = logsToInsert.length
    console.log(`[journal-reminder] Terminé — ${sent} envoyés, ${skipped} ignorés`)

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[journal-reminder] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
