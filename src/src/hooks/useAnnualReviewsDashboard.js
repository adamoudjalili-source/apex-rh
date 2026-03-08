// ============================================================
// APEX RH — src/hooks/useAnnualReviewsDashboard.js
// Session 62 — Tableau de bord entretiens annuels enrichi
// Multi-années · Heatmap divisions · Tendances · Progressions
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import {
  OVERALL_RATING_LABELS,
  OVERALL_RATING_COLORS,
  OVERALL_RATING_SCORES,
  SALARY_RECOMMENDATION_LABELS,
} from './useAnnualReviews'

// ─── CONSTANTES ──────────────────────────────────────────────

export const RATING_ORDER = [
  'excellent',
  'bien',
  'satisfaisant',
  'a_ameliorer',
  'insuffisant',
]

export const RATING_SCORE_MAP = {
  excellent:    5,
  bien:         4,
  satisfaisant: 3,
  a_ameliorer:  2,
  insuffisant:  1,
}

export const HEATMAP_COLORS = {
  // Score 1–5 → couleur
  5: '#10B981',
  4: '#3B82F6',
  3: '#F59E0B',
  2: '#F97316',
  1: '#EF4444',
}

export const TREND_COLORS = {
  completion:  '#818CF8',
  signature:   '#10B981',
  avgRating:   '#F59E0B',
  excellent:   '#10B981',
  bien:        '#3B82F6',
  satisfaisant:'#F59E0B',
  a_ameliorer: '#F97316',
  insuffisant: '#EF4444',
}

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Score moyen → couleur
 */
export function scoreToHeatmapColor(score) {
  if (!score) return 'rgba(255,255,255,0.04)'
  if (score >= 4.5) return 'rgba(16,185,129,0.25)'
  if (score >= 3.5) return 'rgba(59,130,246,0.25)'
  if (score >= 2.5) return 'rgba(245,158,11,0.25)'
  if (score >= 1.5) return 'rgba(249,115,22,0.25)'
  return 'rgba(239,68,68,0.25)'
}

export function scoreToTextColor(score) {
  if (!score) return '#ffffff40'
  if (score >= 4.5) return '#10B981'
  if (score >= 3.5) return '#3B82F6'
  if (score >= 2.5) return '#F59E0B'
  if (score >= 1.5) return '#F97316'
  return '#EF4444'
}

/**
 * Retourne le label emoji + texte pour un score numérique
 */
export function scoreToLabel(score) {
  if (!score) return '—'
  if (score >= 4.5) return 'Excellent'
  if (score >= 3.5) return 'Bien'
  if (score >= 2.5) return 'Satisfaisant'
  if (score >= 1.5) return 'À améliorer'
  return 'Insuffisant'
}

/**
 * Calcule la tendance entre deux valeurs (hausse / baisse / stable)
 */
export function computeTrend(current, previous) {
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined) return null
  const delta = current - previous
  if (Math.abs(delta) < 0.05) return { direction: 'stable', delta: 0 }
  return { direction: delta > 0 ? 'up' : 'down', delta }
}

/**
 * Calcule la variation en % entre deux valeurs
 */
