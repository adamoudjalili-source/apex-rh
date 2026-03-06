// ============================================================
// APEX RH — hooks/useWebhooks.js
// Session 53 — Gestion webhooks sortants
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── Événements disponibles ───────────────────────────────────
export const WEBHOOK_EVENTS = [
  { value: 'user.created',              label: 'Utilisateur créé',          group: 'Utilisateurs' },
  { value: 'user.updated',              label: 'Utilisateur mis à jour',    group: 'Utilisateurs' },
  { value: 'user.deactivated',          label: 'Utilisateur désactivé',     group: 'Utilisateurs' },
  { value: 'performance.score_created', label: 'Score PULSE créé',          group: 'Performance'  },
  { value: 'performance.score_updated', label: 'Score PULSE mis à jour',    group: 'Performance'  },
  { value: 'objective.created',         label: 'OKR créé',                  group: 'Objectifs'    },
  { value: 'objective.updated',         label: 'OKR mis à jour',            group: 'Objectifs'    },
  { value: 'objective.completed',       label: 'OKR complété',              group: 'Objectifs'    },
  { value: 'survey.completed',          label: 'Enquête remplie',           group: 'Enquêtes'     },
  { value: 'succession.plan_updated',   label: 'Plan de succession modifié',group: 'Succession'   },
]

// Génération secret webhook
export function generateWebhookSecret() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return 'whsec_' + Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Hook : liste webhooks ────────────────────────────────────
export function useWebhooks() {
  const { user } = useAuth()

  return useQuery({
    queryKey : ['webhooks', user?.organization_id],
    enabled  : !!user?.organization_id,
    staleTime: 30_000,
    queryFn  : async () => {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('id, name, url, events, is_active, secret_prefix, retry_count, timeout_seconds, last_triggered_at, failure_count, created_at')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Hook : delivery logs d'un webhook ───────────────────────
export function useWebhookDeliveries(webhookId, limit = 20) {
  return useQuery({
    queryKey : ['webhook_deliveries', webhookId],
    enabled  : !!webhookId,
    staleTime: 10_000,
    queryFn  : async () => {
      const { data, error } = await supabase
        .from('webhook_delivery_logs')
        .select('id, event_type, http_status, attempt, response_time_ms, error_message, delivered_at, created_at')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Mutation : créer un webhook ─────────────────────────────
export function useCreateWebhook() {
  const qc       = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ name, url, events, headers = {}, retryCount = 3, timeoutSeconds = 10 }) => {
      const rawSecret   = generateWebhookSecret()
      const secretPrefix = rawSecret.substring(0, 14) + '...'

      // Hash du secret pour stockage (on ne stocke pas le secret en clair)
      const encoder = new TextEncoder()
      const secretBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawSecret))
      const secretHash = Array.from(new Uint8Array(secretBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          organization_id : user.organization_id,
          name,
          url,
          secret_hash     : secretHash,
          secret_prefix   : secretPrefix,
          events,
          headers,
          retry_count     : retryCount,
          timeout_seconds : timeoutSeconds,
          created_by      : user.id,
        })
        .select()
        .single()

      if (error) throw error
      // Retourner le secret en clair UNE SEULE FOIS
      return { ...data, raw_secret: rawSecret }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

// ─── Mutation : modifier un webhook ──────────────────────────
export function useUpdateWebhook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

// ─── Mutation : supprimer un webhook ─────────────────────────
export function useDeleteWebhook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (webhookId) => {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

// ─── Mutation : test webhook (ping) ──────────────────────────
export function useTestWebhook() {
  return useMutation({
    mutationFn: async ({ webhookId, orgId }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non authentifié')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/apex-webhooks`, {
        method  : 'POST',
        headers : {
          'Content-Type' : 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          event_type : 'webhook.test',
          org_id     : orgId,
          payload    : {
            message    : 'Test de connectivité APEX RH',
            webhook_id : webhookId,
            timestamp  : new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) throw new Error(`Erreur ${response.status}`)
      return response.json()
    },
  })
}
