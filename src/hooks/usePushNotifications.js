// ============================================================
// APEX RH — usePushNotifications.js
// Session 56 — Web Push API + Service Worker + VAPID
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── CONSTANTES ──────────────────────────────────────────────
export const PUSH_PERMISSION = {
  DEFAULT:  'default',
  GRANTED:  'granted',
  DENIED:   'denied',
}

export const SW_PATH = '/sw.js'

// ─── UTILITAIRES ─────────────────────────────────────────────

/** Convertit une clé VAPID base64url → Uint8Array */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

/** Vérifie si le navigateur supporte les push notifications */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager'   in window   &&
    'Notification'  in window
  )
}

/** Récupère la clé VAPID publique depuis app_settings */
async function fetchVapidPublicKey() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'vapid_public_key')
    .maybeSingle()

  if (error || !data?.value) return null

  // La valeur est stockée en JSON string (avec guillemets)
  try {
    const parsed = JSON.parse(data.value)
    if (parsed && !parsed.startsWith('REPLACE_')) return parsed
  } catch {
    // value brute
    if (data.value && !data.value.includes('REPLACE_')) return data.value
  }
  return null
}

// ─── HOOK : useServiceWorker ──────────────────────────────────
export function useServiceWorker() {
  const [registration, setRegistration] = useState(null)
  const [swReady, setSwReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register(SW_PATH)
      .then((reg) => {
        setRegistration(reg)
        setSwReady(true)
      })
      .catch((err) => {
        console.warn('[APEX] Service Worker registration failed:', err)
      })
  }, [])

  return { registration, swReady }
}

// ─── HOOK : useNotificationPermission ────────────────────────
export function useNotificationPermission() {
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  // Écoute les changements de permission (Chrome 126+)
  useEffect(() => {
    if (!navigator.permissions) return
    navigator.permissions.query({ name: 'notifications' }).then((status) => {
      const handler = () => setPermission(status.state === 'granted' ? 'granted' : status.state)
      status.addEventListener('change', handler)
      return () => status.removeEventListener('change', handler)
    }).catch(() => {})
  }, [])

  return { permission, requestPermission }
}

// ─── HOOK : usePushSubscription ───────────────────────────────
export function usePushSubscription() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  // Fetch les souscriptions actives de l'utilisateur
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['push-subscriptions', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, is_active, created_at')
        .eq('user_id', profile.id)
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })

  // Vérifie si ce navigateur est déjà souscrit
  const isSubscribed = subscriptions.length > 0

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async ({ registration }) => {
      const vapidKey = await fetchVapidPublicKey()
      if (!vapidKey) throw new Error('VAPID public key not configured')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const subJson = subscription.toJSON()
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id:         profile.id,
          organization_id: profile.organization_id,
          endpoint:        subJson.endpoint,
          p256dh:          subJson.keys.p256dh,
          auth:            subJson.keys.auth,
          user_agent:      navigator.userAgent.slice(0, 200),
          is_active:       true,
          last_used_at:    new Date().toISOString(),
        }, { onConflict: 'endpoint' })

      if (error) throw error
      return subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] })
    },
  })

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async ({ registration }) => {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', profile.id)
          .eq('endpoint', sub.endpoint)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] })
    },
  })

  return {
    subscriptions,
    isSubscribed,
    subscribe:   subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isLoading:   subscribeMutation.isPending || unsubscribeMutation.isPending,
    error:       subscribeMutation.error || unsubscribeMutation.error,
  }
}

// ─── HOOK PRINCIPAL : usePushNotifications ───────────────────
export function usePushNotifications() {
  const { profile } = useAuth()
  const { registration, swReady } = useServiceWorker()
  const { permission, requestPermission } = useNotificationPermission()
  const { isSubscribed, subscribe, unsubscribe, isLoading } = usePushSubscription()
  const [showBanner, setShowBanner] = useState(false)
  const [vapidAvailable, setVapidAvailable] = useState(false)

  const supported = isPushSupported()

  // Vérifier disponibilité VAPID
  useEffect(() => {
    fetchVapidPublicKey().then(key => setVapidAvailable(!!key))
  }, [])

  // Afficher la bannière si : supporté + VAPID disponible + permission default + pas souscrit + profil chargé
  useEffect(() => {
    if (!profile?.id) return
    if (!supported || !vapidAvailable) return
    if (permission === 'default' && !isSubscribed && swReady) {
      // Délai de 3s pour ne pas être intrusif au chargement
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }
    if (permission === 'granted' && !isSubscribed && swReady && registration) {
      // Auto-subscribe si permission déjà accordée
      subscribe({ registration }).catch(() => {})
    }
  }, [profile?.id, permission, isSubscribed, swReady, registration, supported, vapidAvailable])

  const enablePush = useCallback(async () => {
    if (!registration) return false
    const perm = await requestPermission()
    if (perm !== 'granted') return false
    try {
      await subscribe({ registration })
      setShowBanner(false)
      return true
    } catch (err) {
      console.error('[APEX] Push subscribe error:', err)
      return false
    }
  }, [registration, requestPermission, subscribe])

  const disablePush = useCallback(async () => {
    if (!registration) return
    await unsubscribe({ registration })
  }, [registration, unsubscribe])

  const dismissBanner = useCallback(() => {
    setShowBanner(false)
    // Ne plus afficher pendant 7 jours
    localStorage.setItem('apex_push_banner_dismissed', Date.now().toString())
  }, [])

  return {
    supported,
    vapidAvailable,
    permission,
    isSubscribed,
    showBanner,
    swReady,
    isLoading,
    enablePush,
    disablePush,
    dismissBanner,
  }
}

// ─── HOOK : useNotificationPreferences (push) ────────────────
export function useUpdatePushPreferences() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (prefs) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: profile.id, ...prefs, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}

// ─── HOOK : useOnboardingChecklist ───────────────────────────
export function useOnboardingChecklist() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['onboarding-checklist', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_checklist')
        .select('item_key, is_completed, completed_at')
        .eq('user_id', profile.id)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  })

  const completeMutation = useMutation({
    mutationFn: async (itemKey) => {
      const { error } = await supabase
        .from('onboarding_checklist')
        .upsert({
          user_id:         profile.id,
          organization_id: profile.organization_id,
          item_key:        itemKey,
          is_completed:    true,
          completed_at:    new Date().toISOString(),
        }, { onConflict: 'user_id,item_key' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist'] })
    },
  })

  const isItemDone = useCallback((key) => {
    return items.some(i => i.item_key === key && i.is_completed)
  }, [items])

  const completedCount = items.filter(i => i.is_completed).length
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  return {
    items,
    isLoading,
    isItemDone,
    completeItem: completeMutation.mutate,
    completedCount,
    progress,
  }
}
