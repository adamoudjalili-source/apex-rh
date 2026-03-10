// ============================================================
// APEX RH — OnboardingWizardV2.jsx
// Session 56 — Wizard onboarding enrichi : checklist interactive,
//              progress détaillée, tips contextuels, config push
// ============================================================
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, SkipForward, Check, Bell, ExternalLink,
  BookOpen, Target, Users, BarChart2, Smartphone, ArrowRight,
} from 'lucide-react'
import { useOnboarding, getRoleGroup } from '../../hooks/useOnboarding'
import { usePushNotifications } from '../../hooks/usePushNotifications'

// ─── CHECKLIST PAR RÔLE ──────────────────────────────────────
export const CHECKLIST_ITEMS = {
  collaborateur: [
    { key: 'complete_profile',  label: 'Compléter votre profil',           icon: '👤', link: '/mon-espace', points: 20 },
    { key: 'first_brief',       label: 'Faire votre premier brief matinal', icon: '🌅', link: '/intelligence', points: 30 },
    { key: 'set_objectives',    label: 'Créer un premier objectif OKR',    icon: '🎯', link: '/travail/objectifs', points: 25 },
    { key: 'view_performance',  label: 'Consulter Ma Performance',         icon: '📊', link: '/mon-espace', points: 15 },
    { key: 'enable_push',       label: 'Activer les notifications',        icon: '🔔', link: null, points: 10, pushAction: true },
  ],
  manager: [
    { key: 'view_team',         label: 'Consulter Mon Équipe',             icon: '👥', link: '/mon-equipe', points: 20 },
    { key: 'first_review',      label: 'Ouvrir un Review Cycle',           icon: '📋', link: '/intelligence', points: 30 },
    { key: 'check_intelligence',label: 'Explorer Intelligence RH',        icon: '🧠', link: '/intelligence', points: 25 },
    { key: 'give_feedback',     label: 'Envoyer un feedback 360°',        icon: '💬', link: '/intelligence', points: 20 },
    { key: 'enable_push',       label: 'Activer les notifications',        icon: '🔔', link: null, points: 10, pushAction: true },
  ],
  admin: [
    { key: 'configure_modules', label: 'Configurer les modules actifs',    icon: '⚙️', link: '/admin/settings', points: 30 },
    { key: 'add_users',         label: 'Ajouter des utilisateurs',         icon: '➕', link: '/admin/users', points: 25 },
    { key: 'setup_org',         label: 'Configurer l\'organisation',       icon: '🏢', link: '/admin/organisation', points: 25 },
    { key: 'view_adoption',     label: 'Consulter le tableau d\'adoption', icon: '📈', link: '/intelligence', points: 10 },
    { key: 'enable_push',       label: 'Activer les notifications push',   icon: '🔔', link: null, points: 10, pushAction: true },
  ],
}

