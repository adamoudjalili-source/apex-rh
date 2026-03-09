// ============================================================
// APEX RH — src/hooks/useCompetencyFramework.js
// Session 42 — Référentiel Compétences
//   • useJobFamilies()          — liste des familles de métiers
//   • useJobFamily(id)          — une famille avec ses compétences
//   • useAllFrameworks()        — tous les référentiels (admin)
//   • useUserJobFamily(userId)  — famille d'un utilisateur
//   • useCreateJobFamily()      — créer une famille (admin)
//   • useUpdateJobFamily()      — modifier une famille (admin)
//   • useDeleteJobFamily()      — supprimer une famille (admin)
//   • useUpsertFrameworkItem()  — créer/modifier une compétence
//   • useDeleteFrameworkItem()  — supprimer une compétence
//   • useAssignJobFamily()      — assigner une famille à un user
//   • DEFAULT_COMPETENCIES      — 5 compétences standard
//   • FRAMEWORK_LEVEL_LABELS    — libellés des 5 niveaux
// Règle absolue : ne PAS modifier useTasks.js, usePulse.js, etc.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────

export const DEFAULT_COMPETENCIES = [
  { key: 'quality',       label: 'Qualité du travail',       icon: '⭐', color: '#4F46E5' },
  { key: 'deadlines',     label: 'Respect des délais',       icon: '⏱️', color: '#3B82F6' },
  { key: 'communication', label: 'Communication',            icon: '💬', color: '#10B981' },
  { key: 'teamwork',      label: 'Esprit d\'équipe',         icon: '🤝', color: '#F59E0B' },
  { key: 'initiative',    label: 'Initiative & Proactivité', icon: '🚀', color: '#EC4899' },
]

export const FRAMEWORK_LEVEL_LABELS = {
  1: { label: 'Insuffisant',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  2: { label: 'À améliorer',   color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  3: { label: 'Satisfaisant',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  4: { label: 'Bien',          color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  5: { label: 'Excellent',     color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
}

export const NOTE_TYPE_LABELS = {
  general:     { label: 'Note générale',   icon: '📝', color: '#6B7280' },
  positive:    { label: 'Point fort',      icon: '✅', color: '#10B981' },
  concern:     { label: 'Point d\'attention', icon: '⚠️', color: '#F59E0B' },
  action_plan: { label: 'Plan d\'action',  icon: '🎯', color: '#4F46E5' },
}

// ─── FAMILLES DE MÉTIERS ──────────────────────────────────────

export function useJobFamilies() {
  return useQuery({
    queryKey: ['job-families'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_families')
        .select('id, name, description, code, color, icon, is_active')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllJobFamilies() {
  return useQuery({
    queryKey: ['job-families-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_families')
        .select('id, name, description, code, color, icon, is_active, created_at')
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useJobFamilyWithFramework(familyId) {
  return useQuery({
    queryKey: ['job-family-framework', familyId],
    queryFn: async () => {
      if (!familyId) return null
      const { data: family, error: e1 } = await supabase
        .from('job_families')
        .select('*')
        .eq('id', familyId)
        .single()
      if (e1) throw e1

      const { data: items, error: e2 } = await supabase
        .from('competency_frameworks')
        .select('*')
        .eq('job_family_id', familyId)
        .eq('is_active', true)
        .order('sort_order')
      if (e2) throw e2

      return { ...family, competencies: items || [] }
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllFrameworks() {
  return useQuery({
    queryKey: ['all-competency-frameworks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competency_frameworks')
        .select(`
          *,
          job_families (id, name, code, color, icon)
        `)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserJobFamily(userId) {
  return useQuery({
    queryKey: ['user-job-family', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('users')
        .select(`
          job_family_id,
          job_families (id, name, code, color, icon,
            competency_frameworks (*)
          )
        `)
        .eq('id', userId)
        .single()
      if (error) return null
      return data?.job_families || null
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── MUTATIONS FAMILLES ───────────────────────────────────────

export function useCreateJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('job_families')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-families'] }),
  })
}

export function useUpdateJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('job_families')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['job-families'] })
      qc.invalidateQueries({ queryKey: ['job-family-framework', vars.id] })
    },
  })
}

export function useDeleteJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('job_families')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-families'] }),
  })
}

// ─── MUTATIONS COMPÉTENCES ────────────────────────────────────

export function useUpsertFrameworkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('competency_frameworks')
        .upsert(payload, { onConflict: 'job_family_id,competency_key' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['job-family-framework', vars.job_family_id] })
      qc.invalidateQueries({ queryKey: ['all-competency-frameworks'] })
    },
  })
}

export function useDeleteFrameworkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, job_family_id }) => {
      const { error } = await supabase
        .from('competency_frameworks')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
      return job_family_id
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ['job-family-framework', familyId] })
    },
  })
}

