# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 60 — Entretiens annuels & Évaluation avancée ✅ DÉPLOYÉ EN PRODUCTION (07/03/2026)

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 60

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 3 expériences DÉPLOYÉE (S38)** — Ne PAS modifier `Sidebar.jsx` ni `App.jsx` sans raison explicite.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **Ma Performance COMPLÈTE (S40)** + transparency (S42) + Rapports IA (S44).
5. **Mon Développement COMPLET (S41)** + IA Coach (S43).
6. **Référentiel Compétences DÉPLOYÉ (S42)** — `job_families` + `competency_frameworks`.
7. **Conduite du Changement DÉPLOYÉE (S42)** — `performance_comments` + `manager_notes`.
8. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
9. **Reporting Automatisé IA DÉPLOYÉ (S44)** — Rapports Claude + export PDF.
10. **NITA Temps Réel DÉPLOYÉ (S45)** — Webhook HMAC + Realtime + Export Excel/CSV.
11. **Analytics Prédictifs DÉPLOYÉ (S46)** — Corrélations NITA↔PULSE↔F360 + tendances + patterns.
12. **Tableau de Bord DRH DÉPLOYÉ (S47)** — KPIs globaux + matrice divisions + alertes + export Excel.
13. **Dashboard Direction Générale DÉPLOYÉ (S48)** — Scorecard RAG + jauge santé orga + tendances 12 mois + OKR stratégiques + ROI RH.
14. **Audit Stratégique + Quick Wins LIVRÉS (S49)** — Score global 68/100. 5 QWs implémentés.
15. **OKR Enterprise DÉPLOYÉ (S50)** — Cascade parent-enfant réelle + KPI custom.
16. **Succession Planning & Cartographie Talents DÉPLOYÉ (S51)**.
17. **Performance Technique & Multi-tenancy Foundation DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant + Tests Vitest.
18. **API Ouverte & Connecteurs SIRH DÉPLOYÉ (S53)**.
19. **Behavioral Intelligence Engine DÉPLOYÉ (S54)**.
20. **Calibration Multi-niveaux & eNPS Enrichi DÉPLOYÉ (S55)**.
21. **Alertes Push & Onboarding Enrichi DÉPLOYÉ (S56)**.
22. **Module Formation & Certifications DÉPLOYÉ (S57)**.
23. **Compensation & Benchmark Salarial DÉPLOYÉ (S58)**.
24. **Portail Candidats & Recrutement Light DÉPLOYÉ (S59)**.
25. **Entretiens annuels & Évaluation avancée DÉPLOYÉ (S60)** :
    - `sql/migration_s60_entretiens_annuels.sql` — 3 tables + 2 MVs + 3 enums + pg_cron
    - `hooks/useAnnualReviews.js` — 30+ hooks + helpers
    - `components/entretiens/AnnualReviewForm.jsx` — Formulaire multi-étapes (auto-éval + manager)
    - `components/entretiens/AnnualReviewDashboard.jsx` — Vue manager équipe avec filtres
    - `components/entretiens/AnnualReviewAdmin.jsx` — Administration campagnes + stats
    - `components/entretiens/AnnualReviewHistory.jsx` — Historique + timeline + évolution
    - `pages/entretiens/EntretiensAnnuels.jsx` — Page principale 4 onglets adaptatifs rôle
    - `tests/useAnnualReviews.test.js` — 42 tests

---

## ⚠️ Nouvelles tables S60

| Table | Description |
|-------|-------------|
| `annual_review_campaigns` | Campagnes d'entretiens (title, year, status, start/end_date, deadlines, template_sections JSONB, options) |
| `annual_reviews` | Instances d'entretiens (campaign_id, employee_id, manager_id, self_eval JSONB, manager_eval JSONB, overall_rating, salary_recommendation, objectives_next_year JSONB, development_plan JSONB, signatures) |
| `annual_review_signatures` | Signatures électroniques (review_id, signer_id, signer_type employee/manager, signed_at, signature_hash) |

## ⚠️ Nouvelles vues matérialisées S60

| Vue | Description |
|-----|-------------|
| `mv_annual_campaign_stats` | Agrégats par campagne : totaux, taux complétion, répartition notes, recos salariales |
| `mv_employee_review_history` | Historique par employé : nb entretiens, dernière année, note moyenne, dernière note |

## ⚠️ Nouveaux types enum S60

- `annual_review_status`: `pending | self_in_progress | self_submitted | meeting_scheduled | manager_in_progress | completed | signed | archived`
- `campaign_status`: `draft | active | in_progress | completed | archived`
- `salary_recommendation`: `maintien | augmentation_merite | augmentation_promotion | revision_exceptionnelle | gel`

## ⚠️ Extension enum `notification_type` S60

