// ============================================================
// APEX RH — src/hooks/useGamification.js
// Session 31 — Module Gamification Avancée
// Streaks calculés live depuis pulse_daily_logs
// Badges et points depuis les tables gamification_*
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES BADGES ──────────────────────────────────────

export const BADGES = [
  {
    key: 'first_journal',
    label: 'Premier Journal',
    desc: 'Soumettre son premier journal PULSE',
    icon: '🌱',
    tier: 'bronze',
    tierColor: '#CD7F32',
    tierBg: 'rgba(205,127,50,0.12)',
    points: 20,
  },
  {
    key: 'streak_3',
    label: '3 Jours de Suite',
    desc: 'Soumettre 3 journaux consécutifs',
    icon: '🔥',
    tier: 'bronze',
    tierColor: '#CD7F32',
    tierBg: 'rgba(205,127,50,0.12)',
    points: 30,
  },
  {
    key: 'streak_7',
    label: 'Flamme de la Semaine',
    desc: 'Soumettre 7 journaux consécutifs',
    icon: '⚡',
    tier: 'silver',
    tierColor: '#C0C0C0',
    tierBg: 'rgba(192,192,192,0.12)',
    points: 100,
  },
  {
    key: 'streak_30',
    label: 'Sprint du Mois',
    desc: 'Soumettre 30 journaux consécutifs',
    icon: '💫',
    tier: 'gold',
    tierColor: '#C9A227',
    tierBg: 'rgba(201,162,39,0.12)',
    points: 500,
  },
  {
    key: 'score_bronze',
    label: 'Performer',
    desc: 'Score PULSE moyen ≥ 60 sur 14 jours',
    icon: '🏅',
    tier: 'bronze',
    tierColor: '#CD7F32',
    tierBg: 'rgba(205,127,50,0.12)',
    points: 50,
  },
  {
    key: 'score_silver',
    label: 'Haute Performance',
    desc: 'Score PULSE moyen ≥ 75 sur 14 jours',
    icon: '⭐',
    tier: 'silver',
    tierColor: '#C0C0C0',
    tierBg: 'rgba(192,192,192,0.12)',
    points: 150,
  },
  {
    key: 'score_gold',
    label: 'Excellence',
    desc: 'Score PULSE moyen ≥ 85 sur 30 jours',
    icon: '🏆',
    tier: 'gold',
    tierColor: '#C9A227',
    tierBg: 'rgba(201,162,39,0.12)',
    points: 400,
  },
  {
    key: 'perfect_week',
    label: 'Semaine Parfaite',
    desc: 'Brief + Journal soumis 5 jours consécutifs',
    icon: '🎯',
    tier: 'silver',
    tierColor: '#C0C0C0',
    tierBg: 'rgba(192,192,192,0.12)',
    points: 120,
  },
  {
    key: 'top_service',
    label: 'Meilleur de l\'Équipe',
    desc: 'Score le plus élevé du service ce mois-ci',
    icon: '👑',
    tier: 'gold',
    tierColor: '#C9A227',
    tierBg: 'rgba(201,162,39,0.12)',
    points: 200,
  },
]

// ─── NIVEAUX / PALIERS ───────────────────────────────────────

export const LEVELS = [
  { level: 1, label: 'Recrue',      minPoints: 0,    color: '#6B7280', icon: '🌱' },
  { level: 2, label: 'Actif',       minPoints: 100,  color: '#3B82F6', icon: '⚡' },
  { level: 3, label: 'Engagé',      minPoints: 300,  color: '#8B5CF6', icon: '🎯' },
  { level: 4, label: 'Performant',  minPoints: 700,  color: '#10B981', icon: '🌟' },
  { level: 5, label: 'Excellence',  minPoints: 1500, color: '#C9A227', icon: '🏆' },
]

export const POINTS_CONFIG = {
  journal_submitted:  10,
  brief_submitted:    5,
  score_excellent:    25,  // score > 70
  streak_7:           50,
  streak_30:          200,
}

// ─── HELPERS ────────────────────────────────────────────────

export function getBadgeByKey(key) {
  return BADGES.find(b => b.key === key) || null
}

