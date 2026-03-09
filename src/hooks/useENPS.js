// ============================================================
// APEX RH — src/hooks/useENPS.js
// Session 55 — eNPS Enrichi
// Calcul auto depuis survey_responses.scores.enps
// Segmentation cohortes + évolution mensuelle + benchmark
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getLastNMonthKeys } from './useAnalytics'

// ─── CONSTANTES ──────────────────────────────────────────────

// Benchmark sectoriel (secteur public / administration)
export const ENPS_BENCHMARK = {
  sector_avg:  12,
  top_quartile: 35,
  bottom_quartile: -15,
}

export const ENPS_ZONE_CONFIG = {
  excellent:   { min: 50,   label: 'Excellent',   color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  good:        { min: 20,   label: 'Bon',          color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  acceptable:  { min: 0,    label: 'Acceptable',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  concerning:  { min: -30,  label: 'Préoccupant',  color: '#F97316', bg: 'rgba(249,115,22,0.1)'  },
  critical:    { min: -100, label: 'Critique',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
}

export function getEnpsZone(score) {
  if (score === null || score === undefined) return null
  if (score >= 50)  return ENPS_ZONE_CONFIG.excellent
  if (score >= 20)  return ENPS_ZONE_CONFIG.good
  if (score >= 0)   return ENPS_ZONE_CONFIG.acceptable
  if (score >= -30) return ENPS_ZONE_CONFIG.concerning
  return ENPS_ZONE_CONFIG.critical
}

export const SENIORITY_LABELS = {
  '< 1 an':  { order: 1, color: '#8B5CF6' },
  '1–3 ans': { order: 2, color: '#6366F1' },
  '3–5 ans': { order: 3, color: '#3B82F6' },
  '5 ans+':  { order: 4, color: '#06B6D4' },
}

export const ROLE_LABELS = {
  collaborateur: { label: 'Collaborateur', color: '#6366F1' },
  chef_service:  { label: 'Chef de service', color: '#8B5CF6' },
  chef_division: { label: 'Chef de division', color: '#A78BFA' },
  directeur:     { label: 'Directeur', color: '#EC4899' },
}

// ─── HOOK 1 : eNPS d'un survey spécifique ────────────────────

export function useSurveyENPS(surveyId) {
  return useQuery({
    queryKey: ['survey_enps', surveyId],
    queryFn: async () => {
      if (!surveyId) return null

      const { data, error } = await supabase
        .rpc('compute_enps', { p_survey_id: surveyId })
      if (error) throw error
      return data
    },
    enabled: !!surveyId,
    staleTime: 5 * 60_000,
  })
}

// ─── HOOK 2 : Évolution mensuelle eNPS (12 mois) ─────────────

export function useENPSTrend(months = 12) {
  const monthKeys = getLastNMonthKeys(months)
  return useQuery({
    queryKey: ['enps_trend', months],
    queryFn: async () => {
      // D'abord essaie le cache
      const { data: cached } = await supabase
        .from('enps_cache')
        .select('month_key, enps_score, promoters_count, passives_count, detractors_count, total_responses')
        .in('month_key', monthKeys)
        .order('month_key')

      if (cached && cached.length > 0) {
        return cached.map(row => ({
          month:      row.month_key,
          enps:       row.enps_score,
          promoters:  row.promoters_count,
          passives:   row.passives_count,
          detractors: row.detractors_count,
          total:      row.total_responses,
          benchmark:  ENPS_BENCHMARK.sector_avg,
        }))
      }

      // Fallback : calcul direct depuis la vue
      const { data, error } = await supabase
        .from('v_enps_monthly')
        .select('*')
        .in('month_key', monthKeys)
        .order('month_key')
      if (error) throw error

      return (data || []).map(row => ({
        month:      row.month_key,
        enps:       row.enps_score,
        promoters:  row.promoters,
        passives:   row.passives,
        detractors: row.detractors,
        total:      row.total_responses,
        benchmark:  ENPS_BENCHMARK.sector_avg,
      }))
    },
    staleTime: 10 * 60_000,
  })
}

// ─── HOOK 3 : eNPS du mois courant ───────────────────────────

export function useCurrentENPS() {
  const currentMonth = getLastNMonthKeys(1)[0]
  return useQuery({
    queryKey: ['current_enps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_enps_monthly')
        .select('*')
        .eq('month_key', currentMonth)
        .maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

// ─── HOOK 4 : Segmentation eNPS par cohorte ──────────────────

export function useENPSByDivision(monthKey) {
  return useQuery({
    queryKey: ['enps_by_division', monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_enps_by_cohort')
        .select('*')
        .eq('month_key', monthKey)
        .not('division_name', 'is', null)
        .order('enps_score', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!monthKey,
    staleTime: 5 * 60_000,
  })
}

export function useENPSBySeniority(monthKey) {
  return useQuery({
    queryKey: ['enps_by_seniority', monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_enps_by_cohort')
        .select('seniority_bracket, enps_score, total, promoters, detractors')
        .eq('month_key', monthKey)
        .not('seniority_bracket', 'is', null)
      if (error) throw error

      // Agréger par tranche d'ancienneté
      const grouped = {}
      ;(data || []).forEach(row => {
        const key = row.seniority_bracket
        if (!grouped[key]) grouped[key] = { total: 0, promoters: 0, detractors: 0 }
        grouped[key].total     += row.total
        grouped[key].promoters += row.promoters
        grouped[key].detractors += row.detractors
      })

      return Object.entries(grouped)
        .map(([bracket, vals]) => ({
          bracket,
          total:     vals.total,
          promoters: vals.promoters,
          detractors: vals.detractors,
          enps: vals.total > 0
            ? Math.round((vals.promoters / vals.total * 100) - (vals.detractors / vals.total * 100))
            : null,
        }))
        .sort((a, b) => (SENIORITY_LABELS[a.bracket]?.order || 99) - (SENIORITY_LABELS[b.bracket]?.order || 99))
    },
    enabled: !!monthKey,
    staleTime: 5 * 60_000,
  })
}

export function useENPSByRole(monthKey) {
  return useQuery({
    queryKey: ['enps_by_role', monthKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_enps_by_cohort')
        .select('user_role, enps_score, total, promoters, detractors')
        .eq('month_key', monthKey)
        .not('user_role', 'is', null)
      if (error) throw error

      const grouped = {}
      ;(data || []).forEach(row => {
        const key = row.user_role
        if (!grouped[key]) grouped[key] = { total: 0, promoters: 0, detractors: 0 }
        grouped[key].total     += row.total
        grouped[key].promoters += row.promoters
        grouped[key].detractors += row.detractors
      })

      return Object.entries(grouped)
        .map(([role, vals]) => ({
          role,
          label:     ROLE_LABELS[role]?.label || role,
          color:     ROLE_LABELS[role]?.color || '#6B7280',
          total:     vals.total,
          promoters: vals.promoters,
          detractors: vals.detractors,
          enps: vals.total > 0
            ? Math.round((vals.promoters / vals.total * 100) - (vals.detractors / vals.total * 100))
            : null,
        }))
        .filter(r => r.total > 0)
    },
    enabled: !!monthKey,
    staleTime: 5 * 60_000,
  })
}

// ─── HOOK 5 : Rafraîchir le cache eNPS ───────────────────────

export function useRefreshENPSCache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_enps_cache')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enps_trend'] })
      qc.invalidateQueries({ queryKey: ['current_enps'] })
      qc.invalidateQueries({ queryKey: ['enps_cache'] })
    },
  })
}

// ─── UTILITAIRE : formater un score eNPS ─────────────────────

export function formatENPS(score) {
  if (score === null || score === undefined) return '—'
  return score > 0 ? `+${score}` : `${score}`
}

// ─── UTILITAIRE : calculer eNPS depuis un array de réponses ──

export function computeLocalENPS(responses) {
  if (!responses || responses.length === 0) {
    return { enps: null, promoters: 0, passives: 0, detractors: 0, total: 0 }
  }
  let promoters = 0, passives = 0, detractors = 0
  const withEnps = responses.filter(r => r.scores?.enps != null)

  withEnps.forEach(r => {
    const score = Number(r.scores.enps)
    if (score >= 9) promoters++
    else if (score >= 7) passives++
    else detractors++
  })

  const total = withEnps.length
  if (total === 0) return { enps: null, promoters, passives, detractors, total: 0 }

  const enps = Math.round((promoters / total * 100) - (detractors / total * 100))
  return { enps, promoters, passives, detractors, total }
}
