// ============================================================
// APEX RH — src/hooks/useGenerativeAI.js
// Session 43 — IA Générative + Coach Prédictif
// Interactions Claude claude-sonnet-4-20250514 via Edge Functions Supabase
// ⚠️ NE PAS modifier useTasks.js, usePulse.js, useIPR.js
// ============================================================
import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CRITICALITY, ROLES } from '../utils/constants'

// ─── CONSTANTES ──────────────────────────────────────────────

export const AI_CONTEXT_TYPES = {
  DEVELOPPEMENT : 'developpement',
  MANAGER       : 'manager',
  COACH         : 'coach',
  PDI           : 'pdi',
}

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Appel générique à l'Edge Function generate-ai-response
 * @param {string} contextType
 * @param {Array}  messages  — [{ role:'user'|'assistant', content:string }]
 * @param {object} contextData — données métier à injecter dans le prompt système
 * @returns {string} réponse Claude
 */
async function callAIResponse({ contextType, messages, contextData = {} }) {
  const { data, error } = await supabase.functions.invoke('generate-ai-response', {
    body: { context_type: contextType, messages, context_data: contextData },
  })
  if (error) throw new Error(error.message ?? 'Erreur Edge Function generate-ai-response')
  if (!data?.reply) throw new Error(data?.error ?? 'Réponse vide de l\'IA')
  return data.reply
}

// ─── HOOK CHAT CONTEXTUEL ────────────────────────────────────

/**
 * Chat IA contextuel — gère l'historique en mémoire (session courante)
 * et persiste dans Supabase pour retrouver l'historique au prochain chargement.
 *
 * @param {string} contextKey  — ex: 'developpement', 'equipe:uuid', 'coach'
 * @param {string} contextType — AI_CONTEXT_TYPES
 * @param {object} contextData — données métier injectées dans le system prompt
 */
export function useAIChat({ contextKey, contextType, contextData = {} }) {
  const { profile }       = useAuth()
  const [messages, setMessages]   = useState([])      // { role, content, id, ts }
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState(null)
  const loadedRef = useRef(false)

  // Charger l'historique depuis Supabase au premier montage
  const loadHistory = useCallback(async () => {
    if (!profile?.id || !contextKey || loadedRef.current) return
    loadedRef.current = true
    try {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', profile.id)
        .eq('context_key', contextKey)
        .order('created_at', { ascending: true })
        .limit(40)
      if (data?.length) {
        setMessages(data.map(m => ({
          id:      m.id,
          role:    m.role,
          content: m.content,
          ts:      m.created_at,
        })))
      }
    } catch (_) { /* silencieux */ }
  }, [profile?.id, contextKey])

  // Envoyer un message et obtenir la réponse IA
  const sendMessage = useCallback(async (userContent) => {
    if (!userContent?.trim() || isLoading) return
    setError(null)

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: userContent.trim(), ts: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Historique en format API (sans les ids internes)
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const reply = await callAIResponse({ contextType, messages: apiMessages, contextData })

      const aiMsg = { id: `a_${Date.now()}`, role: 'assistant', content: reply, ts: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])

      // Persistance en background
      if (profile?.id) {
        supabase.from('ai_chat_messages').insert([
          { user_id: profile.id, context_key: contextKey, role: 'user',      content: userContent.trim() },
          { user_id: profile.id, context_key: contextKey, role: 'assistant', content: reply },
        ]).then(() => {}) // fire & forget
      }
    } catch (err) {
      setError(err.message ?? 'Erreur lors de la génération de la réponse.')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, contextType, contextData, contextKey, profile?.id])

  const clearHistory = useCallback(() => {
    setMessages([])
    loadedRef.current = false
    if (profile?.id && contextKey) {
      supabase.from('ai_chat_messages')
        .delete()
        .eq('user_id', profile.id)
        .eq('context_key', contextKey)
        .then(() => {})
    }
  }, [profile?.id, contextKey])

  return { messages, isLoading, error, sendMessage, clearHistory, loadHistory }
}

// ─── GÉNÉRATION PDI ──────────────────────────────────────────

/**
 * Génère des suggestions PDI basées sur reviews + F360 du collaborateur
 */
