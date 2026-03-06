// ============================================================
// APEX RH — App.jsx  ·  Session 49 (QW2 : React.lazy)
// Routes complètes — vision originale + rétrocompatibilité totale
// QW2 S49 : lazy loading par route pour réduire le bundle initial
// ============================================================
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout      from './components/layout/AppLayout'

// ── Auth (eager — chemin critique, petits fichiers) ──────────
import Login               from './pages/auth/Login'
import ForgotPassword      from './pages/auth/ForgotPassword'
import ResetPassword       from './pages/auth/ResetPassword'
import ForceChangePassword from './pages/auth/ForceChangePassword'

// ── Pages lazy — chargées à la demande par route ─────────────
const UsersPage      = lazy(() => import('./pages/admin/Users'))
const Organisation   = lazy(() => import('./pages/admin/Organisation'))
const SettingsPage   = lazy(() => import('./pages/admin/Settings'))

const Dashboard      = lazy(() => import('./pages/dashboard/Dashboard'))
const MonEspace      = lazy(() => import('./pages/mon-espace/MonEspace'))
const MonEquipe      = lazy(() => import('./pages/mon-equipe/MonEquipe'))
const Tasks          = lazy(() => import('./pages/tasks/Tasks'))
const ObjectivesPage = lazy(() => import('./pages/objectives/Objectives'))
const ProjectsPage   = lazy(() => import('./pages/projects/Projects'))
const IntelligenceRH = lazy(() => import('./pages/intelligence/IntelligenceRH'))
const EngagementHub  = lazy(() => import('./pages/engagement/EngagementHub'))

// ── Fallback Suspense ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/50 animate-spin"/>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Publiques */}
      <Route path="/login"           element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protégées */}
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ForceChangePassword />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Suspense fallback={<PageLoader />}>
            {/* Principal */}
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/mon-espace" element={<MonEspace />} />
            <Route path="/mon-equipe" element={<MonEquipe />} />

            {/* Travail */}
            <Route path="/travail/taches"    element={<Tasks />} />
            <Route path="/travail/projets"   element={<ProjectsPage />} />
            <Route path="/travail/objectifs" element={<ObjectivesPage />} />

            {/* Mesure & Analyse */}
            <Route path="/intelligence" element={<IntelligenceRH />} />
            <Route path="/engagement"   element={<EngagementHub />} />

            {/* Administration */}
            <Route path="/admin/users"        element={<UsersPage />} />
            <Route path="/admin/organisation" element={<Organisation />} />
            <Route path="/admin/settings"     element={<SettingsPage />} />

            {/* Rétrocompatibilité — anciennes URLs */}
            <Route path="/tasks"      element={<Navigate to="/travail/taches"    replace />} />
            <Route path="/objectives" element={<Navigate to="/travail/objectifs" replace />} />
            <Route path="/projects"   element={<Navigate to="/travail/projets"   replace />} />
            <Route path="/pulse/*"    element={<Navigate to="/intelligence"       replace />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Suspense>
        </Route>
      </Route>
    </Routes>
  )
}
