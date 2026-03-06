// ============================================================
// APEX RH — tests/useApiKeys.test.js
// Session 53 — Tests hooks API & Webhooks
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

// ─── Mock Supabase ────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select  : vi.fn().mockReturnThis(),
      insert  : vi.fn().mockReturnThis(),
      update  : vi.fn().mockReturnThis(),
      delete  : vi.fn().mockReturnThis(),
      eq      : vi.fn().mockReturnThis(),
      gte     : vi.fn().mockReturnThis(),
      lte     : vi.fn().mockReturnThis(),
      order   : vi.fn().mockReturnThis(),
      limit   : vi.fn().mockReturnThis(),
      single  : vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
    },
  },
}))

// ─── Mock AuthContext ─────────────────────────────────────────
const mockUser = {
  id              : 'user-001',
  organization_id : 'org-001',
  role            : 'administrateur',
}
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// ─── Wrapper QueryClient ──────────────────────────────────────
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => createElement(QueryClientProvider, { client: qc }, children)
}

// ─── Import hooks ─────────────────────────────────────────────
import {
  generateApiKey, hashKey,
  AVAILABLE_SCOPES, SCOPE_PRESETS,
} from '../hooks/useApiKeys'
import {
  generateWebhookSecret, WEBHOOK_EVENTS,
} from '../hooks/useWebhooks'
import {
  applyTransform, SOURCE_SYSTEMS, TARGET_TABLES,
} from '../hooks/useFieldMappings'

// ============================================================
// Tests generateApiKey
// ============================================================
describe('generateApiKey', () => {
  it('génère une clé commençant par apx_live_', () => {
    const key = generateApiKey()
    expect(key).toMatch(/^apx_live_[0-9a-f]{64}$/)
  })

  it('génère des clés uniques', () => {
    const k1 = generateApiKey()
    const k2 = generateApiKey()
    expect(k1).not.toBe(k2)
  })

  it('la clé a la bonne longueur (9 + 64 chars)', () => {
    const key = generateApiKey()
    expect(key).toHaveLength(9 + 64)
  })
})

