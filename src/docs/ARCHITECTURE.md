# ARCHITECTURE.md — APEX RH

> Décisions techniques, patterns et règles à ne jamais violer.
> Mis à jour : Session 81 — Mars 2026

---

## 1. Vue d'ensemble

APEX RH est une **SPA (Single Page Application)** React connectée à Supabase comme backend-as-a-service. Pas de serveur custom — toute la logique métier complexe passe soit par des fonctions PostgreSQL, soit par des Supabase Edge Functions (Deno) pour l'IA.

```
Navigateur (React SPA)
    │
    ├── Supabase PostgREST API  ──→ PostgreSQL (tables, vues, fonctions)
    ├── Supabase Auth           ──→ Gestion sessions / JWT
    ├── Supabase Edge Functions ──→ IA (Claude API), emails, webhooks
    └── Vercel CDN              ──→ Hébergement statique
```

---

## 2. Décisions architecturales majeures (par session)

### Multi-tenancy (S52)
Chaque organisation est isolée via `organization_id` sur **toutes** les tables. Le Row Level Security (RLS) de PostgreSQL garantit qu'un utilisateur ne voit jamais les données d'une autre organisation. 8 Materialized Views pré-calculent les agrégats lourds.

**Règle** : toujours `organization_id`, jamais `org_id`.

### Navigation 6 rôles (S69)
Les guards de rôles sont centralisés dans `AuthContext.jsx`. Ne jamais comparer `profile.role` directement dans les composants — toujours utiliser les helpers :

```js
const { canAdmin, canValidate, canManageTeam, canRecruit, canViewAnalytics } = useAuth()
```

Les vrais noms de rôles en base sont : `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`. Pas `admin`, `manager`, `rh`.

### PWA + Mobile-First (S39)
Service Worker dans `public/sw.js`. L'application est installable sur mobile. Les composants mobile sont dans `src/components/mobile/`.

### IA Générative (S43)
La clé API Claude n'est jamais exposée côté client. Tous les appels IA passent par des Supabase Edge Functions (Deno) dans `src/supabase/functions/`. Le client React appelle ces fonctions via `supabase.functions.invoke()`.

### Score IPR supprimé (S37)
Le score IPR composite a été supprimé et ne doit **jamais** être réintroduit. Le système de scoring actuel est PULSE (score journalier basé sur brief + journal + OKR).

### Réorganisation UX Hub & Spoke (S64)
La navigation principale est organisée en hubs thématiques, pas en liste plate de modules. Le fichier `src/Sidebar.jsx` (racine de `src/`) est la **seule** source de vérité pour la navigation — ne jamais modifier `src/components/layout/Sidebar.jsx` pour ajouter des routes.

---

## 3. Patterns techniques

### Hooks React Query
Un fichier de hooks par domaine métier. Toujours utiliser `@tanstack/react-query` pour les requêtes Supabase — pas de `useEffect` + `useState` manuels.

```
src/hooks/
├── usePulse.js          # PULSE : briefs, journaux, scores, alertes S76
├── useCompensation.js   # Révisions salariales, cycles, simulation
├── useFormations.js     # Catalogue, inscriptions, budget
├── useOnboarding.js     # Templates, assignments, suivi progression
├── useConges.js         # Soldes, demandes, validation, règles
├── useTemps.js          # Pointage, heures sup, export paie
├── useRecruitment.js    # Pipeline, candidats, scoring
├── useAnnualReviews.js  # Entretiens, campagnes, auto-éval, PDI (S80)
├── useFeedback360.js    # Feedback 360° : cycles, templates, requests, tendances (S81)
├── useHRIntelligence.js # Intelligence RH : effectifs, turnover, absentéisme, masse salariale (S82)
└── ...
```

**Convention d'appending** : les hooks d'une nouvelle session sont ajoutés à la fin du fichier existant avec un commentaire `// ─── S81 ───`.

**Règle import critique** : ne jamais redéclarer un import déjà présent en tête de fichier lors d'un append. En particulier `useQueryClient`, `useQuery`, `useMutation`, `useAuth`, `supabase` sont déjà importés — ne pas les réimporter dans la section appendée.

### Materialized Views
Les MVs sont utilisées pour les agrégats lourds (tableaux de bord, statistiques org-wide). Elles sont rafraîchies manuellement via des fonctions `refresh_*_mv()`.

**Règle critique** : toujours `REVOKE ALL ON mv_xxx FROM anon, authenticated` après création. Les MVs ne sont jamais exposées directement à l'API — elles sont lues via des fonctions RPC ou des queries avec RLS.

