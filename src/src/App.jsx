// ============================================================
// APEX RH — App.jsx · Réorg UX Hub & Spoke
// Architecture Hub & Spoke — 5 hubs principaux
// + rétrocompatibilité totale des anciennes URLs
// ============================================================
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout      from './components/layout/AppLayout'

// ── Auth (eager) ──────────────────────────────────────────────
import Login               from './pages/auth/Login'
import ForgotPassword      from './pages/auth/ForgotPassword'
import ResetPassword       from './pages/auth/ResetPassword'
import ForceChangePassword from './pages/auth/ForceChangePassword'

// ── Hub pages (lazy) ─────────────────────────────────────────
const MonEspaceHub      = lazy(() => import('./pages/espace/MonEspaceHub'))
const ManagementHub     = lazy(() => import('./pages/management/ManagementHub'))
const AdministrationHub = lazy(() => import('./pages/administration/AdministrationHub'))

// ── Pages existantes (lazy) ───────────────────────────────────
const UsersPage      = lazy(() => import('./pages/admin/Users'))
const Organisation   = lazy(() => import('./pages/admin/Organisation'))
const AccessControl  = lazy(() => import('./pages/admin/AccessControl'))
const SettingsPage   = lazy(() => import('./pages/admin/Settings'))
const SuperAdmin     = lazy(() => import('./pages/admin/SuperAdmin'))
const ApiManager     = lazy(() => import('./pages/admin/ApiManager'))

const Dashboard      = lazy(() => import('./pages/dashboard/Dashboard'))
const MonEspace      = lazy(() => import('./pages/mon-espace/MonEspace'))
const MonEquipe      = lazy(() => import('./pages/mon-equipe/MonEquipe'))
const Tasks          = lazy(() => import('./pages/tasks/Tasks'))
const ObjectivesPage = lazy(() => import('./pages/objectives/Objectives'))
const ProjectsPage   = lazy(() => import('./pages/projects/Projects'))
const IntelligenceRH = lazy(() => import('./pages/intelligence/IntelligenceRH'))
const EngagementHub  = lazy(() => import('./pages/engagement/EngagementHub'))
const Formation         = lazy(() => import('./pages/formation/Formation'))
const DeveloppementHub  = lazy(() => import('./pages/developpement/DeveloppementHub'))
const CycleRHHub        = lazy(() => import('./pages/cycle-rh/CycleRHHub'))
const Compensation   = lazy(() => import('./pages/compensation/Compensation'))
const Recrutement    = lazy(() => import('./pages/recrutement/Recrutement'))
const EntretiensAnnuels = lazy(() => import('./pages/entretiens/EntretiensAnnuels'))

// ── Gestion des Temps S66 ─────────────────────────────────────
const GestionTemps          = lazy(() => import('./pages/temps/GestionTemps'))
const GestionTempsAbsences  = lazy(() => import('./pages/temps-absences/GestionTempsAbsences'))

// ── Congés & Absences S67 ─────────────────────────────────────
const GestionConges = lazy(() => import('./pages/conges/GestionConges'))

// ── Module 5 Performance S93 ──────────────────────────────────
const PerformanceHub = lazy(() => import('./pages/performance/PerformanceHub'))

// ── Module 6 Évaluations S94 ──────────────────────────────────
const EvaluationsHub = lazy(() => import('./pages/evaluations/EvaluationsHub'))

// ── Module 2 Gestion des Employés S96 ─────────────────────────
const EmployesHub = lazy(() => import('./pages/employes/EmployesHub'))

// ── Onboarding S75 ────────────────────────────────────────────
const Onboarding  = lazy(() => import('./pages/onboarding/Onboarding'))
// ── Offboarding S68 ───────────────────────────────────────────
const Offboarding = lazy(() => import('./pages/offboarding/Offboarding'))

// ── Communication S65 ─────────────────────────────────────────
const CommunicationPage = lazy(() => import('./pages/communication/CommunicationPage'))
const MessagesPage      = lazy(() => import('./pages/communication/Messages'))
const AnnoncesPage      = lazy(() => import('./pages/communication/Annonces'))
const FilsPage          = lazy(() => import('./pages/communication/Fils'))

