// ============================================================
// APEX RH — ThemeContext.jsx
// Session 14 — Gestion thème sombre / clair / auto
// ============================================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getResolvedTheme(theme) {
  return theme === 'auto' ? getSystemTheme() : theme
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('apex_theme') || 'dark'
    } catch {
      return 'dark'
    }
  })

  const resolvedTheme = getResolvedTheme(theme)

  // Appliquer le thème sur <html>
  const applyTheme = useCallback((resolved) => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [])

  // Quand le thème change
  useEffect(() => {
    try {
      localStorage.setItem('apex_theme', theme)
    } catch { /* ignore */ }
    applyTheme(resolvedTheme)
  }, [theme, resolvedTheme, applyTheme])

  // Écouter les changements système si mode auto
  useEffect(() => {
    if (theme !== 'auto') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(getSystemTheme())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}