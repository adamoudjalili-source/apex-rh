// ============================================================
// APEX RH — src/hooks/useIntegrations.js
// Session 35 — Module Intégrations Tierces
// Slack, Microsoft Teams, Zapier webhooks + export iCal
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const INTEGRATION_TYPES = {
  slack:  { label: 'Slack',             color: '#4A154B', icon: '💬', accent: '#611f69' },
  teams:  { label: 'Microsoft Teams',   color: '#6264A7', icon: '🟦', accent: '#464775' },
  zapier: { label: 'Zapier',            color: '#FF4A00', icon: '⚡', accent: '#cc3b00' },
}

export const TRIGGER_LABELS = {
  award:         '🏆 Award attribué',
  alert_manager: '🚨 Alerte manager (absence)',
  review_cycle:  '📋 Review cycle activé',
  survey:        '📊 Survey ouvert',
  weekly_summary:'📅 Résumé hebdomadaire',
}

export const ALL_TRIGGERS = Object.keys(TRIGGER_LABELS)

// ─── FETCH WEBHOOKS ──────────────────────────────────────────

export function useWebhooks() {
  return useQuery({
    queryKey: ['integrations', 'webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_webhooks')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

// ─── FETCH LOGS RÉCENTS ──────────────────────────────────────

export function useIntegrationLogs(webhookId, limit = 20) {
  return useQuery({
    queryKey: ['integrations', 'logs', webhookId],
    queryFn: async () => {
      let query = supabase
        .from('integration_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (webhookId) query = query.eq('webhook_id', webhookId)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    staleTime: 30_000,
  })
}

// ─── CREATE WEBHOOK ──────────────────────────────────────────

export function useCreateWebhook() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, label, webhook_url, triggers }) => {
      const { data, error } = await supabase
        .from('integration_webhooks')
        .insert({
          type,
          label: label || INTEGRATION_TYPES[type]?.label || type,
          webhook_url,
          triggers: triggers ?? ALL_TRIGGERS,
          is_active: true,
          created_by: profile.id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

// ─── UPDATE WEBHOOK ──────────────────────────────────────────

export function useUpdateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...fields }) => {
      const { data, error } = await supabase
        .from('integration_webhooks')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

// ─── DELETE WEBHOOK ──────────────────────────────────────────

export function useDeleteWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('integration_webhooks')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

// ─── TEST WEBHOOK ────────────────────────────────────────────
/**
 * Envoie un message de test à un webhook via l'Edge Function dédiée.
 * L'Edge Function se charge de formater le message selon le type (Slack, Teams, Zapier).
 */
export function useTestWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, type, webhook_url }) => {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-integration-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ webhook_id: id, type, webhook_url }),
        }
      )

      const result = await response.json()

      // Mettre à jour last_tested_at dans la BDD
      await supabase
        .from('integration_webhooks')
        .update({
          last_tested_at: new Date().toISOString(),
          last_test_ok:   result.success ?? false,
          last_test_error: result.error ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (!result.success) throw new Error(result.error || 'Échec du test')
      return result
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

// ─── HELPERS ICAL ────────────────────────────────────────────

/**
 * Génère et télécharge un fichier .ics avec les échéances des Review Cycles
 * Format standard iCalendar — compatible Google Calendar, Outlook, Apple Calendar
 */
export async function downloadReviewCyclesIcal() {
  // Récupérer les cycles actifs et à venir
  const { data: cycles, error } = await supabase
    .from('review_cycles')
    .select('id, title, period_start, period_end, frequency, status')
    .in('status', ['draft', 'active', 'in_review'])
    .order('period_start')

  if (error) throw error

  const events = (cycles || []).flatMap(cycle => {
    const results = []
    const dtStart = cycle.period_start.replace(/-/g, '')
    const dtEnd   = cycle.period_end.replace(/-/g, '')
    const uid     = `review-${cycle.id}@apex-rh.nita`

    // Événement principal (période du cycle)
    results.push(`BEGIN:VEVENT
UID:${uid}-main
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:📋 Review Cycle — ${cycle.title}
DESCRIPTION:Cycle d'évaluation APEX RH\\nFréquence: ${cycle.frequency}\\nStatut: ${cycle.status}
CATEGORIES:APEX RH,Review Cycles
END:VEVENT`)

    // Rappel J-7 avant la fin
    const endDate = new Date(cycle.period_end)
    endDate.setDate(endDate.getDate() - 7)
    const dtReminder = endDate.toISOString().split('T')[0].replace(/-/g, '')
    results.push(`BEGIN:VEVENT
UID:${uid}-reminder
DTSTART;VALUE=DATE:${dtReminder}
DTEND;VALUE=DATE:${dtReminder}
SUMMARY:⏰ Rappel J-7 — ${cycle.title}
DESCRIPTION:Le cycle d'évaluation "${cycle.title}" se termine dans 7 jours.
CATEGORIES:APEX RH,Review Cycles
END:VEVENT`)

    return results
  })

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//APEX RH//NITA Transfert d\'Argent//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:APEX RH — Review Cycles',
    'X-WR-CALDESC:Échéances des cycles d\'évaluation APEX RH',
    'X-WR-TIMEZONE:Africa/Abidjan',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `apex-rh-review-cycles-${new Date().toISOString().split('T')[0]}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
