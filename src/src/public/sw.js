// ============================================================
// APEX RH — sw.js (Service Worker)
// Session 56 — Web Push notifications + offline cache minimal
// Déployer dans /public/sw.js
// ============================================================

const CACHE_NAME    = 'apex-rh-v56'
const PUSH_ICON     = '/apple-touch-icon.png'
const APP_URL       = self.location.origin

// ─── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// ─── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── PUSH EVENT ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title:   'APEX RH',
      body:    event.data.text(),
      icon:    PUSH_ICON,
      badge:   PUSH_ICON,
      tag:     'apex-generic',
      data:    {},
    }
  }

  const {
    title   = 'APEX RH',
    body    = '',
    icon    = PUSH_ICON,
    badge   = PUSH_ICON,
    tag     = 'apex-notification',
    url     = '/',
    type    = 'system',
    actions = [],
    vibrate = [100, 50, 100],
  } = payload

  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate,
    renotify:  true,
    requireInteraction: ['task_overdue', 'review_evaluation_due'].includes(type),
    data: { url, type, ...payload.data },
    actions: actions.length > 0 ? actions : getDefaultActions(type),
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── NOTIFICATION CLICK ──────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { url = '/', action } = event.notification.data || {}

  // Action "dismiss" → juste fermer
  if (action === 'dismiss' || event.action === 'dismiss') return

  const targetUrl = APP_URL + (url.startsWith('/') ? url : '/' + url)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Fenêtre déjà ouverte → focus + navigation
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Sinon → ouvrir nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ─── NOTIFICATION CLOSE ──────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // Analytics future : log les notifications fermées sans clic
  const { type } = event.notification.data || {}
  console.debug('[APEX SW] Notification closed without click:', type)
})

// ─── PUSH SUBSCRIPTION CHANGE ────────────────────────────────
// Gère le renouvellement automatique des subscriptions expirées
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((newSub) => {
      // Envoyer la nouvelle subscription au backend via fetch
      return fetch('/api/push/resubscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          old_endpoint: event.oldSubscription?.endpoint,
          new_subscription: newSub.toJSON(),
        }),
      })
    }).catch((err) => {
      console.error('[APEX SW] pushsubscriptionchange error:', err)
    })
  )
})

// ─── ACTIONS PAR DÉFAUT ──────────────────────────────────────
function getDefaultActions(type) {
  const actionMap = {
    task_assigned: [
      { action: 'view',    title: 'Voir la tâche' },
      { action: 'dismiss', title: 'Plus tard' },
    ],
    task_overdue: [
      { action: 'view',    title: 'Traiter maintenant' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
    review_evaluation_due: [
      { action: 'view',    title: 'Commencer l\'évaluation' },
      { action: 'dismiss', title: 'Rappeler demain' },
    ],
    calibration_session_opened: [
      { action: 'view',    title: 'Ouvrir la calibration' },
      { action: 'dismiss', title: 'Plus tard' },
    ],
    enps_survey_available: [
      { action: 'view',    title: 'Répondre au survey' },
      { action: 'dismiss', title: 'Plus tard' },
    ],
  }
  return actionMap[type] || [{ action: 'view', title: 'Voir' }]
}

// ─── FETCH (minimal — pas de cache agressif) ─────────────────
self.addEventListener('fetch', (event) => {
  // Ne gérer que les requêtes navigation (pages)
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback offline minimal
      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#0F0F23;color:white"><h2>APEX RH</h2><p>Connexion requise</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      )
    })
  )
})
