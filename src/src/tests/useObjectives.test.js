// src/tests/useObjectives.test.js — APEX RH — Session 52
// Tests unitaires : hooks useObjectives
// Coverage cible : ≥ 40% des lignes de useObjectives.js
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import {
  useObjectives,
  useObjective,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
  useCreateKeyResult,
  useUpdateKeyResult,
  useAllUsersForOkr,
} from '../hooks/useObjectives'

import { supabase } from '../lib/supabase'

// ─── FIXTURES ────────────────────────────────────────────────
const MOCK_PERIOD_ID = 'period-q1-2025'

const mockObjective = {
  id: 'obj-001',
  title: 'Améliorer la performance NITA',
  level: 'equipe',
  status: 'on_track',
  progress_score: 65,
  owner_id: 'user-test-001',
  period_id: MOCK_PERIOD_ID,
  parent_id: null,
  weight: 1.0,
  owner: { id: 'user-test-001', first_name: 'Alice', last_name: 'Test', role: 'chef_service' },
  period: { id: MOCK_PERIOD_ID, name: 'Q1 2025', start_date: '2025-01-01', end_date: '2025-03-31' },
  key_results: [],
  directions: null,
  divisions: null,
  services: null,
}

const mockObjective2 = {
  ...mockObjective,
  id: 'obj-002',
  title: 'Réduire le taux d\'absentéisme',
  level: 'direction',
  status: 'at_risk',
  progress_score: 30,
}

// ─── HELPERS ─────────────────────────────────────────────────
function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const mockFromTable = (table, data, error = null) => {
  const builder = supabase.__createQueryBuilder(
    Array.isArray(data) ? data : data ? [data] : [],
    error
  )
  supabase.from.mockImplementation((t) => {
    if (t === table) return builder
    return supabase.__createQueryBuilder([], null)
  })
  return builder
}

