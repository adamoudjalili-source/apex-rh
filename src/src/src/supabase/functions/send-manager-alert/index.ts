// ============================================================
// APEX RH — supabase/functions/send-manager-alert/index.ts
// Session 27 — Alerte manager (cron lun–ven 09h00)
// Groupement par manager — 1 email résumé par manager
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resendClient.ts'
import { managerAlertTemplate } from '../_shared/emailTemplates.ts'

const MANAGER_ROLES = ['chef_service', 'chef_division', 'directeur', 'administrateur']

function isWeekday(): boolean {
  const day = new Date().getDay()
  return day >= 1 && day <= 5
}

function todayDateRef(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Calcule le nombre de jours ouvrés entre deux dates.
 */
function workingDaysBetween(from: Date, to: Date): number {
  let count = 0
  const current = new Date(from)
  current.setDate(current.getDate() + 1) // commence au lendemain

  while (current <= to) {
    const day = current.getDay()
    if (day >= 1 && day <= 5) count++
    current.setDate(current.getDate() + 1)
  }
  return count
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

  const today = new Date()
  const todayStr = todayDateRef()
  let sent = 0
  let skipped = 0

  try {
    // 1. Récupérer tous les managers avec l'alerte activée
    const { data: managerSettings, error: msErr } = await supabase
      .from('notification_settings')
      .select(`
        user_id,
        notif_alert_manager_enabled,
        manager_alert_threshold_days,
        users!inner (
          id, first_name, last_name, email, role, is_active,
          service_id, division_id, direction_id
        )
      `)
      .eq('notif_alert_manager_enabled', true)

    if (msErr) throw msErr

    // Filtrer les vrais managers
    const managers = (managerSettings ?? []).filter((s: any) =>
      MANAGER_ROLES.includes(s.users?.role) && s.users?.is_active
    )

    // 2. Récupérer tous les collaborateurs avec leurs derniers journaux
    const { data: allUsers, error: usersErr } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, email, role, is_active,
        service_id, division_id, direction_id,
        services!users_service_id_fkey (id, name),
        divisions!users_division_id_fkey (id, name)
      `)
      .eq('is_active', true)
      .eq('role', 'collaborateur')

    if (usersErr) throw usersErr

    // 3. Récupérer le dernier journal soumis par chaque collaborateur
    const collabIds = (allUsers ?? []).map((u: any) => u.id)

    const { data: lastJournals } = await supabase
      .from('evening_journals')
      .select('user_id, created_at')
      .in('user_id', collabIds)
      .order('created_at', { ascending: false })

    // Map userId → dernière date de soumission
    const lastSubmissionMap = new Map<string, Date>()
    for (const j of lastJournals ?? []) {
      if (!lastSubmissionMap.has(j.user_id)) {
        lastSubmissionMap.set(j.user_id, new Date(j.created_at))
      }
    }

    // 4. Emails alerte déjà envoyés aujourd'hui (idempotence)
    const { data: alreadySentToday } = await supabase
      .from('notification_logs')
      .select('user_id')
      .eq('notification_type', 'manager_alert')
      .eq('date_ref', todayStr)

    const alreadySentManagerIds = new Set((alreadySentToday ?? []).map((r: any) => r.user_id))

    // 5. Pour chaque manager, identifier les absents dans son scope
    for (const ms of managers) {
      const manager = (ms as any).users
      if (!manager?.email) continue

      const managerId = ms.user_id
      const threshold = ms.manager_alert_threshold_days ?? 2

      // Skip si alerte déjà envoyée aujourd'hui
      if (alreadySentManagerIds.has(managerId)) {
        skipped++
        continue
      }

      // Scope du manager : même service ou division ou direction
      const scopedCollabs = (allUsers ?? []).filter((u: any) => {
        if (manager.role === 'chef_service') return u.service_id === manager.service_id
        if (manager.role === 'chef_division') return u.division_id === manager.division_id
        if (manager.role === 'directeur') return u.direction_id === manager.direction_id
        if (manager.role === 'administrateur') return true // voit tous
        return false
      })

      // Identifier les absents (N+ jours sans journal)
      const absentCollaborators = []

      for (const collab of scopedCollabs) {
        const lastSub = lastSubmissionMap.get(collab.id)

        let absentDays: number
        if (!lastSub) {
          // Jamais soumis → compter les jours ouvrés depuis la création du compte (max 14)
          absentDays = Math.min(14, workingDaysBetween(new Date(Date.now() - 14 * 86400000), today))
        } else {
          absentDays = workingDaysBetween(lastSub, today)
        }

        if (absentDays >= threshold) {
          absentCollaborators.push({
            firstName: collab.first_name,
            lastName: collab.last_name,
            role: collab.services?.name ?? collab.divisions?.name ?? '',
            absentDays,
            lastSubmission: lastSub?.toISOString() ?? null,
          })
        }
      }

      // Si aucun absent → skip
      if (absentCollaborators.length === 0) {
        skipped++
        continue
      }

      // Trier par nombre de jours d'absence décroissant
      absentCollaborators.sort((a, b) => b.absentDays - a.absentDays)

      // 6. Envoyer l'email
      const teamName = manager.role === 'chef_service'
        ? (scopedCollabs[0] as any)?.services?.name ?? 'votre équipe'
        : manager.role === 'chef_division'
        ? (scopedCollabs[0] as any)?.divisions?.name ?? 'votre équipe'
        : 'NITA'

      const { subject, html } = managerAlertTemplate({
        managerFirstName: manager.first_name,
        email: manager.email,
        absentCollaborators,
        teamName,
      })

      const result = await sendEmail({ to: manager.email, subject, html })

      if (result.success) {
        // Logger
        await supabase.from('notification_logs').insert({
          user_id: managerId,
          notification_type: 'manager_alert',
          date_ref: todayStr,
          metadata: {
            absent_count: absentCollaborators.length,
            resend_id: result.id,
          },
        })
        sent++
      } else {
        console.error(`[manager-alert] Échec envoi vers ${manager.email}:`, result.error)
      }
    }

    console.log(`[manager-alert] Terminé — ${sent} envoyés, ${skipped} ignorés`)

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[manager-alert] Erreur fatale:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