export function computeLevel(totalPoints) {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (totalPoints >= lvl.minPoints) current = lvl
  }
  const idx = LEVELS.indexOf(current)
  const next = LEVELS[idx + 1] || null
  const progress = next
    ? Math.round(((totalPoints - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    : 100
  return { current, next, progress, totalPoints }
}

/**
 * Calcule le streak actuel depuis un tableau de dates (YYYY-MM-DD) triées desc
 * @param {string[]} dates — tableau de dates soumises, triées du plus récent
 * @returns {{ current: number, max: number }}
 */
export function computeStreakFromDates(dates) {
  if (!dates || dates.length === 0) return { current: 0, max: 0 }

  const sorted = [...dates].sort((a, b) => new Date(b) - new Date(a))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let current = 0
  let max = 0
  let streak = 0
  let expectedDate = new Date(today)

  // On accepte hier comme point de départ (si pas encore soumis aujourd'hui)
  const latest = new Date(sorted[0])
  latest.setHours(0, 0, 0, 0)
  const diffToday = Math.floor((today - latest) / 86400000)
  if (diffToday > 1) return { current: 0, max: computeMaxStreak(sorted) }

  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i])
    d.setHours(0, 0, 0, 0)
    const diff = Math.floor((expectedDate - d) / 86400000)
    if (diff === 0 || (i === 0 && diff <= 1)) {
      streak++
      if (streak > max) max = streak
      expectedDate = new Date(d)
      expectedDate.setDate(expectedDate.getDate() - 1)
      // Skip weekends
      while (expectedDate.getDay() === 0 || expectedDate.getDay() === 6) {
        expectedDate.setDate(expectedDate.getDate() - 1)
      }
    } else {
      break
    }
  }

  current = streak
  const computedMax = computeMaxStreak(sorted)
  return { current, max: Math.max(current, computedMax) }
}

function computeMaxStreak(sortedDates) {
  if (!sortedDates.length) return 0
  let max = 0
  let streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const a = new Date(sortedDates[i - 1])
    const b = new Date(sortedDates[i])
    a.setHours(0, 0, 0, 0)
    b.setHours(0, 0, 0, 0)
    const diff = Math.floor((a - b) / 86400000)
    if (diff === 1 || diff === 3) { // allow weekend skip
      streak++
    } else {
      max = Math.max(max, streak)
      streak = 1
    }
  }
  return Math.max(max, streak)
}

import { isManagerRole as _isManagerRole } from '../lib/roles'
import { ROLES } from '../utils/constants'
export const isManagerRole = _isManagerRole  // re-export pour compatibilité Gamification.jsx

// ─── MON STREAK (calculé live depuis pulse_daily_logs) ───────

export function useMyStreak() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['gamif', 'streak', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { current: 0, max: 0, dates: [] }

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 120)

      const { data, error } = await supabase
        .from('pulse_daily_logs')
        .select('log_date')
        .eq('user_id', profile.id)
        .gte('log_date', cutoff.toISOString().split('T')[0])
        .order('log_date', { ascending: false })

      if (error) throw error
      const dates = (data || []).map(r => r.log_date)
      return { ...computeStreakFromDates(dates), dates }
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── MES POINTS TOTAUX ───────────────────────────────────────

