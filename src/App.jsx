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
const SuperAdmin     = lazy(() => import('./pages/admin/SuperAdmin'))   // S52
const ApiManager     = lazy(() => import('./pages/admin/ApiManager'))   // S53

const Dashboard      = lazy(() => import('./pages/dashboard/Dashboard'))
const MonEspace      = lazy(() => import('./pages/mon-espace/MonEspace'))
const MonEquipe      = lazy(() => import('./pages/mon-equipe/MonEquipe'))
const Tasks          = lazy(() => import('./pages/tasks/Tasks'))
const ObjectivesPage = lazy(() => import('./pages/objectives/Objectives'))
const ProjectsPage   = lazy(() => import('./pages/projects/Projects'))
const IntelligenceRH = lazy(() => import('./pages/intelligence/IntelligenceRH'))
const EngagementHub  = lazy(() => import('./pages/engagement/EngagementHub'))
const Formation      = lazy(() => import('./pages/formation/Formation'))      // S57
const Compensation   = lazy(() => import('./pages/compensation/Compensation')) // S58
const Recrutement    = lazy(() => import('./pages/recrutement/Recrutement'))  // S59
const EntretiensAnnuels = lazy(() => import('./pages/entretiens/EntretiensAnnuels')) // S60

// ── Espace Collaborateur (S61-S62) — C-01 routes manquantes ──
const MaPerformance      = lazy(() => import('./pages/ma-performance/MaPerformance'))           // S61
const MonDeveloppement   = lazy(() => import('./pages/mon-developpement/MonDeveloppement'))     // S61
const MesReconnaissances = lazy(() => import('./pages/mes-reconnaissances/MesReconnaissances')) // S62
const MonTableauDeBord   = lazy(() => import('./pages/mon-tableau-de-bord/MonTableauDeBord'))   // S62

// ── Fallback Suspense ─────────────────────────────────────────
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

          {/* Principal */}
          <Route path="/dashboard"  element={<S><Dashboard /></S>} />
          <Route path="/mon-espace" element={<S><MonEspace /></S>} />
          <Route path="/mon-equipe" element={<S><MonEquipe /></S>} />

          {/* Espace Collaborateur — C-01 routes manquantes (S61-S62) */}
          <Route path="/ma-performance"      element={<S><MaPerformance /></S>} />      {/* S61 */}
          <Route path="/mon-developpement"   element={<S><MonDeveloppement /></S>} />   {/* S61 */}
          <Route path="/mes-reconnaissances" element={<S><MesReconnaissances /></S>} /> {/* S62 */}
          <Route path="/mon-tableau-de-bord" element={<S><MonTableauDeBord /></S>} />   {/* S62 */}

          {/* Travail */}
          <Route path="/travail/taches"    element={<S><Tasks /></S>} />
          <Route path="/travail/projets"   element={<S><ProjectsPage /></S>} />
          <Route path="/travail/objectifs" element={<S><ObjectivesPage /></S>} />

          {/* Mesure & Analyse */}
          <Route path="/intelligence" element={<S><IntelligenceRH /></S>} />
          <Route path="/engagement"   element={<S><EngagementHub /></S>} />
          <Route path="/formation"    element={<S><Formation /></S>} />        {/* S57 */}
          <Route path="/compensation" element={<S><Compensation /></S>} />   {/* S58 */}
          <Route path="/recrutement"  element={<S><Recrutement /></S>} />    {/* S59 */}
          <Route path="/entretiens"  element={<S><EntretiensAnnuels /></S>} />  {/* S60 */}

          {/* Administration */}
          <Route path="/admin/users"        element={<S><UsersPage /></S>} />
          <Route path="/admin/organisation" element={<S><Organisation /></S>} />
          <Route path="/admin/settings"     element={<S><SettingsPage /></S>} />
          <Route path="/admin/super-admin"  element={<S><SuperAdmin /></S>} />   {/* S52 */}
          <Route path="/admin/api-manager"  element={<S><ApiManager /></S>} />   {/* S53 */}

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