// ─── COMPOSANT WIZARD ────────────────────────────────────────
export default function OnboardingWizardV2() {
  const { visible, currentStep, steps, nextStep, skipAll, isLast } = useOnboarding()
  const { enablePush, permission, isSubscribed } = usePushNotifications()
  const [pushActivating, setPushActivating] = useState(false)
  const [pushDone, setPushDone] = useState(false)
  const navigate = useNavigate()

  const handleEnablePush = useCallback(async () => {
    setPushActivating(true)
    await enablePush()
    setPushActivating(false)
    setPushDone(true)
  }, [enablePush])

  if (!visible) return null

  const step = steps[currentStep]
  if (!step) return null

  const showPushCTA = !isSubscribed && permission !== 'denied' && !pushDone

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      >
        <motion.div
          key={`step-${currentStep}`}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-lg relative"
          style={{
            background:   'linear-gradient(135deg, #1a1a3e 0%, #12122a 100%)',
            border:       `1px solid ${step.color}30`,
            borderRadius: '24px',
            boxShadow:    `0 0 80px ${step.color}15, 0 24px 64px rgba(0,0,0,0.7)`,
          }}
        >
          {/* ── Barre de progression étape ── */}
          <div className="h-1 rounded-t-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${step.color}, ${step.color}88)` }}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="p-7">
            {/* ── Icône + Compteur ── */}
            <div className="flex items-start justify-between mb-5">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 280 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${step.color}15`, border: `1px solid ${step.color}25` }}
              >
                {step.icon}
              </motion.div>

              <div className="flex items-center gap-2">
                {/* Indicateurs étapes */}
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width:      i === currentStep ? 16 : 6,
                        height:     6,
                        background: i <= currentStep ? step.color : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                  {currentStep + 1}/{steps.length}
                </span>
              </div>
            </div>

            {/* ── Titre ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: step.color }}>
                {step.subtitle}
              </p>
              <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Syne', sans-serif" }}>
                {step.title}
              </h2>
              <p className="text-sm text-white/55 leading-relaxed">
                {step.description}
              </p>
            </motion.div>

            {/* ── Tip ── */}
            {step.tip && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: `${step.color}0D`, border: `1px solid ${step.color}18` }}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">💡</span>
                <p className="text-xs leading-relaxed" style={{ color: `${step.color}cc` }}>{step.tip}</p>
              </motion.div>
            )}

            {/* ── Checklist étape (si présente) ── */}
            {step.checklist && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 space-y-2"
              >
                {step.checklist.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${step.color}15`, border: `1px solid ${step.color}25` }}
                    >
                      <span className="text-xs">{item.icon}</span>
                    </div>
                    <span className="text-xs text-white/60">{item.text}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── CTA Push (sur dernière étape ou étape welcome) ── */}
            {showPushCTA && (currentStep === 0 || isLast) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-4 flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.2)' }}
              >
                <div className="flex items-center gap-2">
                  <Bell size={14} style={{ color: '#818CF8' }} />
                  <span className="text-xs text-white/60">Activer les notifications push</span>
                </div>
                <button
                  onClick={handleEnablePush}
                  disabled={pushActivating}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white transition-all"
                  style={{ background: 'rgba(79, 70, 229, 0.3)' }}
                >
                  {pushActivating ? (
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Activer <ArrowRight size={11} /></>
                  )}
                </button>
              </motion.div>
            )}

            {/* ── Actions ── */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={skipAll}
                className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/45 transition-colors"
              >
                <SkipForward size={13} />
                Passer l'onboarding
              </button>

              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${step.color}, ${step.color}88)`,
                  boxShadow:  `0 4px 20px ${step.color}35`,
                }}
              >
                {isLast ? (
                  <>Commencer <Check size={14} /></>
                ) : (
                  <>Suivant <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── COMPOSANT CHECKLIST FLOTTANTE ───────────────────────────
// Affiché après l'onboarding wizard (coin bas-droit, rétractable)
export function OnboardingChecklist() {
  const { profile } = useAuth?.() || {}
  const navigate = useNavigate()
  const { enablePush, isSubscribed, supported, permission } = usePushNotifications()
  const [collapsed, setCollapsed] = useState(false)
  const [completedLocal, setCompletedLocal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('apex_checklist_done') || '[]') }
    catch { return [] }
  })

  const roleGroup = profile?.role ? getRoleGroup(profile.role) : ROLES.COLLABORATEUR
  const items = CHECKLIST_ITEMS[roleGroup] || CHECKLIST_ITEMS.collaborateur

  const isItemDone = (key) => {
    if (key === 'enable_push') return isSubscribed || completedLocal.includes(key)
    return completedLocal.includes(key)
  }

  const markDone = (key) => {
    const next = [...new Set([...completedLocal, key])]
    setCompletedLocal(next)
    localStorage.setItem('apex_checklist_done', JSON.stringify(next))
  }

  const doneCount = items.filter(item => isItemDone(item.key)).length
  const progress  = Math.round((doneCount / items.length) * 100)
  const allDone   = doneCount === items.length

  // Masquer si tout fait
  if (allDone) return null

  const handleItemClick = async (item) => {
    if (item.pushAction) {
      const success = await enablePush()
      if (success) {
        // Push activé avec succès
        markDone(item.key)
      } else if (!supported || permission === 'denied') {
        // Navigateur incompatible ou utilisateur a refusé → on passe l'étape
        markDone(item.key)
      }
      // Si permission === 'default' et non supporté → on ne marque pas (l'utilisateur peut réessayer)
      return
    }
    if (item.link) {
      markDone(item.key)
      navigate(item.link)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-6 right-6 z-[9980] w-72"
      style={{
        background:    'linear-gradient(135deg, #1a1a3e 0%, #12122a 100%)',
        border:        '1px solid rgba(79, 70, 229, 0.25)',
        borderRadius:  '16px',
        boxShadow:     '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {/* En-tête */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.2)' }}>
            <BookOpen size={12} style={{ color: '#818CF8' }} />
          </div>
          <span className="text-xs font-bold text-white">Premiers pas</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(79,70,229,0.2)', color: '#818CF8' }}
          >
            {doneCount}/{items.length}
          </span>
        </div>
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={13} className="text-white/30 -rotate-90" />
        </motion.div>
      </button>

      {/* Barre de progression */}
      <div className="px-4 pb-2">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[9px] text-white/25 mt-1">{progress}% complété</p>
      </div>

      {/* Liste checklist */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1">
              {items.map((item) => {
                const done = isItemDone(item.key)
                return (
                  <motion.button
                    key={item.key}
                    onClick={() => !done && handleItemClick(item)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left"
                    style={{
                      background:  done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                      cursor:      done ? 'default' : 'pointer',
                      opacity:     done ? 0.7 : 1,
                    }}
                    whileHover={!done ? { scale: 1.01 } : {}}
                    whileTap={!done ? { scale: 0.99 } : {}}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: done ? '#10B981' : 'rgba(255,255,255,0.05)',
                        border:     `1px solid ${done ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {done && <Check size={10} className="text-white" />}
                    </div>

                    <span className="text-xs flex-1">{item.icon} {item.label}</span>

                    {/* Points */}
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                        color:      done ? '#10B981' : 'rgba(255,255,255,0.25)',
                      }}
                    >
                      +{item.points}pts
                    </span>

                    {!done && item.link && <ExternalLink size={9} className="text-white/20 flex-shrink-0" />}
                    {/* Bouton "Ignorer" sur push si non supporté ou refusé */}
                    {!done && item.pushAction && (!supported || permission === 'denied') && (
                      <span
                        onClick={(e) => { e.stopPropagation(); markDone(item.key) }}
                        className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 cursor-pointer hover:bg-white/10 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                        title="Passer cette étape"
                      >
                        Ignorer
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Import useAuth pour la checklist
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../utils/constants'