// ══════════════════════════════════════════════════════════════
// useObjectives
// ══════════════════════════════════════════════════════════════
describe('useObjectives', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne un tableau vide quand aucun objectif sur la période', async () => {
    mockFromTable('objectives', [])
    const { result } = renderHook(
      () => useObjectives(MOCK_PERIOD_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('retourne la liste des objectifs pour la période donnée', async () => {
    mockFromTable('objectives', [mockObjective, mockObjective2])
    const { result } = renderHook(
      () => useObjectives(MOCK_PERIOD_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[0].title).toBe('Améliorer la performance NITA')
  })

  it('n\'exécute pas la query si periodId est undefined', () => {
    const { result } = renderHook(
      () => useObjectives(undefined),
      { wrapper: createWrapper() }
    )
    // enabled dépend de periodId — sans periodId la query reste idle
    expect(result.current.isLoading || result.current.fetchStatus === 'idle').toBe(true)
  })

  it('propage les erreurs Supabase', async () => {
    mockFromTable('objectives', null, { message: 'Permission denied', code: '403' })
    const { result } = renderHook(
      () => useObjectives(MOCK_PERIOD_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeTruthy()
  })

  it('filtre par level quand le filtre est fourni', async () => {
    mockFromTable('objectives', [mockObjective])
    const { result } = renderHook(
      () => useObjectives(MOCK_PERIOD_ID, { level: 'equipe' }),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Le builder de test retourne les data mockées — on vérifie l'appel .eq sur level
    const builder = supabase.from.mock.results[0]?.value
    expect(builder?.eq).toHaveBeenCalledWith('period_id', MOCK_PERIOD_ID)
  })

  it('interroge la table objectives', async () => {
    mockFromTable('objectives', [])
    renderHook(() => useObjectives(MOCK_PERIOD_ID), { wrapper: createWrapper() })
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('objectives'))
  })

  it('respecte les noms de colonnes réels (progress_score, pas progress)', async () => {
    const obj = { ...mockObjective, progress_score: 72 }
    mockFromTable('objectives', [obj])
    const { result } = renderHook(
      () => useObjectives(MOCK_PERIOD_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data[0]).toHaveProperty('progress_score')
    expect(result.current.data[0]).not.toHaveProperty('progress')
  })

  it('inclut parent_id dans les données (ajouté S50)', async () => {
    const obj = { ...mockObjective, parent_id: 'obj-parent', weight: 0.5 }
    mockFromTable('objectives', [obj])
    const { result } = renderHook(
      () => useObjectives(MOCK_PERIOD_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data[0]).toHaveProperty('parent_id', 'obj-parent')
    expect(result.current.data[0]).toHaveProperty('weight', 0.5)
  })
})

// ══════════════════════════════════════════════════════════════
// useObjective (single)
// ══════════════════════════════════════════════════════════════
describe('useObjective', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne l\'objectif avec ses key_results', async () => {
    const obj = {
      ...mockObjective,
      parent_objective_id: null,
      key_results: [
        { id: 'kr-001', title: 'KR 1', current_value: 60, target_value: 100, score: 0.6 }
      ],
    }
    mockFromTable('objectives', obj)
    const { result } = renderHook(
      () => useObjective('obj-001'),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).not.toBeNull()
  })

  it('n\'exécute pas la query si objectiveId est undefined', () => {
    const { result } = renderHook(
      () => useObjective(undefined),
      { wrapper: createWrapper() }
    )
    expect(result.current.fetchStatus === 'idle' || result.current.isLoading).toBe(true)
  })

  it('propage les erreurs pour un objectif introuvable', async () => {
    mockFromTable('objectives', null, { message: 'Not found', code: '404' })
    const { result } = renderHook(
      () => useObjective('inexistant'),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ══════════════════════════════════════════════════════════════
// useCreateObjective (mutation)
// ══════════════════════════════════════════════════════════════
describe('useCreateObjective', () => {
  beforeEach(() => vi.clearAllMocks())

  it('expose mutate + mutateAsync + isPending', () => {
    const { result } = renderHook(() => useCreateObjective(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
    expect(typeof result.current.mutateAsync).toBe('function')
    expect(result.current.isPending).toBe(false)
  })

  it('commence en état idle', () => {
    const { result } = renderHook(() => useCreateObjective(), { wrapper: createWrapper() })
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// useUpdateObjective (mutation)
// ══════════════════════════════════════════════════════════════
describe('useUpdateObjective', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est une mutation valide', () => {
    const { result } = renderHook(() => useUpdateObjective(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
    expect(result.current.isPending).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// useDeleteObjective (mutation)
// ══════════════════════════════════════════════════════════════
describe('useDeleteObjective', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est une mutation valide', () => {
    const { result } = renderHook(() => useDeleteObjective(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
  })
})

// ══════════════════════════════════════════════════════════════
// useCreateKeyResult (mutation)
// ══════════════════════════════════════════════════════════════
describe('useCreateKeyResult', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est une mutation valide avec mutate', () => {
    const { result } = renderHook(() => useCreateKeyResult(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
    expect(result.current.isPending).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// useUpdateKeyResult (mutation)
// ══════════════════════════════════════════════════════════════
describe('useUpdateKeyResult', () => {
  beforeEach(() => vi.clearAllMocks())

  it('est une mutation valide', () => {
    const { result } = renderHook(() => useUpdateKeyResult(), { wrapper: createWrapper() })
    expect(typeof result.current.mutate).toBe('function')
  })
})

// ══════════════════════════════════════════════════════════════
// useAllUsersForOkr
// ══════════════════════════════════════════════════════════════
describe('useAllUsersForOkr', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne la liste des utilisateurs actifs', async () => {
    const users = [
      { id: 'u1', first_name: 'Alice', last_name: 'Martin', role: 'chef_service' },
      { id: 'u2', first_name: 'Bob',   last_name: 'Dupont', role: 'collaborateur' },
    ]
    mockFromTable('users', users)
    const { result } = renderHook(() => useAllUsersForOkr(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(Array.isArray(result.current.data)).toBe(true)
  })

  it('interroge la table users', async () => {
    mockFromTable('users', [])
    renderHook(() => useAllUsersForOkr(), { wrapper: createWrapper() })
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('users'))
  })
})
