// ============================================================
// APEX RH — usePerformanceComments.js  ·  Session 42
// Droit de commentaire collaborateur sur ses dimensions
// Transparency Mode : l'employé voit ce que voit son manager
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

export const DIMENSION_LABELS = {
  pulse:       'Performance PULSE',
  okr:         'Objectifs OKR',
  feedback360: 'Feedback 360°',
  nita:        'Activité Réelle NITA',
  surveys:     'Engagement',
  general:     'Général',
}

export const DIMENSION_COLORS = {
  pulse:       '#4F46E5',
  okr:         '#F59E0B',
  feedback360: '#10B981',
  nita:        '#3B82F6',
  surveys:     '#EC4899',
  general:     '#6B7280',
}

export const DIMENSION_ICONS = {
  pulse:       '⚡',
  okr:         '🎯',
  feedback360: '💬',
  nita:        '📡',
  surveys:     '📊',
  general:     '📝',
}

// ─── Mes commentaires ────────────────────────────────────────
export function useMyComments(periodLabel) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['perf-comments', 'mine', profile?.id, periodLabel],
    queryFn: async () => {
      if (!profile?.id) return []
      let q = supabase
        .from('performance_comments')
        .select('*, replied_by_user:users!replied_by(first_name,last_name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      if (periodLabel) q = q.eq('period_label', periodLabel)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── Commentaires d'un collaborateur (manager view) ──────────
export function useEmployeeComments(userId) {
  return useQuery({
    queryKey: ['perf-comments', 'employee', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('performance_comments')
        .select('*, replied_by_user:users!replied_by(first_name,last_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 60000,
  })
}

// ─── Tous les commentaires de l'équipe (manager) ─────────────
export function useTeamComments() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['perf-comments', 'team', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('performance_comments')
        .select(`
          *,
          user:users!user_id(id, first_name, last_name, role),
          replied_by_user:users!replied_by(first_name,last_name)
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

// ─── Mutations ────────────────────────────────────────────────
export function useCreateComment() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ dimension, period_label, comment, visibility = 'manager' }) => {
      const { data, error } = await supabase
        .from('performance_comments')
        .insert({ user_id: profile.id, dimension, period_label, comment, visibility })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['perf-comments', 'mine', profile?.id] })
      qc.invalidateQueries({ queryKey: ['perf-comments', 'mine', profile?.id, vars.period_label] })
      qc.invalidateQueries({ queryKey: ['perf-comments', 'team'] })
    },
  })
}

export function useUpdateComment() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('performance_comments')
        .update(payload)
        .eq('id', id)
        .eq('user_id', profile.id) // sécurité
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perf-comments', 'mine', profile?.id] })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('performance_comments')
        .delete()
        .eq('id', id)
        .eq('user_id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perf-comments', 'mine', profile?.id] })
      qc.invalidateQueries({ queryKey: ['perf-comments', 'team'] })
    },
  })
}

export function useManagerReplyComment() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, manager_reply, is_resolved = false }) => {
      const { data, error } = await supabase
        .from('performance_comments')
        .update({
          manager_reply,
          is_resolved,
          replied_by: profile.id,
          replied_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['perf-comments', 'employee', res.user_id] })
      qc.invalidateQueries({ queryKey: ['perf-comments', 'team'] })
      qc.invalidateQueries({ queryKey: ['perf-comments', 'mine'] })
    },
  })
}

// ─── Transparency : données IPR manager sur un employé ────────
// Reuse useTeamIPR logic but for a single user (used in MaPerformance transparency mode)
export function useMyTransparencyData() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['transparency', 'mine', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null

      // Récupérer ce que le manager voit : scores PULSE du mois, F360 reçus, OKR
      const today = new Date()
      const mStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      const [{ data: pScores }, { data: fbRequests }, { data: objectives }] = await Promise.all([
        supabase.from('performance_scores')
          .select('score_total, score_delivery, score_quality, score_regularity, score_bonus, score_date')
          .eq('user_id', profile.id)
          .eq('score_period', 'daily')
          .gte('score_date', mStart)
          .order('score_date', { ascending: false })
          .limit(31),
        supabase.from('feedback_requests')
          .select(`
            id, type, status,
            feedback_responses(question_key, score)
          `)
          .eq('evaluated_id', profile.id)
          .eq('status', 'validated'),
        supabase.from('objectives')
          .select('id, title, progress, target_value, current_value')
          .eq('user_id', profile.id)
          .in('status', ['active', 'completed']),
      ])

      // PULSE ce mois
      const pulseDays = pScores || []
      const pulseAvg  = pulseDays.length
        ? Math.round(pulseDays.reduce((s, r) => s + (r.score_total||0), 0) / pulseDays.length)
        : null

      // F360 moyennes
      const allResponses = (fbRequests||[]).flatMap(r => r.feedback_responses||[])
      const f360Scores   = {}
      const f360Counts   = {}
      for (const resp of allResponses) {
        if (resp.score !== null) {
          f360Scores[resp.question_key]  = (f360Scores[resp.question_key]||0) + resp.score
          f360Counts[resp.question_key]  = (f360Counts[resp.question_key]||0) + 1
        }
      }
      const f360Avg = Object.keys(f360Scores).length
        ? parseFloat((Object.entries(f360Scores).reduce((s,[k,v]) => s + v/f360Counts[k], 0) / Object.keys(f360Scores).length).toFixed(1))
        : null

      // OKR
      const okrList  = objectives || []
      const okrRate  = okrList.length
        ? Math.round(okrList.reduce((s, o) => s + (o.progress||0), 0) / okrList.length)
        : null

      // Profil qualitatif calculé (copie de useIPR logique)
      const dims = {
        pulse:       { score: pulseAvg,         weight: 30 },
        okr:         { score: okrRate,           weight: 25 },
        feedback360: { score: f360Avg != null ? f360Avg * 10 : null, weight: 20 },
      }
      let wSum = 0, wTotal = 0
      for (const d of Object.values(dims)) {
        if (d.score !== null && d.score !== undefined) {
          wSum   += d.score * d.weight
          wTotal += d.weight
        }
      }
      const ipr = wTotal > 0 ? Math.round(wSum / wTotal) : null

      return {
        ipr,
        pulseAvg,
        pulseDays: pulseDays.slice(0, 7).map(r => ({
          date:       r.score_date,
          delivery:   r.score_delivery,
          quality:    r.score_quality,
          regularity: r.score_regularity,
          bonus:      r.score_bonus,
          total:      r.score_total,
        })),
        f360Avg,
        f360Scores,
        okrRate,
        okrCount:  okrList.length,
        feedbackCount: (fbRequests||[]).length,
      }
    },
    enabled: !!profile?.id,
    staleTime: 300000,
  })
}