**Règle enum dans MV** : toujours caster `::text` sur les nouvelles valeurs d'enum dans une MV créée la même session que l'enum.

### Charts et graphiques
**SVG natif uniquement** — pas de Recharts, pas de Chart.js, pas de D3. Tous les graphiques sont des composants SVG écrits à la main pour garder le bundle léger et le style cohérent.

### Gestion des listes d'utilisateurs
Toujours `useUsersList()` depuis `useSettings.js` pour obtenir la liste des utilisateurs de l'organisation. Ne jamais utiliser `useOrgUsers` (supprimé).

---

## 4. Structure des tables critiques

### Table centrale : `users`
```sql
users (
  id              uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  role            user_role,   -- 'collaborateur'|'chef_service'|'chef_division'|'administrateur'|'directeur'
  manager_id      uuid REFERENCES users(id),
  email           text,
)
```

> La table s'appelle `users`, **pas** `profiles`.

### Compensation
```sql
compensation_records (employee_id, salary_amount, is_current, effective_date)
--  is_current  : pas "current"

compensation_reviews (user_id, old_base_salary, new_base_salary, status, review_cycle_id)
--  user_id     : pas "employee_id"
--  old_base_salary / new_base_salary : pas "current_salary" / "new_salary"
--  increase_amount, increase_pct : colonnes GENERATED — ne jamais les insérer
```

### PULSE
```sql
performance_scores (user_id, score_date, score_period, score_total, ...)
--  score_total : pas "total_score"
--  score_period = 'daily' pour les scores journaliers
```

### OKR avancé (S78)
```sql
okr_cycles (organization_id, name, cadence, start_date, end_date, status, created_by, closed_at)
okr_checkins (organization_id, key_result_id, user_id, progress_value, confidence, note, checked_at)
```

### Projets avancés (S79)
```sql
project_okr_links (organization_id, project_id, objective_id)
project_budget_lines (organization_id, project_id, category, label, amount_planned, amount_actual, note)
project_advanced_milestones (organization_id, project_id, title, due_date, is_reached, reached_at, key_result_id)
-- ⚠️ project_advanced_milestones ≠ milestones (deux tables DISTINCTES)
```

### Entretiens Annuels avancés (S80)
```sql
-- Enum ajouté
review_type AS ENUM ('annual', 'mid_year', 'probation')

-- Colonne ajoutée sur annual_reviews
annual_reviews.review_type  review_type  DEFAULT 'annual'

-- Nouvelles tables
review_self_assessments (
  organization_id, review_id, user_id,
  answers jsonb,   -- clés : bilan.*, competences.*, objectifs_proposes, developpement.*, commentaire_libre
  submitted_at
)
--  UNIQUE(review_id, user_id)

review_development_plans (
  organization_id, review_id, user_id,
  goals jsonb,     -- [{title, category, status, description, deadline, actions:[{text,done}]}]
  next_check_date, status, manager_comment
)
--  status : 'pending' | 'in_progress' | 'completed' | 'abandoned'
--  UNIQUE(review_id, user_id)

-- RPC
get_review_completion_stats(p_manager_id uuid)
  → campaign_id, campaign_title, campaign_year, total_reviews, pending_count,
    self_submitted, completed_count, signed_count, overdue_count, mid_year_count, completion_pct
```

### Feedback 360° avancé (S81)
```sql
-- Enums ajoutés
feedback360_status         AS ENUM ('draft','active','closed','archived')
feedback360_request_status AS ENUM ('pending','in_progress','submitted','declined')

-- Nouvelles tables
feedback360_templates (
  organization_id, name, description,
  competences jsonb,  -- [{key, label, questions:[{key, label, type:'rating'|'text'}]}]
  is_default, created_by
)

feedback360_cycles (
  organization_id, title, description,
  start_date, end_date, status,   -- feedback360_status
  template_id, scope,             -- 'all'|'department'|'custom'
  scope_filter jsonb, created_by, launched_at, closed_at
)

feedback360_requests (
  organization_id, cycle_id, evaluatee_id, evaluator_id,
  relationship,   -- 'manager'|'peer'|'direct_report'|'self'
  status,         -- feedback360_request_status
  is_anonymous,   -- boolean, défaut true
  answers jsonb,  -- {competences:{[compKey]:{[qKey]:{rating,comment}}}, overall_comment}
  submitted_at, declined_reason, reminded_at
)
--  UNIQUE(cycle_id, evaluatee_id, evaluator_id)

-- Materialized View
mv_feedback360_trends
  -- score moyen par compétence par utilisateur par cycle
  -- colonnes : organization_id, evaluatee_id, cycle_id, cycle_title,
  --            cycle_end_date, cycle_status::text, comp_key, avg_rating, response_count

-- RPC
get_feedback360_summary(p_evaluatee_id uuid, p_cycle_id uuid)
  → comp_key, avg_rating, response_count, min_rating, max_rating, trend_vs_prev
```

