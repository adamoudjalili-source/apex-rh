// ============================================================
// APEX RH — src/components/ai/AIAssistant.jsx
// Session 43 — Composant chat IA contextuel réutilisable
// Utilisé dans MonDeveloppement + MonEquipe
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIChat, AI_CONTEXT_TYPES } from '../../hooks/useGenerativeAI'

// ─── CONSTANTES PAR CONTEXTE ─────────────────────────────────

const CONTEXT_CONFIG = {
  [AI_CONTEXT_TYPES.DEVELOPPEMENT]: {
    title     : 'Coach IA Développement',
    subtitle  : 'Basé sur vos feedbacks, reviews et PDI',
    icon      : '🎓',
    color     : '#10B981',
    gradient  : 'linear-gradient(135deg,rgba(16,185,129,0.15) 0%,rgba(5,150,105,0.08) 100%)',
    border    : 'rgba(16,185,129,0.2)',
    starters  : [
      'Quels sont mes principaux axes de développement ce trimestre ?',
      'Comment améliorer ma note en communication d\'après mes feedbacks ?',
      'Propose-moi 3 actions concrètes pour progresser en initiative.',
      'Comment transformer mes évaluations en objectifs OKR ?',
    ],
  },
  [AI_CONTEXT_TYPES.MANAGER]: {
    title     : 'Assistant IA Manager',
    subtitle  : 'Intelligence RH augmentée pour votre équipe',
    icon      : '🧠',
    color     : '#4F46E5',
    gradient  : 'linear-gradient(135deg,rgba(79,70,229,0.15) 0%,rgba(124,58,237,0.08) 100%)',
    border    : 'rgba(79,70,229,0.2)',
    starters  : [
      'Quel collaborateur nécessite le plus d\'attention cette semaine ?',
      'Comment préparer mon entretien 1:1 avec cet employé ?',
      'Quels indicateurs me semblent préoccupants dans mon équipe ?',
      'Comment redistribuer la charge de travail de façon équilibrée ?',
    ],
  },
  [AI_CONTEXT_TYPES.COACH]: {
    title     : 'IA Coach Personnel',
    subtitle  : 'Analyse de votre semaine PULSE',
    icon      : '🤖',
    color     : '#8B5CF6',
    gradient  : 'linear-gradient(135deg,rgba(139,92,246,0.15) 0%,rgba(109,40,217,0.08) 100%)',
    border    : 'rgba(139,92,246,0.2)',
    starters  : [
      'Comment était ma performance cette semaine ?',
      'Qu\'est-ce qui a impacté mon score PULSE négativement ?',
      'Quels blocages dois-je résoudre en priorité ?',
      'Comment améliorer ma régularité de soumission des journaux ?',
    ],
  },
}

// ─── COMPOSANTS INTERNES ─────────────────────────────────────

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(79,70,229,0.2)' }}>
          🤖
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'text-white rounded-tr-sm'
            : 'text-white/80 rounded-tl-sm'
        }`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg,#4F46E5,#7C3AED)'
            : 'rgba(255,255,255,0.05)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Format content: handle newlines */}
        {message.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < message.content.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
    </motion.div>
  )
}

function TypingIndicator({ color }) {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: 'rgba(79,70,229,0.2)' }}>
        🤖
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: color }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

/**
 * @param {string}  contextKey   — clé unique pour persister l'historique ('developpement', 'equipe:userId', etc.)
 * @param {string}  contextType  — AI_CONTEXT_TYPES.*
 * @param {object}  contextData  — données métier injectées dans le system prompt
 * @param {boolean} compact      — mode compact (fiche collaborateur)
 * @param {string}  placeholder  — placeholder du champ de saisie
 */
export default function AIAssistant({
  contextKey,
  contextType = AI_CONTEXT_TYPES.COACH,
  contextData = {},
  compact = false,
  placeholder = 'Posez votre question à l\'IA…',
}) {
  const config = CONTEXT_CONFIG[contextType] ?? CONTEXT_CONFIG[AI_CONTEXT_TYPES.COACH]
  const { messages, isLoading, error, sendMessage, clearHistory, loadHistory } = useAIChat({
    contextKey,
    contextType,
    contextData,
  })

  const [input, setInput] = useState('')
  const [showStarters, setShowStarters] = useState(true)
  const messagesEndRef = useRef(null)

  // Charger historique au montage
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Masquer starters si messages existants
  useEffect(() => {
    if (messages.length > 0) setShowStarters(false)
  }, [messages.length])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput('')
    setShowStarters(false)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStarter = (q) => {
    sendMessage(q)
    setShowStarters(false)
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: config.gradient,
        border: `1px solid ${config.border}`,
        height: compact ? 380 : 480,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: config.border }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{config.title}</p>
            {!compact && <p className="text-[10px] text-white/35">{config.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Claude
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory}
              className="text-[10px] text-white/20 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Messages zone */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* Starters */}
        <AnimatePresence>
          {showStarters && messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-2">
              <p className="text-[11px] text-white/25 text-center mb-3">
                Commencez par une question ou choisissez un sujet :
              </p>
              {config.starters.map((q, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleStarter(q)}
                  className="w-full text-left text-[12px] text-white/55 px-3.5 py-2.5 rounded-xl hover:text-white/80 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {q}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && <TypingIndicator color={config.color} />}

        {/* Erreur */}
        {error && (
          <div className="px-3 py-2 rounded-xl text-xs text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 flex-shrink-0 border-t"
        style={{ borderColor: config.border }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
            style={{ minHeight: 38, maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(135deg,${config.color},${config.color}cc)` }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-white/15 mt-1.5 text-center">
          IA propulsée par Claude (Anthropic) · Les réponses sont indicatives
        </p>
      </div>
    </div>
  )
}
