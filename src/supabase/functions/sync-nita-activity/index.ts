// ============================================================
// APEX RH — supabase/functions/sync-nita-activity/index.ts
// Session 37 — Synchronisation API NITA (cron toutes les heures)
//
// Logique :
//   1. Récupère la liste des agents actifs (collaborateurs)
//   2. Pour chacun, appelle l'API NITA pour récupérer les stats du jour
//   3. Calcule les 3 scores opérationnels (résilience, fiabilité, endurance)
//   4. Upsert dans agent_activity_logs
//   5. Idempotent : si la ligne existe, mise à jour des scores recalculés
//
// Variables d'environnement requises dans Supabase Secrets :
//   NITA_API_URL      → URL de base de l'API NITA (ex: https://api.nita.ne/v1)
//   NITA_API_KEY      → Clé d'authentification API NITA
//   NITA_BENCH_TXN    → Benchmark transactions/jour (défaut: 150)
//   NITA_BENCH_TIME_S → Benchmark temps traitement secondes (défaut: 45)
//   NITA_BENCH_ERROR  → Benchmark taux erreur max (défaut: 0.02)
// ============================================================
import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ───────────────────────────────────────────────────

interface NitaAgentStats {
  agent_id:           string   // identifiant NITA (= user.nita_agent_id ou email)
  date:               string   // YYYY-MM-DD
  nb_transactions:    number
  avg_processing_s:   number
  error_count:        number
  total_transactions: number   // pour calculer error_rate
  amount_processed:   number
  is_peak_day:        boolean
  shift_hours:        number
  complexity_index:   number   // 0.5 – 2.0
}

interface ComputedScores {
  resilience_score:  number
  reliability_score: number
  endurance_score:   number
}

// ─── Calcul des 3 scores NITA ────────────────────────────────

function computeNitaScores(
  stats: NitaAgentStats,
  benchTxn:   number = 150,
  benchTimeS: number = 45,
  benchError: number = 0.02,
): ComputedScores {
  const errorRate = stats.total_transactions > 0
    ? stats.error_count / stats.total_transactions
    : 0

  // ── Résilience : performance pendant pics ─────────────────
  // Plus de transactions pendant un jour pic = meilleur score
  const peakBonus       = stats.is_peak_day ? 1.2 : 1.0
  const txnRatio        = stats.nb_transactions / Math.max(benchTxn, 1)
  const resilienceRaw   = Math.min(txnRatio * 100 * peakBonus, 100)
  const resilience_score = Math.max(Math.round(resilienceRaw), 0)

  // ── Fiabilité : taux erreur pondéré par complexité ────────
  // Moins de marge pour transactions complexes
  const weightedError    = errorRate * stats.complexity_index
  const maxAllowedError  = benchError * stats.complexity_index
  const errorPenalty     = Math.min((weightedError / Math.max(maxAllowedError, 0.001)) * 100, 100)
  const reliability_score = Math.max(Math.round(100 - errorPenalty), 0)

  // ── Endurance : maintien qualité sur shifts longs ─────────
  // Ratio temps de traitement (moins = mieux)
  const timeRatio      = benchTimeS / Math.max(stats.avg_processing_s, 1)
  const fatigueFactor  = stats.shift_hours > 9 ? 0.92 : 1.0
  const enduranceRaw   = Math.min(timeRatio * 100 * fatigueFactor, 100)
  const endurance_score = Math.max(Math.round(enduranceRaw), 0)

  return { resilience_score, reliability_score, endurance_score }
}

// ─── Appel API NITA (simulé si pas de vraie API) ──────────────

