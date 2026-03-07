import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'
import { isAdminRole, isManagerRole } from '../lib/roles'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const skipNextProfileFetchRef = useRef(false)

  useEffect(() => {
    const forgetSession = localStorage.getItem('apex_forget_session')
    const activeSession = sessionStorage.getItem('apex_active_session')
    if (forgetSession && !activeSession) {
      localStorage.removeItem('apex_forget_session')
      supabase.auth.signOut().then(() => setLoading(false))
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          // Skip re-fetch during password change to avoid race condition
          if (skipNextProfileFetchRef.current) {
            skipNextProfileFetchRef.current = false
            return
          }
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, is_active, division_id, service_id, direction_id, must_change_password')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Erreur profil:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          logAudit('login_failed', null, null, { email, reason: 'Invalid credentials' })
          return { data: null, error: { message: 'Email ou mot de passe incorrect.' } }
        }
        if (error.message?.includes('Email not confirmed')) {
          return { data: null, error: { message: 'Votre adresse email n\'a pas été confirmée.' } }
        }
        if (error.message?.includes('Too many requests')) {
          return { data: null, error: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' } }
        }
        logAudit('login_failed', null, null, { email, reason: error.message })
        return { data: null, error: { message: error.message || 'Erreur de connexion.' } }
      }

      if (data?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('is_active, must_change_password')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          return { data: null, error: { message: 'Erreur lors de la vérification du profil.' } }
        }

        if (!profileData?.is_active) {
          await supabase.auth.signOut()
          return {
            data: null,
            error: {
              message: 'Votre compte a été désactivé. Contactez votre administrateur.',
              code: 'ACCOUNT_DISABLED'
            }
          }
        }

        await logAudit('login', 'user', data.user.id, { email: data.user.email })
        return { data, error: null, mustChangePassword: profileData?.must_change_password }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: { message: 'Erreur réseau. Vérifiez votre connexion internet.' } }
    }
  }

  const signOut = async () => {
    await logAudit('logout')
    await supabase.auth.signOut()
    setProfile(null)
  }

  const resetPassword = async (email) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })
      if (error) {
        if (error.message?.includes('Too many requests')) {
          return { error: { message: 'Trop de demandes. Réessayez dans quelques minutes.' } }
        }
        return { error: { message: 'Erreur lors de l\'envoi de l\'email. Réessayez.' } }
      }
      logAudit('password_reset_requested', null, null, { email })
      return { error: null }
    } catch (err) {
      return { error: { message: 'Erreur réseau. Vérifiez votre connexion internet.' } }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      // Step 1: If first login, update must_change_password BEFORE changing auth password
      // This prevents the race condition with onAuthStateChange re-fetching the old value
      if (profile?.must_change_password) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ must_change_password: false })
          .eq('id', profile.id)

        if (dbError) {
          console.error('Erreur mise à jour must_change_password:', dbError)
          return { error: { message: 'Erreur lors de l\'activation du compte. Réessayez.' } }
        }

        // Update local state immediately
        setProfile(prev => ({ ...prev, must_change_password: false }))
      }

      // Step 2: Tell onAuthStateChange to skip the next profile re-fetch
      skipNextProfileFetchRef.current = true

      // Step 3: Now change the auth password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) {
        // Rollback the DB change if auth fails
        if (profile?.must_change_password) {
          await supabase
            .from('users')
            .update({ must_change_password: true })
            .eq('id', profile.id)
          setProfile(prev => ({ ...prev, must_change_password: true }))
        }
        skipNextProfileFetchRef.current = false

        if (error.message?.includes('same_password')) {
          return { error: { message: 'Le nouveau mot de passe doit être différent de l\'ancien.' } }
        }
        return { error: { message: error.message || 'Erreur lors du changement de mot de passe.' } }
      }

      await logAudit('password_changed', 'user', profile?.id)
      return { error: null }
    } catch (err) {
      skipNextProfileFetchRef.current = false
      return { error: { message: 'Erreur réseau. Vérifiez votre connexion internet.' } }
    }
  }

  const role = profile?.role || null

  const value = {
    user,
    profile,
    role,
    loading,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin: profile?.role === 'administrateur',
    isDirecteur: profile?.role === 'directeur',
    isChefDivision: profile?.role === 'chef_division',
    isChefService: profile?.role === 'chef_service',
    isCollaborateur: profile?.role === 'collaborateur',
    isAdminOrAbove: isAdminRole(profile?.role),
    isManagerOrAbove: isManagerRole(profile?.role),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}