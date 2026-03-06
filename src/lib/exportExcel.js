// ============================================================
// APEX RH — exportExcel.js
// ✅ Session 12 — Export Excel des données
// ✅ Session 24 — exportPulseReport() + exportMonthlyAwards() (Phase F)
// Dépendance : npm install xlsx
// ============================================================
import * as XLSX from 'xlsx'

// ─── HELPER COMMUN ───────────────────────────────────────────
function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, `${filename}_${formatDateFile()}.xlsx`)
}

function formatDateFile() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function createSheet(data, headers) {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers.map(h => h.key) })
  // Renommer les en-têtes
  headers.forEach((h, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i })
    if (ws[cell]) ws[cell].v = h.label
  })
  // Largeurs de colonnes
  ws['!cols'] = headers.map(h => ({ wch: h.width || 18 }))
  return ws
}

// ─── EXPORT TÂCHES ───────────────────────────────────────────
const TASK_STATUS_LABELS = {
  backlog: 'Backlog', a_faire: 'À faire', en_cours: 'En cours',
  en_revue: 'En revue', terminee: 'Terminée', bloquee: 'Bloquée',
}
const TASK_PRIORITY_LABELS = {
  basse: 'Basse', normale: 'Normale', haute: 'Haute', urgente: 'Urgente',
}

