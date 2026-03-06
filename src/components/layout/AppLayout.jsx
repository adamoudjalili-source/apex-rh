import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

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
    </div>
  )
}