- `annual_review_opened`, `annual_review_self_reminder`, `annual_review_submitted`, `annual_review_completed`, `annual_review_signed`

## ⚠️ Règles architecturales S60

- **Route** : `/entretiens` → `pages/entretiens/EntretiensAnnuels.jsx` (lazy dans App.jsx)
- **Sidebar** : `ClipboardList` icon — affiché pour tous les rôles (après Recrutement dans les 3 vues)
- **Onglets adaptatifs** :
  - Collaborateur : Mon entretien · Historique
  - Manager : + Mon équipe (badge si entretiens en attente)
  - Admin/Directeur : + Campagnes
- **Module key** : `entretiens_annuels_enabled` dans `app_settings.modules` (activé par défaut)
- **annual_reviews** : UNIQUE(campaign_id, employee_id) — un seul entretien par collab par campagne
- **annual_review_signatures** : UNIQUE(review_id, signer_type) — upsert possible
- **Refresh MVs** : pg_cron chaque nuit à 3h00 (`refresh-annual-review-views-nightly`)
- **DEFAULT_TEMPLATE_SECTIONS** : 5 sections (bilan, compétences, objectifs, développement, commentaires)
- **RLS annual_reviews** : employee voit la sienne ; manager voit son équipe ; admin/directeur voient l'org
- **Pas de recharts** → SVG natif

## ⚠️ Colonnes critiques annual_reviews

| Champ | Type | Notes |
|-------|------|-------|
| `self_eval` | JSONB | `{section_id: {answers}}` — auto-évaluation |
| `manager_eval` | JSONB | `{section_id: {scores, comments}}` — éval manager |
| `overall_rating` | TEXT | CHECK IN ('insuffisant','a_ameliorer','satisfaisant','bien','excellent') |
| `salary_recommendation` | salary_recommendation enum | Recommandation salariale |
| `salary_increase_pct` | NUMERIC(5,2) | % d'augmentation |
| `objectives_next_year` | JSONB | `[{title, indicator, target, deadline}]` |
| `development_plan` | JSONB | Plan développement co-construit |
| `auto_synthesis` | JSONB | Synthèse PULSE+OKR+F360 calculée |
| `employee_signed_at` | TIMESTAMPTZ | Signature électronique collaborateur |
| `manager_signed_at` | TIMESTAMPTZ | Signature électronique manager |

---

## ⚠️ Pièges colonnes connus (NE PAS SE TROMPER)

| Table | ❌ NOM FAUX | ✅ NOM RÉEL |
|-------|------------|------------|
| `organizations` | — | `slug` UNIQUE, `plan` enum, `is_active`, `max_users`, `settings JSONB` |
| `users` | — | `organization_id UUID` ✅ ajouté S52 |
| `performance_scores` | `date` | `score_date` |
| `performance_scores` | `delivery_score` | `score_delivery` |
| `performance_scores` | `quality_score` | `score_quality` |
| `performance_scores` | `total` | `score_total` |
| `objectives` | `start_date` | **N'EXISTE PAS** |
| `objectives` | `end_date` | **N'EXISTE PAS** |
| `objectives` | — | `parent_id UUID` ✅ S50 |
| `objectives` | — | `weight NUMERIC(5,2)` ✅ S50 |
| `survey_responses` | `score` | `scores` (JSONB) |
| `survey_responses` | `user_id` | `respondent_id` ✅ S55 |
| `review_evaluations` | `review_cycle_id` | `cycle_id` ✅ S55 |
| `training_plan_items` | `training_name` | `free_title` (si hors catalogue) |
| `compensation_reviews` | `increase_amount` | GENERATED — ne pas insérer manuellement |
| `compensation_reviews` | `increase_pct` | GENERATED — ne pas insérer manuellement |
| `compensation_records` | `current` | `is_current` BOOLEAN |
| `job_applications` | `internal` | `is_internal` GENERATED ALWAYS |
| `interview_feedback` | `score` | `overall_score` SMALLINT |
| `annual_review_campaigns` | `sections` | `template_sections` JSONB |
| `annual_reviews` | `rating` | `overall_rating` TEXT |
| `annual_review_signatures` | `type` | `signer_type` TEXT |

---

## ⚠️ Règles architecturales S52-S60 (toujours valables)

- Toute nouvelle table → `organization_id UUID REFERENCES organizations(id)` + index + RLS
- RLS : utiliser `auth_user_organization_id()` (SECURITY DEFINER)
- Super-admin : vérifier `is_super_admin()` pour accès cross-org
- Vues matérialisées : modifier la MV (`mv_xxx`), pas la vue alias (`v_xxx`)
- Refresh : `SELECT refresh_all_materialized_views();` ou `SELECT refresh_annual_review_views();`
- **Edge Functions** : toujours ajouter `// @ts-nocheck` en première ligne
- **AuthContext** : utiliser `isAdmin`, `isDirecteur`, etc. — NE PAS utiliser `user?.role` directement
- **Ne pas imbriquer** `$$` dans un bloc `DO $$` pour pg_cron → utiliser `$outer$`
- **Ne jamais importer** `deno.land/x` tiers dans les Edge Functions
- **Pas de recharts** → SVG natif (non installé sur Vercel)

