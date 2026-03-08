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

// ============================================================
// S74 — WORKFLOW RÉVISION SALARIALE
// Hooks : cycles, workflow, simulation budget
// ============================================================

// ─── CONSTANTES S74 ──────────────────────────────────────────

export const REVIEW_WORKFLOW_STATUS_LABELS = {
  brouillon:      'Brouillon',
  soumis:         'Soumis',
  valide_manager: 'Validé manager',
  valide_rh:      'Validé RH',
  applique:       'Appliqué',
  refuse:         'Refusé',
}

export const REVIEW_WORKFLOW_STATUS_COLORS = {
  brouillon:      '#6B7280',
  soumis:         '#F59E0B',
  valide_manager: '#3B82F6',
  valide_rh:      '#8B5CF6',
  applique:       '#10B981',
  refuse:         '#EF4444',
}

export const REVIEW_REASON_WORKFLOW_LABELS = {
  annuelle:       'Augmentation annuelle',
  promotion:      'Promotion',
  ajustement:     'Ajustement marché',
  prime:          'Prime exceptionnelle',
  autre:          'Autre',
}

export const CYCLE_STATUS_LABELS = {
  ouvert:    'Ouvert',
  en_cours:  'En cours',
  cloture:   'Clôturé',
}

export const CYCLE_STATUS_COLORS = {
  ouvert:   '#10B981',
  en_cours: '#F59E0B',
  cloture:  '#6B7280',
}

export function getWorkflowStatusInfo(status) {
  return {
    label: REVIEW_WORKFLOW_STATUS_LABELS[status] ?? status,
    color: REVIEW_WORKFLOW_STATUS_COLORS[status] ?? '#6B7280',
  }
}

// ─── CYCLES DE RÉVISION ──────────────────────────────────────

export function useCompensationCycles() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['compensation_cycles', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_cycles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('year', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.organization_id,
  })
}

export function useCreateCycle() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('compensation_cycles')
        .insert({ ...payload, organization_id: profile.organization_id, created_by: profile.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation_cycles'] }),
  })
}

export function useUpdateCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('compensation_cycles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation_cycles'] }),
  })
}

export function useDeleteCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('compensation_cycles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compensation_cycles'] }),
  })
}

export function useCyclesProgress() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mv_compensation_cycles_progress', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_cycles_progress_for_org', { p_org: profile.organization_id })
        .catch(() => ({ data: null, error: null }))
      // Fallback direct si RPC non dispo
      const { data: fallback, error: err2 } = await supabase
        .from('mv_compensation_cycles_progress')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('year', { ascending: false })
      if (err2) return []
      return fallback ?? []
    },
    enabled: !!profile?.organization_id,
  })
}

// ─── WORKFLOW RÉVISIONS ───────────────────────────────────────

/** Révisions en attente de ma validation (manager ou RH) */
export function usePendingReviews() {
  const { profile, canValidate, canAdmin } = useAuth()
  return useQuery({
    queryKey: ['pending_reviews', profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('compensation_reviews')
        .select(`
          *,
          employee:employee_id(id, full_name, avatar_url, job_title, department),
          cycle:review_cycle_id(id, name, year),
          grade:salary_grade_id(id, code, label)
        `)
      if (canAdmin) {
        query = query.in('status', ['soumis', 'valide_manager'])
      } else if (canValidate) {
        query = query.eq('status', 'soumis')
      } else {
        return []
      }
      const { data, error } = await query.order('submitted_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile,
  })
}

/** Toutes les révisions — vue admin/RH */
export function useAllReviews(filters = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['all_reviews', profile?.organization_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('compensation_reviews')
        .select(`
          *,
          employee:employee_id(id, full_name, avatar_url, job_title, department, service),
          cycle:review_cycle_id(id, name, year),
          grade:salary_grade_id(id, code, label),
          manager_approver:manager_approved_by(id, full_name),
          hr_approver:hr_approved_by(id, full_name)
        `)
      if (filters.status)   query = query.eq('status', filters.status)
      if (filters.cycle_id) query = query.eq('review_cycle_id', filters.cycle_id)
      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.organization_id,
  })
}

/** Révisions de mon équipe */
export function useTeamReviews() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['team_reviews', profile?.id],
    queryFn: async () => {
      const { data: team, error: tErr } = await supabase
        .from('users')
        .select('id')
        .eq('manager_id', profile.id)
      if (tErr) throw tErr
      const ids = (team ?? []).map(u => u.id)
      if (!ids.length) return []
      const { data, error } = await supabase
        .from('compensation_reviews')
        .select(`
          *,
          employee:employee_id(id, full_name, avatar_url, job_title, department),
          cycle:review_cycle_id(id, name, year)
        `)
        .in('employee_id', ids)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
  })
}

/** Créer une demande de révision */
export function useCreateRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      // Ne PAS envoyer increase_amount / increase_pct (GENERATED)
      const { increase_amount, increase_pct, ...safe } = payload
      const { data, error } = await supabase
        .from('compensation_reviews')
        .insert({ ...safe, status: 'soumis', submitted_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensation_reviews'] })
      qc.invalidateQueries({ queryKey: ['pending_reviews'] })
      qc.invalidateQueries({ queryKey: ['team_reviews'] })
    },
  })
}

