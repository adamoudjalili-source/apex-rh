// ============================================================
// APEX RH — components/communication/UnreadBadge.jsx
// Session S65 — Badge non-lu réutilisable
// ============================================================
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Badge non-lu réutilisable.
 * @param {number}  count    - Nombre de non-lus (0 = caché)
 * @param {string}  size     - 'sm' | 'md' | 'lg'
 * @param {boolean} dot      - Afficher juste un point sans chiffre
 * @param {string}  className
 */
export default function UnreadBadge({ count = 0, size = 'md', dot = false, className = '' }) {
  if (!count && !dot) return null

  const sizes = {
    sm: { minW: 14, h: 14, text: 9,  px: 3 },
    md: { minW: 18, h: 18, text: 10, px: 4 },
    lg: { minW: 22, h: 22, text: 11, px: 5 },
  }
  const s = sizes[size] || sizes.md

  const label = count > 99 ? '99+' : String(count)

  return (
    <AnimatePresence>
      {(count > 0 || dot) && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={`inline-flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${className}`}
          style={{
            minWidth:   dot ? s.h : s.minW,
            height:     dot ? s.h : s.h,
            fontSize:   s.text,
            padding:    dot ? 0 : `0 ${s.px}px`,
            background: 'linear-gradient(135deg,#06B6D4,#0891B2)',
            boxShadow:  '0 0 8px rgba(6,182,212,0.4)',
            width:      dot ? s.h : undefined,
          }}>
          {!dot && label}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
