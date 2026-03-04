// ============================================================
// APEX RH — App.jsx
// ✅ Session 23 — Ajout routes /pulse/board (Phase C) et /pulse/reports (Phase D)
// ✅ Session 24 — Ajout route /pulse/awards (Phase E)
// ✅ Session 25 — Phase G : Suppression routes /pulse/* (Étape 2 — Fusion UI)
//    Les pages PULSE sont maintenant des onglets dans Tasks.jsx (/tasks)
// ============================================================
import { Routes, Route, Navigate } from 'react-router-dom'

// Layout
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Pages publiques (auth)
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Page semi-protégée (connecté mais doit changer mdp)
import ForceChangePassword from './pages/auth/ForceChangePassword'

// Pages protégées
import Dashboard from './pages/dashboard/Dashboard'
import UsersPage from './pages/admin/Users'
import Organisation from './pages/admin/Organisation'
import Tasks from './pages/tasks/Tasks'
import ObjectivesPage from './pages/objectives/Objectives'
import ProjectsPage from './pages/projects/Projects'
import SettingsPage from './pages/admin/Settings'

// ✅ Session 25 — Phase G : Les imports PULSE sont supprimés ici.
// Journal, Team, Board, Reports, Awards sont importés directement dans Tasks.jsx
// Pulse.jsx (hub standalone) est supprimé.

export default function App() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login"           element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Routes protégées — wrappées dans AppLayout */}
      <Route element={<ProtectedRoute />}>
        {/* Page changement de mot de passe obligatoire (sans AppLayout) */}
        <Route path="/change-password" element={<ForceChangePassword />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Administration */}
          <Route path="/admin/users"         element={<UsersPage />} />
          <Route path="/admin/organisation"  element={<Organisation />} />
          <Route path="/admin/settings"      element={<SettingsPage />} />

          {/* Modules */}
          <Route path="/tasks"      element={<Tasks />} />
          <Route path="/objectives" element={<ObjectivesPage />} />
          <Route path="/projects"   element={<ProjectsPage />} />

          {/* ✅ Session 25 — Routes /pulse/* supprimées (Phase G — Étape 2)
              Les onglets PULSE sont accessibles via /tasks (Performance, Rapports, Awards, Ma Journée)
              Redirection de sécurité : si quelqu'un accède à une ancienne URL /pulse/... */}
          <Route path="/pulse/*" element={<Navigate to="/tasks" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