/** Valider (manager ou RH) */
export function useApproveRevision() {
  const qc = useQueryClient()
  const { profile, canAdmin } = useAuth()
  return useMutation({
    mutationFn: async ({ id, comment }) => {
      const now = new Date().toISOString()
      // Lire le statut actuel
      const { data: cur } = await supabase
        .from('compensation_reviews')
        .select('status')
        .eq('id', id)
        .single()
      let updates = {}
      if (cur?.status === 'soumis') {
        updates = { status: 'valide_manager', manager_approved_by: profile.id, manager_approved_at: now }
        if (canAdmin) updates.status = 'valide_rh' // admin valide d'un coup
      } else if (cur?.status === 'valide_manager') {
        updates = { status: 'valide_rh', hr_approved_by: profile.id, hr_approved_at: now }
      }
      if (comment) updates.review_notes = comment
      updates.updated_at = now
      const { data, error } = await supabase
        .from('compensation_reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensation_reviews'] })
      qc.invalidateQueries({ queryKey: ['pending_reviews'] })
      qc.invalidateQueries({ queryKey: ['all_reviews'] })
      qc.invalidateQueries({ queryKey: ['team_reviews'] })
    },
  })
}

/** Refuser une révision */
export function useRefuseRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data, error } = await supabase
        .from('compensation_reviews')
        .update({ status: 'refuse', refused_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensation_reviews'] })
      qc.invalidateQueries({ queryKey: ['pending_reviews'] })
      qc.invalidateQueries({ queryKey: ['all_reviews'] })
    },
  })
}

/** Appliquer une révision validée RH */
export function useApplyRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, employee_id, new_salary, salary_grade_id, currency, review_reason, effective_date }) => {
      const now = new Date().toISOString()
      // 1. Marquer l'ancien record comme non-courant
      await supabase
        .from('compensation_records')
        .update({ is_current: false })
        .eq('employee_id', employee_id)
        .eq('is_current', true)
      // 2. Créer nouveau record
      await supabase
        .from('compensation_records')
        .insert({
          employee_id,
          salary_amount: new_salary,
          salary_grade_id,
          currency: currency ?? 'XOF',
          effective_date: effective_date ?? now.split('T')[0],
          is_current: true,
          change_reason: review_reason,
        })
      // 3. Marquer révision appliquée
      const { data, error } = await supabase
        .from('compensation_reviews')
        .update({ status: 'applique', applied_at: now, updated_at: now })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensation_reviews'] })
      qc.invalidateQueries({ queryKey: ['compensation_records'] })
      qc.invalidateQueries({ queryKey: ['all_reviews'] })
      qc.invalidateQueries({ queryKey: ['pending_reviews'] })
    },
  })
}

/** Stats globales révisions depuis MV */
export function useRevisionStats() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mv_revision_stats', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_revision_stats')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single()
      if (error) return null
      return data
    },
    enabled: !!profile?.organization_id,
  })
}

/** Simulation budget révision : donné un cycle, calcule impact total */
export function useRevisionBudgetSimulation(cycleId) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['revision_simulation', cycleId, profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_reviews')
        .select('new_salary, current_salary, status, employee:employee_id(department, service)')
        .eq('review_cycle_id', cycleId)
        .neq('status', 'refuse')
      if (error) throw error
      const rows = data ?? []
      const totalImpact = rows.reduce((s, r) => s + ((r.new_salary ?? 0) - (r.current_salary ?? 0)), 0)
      const avgPct = rows.length > 0
        ? rows.reduce((s, r) => s + (r.current_salary > 0 ? ((r.new_salary - r.current_salary) / r.current_salary) * 100 : 0), 0) / rows.length
        : 0
      // Regroupement par département
      const byDept = {}
      rows.forEach(r => {
        const dept = r.employee?.department ?? 'Autre'
        if (!byDept[dept]) byDept[dept] = { impact: 0, count: 0 }
        byDept[dept].impact += (r.new_salary ?? 0) - (r.current_salary ?? 0)
        byDept[dept].count++
      })
      // Distribution par tranche
      const tranches = { '0-2%': 0, '2-5%': 0, '5-10%': 0, '>10%': 0 }
      rows.forEach(r => {
        if (!r.current_salary) return
        const pct = ((r.new_salary - r.current_salary) / r.current_salary) * 100
        if (pct <= 2) tranches['0-2%']++
        else if (pct <= 5) tranches['2-5%']++
        else if (pct <= 10) tranches['5-10%']++
        else tranches['>10%']++
      })
      return { totalImpact, avgPct, byDept, tranches, count: rows.length }
    },
    enabled: !!cycleId,
  })
}

/** Refresh MVs compensation (admin) */
export function useRefreshCompensationMVs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_compensation_mvs')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mv_compensation_cycles_progress'] })
      qc.invalidateQueries({ queryKey: ['mv_revision_stats'] })
    },
  })
}
