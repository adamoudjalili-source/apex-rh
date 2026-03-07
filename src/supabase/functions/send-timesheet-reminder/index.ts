// @ts-nocheck
// ============================================================
// APEX RH — supabase/functions/send-timesheet-reminder/index.ts
// Session 66 — Rappel hebdomadaire soumission feuille de temps
// Déclenchement : cron edge function (vendredi 17h) ou manuel
// ============================================================
import { serve }          from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient }   from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Lundi de la semaine courante
    const now   = new Date()
    const day   = now.getDay()
    const diff  = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    const weekStart = monday.toISOString().split('T')[0]

    // Récupérer tous les utilisateurs actifs avec organization_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, organization_id')
      .eq('is_active', true)
      .not('organization_id', 'is', null)

    if (usersError) throw usersError

    // Récupérer les feuilles soumises cette semaine
    const { data: sheets } = await supabase
      .from('time_sheets')
      .select('user_id, status')
      .eq('week_start', weekStart)
      .in('status', ['submitted','manager_approved','hr_approved'])

    const submittedUserIds = new Set((sheets || []).map(s => s.user_id))

    // Identifier les utilisateurs sans feuille soumise
    const toRemind = (users || []).filter(u => !submittedUserIds.has(u.id))

    // Créer des notifications in-app pour chaque utilisateur
    let created = 0
    for (const user of toRemind) {
      const { error } = await supabase
        .from('notifications')
        .insert({
          organization_id: user.organization_id,
          user_id:         user.id,
          type:            'timesheet_reminder',
          title:           'Rappel feuille de temps',
          message:         `Bonjour ${user.first_name}, pensez à soumettre votre feuille de temps pour la semaine du ${weekStart}.`,
          read:            false,
          created_at:      new Date().toISOString(),
        })
      if (!error) created++
    }

    return new Response(
      JSON.stringify({ success: true, week: weekStart, reminded: toRemind.length, notificationsCreated: created }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-timesheet-reminder error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
