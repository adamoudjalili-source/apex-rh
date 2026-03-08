// ============================================================
// APEX RH — src/hooks/useOffboardingS85.js
// Session 85 — Offboarding : Automatisation + solde auto
// Hooks : dashboard agrégé, solde auto RPC, auto-sync departure
// ⚠️ Complète useOffboarding.js (S68) — ne pas écraser
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── DASHBOARD OFFBOARDING ────────────────────────────────────
// Vue consolidée des processus en cours avec alertes retard
// Utilise la vue v_offboarding_dashboard (S85)

export function useOffboardingDashboard() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_dashboard', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_offboarding_dashboard')
        .select('*')
        .eq('organization_id', orgId)
        .order('days_until_exit', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
    refetchInterval: 60_000, // refresh auto toutes les minutes
  })
}

// ─── ALERTES RETARD ───────────────────────────────────────────
// Sous-ensemble du dashboard : processus avec tâches en retard

export function useOffboardingAlerts() {
  const { data: dashboard = [], ...rest } = useOffboardingDashboard()
  const alerts = dashboard.filter(p =>
    p.status === 'in_progress' && (p.overdue_tasks > 0 || (p.days_until_exit !== null && p.days_until_exit <= 7))
  )
  return { data: alerts, ...rest }
}

// ─── CALCUL SOLDE DE TOUT COMPTE (RPC) ───────────────────────
// Lit leave_balances + compensation_records via RPC S85
// Retourne { monthly_salary, daily_rate, cp_balance, rtt_balance,
//            cp_amount, rtt_amount, total_amount, computed_at }

export function useFinalSettlement(userId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const targetId = userId || profile?.id

  return useQuery({
    queryKey: ['final_settlement', orgId, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_final_settlement', {
          p_user_id: targetId,
          p_org_id:  orgId,
        })
      if (error) throw error
      return data || {}
    },
    enabled: !!orgId && !!targetId,
    staleTime: 5 * 60_000, // 5 min — données financières pas ultra-temps réel
  })
}

// ─── APPLIQUER LE CALCUL AUTO AU PROCESSUS ───────────────────
// Met à jour offboarding_processes avec les valeurs calculées
export function useApplySettlementToProcess() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ processId, settlement }) => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .update({
          paid_leave_balance: settlement.cp_balance    || 0,
          rtt_balance:        settlement.rtt_balance   || 0,
          final_amount:       settlement.total_amount  || 0,
        })
        .eq('id', processId)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { processId }) => {
      qc.invalidateQueries({ queryKey: ['offboarding_process', processId] })
      qc.invalidateQueries({ queryKey: ['offboarding_processes', orgId] })
      qc.invalidateQueries({ queryKey: ['offboarding_dashboard', orgId] })
    },
  })
}

// ─── AUTO-CRÉATION OFFBOARDING DEPUIS DÉPART ─────────────────
// Appelle le RPC auto_create_offboarding pour un departure_id donné
// Utile pour les départs créés avant l'activation du trigger S85

export function useAutoCreateOffboarding() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async (departureId) => {
      const { data, error } = await supabase
        .rpc('auto_create_offboarding', { p_departure_id: departureId })
      if (error) throw error
      return data // process_id UUID
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offboarding_processes', orgId] })
      qc.invalidateQueries({ queryKey: ['offboarding_dashboard', orgId] })
    },
  })
}

// ─── VÉRIFIER SI UN DÉPART A UN PROCESSUS ────────────────────
// Retourne le processus lié à un departure_id (ou null)

export function useOffboardingByDeparture(departureId) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['offboarding_by_departure', departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .select(`
          id, status, exit_date, final_amount,
          user:users!offboarding_processes_user_id_fkey(id, first_name, last_name)
        `)
        .eq('organization_id', orgId)
        .eq('departure_id', departureId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!departureId && !!orgId,
  })
}

// ─── COMPLÉTER UN PROCESSUS ───────────────────────────────────
// Marque un processus comme terminé avec date de paiement du solde

export function useCompleteOffboarding() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const orgId = profile?.organization_id

  return useMutation({
    mutationFn: async ({ id, finalAmountPaidAt }) => {
      const { data, error } = await supabase
        .from('offboarding_processes')
        .update({
          status: 'completed',
          final_amount_paid_at: finalAmountPaidAt || new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['offboarding_processes', orgId] })
      qc.invalidateQueries({ queryKey: ['offboarding_process', id] })
      qc.invalidateQueries({ queryKey: ['offboarding_dashboard', orgId] })
    },
  })
}