export function computeVariationPct(current, previous) {
  if (!previous || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

/**
 * Retourne la distribution rating sous forme de tableau ordonné
 */
export function extractRatingDistribution(row) {
  if (!row) return []
  return RATING_ORDER.map(key => ({
    key,
    label: OVERALL_RATING_LABELS[key],
    color: OVERALL_RATING_COLORS[key],
    count: row[`rating_${key.replace('a_ameliorer', 'a_ameliorer')}`] ?? 0,
  }))
}

/**
 * Calcule le score moyen pondéré d'une distribution
 */
export function computeWeightedAvgFromRow(row) {
  if (!row || !row.total_reviews || row.total_reviews === 0) return null
  const total =
    (row.rating_excellent    || 0) * 5 +
    (row.rating_bien         || 0) * 4 +
    (row.rating_satisfaisant || 0) * 3 +
    (row.rating_a_ameliorer  || 0) * 2 +
    (row.rating_insuffisant  || 0) * 1
  const rated =
    (row.rating_excellent    || 0) +
    (row.rating_bien         || 0) +
    (row.rating_satisfaisant || 0) +
    (row.rating_a_ameliorer  || 0) +
    (row.rating_insuffisant  || 0)
  if (!rated) return null
  return Math.round((total / rated) * 100) / 100
}

/**
 * Formate un score avec une décimale
 */
export function formatScore(score) {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

/**
 * Calcule le taux de top performers (excellent + bien)
 */
export function computeTopPerformerPct(row) {
  if (!row) return null
  const top = (row.rating_excellent || 0) + (row.rating_bien || 0)
  const rated =
    (row.rating_excellent    || 0) +
    (row.rating_bien         || 0) +
    (row.rating_satisfaisant || 0) +
    (row.rating_a_ameliorer  || 0) +
    (row.rating_insuffisant  || 0)
  if (!rated) return null
  return Math.round((top / rated) * 100)
}

/**
 * Retourne les n dernières années présentes dans les données
 */
export function getRecentYears(trends, n = 5) {
  if (!trends?.length) return []
  return [...trends]
    .sort((a, b) => b.year - a.year)
    .slice(0, n)
    .sort((a, b) => a.year - b.year)
}

/**
 * Génère les points SVG pour un line chart simple (width × height)
 */
export function buildLinePoints(data, key, width, height, padding = 24) {
  if (!data?.length) return ''
  const values = data.map(d => d[key]).filter(v => v !== null && v !== undefined)
  if (!values.length) return ''
  const min   = Math.min(...values)
  const max   = Math.max(...values)
  const range = max - min || 1
  const w     = width  - padding * 2
  const h     = height - padding * 2
  return data
    .filter(d => d[key] !== null && d[key] !== undefined)
    .map((d, i, arr) => {
      const x = padding + (i / Math.max(arr.length - 1, 1)) * w
      const y = padding + h - ((d[key] - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')
}

/**
 * Normalise le taux de complétion pour l'affichage
 */
export function normalizeCompletionRate(rate) {
  if (rate === null || rate === undefined) return 0
  return Math.min(100, Math.max(0, rate))
}

// ─── HOOKS ───────────────────────────────────────────────────

/**
 * Tendances multi-années pour l'organisation courante
 */
export function useMultiYearTrends() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['annual-multiyear-trends', orgId],
    enabled:  !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_annual_multiyear_trends')
        .select('*')
        .eq('organization_id', orgId)
        .order('year', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Heatmap divisions × années
 */
export function useDivisionHeatmap() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['annual-division-heatmap', orgId],
    enabled:  !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_annual_division_heatmap')
        .select('*')
        .eq('organization_id', orgId)
        .order('year', { ascending: true })

      if (error) throw error

      // Restructure en { divisions: [], years: [], matrix: {div_id: {year: row}} }
      const years     = [...new Set(data.map(r => r.year))].sort()
      const divMap    = new Map()
      const matrix    = {}

      data.forEach(row => {
        if (!divMap.has(row.division_id)) {
          divMap.set(row.division_id, row.division_name)
        }
        if (!matrix[row.division_id]) matrix[row.division_id] = {}
        matrix[row.division_id][row.year] = row
      })

      const divisions = [...divMap.entries()].map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name?.localeCompare(b.name))

      return { divisions, years, matrix, raw: data }
    },
  })
}

/**
 * Progression individuelle des ratings (pour scatter / trajectory)
 */
export function useRatingProgression(year = null) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['annual-rating-progression', orgId, year],
    enabled:  !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('mv_annual_rating_progression')
        .select('*')
        .eq('organization_id', orgId)

      if (year) q = q.eq('year', year)
      q = q.order('year', { ascending: true })

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Statistiques complètes de toutes les campagnes (MV S60 existante)
 * pour comparaison inter-campagnes enrichie
 */
export function useAllCampaignsStats() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['annual-all-campaigns-stats', orgId],
    enabled:  !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_annual_campaign_stats')
        .select('*')
        .eq('organization_id', orgId)
        .order('year', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Comparaison côte-à-côte de deux campagnes
 */
export function useCampaignComparison(campaignIdA, campaignIdB) {
  const { profile } = useAuth()
  const orgId = profile?.organization_id

  return useQuery({
    queryKey: ['annual-campaign-comparison', orgId, campaignIdA, campaignIdB],
    enabled:  !!orgId && !!campaignIdA && !!campaignIdB,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_annual_campaign_stats')
        .select('*')
        .eq('organization_id', orgId)
        .in('campaign_id', [campaignIdA, campaignIdB])

      if (error) throw error

      const a = data.find(r => r.campaign_id === campaignIdA) ?? null
      const b = data.find(r => r.campaign_id === campaignIdB) ?? null

      return {
        a,
        b,
        deltas: a && b ? {
          completion_rate: ((b.completion_rate ?? 0) - (a.completion_rate ?? 0)),
          signature_rate:  ((b.signed_count / Math.max(b.total_reviews, 1) * 100) -
                            (a.signed_count / Math.max(a.total_reviews, 1) * 100)),
          avg_rating: (computeWeightedAvgFromRow(b) ?? 0) - (computeWeightedAvgFromRow(a) ?? 0),
          total_reviews: (b.total_reviews ?? 0) - (a.total_reviews ?? 0),
        } : null,
      }
    },
  })
}

/**
 * KPIs enrichis pour l'année courante vs N-1
 */
export function useYearOverYearKPIs(currentYear = new Date().getFullYear()) {
  const { data: trends = [], isLoading } = useMultiYearTrends()

  const current  = trends.find(t => t.year === currentYear)  ?? null
  const previous = trends.find(t => t.year === currentYear - 1) ?? null

  const kpis = {
    completion: {
      current:  current?.completion_rate  ?? null,
      previous: previous?.completion_rate ?? null,
      trend: computeTrend(current?.completion_rate, previous?.completion_rate),
    },
    signature: {
      current:  current?.signature_rate  ?? null,
      previous: previous?.signature_rate ?? null,
      trend: computeTrend(current?.signature_rate, previous?.signature_rate),
    },
    avgRating: {
      current:  current?.avg_rating_score  ?? null,
      previous: previous?.avg_rating_score ?? null,
      trend: computeTrend(current?.avg_rating_score, previous?.avg_rating_score),
    },
    totalReviews: {
      current:  current?.total_reviews  ?? null,
      previous: previous?.total_reviews ?? null,
      trend: computeTrend(current?.total_reviews, previous?.total_reviews),
    },
    topPerformers: {
      current:  computeTopPerformerPct(current),
      previous: computeTopPerformerPct(previous),
      trend: computeTrend(computeTopPerformerPct(current), computeTopPerformerPct(previous)),
    },
  }

  return { kpis, isLoading, currentYearData: current, previousYearData: previous }
}