---

## Rôles utilisateurs (production)

| Valeur DB | Label UI | Droits dashboard |
|-----------|----------|--------------------|
| `administrateur` | Administrateur | Tout |
| `directeur` | Directeur | Intelligence RH + Tableau DRH + Direction |
| `direction` | Direction Générale | Dashboard Direction (S48) uniquement |
| `chef_division` | Chef de Division | Mon Équipe + Intelligence RH |
| `chef_service` | Chef de Service | Mon Équipe + Intelligence RH |
| `collaborateur` | Collaborateur | Mon Espace |

> ⚠️ `ADMINS = ['administrateur','directeur','direction']` dans `Sidebar.jsx`
> ⚠️ Dans les composants : utiliser `isAdmin` depuis `useAuth()`, jamais `user?.role`

---

## Tables Supabase (production)

### Core
- `users` — profils, rôles, service_id, division_id, direction_id, is_active, must_change_password, organization_id
- `services`, `divisions`, `directions`
- `app_settings` — modules on/off + `entretiens_annuels_enabled` S60
- `organizations` — orgs multi-tenant (S52)
- `super_admins` — utilisateurs super-admin cross-org (S52)

### Performance
- `performance_scores` — scores PULSE quotidiens (score_delivery, score_quality, score_regularity, score_bonus, score_total, **score_date**)
- `agent_activity_logs` — données NITA (**date**)
- `pulse_morning_plans`, `pulse_daily_logs`, `monthly_performance_snapshots`

### Développement
- `objectives` — OKR (parent_id ✅ S50, weight ✅ S50)
- `pdi_actions`, `feedback_requests`, `feedback_responses`
- `review_cycles`, `review_evaluations`
- `engagement_surveys`, `survey_responses` (**scores est JSONB**, clé `enps` ✅ S55)

### Formation & Certifications (S57)
- `training_catalog`, `training_enrollments`, `certifications`, `training_plans`, `training_plan_items`
- MVs : `mv_user_training_stats`, `mv_training_popularity`

### Compensation & Benchmark (S58)
- `salary_grades`, `compensation_records`, `salary_benchmarks`, `compensation_reviews`, `bonus_records`
- MVs : `mv_compensation_stats`, `mv_benchmark_analysis`

### Recrutement (S59)
- `job_postings`, `job_applications`, `interview_schedules`, `interview_feedback`, `recruitment_stages`
- MVs : `mv_recruitment_stats`, `mv_pipeline_stats`

### Entretiens annuels (S60)
- `annual_review_campaigns` — Campagnes (year, template_sections, deadlines, options)
- `annual_reviews` — Entretiens (self_eval, manager_eval, overall_rating, salary_recommendation, objectives_next_year, development_plan, signatures)
- `annual_review_signatures` — Signatures électroniques (signer_type: employee|manager)
- MVs : `mv_annual_campaign_stats`, `mv_employee_review_history`

### Talents & Succession (S51)
- `key_positions`, `succession_plans`

### API & Connecteurs (S53)
- `api_keys`, `api_audit_logs`, `webhook_endpoints`, `webhook_delivery_logs`, `field_mappings`, `scim_sync_logs`

### Intelligence Comportementale (S54)
- `attrition_risk_scores`, `behavioral_alerts`, `career_predictions`

### Calibration & eNPS (S55)
- `calibration_sessions`, `calibration_overrides`, `calibration_history`, `enps_cache`

### Push Notifications & Onboarding (S56)
- `push_subscriptions`, `push_notification_logs`, `onboarding_checklist`

### Notifications (S12)
- `notifications`, `notification_preferences`, `email_queue`

### IA (S43–S44)
- `ai_chat_messages`, `ai_pdi_suggestions`, `ai_predictive_alerts`, `ai_reports`

---

## Edge Functions Supabase

| Fonction | S | Usage |
|----------|----|-------|
| `generate-ai-response` | 43 | Chat IA contextuel |
| `generate-pdi-suggestions` | 43 | Suggestions PDI |
| `generate-report` | 44 | Rapports automatisés Claude |
| `nita-webhook` | 45 | Réception NITA temps réel (HMAC-SHA256) |
| `apex-api` | 53 | API REST publique v1 |
| `apex-api-scim` | 53 | Connecteur SCIM 2.0 |
| `apex-webhooks` | 53 | Dispatch webhooks sortants |
| `send-push-notification` | 56 | Envoi push notifications Web Push (VAPID + AES-GCM) |
