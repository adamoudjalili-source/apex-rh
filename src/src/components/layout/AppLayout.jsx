// ============================================================
// APEX RH — AppLayout.jsx
// ✅ Session 56 — Ajout NotificationToast + PushPermissionBanner
//                + OnboardingWizardV2 + OnboardingChecklist
// ============================================================
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header  from './Header'
import NotificationToast    from '../notifications/NotificationToast'
import PushPermissionBanner from '../notifications/PushPermissionBanner'
import OnboardingWizardV2, { OnboardingChecklist } from '../onboarding/OnboardingWizardV2'

export default function AppLayout() {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0F0F23' }}
    >
      {/* Sidebar à gauche */}
      <Sidebar />

      {/* Zone principale */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header en haut */}
        <Header />

        {/* Contenu des pages */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* ── Overlays globaux S56 ── */}
      <OnboardingWizardV2 />
      <OnboardingChecklist />
      <NotificationToast />
      <PushPermissionBanner />
    </div>
  )
}