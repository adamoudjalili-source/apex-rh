// ============================================================
// APEX RH — AlertBadge.jsx
// ✅ Session 22 — Badge d'alerte PULSE (Phase B)
// ============================================================
import { motion, AnimatePresence } from 'framer-motion'
import { CRITICALITY } from '../../utils/constants'

/**
 * Badge affichant le nombre d'alertes PULSE non résolues.
 * À placer à côté de l'icône PULSE dans la sidebar ou dans l'en-tête.
 *
 * Props :
 *   count       {number}  — nombre d'alertes à afficher
 *   severity    {string}  — 'warning' | CRITICALITY.CRITICAL | 'info' (détermine la couleur)
 *   max         {number}  — valeur max avant affichage "99+" (default: 99)
 *   size        {string}  — 'sm' | 'md' (default: 'sm')
 */
export default function AlertBadge({ count = 0, severity = 'warning', max = 99, size = 'sm' }) {
  if (!count || count <= 0) return null

  const colors = {
    info:     { bg: '#6B7280', text: '#fff' },
    warning:  { bg: '#F59E0B', text: '#000' },
    critical: { bg: '#EF4444', text: '#fff' },
  }
  const { bg, text } = colors[severity] || colors.warning
  const displayCount = count > max ? `${max}+` : String(count)

  const sizeClasses = {
    sm: 'min-w-[16px] h-[16px] text-[9px] px-1',
    md: 'min-w-[20px] h-[20px] text-[10px] px-1.5',
  }

  return (
    <AnimatePresence>
      <motion.span
        key={count}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`inline-flex items-center justify-center rounded-full font-bold leading-none ${sizeClasses[size] || sizeClasses.sm}`}
        style={{ background: bg, color: text }}
      >
        {displayCount}
      </motion.span>
    </AnimatePresence>
  )
}

/**
 * Variante inline — affichée à côté d'un label, sans animation pour éviter
 * les re-renders fréquents dans la sidebar.
 */
export function AlertDot({ count = 0, severity = 'warning' }) {
  if (!count || count <= 0) return null

  const colors = {
    info:     '#6B7280',
    warning:  '#F59E0B',
    critical: '#EF4444',
  }

  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[severity] || colors.warning }}
      title={`${count} alerte${count > 1 ? 's' : ''}`}
    />
  )
}
