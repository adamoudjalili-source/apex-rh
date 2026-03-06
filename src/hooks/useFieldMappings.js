// ============================================================
// APEX RH — hooks/useFieldMappings.js
// Session 53 — Mapping champs SIRH/SCIM ↔ APEX RH
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── Systèmes sources supportés ──────────────────────────────
export const SOURCE_SYSTEMS = [
  { value: 'scim',              label: 'SCIM 2.0 (standard)',     icon: '🔗' },
  { value: 'workday',           label: 'Workday',                 icon: '🏢' },
  { value: 'sap_successfactors',label: 'SAP SuccessFactors',      icon: '💼' },
  { value: 'bamboohr',          label: 'BambooHR',                icon: '🎋' },
  { value: 'payfit',            label: 'PayFit',                  icon: '💰' },
  { value: 'custom',            label: 'Système personnalisé',    icon: '⚙️' },
]

// ─── Tables cibles disponibles ────────────────────────────────
export const TARGET_TABLES = {
  users: {
    label  : 'Utilisateurs',
    fields : [
      { value: 'first_name',  label: 'Prénom',           type: 'text',    required: true },
      { value: 'last_name',   label: 'Nom de famille',   type: 'text',    required: true },
      { value: 'email',       label: 'Email',            type: 'email',   required: true },
      { value: 'job_title',   label: 'Intitulé poste',   type: 'text',    required: false },
      { value: 'hire_date',   label: "Date d'embauche",  type: 'date',    required: false },
      { value: 'is_active',   label: 'Actif',            type: 'boolean', required: false },
      { value: 'role',        label: 'Rôle APEX',        type: 'enum',    required: false },
      { value: 'phone',       label: 'Téléphone',        type: 'text',    required: false },
    ],
  },
}

// ─── Fonctions de transformation disponibles ─────────────────
export const TRANSFORM_FUNCTIONS = [
  { value: null,         label: 'Aucune (valeur directe)' },
  { value: 'toLowerCase', label: 'Minuscules'             },
  { value: 'toUpperCase', label: 'Majuscules'             },
  { value: 'trim',        label: 'Supprimer espaces'      },
  { value: 'date_iso',    label: 'Convertir en date ISO'  },
  { value: 'splitFirst',  label: 'Premier mot'            },
  { value: 'splitLast',   label: 'Dernier mot'            },
  { value: 'booleanMap',  label: 'Booléen (Y/N → true/false)' },
]

// ─── Hook : liste des mappings ────────────────────────────────
export function useFieldMappings(sourceSystem = null) {
  const { user } = useAuth()

  return useQuery({
    queryKey : ['field_mappings', user?.organization_id, sourceSystem],
    enabled  : !!user?.organization_id,
    staleTime: 60_000,
    queryFn  : async () => {
      let query = supabase
        .from('field_mappings')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('source_system')
        .order('source_field')

      if (sourceSystem) query = query.eq('source_system', sourceSystem)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Hook : logs de synchronisation SCIM ─────────────────────
export function useScimSyncLogs(limit = 20) {
  const { user } = useAuth()

  return useQuery({
    queryKey : ['scim_sync_logs', user?.organization_id],
    enabled  : !!user?.organization_id,
    staleTime: 15_000,
    queryFn  : async () => {
      const { data, error } = await supabase
        .from('scim_sync_logs')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Mutation : créer un mapping ─────────────────────────────
export function useCreateFieldMapping() {
  const qc       = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (mapping) => {
      const { data, error } = await supabase
        .from('field_mappings')
        .insert({
          ...mapping,
          organization_id : user.organization_id,
          created_by      : user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field_mappings'] })
    },
  })
}

// ─── Mutation : modifier un mapping ──────────────────────────
export function useUpdateFieldMapping() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase
        .from('field_mappings')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field_mappings'] })
    },
  })
}

// ─── Mutation : supprimer un mapping ─────────────────────────
export function useDeleteFieldMapping() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('field_mappings')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field_mappings'] })
    },
  })
}

// ─── Helper : appliquer transformation ───────────────────────
export function applyTransform(value, transformFn) {
  if (!value || !transformFn) return value
  switch (transformFn) {
    case 'toLowerCase':  return String(value).toLowerCase()
    case 'toUpperCase':  return String(value).toUpperCase()
    case 'trim':         return String(value).trim()
    case 'date_iso':     return new Date(value).toISOString().split('T')[0]
    case 'splitFirst':   return String(value).split(' ')[0]
    case 'splitLast':    return String(value).split(' ').pop()
    case 'booleanMap':   return ['y', 'yes', 'true', '1', 'oui'].includes(String(value).toLowerCase())
    default:             return value
  }
}