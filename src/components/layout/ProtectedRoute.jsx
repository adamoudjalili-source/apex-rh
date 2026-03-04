import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, profile, loading, signOut } = useAuth()
  const location = useLocation()

  // Pendant le chargement, on ne redirige pas encore
  if (loading) return null

  // Si pas connecté → redirection vers login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Si profil chargé mais compte désactivé → déconnexion forcée
  if (profile && !profile.is_active) {
    signOut()
    return <Navigate to="/login" replace />
  }

  // Si première connexion et pas déjà sur la page de changement → redirection
  if (profile?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  // Connecté et actif → afficher la page demandée
  return <Outlet />
}
