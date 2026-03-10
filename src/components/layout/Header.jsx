// ============================================================
// APEX RH — Header.jsx · S135
// Titre aligné gauche + typographie premium + search + notifs
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useTheme }       from '../../contexts/ThemeContext'
import CommandPalette     from '../ui/CommandPalette'
import NotificationCenter from '../ui/NotificationCenter'
import { Search }         from 'lucide-react'

export default function Header() {
  const { resolvedTheme } = useTheme()
  const isLight           = resolvedTheme === 'light'
  const [searchOpen, setSearchOpen] = useState(false)

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(p => !p) }
  }, [])
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const searchBg      = isLight ? 'rgba(99,102,241,0.06)'  : 'rgba(14,165,233,.08)'
  const searchBorder  = isLight ? 'rgba(99,102,241,0.18)'  : 'rgba(56,189,248,.14)'
  const searchColor   = isLight ? 'rgba(26,31,54,0.45)'    : 'rgba(125,211,252,.70)'
  const searchHoverBg = isLight ? 'rgba(99,102,241,0.12)'  : 'rgba(14,165,233,.14)'
  const kbdBg         = isLight ? 'rgba(99,102,241,0.08)'  : 'rgba(56,189,248,.10)'
  const kbdColor      = isLight ? 'rgba(26,31,54,0.35)'    : 'rgba(186,230,253,.55)'

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 flex-shrink-0"
        style={{
          background:           isLight ? 'rgba(255,255,255,.97)' : 'rgba(15,23,42,.80)',
          backdropFilter:       'blur(40px) saturate(140%)',
          WebkitBackdropFilter: 'blur(40px) saturate(140%)',
          borderBottom:         isLight ? '1px solid rgba(99,102,241,.10)' : '1px solid rgba(56,189,248,.09)',
          boxShadow:            isLight ? '0 1px 0 rgba(99,102,241,.06)' : '0 1px 0 rgba(56,189,248,.06)',
        }}>

        {/* Titre premium — aligné gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <h1 style={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: "'Syne', sans-serif",
            lineHeight: 1,
            background: isLight
              ? 'linear-gradient(90deg, #1A1F36 0%, #4F46E5 60%, #818CF8 100%)'
              : 'linear-gradient(90deg, #E0F2FE 0%, #38BDF8 45%, #7DD3FC 75%, #BAE6FD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: isLight ? 'none' : 'drop-shadow(0 0 18px rgba(56,189,248,.35))',
          }}>
            Plateforme de Gestion de la Performance
          </h1>
          {/* Ligne décorative sous le titre */}
          <div style={{
            height: 2,
            width: '60%',
            borderRadius: 2,
            background: isLight
              ? 'linear-gradient(90deg, #4F46E5, #818CF8, transparent)'
              : 'linear-gradient(90deg, #38BDF8, rgba(56,189,248,.3), transparent)',
            marginTop: 4,
          }}/>
        </div>

        {/* Droite — search + notifs */}
        <div className="flex items-center gap-2.5">
          <button onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all"
            style={{ background: searchBg, border: `1px solid ${searchBorder}`, color: searchColor }}
            onMouseEnter={e => { e.currentTarget.style.background=searchHoverBg; e.currentTarget.style.color=isLight?'rgba(26,31,54,0.80)':'rgba(125,211,252,.90)' }}
            onMouseLeave={e => { e.currentTarget.style.background=searchBg; e.currentTarget.style.color=searchColor }}>
            <Search size={13}/>
            <span style={{ fontSize:12 }}>Recherche...</span>
            <span style={{ padding:'2px 6px', borderRadius:6, fontSize:9, fontFamily:'monospace',
                           background: kbdBg, color: kbdColor, border:`1px solid ${searchBorder}` }}>⌘K</span>
          </button>

          <button onClick={() => setSearchOpen(true)}
            className="md:hidden flex items-center justify-center"
            style={{ width:36, height:36, borderRadius:10,
                     background: searchBg, border:`1px solid ${searchBorder}`, color: searchColor }}>
            <Search size={15}/>
          </button>

          <NotificationCenter />
        </div>
      </header>

      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)}/>
    </>
  )
}