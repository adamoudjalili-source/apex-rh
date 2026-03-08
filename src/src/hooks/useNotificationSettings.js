// ============================================================
// APEX RH — src/hooks/useNotificationSettings.js
// Session 27 — CRUD préférences notifications email PULSE
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── VALEURS PAR DÉFAUT ──────────────────────────────────────

const DEFAULT_SETTINGS = {
  notif_brief_enabled: true,
  notif_journal_enabled: true,
  notif_alert_manager_enabled: true,
  notif_weekly_summary_enabled: true,
  notif_award_enabled: true,
  manager_alert_threshold_days: 2,
  brief_reminder_time: '07:30',
  journal_reminder_time: '16:30',
}

// ─── FETCH PRÉFÉRENCES ───────────────────────────────────────

export function useNotificationSettings() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notification-settings', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (error) throw error

      // Retourner les défauts si l'entrée n'existe pas encore
      return data ?? { ...DEFAULT_SETTINGS, user_id: profile.id }
    },
    enabled: !!profile?.id,
    staleTime: 300_000, // 5 min
  })
}

// ─── MISE À JOUR ─────────────────────────────────────────────

export function useUpdateNotificationSettings() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates) => {
      // Upsert : crée l'entrée si elle n'existe pas, sinon met à jour
      const { data, error } = await supabase
        .from('notification_settings')
        .upsert(
          {
            user_id: profile.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', profile?.id] })
    },
  })
}

// ─── LOGS DE NOTIFICATIONS (lecture seule) ───────────────────

export function useNotificationLogs({ limit = 20 } = {}) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['notification-logs', profile?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 60_000, // 1 min
  })
}

// ─── DÉCLENCHER UN ENVOI MANUEL (pour les tests) ─────────────

export function useTriggerNotification() {
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (notificationType) => {
      // Map des types vers les Edge Functions
      const endpointMap = {
        brief_reminder:   'send-brief-reminder',
        journal_reminder: 'send-journal-reminder',
        manager_alert:    'send-manager-alert',
        weekly_summary:   'send-weekly-summary',
      }

      const endpoint = endpointMap[notificationType]
      if (!endpoint) throw new Error(`Type inconnu : ${notificationType}`)

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: { test_user_id: profile.id },
      })

      if (error) throw error
      return data
    },
  })
}
