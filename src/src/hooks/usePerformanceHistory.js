// ============================================================
// APEX RH — usePerformanceHistory.js  ·  Session 40
// Historique performance 12 mois + comparatif mois
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── Helpers dates ───────────────────────────────────────────
const isoDate = d => d.toISOString().split('T')[0]
const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`

const MONTH_LABELS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// ─── useMonthlyHistory ───────────────────────────────────────
/**
 * Historique mensuel (12 mois) pour un utilisateur.
 * Retourne un tableau de 12 entrées avec :
 *   { month: 'Jan', year: 2025, avg: 72, delivery: 68, quality: 75, regularity: 80, bonus: 60, daysCount: 18 }
 */
export function useMonthlyHistory(userId) {
  const { profile } = useAuth()
  const targetId = userId || profile?.id

  return useQuery({
    queryKey: ['perf-history', 'monthly12', targetId],
    queryFn: async () => {
      if (!targetId) return []

      const today = new Date()
      const startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1)

      const { data, error } = await supabase
        .from('performance_scores')
        .select('score_total, score_delivery, score_quality, score_regularity, score_bonus, score_date')
        .eq('user_id', targetId)
        .eq('score_period', 'daily')
        .gte('score_date', isoDate(startDate))
        .order('score_date', { ascending: true })

      if (error) throw error
      if (!data?.length) return buildEmptyMonths()

      // Grouper par mois
      const byMonth = {}
      for (const row of data) {
        const d = new Date(row.score_date)
        const key = monthKey(d)
        if (!byMonth[key]) {
          byMonth[key] = { key, year: d.getFullYear(), month: d.getMonth(), rows: [] }
        }
        byMonth[key].rows.push(row)
      }

      // Construire les 12 mois (y compris les vides)
      return Array.from({ length: 12 }, (_, i) => {
        const d   = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
        const key = monthKey(d)
        const entry = byMonth[key]
        if (!entry || !entry.rows.length) {
          return {
            key, month: MONTH_LABELS_FR[d.getMonth()], year: d.getFullYear(),
            avg: null, delivery: null, quality: null, regularity: null, bonus: null,
            daysCount: 0, isEmpty: true
          }
        }
        const rows = entry.rows
        const avg  = k => Math.round(rows.reduce((s,r) => s+(r[k]||0),0)/rows.length)
        return {
          key,
          month:     MONTH_LABELS_FR[d.getMonth()],
          year:      d.getFullYear(),
          avg:       avg('score_total'),
          delivery:  avg('score_delivery'),
          quality:   avg('score_quality'),
          regularity:avg('score_regularity'),
          bonus:     avg('score_bonus'),
          daysCount: rows.length,
          isEmpty:   false,
        }
      })
    },
    enabled: !!targetId,
    staleTime: 300000,
  })
}

function buildEmptyMonths() {
  const today = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
    return {
      key: monthKey(d), month: MONTH_LABELS_FR[d.getMonth()], year: d.getFullYear(),
      avg: null, delivery: null, quality: null, regularity: null, bonus: null,
      daysCount: 0, isEmpty: true
    }
  })
}

// ─── useMonthComparison ──────────────────────────────────────
/**
 * Compare mois courant vs mois précédent.
 * Retourne { current, previous, delta, deltaDelivery, deltaQuality, ... }
 */
export function useMonthComparison(userId) {
  const { profile } = useAuth()
  const targetId = userId || profile?.id

  return useQuery({
    queryKey: ['perf-history', 'comparison', targetId],
    queryFn: async () => {
      if (!targetId) return null

      const today = new Date()
      const currStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1))
      const prevStart = isoDate(new Date(today.getFullYear(), today.getMonth()-1, 1))
      const prevEnd   = isoDate(new Date(today.getFullYear(), today.getMonth(), 0))

      const [{ data: currRows }, { data: prevRows }] = await Promise.all([
        supabase.from('performance_scores')
          .select('score_total,score_delivery,score_quality,score_regularity,score_bonus')
          .eq('user_id', targetId).eq('score_period','daily')
          .gte('score_date', currStart),
        supabase.from('performance_scores')
          .select('score_total,score_delivery,score_quality,score_regularity,score_bonus')
          .eq('user_id', targetId).eq('score_period','daily')
          .gte('score_date', prevStart).lte('score_date', prevEnd),
      ])

      const avg = (rows, key) => rows?.length
        ? Math.round(rows.reduce((s,r)=>s+(r[key]||0),0)/rows.length) : null

      const current  = { avg: avg(currRows,'score_total'), delivery: avg(currRows,'score_delivery'), quality: avg(currRows,'score_quality'), regularity: avg(currRows,'score_regularity'), bonus: avg(currRows,'score_bonus'), days: currRows?.length||0 }
      const previous = { avg: avg(prevRows,'score_total'), delivery: avg(prevRows,'score_delivery'), quality: avg(prevRows,'score_quality'), regularity: avg(prevRows,'score_regularity'), bonus: avg(prevRows,'score_bonus'), days: prevRows?.length||0 }

      const delta = key => (current[key] !== null && previous[key] !== null)
        ? current[key] - previous[key] : null

      return {
        current,
        previous,
        delta:         delta('avg'),
        deltaDelivery: delta('delivery'),
        deltaQuality:  delta('quality'),
        deltaRegularity: delta('regularity'),
        deltaBonus:    delta('bonus'),
      }
    },
    enabled: !!targetId,
    staleTime: 300000,
  })
}

// ─── useAdoptionSummary ───────────────────────────────────────
/**
 * Résumé d'adoption de l'application (vue admin/manager).
 * Lit la vue v_adoption_summary.
 */
export function useAdoptionSummary() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['adoption', 'summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_adoption_summary')
        .select('*')
        .order('active_days_30', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 120000,
  })
}

// ─── logPageVisit ─────────────────────────────────────────────
/**
 * Log une visite de page pour les métriques d'adoption.
 * Appel silencieux, ne bloque pas le rendu.
 */
export async function logPageVisit(userId, page) {
  if (!userId || !page) return
  try {
    await supabase.from('app_usage_logs').insert({ user_id: userId, page })
  } catch (_) {
    // silencieux
  }
}