export function useMyPoints() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['gamif', 'points', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { total: 0, byReason: {} }

      const { data, error } = await supabase
        .from('gamification_points')
        .select('points, reason')
        .eq('user_id', profile.id)

      if (error) throw error

      const total = (data || []).reduce((sum, r) => sum + (r.points || 0), 0)
      const byReason = {}
      for (const row of data || []) {
        byReason[row.reason] = (byReason[row.reason] || 0) + row.points
      }
      return { total, byReason }
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── MES BADGES OBTENUS ──────────────────────────────────────

export function useMyBadges() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['gamif', 'badges', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('gamification_badges')
        .select('badge_key, earned_at')
        .eq('user_id', profile.id)
        .order('earned_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── CLASSEMENT INTER-ÉQUIPES (score moyen du mois par service) ─

export function useInterTeamLeaderboard(year, month) {
  return useQuery({
    queryKey: ['gamif', 'inter-team', year, month],
    queryFn: async () => {
      // Date debut/fin du mois
      const start = `${year}-${String(month).padStart(2,'0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      // Récupérer tous les logs du mois avec service_id via users
      const { data: logs, error } = await supabase
        .from('pulse_daily_logs')
        .select(`
          daily_score,
          users!inner(
            id, first_name, last_name,
            services!inner(id, name)
          )
        `)
        .gte('log_date', start)
        .lte('log_date', end)
        .not('daily_score', 'is', null)

      if (error) throw error

      // Agréger par service
      const byService = {}
      for (const log of logs || []) {
        const svc = log.users?.services
        if (!svc) continue
        if (!byService[svc.id]) {
          byService[svc.id] = { id: svc.id, name: svc.name, scores: [], count: 0 }
        }
        byService[svc.id].scores.push(log.daily_score)
        byService[svc.id].count++
      }

      const ranked = Object.values(byService).map(s => ({
        ...s,
        avgScore: s.scores.length > 0
          ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
          : 0,
        nbLogs: s.scores.length,
      })).sort((a, b) => b.avgScore - a.avgScore)

      return ranked
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ─── CLASSEMENT INDIVIDUEL DU SERVICE (ce mois) ──────────────

export function useServiceLeaderboard(serviceId, year, month) {
  return useQuery({
    queryKey: ['gamif', 'service-board', serviceId, year, month],
    queryFn: async () => {
      if (!serviceId) return []
      const start = `${year}-${String(month).padStart(2,'0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('pulse_daily_logs')
        .select(`
          user_id, daily_score,
          users!inner(id, first_name, last_name, role, service_id)
        `)
        .eq('users.service_id', serviceId)
        .gte('log_date', start)
        .lte('log_date', end)
        .not('daily_score', 'is', null)

      if (error) throw error

      const byUser = {}
      for (const row of data || []) {
        const u = row.users
        if (!u) continue
        if (!byUser[row.user_id]) {
          byUser[row.user_id] = {
            id: row.user_id,
            name: `${u.first_name} ${u.last_name}`,
            scores: [],
            totalPoints: 0,
          }
        }
        byUser[row.user_id].scores.push(row.daily_score)
      }

      // Charger les points de chaque user du service
      const userIds = Object.keys(byUser)
      if (userIds.length > 0) {
        const { data: pts } = await supabase
          .from('gamification_points')
          .select('user_id, points')
          .in('user_id', userIds)
        for (const p of pts || []) {
          if (byUser[p.user_id]) byUser[p.user_id].totalPoints += p.points
        }
      }

      return Object.values(byUser).map(u => ({
        ...u,
        avgScore: u.scores.length > 0
          ? Math.round(u.scores.reduce((a, b) => a + b, 0) / u.scores.length)
          : 0,
        nbLogs: u.scores.length,
      })).sort((a, b) => b.avgScore - a.avgScore)
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── STATS GAMIFICATION ÉQUIPE (manager) ────────────────────

export function useTeamGamifStats(serviceId) {
  return useQuery({
    queryKey: ['gamif', 'team-stats', serviceId],
    queryFn: async () => {
      if (!serviceId) return null

      // Badges de l'équipe
      const { data: members } = await supabase
        .from('users')
        .select('id')
        .eq('service_id', serviceId)
        .eq('role', ROLES.COLLABORATEUR)

      const memberIds = (members || []).map(m => m.id)
      if (memberIds.length === 0) return { totalBadges: 0, totalPoints: 0, avgPoints: 0, topBadge: null }

      const [{ data: badges }, { data: pts }] = await Promise.all([
        supabase.from('gamification_badges').select('user_id, badge_key').in('user_id', memberIds),
        supabase.from('gamification_points').select('user_id, points').in('user_id', memberIds),
      ])

      const totalBadges  = badges?.length || 0
      const totalPoints  = (pts || []).reduce((s, r) => s + r.points, 0)
      const avgPoints    = memberIds.length > 0 ? Math.round(totalPoints / memberIds.length) : 0

      // Badge le plus fréquent
      const badgeCounts = {}
      for (const b of badges || []) {
        badgeCounts[b.badge_key] = (badgeCounts[b.badge_key] || 0) + 1
      }
      const topBadgeKey = Object.keys(badgeCounts).sort((a, b) => badgeCounts[b] - badgeCounts[a])[0]
      const topBadge = topBadgeKey ? { ...getBadgeByKey(topBadgeKey), count: badgeCounts[topBadgeKey] } : null

      return { totalBadges, totalPoints, avgPoints, topBadge, memberCount: memberIds.length }
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── MUTATION : SYNCHRONISER STREAKS & BADGES ───────────────

export function useSyncGamification() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Non authentifié')

      // 1. Récupérer les logs des 120 derniers jours
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 120)
      const { data: logs, error: logsErr } = await supabase
        .from('pulse_daily_logs')
        .select('log_date, daily_score, brief_submitted')
        .eq('user_id', profile.id)
        .gte('log_date', cutoff.toISOString().split('T')[0])
        .order('log_date', { ascending: false })
      if (logsErr) throw logsErr

      const dates = (logs || []).map(r => r.log_date)
      const { current: streak, max: maxStreak } = computeStreakFromDates(dates)
      const totalLogs = logs?.length || 0
      const scores = (logs || []).filter(l => l.daily_score != null).map(l => l.daily_score)
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

      // Logs sur 14 derniers jours
      const cutoff14 = new Date()
      cutoff14.setDate(cutoff14.getDate() - 14)
      const logs14 = (logs || []).filter(l => new Date(l.log_date) >= cutoff14)
      const scores14 = logs14.filter(l => l.daily_score != null).map(l => l.daily_score)
      const avg14 = scores14.length > 0 ? scores14.reduce((a, b) => a + b, 0) / scores14.length : 0

      // 2. Récupérer les badges existants
      const { data: existingBadges } = await supabase
        .from('gamification_badges')
        .select('badge_key')
        .eq('user_id', profile.id)
      const earned = new Set((existingBadges || []).map(b => b.badge_key))

      // 3. Calculer les nouveaux badges à attribuer
      const toEarn = []
      if (totalLogs >= 1 && !earned.has('first_journal'))  toEarn.push('first_journal')
      if (streak >= 3   && !earned.has('streak_3'))         toEarn.push('streak_3')
      if (streak >= 7   && !earned.has('streak_7'))         toEarn.push('streak_7')
      if (maxStreak >= 30 && !earned.has('streak_30'))      toEarn.push('streak_30')
      if (avg14 >= 60   && !earned.has('score_bronze'))     toEarn.push('score_bronze')
      if (avg14 >= 75   && !earned.has('score_silver'))     toEarn.push('score_silver')
      if (avgScore >= 85 && scores.length >= 20 && !earned.has('score_gold')) toEarn.push('score_gold')

      // Semaine parfaite (5 jours de suite avec brief + journal)
      const last7 = (logs || []).slice(0, 7)
      const perfectDays = last7.filter(l => l.brief_submitted && l.daily_score != null).length
      if (perfectDays >= 5 && !earned.has('perfect_week')) toEarn.push('perfect_week')

      // 4. Insérer les nouveaux badges
      if (toEarn.length > 0) {
        const { error: badgeErr } = await supabase
          .from('gamification_badges')
          .upsert(toEarn.map(key => ({ user_id: profile.id, badge_key: key })), { onConflict: 'user_id,badge_key' })
        if (badgeErr) throw badgeErr
      }

      // 5. Attribuer les points pour les nouveaux badges
      if (toEarn.length > 0) {
        const pointRows = toEarn.map(key => {
          const badge = getBadgeByKey(key)
          return {
            user_id: profile.id,
            points: badge?.points || 10,
            reason: `badge_${key}`,
            date_ref: new Date().toISOString().split('T')[0],
          }
        })
        await supabase.from('gamification_points').insert(pointRows)
      }

      // 6. Points journaliers (si pas encore comptés aujourd'hui)
      const today = new Date().toISOString().split('T')[0]
      const { data: todayPts } = await supabase
        .from('gamification_points')
        .select('id')
        .eq('user_id', profile.id)
        .eq('date_ref', today)
        .eq('reason', 'journal_submitted')
      
      const todayLog = (logs || []).find(l => l.log_date === today)
      if (todayLog && (!todayPts || todayPts.length === 0)) {
        const rows = [{ user_id: profile.id, points: POINTS_CONFIG.journal_submitted, reason: 'journal_submitted', date_ref: today }]
        if (todayLog.brief_submitted) rows.push({ user_id: profile.id, points: POINTS_CONFIG.brief_submitted, reason: 'brief_submitted', date_ref: today })
        if (todayLog.daily_score >= 70) rows.push({ user_id: profile.id, points: POINTS_CONFIG.score_excellent, reason: 'score_excellent', date_ref: today })
        await supabase.from('gamification_points').insert(rows)
      }

      return { newBadges: toEarn, streak, maxStreak }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gamif'] })
    },
  })
}
