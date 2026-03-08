// ============================================================
// APEX RH — tests/usePushNotifications.test.js
// Session 56 — Tests Alertes Push & Onboarding enrichi
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  isPushSupported,
  usePushNotifications,
  useNotificationPermission,
  useServiceWorker,
  useOnboardingChecklist,
} from '../src/hooks/usePushNotifications'
import { CHECKLIST_ITEMS } from '../src/components/onboarding/OnboardingWizardV2'

// ─── Mocks ───────────────────────────────────────────────────

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select:   vi.fn().mockReturnThis(),
      insert:   vi.fn().mockReturnThis(),
      update:   vi.fn().mockReturnThis(),
      upsert:   vi.fn().mockReturnThis(),
      eq:       vi.fn().mockReturnThis(),
      in:       vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on:        vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-123', organization_id: 'org-abc', role: 'collaborateur' },
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryFn }) => ({ data: [], isLoading: false })),
  useMutation: vi.fn(() => ({
    mutate:     vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending:   false,
    error:       null,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}))

// ─── Mock navigateur ──────────────────────────────────────────
const mockServiceWorker = {
  register: vi.fn().mockResolvedValue({
    pushManager: {
      subscribe:          vi.fn().mockResolvedValue({ toJSON: () => ({ endpoint: 'https://fcm.example.com/push/sub1', keys: { p256dh: 'key1', auth: 'auth1' } }) }),
      getSubscription:    vi.fn().mockResolvedValue(null),
      permissionState:    vi.fn().mockResolvedValue('granted'),
    },
  }),
}

const mockNotification = {
  requestPermission: vi.fn().mockResolvedValue('granted'),
  permission: 'default',
}

// ─── TESTS ──────────────────────────────────────────────────

describe('isPushSupported()', () => {
  it('retourne true si serviceWorker + PushManager + Notification existent', () => {
    // Simuler support navigateur
    Object.defineProperty(global, 'navigator', {
      value: { serviceWorker: mockServiceWorker },
      writable: true,
    })
    Object.defineProperty(global, 'PushManager', { value: {}, writable: true })
    Object.defineProperty(global, 'Notification',  { value: mockNotification, writable: true })

    expect(isPushSupported()).toBe(true)
  })

  it('retourne false si serviceWorker absent', () => {
    const origNav = global.navigator
    Object.defineProperty(global, 'navigator', { value: {}, writable: true })
    expect(isPushSupported()).toBe(false)
    Object.defineProperty(global, 'navigator', { value: origNav, writable: true })
  })

  it('retourne false si PushManager absent', () => {
    Object.defineProperty(global, 'navigator', { value: { serviceWorker: {} }, writable: true })
    const origPM = global.PushManager
    delete global.PushManager
    expect(isPushSupported()).toBe(false)
    global.PushManager = origPM
  })
})