### Succession & Vivier (S83)
```sql
talent_pool_entries (
  organization_id, user_id, target_role, target_position_id,
  readiness,    -- talent_readiness: 'ready_now'|'ready_1y'|'ready_2y'
  skills_gap,   -- jsonb: [{skill, required_level, current_level, gap, priority}]
  notes, added_by
)
--  UNIQUE(organization_id, user_id, target_position_id)

succession_gaps (
  organization_id, position_id, required_skills jsonb,
  current_coverage_pct, last_assessed_at, assessed_by
)
--  UNIQUE(organization_id, position_id)

-- Materialized View
mv_succession_coverage
  -- pool_count, ready_now_count, ready_1y_count, ready_2y_count,
  -- coverage_pct, is_at_risk
  -- REVOKE ALL appliqué

-- RPC
get_talent_gap_analysis(p_org_id uuid)
  → skill, avg_required, avg_current, avg_gap, affected_count, priority
get_succession_coverage(p_org_id uuid)
  → position_id, position_title, criticality_level, pool_count, ready_*_count, coverage_pct, is_at_risk
```

 (S1 → S82)

| Module | Session | Tables principales |
|--------|---------|-------------------|
| Auth + Rôles | S1–S10 | `users`, `organizations` |
| Tasks + Kanban | S21–S30 | `tasks`, `task_assignees` |
| PULSE Performance | S21–S39 | `morning_plans`, `daily_logs`, `performance_scores` |
| OKR Enterprise | S50 | `objectives`, `key_results` |
| Multi-tenancy | S52 | RLS sur toutes les tables |
| Succession & Talents | S51, S55 | `succession_plans`, `talent_assessments` |
| Behavioral Intelligence | S54 | `behavioral_signals` |
| Calibration + eNPS | S55 | `calibration_sessions`, `enps_responses` |
| Push Notifications | S56 | `push_subscriptions`, `notification_queue` |
| Formations | S57, S73 | `training_courses`, `training_enrollments` |
| Compensation | S58, S74 | `compensation_records`, `compensation_reviews`, `compensation_cycles` |
| Recrutement | S59, S72 | `job_postings`, `candidates`, `applications` |
| Entretiens Annuels | S60 | `annual_reviews` |
| IA Recrutement + CV | S61, S63 | Edge Functions |
| Communication | S65 | `messages`, `announcements` |
| Gestion des Temps | S66, S71 | `time_entries`, `overtime_rules` |
| Congés | S67, S70 | `leave_requests`, `leave_balances`, `leave_rules` |
| Offboarding | S68 | `offboarding_processes` |
| Réorg UX Hub & Spoke | S64 | — |
| Onboarding parcours | S75 | `onboarding_templates`, `onboarding_assignments`, `onboarding_step_completions` |
| PULSE Alertes + Calibration | S76 | `pulse_alert_rules`, `pulse_alerts`, `pulse_calibration` |
| Tâches Avancées — Dépendances + récurrence + charge | S77 | `task_dependencies`, `task_recurrences`, `task_time_tracking` |
| OKR — Cycles + Check-ins + Alignement | S78 | `okr_cycles`, `okr_checkins` |
| Projets — Connexions OKR + budget + Gantt avancé | S79 | `project_okr_links`, `project_budget_lines`, `project_advanced_milestones` |
| Entretiens — Mi-année + auto-éval + suivi managérial | S80 | `review_self_assessments`, `review_development_plans` |
| Feedback 360° — Cycles planifiés + tendances | S81 | `feedback360_templates`, `feedback360_cycles`, `feedback360_requests` |
| Intelligence RH — Bilan social + turnover | S82 | `employee_departures`, `mv_headcount_stats`, `mv_turnover_stats`, `mv_absenteeism_stats` |
| Succession & Talents — Vivier + gap analysis | S83 | `talent_pool_entries`, `succession_gaps`, `mv_succession_coverage` |
| Référentiel Compétences — Cartographie + gaps | S84 | `competency_categories`, `competencies`, `role_competency_requirements`, `user_competency_assessments`, `mv_competency_coverage` |

---

## 6. Edge Functions (Supabase Deno)

