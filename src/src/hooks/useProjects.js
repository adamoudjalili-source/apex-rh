// ===== FICHIER: src/hooks/useProjects.js =====
// Session 16 fix — .single() remplacé par gestion array dans useProject
// pour éviter "Cannot coerce the result to a single JSON object"
// + useAllUsersForProject via RPC get_assignable_users()
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logAudit } from '../lib/auditLog'

const PROJECT_SELECT = `
  *,
  owner:users!projects_owner_id_fkey(id, first_name, last_name, role),
  directions(id, name),
  divisions(id, name),
  services(id, name),
  project_members(
    id, role, user_id, joined_at,
    user:users!project_members_user_id_fkey(id, first_name, last_name, role)
  ),
  milestones(id, title, due_date, status, position, completed_at, created_at),
  deliverables(
    id, title, status, due_date, milestone_id, created_at,
    assignee:users!deliverables_assignee_id_fkey(id, first_name, last_name)
  ),
  risks(
    id, title, probability, impact, status, created_at,
    risk_owner:users!risks_owner_id_fkey(id, first_name, last_name)
  ),
  project_tasks(id, task_id)
`

// ─── FETCH ALL PROJECTS ──────────────────────────────────────
export function useProjects(filters = {}) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(PROJECT_SELECT)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.search) query = query.ilike('name', `%${filters.search}%`)
      if (filters.direction_id) query = query.eq('direction_id', filters.direction_id)
      if (filters.division_id) query = query.eq('division_id', filters.division_id)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })
}

// ─── FETCH SINGLE PROJECT (avec tâches liées) ────────────────
export function useProject(projectId) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      // On évite .single() qui peut échouer avec "Cannot coerce the result
      // to a single JSON object" quand les jointures + RLS créent des ambiguïtés
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_SELECT)
        .eq('id', projectId)

      if (error) throw error
      if (!data || data.length === 0) throw new Error('Projet non trouvé')

      const project = data[0]

      if (project.project_tasks?.length) {
        const taskIds = project.project_tasks.map((pt) => pt.task_id)
        const { data: tasks } = await supabase
          .from('tasks')
          .select(`
            id, title, status, priority, start_date, due_date,
            task_assignees(
              user:users!task_assignees_user_id_fkey(id, first_name, last_name)
            )
          `)
          .in('id', taskIds)
          .eq('is_archived', false)
          .order('due_date', { ascending: true, nullsFirst: false })
        project._linked_tasks = tasks || []
      } else {
        project._linked_tasks = []
      }

      return project
    },
    enabled: !!projectId,
  })
}

// ─── CREATE PROJECT ──────────────────────────────────────────
export function useCreateProject() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (projectData) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          owner_id: profile.id,
          direction_id: projectData.direction_id || profile.direction_id,
          division_id: projectData.division_id || profile.division_id,
          service_id: projectData.service_id || profile.service_id,
        })
        .select()
        .single()
      if (error) throw error

      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: profile.id,
        role: 'chef_projet',
      })

      return data
    },
    onSuccess: (data) => {
      logAudit('project_created', 'project', data.id, { name: data.name })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ─── UPDATE PROJECT ──────────────────────────────────────────
export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })
}

// ─── DELETE PROJECT ──────────────────────────────────────────
export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      logAudit('project_deleted', 'project', id)
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ─── MEMBERS CRUD ────────────────────────────────────────────

export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, userId, role = 'membre' }) => {
      const { data, error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', data.project_id] })
    },
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role, projectId }) => {
      const { error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const { error } = await supabase.from('project_members').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

// ─── MILESTONES CRUD ─────────────────────────────────────────

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (msData) => {
      const { count } = await supabase
        .from('milestones')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', msData.project_id)

      const { data, error } = await supabase
        .from('milestones')
        .insert({ ...msData, position: (count || 0) + 1 })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', data.project_id] })
    },
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, projectId }) => {
      const { error } = await supabase.from('milestones').update(updates).eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

// ─── DELIVERABLES CRUD ──────────────────────────────────────

export function useCreateDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (delData) => {
      const { data, error } = await supabase
        .from('deliverables')
        .insert(delData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['project', data.project_id] })
    },
  })
}

