import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, LogIn, AlertCircle, ShieldOff, WifiOff } from 'lucide-react'
import logoNita from '../../assets/logo-nita.png'

// ═══════════════════════════════════
// Styles inline pour les effets glass
// ═══════════════════════════════════
const s = {
  page: {
    background: '#E85217',
    position: 'relative',
  },
  bgMesh: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    background: [
      'radial-gradient(ellipse at 10% 20%, rgba(255,120,50,0.6) 0%, transparent 50%)',
      'radial-gradient(ellipse at 90% 15%, rgba(200,50,5,0.4) 0%, transparent 45%)',
      'radial-gradient(ellipse at 85% 85%, rgba(255,150,70,0.5) 0%, transparent 50%)',
      'radial-gradient(ellipse at 15% 90%, rgba(190,40,0,0.35) 0%, transparent 45%)',
    ].join(', '),
  },
  col: {
    background: 'linear-gradient(170deg, #1a2d6e 0%, #1e3a8a 30%, #2244a0 55%, #1e3a8a 75%, #162b65 100%)',
    borderLeft: '1px solid rgba(150,180,255,0.18)',
    borderRight: '1px solid rgba(150,180,255,0.18)',
    boxShadow: '-10px 0 50px rgba(0,0,0,.25), 10px 0 50px rgba(0,0,0,.25), 0 0 100px -10px rgba(0,0,0,.3)',
  },
  shineTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '1px', pointerEvents: 'none',
    background: 'linear-gradient(90deg, transparent 5%, rgba(180,200,255,0.3) 25%, rgba(210,225,255,0.5) 50%, rgba(180,200,255,0.3) 75%, transparent 95%)',
  },
  innerGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '300px', pointerEvents: 'none',
    background: 'linear-gradient(180deg, rgba(140,170,255,0.1) 0%, rgba(120,150,240,0.04) 40%, transparent 100%)',
  },
  diagonal: {
    position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', pointerEvents: 'none',
    background: 'linear-gradient(135deg, transparent 42%, rgba(180,200,255,0.05) 45%, rgba(210,225,255,0.08) 48%, rgba(180,200,255,0.05) 51%, transparent 54%)',
    animation: 'diagShift 8s ease-in-out infinite alternate',
  },
  geo: {
    position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
    backgroundImage: [
      'linear-gradient(30deg, rgba(255,255,255,0.5) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.5) 87.5%)',
      'linear-gradient(150deg, rgba(255,255,255,0.5) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.5) 87.5%)',
      'linear-gradient(30deg, rgba(255,255,255,0.5) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.5) 87.5%)',
      'linear-gradient(150deg, rgba(255,255,255,0.5) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.5) 87.5%)',
    ].join(', '),
    backgroundSize: '40px 70px',
    backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px',
  },
  glowBot: {
    position: 'absolute', bottom: '-60px', left: '50%', transform: 'translateX(-50%)',
    width: '300px', height: '180px', pointerEvents: 'none', filter: 'blur(35px)',
    background: 'radial-gradient(ellipse, rgba(100,130,255,0.15) 0%, transparent 70%)',
  },
  glowMid: {
    position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)',
    width: '250px', height: '250px', pointerEvents: 'none', filter: 'blur(40px)',
    background: 'radial-gradient(circle, rgba(100,140,255,0.08) 0%, transparent 70%)',
  },
  edgeL: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: '1px', pointerEvents: 'none',
    background: 'linear-gradient(180deg, transparent 5%, rgba(150,180,255,0.15) 20%, rgba(170,200,255,0.22) 50%, rgba(150,180,255,0.15) 80%, transparent 95%)',
  },
  edgeR: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px', pointerEvents: 'none',
    background: 'linear-gradient(180deg, transparent 5%, rgba(150,180,255,0.15) 20%, rgba(170,200,255,0.22) 50%, rgba(150,180,255,0.15) 80%, transparent 95%)',
  },
  logoBanner: {
    width: '100%', background: '#ffffff', padding: '16px 0',
    display: 'flex', justifyContent: 'center',
  },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.08)',
    color: '#fff', fontSize: '15px', fontFamily: 'inherit', outline: 'none', transition: 'all 0.3s',
  },
  inputFocus: {
    borderColor: 'rgba(165,180,255,0.5)',
    boxShadow: '0 0 20px -5px rgba(100,130,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
  },
  btn: {
    borderRadius: '10px', padding: '12px', border: 'none',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366f1 50%, #4F46E5 100%)',
    boxShadow: '0 6px 20px -4px rgba(79,70,229,0.4)',
  },
}

