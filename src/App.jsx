// ============================================================
// APEX RH — App.jsx  ·  Session 38
// Navigation 3 expériences distinctes
//
// NOUVELLES ROUTES :
//   /mon-tableau-de-bord  → MonTableauDeBord (remplace /dashboard)
//   /ma-performance       → MaPerformance (NOUVEAU)
//   /mon-developpement    → MonDeveloppement (NOUVEAU — placeholder S41)
//   /mes-reconnaissances  → MesReconnaissances (remplace /engagement côté collab)
//
// RÉTROCOMPATIBILITÉ TOTALE :
//   /dashboard            → /mon-tableau-de-bord
//   /mon-espace           → /mon-tableau-de-bord
//   /engagement           → /mes-reconnaissances
//   /tasks                → /travail/taches
//   /objectives           → /travail/objectifs
//   /projects             → /travail/projets
//   /pulse/*              → /intelligence
// ============================================================
import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute      from './components/layout/ProtectedRoute'
import AppLayout           from './components/layout/AppLayout'

// Auth
import Login               from './pages/auth/Login'
import ForgotPassword      from './pages/auth/ForgotPassword'
import ResetPassword       from './pages/auth/ResetPassword'
import ForceChangePassword from './pages/auth/ForceChangePassword'

// Administration (inchangé)
import UsersPage           from './pages/admin/Users'
import Organisation        from './pages/admin/Organisation'
import SettingsPage        from './pages/admin/Settings'

// S38 — Nouvelles pages "Mon..."
import MonTableauDeBord    from './pages/mon-tableau-de-bord/MonTableauDeBord'
import MaPerformance       from './pages/ma-performance/MaPerformance'
import MonDeveloppement    from './pages/mon-developpement/MonDeveloppement'
import MesReconnaissances  from './pages/mes-reconnaissances/MesReconnaissances'

// Pages existantes (inchangées)
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
          {/* Racine → Mon Tableau de Bord */}
          <Route path="/" element={<Navigate to="/mon-tableau-de-bord" replace />} />

          {/* ── S38 — Navigation 3 expériences ── */}
          <Route path="/mon-tableau-de-bord"  element={<MonTableauDeBord />} />
          <Route path="/ma-performance"       element={<MaPerformance />} />
          <Route path="/mon-developpement"    element={<MonDeveloppement />} />
          <Route path="/mes-reconnaissances"  element={<MesReconnaissances />} />

          {/* ── Pages inchangées ── */}
          <Route path="/mon-equipe"  element={<MonEquipe />} />

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

          {/* ── Rétrocompatibilité totale ── */}
          <Route path="/dashboard"   element={<Navigate to="/mon-tableau-de-bord" replace />} />
          <Route path="/mon-espace"  element={<Navigate to="/mon-tableau-de-bord" replace />} />
          <Route path="/tasks"       element={<Navigate to="/travail/taches"      replace />} />
          <Route path="/objectives"  element={<Navigate to="/travail/objectifs"   replace />} />
          <Route path="/projects"    element={<Navigate to="/travail/projets"     replace />} />
          <Route path="/pulse/*"     element={<Navigate to="/intelligence"        replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/mon-tableau-de-bord" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
