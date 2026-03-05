// ============================================================
// APEX RH — supabase/functions/send-award-notification/index.ts
// Session 27 — Notification award (déclenchée par webhook/trigger)
// Peut être appelée directement depuis l'UI après attribution
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resendClient.ts'
import { awardNotificationTemplate } from '../_shared/emailTemplates.ts'

const AWARD_LABELS: Record<string, string> = {
  'star_of_month': '⭐ Star du Mois',
  'top_delivery':  '🚀 Top Delivery',
  'most_improved': '📈 Most Improved',
  'to_watch':      '👁️ À Surveiller',
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: { award_id?: string; user_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    // body vide → on cherche les awards récents non notifiés
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const todayStr = new Date().toISOString().split('T')[0]
  let sent = 0

  try {
    let awardsToNotify: any[] = []

    if (body.award_id) {
      // Mode direct : un award spécifique
      const { data, error } = await supabase
        .from('monthly_awards')
        .select(`
          id, award_type, award_year, award_month, score, notes,
          user_id,
          awarded_user:users!monthly_awards_user_id_fkey (
            id, first_name, last_name, email, is_active
          )
        `)
        .eq('id', body.award_id)
        .eq('status', 'awarded')
        .single()

      if (error) throw error
      if (data) awardsToNotify = [data]
    } else {
      // Mode batch : awards récents pas encore notifiés
      // Chercher les awards attribués aujourd'hui ou hier (pour les ratés)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const { data: recentAwards, error } = await supabase
        .from('monthly_awards')
        .select(`
          id, award_type, award_year, award_month, score, notes,
          user_id, awarded_at,
          awarded_user:users!monthly_awards_user_id_fkey (
            id, first_name, last_name, email, is_active
          )
        `)
        .eq('status', 'awarded')
        .gte('awarded_at', `${yesterdayStr}T00:00:00Z`)

      if (error) throw error

      // Filtrer ceux sans log de notification
      if (recentAwards && recentAwards.length > 0) {
        const awardIds = recentAwards.map((a: any) => a.id)

        const { data: existingLogs } = await supabase
          .from('notification_logs')
          .select('metadata')
          .eq('notification_type', 'award')
          .in('metadata->award_id', awardIds.map((id: string) => `"${id}"`))

        const notifiedAwardIds = new Set(
          (existingLogs ?? []).map((l: any) => l.metadata?.award_id)
        )

        awardsToNotify = recentAwards.filter((a: any) => !notifiedAwardIds.has(a.id))
      }
    }

    // Envoyer les notifications
    for (const award of awardsToNotify) {
      const user = award.awarded_user
      if (!user?.is_active || !user?.email) continue

      // Vérifier préférences de l'utilisateur
      const { data: userSettings } = await supabase
        .from('notification_settings')
        .select('notif_award_enabled')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userSettings?.notif_award_enabled === false) {
        console.log(`[award-notif] User ${user.id} a désactivé les notifications award`)
        continue
      }

      const awardMonthLabel = `${MONTHS_FR[award.award_month - 1]} ${award.award_year}`
      const awardTypeLabel = AWARD_LABELS[award.award_type] ?? award.award_type

      const { subject, html } = awardNotificationTemplate({
        firstName: user.first_name,
        email: user.email,
        awardType: awardTypeLabel,
        awardMonth: awardMonthLabel,
        managerMessage: award.notes ?? undefined,
        score: award.score ?? undefined,
      })

      const result = await sendEmail({ to: user.email, subject, html })

      if (result.success) {
        await supabase.from('notification_logs').insert({
          user_id: user.id,
          notification_type: 'award',
          date_ref: todayStr,
          metadata: {
            award_id: award.id,
            award_type: award.award_type,
            award_month: award.award_month,
            award_year: award.award_year,
            resend_id: result.id,
          },
        })
        sent++
        console.log(`[award-notif] Envoyé à ${user.email} — ${awardTypeLabel}`)
      } else {
        console.error(`[award-notif] Échec ${user.email}:`, result.error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[award-notif] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