export function useUpdateDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, projectId }) => {
      const { error } = await supabase.from('deliverables').update(updates).eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

export function useDeleteDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const { error } = await supabase.from('deliverables').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

// ─── RISKS CRUD ─────────────────────────────────────────────

export function useCreateRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (riskData) => {
      const { data, error } = await supabase
        .from('risks')
        .insert(riskData)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['project', data.project_id] })
    },
  })
}

export function useUpdateRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, projectId }) => {
      const { error } = await supabase.from('risks').update(updates).eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

export function useDeleteRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const { error } = await supabase.from('risks').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
    },
  })
}

// ─── LINK / UNLINK TASK ↔ PROJECT ───────────────────────────

export function useLinkTaskToProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, projectId }) => {
      const { error } = await supabase
        .from('project_tasks')
        .insert({ project_id: projectId, task_id: taskId })
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['unlinked-tasks'] })
    },
  })
}

export function useUnlinkTaskFromProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, projectId }) => {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('project_id', projectId)
        .eq('task_id', taskId)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['unlinked-tasks'] })
    },
  })
}

// ─── UPDATE TASK DATES (for Gantt drag & drop) ──────────────
export function useUpdateTaskDates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, startDate, dueDate, projectId }) => {
      const updates = {}
      if (startDate !== undefined) updates.start_date = startDate
      if (dueDate !== undefined) updates.due_date = dueDate

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project', res.projectId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ─── FETCH TASKS LINKED TO A PROJECT (pour Gantt) ────────────
export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data: links } = await supabase
        .from('project_tasks')
        .select('task_id')
        .eq('project_id', projectId)
      const taskIds = (links || []).map((l) => l.task_id)
      if (taskIds.length === 0) return []

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, start_date, due_date,
          task_assignees(
            user:users!task_assignees_user_id_fkey(id, first_name, last_name)
          )
        `)
        .in('id', taskIds)
        .eq('is_archived', false)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
    staleTime: 15000,
  })
}

// ─── FETCH ALL USERS (pour ajout membres) ────────────────────
// Session 16 fix : utilise RPC get_assignable_users() au lieu de SELECT direct
// pour contourner le RLS qui ne montre que l'utilisateur connecté
export function useAllUsersForProject() {
  return useQuery({
    queryKey: ['all-users-project'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assignable_users')
      if (error) throw error
      return (data || []).sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
    },
    staleTime: 60000,
  })
}

// ─── FETCH UNLINKED TASKS (pour liaison) ─────────────────────
export function useUnlinkedTasks(projectId) {
  return useQuery({
    queryKey: ['unlinked-tasks', projectId],
    queryFn: async () => {
      const { data: linked } = await supabase
        .from('project_tasks')
        .select('task_id')
        .eq('project_id', projectId)
      const linkedIds = (linked || []).map((l) => l.task_id)

      let query = supabase
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(100)

      const { data, error } = await query
      if (error) throw error
      return (data || []).filter((t) => !linkedIds.includes(t.id))
    },
    enabled: !!projectId,
    staleTime: 15000,
  })
}

// ─── FETCH ORG STRUCTURE (pour formulaire) ───────────────────
export function useOrgStructure() {
  return useQuery({
    queryKey: ['org-structure-project'],
    queryFn: async () => {
      const [dirRes, divRes, svcRes] = await Promise.all([
        supabase.from('directions').select('id, name').eq('is_active', true).order('name'),
        supabase.from('divisions').select('id, name, direction_id').eq('is_active', true).order('name'),
        supabase.from('services').select('id, name, division_id').eq('is_active', true).order('name'),
      ])
      return {
        directions: dirRes.data || [],
        divisions: divRes.data || [],
        services: svcRes.data || [],
      }
    },
    staleTime: 60000,
  })
}
// ─── S79 ─────────────────────────────────────────────────────

// useProjectOKRLinks : OKRs liés à un projet
export function useProjectOKRLinks(projectId) {
  return useQuery({
    queryKey: ['project-okr-links', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_okr_links')
        .select(`
          id, objective_id, created_at,
          objective:objectives(
            id, title, status, progress, level,
            key_results(id, title, current_value, target_value, unit, confidence_level)
          )
        `)
        .eq('project_id', projectId)
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
    staleTime: 15000,
  })
}

// useLinkProjectToOKR : lier projet ↔ objectif
export function useLinkProjectToOKR() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ projectId, objectiveId }) => {
      const { data, error } = await supabase
        .from('project_okr_links')
        .insert({
          project_id: projectId,
          objective_id: objectiveId,
          organization_id: profile.organization_id,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project-okr-links', projectId] })
    },
  })
}

// useUnlinkProjectOKR : délier projet ↔ objectif
export function useUnlinkProjectOKR() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ linkId, projectId }) => {
      const { error } = await supabase
        .from('project_okr_links')
        .delete()
        .eq('id', linkId)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-okr-links', res.projectId] })
    },
  })
}

// useProjectBudget : lignes budget + variance
export function useProjectBudget(projectId) {
  return useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .select('*')
        .eq('project_id', projectId)
        .order('category')
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
    staleTime: 15000,
  })
}

// useUpsertBudgetLine : créer ou mettre à jour une ligne budget
export function useUpsertBudgetLine() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, projectId, category, label, amount_planned, amount_actual, note }) => {
      if (id) {
        const { error } = await supabase
          .from('project_budget_lines')
          .update({ category, label, amount_planned, amount_actual, note, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
        return { projectId }
      } else {
        const { error } = await supabase
          .from('project_budget_lines')
          .insert({ project_id: projectId, category, label, amount_planned, amount_actual, note, organization_id: profile.organization_id })
        if (error) throw error
        return { projectId }
      }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-budget', res.projectId] })
    },
  })
}

// useDeleteBudgetLine
export function useDeleteBudgetLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const { error } = await supabase.from('project_budget_lines').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-budget', res.projectId] })
    },
  })
}

// useAdvancedMilestones : jalons avancés d'un projet
export function useAdvancedMilestones(projectId) {
  return useQuery({
    queryKey: ['project-adv-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_advanced_milestones')
        .select(`
          *,
          key_result:key_results(id, title, current_value, target_value, unit)
        `)
        .eq('project_id', projectId)
        .order('due_date')
      if (error) throw error
      return data || []
    },
    enabled: !!projectId,
    staleTime: 15000,
  })
}

// useCreateAdvancedMilestone
export function useCreateAdvancedMilestone() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('project_advanced_milestones')
        .insert({ ...payload, organization_id: profile.organization_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['project-adv-milestones', data.project_id] })
    },
  })
}

// useUpdateAdvancedMilestone
export function useUpdateAdvancedMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }) => {
      const { error } = await supabase
        .from('project_advanced_milestones')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-adv-milestones', res.projectId] })
    },
  })
}

// useDeleteAdvancedMilestone
export function useDeleteAdvancedMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const { error } = await supabase.from('project_advanced_milestones').delete().eq('id', id)
      if (error) throw error
      return { projectId }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-adv-milestones', res.projectId] })
    },
  })
}

// useProjectsGantt : tâches + jalons pour Gantt multi-projets (RPC)
export function useProjectsGantt(start, end) {
  return useQuery({
    queryKey: ['projects-gantt', start, end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_projects_gantt', {
        p_start: start,
        p_end: end,
      })
      if (error) throw error
      return data || { projects: [] }
    },
    enabled: !!(start && end),
    staleTime: 15000,
  })
}
