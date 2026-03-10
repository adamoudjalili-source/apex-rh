// ============================================================
// APEX RH — AppLayout.jsx
// ✅ S134 — Aurora background (Design #9)
//    Sidebar INCHANGÉE (logo NITA préservé)
// ============================================================
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header  from './Header'
import NotificationToast    from '../notifications/NotificationToast'
import PushPermissionBanner from '../notifications/PushPermissionBanner'
import OnboardingWizardV2, { OnboardingChecklist } from '../onboarding/OnboardingWizardV2'

// ─── Rideaux d'aurore boréale ─────────────────────────────────
function AuroraBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      background: 'linear-gradient(180deg, #03080F 0%, #050D18 50%, #060A14 100%)' }}>

      {/* Rideau jade gauche */}
      <div style={{
        position: 'absolute', top: '5%', left: '-5%', width: '48%', height: '80%',
        background: 'linear-gradient(180deg,transparent 0%,rgba(16,185,129,.22) 20%,rgba(52,211,153,.13) 45%,rgba(16,185,129,.07) 65%,transparent 100%)',
        filter: 'blur(50px)', transform: 'skewX(-8deg)',
      }} />

      {/* Rideau violet centre */}
      <div style={{
        position: 'absolute', top: '0%', left: '22%', width: '38%', height: '85%',
        background: 'linear-gradient(180deg,transparent 0%,rgba(124,58,237,.18) 20%,rgba(167,139,250,.10) 50%,rgba(99,102,241,.05) 70%,transparent 100%)',
        filter: 'blur(55px)', transform: 'skewX(5deg)',
      }} />

      {/* Rideau or droit */}
      <div style={{
        position: 'absolute', top: '8%', right: '-5%', width: '38%', height: '70%',
        background: 'linear-gradient(180deg,transparent 0%,rgba(245,158,11,.10) 30%,rgba(251,191,36,.06) 55%,transparent 100%)',
        filter: 'blur(45px)', transform: 'skewX(-10deg)',
      }} />

      {/* Lueur basse */}
      <div style={{
        position: 'absolute', bottom: '-5%', left: '30%', width: '45%', height: '35%',
        background: 'radial-gradient(ellipse,rgba(16,185,129,.08) 0%,rgba(139,92,246,.05) 50%,transparent 75%)',
        filter: 'blur(60px)',
      }} />

      {/* Étoiles */}
      {[
        [8,4],[17,11],[29,7],[43,3],[57,9],[68,5],[81,2],[92,8],
        [5,18],[22,22],[36,16],[51,20],[64,14],[77,19],[89,23],
        [12,33],[33,29],[48,35],[62,28],[75,32],[88,36],
        [7,42],[26,44],[44,41],[59,43],[73,40],[91,45],
      ].map(([l,t],i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 7 === 0 ? 2 : 1, height: i % 7 === 0 ? 2 : 1,
          borderRadius: '50%',
          background: `rgba(255,255,255,${0.06 + (i % 5) * 0.05})`,
          left: `${l}%`, top: `${t}%`,
          boxShadow: i % 7 === 0 ? '0 0 3px rgba(255,255,255,.3)' : 'none',
        }} />
      ))}

      {/* Vignette bords */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 110%, rgba(3,8,15,.8) 0%, transparent 55%)',
      }} />
    </div>
  )
}

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#03080F' }}>

      {/* ── Aurore en fond ── */}
      <AuroraBackground />

      {/* ── Sidebar — INCHANGÉE, logo NITA préservé ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Sidebar />
      </div>

      {/* ── Zone principale ── */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 10 }}>
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* ── Overlays globaux ── */}
      <OnboardingWizardV2 />
      <OnboardingChecklist />
      <NotificationToast />
      <PushPermissionBanner />
    </div>
  )
}