// Orbes orange
const orbs = [
  { top:'3%',left:'5%',w:280,h:280,c:'rgba(255,180,80,.5)',b:55,a:'orbF1',d:'20s' },
  { top:'5%',right:'6%',w:260,h:260,c:'rgba(200,40,0,.4)',b:45,a:'orbF2',d:'22s' },
  { bottom:'5%',right:'8%',w:320,h:320,c:'rgba(255,160,60,.45)',b:55,a:'orbF3',d:'25s' },
  { bottom:'8%',left:'4%',w:280,h:280,c:'rgba(190,35,0,.4)',b:50,a:'orbF4',d:'18s' },
  { top:'-5%',left:'35%',w:350,h:200,c:'rgba(255,200,100,.35)',b:55,a:'orbF5',d:'16s',e:true },
  { bottom:'-3%',left:'30%',w:380,h:200,c:'rgba(255,170,70,.35)',b:60,a:'orbF6',d:'19s',e:true },
  { top:'40%',left:'2%',w:200,h:200,c:'rgba(255,220,120,.3)',b:40,a:'orbF7',d:'14s' },
  { top:'45%',right:'3%',w:220,h:220,c:'rgba(180,30,0,.35)',b:45,a:'orbF8',d:'17s' },
]

// Panneaux glass
const gps = [
  { top:'8%',left:'3%',w:180,h:240,r:-8,a:'gpF1',d:'12s' },
  { top:'6%',right:'4%',w:160,h:200,r:10,a:'gpF2',d:'14s' },
  { bottom:'6%',right:'5%',w:200,h:180,r:6,a:'gpF3',d:'11s' },
  { bottom:'10%',left:'4%',w:170,h:210,r:-5,a:'gpF4',d:'15s' },
  { top:'45%',left:'2%',w:120,h:120,r:0,a:'gpF5',d:'10s',round:true },
  { top:'50%',right:'3%',w:140,h:140,r:0,a:'gpF6',d:'13s',round:true },
]

