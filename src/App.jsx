// ============================================================
// APEX RH — App.jsx  ·  Session 36 v3
// Routes complètes — vision originale + rétrocompatibilité totale
//
// Nouvelles routes :
//   /mon-espace              → MonEspace
//   /mon-equipe              → MonEquipe
//   /travail/taches          → Tasks (exécution pure)
//   /travail/projets         → Projects
//   /travail/objectifs       → Objectives
//   /intelligence            → IntelligenceRH (Analytics+F360+Reviews+Surveys)
//   /engagement              → EngagementHub (Awards+Gamification+IACoach+Rapports)
//
// Rétrocompat :
//   /tasks      → /travail/taches
//   /objectives → /travail/objectifs
//   /projects   → /travail/projets
//   /pulse/*    → /intelligence
// ============================================================
import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute      from './components/layout/ProtectedRoute'
import AppLayout           from './components/layout/AppLayout'

// Auth
import Login               from './pages/auth/Login'
import ForgotPassword      from './pages/auth/ForgotPassword'
import ResetPassword       from './pages/auth/ResetPassword'
import ForceChangePassword from './pages/auth/ForceChangePassword'

// Pages inchangées
import UsersPage           from './pages/admin/Users'
import Organisation        from './pages/admin/Organisation'
import SettingsPage        from './pages/admin/Settings'

// S36 v3 — nouvelles / refactorisées
import Dashboard           from './pages/dashboard/Dashboard'
import MonEspace           from './pages/mon-espace/MonEspace'
import MonEquipe           from './pages/mon-equipe/MonEquipe'
import Tasks               from './pages/tasks/Tasks'
import ObjectivesPage      from './pages/objectives/Objectives'
import ProjectsPage        from './pages/projects/Projects'
import IntelligenceRH      from './pages/intelligence/IntelligenceRH'
import EngagementHub       from './pages/engagement/EngagementHub'

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
        </Route>
      </Route>
    </Routes>
  )
}
