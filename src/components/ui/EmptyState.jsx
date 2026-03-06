// ============================================================
// APEX RH — src/components/ui/EmptyState.jsx
// Session 49 — QW5 : Empty state homogène pour tous les modules
//
// Usage :
//   <EmptyState
//     icon={Target}
//     title="Aucun objectif"
//     description="Créez votre premier OKR pour démarrer."
//     action={{ label: 'Créer un OKR', onClick: handleCreate }}
//   />
//
// Variantes : default | compact | inline
// ============================================================
import { motion } from 'framer-motion'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',   // 'default' | 'compact' | 'inline'
  className = '',
}) {
  // ── Variante inline (ex: dans une cellule de tableau) ──────
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-white/25 ${className}`}>
        {Icon && <Icon size={14}/>}
        <span className="text-xs">{title}</span>
      </div>
    )
  }

  // ── Variante compact (ex: dans un card latéral) ────────────
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 py-6 text-center ${className}`}>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Icon size={16} className="text-white/25"/>
          </div>
        )}
        <div className="text-sm font-medium text-white/40">{title}</div>
        {description && <div className="text-xs text-white/20 max-w-[220px]">{description}</div>}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-1 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95"
            style={{ background: 'rgba(79,70,229,0.2)', color: '#818CF8', border: '1px solid rgba(79,70,229,0.25)' }}>
            {action.label}
          </button>
        )}
      </div>
    )
  }

  // ── Variante default (pleine page / section principale) ────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center gap-4 py-16 text-center ${className}`}>

      {Icon && (
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Icon size={24} className="text-white/20"/>
          </div>
          {/* Subtle glow */}
          <div className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.4), transparent)'}}/>
        </div>
      )}

      <div>
        <div className="text-base font-semibold text-white/50">{title}</div>
        {description && (
          <div className="text-sm text-white/25 mt-1.5 max-w-[360px] leading-relaxed">{description}</div>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(79,70,229,0.25)', color: '#A5B4FC', border: '1px solid rgba(79,70,229,0.3)' }}>
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
