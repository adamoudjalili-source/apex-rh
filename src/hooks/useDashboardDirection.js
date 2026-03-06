// ============================================================
// APEX RH — src/hooks/useDashboardDirection.js
// Session 48 — Dashboard Direction Générale
// KPIs stratégiques, scorecard RAG, tendances 12 mois, OKR strat.
// Accès : isAdmin || isDirecteur || isDirection
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase }  from '../lib/supabase'
import { getLastNMonthKeys } from './useAnalytics'

// ─── HOOK 1 : Scorecard stratégique (KPIs RAG) ───────────────

export function useDirectionScorecard() {
  return useQuery({
    queryKey: ['direction_scorecard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_direction_scorecard')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data || {}
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 2 : Tendances 12 mois globales ─────────────────────

export function useDirectionTrend12m() {
  return useQuery({
    queryKey: ['direction_trend_12m'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_direction_trend_12m')
        .select('*')
        .order('month_key', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 3 : OKR Stratégiques ───────────────────────────────

export function useDirectionOKR() {
  return useQuery({
    queryKey: ['direction_okr_strategiques'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_direction_okr_strategiques')
        .select('*')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

// ─── HOOK 4 : ROI RH — indicateurs business ──────────────────
// Construit côté client depuis les données déjà disponibles

export function useDirectionROI() {
  return useQuery({
    queryKey: ['direction_roi'],
    queryFn: async () => {
      const monthKeys = getLastNMonthKeys(6)
      const curMonth  = monthKeys[monthKeys.length - 1]
      const prevMonth = monthKeys[monthKeys.length - 2]

      // Agents actifs total
      const { data: usersData } = await supabase
        .from('users')
        .select('id, role, is_active, division_id')
        .eq('is_active', true)

      const totalAgents = (usersData || []).filter(u => u.role === 'collaborateur').length

      // Agents avec score PULSE ce mois
      const { data: pulseActive } = await supabase
        .from('performance_scores')
        .select('user_id')
        .eq('TO_CHAR(score_date::date,\'YYYY-MM\')', curMonth)
        .not('score_total', 'is', null)

      // OKR completion taux par niveau
      const { data: okrData } = await supabase
        .from('objectives')
        .select('level, status, progress_score')
        .not('status', 'in', '("brouillon","archive")')

      const okrByLevel = {}
      ;(okrData || []).forEach(o => {
        if (!okrByLevel[o.level]) okrByLevel[o.level] = { total: 0, sum: 0, completed: 0 }
        okrByLevel[o.level].total++
        okrByLevel[o.level].sum += o.progress_score || 0
        if (o.status === 'valide') okrByLevel[o.level].completed++
      })

      const okrStrategique = okrByLevel['strategique'] || { total: 0, sum: 0, completed: 0 }
      const okrTotal = Object.values(okrByLevel).reduce((s, v) => ({ total: s.total + v.total, sum: s.sum + v.sum, completed: s.completed + v.completed }), { total: 0, sum: 0, completed: 0 })

      // F360 courant
      const { data: f360Data } = await supabase
        .from('feedback_requests')
        .select('status')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 3600_000).toISOString())

      const f360Total = (f360Data || []).length
      const f360Done  = (f360Data || []).filter(r => r.status === 'completed').length

      // PDI actions (développement)
      const { data: pdiData } = await supabase
        .from('pdi_actions')
        .select('status')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 3600_000).toISOString())

      const pdiTotal  = (pdiData || []).length
      const pdiDone   = (pdiData || []).filter(p => p.status === 'completed').length

      return {
        totalAgents,
        // Taux couverture PULSE (% agents mesurés ce mois)
        tauxCouverturePulse: totalAgents
          ? Math.round(((pulseActive || []).length / totalAgents) * 100)
          : null,
        // OKR taux complétion global
        okrCompletionRate: okrTotal.total
          ? Math.round(okrTotal.completed * 100 / okrTotal.total)
          : null,
        okrAvgProgress: okrTotal.total
          ? Math.round(okrTotal.sum / okrTotal.total)
          : null,
        // OKR stratégiques taux
        okrStratCompletionRate: okrStrategique.total
          ? Math.round(okrStrategique.completed * 100 / okrStrategique.total)
          : null,
        okrStratAvgProgress: okrStrategique.total
          ? Math.round(okrStrategique.sum / okrStrategique.total)
          : null,
        okrStratTotal: okrStrategique.total,
        // F360
        f360Rate: f360Total ? Math.round(f360Done * 100 / f360Total) : null,
        f360Total,
        // PDI / Développement
        pdiRate: pdiTotal ? Math.round(pdiDone * 100 / pdiTotal) : null,
        pdiTotal,
        pdiDone,
      }
    },
    staleTime: 10 * 60_000,
    retry: 1,
  })
}

// ─── HELPER : calcul statut RAG ──────────────────────────────

export function ragStatus(value, thresholds) {
  // thresholds: { green, amber } — valeurs min pour chaque niveau
  if (value === null || value === undefined) return 'grey'
  if (value >= thresholds.green) return 'green'
  if (value >= thresholds.amber) return 'amber'
  return 'red'
}

export const RAG_COLORS = {
  green: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  text: '#10B981', dot: '#10B981',  label: 'Bon' },
  amber: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  text: '#F59E0B', dot: '#F59E0B',  label: 'À surveiller' },
  red:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   text: '#EF4444', dot: '#EF4444',  label: 'Attention' },
  grey:  { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)', text: '#9CA3AF', dot: '#6B7280',  label: '—' },
}

// Seuils métier par indicateur
export const KPI_THRESHOLDS = {
  pulse:          { green: 70, amber: 55 },
  nita:           { green: 65, amber: 50 },
  okr_progress:   { green: 70, amber: 45 },
  taux_activite:  { green: 80, amber: 60 },
  f360_rate:      { green: 75, amber: 50 },
  pdi_rate:       { green: 60, amber: 35 },
}
