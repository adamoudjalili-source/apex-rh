// ============================================================
// APEX RH — OnboardingWizard.jsx  ·  Session 40
// Overlay onboarding guidé — 3 étapes par rôle
// Intégré dans AppLayout.jsx
// ============================================================
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '../../hooks/useOnboarding'
import { ChevronRight, SkipForward, Check } from 'lucide-react'

export default function OnboardingWizard() {
  const { visible, currentStep, steps, nextStep, skipAll, progress, isLast } = useOnboarding()

  if (!visible) return null

  const step = steps[currentStep]
  if (!step) return null

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          key={`step-${currentStep}`}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-md relative"
          style={{
            background: 'linear-gradient(135deg, #1a1a3e 0%, #12122a 100%)',
            border: `1px solid ${step.color}30`,
            borderRadius: '24px',
            boxShadow: `0 0 60px ${step.color}20, 0 24px 48px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Barre de progression */}
          <div className="h-1 rounded-t-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: step.color }}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="p-8">
            {/* Icône + compteur */}
            <div className="flex items-start justify-between mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}
              >
                {step.icon}
              </motion.div>
              <span className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                {currentStep + 1} / {steps.length}
              </span>
            </div>

            {/* Titre */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: step.color }}>
                {step.subtitle}
              </p>
              <h2 className="text-2xl font-bold text-white mb-3"
                style={{ fontFamily: "'Syne', sans-serif" }}>
                {step.title}
              </h2>
              <p className="text-sm text-white/55 leading-relaxed">
                {step.description}
              </p>
            </motion.div>

            {/* Tip */}
            {step.tip && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${step.color}10`, border: `1px solid ${step.color}20` }}
              >
                <span className="text-[10px]">💡</span>
                <p className="text-xs" style={{ color: `${step.color}cc` }}>{step.tip}</p>
              </motion.div>
            )}

            {/* Indicateurs de points */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    width: i === currentStep ? 24 : 6,
                    opacity: i <= currentStep ? 1 : 0.25,
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-1.5 rounded-full"
                  style={{ background: i <= currentStep ? step.color : 'rgba(255,255,255,0.2)' }}
                />
              ))}
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={skipAll}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                <SkipForward size={13} />
                Passer
              </button>

              <button
                onClick={nextStep}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}cc 100%)`,
                  boxShadow: `0 4px 20px ${step.color}40`,
                }}
              >
                {isLast ? (
                  <>
                    <Check size={14} />
                    Commencer
                  </>
                ) : (
                  <>
                    Suivant
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