// ── Espace Collaborateur ──────────────────────────────────────
const MaPerformance      = lazy(() => import('./pages/ma-performance/MaPerformance'))
const MonDeveloppement   = lazy(() => import('./pages/mon-developpement/MonDeveloppement'))
const MesReconnaissances = lazy(() => import('./pages/mes-reconnaissances/MesReconnaissances'))
const MonTableauDeBord   = lazy(() => import('./pages/mon-tableau-de-bord/MonTableauDeBord'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/50 animate-spin"/>
    </div>
  )
}
const S = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>

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

          {/* ── Tableaux de bord ── */}
          <Route path="/dashboard"           element={<S><Dashboard /></S>} />
          <Route path="/mon-tableau-de-bord" element={<S><MonTableauDeBord /></S>} />

          {/* ── Hubs principaux ── */}
          <Route path="/mon-espace"      element={<S><MonEspaceHub /></S>} />
          <Route path="/management"      element={<S><ManagementHub /></S>} />
          <Route path="/administration"  element={<S><AdministrationHub /></S>} />

          {/* ── Pages Espace Personnel (depuis Mon Espace Hub) ── */}
          <Route path="/ma-performance"      element={<S><MaPerformance /></S>} />
          <Route path="/mon-developpement"   element={<S><MonDeveloppement /></S>} />  {/* inclut Formation */}
          <Route path="/mes-reconnaissances" element={<S><MesReconnaissances /></S>} />
          <Route path="/engagement"          element={<S><EngagementHub /></S>} />     {/* Récompenses & Engagement */}
          <Route path="/compensation"        element={<S><Compensation /></S>} />

          {/* ── Travail (depuis Mon Espace Hub) ── */}
          <Route path="/travail/taches"    element={<S><Tasks /></S>} />
          <Route path="/travail/projets"   element={<S><ProjectsPage /></S>} />
          <Route path="/travail/objectifs" element={<S><ObjectivesPage /></S>} />

          {/* ── Management (sous-pages depuis ManagementHub) ── */}
          <Route path="/mon-equipe" element={<S><MonEquipe /></S>} />
          <Route path="/developpement" element={<S><DeveloppementHub /></S>} />  {/* Module 7 V2 */}
          <Route path="/formation"     element={<Navigate to="/developpement" replace />} />  {/* S97 redirect */}

          {/* ── Analyse RH ── */}
          <Route path="/intelligence" element={<S><IntelligenceRH /></S>} />

          {/* ── Module 2 — Gestion des Employés S96 ── */}
          <Route path="/employes" element={<S><EmployesHub /></S>} />

          {/* ── RH Opérationnel (sidebar directe) ── */}
          <Route path="/recrutement" element={<Navigate to="/cycle-rh" replace />} />  {/* S98 redirect */}
          <Route path="/cycle-rh"    element={<S><CycleRHHub /></S>} />             {/* Module 4 V2 */}
          <Route path="/entretiens"  element={<S><EntretiensAnnuels /></S>} />
          <Route path="/temps-absences"  element={<S><GestionTempsAbsences /></S>} />
          <Route path="/temps"           element={<Navigate to="/temps-absences" replace />} />
          <Route path="/conges"          element={<Navigate to="/temps-absences" replace />} />
          <Route path="/performance"     element={<S><PerformanceHub /></S>} />
          <Route path="/evaluations"     element={<S><EvaluationsHub /></S>} />
          <Route path="/offboarding" element={<Navigate to="/cycle-rh" replace />} />  {/* S98 redirect */}
          <Route path="/onboarding"  element={<Navigate to="/cycle-rh" replace />} />  {/* S98 redirect */}

          {/* ── Communication S65 ── */}
          <Route path="/communication"          element={<S><CommunicationPage /></S>} />
          <Route path="/communication/messages" element={<S><MessagesPage /></S>} />
          <Route path="/communication/annonces" element={<S><AnnoncesPage /></S>} />
          <Route path="/communication/fils"     element={<S><FilsPage /></S>} />

          {/* ── Administration (sous-pages depuis AdminHub) ── */}
          <Route path="/admin/users"         element={<Navigate to="/employes" replace />} />
          <Route path="/admin/organisation"  element={<S><Organisation /></S>} />
          <Route path="/admin/access-control" element={<S><AccessControl /></S>} />
          <Route path="/admin/settings"     element={<S><SettingsPage /></S>} />
          <Route path="/admin/super-admin"  element={<S><SuperAdmin /></S>} />
          <Route path="/admin/api-manager"  element={<S><ApiManager /></S>} />

          {/* ── Rétrocompatibilité ── */}
          <Route path="/tasks"      element={<Navigate to="/travail/taches"    replace />} />
          <Route path="/objectives" element={<Navigate to="/travail/objectifs" replace />} />
          <Route path="/projects"   element={<Navigate to="/travail/projets"   replace />} />
          <Route path="/pulse/*"    element={<Navigate to="/intelligence"       replace />} />
          <Route path="/mon-espace-legacy" element={<S><MonEspace /></S>} />  {/* ancien /mon-espace si besoin */}

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
