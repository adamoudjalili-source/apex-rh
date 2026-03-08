// ============================================================
// APEX RH — Tests de charge (Load Testing)
// ✅ Session 12 — Scénarios réalistes pour 100-500 utilisateurs
//
// USAGE :
//   node src/tests/load-test.js
//
// PRÉ-REQUIS :
//   npm install @supabase/supabase-js
//   Configurer les variables SUPABASE_URL et SUPABASE_ANON_KEY ci-dessous
// ============================================================

const { createClient } = require('@supabase/supabase-js')

// ─── CONFIGURATION ───────────────────────────────────────────
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://VOTRE_PROJET.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'VOTRE_ANON_KEY',
  // Utilisateur de test (doit exister dans la base)
  TEST_EMAIL: process.env.TEST_EMAIL || 'admin@apex-rh.com',
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'test123456',
  // Paramètres de charge
  CONCURRENT_USERS: 50,       // Nb d'utilisateurs simulés en parallèle
  REQUESTS_PER_USER: 10,      // Nb de requêtes par utilisateur
  RAMP_UP_MS: 5000,           // Temps de montée en charge (ms)
  THINK_TIME_MS: 500,         // Pause entre les requêtes (ms)
}

// ─── MÉTRIQUES ───────────────────────────────────────────────
class Metrics {
  constructor() {
    this.results = []
    this.errors = []
    this.startTime = null
  }

  start() { this.startTime = Date.now() }

  record(scenario, duration, success, error = null) {
    this.results.push({ scenario, duration, success, timestamp: Date.now() })
    if (!success && error) this.errors.push({ scenario, error: error.message || error })
  }

  report() {
    const totalTime = (Date.now() - this.startTime) / 1000
    const scenarios = [...new Set(this.results.map(r => r.scenario))]

    console.log('\n╔══════════════════════════════════════════════════════════════╗')
    console.log('║          APEX RH — RAPPORT DE TESTS DE CHARGE              ║')
    console.log('╚══════════════════════════════════════════════════════════════╝\n')

    console.log(`⏱  Durée totale : ${totalTime.toFixed(1)}s`)
    console.log(`📊 Requêtes totales : ${this.results.length}`)
    console.log(`✅ Succès : ${this.results.filter(r => r.success).length}`)
    console.log(`❌ Échecs : ${this.results.filter(r => !r.success).length}`)
    console.log(`🔄 Débit : ${(this.results.length / totalTime).toFixed(1)} req/s\n`)

    console.log('┌─────────────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐')
    console.log('│ Scénario                    │ Total   │ Succès  │ Moy(ms) │ P95(ms) │ Max(ms) │')
    console.log('├─────────────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤')

    scenarios.forEach(scenario => {
      const items = this.results.filter(r => r.scenario === scenario)
      const successes = items.filter(r => r.success)
      const durations = items.map(r => r.duration).sort((a, b) => a - b)
      const avg = durations.reduce((s, d) => s + d, 0) / durations.length
      const p95 = durations[Math.floor(durations.length * 0.95)] || 0
      const max = durations[durations.length - 1] || 0

      const name = scenario.padEnd(27)
      const total = String(items.length).padStart(5)
      const ok = String(successes.length).padStart(5)
      const avgStr = String(Math.round(avg)).padStart(5)
      const p95Str = String(Math.round(p95)).padStart(5)
      const maxStr = String(Math.round(max)).padStart(5)

      console.log(`│ ${name} │ ${total}   │ ${ok}   │ ${avgStr}   │ ${p95Str}   │ ${maxStr}   │`)
    })

    console.log('└─────────────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘')

    // SLA Check
    console.log('\n📋 Vérification SLA :')
    const allDurations = this.results.map(r => r.duration).sort((a, b) => a - b)
    const globalAvg = allDurations.reduce((s, d) => s + d, 0) / allDurations.length
    const globalP95 = allDurations[Math.floor(allDurations.length * 0.95)] || 0
    const errorRate = (this.results.filter(r => !r.success).length / this.results.length * 100)

    const checks = [
      { name: 'Temps moyen < 500ms', pass: globalAvg < 500, value: `${Math.round(globalAvg)}ms` },
      { name: 'P95 < 2000ms', pass: globalP95 < 2000, value: `${Math.round(globalP95)}ms` },
      { name: 'Taux erreur < 5%', pass: errorRate < 5, value: `${errorRate.toFixed(1)}%` },
      { name: 'Débit > 10 req/s', pass: (this.results.length / totalTime) > 10, value: `${(this.results.length / totalTime).toFixed(1)} req/s` },
    ]

    checks.forEach(c => {
      console.log(`   ${c.pass ? '✅' : '❌'} ${c.name} → ${c.value}`)
    })

    if (this.errors.length > 0) {
      console.log(`\n⚠️  Erreurs (${this.errors.length}) :`)
      const errorGroups = {}
      this.errors.forEach(e => {
        const key = `${e.scenario}: ${e.error}`
        errorGroups[key] = (errorGroups[key] || 0) + 1
      })
      Object.entries(errorGroups).slice(0, 10).forEach(([key, count]) => {
        console.log(`   [${count}x] ${key}`)
      })
    }

    console.log('\n════════════════════════════════════════════════════════════════\n')
  }
}

