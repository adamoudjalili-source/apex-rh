// ============================================================
// APEX RH — hooks/useApiKeys.js
// Session 53 — Gestion clés API par organisation
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── Config scopes disponibles ───────────────────────────────
export const AVAILABLE_SCOPES = [
  { value: 'users:read',        label: 'Utilisateurs — Lecture',       group: 'Utilisateurs' },
  { value: 'users:write',       label: 'Utilisateurs — Écriture',      group: 'Utilisateurs' },
  { value: 'performance:read',  label: 'Performance — Lecture',        group: 'Performance'  },
  { value: 'objectives:read',   label: 'Objectifs — Lecture',          group: 'Objectifs'    },
  { value: 'objectives:write',  label: 'Objectifs — Écriture',         group: 'Objectifs'    },
  { value: 'surveys:read',      label: 'Enquêtes — Lecture',           group: 'Enquêtes'     },
  { value: 'scim:read',         label: 'SCIM — Lecture (import/export)', group: 'SCIM'       },
  { value: 'scim:write',        label: 'SCIM — Écriture (provisioning)', group: 'SCIM'       },
  { value: 'webhooks:manage',   label: 'Webhooks — Gestion',           group: 'Webhooks'     },
]

export const SCOPE_PRESETS = {
  readonly: ['users:read', 'performance:read', 'objectives:read', 'surveys:read'],
  scim    : ['users:read', 'users:write', 'scim:read', 'scim:write'],
  full    : AVAILABLE_SCOPES.map(s => s.value),
}

// ─── Génération clé API sécurisée (navigateur crypto API) ────
export function generateApiKey() {
  const prefix = 'apx_live_'
  const array  = new Uint8Array(32)
  crypto.getRandomValues(array)
  const secret = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return prefix + secret
}

// ─── Hash SHA-256 côté client (pour affichage prefix uniquement) ─
export async function hashKey(key) {
  const encoder = new TextEncoder()
  const data    = encoder.encode(key)
  const buffer  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Hook : liste des clés API ────────────────────────────────
export function useApiKeys() {
  const { user } = useAuth()

  return useQuery({
    queryKey : ['api_keys', user?.organization_id],
    enabled  : !!user?.organization_id,
    staleTime: 30_000,
    queryFn  : async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, is_active, rate_limit_per_min, expires_at, last_used_at, created_at')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Hook : audit log d'une clé ───────────────────────────────
export function useApiKeyAudit(keyId, limit = 50) {
  return useQuery({
    queryKey : ['api_audit', keyId],
    enabled  : !!keyId,
    staleTime: 10_000,
    queryFn  : async () => {
      const { data, error } = await supabase
        .from('api_audit_logs')
        .select('id, endpoint, method, status_code, ip_address, response_rows, response_time_ms, created_at')
        .eq('api_key_id', keyId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Hook : stats globales API ────────────────────────────────
export function useApiStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey : ['api_stats', user?.organization_id],
    enabled  : !!user?.organization_id,
    staleTime: 60_000,
    queryFn  : async () => {
      const since24h = new Date(Date.now() - 86_400_000).toISOString()

      const [keysRes, callsRes, errorsRes] = await Promise.all([
        supabase
          .from('api_keys')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('is_active', true),

        supabase
          .from('api_audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .gte('created_at', since24h),

        supabase
          .from('api_audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .gte('created_at', since24h)
          .gte('status_code', 400),
      ])

      return {
        active_keys    : keysRes.count  ?? 0,
        calls_24h      : callsRes.count ?? 0,
        errors_24h     : errorsRes.count ?? 0,
        error_rate_24h : callsRes.count
          ? Math.round(((errorsRes.count ?? 0) / callsRes.count) * 100)
          : 0,
      }
    },
  })
}

// ─── Mutation : créer une clé API ────────────────────────────
export function useCreateApiKey() {
  const qc     = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ name, scopes, expiresAt, rateLimit = 100 }) => {
      const rawKey   = generateApiKey()
      const keyHash  = await hashKey(rawKey)
      const prefix   = rawKey.substring(0, 12) + '...'

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          organization_id  : user.organization_id,
          name,
          key_prefix       : prefix,
          key_hash         : keyHash,
          scopes,
          rate_limit_per_min: rateLimit,
          expires_at       : expiresAt ?? null,
          created_by       : user.id,
        })
        .select()
        .single()

      if (error) throw error
      // Retourner la clé en clair UNE SEULE FOIS — ne jamais la restorer
      return { ...data, raw_key: rawKey }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api_keys'] })
      qc.invalidateQueries({ queryKey: ['api_stats'] })
    },
  })
}

// ─── Mutation : révoquer une clé ─────────────────────────────
export function useRevokeApiKey() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (keyId) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api_keys'] })
      qc.invalidateQueries({ queryKey: ['api_stats'] })
    },
  })
}

// ─── Mutation : supprimer une clé ────────────────────────────
export function useDeleteApiKey() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (keyId) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api_keys'] })
    },
  })
}
