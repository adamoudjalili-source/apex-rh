import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import logoNita from '../../assets/logo-nita.png'

const PASSWORD_RULES = [
  { id: 'length', label: 'Au moins 8 caractères', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
]

const ForceChangePassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { updatePassword, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const allRulesPass = PASSWORD_RULES.every(rule => rule.test(password))
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!allRulesPass) {
      setError('Le mot de passe ne respecte pas tous les critères.')
      return
    }

    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      {/* Fond animé */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <img src={logoNita} alt="NITA" className="h-16 object-contain" />
        </div>

        <div className="card border border-white/10 shadow-2xl">
          {!success ? (
            <>
              {/* Bannière première connexion */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound size={16} className="text-amber-400" />
                  <span className="text-amber-400 text-sm font-semibold">Première connexion</span>
                </div>
                <p className="text-amber-400/70 text-xs">
                  Bienvenue{profile?.first_name ? ` ${profile.first_name}` : ''} ! Pour la sécurité de votre compte,
                  veuillez choisir un mot de passe personnel.
                </p>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">Créer votre mot de passe</h2>
              <p className="text-white/50 text-sm mb-6">
                Ce mot de passe remplacera le mot de passe temporaire fourni par votre administrateur.
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4"
                >
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nouveau mot de passe */}
                <div>
                  <label className="text-white/70 text-sm font-medium mb-1 block">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className="input w-full pr-10"
                      required
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Critères */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5"
                  >
                    {PASSWORD_RULES.map(rule => (
                      <div key={rule.id} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                          rule.test(password)
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/5 text-white/20'
                        }`}>
                          {rule.test(password) ? (
                            <CheckCircle size={10} />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          )}
                        </div>
                        <span className={`text-xs transition-colors ${
                          rule.test(password) ? 'text-green-400/80' : 'text-white/40'
                        }`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Confirmation */}
                <div>
                  <label className="text-white/70 text-sm font-medium mb-1 block">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className={`input w-full pr-10 ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-red-500/50 focus:border-red-500'
                          : ''
                      }`}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-red-400/80 text-xs mt-1">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !allRulesPass || !passwordsMatch}
                  className="btn-primary w-full justify-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Activer mon compte
                    </>
                  )}
                </button>
              </form>

              {/* Lien déconnexion */}
              <div className="mt-4 text-center">
                <button
                  onClick={handleLogout}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Se déconnecter
                </button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/10 rounded-full mb-4">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Compte activé</h2>
              <p className="text-white/50 text-sm mb-4">
                Votre mot de passe a été défini. Bienvenue sur APEX RH !
              </p>
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </motion.div>
          )}
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          © 2026 APEX RH — Tous droits réservés
        </p>
      </motion.div>
    </div>
  )
}

export default ForceChangePassword
