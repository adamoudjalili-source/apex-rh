// ============================================================
// APEX RH — AppLayout.jsx · S134
// Aurora Design #9 — CORRECTION: couches opaques supprimées
// Aurora très visible · Header transparent · Sidebar INTACTE
// ============================================================
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header  from './Header'
import NotificationToast    from '../notifications/NotificationToast'
import PushPermissionBanner from '../notifications/PushPermissionBanner'
import OnboardingWizardV2, { OnboardingChecklist } from '../onboarding/OnboardingWizardV2'

// ─── Rideaux d'aurore boréale ─────────────────────────────────
// position:fixed zIndex:0 → derrière tout
// Les containers parents DOIVENT être background:transparent
function AuroraBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: 'linear-gradient(180deg, #03080F 0%, #040B14 50%, #030910 100%)',
    }}>

      {/* ── Rideau jade gauche ── */}
      <div style={{
        position: 'absolute', top: '0%', left: '-10%',
        width: '55%', height: '90%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(16,185,129,.50) 25%, rgba(52,211,153,.35) 50%, rgba(16,185,129,.20) 75%, transparent 100%)',
        filter: 'blur(55px)',
        transform: 'skewX(-8deg)',
      }} />

      {/* ── Rideau violet centre ── */}
      <div style={{
        position: 'absolute', top: '-5%', left: '20%',
        width: '42%', height: '95%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(124,58,237,.45) 20%, rgba(167,139,250,.30) 50%, rgba(99,102,241,.15) 75%, transparent 100%)',
        filter: 'blur(60px)',
        transform: 'skewX(6deg)',
      }} />

      {/* ── Rideau or droit ── */}
      <div style={{
        position: 'absolute', top: '5%', right: '-8%',
        width: '42%', height: '75%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(245,158,11,.30) 30%, rgba(251,191,36,.20) 55%, rgba(245,158,11,.10) 75%, transparent 100%)',
        filter: 'blur(50px)',
        transform: 'skewX(-12deg)',
      }} />

      {/* ── Lueur basse chaude ── */}
      <div style={{
        position: 'absolute', bottom: '-8%', left: '25%',
        width: '55%', height: '40%',
        background: 'radial-gradient(ellipse, rgba(16,185,129,.15) 0%, rgba(139,92,246,.10) 40%, transparent 70%)',
        filter: 'blur(70px)',
      }} />

      {/* ── Halo centre-haut ── */}
      <div style={{
        position: 'absolute', top: '-10%', left: '35%',
        width: '35%', height: '50%',
        background: 'radial-gradient(ellipse, rgba(167,139,250,.20) 0%, rgba(124,58,237,.10) 50%, transparent 75%)',
        filter: 'blur(60px)',
      }} />

      {/* ── Étoiles ── */}
      {[
        [8,4],[17,11],[29,7],[43,3],[57,9],[68,5],[81,2],[92,8],
        [5,18],[22,22],[36,16],[51,20],[64,14],[77,19],[89,23],
        [12,33],[33,29],[48,35],[62,28],[75,32],[88,36],
        [7,42],[26,44],[44,41],[59,43],[73,40],[91,45],
        [15,55],[38,52],[55,58],[70,54],[85,50],
      ].map(([l,t],i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 7 === 0 ? 2 : 1,
          height: i % 7 === 0 ? 2 : 1,
          borderRadius: '50%',
          background: `rgba(255,255,255,${0.08 + (i % 5) * 0.07})`,
          left: `${l}%`, top: `${t}%`,
          boxShadow: i % 7 === 0 ? '0 0 4px rgba(255,255,255,.4)' : 'none',
        }} />
      ))}

      {/* ── Vignette bas ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 115%, rgba(3,8,15,.75) 0%, transparent 55%)',
      }} />
    </div>
  )
}

export default function AppLayout() {
  return (
    // ⚠️ PAS de background ici — laisse l'aurore transparaître
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>

      {/* Aurore fixe derrière tout */}
      <AuroraBackground />

      {/* Sidebar — INCHANGÉE, logo NITA intact, zIndex 10 */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Zone principale — transparente pour laisser l'aurore visible */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ position: 'relative', zIndex: 10, background: 'transparent' }}
      >
        <Header />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ background: 'transparent' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Overlays globaux */}
      <OnboardingWizardV2 />
      <OnboardingChecklist />
      <NotificationToast />
      <PushPermissionBanner />
    </div>
  )
}
