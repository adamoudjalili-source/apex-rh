// ============================================================
// APEX RH — src/hooks/useReporting.js
// Session 44 — Reporting Automatisé IA
// ⚠️ NE PAS modifier useTasks.js, usePulse.js, useIPR.js
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── HELPERS ─────────────────────────────────────────────────

export function currentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function previousYearMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function formatPeriodLabel(year, month, week = null) {
  if (week) {
    return `Semaine ${week} — ${year}`
  }
  const months = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ]
  return `${months[(month ?? 1) - 1]} ${year}`
}

export function currentWeek() {
  const now  = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
  return { year: now.getFullYear(), week }
}

// ─── LIRE MES RAPPORTS (collaborateur) ───────────────────────

export function useMyReports(limit = 6) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ai-reports', 'my', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', profile.id)
        .eq('report_type', 'monthly_individual')
        .order('generated_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── LIRE RAPPORTS ÉQUIPE (manager) ──────────────────────────

export function useTeamReports(serviceId, limit = 6) {
  return useQuery({
    queryKey: ['ai-reports', 'team', serviceId],
    queryFn: async () => {
      if (!serviceId) return []
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('service_id', serviceId)
        .order('generated_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── GÉNÉRER UN RAPPORT (Edge Function) ──────────────────────

export function useGenerateReport() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ reportType, serviceId, userId, year, month, week } = {}) => {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          report_type : reportType,
          service_id  : serviceId ?? null,
          user_id     : userId ?? profile?.id,
          year,
          month       : month ?? null,
          week        : week  ?? null,
        },
      })
      if (error) throw new Error(error.message ?? 'Erreur Edge Function generate-report')
      if (!data?.success) throw new Error(data?.error ?? 'Rapport non généré')
      return data.report
    },
    onSuccess: (_, vars) => {
      if (vars.serviceId) {
        queryClient.invalidateQueries({ queryKey: ['ai-reports', 'team', vars.serviceId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['ai-reports', 'my', profile?.id] })
      }
    },
  })
}

// ─── SUPPRIMER UN RAPPORT ─────────────────────────────────────

export function useDeleteReport() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ reportId }) => {
      const { error } = await supabase
        .from('ai_reports')
        .delete()
        .eq('id', reportId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports'] })
    },
  })
}