async function fetchNitaStats(
  agentEmail: string,
  date:        string,
  apiUrl:      string,
  apiKey:      string,
): Promise<NitaAgentStats | null> {
  try {
    // Si l'API NITA n'est pas encore disponible, retourner null
    // (les données seront saisies manuellement ou via import CSV)
    if (!apiUrl || apiUrl === 'PENDING') return null

    const url = `${apiUrl}/agents/${encodeURIComponent(agentEmail)}/stats?date=${date}`
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'X-Client':      'apex-rh-v37',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!resp.ok) {
      console.warn(`NITA API ${resp.status} for ${agentEmail} on ${date}`)
      return null
    }

    const json = await resp.json()

    // Mapping réponse API NITA → interface NitaAgentStats
    // Adapter selon la structure réelle de l'API NITA
    return {
      agent_id:           agentEmail,
      date,
      nb_transactions:    json.transactions_count     ?? 0,
      avg_processing_s:   json.avg_processing_time    ?? 45,
      error_count:        json.error_count            ?? 0,
      total_transactions: json.transactions_count     ?? 0,
      amount_processed:   json.total_amount_fcfa      ?? 0,
      is_peak_day:        json.is_peak_day            ?? false,
      shift_hours:        json.shift_duration_hours   ?? 8,
      complexity_index:   json.complexity_index       ?? 1.0,
    }
  } catch (err) {
    console.error(`NITA API error for ${agentEmail}:`, err)
    return null
  }
}

// ─── Handler principal ────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const nitaApiUrl  = Deno.env.get('NITA_API_URL')  || 'PENDING'
  const nitaApiKey  = Deno.env.get('NITA_API_KEY')  || ''
  const benchTxn    = parseInt(Deno.env.get('NITA_BENCH_TXN')    || '150')
  const benchTimeS  = parseFloat(Deno.env.get('NITA_BENCH_TIME_S') || '45')
  const benchError  = parseFloat(Deno.env.get('NITA_BENCH_ERROR') || '0.02')

  // Date cible (aujourd'hui par défaut, ou passée en body)
  let targetDate = new Date().toISOString().split('T')[0]
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.date) targetDate = body.date
  } catch { /* ignore */ }

  const day = new Date(targetDate).getDay()
  if (day === 0 || day === 6) {
    return new Response(JSON.stringify({ skipped: true, reason: 'weekend', date: targetDate }),
      { headers: { 'Content-Type': 'application/json' } })
  }

  // 1. Récupérer les agents actifs (collaborateurs)
  const { data: agents, error: agentsErr } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('is_active', true)
    .eq('role', 'collaborateur')

  if (agentsErr) {
    console.error('Error fetching agents:', agentsErr)
    return new Response(JSON.stringify({ error: agentsErr.message }), { status: 500 })
  }

  if (!agents?.length) {
    return new Response(JSON.stringify({ synced: 0, message: 'No active agents found' }),
      { headers: { 'Content-Type': 'application/json' } })
  }

  const results = { synced: 0, skipped: 0, errors: 0, agents_processed: agents.length }

  // 2. Pour chaque agent : fetch NITA + upsert
  for (const agent of agents) {
    try {
      const nitaStats = await fetchNitaStats(agent.email, targetDate, nitaApiUrl, nitaApiKey)

      if (!nitaStats) {
        // API NITA pas encore disponible — on skip silencieusement
        results.skipped++
        continue
      }

      const scores = computeNitaScores(nitaStats, benchTxn, benchTimeS, benchError)
      const errorRate = nitaStats.total_transactions > 0
        ? nitaStats.error_count / nitaStats.total_transactions
        : 0

      const { error: upsertErr } = await supabase
        .from('agent_activity_logs')
        .upsert({
          user_id:               agent.id,
          date:                  targetDate,
          nb_transactions:       nitaStats.nb_transactions,
          avg_processing_time_s: nitaStats.avg_processing_s,
          error_rate:            errorRate,
          amount_processed:      nitaStats.amount_processed,
          is_peak_day:           nitaStats.is_peak_day,
          shift_duration_hours:  nitaStats.shift_hours,
          transaction_complexity: nitaStats.complexity_index,
          resilience_score:      scores.resilience_score,
          reliability_score:     scores.reliability_score,
          endurance_score:       scores.endurance_score,
          synced_at:             new Date().toISOString(),
          source:                'api_nita',
        }, { onConflict: 'user_id,date' })

      if (upsertErr) {
        console.error(`Upsert error for ${agent.email}:`, upsertErr)
        results.errors++
      } else {
        results.synced++
      }
    } catch (err) {
      console.error(`Error processing agent ${agent.email}:`, err)
      results.errors++
    }
  }

  console.log(`sync-nita-activity [${targetDate}]:`, results)

  return new Response(JSON.stringify({ ...results, date: targetDate }),
    { headers: { 'Content-Type': 'application/json' } })
})
