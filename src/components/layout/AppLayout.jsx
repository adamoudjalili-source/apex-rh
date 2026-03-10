// ============================================================
// APEX RH — AppLayout.jsx · S134
// Fond neutre — chaque page gère son propre fond
// Sidebar INCHANGÉE (logo NITA intact)
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
      style={{ background: '#060B18' }}
    >
      {/* Sidebar INCHANGÉE */}
      <Sidebar />

      {/* Zone principale */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative' }}>
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: 'transparent' }}>
          <Outlet />
        </main>
      </div>

      <OnboardingWizardV2 />
      <OnboardingChecklist />
      <NotificationToast />
      <PushPermissionBanner />
    </div>
  )
}
