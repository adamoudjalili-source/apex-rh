// ============================================================
// APEX RH — src/hooks/useCompensation.js
// Session 58 — Compensation & Benchmark Salarial
// Hooks : grilles, dossiers, benchmarks, révisions, bonus
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CONSTANTES PUBLIQUES ─────────────────────────────────────

export const CURRENCY_LABELS = { XOF: 'F CFA', EUR: '€', USD: '$' }

export const REVIEW_REASON_LABELS = {
  annuelle:      'Révision annuelle',
  promotion:     'Promotion',
  revalorisation:'Revalorisation',
  correction:    'Correction d\'équité',
  recrutement:   'Recrutement',
  autre:         'Autre',
}

export const REVIEW_REASON_COLORS = {
  annuelle:      '#6366F1',
  promotion:     '#10B981',
  revalorisation:'#3B82F6',
  correction:    '#F59E0B',
  recrutement:   '#8B5CF6',
  autre:         '#6B7280',
}

export const REVIEW_STATUS_LABELS = {
  propose:  'Proposé',
  valide:   'Validé',
  applique: 'Appliqué',
  rejete:   'Rejeté',
}

export const REVIEW_STATUS_COLORS = {
  propose:  '#F59E0B',
  valide:   '#3B82F6',
  applique: '#10B981',
  rejete:   '#EF4444',
}

export const BONUS_TYPE_LABELS = {
  performance: 'Performance',
  anciennete:  'Ancienneté',
  projet:      'Projet',
  exceptionnel:'Exceptionnel',
  astreinte:   'Astreinte',
  autre:       'Autre',
}

export const BONUS_TYPE_COLORS = {
  performance: '#10B981',
  anciennete:  '#C9A227',
  projet:      '#8B5CF6',
  exceptionnel:'#EC4899',
  astreinte:   '#F97316',
  autre:       '#6B7280',
}

export const BONUS_STATUS_LABELS = {
  propose:  'Proposé',
  valide:   'Validé',
  paye:     'Payé',
  annule:   'Annulé',
}

export const GRADE_CATEGORY_LABELS = {
  agent:      'Agent',
  technicien: 'Technicien',
  cadre:      'Cadre',
  direction:  'Direction',
}

// ─── FORMATTERS ───────────────────────────────────────────────

export function formatSalary(amount, currency = 'XOF') {
  if (amount == null) return '—'
  const num = Number(amount)
  if (currency === 'XOF') {
    return new Intl.NumberFormat('fr-FR').format(Math.round(num)) + ' F CFA'
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatSalaryShort(amount) {
  if (amount == null) return '—'
  const n = Number(amount)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

export function getCompaRatioColor(ratio) {
  if (ratio == null) return '#6B7280'
  if (ratio < 80)    return '#EF4444'
  if (ratio < 95)    return '#F59E0B'
  if (ratio <= 110)  return '#10B981'
  return '#8B5CF6'
}

export function getCompaRatioLabel(ratio) {
  if (ratio == null) return '—'
  if (ratio < 80)    return 'Sous le marché'
  if (ratio < 95)    return 'En dessous médiane'
  if (ratio <= 110)  return 'Aligné marché'
  return 'Au-dessus médiane'
}

// ─── GRILLES SALARIALES ───────────────────────────────────────

export function useSalaryGrades() {
  return useQuery({
    queryKey: ['salary_grades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_grades')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('salary_grades')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_grades'] }),
  })
}

export function useUpdateGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('salary_grades')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_grades'] }),
  })
}

export function useDeleteGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('salary_grades')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_grades'] }),
  })
}

// ─── DOSSIER RÉMUNÉRATION INDIVIDUEL ──────────────────────────

export function useMyCompensation() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['compensation_records', 'me'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_records')
        .select(`
          *,
          grade:salary_grades(id, code, label, category, min_salary, mid_salary, max_salary, currency)
        `)
        .eq('user_id', user.id)
        .order('effective_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useMyCompensationStats() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['mv_compensation_stats', 'me'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_compensation_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data ?? null
    },
  })
}

export function useTeamCompensationStats() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['mv_compensation_stats', 'team'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_compensation_stats')
        .select('*')
        .order('base_salary', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useOrgCompensationStats() {
  return useQuery({
    queryKey: ['mv_compensation_stats', 'org'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_compensation_stats')
        .select('*')
        .order('base_salary', { ascending: false })
      if (error) throw error

      const records = data ?? []
      if (records.length === 0) return null

      const salaries = records.map(r => Number(r.base_salary)).filter(Boolean).sort((a, b) => a - b)
      const totalComp = records.map(r => Number(r.total_comp)).filter(Boolean)
      const compaRatios = records.map(r => Number(r.compa_ratio)).filter(Boolean)

      const median = salaries.length > 0
        ? salaries[Math.floor(salaries.length / 2)]
        : 0

      return {
        count:           records.length,
        total_mass:      salaries.reduce((a, b) => a + b, 0),
        avg_base:        salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
        median_base:     median,
        min_base:        salaries[0] ?? 0,
        max_base:        salaries[salaries.length - 1] ?? 0,
        avg_total_comp:  totalComp.length > 0 ? totalComp.reduce((a, b) => a + b, 0) / totalComp.length : 0,
        avg_compa_ratio: compaRatios.length > 0 ? compaRatios.reduce((a, b) => a + b, 0) / compaRatios.length : null,
        below_grade_min: records.filter(r => r.grade_min && Number(r.base_salary) < Number(r.grade_min)).length,
        above_grade_max: records.filter(r => r.grade_max && Number(r.base_salary) > Number(r.grade_max)).length,
        records,
      }
    },
  })
}

export function useSetCompensation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, payload }) => {
      // Fermer l'enregistrement courant
      await supabase
        .from('compensation_records')
        .update({ is_current: false, end_date: payload.effective_date, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_current', true)

      const { data, error } = await supabase
        .from('compensation_records')
        .insert({ ...payload, user_id: userId, is_current: true })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensation_records'] })
      qc.invalidateQueries({ queryKey: ['mv_compensation_stats'] })
      qc.invalidateQueries({ queryKey: ['compensation_reviews'] })
    },
  })
}