export function useGeneratePDISuggestions() {
  const { profile } = useAuth()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId } = {}) => {
      const targetId = userId ?? profile?.id
      if (!targetId) throw new Error('user_id requis')

      const { data, error } = await supabase.functions.invoke('generate-pdi-suggestions', {
        body: { user_id: targetId },
      })
      if (error) throw new Error(error.message ?? 'Erreur génération PDI IA')
      if (!data?.suggestions) throw new Error('Aucune suggestion retournée')
      return data.suggestions // Array<{ competency_key, suggested_action, rationale, priority }>
    },
    onSuccess: (_, vars) => {
      const id = vars?.userId ?? profile?.id
      queryClient.invalidateQueries({ queryKey: ['ai-pdi-suggestions', id] })
    },
  })
}

/**
 * Lire les suggestions PDI existantes pour un utilisateur
 */
export function useMyPDISuggestions() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ai-pdi-suggestions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('ai_pdi_suggestions')
        .select('*')
        .eq('user_id', profile.id)
        .order('generated_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Accepter une suggestion PDI (convertit en action PDI)
 */
export function useAcceptPDISuggestion() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ suggestionId }) => {
      const { error } = await supabase
        .from('ai_pdi_suggestions')
        .update({ accepted: true })
        .eq('id', suggestionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-pdi-suggestions', profile?.id] })
    },
  })
}

// ─── ALERTES PRÉDICTIVES ─────────────────────────────────────

/**
 * Calcule les alertes RH prédictives pour une équipe (managers)
 * Basé sur les données PULSE + NITA + F360 disponibles en base
 */
export function usePredictiveAlerts(serviceId) {
  return useQuery({
    queryKey: ['predictive-alerts', serviceId],
    queryFn: async () => {
      if (!serviceId) return []

      // 1. Récupérer les membres du service
      const { data: members, error: mErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('service_id', serviceId)
        .eq('is_active', true)
        .neq('role', ROLES.ADMINISTRATEUR)
      if (mErr) throw mErr
      if (!members?.length) return []

      const memberIds = members.map(m => m.id)

      // 2. PULSE des 30 derniers jours
      const since30d = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const { data: pulseData } = await supabase
        .from('performance_scores')
        .select('user_id, score_total, score_date')
        .in('user_id', memberIds)
        .gte('score_date', since30d)
        .order('score_date', { ascending: false })

      // 3. Dernière activité (briefs)
      const { data: briefData } = await supabase
        .from('pulse_morning_plans')
        .select('user_id, plan_date')
        .in('user_id', memberIds)
        .order('plan_date', { ascending: false })

      // 4. Données NITA (activité réelle)
      const { data: nitaData } = await supabase
        .from('agent_activity_logs')
        .select('user_id, resilience_score, fiabilite_score, endurance_score, log_date')
        .in('user_id', memberIds)
        .gte('log_date', since30d)
        .order('log_date', { ascending: false })

      // ── Calcul des alertes ───────────────────────────────────
      const alerts = []
      const today  = new Date()

      for (const member of members) {
        if (member.role !== ROLES.COLLABORATEUR) continue

        // PULSE moyen
        const memberPulse = (pulseData ?? []).filter(p => p.user_id === member.id)
        const pulseAvg    = memberPulse.length
          ? Math.round(memberPulse.reduce((s, p) => s + (p.score_total ?? 0), 0) / memberPulse.length)
          : null

        // Dernière soumission brief
        const lastBrief = (briefData ?? []).find(b => b.user_id === member.id)
        const daysSinceBrief = lastBrief
          ? Math.floor((today - new Date(lastBrief.plan_date)) / 86400000)
          : null

        // NITA endurance (surcharge)
        const memberNita  = (nitaData ?? []).filter(n => n.user_id === member.id)
        const nitaLatest  = memberNita[0] ?? null
        const endurance   = nitaLatest?.endurance_score ?? null

        // ── Règles d'alerte ─────────────────────────────────────

        // Risque de désengagement : pas de brief depuis 5+ jours
        if (daysSinceBrief !== null && daysSinceBrief >= 5) {
          alerts.push({
            userId   : member.id,
            name     : `${member.first_name} ${member.last_name}`,
            type     : 'disengagement',
            severity : daysSinceBrief >= 10 ? 'high' : 'medium',
            message  : `Absent depuis ${daysSinceBrief} jours — aucun brief soumis`,
            icon     : '⚠️',
            color    : daysSinceBrief >= 10 ? '#EF4444' : '#F59E0B',
            data     : { daysSinceBrief },
          })
        }

        // Risque de surcharge : endurance NITA > 85 + PULSE en baisse
        if (endurance !== null && endurance >= 80) {
          const trend = memberPulse.length >= 2
            ? memberPulse[0].score_total - memberPulse[Math.min(memberPulse.length - 1, 4)].score_total
            : 0
          if (endurance >= 85 || (endurance >= 75 && trend < -10)) {
            alerts.push({
              userId   : member.id,
              name     : `${member.first_name} ${member.last_name}`,
              type     : 'overload',
              severity : endurance >= 90 ? CRITICALITY.CRITICAL : 'high',
              message  : `Charge de travail élevée — endurance NITA ${endurance}/100`,
              icon     : '🔥',
              color    : '#EF4444',
              data     : { endurance, pulseTrend: trend },
            })
          }
        }

        // Risque de départ : PULSE < 35 sur 3 semaines consécutives
        const recentPulse = memberPulse.slice(0, 15)
        if (recentPulse.length >= 10) {
          const lowCount = recentPulse.filter(p => p.score_total < 40).length
          if (lowCount >= 8) {
            alerts.push({
              userId   : member.id,
              name     : `${member.first_name} ${member.last_name}`,
              type     : 'departure_risk',
              severity : lowCount >= 12 ? CRITICALITY.CRITICAL : 'high',
              message  : `Performance chroniquement faible — ${lowCount} jours sous 40/100`,
              icon     : '🚨',
              color    : '#EF4444',
              data     : { pulseAvg, lowDays: lowCount },
            })
          }
        }

        // Haute performance : PULSE > 80 sur 10+ jours
        if (pulseAvg !== null && pulseAvg >= 78 && memberPulse.length >= 10) {
          const highCount = memberPulse.filter(p => p.score_total >= 75).length
          if (highCount >= 8) {
            alerts.push({
              userId   : member.id,
              name     : `${member.first_name} ${member.last_name}`,
              type     : 'high_performer',
              severity : 'low',
              message  : `Excellente performance soutenue — PULSE moyen ${pulseAvg}/100`,
              icon     : '⭐',
              color    : '#10B981',
              data     : { pulseAvg, highDays: highCount },
            })
          }
        }
      }

      // Trier : critiques d'abord, haute perf en dernier
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return alerts.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9))
    },
    enabled: !!serviceId,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000, // refresh toutes les 30min
  })
}