```
supabase/functions/
├── generate-ai-response/      # Réponses IA génériques (Claude API)
├── generate-ai-coach/         # Coaching personnalisé PULSE
├── ai-recruitment-match/      # Matching CV ↔ offre
├── ai-cv-parser/              # Extraction données CV
├── generate-pdi-suggestions/  # Plan de développement individuel
├── generate-report/           # Génération rapports RH
├── send-brief-reminder/       # Rappel brief quotidien
├── send-journal-reminder/     # Rappel journal quotidien
├── send-push-notification/    # Notifications push
├── send-manager-alert/        # Alertes managers
├── send-message-notification/ # Notifs messagerie
├── sync-nita-activity/        # Sync activité NITA
├── apex-api/                  # API REST externe
└── apex-webhooks/             # Webhooks entrants
```

---

## 7. Règles d'or — ne jamais violer

```
✅ table `users`          — jamais `profiles`
✅ colonne `organization_id` — jamais `org_id`
✅ `compensation_reviews.user_id` — jamais `employee_id`
✅ `compensation_records.is_current` — jamais `current`
✅ `performance_scores.score_total` — jamais `total_score`
✅ Rôles en base : 'administrateur', 'directeur', 'chef_division', 'chef_service', 'collaborateur'
✅ Helpers AuthContext S69 pour tous les guards de rôles
✅ SVG natif — jamais recharts ou chart.js
✅ useUsersList() de useSettings.js — jamais useOrgUsers
✅ Sidebar : src/Sidebar.jsx UNIQUEMENT
✅ RLS sur toutes les nouvelles tables
✅ REVOKE ALL sur toutes les nouvelles Materialized Views
✅ increase_amount et increase_pct sont GENERATED — ne jamais les insérer
✅ Score IPR SUPPRIMÉ — ne jamais réintroduire
✅ project_advanced_milestones ≠ milestones — deux tables DISTINCTES (S11 vs S79)
✅ useCurrentCycle() depuis useObjectives.js pour cycle OKR actif
✅ review_self_assessments.UNIQUE(review_id, user_id) — upsert par paire
✅ review_development_plans.UNIQUE(review_id, user_id) — upsert par paire
✅ annual_reviews.review_type = 'mid_year' pour entretiens mi-année (pas une table séparée)
✅ feedback360_requests.UNIQUE(cycle_id, evaluatee_id, evaluator_id) — upsert par triplet
✅ mv_feedback360_trends — REVOKE ALL appliqué, jamais exposée directement
✅ useFeedback360.js : ne pas redéclarer useQueryClient/useQuery/useMutation en milieu de fichier (déjà importés en tête)
✅ feedback360_requests.is_anonymous = true par défaut — ne jamais exposer evaluator_id dans les résultats agrégés
✅ employee_departures.UNIQUE(user_id) — upsert par user_id
✅ mv_headcount_stats / mv_turnover_stats / mv_absenteeism_stats — REVOKE ALL appliqué, jamais exposées directement
✅ get_social_report(p_org_id, p_year) — RPC SECURITY DEFINER avec vérification org du caller
✅ HRIntelligencePage intégré dans IntelligenceRH.jsx onglet "Bilan Social" groupe Stratégie (adminOnly)
✅ talent_pool_entries.UNIQUE(organization_id, user_id, target_position_id) — upsert par triplet (S83)
✅ succession_gaps.UNIQUE(organization_id, position_id) — upsert par paire (S83)
✅ talent_readiness enum : 'ready_now' | 'ready_1y' | 'ready_2y' (S83)
✅ mv_succession_coverage — REVOKE ALL appliqué, jamais exposée directement (S83)
✅ get_talent_gap_analysis + get_succession_coverage — SECURITY DEFINER avec vérif org (S83)
✅ succession_plans et talent_assessments existent depuis S51/S55 — ne jamais recréer
✅ key_positions existe depuis S51 — talent_pool_entries.target_position_id la référence
✅ useCompetencyFramework.js (S42 familles métiers) — NE PAS ÉCRASER — hooks S84 dans useCompetencyS84.js (S84)
✅ competencies.UNIQUE(organization_id, name) — pas de doublon de nom dans une org (S84)
✅ role_competency_requirements — UNIQUE sur (org, role_name, competency_id) OU (org, position_id, competency_id) (S84)
✅ user_competency_assessments.UNIQUE(organization_id, user_id, competency_id, source) — upsert par quadruplet (S84)
✅ mv_competency_coverage — REVOKE ALL appliqué, jamais exposée directement (S84)
✅ get_competency_gaps + refresh_competency_coverage_mv — SECURITY DEFINER avec vérif org (S84)
✅ source enum assessments : 'manager' | 'self' | '360' | 'import' (S84)
```