export function exportTasks(tasks) {
  if (!tasks || tasks.length === 0) return

  const data = tasks.map(t => ({
    titre: t.title || '',
    statut: TASK_STATUS_LABELS[t.status] || t.status || '',
    priorite: TASK_PRIORITY_LABELS[t.priority] || t.priority || '',
    description: t.description || '',
    date_echeance: formatDate(t.due_date),
    assignes: (t.task_assignees || [])
      .map(a => {
        const u = a.users || a
        return `${u.first_name || ''} ${u.last_name || ''}`.trim()
      })
      .filter(Boolean)
      .join(', '),
    service: t.services?.name || '',
    division: t.divisions?.name || '',
    direction: t.directions?.name || '',
    createur: t.creator
      ? `${t.creator.first_name || ''} ${t.creator.last_name || ''}`.trim()
      : '',
    date_creation: formatDate(t.created_at),
    sous_taches: (t.task_checklists || []).reduce(
      (sum, cl) => sum + (cl.task_checklist_items?.length || 0), 0
    ),
    commentaires: t.task_comments?.length || 0,
  }))

  const headers = [
    { key: 'titre', label: 'Titre', width: 35 },
    { key: 'statut', label: 'Statut', width: 14 },
    { key: 'priorite', label: 'Priorité', width: 12 },
    { key: 'description', label: 'Description', width: 40 },
    { key: 'date_echeance', label: 'Échéance', width: 14 },
    { key: 'assignes', label: 'Assigné(s)', width: 28 },
    { key: 'service', label: 'Service', width: 20 },
    { key: 'division', label: 'Division', width: 20 },
    { key: 'direction', label: 'Direction', width: 20 },
    { key: 'createur', label: 'Créateur', width: 20 },
    { key: 'date_creation', label: 'Créé le', width: 14 },
    { key: 'sous_taches', label: 'Sous-tâches', width: 14 },
    { key: 'commentaires', label: 'Commentaires', width: 14 },
  ]

  const wb = XLSX.utils.book_new()
  const ws = createSheet(data, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Tâches')
  downloadWorkbook(wb, 'APEX_RH_Taches')
}

// ─── EXPORT OBJECTIFS OKR ────────────────────────────────────
const OBJ_LEVEL_LABELS = {
  strategique: 'Stratégique', division: 'Division',
  service: 'Service', individuel: 'Individuel',
}
const OBJ_STATUS_LABELS = {
  brouillon: 'Brouillon', actif: 'Actif', en_evaluation: 'En évaluation',
  valide: 'Validé', archive: 'Archivé',
}
const EVAL_STATUS_LABELS = {
  non_evalue: 'Non évalué', auto_evaluation: 'Auto-évaluation',
  validation_n1: 'Validation N+1', calibration_rh: 'Calibration RH',
  finalise: 'Finalisé',
}

export function exportObjectives(objectives) {
  if (!objectives || objectives.length === 0) return

  const wb = XLSX.utils.book_new()

  // ── Feuille 1 : Objectifs ──
  const objData = objectives.map(o => ({
    titre: o.title || '',
    niveau: OBJ_LEVEL_LABELS[o.level] || o.level || '',
    statut: OBJ_STATUS_LABELS[o.status] || o.status || '',
    score: o.progress_score != null ? `${(o.progress_score * 100).toFixed(0)}%` : '',
    evaluation: EVAL_STATUS_LABELS[o.evaluation_status] || o.evaluation_status || '',
    score_auto: o.self_score != null ? `${(o.self_score * 100).toFixed(0)}%` : '',
    score_manager: o.manager_score != null ? `${(o.manager_score * 100).toFixed(0)}%` : '',
    score_final: o.final_score != null ? `${(o.final_score * 100).toFixed(0)}%` : '',
    proprietaire: o.owner
      ? `${o.owner.first_name || ''} ${o.owner.last_name || ''}`.trim()
      : '',
    nb_kr: o.key_results?.length || 0,
    description: o.description || '',
  }))

  const objHeaders = [
    { key: 'titre', label: 'Titre', width: 35 },
    { key: 'niveau', label: 'Niveau', width: 14 },
    { key: 'statut', label: 'Statut', width: 16 },
    { key: 'score', label: 'Score', width: 10 },
    { key: 'evaluation', label: 'Évaluation', width: 18 },
    { key: 'score_auto', label: 'Score Auto', width: 12 },
    { key: 'score_manager', label: 'Score N+1', width: 12 },
    { key: 'score_final', label: 'Score Final', width: 12 },
    { key: 'proprietaire', label: 'Propriétaire', width: 22 },
    { key: 'nb_kr', label: 'Nb KR', width: 8 },
    { key: 'description', label: 'Description', width: 40 },
  ]

  const ws1 = createSheet(objData, objHeaders)
  XLSX.utils.book_append_sheet(wb, ws1, 'Objectifs')

  // ── Feuille 2 : Key Results ──
  const krData = []
  objectives.forEach(o => {
    (o.key_results || []).forEach(kr => {
      krData.push({
        objectif: o.title || '',
        titre_kr: kr.title || '',
        type: kr.kr_type || '',
        debut: kr.start_value ?? '',
        cible: kr.target_value ?? '',
        actuel: kr.current_value ?? '',
        score: kr.score != null ? `${(kr.score * 100).toFixed(0)}%` : '',
        poids: kr.weight ?? '',
        unite: kr.unit || '',
        statut: kr.status || '',
      })
    })
  })

  if (krData.length > 0) {
    const krHeaders = [
      { key: 'objectif', label: 'Objectif Parent', width: 30 },
      { key: 'titre_kr', label: 'Key Result', width: 30 },
      { key: 'type', label: 'Type', width: 12 },
      { key: 'debut', label: 'Départ', width: 10 },
      { key: 'cible', label: 'Cible', width: 10 },
      { key: 'actuel', label: 'Actuel', width: 10 },
      { key: 'score', label: 'Score', width: 10 },
      { key: 'poids', label: 'Poids', width: 8 },
      { key: 'unite', label: 'Unité', width: 10 },
      { key: 'statut', label: 'Statut', width: 14 },
    ]
    const ws2 = createSheet(krData, krHeaders)
    XLSX.utils.book_append_sheet(wb, ws2, 'Key Results')
  }

  downloadWorkbook(wb, 'APEX_RH_Objectifs_OKR')
}

// ─── EXPORT PROJETS ──────────────────────────────────────────
const PROJ_STATUS_LABELS = {
  planifie: 'Planifié', en_cours: 'En cours', en_pause: 'En pause',
  termine: 'Terminé', annule: 'Annulé',
}
const PROJ_PRIORITY_LABELS = {
  basse: 'Basse', moyenne: 'Moyenne', haute: 'Haute', critique: 'Critique',
}

export function exportProjects(projects) {
  if (!projects || projects.length === 0) return

  const wb = XLSX.utils.book_new()

  // ── Feuille 1 : Projets ──
  const projData = projects.map(p => ({
    nom: p.name || '',
    statut: PROJ_STATUS_LABELS[p.status] || p.status || '',
    priorite: PROJ_PRIORITY_LABELS[p.priority] || p.priority || '',
    progression: p.progress != null ? `${p.progress}%` : '',
    date_debut: formatDate(p.start_date),
    date_fin: formatDate(p.end_date),
    budget: p.budget || 0,
    budget_consomme: p.budget_spent || 0,
    proprietaire: p.owner
      ? `${p.owner.first_name || ''} ${p.owner.last_name || ''}`.trim()
      : '',
    nb_jalons: p.milestones?.length || 0,
    nb_livrables: p.deliverables?.length || 0,
    nb_risques: p.risks?.length || 0,
    nb_membres: p.project_members?.length || 0,
    description: p.description || '',
  }))

  const projHeaders = [
    { key: 'nom', label: 'Nom du projet', width: 30 },
    { key: 'statut', label: 'Statut', width: 14 },
    { key: 'priorite', label: 'Priorité', width: 12 },
    { key: 'progression', label: 'Progression', width: 12 },
    { key: 'date_debut', label: 'Début', width: 14 },
    { key: 'date_fin', label: 'Fin', width: 14 },
    { key: 'budget', label: 'Budget (FCFA)', width: 16 },
    { key: 'budget_consomme', label: 'Consommé (FCFA)', width: 16 },
    { key: 'proprietaire', label: 'Propriétaire', width: 22 },
    { key: 'nb_jalons', label: 'Jalons', width: 10 },
    { key: 'nb_livrables', label: 'Livrables', width: 10 },
    { key: 'nb_risques', label: 'Risques', width: 10 },
    { key: 'nb_membres', label: 'Membres', width: 10 },
    { key: 'description', label: 'Description', width: 40 },
  ]

  const ws1 = createSheet(projData, projHeaders)
  XLSX.utils.book_append_sheet(wb, ws1, 'Projets')

  // ── Feuille 2 : Jalons (tous projets) ──
  const milestoneData = []
  projects.forEach(p => {
    (p.milestones || []).forEach(m => {
      milestoneData.push({
        projet: p.name || '',
        jalon: m.title || '',
        echeance: formatDate(m.due_date),
        statut: m.status || '',
        atteint_le: formatDate(m.completed_at),
      })
    })
  })

  if (milestoneData.length > 0) {
    const msHeaders = [
      { key: 'projet', label: 'Projet', width: 28 },
      { key: 'jalon', label: 'Jalon', width: 30 },
      { key: 'echeance', label: 'Échéance', width: 14 },
      { key: 'statut', label: 'Statut', width: 14 },
      { key: 'atteint_le', label: 'Atteint le', width: 14 },
    ]
    const ws2 = createSheet(milestoneData, msHeaders)
    XLSX.utils.book_append_sheet(wb, ws2, 'Jalons')
  }

  downloadWorkbook(wb, 'APEX_RH_Projets')
}

// ─── EXPORT UTILISATEURS ─────────────────────────────────────
const USER_ROLE_LABELS = {
  administrateur: 'Administrateur', directeur: 'Directeur',
  chef_division: 'Chef de Division', chef_service: 'Chef de Service',
  collaborateur: 'Collaborateur',
}

export function exportUsers(users) {
  if (!users || users.length === 0) return

  const data = users.map(u => ({
    prenom: u.first_name || '',
    nom: u.last_name || '',
    email: u.email || '',
    role: USER_ROLE_LABELS[u.role] || u.role || '',
    statut: u.is_active ? 'Actif' : 'Inactif',
    direction: u.directions?.name || '',
    division: u.divisions?.name || '',
    service: u.services?.name || '',
    date_creation: formatDate(u.created_at),
  }))

  const headers = [
    { key: 'prenom', label: 'Prénom', width: 18 },
    { key: 'nom', label: 'Nom', width: 18 },
    { key: 'email', label: 'Email', width: 30 },
    { key: 'role', label: 'Rôle', width: 18 },
    { key: 'statut', label: 'Statut', width: 10 },
    { key: 'direction', label: 'Direction', width: 22 },
    { key: 'division', label: 'Division', width: 22 },
    { key: 'service', label: 'Service', width: 22 },
    { key: 'date_creation', label: 'Créé le', width: 14 },
  ]

  const wb = XLSX.utils.book_new()
  const ws = createSheet(data, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs')
  downloadWorkbook(wb, 'APEX_RH_Utilisateurs')
}

// ─── EXPORT PULSE RAPPORT (Session 24 — Phase F) ─────────────
/**
 * Exporte un rapport PULSE au format Excel.
 * @param {Array} scores — tableau de performance_scores avec user
 * @param {string} periodLabel — ex: "Janvier 2025" ou "Semaine 12"
 * @param {'daily'|'weekly'|'monthly'} reportType
 */
export function exportPulseReport(scores, periodLabel = '', reportType = 'daily') {
  if (!scores || scores.length === 0) return

  const wb = XLSX.utils.book_new()

  // ── Feuille 1 : Classement ──
  const leaderboard = buildPulseLeaderboard(scores)
  const rankData = leaderboard.map((u, i) => ({
    rang:        i + 1,
    prenom:      u.firstName,
    nom:         u.lastName,
    service:     u.service || '',
    score_total: Math.round(u.avgTotal),
    delivery:    Math.round(u.avgDelivery),
    quality:     Math.round(u.avgQuality),
    regularity:  Math.round(u.avgRegularity),
    bonus:       Math.round(u.avgBonus),
    jours:       u.daysCount,
  }))

  const rankHeaders = [
    { key: 'rang',        label: 'Rang',      width: 8  },
    { key: 'prenom',      label: 'Prénom',    width: 16 },
    { key: 'nom',         label: 'Nom',       width: 16 },
    { key: 'service',     label: 'Service',   width: 20 },
    { key: 'score_total', label: 'Score',     width: 10 },
    { key: 'delivery',    label: 'Delivery',  width: 12 },
    { key: 'quality',     label: 'Quality',   width: 12 },
    { key: 'regularity',  label: 'Régularité',width: 14 },
    { key: 'bonus',       label: 'Bonus OKR', width: 12 },
    { key: 'jours',       label: 'Jours',     width: 8  },
  ]
  const ws1 = createSheet(rankData, rankHeaders)
  XLSX.utils.book_append_sheet(wb, ws1, 'Classement')

  // ── Feuille 2 : Détail journalier (si disponible) ──
  const dailyData = scores.map(s => ({
    date:        s.score_date || '',
    prenom:      s.user?.first_name || '',
    nom:         s.user?.last_name  || '',
    score_total: s.score_total || 0,
    delivery:    s.score_delivery  || 0,
    quality:     s.score_quality   || 0,
    regularity:  s.score_regularity|| 0,
    bonus:       s.score_bonus     || 0,
  })).sort((a, b) => a.date.localeCompare(b.date) || a.nom.localeCompare(b.nom))

  const dailyHeaders = [
    { key: 'date',        label: 'Date',      width: 14 },
    { key: 'prenom',      label: 'Prénom',    width: 16 },
    { key: 'nom',         label: 'Nom',       width: 16 },
    { key: 'score_total', label: 'Score',     width: 10 },
    { key: 'delivery',    label: 'Delivery',  width: 12 },
    { key: 'quality',     label: 'Quality',   width: 12 },
    { key: 'regularity',  label: 'Régularité',width: 14 },
    { key: 'bonus',       label: 'Bonus OKR', width: 12 },
  ]
  const ws2 = createSheet(dailyData, dailyHeaders)
  XLSX.utils.book_append_sheet(wb, ws2, 'Détail journalier')

  const label = periodLabel ? `_${periodLabel.replace(/\s/g, '_')}` : ''
  downloadWorkbook(wb, `PULSE_Rapport${label}`)
}

// ─── EXPORT AWARDS MENSUELS (Session 24 — Phase F) ───────────
/**
 * Exporte les awards mensuels au format Excel.
 * @param {Array} awards — tableau de monthly_awards avec user
 * @param {number} year
 * @param {number} month — 1–12
 */
export function exportMonthlyAwards(awards, year, month) {
  if (!awards || awards.length === 0) return

  const monthNames = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
  ]
  const periodLabel = month ? `${monthNames[month - 1]}_${year}` : String(year)

  const AWARD_TYPE_LABELS = {
    star_of_month:    'Star du Mois',
    top_delivery:     'Top Delivery',
    most_improved:    'Most Improved',
    lowest_performer: 'À surveiller',
  }

  const data = awards.map(a => ({
    type:    AWARD_TYPE_LABELS[a.award_type] || a.award_type,
    prenom:  a.user?.first_name || '',
    nom:     a.user?.last_name  || '',
    service: a.user?.services?.name || '',
    score:   a.score_snapshot?.avg_total != null
               ? Math.round(a.score_snapshot.avg_total)
               : '',
    jours:   a.score_snapshot?.days_count || '',
    notes:   a.notes || '',
    periode: `${monthNames[(month || 1) - 1]} ${year}`,
  }))

  const headers = [
    { key: 'type',    label: 'Award',    width: 20 },
    { key: 'prenom',  label: 'Prénom',   width: 16 },
    { key: 'nom',     label: 'Nom',      width: 16 },
    { key: 'service', label: 'Service',  width: 22 },
    { key: 'score',   label: 'Score',    width: 10 },
    { key: 'jours',   label: 'Jours',    width: 8  },
    { key: 'notes',   label: 'Notes',    width: 30 },
    { key: 'periode', label: 'Période',  width: 16 },
  ]

  const wb = XLSX.utils.book_new()
  const ws = createSheet(data, headers)
  XLSX.utils.book_append_sheet(wb, ws, 'Awards')
  downloadWorkbook(wb, `PULSE_Awards_${periodLabel}`)
}

// ─── HELPER INTERNE PULSE ────────────────────────────────────
function buildPulseLeaderboard(scores) {
  const byUser = {}
  for (const s of scores) {
    const uid = s.user_id
    if (!byUser[uid]) {
      byUser[uid] = {
        firstName: s.user?.first_name || '',
        lastName:  s.user?.last_name  || '',
        service:   s.user?.services?.name || null,
        scores:    [],
      }
    }
    byUser[uid].scores.push(s)
  }
  return Object.values(byUser).map(u => {
    const n   = u.scores.length
    const avg = k => u.scores.reduce((sum, s) => sum + (s[k] || 0), 0) / n
    return {
      firstName:   u.firstName,
      lastName:    u.lastName,
      service:     u.service,
      avgTotal:    avg('score_total'),
      avgDelivery: avg('score_delivery'),
      avgQuality:  avg('score_quality'),
      avgRegularity: avg('score_regularity'),
      avgBonus:    avg('score_bonus'),
      daysCount:   n,
    }
  }).sort((a, b) => b.avgTotal - a.avgTotal)
}

// ─── EXPORT TABLEAU DE BORD DRH (S47) ────────────────────────
export function buildDRHExport({ kpis = {}, divisions = [], alerts = [], trends = [], monthKeys = [], topFlop = null }) {
  const kpisSheet = [
    { indicateur: 'PULSE moyen global',    valeur: kpis.avg_pulse       ?? '—', agents: kpis.pulse_agents   ?? '—', precedent: kpis.avg_pulse_prev   ?? '—' },
    { indicateur: 'NITA moyen global',     valeur: kpis.avg_nita        ?? '—', agents: kpis.nita_agents    ?? '—', precedent: kpis.avg_nita_prev    ?? '—' },
    { indicateur: 'F360 Complétion (%)',   valeur: kpis.f360_rate       ?? '—', agents: `${kpis.f360_completed ?? '—'}/${kpis.f360_total ?? '—'}`, precedent: '—' },
    { indicateur: 'OKR Progression (%)',   valeur: kpis.avg_okr_progress ?? '—', agents: kpis.total_okr      ?? '—', precedent: '—' },
    { indicateur: 'Engagement moyen',      valeur: kpis.avg_engagement  ?? '—', agents: kpis.survey_respondents ?? '—', precedent: '—' },
  ]
  const divisionsSheet = (divisions || []).map(d => ({
    division: d.name ?? '—', pulse_mois: d.pulse_cur ?? '—', pulse_precedent: d.pulse_prev ?? '—',
    delta_pulse: (d.pulse_cur != null && d.pulse_prev != null) ? d.pulse_cur - d.pulse_prev : '—',
    nita_mois: d.nita_cur ?? '—', nita_precedent: d.nita_prev ?? '—',
    delta_nita: (d.nita_cur != null && d.nita_prev != null) ? d.nita_cur - d.nita_prev : '—',
    delivery: d.delivery ?? '—', qualite: d.quality ?? '—',
    resilience: d.avg_resilience ?? '—', fiabilite: d.avg_reliability ?? '—', endurance: d.avg_endurance ?? '—',
    f360_taux: d.f360_rate ?? '—', okr_progression: d.okr_progress ?? '—',
    nb_agents: d.nb_agents ?? '—', niveau_risque: d.riskLevel ?? '—',
    signaux: (d.flags || []).map(f => f.label).join(' | ') || '—',
  }))
  const alertsSheet = (alerts || []).map(a => ({
    agent: a.name ?? '—', division: a.division ?? '—', service: a.service ?? '—',
    metrique: a.metric ?? '—', type_alerte: a.type ?? '—', description: a.description ?? '—',
  }))
  const trendsSheet = []
  ;(trends || []).forEach(div => {
    ;(div.data || []).forEach(d => {
      trendsSheet.push({ division: div.name ?? '—', mois: d.month_key ?? '—', pulse_moy: d.pulse ?? '—', nita_moy: d.nita ?? '—' })
    })
  })
  trendsSheet.sort((a, b) => (a.mois > b.mois ? 1 : -1))
  const topFlopSheet = []
  if (topFlop) {
    ;(topFlop.pulseTop5 || []).forEach((a, i) => topFlopSheet.push({ rang: i+1, categorie:'Top PULSE', agent:a.name, division:a.division, service:a.service, score:a.score }))
    ;(topFlop.pulseFlop5 || []).forEach((a, i) => topFlopSheet.push({ rang: i+1, categorie:'Flop PULSE', agent:a.name, division:a.division, service:a.service, score:a.score }))
    ;(topFlop.nitaTop5 || []).forEach((a, i) => topFlopSheet.push({ rang: i+1, categorie:'Top NITA', agent:a.name, division:a.division, service:a.service, score:a.score }))
    ;(topFlop.nitaFlop5 || []).forEach((a, i) => topFlopSheet.push({ rang: i+1, categorie:'Flop NITA', agent:a.name, division:a.division, service:a.service, score:a.score }))
  }
  return { kpisSheet, divisionsSheet, alertsSheet, trendsSheet, topFlopSheet }
}

export function exportDRHDashboard({ kpis, divisions, alerts, trends, monthKeys, topFlop }) {
  const { kpisSheet, divisionsSheet, alertsSheet, trendsSheet, topFlopSheet } =
    buildDRHExport({ kpis, divisions, alerts, trends, monthKeys, topFlop })
  const wb = XLSX.utils.book_new()
  const ws1 = createSheet(kpisSheet, [
    { key:'indicateur', label:'Indicateur', width:28 }, { key:'valeur', label:'Valeur', width:12 },
    { key:'agents', label:'Nb agents', width:16 }, { key:'precedent', label:'Mois préc.', width:14 },
  ])
  XLSX.utils.book_append_sheet(wb, ws1, 'KPIs Globaux')
  const ws2 = createSheet(divisionsSheet, [
    { key:'division', label:'Division', width:24 }, { key:'pulse_mois', label:'PULSE (mois)', width:14 },
    { key:'pulse_precedent', label:'PULSE (préc.)', width:14 }, { key:'delta_pulse', label:'Δ PULSE', width:10 },
    { key:'nita_mois', label:'NITA (mois)', width:14 }, { key:'nita_precedent', label:'NITA (préc.)', width:14 },
    { key:'delta_nita', label:'Δ NITA', width:10 }, { key:'delivery', label:'Delivery', width:12 },
    { key:'qualite', label:'Qualité', width:12 }, { key:'resilience', label:'Résilience', width:14 },
    { key:'fiabilite', label:'Fiabilité', width:12 }, { key:'endurance', label:'Endurance', width:12 },
    { key:'f360_taux', label:'F360 (%)', width:10 }, { key:'okr_progression', label:'OKR (%)', width:10 },
    { key:'nb_agents', label:'Effectif', width:10 }, { key:'niveau_risque', label:'Risque', width:12 },
    { key:'signaux', label:'Signaux détectés', width:40 },
  ])
  XLSX.utils.book_append_sheet(wb, ws2, 'Matrice Divisions')
  if (alertsSheet.length > 0) {
    const ws3 = createSheet(alertsSheet, [
      { key:'agent', label:'Agent', width:24 }, { key:'division', label:'Division', width:22 },
      { key:'service', label:'Service', width:22 }, { key:'metrique', label:'Métrique', width:12 },
      { key:'type_alerte', label:'Type', width:14 }, { key:'description', label:'Description', width:40 },
    ])
    XLSX.utils.book_append_sheet(wb, ws3, 'Alertes DRH')
  }
  if (trendsSheet.length > 0) {
    const ws4 = createSheet(trendsSheet, [
      { key:'division', label:'Division', width:24 }, { key:'mois', label:'Mois', width:12 },
      { key:'pulse_moy', label:'PULSE moy.', width:14 }, { key:'nita_moy', label:'NITA moy.', width:14 },
    ])
    XLSX.utils.book_append_sheet(wb, ws4, 'Tendances')
  }
  if (topFlopSheet.length > 0) {
    const ws5 = createSheet(topFlopSheet, [
      { key:'rang', label:'Rang', width:8 }, { key:'categorie', label:'Catégorie', width:16 },
      { key:'agent', label:'Agent', width:24 }, { key:'division', label:'Division', width:22 },
      { key:'service', label:'Service', width:22 }, { key:'score', label:'Score', width:10 },
    ])
    XLSX.utils.book_append_sheet(wb, ws5, 'Top-Flop Agents')
  }
  downloadWorkbook(wb, 'APEX_RH_TableauBordDRH')
}