describe('CHECKLIST_ITEMS', () => {
  it('contient les 3 groupes de rôles', () => {
    expect(CHECKLIST_ITEMS).toHaveProperty('collaborateur')
    expect(CHECKLIST_ITEMS).toHaveProperty('manager')
    expect(CHECKLIST_ITEMS).toHaveProperty('admin')
  })

  it('chaque groupe a 5 items', () => {
    expect(CHECKLIST_ITEMS.collaborateur).toHaveLength(5)
    expect(CHECKLIST_ITEMS.manager).toHaveLength(5)
    expect(CHECKLIST_ITEMS.admin).toHaveLength(5)
  })

  it('chaque item a les propriétés requises', () => {
    for (const group of Object.values(CHECKLIST_ITEMS)) {
      for (const item of group) {
        expect(item).toHaveProperty('key')
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('points')
        expect(typeof item.points).toBe('number')
        expect(item.points).toBeGreaterThan(0)
      }
    }
  })

  it('tous les items ont des clés uniques au sein d\'un groupe', () => {
    for (const [group, items] of Object.entries(CHECKLIST_ITEMS)) {
      const keys = items.map(i => i.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('chaque groupe a un item enable_push', () => {
    for (const items of Object.values(CHECKLIST_ITEMS)) {
      const pushItem = items.find(i => i.key === 'enable_push')
      expect(pushItem).toBeDefined()
      expect(pushItem.pushAction).toBe(true)
    }
  })

  it('les points totaux par groupe sont entre 80 et 120', () => {
    for (const items of Object.values(CHECKLIST_ITEMS)) {
      const total = items.reduce((sum, i) => sum + i.points, 0)
      expect(total).toBeGreaterThanOrEqual(80)
      expect(total).toBeLessThanOrEqual(120)
    }
  })
})

describe('useNotificationPermission()', () => {
  it('retourne la permission actuelle', () => {
    Object.defineProperty(global, 'Notification', {
      value: { ...mockNotification, permission: 'default' },
      writable: true,
    })

    const { result } = renderHook(() => useNotificationPermission())
    expect(result.current.permission).toBe('default')
    expect(typeof result.current.requestPermission).toBe('function')
  })

  it('retourne "unsupported" si Notification absent', () => {
    const orig = global.Notification
    delete global.Notification
    const { result } = renderHook(() => useNotificationPermission())
    expect(result.current.permission).toBe('unsupported')
    global.Notification = orig
  })

  it('requestPermission retourne la valeur de Notification.requestPermission', async () => {
    Object.defineProperty(global, 'Notification', {
      value: { requestPermission: vi.fn().mockResolvedValue('granted'), permission: 'default' },
      writable: true,
    })
    const { result } = renderHook(() => useNotificationPermission())
    let perm
    await act(async () => {
      perm = await result.current.requestPermission()
    })
    expect(perm).toBe('granted')
  })
})

describe('useServiceWorker()', () => {
  it('tente d\'enregistrer le Service Worker', async () => {
    const registerMock = vi.fn().mockResolvedValue({ active: true })
    Object.defineProperty(global, 'navigator', {
      value: { serviceWorker: { register: registerMock } },
      writable: true,
    })

    renderHook(() => useServiceWorker())
    await vi.waitFor(() => expect(registerMock).toHaveBeenCalledWith('/sw.js'))
  })

  it('gère gracieusement l\'échec d\'enregistrement', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registerMock = vi.fn().mockRejectedValue(new Error('SW failed'))
    Object.defineProperty(global, 'navigator', {
      value: { serviceWorker: { register: registerMock } },
      writable: true,
    })

    const { result } = renderHook(() => useServiceWorker())
    await vi.waitFor(() => expect(result.current.swReady).toBe(false))
    consoleSpy.mockRestore()
  })
})

describe('Push notification types config', () => {
  const TYPE_CONFIG_EXPECTED = [
    'task_assigned', 'task_overdue', 'task_completed', 'task_comment',
    'objective_evaluation', 'objective_validated',
    'project_member_added', 'project_milestone_reached', 'project_deliverable_due',
    'system',
    // S56 nouveaux
    'calibration_session_opened', 'calibration_override_approved', 'calibration_override_rejected',
    'enps_survey_available', 'performance_alert', 'behavioral_alert',
    'succession_nominated', 'career_opportunity',
    'review_cycle_started', 'review_evaluation_due', 'onboarding_reminder',
  ]

  it('NotificationCenter couvre tous les types attendus', async () => {
    // Import dynamique pour vérifier l'export TYPE_CONFIG du toast
    const mod = await import('../src/components/notifications/NotificationToast')
    const { TYPE_CONFIG } = mod

    for (const type of TYPE_CONFIG_EXPECTED) {
      expect(TYPE_CONFIG).toHaveProperty(type)
    }
  })

  it('chaque type a icon, color et label', async () => {
    const mod = await import('../src/components/notifications/NotificationToast')
    const { TYPE_CONFIG } = mod

    for (const [key, cfg] of Object.entries(TYPE_CONFIG)) {
      expect(cfg).toHaveProperty('icon')
      expect(cfg).toHaveProperty('color')
      expect(cfg).toHaveProperty('label')
      expect(cfg.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('useOnboardingChecklist()', () => {
  it('retourne les propriétés attendues', () => {
    const { result } = renderHook(() => useOnboardingChecklist())
    expect(result.current).toHaveProperty('items')
    expect(result.current).toHaveProperty('isItemDone')
    expect(result.current).toHaveProperty('completeItem')
    expect(result.current).toHaveProperty('progress')
    expect(result.current).toHaveProperty('completedCount')
  })

  it('isItemDone retourne false pour item inconnu', () => {
    const { result } = renderHook(() => useOnboardingChecklist())
    expect(result.current.isItemDone('unknown_item')).toBe(false)
  })

  it('progress est un entier entre 0 et 100', () => {
    const { result } = renderHook(() => useOnboardingChecklist())
    expect(result.current.progress).toBeGreaterThanOrEqual(0)
    expect(result.current.progress).toBeLessThanOrEqual(100)
    expect(Number.isInteger(result.current.progress)).toBe(true)
  })
})

describe('SQL migration S56', () => {
  it('le fichier de migration existe', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const migrationPath = path.resolve(__dirname, '../src/sql/migration_s56_push_notifications.sql')
    expect(fs.existsSync(migrationPath)).toBe(true)
  })

  it('la migration contient la table push_subscriptions', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../src/sql/migration_s56_push_notifications.sql'),
      'utf-8'
    )
    expect(sql).toContain('push_subscriptions')
    expect(sql).toContain('push_notification_logs')
    expect(sql).toContain('onboarding_checklist')
    expect(sql).toContain('VAPID')
  })

  it('la migration contient les nouveaux types de notification', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../src/sql/migration_s56_push_notifications.sql'),
      'utf-8'
    )
    expect(sql).toContain('calibration_session_opened')
    expect(sql).toContain('behavioral_alert')
    expect(sql).toContain('review_cycle_started')
  })
})

describe('Service Worker', () => {
  it('le fichier sw.js existe dans /public', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const swPath = path.resolve(__dirname, '../src/public/sw.js')
    expect(fs.existsSync(swPath)).toBe(true)
  })

  it('sw.js contient les event listeners requis', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const sw = fs.readFileSync(path.resolve(__dirname, '../src/public/sw.js'), 'utf-8')
    expect(sw).toContain("'push'")
    expect(sw).toContain("'notificationclick'")
    expect(sw).toContain("'install'")
    expect(sw).toContain("'activate'")
    expect(sw).toContain("pushsubscriptionchange")
  })
})
