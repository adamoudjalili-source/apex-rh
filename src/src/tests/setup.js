// src/tests/setup.js — APEX RH — Session 52
// Configuration globale Vitest + Testing Library

import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Nettoyer le DOM après chaque test
afterEach(() => cleanup())

// ─── MOCK : @supabase/supabase-js ─────────────────────────────
// Les hooks APEX RH utilisent supabase pour toutes les requêtes.
// On mocke le client pour isoler les tests des dépendances réseau.

vi.mock('../lib/supabase', () => {
  const createQueryBuilder = (defaultData = [], defaultError = null) => {
    const builder = {
      _data: defaultData,
      _error: defaultError,
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: defaultData[0] ?? null, error: defaultError }),
      single: vi.fn().mockResolvedValue({ data: defaultData[0] ?? null, error: defaultError }),
      then: vi.fn((resolve) => resolve({ data: defaultData, error: defaultError })),
    }
    // Permettre d'overrider les données dans les tests
    builder.__setData = (data, error = null) => {
      builder._data = data
      builder._error = error
      builder.single.mockResolvedValue({ data: data?.[0] ?? null, error })
      builder.maybeSingle.mockResolvedValue({ data: data?.[0] ?? null, error })
      builder.then.mockImplementation((resolve) => resolve({ data, error }))
    }
    return builder
  }

  const mockSupabase = {
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    __createQueryBuilder: createQueryBuilder,
  }
  return { supabase: mockSupabase }
})

// ─── MOCK : AuthContext ────────────────────────────────────────
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-test-001' },
    profile: {
      id: 'user-test-001',
      first_name: 'Alice',
      last_name: 'Test',
      role: 'chef_service',
      service_id: 'service-001',
      division_id: 'division-001',
      direction_id: 'direction-001',
      organization_id: 'org-nita-001',
    },
    loading: false,
  })),
  AuthProvider: ({ children }) => children,
}))

// ─── MOCK : auditLog ─────────────────────────────────────────
vi.mock('../lib/auditLog', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

// ─── MOCK : pulseHelpers ──────────────────────────────────────
vi.mock('../lib/pulseHelpers', () => ({
  getTodayString: vi.fn(() => '2025-03-06'),
  formatScore: vi.fn((s) => `${s}`),
}))

// Polyfills navigateur manquants dans jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