// ─── RÉSUMÉ FEEDBACKS IA ─────────────────────────────────────

/**
 * Génère un résumé IA des feedbacks reçus par un collaborateur
 */
export function useGenerateFeedbackSummary() {
  return useMutation({
    mutationFn: async ({ userId, feedbackData }) => {
      if (!userId) throw new Error('user_id requis')

      const messages = [{
        role: 'user',
        content: `Voici les données de feedback 360° reçues par ce collaborateur :\n\n${JSON.stringify(feedbackData, null, 2)}\n\nFais une synthèse claire et bienveillante en 3 points : forces identifiées, axes de progrès, recommandation principale. Sois concis (max 150 mots) et orienté action.`,
      }]

      return callAIResponse({ contextType: AI_CONTEXT_TYPES.COACH, messages, contextData: { userId } })
    },
  })
}

// ─── INSIGHT MANAGER ─────────────────────────────────────────

/**
 * Génère un insight IA détaillé sur un membre de l'équipe
 * pour aider le manager à préparer un entretien 1:1
 */
export function useGenerateManagerInsight() {
  return useMutation({
    mutationFn: async ({ memberData }) => {
      if (!memberData) throw new Error('memberData requis')

      const messages = [{
        role: 'user',
        content: `Analyse ce profil collaborateur et fournis des recommandations managériales :\n\n${JSON.stringify(memberData, null, 2)}\n\nFournis : 1) Diagnostic en 2 phrases 2) 3 points de discussion pour l'entretien 1:1 3) Une action concrète prioritaire. Sois direct et pratique.`,
      }]

      return callAIResponse({ contextType: AI_CONTEXT_TYPES.MANAGER, messages, contextData: memberData })
    },
  })
}
