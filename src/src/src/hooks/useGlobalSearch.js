// ============================================================
// APEX RH — useGlobalSearch.js
// ✅ Session 12 — Recherche universelle Ctrl+K
// Recherche simultanée : tâches, objectifs, projets, utilisateurs
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300
const MAX_RESULTS_PER_TYPE = 5

export function useGlobalSearch() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const abortRef = useRef(null)
  const timerRef = useRef(null)

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < MIN_QUERY_LENGTH || !profile?.id) {
      setResults(null)
      setIsSearching(false)
      return
    }

    // Annuler la recherche précédente
    if (abortRef.current) abortRef.current.abort = true
    const thisSearch = { abort: false }
    abortRef.current = thisSearch

    setIsSearching(true)

    try {
      const term = `%${searchQuery}%`

      // Lancer les 4 recherches en parallèle
      const [tasksRes, objectivesRes, projectsRes, usersRes] = await Promise.allSettled([
        // ─── TÂCHES ────────────────────────────────────
        supabase
          .from('tasks')
          .select('id, title, status, priority, due_date')
          .eq('is_archived', false)
          .ilike('title', term)
          .order('updated_at', { ascending: false })
          .limit(MAX_RESULTS_PER_TYPE),

        // ─── OBJECTIFS ─────────────────────────────────
        supabase
          .from('objectives')
          .select('id, title, level, status, progress_score')
          .ilike('title', term)
          .order('updated_at', { ascending: false })
          .limit(MAX_RESULTS_PER_TYPE),

        // ─── PROJETS ───────────────────────────────────
        supabase
          .from('projects')
          .select('id, name, status, priority, progress')
          .eq('is_archived', false)
          .ilike('name', term)
          .order('updated_at', { ascending: false })
          .limit(MAX_RESULTS_PER_TYPE),

        // ─── UTILISATEURS ──────────────────────────────
        profile.role === 'administrateur' || profile.role === 'directeur'
          ? supabase
              .from('users')
              .select('id, first_name, last_name, email, role, is_active')
              .eq('is_active', true)
              .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
              .limit(MAX_RESULTS_PER_TYPE)
          : Promise.resolve({ data: [] }),
      ])

      // Vérifier si cette recherche n'a pas été remplacée
      if (thisSearch.abort) return

      const tasks = (tasksRes.status === 'fulfilled' ? tasksRes.value.data : []) || []
      const objectives = (objectivesRes.status === 'fulfilled' ? objectivesRes.value.data : []) || []
      const projects = (projectsRes.status === 'fulfilled' ? projectsRes.value.data : []) || []
      const users = (usersRes.status === 'fulfilled'
        ? (usersRes.value.data || usersRes.value)
        : []) || []

      const formatted = {
        tasks: tasks.map(t => ({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: formatTaskSubtitle(t),
          status: t.status,
          path: '/tasks',
        })),
        objectives: objectives.map(o => ({
          id: o.id,
          type: 'objective',
          title: o.title,
          subtitle: formatObjSubtitle(o),
          status: o.status,
          path: '/objectives',
        })),
        projects: projects.map(p => ({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: formatProjSubtitle(p),
          status: p.status,
          path: '/projects',
        })),
        users: (Array.isArray(users) ? users : []).map(u => ({
          id: u.id,
          type: 'user',
          title: `${u.first_name} ${u.last_name}`.trim(),
          subtitle: ROLE_LABELS[u.role] || u.role,
          email: u.email,
          role: u.role,
          path: '/admin/users',
        })),
      }

      formatted.totalCount =
        formatted.tasks.length +
        formatted.objectives.length +
        formatted.projects.length +
        formatted.users.length

      if (!thisSearch.abort) {
        setResults(formatted)
      }
    } catch (err) {
      console.error('Erreur recherche globale:', err)
      if (!thisSearch.abort) setResults(null)
    } finally {
      if (!thisSearch.abort) setIsSearching(false)
    }
  }, [profile])

  // Debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query || query.length < MIN_QUERY_LENGTH) {
      setResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    timerRef.current = setTimeout(() => search(query), DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, search])

  const reset = useCallback(() => {
    setQuery('')
    setResults(null)
    setIsSearching(false)
  }, [])

  return { query, setQuery, results, isSearching, reset }
}

// ─── HELPERS ─────────────────────────────────────────────────
const ROLE_LABELS = {
  administrateur: 'Administrateur',
  directeur: 'Directeur',
  chef_division: 'Chef de Division',
  chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}

const TASK_STATUS_LABELS = {
  backlog: 'Backlog',
  a_faire: 'À faire',
  en_cours: 'En cours',
  en_revue: 'En revue',
  terminee: 'Terminée',
  bloquee: 'Bloquée',
}

const TASK_PRIORITY_LABELS = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
}

const OBJ_LEVEL_LABELS = {
  strategique: 'Stratégique',
  division: 'Division',
  service: 'Service',
  individuel: 'Individuel',
}

const PROJ_STATUS_LABELS = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  en_pause: 'En pause',
  termine: 'Terminé',
  annule: 'Annulé',
}

function formatTaskSubtitle(t) {
  const parts = []
  if (t.status) parts.push(TASK_STATUS_LABELS[t.status] || t.status)
  if (t.priority) parts.push(TASK_PRIORITY_LABELS[t.priority] || t.priority)
  if (t.due_date) {
    parts.push(new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))
  }
  return parts.join(' · ')
}

function formatObjSubtitle(o) {
  const parts = []
  if (o.level) parts.push(OBJ_LEVEL_LABELS[o.level] || o.level)
  if (o.progress_score != null) parts.push(`${(o.progress_score * 100).toFixed(0)}%`)
  return parts.join(' · ')
}

function formatProjSubtitle(p) {
  const parts = []
  if (p.status) parts.push(PROJ_STATUS_LABELS[p.status] || p.status)
  if (p.progress != null) parts.push(`${p.progress}%`)
  return parts.join(' · ')
}
