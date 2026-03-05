// ============================================================
// APEX RH — main.jsx  ·  Session 39
// ✅ S39 — Enregistrement Service Worker PWA
// ============================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// ─── Service Worker (PWA) ────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[PWA] Service Worker enregistré :', reg.scope)

        // Vérifier les mises à jour toutes les heures
        setInterval(() => reg.update(), 1000 * 60 * 60)
      })
      .catch(err => {
        console.warn('[PWA] Enregistrement SW échoué :', err)
      })
  })
}

// ─── Inject PWA meta dynamiquement ──────────────────────────
function injectPWAMeta() {
  // Manifest
  const manifest = document.createElement('link')
  manifest.rel   = 'manifest'
  manifest.href  = '/manifest.json'
  document.head.appendChild(manifest)

  // Theme color
  const themeColor = document.createElement('meta')
  themeColor.name    = 'theme-color'
  themeColor.content = '#6366F1'
  document.head.appendChild(themeColor)

  // Apple PWA
  const appleCapable = document.createElement('meta')
  appleCapable.name    = 'apple-mobile-web-app-capable'
  appleCapable.content = 'yes'
  document.head.appendChild(appleCapable)

  const appleTitle = document.createElement('meta')
  appleTitle.name    = 'apple-mobile-web-app-title'
  appleTitle.content = 'APEX RH'
  document.head.appendChild(appleTitle)

  const appleStatusBar = document.createElement('meta')
  appleStatusBar.name    = 'apple-mobile-web-app-status-bar-style'
  appleStatusBar.content = 'black-translucent'
  document.head.appendChild(appleStatusBar)
}

injectPWAMeta()

// ─── Render ─────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
