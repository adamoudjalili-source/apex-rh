import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Send } from 'lucide-react'
import logoNita from '../../assets/logo-nita.png'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          {!sent ? (
            <>
              {/* État : formulaire */}
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Mot de passe oublié</h2>
                </div>
              </div>
              <p className="text-white/50 text-sm mb-6">
                Saisissez votre adresse email. Vous recevrez un lien pour réinitialiser votre mot de passe.
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
                <div>
                  <label className="text-white/70 text-sm font-medium mb-1 block">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="exemple@entreprise.com"
                    className="input w-full"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      Envoyer le lien
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* État : email envoyé */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/10 rounded-full mb-4">
                  <CheckCircle size={28} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Email envoyé</h2>
                <p className="text-white/50 text-sm mb-2">
                  Si un compte existe avec l'adresse <span className="text-white/80 font-medium">{email}</span>,
                  vous recevrez un email avec un lien de réinitialisation.
                </p>
                <p className="text-white/40 text-xs mb-6">
                  Vérifiez votre boîte de réception ainsi que vos spams. Le lien expire dans 1 heure.
                </p>

                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="text-sm text-primary/80 hover:text-primary transition-colors"
                >
                  Renvoyer à une autre adresse
                </button>
              </motion.div>
            </>
          )}

          {/* Retour à la connexion */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <ArrowLeft size={14} />
              Retour à la connexion
            </Link>
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          © 2026 APEX RH — Tous droits réservés
        </p>
      </motion.div>
    </div>
  )
}

export default ForgotPassword