const kf = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap');
@keyframes orbF1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-40px) scale(1.1)}66%{transform:translate(-20px,25px) scale(.95)}}
@keyframes orbF2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,30px) scale(1.08)}66%{transform:translate(20px,-35px) scale(.92)}}
@keyframes orbF3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-30px,35px) scale(.9)}66%{transform:translate(35px,-25px) scale(1.12)}}
@keyframes orbF4{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(25px,-30px) scale(1.15)}66%{transform:translate(-15px,20px) scale(.9)}}
@keyframes orbF5{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,15px)}}
@keyframes orbF6{0%,100%{transform:translate(0,0)}50%{transform:translate(-15px,-10px)}}
@keyframes orbF7{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(10px,-18px) scale(1.1)}}
@keyframes orbF8{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-12px,15px) scale(1.08)}}
@keyframes gpF1{0%,100%{transform:rotate(-8deg) translate(0,0)}50%{transform:rotate(-6deg) translate(8px,-12px)}}
@keyframes gpF2{0%,100%{transform:rotate(10deg) translate(0,0)}50%{transform:rotate(12deg) translate(-10px,8px)}}
@keyframes gpF3{0%,100%{transform:rotate(6deg) translate(0,0)}50%{transform:rotate(8deg) translate(-8px,10px)}}
@keyframes gpF4{0%,100%{transform:rotate(-5deg) translate(0,0)}50%{transform:rotate(-3deg) translate(6px,-10px)}}
@keyframes gpF5{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
@keyframes gpF6{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes diagShift{0%{transform:translateX(-5%) translateY(-5%)}100%{transform:translateX(5%) translateY(5%)}}
`

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn(email, password)

    if (result.error) {
      setError({ message: result.error.message, code: result.error.code || 'AUTH_ERROR' })
      setLoading(false)
      return
    }

    if (!rememberMe) {
      localStorage.setItem('apex_forget_session', 'true')
      sessionStorage.setItem('apex_active_session', 'true')
    } else {
      localStorage.removeItem('apex_forget_session')
      sessionStorage.removeItem('apex_active_session')
    }

    if (result.mustChangePassword) {
      navigate('/change-password', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  const getErrorIcon = () => {
    if (!error) return null
    if (error.code === 'ACCOUNT_DISABLED') return <ShieldOff size={16} className="text-orange-400 shrink-0" />
    if (error.message?.includes('réseau')) return <WifiOff size={16} className="text-yellow-400 shrink-0" />
    return <AlertCircle size={16} className="text-red-400 shrink-0" />
  }

  const getErrorStyle = () => {
    if (!error) return ''
    if (error.code === 'ACCOUNT_DISABLED') return 'bg-orange-500/10 border-orange-500/30'
    if (error.message?.includes('réseau')) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  const getErrorTextColor = () => {
    if (!error) return ''
    if (error.code === 'ACCOUNT_DISABLED') return 'text-orange-400'
    if (error.message?.includes('réseau')) return 'text-yellow-400'
    return 'text-red-400'
  }

  const blurInput = (e) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.12)'
    e.target.style.boxShadow = 'none'
    e.target.style.background = 'rgba(255,255,255,0.08)'
  }
  const focusInput = (e) => Object.assign(e.target.style, s.inputFocus)

  return (
    <>
      <style>{kf}</style>

      <div className="min-h-screen flex justify-center overflow-x-hidden" style={s.page}>

        {/* Fond orange glassmorphisme */}
        <div style={s.bgMesh} />

        {orbs.map((o, i) => (
          <div key={i} style={{
            position:'fixed',borderRadius:'50%',pointerEvents:'none',
            top:o.top,bottom:o.bottom,left:o.left,right:o.right,
            width:o.w,height:o.h,
            background:`radial-gradient(${o.e?'ellipse':'circle'},${o.c} 0%,transparent 70%)`,
            filter:`blur(${o.b}px)`,animation:`${o.a} ${o.d} ease-in-out infinite`,
          }}/>
        ))}

        {gps.map((p, i) => (
          <div key={`g${i}`} style={{
            position:'fixed',pointerEvents:'none',
            borderRadius:p.round?'50%':'20px',
            backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.2)',
            background:'rgba(255,255,255,0.1)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.2)',
            top:p.top,bottom:p.bottom,left:p.left,right:p.right,
            width:p.w,height:p.h,
            transform:`rotate(${p.r}deg)`,animation:`${p.a} ${p.d} ease-in-out infinite`,
          }}/>
        ))}

        {/* Colonne connexion — verre bleu */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-[400px] min-h-screen flex flex-col z-10 overflow-hidden"
          style={s.col}
        >
          <div style={s.shineTop}/>
          <div style={s.innerGlow}/>
          <div style={s.diagonal}/>
          <div style={s.geo}/>
          <div style={s.glowBot}/>
          <div style={s.glowMid}/>
          <div style={s.edgeL}/>
          <div style={s.edgeR}/>

          <div className="flex-1 flex flex-col justify-center relative z-10">

            {/* Tagline au-dessus du logo */}
            <div style={{
              width: '100%',
              padding: '16px 20px 10px',
              textAlign: 'center',
            }}>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '16px',
                fontWeight: 600,
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '1.5px',
                lineHeight: 1,
                margin: 0,
              }}>
                Plateforme de Gestion de la Performance
              </p>
              <div style={{
                width: '60px',
                height: '2px',
                margin: '8px auto 0',
                background: 'linear-gradient(90deg, transparent, rgba(79,70,229,0.7), transparent)',
                borderRadius: '2px',
              }} />
            </div>

            {/* Logo — bandeau blanc */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              style={s.logoBanner}
            >
              <img src={logoNita} alt="NITA Transfert d'Argent" className="w-full h-auto px-4" />
            </motion.div>

            {/* Formulaire */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="px-5 pt-5 pb-8"
            >
              <h2 className="text-xl font-bold text-white mb-6">Connexion</h2>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-3 border rounded-lg px-4 py-3 mb-4 ${getErrorStyle()}`}
                >
                  <div className="mt-0.5">{getErrorIcon()}</div>
                  <div>
                    <p className={`text-sm font-medium ${getErrorTextColor()}`}>{error.message}</p>
                    {error.code === 'ACCOUNT_DISABLED' && (
                      <p className="text-orange-400/70 text-xs mt-1">
                        Si vous pensez qu'il s'agit d'une erreur, contactez le service RH.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm font-medium mb-1 block">Adresse email</label>
                  <input
                    type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    placeholder="exemple@nita.sn"
                    style={s.input} onFocus={focusInput} onBlur={blurInput}
                    required autoComplete="email" autoFocus
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm font-medium mb-1 block">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null) }}
                      placeholder="••••••••"
                      style={{ ...s.input, paddingRight: '46px' }}
                      onFocus={focusInput} onBlur={blurInput}
                      required autoComplete="current-password"
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                      <div className="w-4 h-4 rounded transition-colors duration-200 flex items-center justify-center"
                        style={{
                          border: rememberMe ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.2)',
                          background: rememberMe ? '#4F46E5' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {rememberMe && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-white/50 text-sm group-hover:text-white/70 transition-colors">Se souvenir de moi</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm transition-colors"
                    style={{ color: 'rgba(165,180,255,0.8)' }}
                    onMouseEnter={(e) => e.target.style.color = '#c7d2fe'}
                    onMouseLeave={(e) => e.target.style.color = 'rgba(165,180,255,0.8)'}
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full relative overflow-hidden flex items-center justify-center gap-2 mt-6 text-white font-semibold text-[15px] transition-all duration-300 disabled:opacity-60"
                  style={{ ...s.btn, cursor: loading ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={(e) => { if(!loading){ e.currentTarget.style.boxShadow='0 10px 30px -4px rgba(79,70,229,0.5)'; e.currentTarget.style.transform='translateY(-1px)' }}}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow='0 6px 20px -4px rgba(79,70,229,0.4)'; e.currentTarget.style.transform='translateY(0)' }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><LogIn size={16} /> Se connecter</>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default Login