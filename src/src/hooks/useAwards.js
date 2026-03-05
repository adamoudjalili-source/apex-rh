// ============================================================
// APEX RH — useAwards.js
// ✅ Session 24 — Hook awards mensuels PULSE (Phase E)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── TYPES D'AWARDS ──────────────────────────────────────────
export const AWARD_TYPES = {
  star_of_month:  { key: 'star_of_month',  label: 'Star du Mois',     icon: '🥇', color: '#C9A227' },
  top_delivery:   { key: 'top_delivery',   label: 'Top Delivery',     icon: '🎯', color: '#3B82F6' },
  most_improved:  { key: 'most_improved',  label: 'Most Improved',    icon: '📈', color: '#10B981' },
  lowest_performer: { key: 'lowest_performer', label: 'À surveiller', icon: '⚠', color: '#EF4444', confidential: true },
}

// ─── AWARDS D'UN MOIS DONNÉ ──────────────────────────────────
/**
 * Récupère les awards pour un mois/année donné.
 * @param {number} year  — ex: 2025
 * @param {number} month — 1–12
 */
export function useMonthlyAwards(year, month) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'awards', year, month],
    queryFn: async () => {
      if (!year || !month) return []

      const { data, error } = await supabase
        .from('monthly_awards')
        .select(`
          *,
          user:users!monthly_awards_user_id_fkey(
            id, first_name, last_name, role,
            services(id, name)
          )
        `)
        .eq('award_year',  year)
        .eq('award_month', month)
        .order('award_type', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id && !!year && !!month,
    staleTime: 120000,
  })
}

// ─── HALL OF FAME (tous les mois disponibles) ────────────────
/**
 * Récupère les awards de tous les mois, groupés par mois.
 * Retourne un tableau trié du plus récent au plus ancien.
 */
export function useHallOfFame(limit = 12) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'hall-of-fame', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_awards')
        .select(`
          *,
          user:users!monthly_awards_user_id_fkey(
            id, first_name, last_name, role,
            services(id, name)
          )
        `)
        .order('award_year',  { ascending: false })
        .order('award_month', { ascending: false })
        .limit(limit * 4) // 4 awards par mois max

      if (error) throw error

      // Grouper par année/mois
      const grouped = {}
      for (const award of data || []) {
        const key = `${award.award_year}-${String(award.award_month).padStart(2, '0')}`
        if (!grouped[key]) {
          grouped[key] = {
            year:  award.award_year,
            month: award.award_month,
            key,
            awards: [],
          }
        }
        grouped[key].awards.push(award)
      }

      return Object.values(grouped)
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year
          return b.month - a.month
        })
        .slice(0, limit)
    },
    enabled: !!profile?.id,
    staleTime: 300000,
  })
}

// ─── AWARDS DE L'UTILISATEUR CONNECTÉ ───────────────────────
/**
 * Récupère les awards reçus par l'utilisateur courant
 */
export function useMyAwards() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'my-awards', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('monthly_awards')
        .select('*')
        .eq('user_id', profile.id)
        .order('award_year',  { ascending: false })
        .order('award_month', { ascending: false })

      if (error) throw error
      return (data || []).filter(a => a.award_type !== 'lowest_performer')
    },
    enabled: !!profile?.id,
    staleTime: 120000,
  })
}

// ─── CALCUL DES CANDIDATS (côté client) ──────────────────────
/**
 * Calcule les lauréats potentiels à partir du leaderboard.
 * À utiliser dans Awards.jsx pour prévisualiser avant attribution.
 *
 * @param {Array} leaderboard — résultat de buildLeaderboard()
 * @param {Array} teamScores  — scores bruts de toute l'équipe
 * @param {Array} prevLeaderboard — leaderboard du mois précédent (pour Most Improved)
 * @returns {Object} { star_of_month, top_delivery, most_improved, lowest_performer }
 */
export function computeAwardCandidates(leaderboard, teamScores = [], prevLeaderboard = []) {
  if (!leaderboard.length) return {}

  // ── Star of Month : meilleur avgTotal avec min 15 jours ──
  const eligibleStar = leaderboard.filter(u => u.daysCount >= 15)
  const starOfMonth = eligibleStar.length > 0 ? eligibleStar[0] : null

  // ── Top Delivery : meilleur avgDelivery avec min 10 jours ──
  // On considère aussi le nb de tâches dans les scores (score_delivery > 0 implique des tâches)
  const eligibleDelivery = leaderboard.filter(u => u.daysCount >= 10)
  const topDelivery = eligibleDelivery.length > 0
    ? [...eligibleDelivery].sort((a, b) => b.avgDelivery - a.avgDelivery)[0]
    : null

  // ── Most Improved : plus grande progression vs mois précédent, min 10 jours ──
  let mostImproved = null
  if (prevLeaderboard.length > 0) {
    const eligible = leaderboard.filter(u => u.daysCount >= 10)
    const withProgress = eligible.map(u => {
      const prev = prevLeaderboard.find(p => p.userId === u.userId)
      const prevScore = prev?.avgTotal ?? 0
      return { ...u, improvement: u.avgTotal - prevScore }
    })
    withProgress.sort((a, b) => b.improvement - a.improvement)
    mostImproved = withProgress.length > 0 && withProgress[0].improvement > 0
      ? withProgress[0]
      : null
  }

  // ── Lowest Performer : score le plus bas, min 10 jours (confidentiel) ──
  const eligibleLowest = leaderboard.filter(u => u.daysCount >= 10)
  const lowestPerformer = eligibleLowest.length > 0
    ? eligibleLowest[eligibleLowest.length - 1]
    : null

  return { star_of_month: starOfMonth, top_delivery: topDelivery, most_improved: mostImproved, lowest_performer: lowestPerformer }
}

// ─── MUTATION : ATTRIBUER UN AWARD ───────────────────────────
/**
 * Attribue (upsert) un award mensuel à un utilisateur
 */
export function useGrantAward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, awardType, awardYear, awardMonth, notes, scoreSnapshot }) => {
      const { data, error } = await supabase
        .from('monthly_awards')
        .upsert({
          user_id:        userId,
          award_type:     awardType,
          award_year:     awardYear,
          award_month:    awardMonth,
          notes:          notes || null,
          score_snapshot: scoreSnapshot || null,
        }, { onConflict: 'award_type,award_year,award_month' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'awards', vars.awardYear, vars.awardMonth] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'hall-of-fame'] })
    },
  })
}

// ─── MUTATION : SUPPRIMER UN AWARD ───────────────────────────
export function useRevokeAward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ awardId, awardYear, awardMonth }) => {
      const { error } = await supabase
        .from('monthly_awards')
        .delete()
        .eq('id', awardId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pulse', 'awards', vars.awardYear, vars.awardMonth] })
      queryClient.invalidateQueries({ queryKey: ['pulse', 'hall-of-fame'] })
    },
  })
}

// ─── HELPERS ─────────────────────────────────────────────────
export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function formatAwardMonth(year, month) {
  return `${MONTH_NAMES_FR[month - 1]} ${year}`
}