// ─── BENCHMARKS ───────────────────────────────────────────────

export function useBenchmarks({ jobFamily, level } = {}) {
  return useQuery({
    queryKey: ['salary_benchmarks', jobFamily, level],
    queryFn: async () => {
      let q = supabase
        .from('salary_benchmarks')
        .select('*')
        .eq('is_active', true)
        .order('job_family')
        .order('level')

      if (jobFamily) q = q.eq('job_family', jobFamily)
      if (level)     q = q.eq('level', level)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export function useBenchmarkAnalysis() {
  return useQuery({
    queryKey: ['mv_benchmark_analysis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_benchmark_analysis')
        .select('*')
        .order('job_family')
        .order('level')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateBenchmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('salary_benchmarks')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_benchmarks'] }),
  })
}

export function useUpdateBenchmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('salary_benchmarks')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_benchmarks'] }),
  })
}

export function useDeleteBenchmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('salary_benchmarks')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary_benchmarks'] }),
  })
}

// ─── RÉVISIONS SALARIALES ─────────────────────────────────────

export function useMyReviews() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['compensation_reviews', 'me'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_reviews')
        .select(`
          *,
          reviewer:reviewed_by(id, first_name, last_name),
          new_grade:new_grade_id(id, code, label)
        `)
        .eq('user_id', user.id)
        .order('review_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useTeamReviews() {
  return useQuery({
    queryKey: ['compensation_reviews', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_reviews')
        .select(`
          *,
          employee:user_id(id, first_name, last_name, role),
          reviewer:reviewed_by(id, first_name, last_name),
          new_grade:new_grade_id(id, code, label)
        `)
        .order('review_date', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateReview() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('compensation_reviews')
        .insert({ ...payload, reviewed_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation_reviews'] }),
  })
}

export function useUpdateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('compensation_reviews')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation_reviews'] }),
  })
}

export function useApplyReview() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ reviewId, review }) => {
      // Appliquer la révision = mettre à jour le dossier de rémunération
      await supabase
        .from('compensation_records')
        .update({ is_current: false, end_date: review.effective_date, updated_at: new Date().toISOString() })
        .eq('user_id', review.user_id)
        .eq('is_current', true)

      await supabase
        .from('compensation_records')
        .insert({
          user_id:        review.user_id,
          grade_id:       review.new_grade_id,
          base_salary:    review.new_base_salary,
          currency:       review.currency,
          effective_date: review.effective_date || new Date().toISOString().slice(0, 10),
          is_current:     true,
        })

      const { data, error } = await supabase
        .from('compensation_reviews')
        .update({
          status:      'applique',
          validated_by: user?.id,
          applied_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensation_reviews'] })
      qc.invalidateQueries({ queryKey: ['compensation_records'] })
      qc.invalidateQueries({ queryKey: ['mv_compensation_stats'] })
    },
  })
}

// ─── BONUS & PRIMES ───────────────────────────────────────────

export function useMyBonuses() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['bonus_records', 'me'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_records')
        .select('*')
        .eq('user_id', user.id)
        .order('reference_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useTeamBonuses() {
  return useQuery({
    queryKey: ['bonus_records', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_records')
        .select(`
          *,
          employee:user_id(id, first_name, last_name, role)
        `)
        .order('reference_date', { ascending: false })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateBonus() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('bonus_records')
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bonus_records'] }),
  })
}

export function useUpdateBonus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('bonus_records')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bonus_records'] }),
  })
}

// ─── HELPERS LOGIQUE MÉTIER ───────────────────────────────────

/** Calcule la position dans la fourchette (0–100 %) */
export function computeRangePosition(salary, grade) {
  if (!grade || !salary) return null
  const range = grade.max_salary - grade.min_salary
  if (range <= 0) return null
  return Math.max(0, Math.min(100, ((salary - grade.min_salary) / range) * 100))
}

/** Calcule le compa-ratio (salaire / point médian) */
export function computeCompaRatio(salary, grade) {
  if (!grade?.mid_salary || !salary) return null
  return (salary / grade.mid_salary) * 100
}

/** Calcule le gap par rapport au P50 marché */
export function computeMarketGap(salary, benchmark) {
  if (!benchmark?.p50 || !salary) return null
  return ((salary - benchmark.p50) / benchmark.p50) * 100
}

/** Retourne la couleur du gap marché */
export function getMarketGapColor(gap) {
  if (gap == null)  return '#6B7280'
  if (gap < -20)    return '#EF4444'
  if (gap < -5)     return '#F59E0B'
  if (gap <= 10)    return '#10B981'
  return '#8B5CF6'
}
