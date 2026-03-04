// ============================================================
// APEX RH — usePerformanceScores.js
// ✅ Session 23 — Hook scores de performance PULSE (Phase C)
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── HELPERS DATES ───────────────────────────────────────────
/**
 * Retourne { startDate, endDate } pour une période donnée
 * @param {'week'|'month'|'quarter'} period
 */
export function getPeriodDates(period) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  if (period === 'week') {
    // Lundi de la semaine courante
    const day = today.getDay() // 0=dim, 1=lun...
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: todayStr,
    }
  }

  if (period === 'month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: todayStr,
    }
  }

  if (period === 'quarter') {
    const past90 = new Date(today)
    past90.setDate(today.getDate() - 90)
    return {
      startDate: past90.toISOString().split('T')[0],
      endDate: todayStr,
    }
  }

  // Par défaut : ce mois
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: todayStr,
  }
}

// ─── HISTORIQUE SCORES D'UN UTILISATEUR ──────────────────────
/**
 * Récupère les scores journaliers d'un utilisateur sur une période.
 * Si userId est null, utilise l'utilisateur connecté.
 */
export function useUserScoreHistory(userId, startDate, endDate) {
  const { profile } = useAuth()
  const targetId = userId || profile?.id

  return useQuery({
    queryKey: ['pulse', 'score-history', targetId, startDate, endDate],
    queryFn: async () => {
      if (!targetId) return []

      const { data, error } = await supabase
        .from('performance_scores')
        .select('*')
        .eq('user_id', targetId)
        .eq('score_period', 'daily')
        .gte('score_date', startDate)
        .lte('score_date', endDate)
        .order('score_date', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!targetId && !!startDate && !!endDate,
    staleTime: 60000,
  })
}

// ─── SCORES DE TOUTE L'ÉQUIPE SUR UNE PÉRIODE ────────────────
/**
 * Récupère tous les scores journaliers de l'équipe avec infos utilisateur.
 * Résultat : tableau de scores avec user.first_name, user.last_name
 */
export function useTeamScoreHistory(startDate, endDate) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['pulse', 'team-score-history', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return []

      const { data, error } = await supabase
        .from('performance_scores')
        .select(`
          *,
          user:users!performance_scores_user_id_fkey(
            id, first_name, last_name, role,
            services(id, name),
            divisions(id, name)
          )
        `)
        .eq('score_period', 'daily')
        .gte('score_date', startDate)
        .lte('score_date', endDate)
        .order('score_date', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id && !!startDate && !!endDate,
    staleTime: 60000,
  })
}

// ─── CLASSEMENT (LEADERBOARD) ────────────────────────────────
/**
 * Calcule le classement des agents sur la période.
 * Retourne un tableau trié par score moyen décroissant, avec :
 * - userId, firstName, lastName, role, service
 * - avgTotal, avgDelivery, avgQuality, avgRegularity, avgBonus
 * - trend : différence de score par rapport à la période précédente
 * - daysCount : nombre de jours avec score
 */
export function useLeaderboard(startDate, endDate) {
  const { data: scores = [], isLoading, error } = useTeamScoreHistory(startDate, endDate)

  const leaderboard = buildLeaderboard(scores)

  return { data: leaderboard, isLoading, error }
}

/**
 * Calcule le classement à partir d'un tableau de scores bruts.
 * Exposé séparément pour être utilisé dans Board.jsx sans re-fetch.
 */
export function buildLeaderboard(scores) {
  if (!scores.length) return []

  // Grouper par utilisateur
  const byUser = {}
  for (const s of scores) {
    if (!s.user) continue
    const uid = s.user_id
    if (!byUser[uid]) {
      byUser[uid] = {
        userId: uid,
        firstName: s.user.first_name,
        lastName:  s.user.last_name,
        role:      s.user.role,
        service:   s.user.services?.name || null,
        division:  s.user.divisions?.name || null,
        scores:    [],
      }
    }
    byUser[uid].scores.push(s)
  }

  // Calculer les moyennes par utilisateur
  return Object.values(byUser)
    .map(u => {
      const n = u.scores.length
      const avg = key => Math.round(u.scores.reduce((sum, s) => sum + (s[key] || 0), 0) / n)

      // Tendance : comparer 1ère moitié vs 2ème moitié des jours
      const half = Math.floor(n / 2)
      const recentAvg = n > 1
        ? u.scores.slice(-half || 1).reduce((s, x) => s + x.score_total, 0) / (half || 1)
        : null
      const oldAvg = n > 1
        ? u.scores.slice(0, half || 1).reduce((s, x) => s + x.score_total, 0) / (half || 1)
        : null
      const trend = recentAvg !== null && oldAvg !== null
        ? Math.round(recentAvg - oldAvg)
        : 0

      return {
        userId:       u.userId,
        firstName:    u.firstName,
        lastName:     u.lastName,
        role:         u.role,
        service:      u.service,
        division:     u.division,
        avgTotal:     avg('score_total'),
        avgDelivery:  avg('score_delivery'),
        avgQuality:   avg('score_quality'),
        avgRegularity:avg('score_regularity'),
        avgBonus:     avg('score_bonus'),
        daysCount:    n,
        trend,
        scores:       u.scores,  // données brutes pour le graphe
      }
    })
    .sort((a, b) => b.avgTotal - a.avgTotal)
    .map((u, i) => ({ ...u, rank: i + 1 }))
}

// ─── STATS MOYENNES DE L'ÉQUIPE ───────────────────────────────
/**
 * Retourne les moyennes globales de l'équipe sur la période.
 */
export function useTeamAverages(startDate, endDate) {
  const { data: scores = [], isLoading, error } = useTeamScoreHistory(startDate, endDate)

  if (!scores.length) {
    return {
      data: null,
      isLoading,
      error,
    }
  }

  const n = scores.length
  const avg = key => Math.round(scores.reduce((sum, s) => sum + (s[key] || 0), 0) / n)

  return {
    data: {
      total:     avg('score_total'),
      delivery:  avg('score_delivery'),
      quality:   avg('score_quality'),
      regularity:avg('score_regularity'),
      bonus:     avg('score_bonus'),
      daysCount: new Set(scores.map(s => s.score_date)).size,
      agentCount: new Set(scores.map(s => s.user_id)).size,
    },
    isLoading,
    error,
  }
}
