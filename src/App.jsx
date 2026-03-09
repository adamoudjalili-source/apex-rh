// ============================================================
// APEX RH — App.jsx · S110
// Architecture Hub & Spoke — hubs V2 uniquement
// Rétrocompatibilité totale des anciennes URLs
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

// ── Tableaux de bord ──────────────────────────────────────────
const Dashboard        = lazy(() => import('./pages/dashboard/Dashboard'))
const MonTableauDeBord = lazy(() => import('./pages/dashboard/Dashboard'))  // alias

// ── Mon Espace ────────────────────────────────────────────────
const MonTravail       = lazy(() => import('./pages/mon-travail/MonTravail'))
const MonProfil        = lazy(() => import('./pages/mon-profil/MonProfil'))
const MaPerformance    = lazy(() => import('./pages/ma-performance/MaPerformance'))
const MonDeveloppement = lazy(() => import('./pages/mon-developpement/MonDeveloppement'))
const EngagementHub    = lazy(() => import('./pages/engagement/EngagementHub'))
const Compensation     = lazy(() => import('./pages/compensation/Compensation'))

// ── Travail ───────────────────────────────────────────────────
const Tasks          = lazy(() => import('./pages/tasks/Tasks'))
const ObjectivesPage = lazy(() => import('./pages/objectives/Objectives'))
const ProjectsPage   = lazy(() => import('./pages/projects/Projects'))

// ── Management ───────────────────────────────────────────────
const ManagementHub = lazy(() => import('./pages/management/ManagementHub'))
const MonEquipe     = lazy(() => import('./pages/mon-equipe/MonEquipe'))

// ── Hubs RH V2 ───────────────────────────────────────────────
const DeveloppementHub     = lazy(() => import('./pages/developpement/DeveloppementHub'))
const CycleRHHub           = lazy(() => import('./pages/cycle-rh/CycleRHHub'))
const GestionTempsAbsences = lazy(() => import('./pages/temps-absences/GestionTempsAbsences'))
const PerformanceHub       = lazy(() => import('./pages/performance/PerformanceHub'))
const EvaluationsHub       = lazy(() => import('./pages/evaluations/EvaluationsHub'))
const IntelligenceRH       = lazy(() => import('./pages/intelligence/IntelligenceRH'))
const EmployesHub          = lazy(() => import('./pages/employes/EmployesHub'))
const EntretiensAnnuels    = lazy(() => import('./pages/entretiens/EntretiensAnnuels'))

// ── Communication ─────────────────────────────────────────────
const CommunicationPage = lazy(() => import('./pages/communication/CommunicationPage'))
const MessagesPage      = lazy(() => import('./pages/communication/Messages'))
const AnnoncesPage      = lazy(() => import('./pages/communication/Annonces'))
const FilsPage          = lazy(() => import('./pages/communication/Fils'))

