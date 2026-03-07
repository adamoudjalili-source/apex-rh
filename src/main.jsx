import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'

// ─── ErrorBoundary global (Étape 19) ─────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[APEX] Erreur non capturée:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0F0F1A', color:'rgba(255,255,255,0.7)', gap:'16px', fontFamily:'sans-serif' }}>
          <div style={{ fontSize:'32px' }}>⚠️</div>
          <p style={{ fontWeight:600, fontSize:'16px' }}>Une erreur inattendue s'est produite.</p>
          <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', maxWidth:'400px', textAlign:'center' }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </p>
          <button onClick={() => window.location.reload()}
            style={{ marginTop:'8px', padding:'8px 20px', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:'8px', color:'#818CF8', cursor:'pointer', fontSize:'13px' }}>
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)