// ─── SCÉNARIOS DE TEST ───────────────────────────────────────
async function scenarioListTasks(supabase, metrics) {
  const start = Date.now()
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(50)

    metrics.record('Lister tâches', Date.now() - start, !error, error)
  } catch (e) {
    metrics.record('Lister tâches', Date.now() - start, false, e)
  }
}

async function scenarioListObjectives(supabase, metrics) {
  const start = Date.now()
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select(`
        id, title, level, status, progress_score,
        key_results (id, title, score, current_value, target_value)
      `)
      .order('updated_at', { ascending: false })
      .limit(30)

    metrics.record('Lister objectifs + KR', Date.now() - start, !error, error)
  } catch (e) {
    metrics.record('Lister objectifs + KR', Date.now() - start, false, e)
  }
}

async function scenarioListProjects(supabase, metrics) {
  const start = Date.now()
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, status, priority, progress, budget, budget_spent,
        milestones (id, title, status),
        project_members (user_id)
      `)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(20)

    metrics.record('Lister projets + relations', Date.now() - start, !error, error)
  } catch (e) {
    metrics.record('Lister projets + relations', Date.now() - start, false, e)
  }
}

async function scenarioDashboardStats(supabase, metrics) {
  const start = Date.now()
  try {
    // Simuler le chargement du dashboard (requêtes parallèles)
    const [tasks, objectives, projects] = await Promise.all([
      supabase.from('tasks').select('id, status, priority', { count: 'exact', head: false }).eq('is_archived', false),
      supabase.from('objectives').select('id, progress_score, level', { count: 'exact', head: false }).eq('status', 'actif'),
      supabase.from('projects').select('id, progress, status', { count: 'exact', head: false }).eq('is_archived', false),
    ])

    const hasError = tasks.error || objectives.error || projects.error
    metrics.record('Dashboard (3 req.)', Date.now() - start, !hasError, hasError)
  } catch (e) {
    metrics.record('Dashboard (3 req.)', Date.now() - start, false, e)
  }
}

async function scenarioGlobalSearch(supabase, metrics) {
  const terms = ['rapport', 'budget', 'projet', 'eval', 'tâche', 'objectif', 'livrable', 'jalon']
  const term = terms[Math.floor(Math.random() * terms.length)]
  const start = Date.now()
  try {
    const [tasks, objectives, projects] = await Promise.all([
      supabase.from('tasks').select('id, title').ilike('title', `%${term}%`).limit(5),
      supabase.from('objectives').select('id, title').ilike('title', `%${term}%`).limit(5),
      supabase.from('projects').select('id, name').ilike('name', `%${term}%`).limit(5),
    ])

    const hasError = tasks.error || objectives.error || projects.error
    metrics.record('Recherche globale', Date.now() - start, !hasError, hasError)
  } catch (e) {
    metrics.record('Recherche globale', Date.now() - start, false, e)
  }
}

async function scenarioNotifications(supabase, metrics) {
  const start = Date.now()
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    metrics.record('Lister notifications', Date.now() - start, !error, error)
  } catch (e) {
    metrics.record('Lister notifications', Date.now() - start, false, e)
  }
}

async function scenarioCreateTask(supabase, metrics) {
  const start = Date.now()
  try {
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: `[LOAD-TEST] Tâche ${Date.now()}`,
        status: 'a_faire',
        priority: 'normale',
        created_by: user.user.id,
      })
      .select()
      .single()

    if (!error && data) {
      // Nettoyer immédiatement
      await supabase.from('tasks').delete().eq('id', data.id)
    }

    metrics.record('Créer + suppr tâche', Date.now() - start, !error, error)
  } catch (e) {
    metrics.record('Créer + suppr tâche', Date.now() - start, false, e)
  }
}

// ─── EXÉCUTION ───────────────────────────────────────────────
const SCENARIOS = [
  scenarioListTasks,
  scenarioListObjectives,
  scenarioListProjects,
  scenarioDashboardStats,
  scenarioGlobalSearch,
  scenarioNotifications,
  scenarioCreateTask,
]

async function simulateUser(supabase, metrics, userId) {
  for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
    await scenario(supabase, metrics)
    // Pause entre les requêtes (simule le temps de réflexion)
    await new Promise(r => setTimeout(r, CONFIG.THINK_TIME_MS * (0.5 + Math.random())))
  }
}

async function runLoadTest() {
  console.log('\n🚀 APEX RH — Démarrage des tests de charge...\n')
  console.log(`   Utilisateurs simulés : ${CONFIG.CONCURRENT_USERS}`)
  console.log(`   Requêtes par utilisateur : ${CONFIG.REQUESTS_PER_USER}`)
  console.log(`   Requêtes totales estimées : ${CONFIG.CONCURRENT_USERS * CONFIG.REQUESTS_PER_USER}`)
  console.log(`   Montée en charge : ${CONFIG.RAMP_UP_MS}ms`)
  console.log(`   Temps de réflexion : ${CONFIG.THINK_TIME_MS}ms\n`)

  // Authentification unique
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: CONFIG.TEST_EMAIL,
    password: CONFIG.TEST_PASSWORD,
  })

  if (authError) {
    console.error('❌ Erreur d\'authentification:', authError.message)
    console.error('   Vérifiez TEST_EMAIL et TEST_PASSWORD dans la configuration.')
    process.exit(1)
  }

  console.log(`✅ Authentifié en tant que ${CONFIG.TEST_EMAIL}\n`)
  console.log('⏳ Test en cours...\n')

  const metrics = new Metrics()
  metrics.start()

  // Lancer les utilisateurs simulés avec montée progressive
  const rampDelay = CONFIG.RAMP_UP_MS / CONFIG.CONCURRENT_USERS
  const userPromises = []

  for (let i = 0; i < CONFIG.CONCURRENT_USERS; i++) {
    // Créer un client avec le même token (simule des sessions authentifiées)
    const userClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      },
    })

    userPromises.push(
      new Promise(resolve => {
        setTimeout(async () => {
          await simulateUser(userClient, metrics, i)
          resolve()
        }, rampDelay * i)
      })
    )
  }

  await Promise.all(userPromises)
  metrics.report()

  // Nettoyage des tâches de test qui auraient pu rester
  const { data: testTasks } = await supabase
    .from('tasks')
    .select('id')
    .like('title', '[LOAD-TEST]%')

  if (testTasks && testTasks.length > 0) {
    await supabase
      .from('tasks')
      .delete()
      .like('title', '[LOAD-TEST]%')
    console.log(`🧹 Nettoyage : ${testTasks.length} tâche(s) de test supprimée(s)`)
  }
}

runLoadTest().catch(console.error)