// ── Administration ────────────────────────────────────────────
const Organisation  = lazy(() => import('./pages/admin/Organisation'))
const AccessControl = lazy(() => import('./pages/admin/AccessControl'))
const SettingsPage  = lazy(() => import('./pages/admin/Settings'))
const SuperAdmin    = lazy(() => import('./pages/admin/SuperAdmin'))
const ApiManager    = lazy(() => import('./pages/admin/ApiManager'))
const Notifications = lazy(() => import('./pages/admin/Notifications'))

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

          {/* ── Mon Espace ── */}
          <Route path="/mon-travail"       element={<S><MonTravail /></S>} />
          <Route path="/mon-profil"        element={<S><MonProfil /></S>} />
          <Route path="/ma-performance"    element={<S><MaPerformance /></S>} />
          <Route path="/mon-developpement" element={<S><MonDeveloppement /></S>} />
          <Route path="/engagement"        element={<S><EngagementHub /></S>} />
          <Route path="/compensation"      element={<S><Compensation /></S>} />

          {/* ── Travail (sous-routes) ── */}
          <Route path="/travail/taches"    element={<S><Tasks /></S>} />
          <Route path="/travail/projets"   element={<S><ProjectsPage /></S>} />
          <Route path="/travail/objectifs" element={<S><ObjectivesPage /></S>} />

          {/* ── Management ── */}
          <Route path="/management" element={<S><ManagementHub /></S>} />
          <Route path="/mon-equipe" element={<S><MonEquipe /></S>} />

          {/* ── Hubs RH V2 ── */}
          <Route path="/developpement"  element={<S><DeveloppementHub /></S>} />
          <Route path="/cycle-rh"       element={<S><CycleRHHub /></S>} />
          <Route path="/temps-absences" element={<S><GestionTempsAbsences /></S>} />
          <Route path="/performance"    element={<S><PerformanceHub /></S>} />
          <Route path="/evaluations"    element={<S><EvaluationsHub /></S>} />
          <Route path="/intelligence"   element={<S><IntelligenceRH /></S>} />
          <Route path="/employes"       element={<S><EmployesHub /></S>} />
          <Route path="/entretiens"     element={<S><EntretiensAnnuels /></S>} />

          {/* ── Communication ── */}
          <Route path="/communication"          element={<S><CommunicationPage /></S>} />
          <Route path="/communication/messages" element={<S><MessagesPage /></S>} />
          <Route path="/communication/annonces" element={<S><AnnoncesPage /></S>} />
          <Route path="/communication/fils"     element={<S><FilsPage /></S>} />

          {/* ── Administration ── */}
          <Route path="/admin/users"          element={<Navigate to="/employes"       replace />} />
          <Route path="/admin/organisation"   element={<S><Organisation /></S>} />
          <Route path="/admin/access-control" element={<S><AccessControl /></S>} />
          <Route path="/admin/settings"       element={<S><SettingsPage /></S>} />
          <Route path="/admin/super-admin"    element={<S><SuperAdmin /></S>} />
          <Route path="/admin/api-manager"    element={<S><ApiManager /></S>} />
          <Route path="/admin/notifications"  element={<S><Notifications /></S>} />

          {/* ── Rétrocompatibilité URLs legacy ── */}
          <Route path="/tasks"               element={<Navigate to="/travail/taches"              replace />} />
          <Route path="/objectives"          element={<Navigate to="/travail/objectifs"           replace />} />
          <Route path="/projects"            element={<Navigate to="/travail/projets"             replace />} />
          <Route path="/formation"           element={<Navigate to="/developpement"               replace />} />
          <Route path="/recrutement"         element={<Navigate to="/cycle-rh"                   replace />} />
          <Route path="/onboarding"          element={<Navigate to="/cycle-rh"                   replace />} />
          <Route path="/offboarding"         element={<Navigate to="/cycle-rh"                   replace />} />
          <Route path="/temps"               element={<Navigate to="/temps-absences?tab=ma-feuille" replace />} />
          <Route path="/conges"              element={<Navigate to="/temps-absences?tab=ma-feuille" replace />} />
          <Route path="/pulse/*"             element={<Navigate to="/intelligence"                replace />} />
          <Route path="/administration"      element={<Navigate to="/admin/settings"              replace />} />
          <Route path="/mon-espace"          element={<Navigate to="/dashboard"                   replace />} />
          <Route path="/super-admin"         element={<Navigate to="/admin/super-admin"           replace />} />
          <Route path="/mes-reconnaissances" element={<Navigate to="/engagement"                  replace />} />

          {/* ── S110 — Routes Mon Espace ── */}
          <Route path="/mon-timesheet"   element={<Navigate to="/temps-absences?tab=ma-feuille" replace />} />
          <Route path="/mes-conges"      element={<Navigate to="/temps-absences?tab=conges"     replace />} />
          <Route path="/mes-entretiens"  element={<Navigate to="/entretiens"                    replace />} />
          <Route path="/ma-remuneration" element={<Navigate to="/compensation?tab=my"           replace />} />
          <Route path="/mon-suivi-rh"    element={<Navigate to="/cycle-rh"                      replace />} />
          <Route path="/mon-cycle-rh"    element={<Navigate to="/cycle-rh"                      replace />} />
          <Route path="/validations"     element={<Navigate to="/temps-absences"                replace />} />

          {/* ── S110 — Hubs futurs (Batch 2-3) ── */}
          <Route path="/mon-service" element={<Navigate to="/management" replace />} />
          <Route path="/ma-division" element={<Navigate to="/management" replace />} />
          <Route path="/pilotage"    element={<Navigate to="/dashboard"  replace />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
