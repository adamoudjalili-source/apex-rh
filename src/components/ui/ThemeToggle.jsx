// ============================================================
// APEX RH — ThemeToggle.jsx
// Bouton bascule dark ↔ light dans la Sidebar
// ============================================================
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle({ collapsed }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  return (
    <button
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      title={isLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
      style={{
        width: '100%',
        borderRadius: 10,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: '1px solid',
        borderColor: isLight ? 'rgba(255,255,255,.10)' : 'rgba(56,189,248,.15)',
        background: isLight ? 'rgba(255,255,255,.06)' : 'rgba(56,189,248,.06)',
        cursor: 'pointer',
        transition: 'all .2s',
        marginBottom: 4,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isLight ? 'rgba(255,255,255,.20)' : 'rgba(56,189,248,.30)'
        e.currentTarget.style.background  = isLight ? 'rgba(255,255,255,.10)' : 'rgba(56,189,248,.10)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isLight ? 'rgba(255,255,255,.10)' : 'rgba(56,189,248,.15)'
        e.currentTarget.style.background  = isLight ? 'rgba(255,255,255,.06)' : 'rgba(56,189,248,.06)'
      }}
    >
      <motion.div
        key={isLight ? 'sun' : 'moon'}
        initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0,   opacity: 1, scale: 1   }}
        transition={{ duration: 0.25 }}
        style={{ flexShrink: 0, display: 'flex' }}
      >
        {isLight
          ? <Sun  size={16} color="#FDE68A" />
          : <Moon size={16} color="#BAE6FD" />
        }
      </motion.div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}
        >
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', fontWeight: 400 }}>
            {isLight ? 'Mode clair' : 'Mode sombre'}
          </span>
          {/* Pill indicateur */}
          <div style={{
            width: 32, height: 18, borderRadius: 9,
            background: isLight ? 'rgba(255,255,255,.12)' : 'rgba(56,189,248,.25)',
            position: 'relative', transition: 'background .3s',
            border: '1px solid rgba(255,255,255,.10)',
          }}>
            <motion.div
              animate={{ x: isLight ? 14 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute', top: 2, left: 2,
                width: 12, height: 12, borderRadius: '50%',
                background: isLight ? '#FDE68A' : '#BAE6FD',
              }}
            />
          </div>
        </motion.div>
      )}
    </button>
  )
}