// ─── ASSIGNATION FAMILLE ──────────────────────────────────────

export function useAssignJobFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, jobFamilyId }) => {
      const { error } = await supabase
        .from('users')
        .update({ job_family_id: jobFamilyId })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['user-job-family', vars.userId] })
    },
  })
}

// ─── Stubs pour CartographieCharges (Étape 8) ────────────────
// Ces hooks seront implémentés en S64+ avec les vraies tables Supabase
export function useWorkloadSummary() {
  return { data: [], isLoading: false, error: null }
}
export function useNitaWorkloadCorrelation() {
  return { data: null, isLoading: false, error: null }
}

// ─── Fusionné depuis useCompetencyS84 ─────────────────────────────────────────

// ─── NIVEAU LABELS ────────────────────────────────────────────
export const COMPETENCY_LEVEL_LABELS = {
  1: { label: 'Débutant',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  2: { label: 'En cours',    color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  3: { label: 'Compétent',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  4: { label: 'Avancé',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  5: { label: 'Expert',      color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
}

export const SOURCE_LABELS = {
  manager: { label: 'Manager',  color: '#8B5CF6' },
  self:     { label: 'Auto-éval', color: '#3B82F6' },
  '360':    { label: '360°',     color: '#10B981' },
  import:   { label: 'Import',   color: '#6B7280' },
}

// ─── CATÉGORIES ───────────────────────────────────────────────
export function useCompetencyCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['competency_categories', user?.organization_id],
    enabled: !!user?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competency_categories')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('order_index')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCompetencyCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('competency_categories')
        .insert({ ...payload, organization_id: user.organization_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competency_categories'] }),
  })
}

// ─── COMPÉTENCES ──────────────────────────────────────────────
export function useCompetenciesList() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['competencies_s84', user?.organization_id],
    enabled: !!user?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencies')
        .select(`
          *,
          competency_categories (id, name, color, icon)
        `)
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCompetency() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('competencies')
        .insert({ ...payload, organization_id: user.organization_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencies_s84'] }),
  })
}

export function useUpdateCompetency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data, error } = await supabase
        .from('competencies')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencies_s84'] }),
  })
}

export function useDeleteCompetency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('competencies')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencies_s84'] }),
  })
}

// ─── EXIGENCES RÔLE ───────────────────────────────────────────
export function useRoleRequirements({ roleName, positionId } = {}) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['role_competency_req', user?.organization_id, roleName, positionId],
    enabled: !!user?.organization_id && !!(roleName || positionId),
    queryFn: async () => {
      let q = supabase
        .from('role_competency_requirements')
        .select(`*, competencies(id, name, description, competency_categories(name, color))`)
        .eq('organization_id', user.organization_id)
      if (roleName)    q = q.eq('role_name',    roleName)
      if (positionId)  q = q.eq('position_id',  positionId)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

export function useAllRoleRequirements() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['role_competency_req_all', user?.organization_id],
    enabled: !!user?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_competency_requirements')
        .select(`*, competencies(id, name, competency_categories(name, color))`)
        .eq('organization_id', user.organization_id)
        .order('role_name')
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpsertRoleRequirement() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('role_competency_requirements')
        .upsert(
          { ...payload, organization_id: user.organization_id },
          { onConflict: payload.role_name
            ? 'organization_id,role_name,competency_id'
            : 'organization_id,position_id,competency_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role_competency_req'] }),
  })
}

export function useDeleteRoleRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('role_competency_requirements')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role_competency_req'] }),
  })
}

