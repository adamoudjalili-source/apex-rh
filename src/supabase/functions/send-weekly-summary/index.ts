// ============================================================
// APEX RH — supabase/functions/send-weekly-summary/index.ts
// Session 27 — Résumé hebdomadaire managers (cron lundi 08h00)
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resendClient.ts'
import { weeklySummaryTemplate } from '../_shared/emailTemplates.ts'

const MANAGER_ROLES = ['chef_service', 'chef_division', 'directeur', 'administrateur']

function getPreviousWeekRange(): { start: string; end: string; label: string } {
  const now = new Date()
  // Lundi de la semaine dernière
  const dayOfWeek = now.getDay() // 0=dim, 1=lun...
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7)
  lastMonday.setHours(0, 0, 0, 0)

  // Vendredi de la semaine dernière
  const lastFriday = new Date(lastMonday)
  lastFriday.setDate(lastMonday.getDate() + 4)
  lastFriday.setHours(23, 59, 59, 999)

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  const label = `${fmtDate(lastMonday)} – ${fmtDate(lastFriday)} ${lastFriday.getFullYear()}`

  return {
    start: lastMonday.toISOString(),
    end: lastFriday.toISOString(),
    label,
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { start, end, label } = getPreviousWeekRange()
  const todayStr = new Date().toISOString().split('T')[0]
  const startDate = start.split('T')[0]
  const endDate = end.split('T')[0]

  let sent = 0
  let skipped = 0

  try {
    // 1. Managers avec résumé hebdo activé
    const { data: managerSettings, error: msErr } = await supabase
      .from('notification_settings')
      .select(`
        user_id,
        notif_weekly_summary_enabled,
        users!inner (
          id, first_name, last_name, email, role, is_active,
          service_id, division_id, direction_id
        )
      `)
      .eq('notif_weekly_summary_enabled', true)

    if (msErr) throw msErr

    const managers = (managerSettings ?? []).filter((s: any) =>
      MANAGER_ROLES.includes(s.users?.role) && s.users?.is_active
    )

    // 2. Résumés déjà envoyés aujourd'hui
    const { data: alreadySent } = await supabase
      .from('notification_logs')
      .select('user_id')
      .eq('notification_type', 'weekly_summary')
      .eq('date_ref', todayStr)

    const alreadySentIds = new Set((alreadySent ?? []).map((r: any) => r.user_id))

    // 3. Tous les collaborateurs
    const { data: allCollabs } = await supabase
      .from('users')
      .select('id, first_name, last_name, service_id, division_id, direction_id, role, is_active')
      .eq('is_active', true)
      .eq('role', 'collaborateur')

    // 4. Scores de la semaine passée
    const collabIds = (allCollabs ?? []).map((u: any) => u.id)

    const { data: weekScores } = await supabase
      .from('performance_scores')
      .select('user_id, total_score, score_date')
      .in('user_id', collabIds)
      .gte('score_date', startDate)
      .lte('score_date', endDate)

    // 5. Journaux soumis la semaine passée (taux de soumission)
    const { data: weekJournals } = await supabase
      .from('evening_journals')
      .select('user_id')
      .in('user_id', collabIds)
      .gte('created_at', start)
      .lte('created_at', end)

    // 6. Calculer les stats pour chaque manager
    for (const ms of managers) {
      const manager = (ms as any).users
      if (!manager?.email) continue

      const managerId = ms.user_id

      if (alreadySentIds.has(managerId)) {
        skipped++
        continue
      }

      // Scope du manager
      const scopedCollabs = (allCollabs ?? []).filter((u: any) => {
        if (manager.role === 'chef_service') return u.service_id === manager.service_id
        if (manager.role === 'chef_division') return u.division_id === manager.division_id
        if (manager.role === 'directeur') return u.direction_id === manager.direction_id
        if (manager.role === 'administrateur') return true
        return false
      })

      if (scopedCollabs.length === 0) {
        skipped++
        continue
      }

      const scopedIds = new Set(scopedCollabs.map((u: any) => u.id))

      // Scores moyens par collaborateur pour la semaine
      const scoresByUser = new Map<string, number[]>()
      for (const s of weekScores ?? []) {
        if (!scopedIds.has(s.user_id)) continue
        if (!scoresByUser.has(s.user_id)) scoresByUser.set(s.user_id, [])
        scoresByUser.get(s.user_id)!.push(s.total_score)
      }

      const userAvgScores: { userId: string; firstName: string; lastName: string; avgScore: number }[] = []
      for (const collab of scopedCollabs) {
        const scores = scoresByUser.get(collab.id) ?? []
        if (scores.length === 0) continue
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        userAvgScores.push({
          userId: collab.id,
          firstName: collab.first_name,
          lastName: collab.last_name,
          avgScore: avg,
        })
      }

      // Si aucune donnée de score, skip
      if (userAvgScores.length === 0) {
        skipped++
        continue
      }

      // Score moyen équipe
      const avgScore = Math.round(
        userAvgScores.reduce((a, b) => a + b.avgScore, 0) / userAvgScores.length
      )

      // Taux de soumission
      const submittedIds = new Set(
        (weekJournals ?? [])
          .filter((j: any) => scopedIds.has(j.user_id))
          .map((j: any) => j.user_id)
      )
      const submissionRate = Math.round((submittedIds.size / scopedCollabs.length) * 100)

      // Top et bottom
      const sorted = [...userAvgScores].sort((a, b) => b.avgScore - a.avgScore)
      const topPerformer = sorted[0] ? { firstName: sorted[0].firstName, lastName: sorted[0].lastName, score: sorted[0].avgScore } : null
      const toWatch = sorted.length > 1 ? { firstName: sorted[sorted.length - 1].firstName, lastName: sorted[sorted.length - 1].lastName, score: sorted[sorted.length - 1].avgScore } : null

      // Nom de l'équipe
      const teamName = manager.role === 'administrateur' ? 'NITA' : 'votre équipe'

      const { subject, html } = weeklySummaryTemplate({
        managerFirstName: manager.first_name,
        email: manager.email,
        teamName,
        weekLabel: label,
        avgScore,
        submissionRate,
        submittedCount: submittedIds.size,
        totalCount: scopedCollabs.length,
        topPerformer,
        toWatch,
      })

      const result = await sendEmail({ to: manager.email, subject, html })

      if (result.success) {
        await supabase.from('notification_logs').insert({
          user_id: managerId,
          notification_type: 'weekly_summary',
          date_ref: todayStr,
          metadata: { week_label: label, avg_score: avgScore },
        })
        sent++
      } else {
        console.error(`[weekly-summary] Échec ${manager.email}:`, result.error)
      }
    }

    console.log(`[weekly-summary] Terminé — ${sent} envoyés, ${skipped} ignorés`)

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[weekly-summary] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
