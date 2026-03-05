// ============================================================
// APEX RH — Service Worker  ·  Session 39
// Cache stratégique pour mode offline
// Stratégie : Cache First pour assets, Network First pour API
// ============================================================

const CACHE_NAME    = 'apex-rh-v39'
const OFFLINE_URL   = '/offline.html'

// Assets statiques à précacher
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
]

// Patterns de routes à cacher (Cache First)
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|woff2?|png|jpg|svg|ico)$/,
  /\/assets\//,
]

// Patterns API Supabase (Network First, fallback cache)
const NETWORK_FIRST_PATTERNS = [
  /supabase\.co/,
  /\/api\//,
]

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return

  // Ignorer les extensions navigateur
  if (url.protocol === 'chrome-extension:') return

  // Network First pour Supabase API
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(networkFirst(request))
    return
  }

  // Cache First pour assets statiques
  if (CACHE_FIRST_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation (SPA) — Network First avec fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(navigateFetch(request))
    return
  }

  // Default — Network First
  event.respondWith(networkFirst(request))
})

// ─── STRATÉGIES ─────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Ressource non disponible hors ligne', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(JSON.stringify({ error: 'Hors ligne', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function navigateFetch(request) {
  try {
    return await fetch(request)
  } catch {
    // Fallback : renvoyer la page principale (SPA)
    const cached = await caches.match('/')
    return cached || caches.match(OFFLINE_URL)
  }
}

// ─── SYNC BACKGROUND ────────────────────────────────────────
// Queue d'actions offline à synchroniser au retour en ligne
self.addEventListener('sync', event => {
  if (event.tag === 'apex-offline-sync') {
    event.waitUntil(syncOfflineQueue())
  }
})

async function syncOfflineQueue() {
  // Ouvrir la queue des actions offline stockées dans IndexedDB
  // (briefs, journaux, feedbacks soumis offline)
  // Implémentation future — S40
  console.log('[SW] Synchronisation offline queue — à implémenter en S40')
}

// ─── NOTIFICATIONS PUSH ──────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body:         data.body    || 'Nouvelle notification APEX RH',
    icon:         '/icons/icon-192x192.png',
    badge:        '/icons/icon-72x72.png',
    tag:          data.tag     || 'apex-rh-notif',
    data:         { url: data.url || '/' },
    actions: data.actions || [],
    vibrate:      [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'APEX RH',
      options
    )
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const match = windowClients.find(c => c.url === url && 'focus' in c)
        if (match) return match.focus()
        return clients.openWindow(url)
      })
  )
})