// ============================================================
// Tests hashKey
// ============================================================
describe('hashKey', () => {
  it('retourne un hash SHA-256 de 64 caractères hex', async () => {
    const hash = await hashKey('test_key')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('deux fois la même clé → même hash', async () => {
    const h1 = await hashKey('same_key')
    const h2 = await hashKey('same_key')
    expect(h1).toBe(h2)
  })

  it('clés différentes → hashes différents', async () => {
    const h1 = await hashKey('key_alpha')
    const h2 = await hashKey('key_beta')
    expect(h1).not.toBe(h2)
  })
})

// ============================================================
// Tests SCOPE_PRESETS
// ============================================================
describe('SCOPE_PRESETS', () => {
  it('readonly contient uniquement des scopes :read', () => {
    SCOPE_PRESETS.readonly.forEach(s => {
      expect(s).toContain(':read')
    })
  })

  it('scim contient scim:write', () => {
    expect(SCOPE_PRESETS.scim).toContain('scim:write')
  })

  it('full contient tous les scopes disponibles', () => {
    const allValues = AVAILABLE_SCOPES.map(s => s.value)
    allValues.forEach(v => {
      expect(SCOPE_PRESETS.full).toContain(v)
    })
  })

  it('AVAILABLE_SCOPES a au moins 9 scopes', () => {
    expect(AVAILABLE_SCOPES.length).toBeGreaterThanOrEqual(9)
  })

  it('chaque scope a un groupe', () => {
    AVAILABLE_SCOPES.forEach(s => {
      expect(s.group).toBeTruthy()
    })
  })
})

// ============================================================
// Tests generateWebhookSecret
// ============================================================
describe('generateWebhookSecret', () => {
  it('génère un secret commençant par whsec_', () => {
    const secret = generateWebhookSecret()
    expect(secret).toMatch(/^whsec_[0-9a-f]{64}$/)
  })

  it('génère des secrets uniques', () => {
    const s1 = generateWebhookSecret()
    const s2 = generateWebhookSecret()
    expect(s1).not.toBe(s2)
  })
})

// ============================================================
// Tests WEBHOOK_EVENTS
// ============================================================
describe('WEBHOOK_EVENTS', () => {
  it('contient au moins 10 événements', () => {
    expect(WEBHOOK_EVENTS.length).toBeGreaterThanOrEqual(10)
  })

  it('tous les événements ont un group', () => {
    WEBHOOK_EVENTS.forEach(e => {
      expect(e.group).toBeTruthy()
    })
  })

  it('inclut user.created et user.deactivated', () => {
    const values = WEBHOOK_EVENTS.map(e => e.value)
    expect(values).toContain('user.created')
    expect(values).toContain('user.deactivated')
  })

  it('inclut des événements de performance', () => {
    const values = WEBHOOK_EVENTS.map(e => e.value)
    expect(values.some(v => v.startsWith('performance.'))).toBe(true)
  })
})

// ============================================================
// Tests applyTransform
// ============================================================
describe('applyTransform', () => {
  it('toLowerCase transforme en minuscules', () => {
    expect(applyTransform('HELLO', 'toLowerCase')).toBe('hello')
  })

  it('toUpperCase transforme en majuscules', () => {
    expect(applyTransform('hello', 'toUpperCase')).toBe('HELLO')
  })

  it('trim supprime les espaces', () => {
    expect(applyTransform('  hello  ', 'trim')).toBe('hello')
  })

  it('splitFirst retourne le premier mot', () => {
    expect(applyTransform('Jean Pierre', 'splitFirst')).toBe('Jean')
  })

  it('splitLast retourne le dernier mot', () => {
    expect(applyTransform('Jean Pierre Dupont', 'splitLast')).toBe('Dupont')
  })

  it('booleanMap gère Y/N/yes/no/true/false', () => {
    expect(applyTransform('Y',    'booleanMap')).toBe(true)
    expect(applyTransform('yes',  'booleanMap')).toBe(true)
    expect(applyTransform('true', 'booleanMap')).toBe(true)
    expect(applyTransform('1',    'booleanMap')).toBe(true)
    expect(applyTransform('oui',  'booleanMap')).toBe(true)
    expect(applyTransform('no',   'booleanMap')).toBe(false)
    expect(applyTransform('N',    'booleanMap')).toBe(false)
  })

  it('date_iso convertit en date ISO', () => {
    const result = applyTransform('2026-01-15', 'date_iso')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('null transform → retourne la valeur inchangée', () => {
    expect(applyTransform('hello', null)).toBe('hello')
  })

  it('valeur null → retourne null', () => {
    expect(applyTransform(null, 'toLowerCase')).toBeNull()
  })
})

// ============================================================
// Tests SOURCE_SYSTEMS et TARGET_TABLES
// ============================================================
describe('SOURCE_SYSTEMS', () => {
  it('contient scim et workday', () => {
    const values = SOURCE_SYSTEMS.map(s => s.value)
    expect(values).toContain('scim')
    expect(values).toContain('workday')
  })

  it('chaque système a une icône', () => {
    SOURCE_SYSTEMS.forEach(s => {
      expect(s.icon).toBeTruthy()
    })
  })
})

describe('TARGET_TABLES', () => {
  it('table users existe avec des champs', () => {
    expect(TARGET_TABLES.users).toBeDefined()
    expect(TARGET_TABLES.users.fields.length).toBeGreaterThan(0)
  })

  it('users a les champs requis email, first_name, last_name', () => {
    const fieldValues = TARGET_TABLES.users.fields.map(f => f.value)
    expect(fieldValues).toContain('email')
    expect(fieldValues).toContain('first_name')
    expect(fieldValues).toContain('last_name')
  })

  it('les champs requis sont marqués is_required: true', () => {
    const required = TARGET_TABLES.users.fields.filter(f => f.required)
    expect(required.length).toBeGreaterThan(0)
    const names = required.map(f => f.value)
    expect(names).toContain('email')
  })
})
