// ============================================================
// APEX RH — AppLayout.jsx  ·  Session 39
// ✅ S39 — MobileNav intégrée (bottom bar < 768px)
// ============================================================
import { Outlet } from 'react-router-dom'
import Sidebar    from './Sidebar'
import Header     from './Header'
import MobileNav  from '../mobile/MobileNav'

export default function AppLayout() {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#0F0F23' }}
    >
      {/* Sidebar desktop — masquée sur mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Zone principale */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Contenu des pages */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Navigation mobile (bottom bar) */}
      <MobileNav />
    </div>
  )
}