// ─── ÉVALUATIONS ──────────────────────────────────────────────
export function useUserAssessments(userId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user_competency_assessments', user?.organization_id, userId],
    enabled: !!user?.organization_id && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_competency_assessments')
        .select(`
          *,
          competencies(id, name, description, competency_categories(name, color)),
          assessed_by_user:users!assessed_by(first_name, last_name)
        `)
        .eq('organization_id', user.organization_id)
        .eq('user_id', userId)
        .order('assessed_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

export function useOrgAssessments() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['org_competency_assessments', user?.organization_id],
    enabled: !!user?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_competency_assessments')
        .select(`
          *,
          users!user_id(id, first_name, last_name, role),
          competencies(id, name, competency_categories(name, color))
        `)
        .eq('organization_id', user.organization_id)
        .order('assessed_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useUpsertAssessment() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('user_competency_assessments')
        .upsert(
          {
            ...payload,
            organization_id: user.organization_id,
            assessed_by: payload.assessed_by || user.id,
            assessed_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,user_id,competency_id,source' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['user_competency_assessments'] })
      qc.invalidateQueries({ queryKey: ['competency_gaps'] })
    },
  })
}

// ─── RPC : GAPS ───────────────────────────────────────────────
export function useCompetencyGaps(userId = null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['competency_gaps', user?.organization_id, userId],
    enabled: !!user?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competency_gaps', {
        p_org_id:  user.organization_id,
        p_user_id: userId || null,
      })
      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000,
  })
}

// ─── RPC : REFRESH MV ─────────────────────────────────────────
export function useRefreshCompetencyCoverage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_competency_coverage_mv')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competency_gaps'] })
      qc.invalidateQueries({ queryKey: ['org_competency_assessments'] })
    },
  })
}

// ─── useCompetencyCoverageStats ───────────────────────────────
// ✅ Fix S89 (BUG-M4) : v_competency_coverage_secure (RLS-safe) au lieu de mv_competency_coverage
// Colonnes : organization_id, user_id, user_name, user_role, competency_id,
//            competency_name, category_name, category_color, best_level, required_level, gap
export function useCompetencyCoverageStats(userId = null) {
  const { user } = useAuth()
  const orgId    = user?.organization_id

  return useQuery({
    queryKey: ['competency_coverage_secure', orgId, userId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('v_competency_coverage_secure')
        .select('user_id, user_name, user_role, competency_id, competency_name, category_name, category_color, best_level, required_level, gap')
        .order('category_name', { ascending: true })
        .order('competency_name', { ascending: true })

      if (userId) query = query.eq('user_id', userId)

      const { data, error } = await query
      if (error) throw error

      const rows = data || []

      // Agréger par compétence (toute l'org ou pour un user)
      const byCompetency = rows.reduce((acc, r) => {
        const key = r.competency_id
        if (!acc[key]) {
          acc[key] = {
            competency_id:   r.competency_id,
            competency_name: r.competency_name,
            category_name:   r.category_name,
            category_color:  r.category_color,
            required_level:  r.required_level,
            levels:          [],
            gaps:            [],
          }
        }
        acc[key].levels.push(r.best_level)
        acc[key].gaps.push(r.gap)
        return acc
      }, {})

      const competencies = Object.values(byCompetency).map(c => ({
        ...c,
        avg_level: c.levels.length
          ? parseFloat((c.levels.reduce((s, v) => s + v, 0) / c.levels.length).toFixed(1))
          : 0,
        avg_gap: c.gaps.length
          ? parseFloat((c.gaps.reduce((s, v) => s + v, 0) / c.gaps.length).toFixed(1))
          : 0,
        covered_count: c.gaps.filter(g => g <= 0).length,
        total_count:   c.gaps.length,
      }))

      // Stats globales
      const totalGap    = rows.reduce((s, r) => s + Math.max(r.gap, 0), 0)
      const gapCount    = rows.filter(r => r.gap > 0).length
      const coveredPct  = rows.length
        ? Math.round((rows.filter(r => r.gap <= 0).length / rows.length) * 100)
        : 0

      return { rows, competencies, totalGap, gapCount, coveredPct }
    },
  })
}