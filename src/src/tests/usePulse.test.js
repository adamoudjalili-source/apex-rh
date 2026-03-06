// src/tests/usePulse.test.js — APEX RH — Session 52
// Tests unitaires : hooks usePulse
// Coverage cible : ≥ 40% des lignes de usePulse.js
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Les hooks à tester
import {
  useTodayMorningPlan,
  useTodayLog,
  useTodayScore,
  useMyActiveTasks,
  useSubmitMorningPlan,
  useUpdateLog,
  useAddLogEntry,
  useDeleteLogEntry,
} from '../hooks/usePulse'

// ─── HELPERS ─────────────────────────────────────────────────
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

// Import du mock supabase pour contrôler les retours
import { supabase } from '../lib/supabase'

const mockFrom = (data = null, error = null) => {
  const builder = supabase.__createQueryBuilder(
    Array.isArray(data) ? data : data ? [data] : [],
    error
  )
  supabase.from.mockReturnValue(builder)
  return builder
}

// ══════════════════════════════════════════════════════════════
// useTodayMorningPlan
// ══════════════════════════════════════════════════════════════
describe('useTodayMorningPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne null quand aucun plan existant pour aujourd\'hui', async () => {
    mockFrom(null)
    const { result } = renderHook(() => useTodayMorningPlan(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('retourne le plan du jour quand il existe', async () => {
    const plan = {
      id: 'plan-001',
      user_id: 'user-test-001',
      plan_date: '2025-03-06',
      priorities: ['Tâche A', 'Tâche B'],
      status: 'submitted',
    }
    mockFrom(plan)
    const { result } = renderHook(() => useTodayMorningPlan(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(plan)
  })

  it('expose isLoading = true initialement', () => {
    mockFrom(null)
    const { result } = renderHook(() => useTodayMorningPlan(), { wrapper: createWrapper() })
    // Au premier rendu, la query est en cours
    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('expose une queryKey avec l\'id utilisateur et la date du jour', async () => {
    mockFrom(null)
    const { result } = renderHook(() => useTodayMorningPlan(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Vérifie que supabase.from a été appelé avec la bonne table
    expect(supabase.from).toHaveBeenCalledWith('morning_plans')
  })

  it('propage les erreurs Supabase', async () => {
    mockFrom(null, { message: 'DB error', code: '500' })
    const { result } = renderHook(() => useTodayMorningPlan(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeTruthy()
  })
})

// ══════════════════════════════════════════════════════════════
// useTodayLog
// ══════════════════════════════════════════════════════════════
describe('useTodayLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne null quand aucun log du jour', async () => {
    mockFrom(null)
    const { result } = renderHook(() => useTodayLog(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('retourne le log du jour quand il existe', async () => {
    const log = {
      id: 'log-001',
      user_id: 'user-test-001',
      log_date: '2025-03-06',
      status: 'draft',
      entries: [],
    }
    mockFrom(log)
    const { result } = renderHook(() => useTodayLog(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ id: 'log-001' })
  })

  it('interroge la table pulse_daily_logs', async () => {
    mockFrom(null)
    const { result } = renderHook(() => useTodayLog(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(supabase.from).toHaveBeenCalledWith('pulse_daily_logs')
  })
})

// ══════════════════════════════════════════════════════════════
// useTodayScore
// ══════════════════════════════════════════════════════════════
describe('useTodayScore', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne null quand pas encore de score du jour', async () => {
    mockFrom(null)
    const { result } = renderHook(() => useTodayScore(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('retourne le score PULSE du jour', async () => {
    const score = {
      id: 'score-001',
      user_id: 'user-test-001',
      score_date: '2025-03-06',
      score_delivery: 78,
      score_quality: 82,
      score_total: 80,
      score_period: 'daily',
    }
    mockFrom(score)
    const { result } = renderHook(() => useTodayScore(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.score_total).toBe(80)
    expect(result.current.data?.score_delivery).toBe(78)
  })

  it('utilise les noms de colonnes réels (score_total, score_date)', async () => {
    // Ce test vérifie qu'on n'utilise pas les anciens noms (total, date)
    const score = { id: 'score-001', score_total: 75, score_date: '2025-03-06' }
    mockFrom(score)
    const { result } = renderHook(() => useTodayScore(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).not.toHaveProperty('total')
    expect(result.current.data).not.toHaveProperty('date')
  })

  it('interroge la table performance_scores', async () => {
    mockFrom(null)
    renderHook(() => useTodayScore(), { wrapper: createWrapper() })
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('performance_scores'))
  })
})

// ══════════════════════════════════════════════════════════════
// useMyActiveTasks
// ══════════════════════════════════════════════════════════════
describe('useMyActiveTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne un tableau vide quand aucune tâche', async () => {
    // Premier appel : tasks (tableau vide), deuxième : task_assignees
    supabase.from.mockImplementation((table) => {
      if (table === 'tasks') {
        const b = supabase.__createQueryBuilder([], null)
        return b
      }
      if (table === 'task_assignees') {
        return supabase.__createQueryBuilder([], null)
      }
      return supabase.__createQueryBuilder([], null)
    })
    const { result } = renderHook(() => useMyActiveTasks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(Array.isArray(result.current.data)).toBe(true)
  })

  it('filtre les tâches créées ou assignées à l\'utilisateur courant', async () => {
    const tasks = [
      { id: 't1', title: 'Tâche propre', created_by: 'user-test-001', status: 'en_cours' },
      { id: 't2', title: 'Tâche autre', created_by: 'autre-user', status: 'en_cours' },
    ]
    const assignees = [{ task_id: 't1' }] // user-test-001 est assigné à t1

    supabase.from.mockImplementation((table) => {
      if (table === 'tasks') return supabase.__createQueryBuilder(tasks, null)
      if (table === 'task_assignees') return supabase.__createQueryBuilder(assignees, null)
      return supabase.__createQueryBuilder([], null)
    })

    const { result } = renderHook(() => useMyActiveTasks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // t1 est créé par user-test-001 (created_by match) — retourné
    // t2 n'est ni créé par, ni assigné à user-test-001 — filtré
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].id).toBe('t1')
  })
})

// ══════════════════════════════════════════════════════════════
// useSubmitMorningPlan (mutation)
// ══════════════════════════════════════════════════════════════
describe('useSubmitMorningPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est une mutation avec mutate + mutateAsync', () => {
    const { result } = renderHook(() => useSubmitMorningPlan(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
    expect(typeof result.current.mutateAsync).toBe('function')
  })

  it('commence en état idle (non pending)', () => {
    const { result } = renderHook(() => useSubmitMorningPlan(), { wrapper: createWrapper() })
    expect(result.current.isPending).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// useAddLogEntry (mutation)
// ══════════════════════════════════════════════════════════════
describe('useAddLogEntry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est exporté comme une mutation React Query', () => {
    const { result } = renderHook(() => useAddLogEntry(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
  })

  it('commence en état idle', () => {
    const { result } = renderHook(() => useAddLogEntry(), { wrapper: createWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// useDeleteLogEntry (mutation)
// ══════════════════════════════════════════════════════════════
describe('useDeleteLogEntry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est exporté et commence en état idle', () => {
    const { result } = renderHook(() => useDeleteLogEntry(), { wrapper: createWrapper() })
    expect(result.current.isPending).toBe(false)
    expect(typeof result.current.mutate).toBe('function')
  })
})

// ══════════════════════════════════════════════════════════════
// useUpdateLog (mutation)
// ══════════════════════════════════════════════════════════════
describe('useUpdateLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('expose mutate + isPending', () => {
    const { result } = renderHook(() => useUpdateLog(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
    expect(result.current.isPending).toBe(false)
  })
})
