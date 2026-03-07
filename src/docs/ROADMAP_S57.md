# ROADMAP.md — APEX RH
> Mis à jour : Session 57 ✅ — Module Formation & Certifications — DÉPLOYÉ EN PRODUCTION (07/03/2026)

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S20 | Core (Auth, Tâches, Projets, OKR, PULSE) | ✅ Production |
| S21–S30 | Analytics, Feedback 360°, Surveys | ✅ Production |
| S31–S36 | Review Cycles, Notifications, Briefs | ✅ Production |
| S37 | Activité Réelle NITA | ✅ Production |
| S38 | Navigation 3 expériences | ✅ Production |
| S39 | PWA + Mobile-First | ✅ Production |
| S40 | Ma Performance (profil multi-dim + NITA) | ✅ Production |
| S41 | Mon Développement (PDI + F360 + Boucle) | ✅ Production |
| S42 | Référentiel Compétences + Transparency | ✅ Production |
| S43 | IA Générative + Coach Prédictif | ✅ Production |
| S44 | Reporting Automatisé IA | ✅ Production |
| S45 | NITA Temps Réel + Export Excel/CSV | ✅ Production |
| S46 | Analytics Prédictifs Avancés | ✅ Production |
| S47 | Tableau de Bord DRH | ✅ Production |
| S48 | Dashboard Direction Générale | ✅ Production |
| S49 | Audit & Revalorisation Stratégique | ✅ Production |
| S50 | OKR Enterprise (cascade + KPI custom) | ✅ Production |
| S51 | Succession Planning & Cartographie Talents | ✅ Production |
| S52 | Performance Technique & Multi-tenancy Foundation | ✅ Production |
| S53 | API Ouverte & Connecteurs SIRH | ✅ Production |
| S54 | Behavioral Intelligence Engine | ✅ Production |
| S55 | Calibration Multi-niveaux & eNPS Enrichi | ✅ Production |
| S56 | Alertes Push & Onboarding Enrichi | ✅ Production |
| **S57** | **Module Formation & Certifications** | ✅ **DÉPLOYÉ** |
| **S58** | **Compensation & Benchmark salarial** | 🎯 Prochaine cible |

---

## Session 57 — Module Formation & Certifications ✅

### Livrables S57

#### 1. Catalogue de formations
- **5 tables Supabase** : `training_catalog`, `training_enrollments`, `certifications`, `training_plans`, `training_plan_items`
- **2 vues matérialisées** : `mv_user_training_stats` + `mv_training_popularity`
- **4 enums** : `training_type`, `enrollment_status`, `plan_priority`, `plan_item_status`
- **Seed démo** : 3 formations d'exemple insérées automatiquement (Excel, Management, Sécurité)
- **pg_cron** : refresh MVs chaque nuit à 2h

#### 2. Interface utilisateur (6 onglets adaptatifs)
- **Catalogue** (tous) : Browse + filtres type/niveau/recherche + stats populaire par formation
- **Mes formations** (tous) : Inscriptions actives, progression, feedback ⭐, démarrer/terminer inline
- **Mes certifications** (tous) : Liste + alertes expiration 60j + ajout manuel + suppression
- **Mon plan** (tous) : Plan annuel glissant (N-1/N/N+1), items catalogue + hors-catalogue, suivi priorité
- **Mon équipe** (manager) : Vue agrégée équipe — inscriptions, certifications, plans collaborateurs
- **Administration** (admin) : Stats org globales + CRUD catalogue (créer/éditer/désactiver formations)

#### 3. Hooks React
- `useTrainingCatalog` — avec jointure `mv_training_popularity`
- `useMyEnrollments` / `useTeamEnrollments` — avec jointures catalog
- `useMyTrainingStats` / `useOrgTrainingStats` — depuis MVs
- `useMyCertifications` / `useTeamCertifications`
- `useMyTrainingPlan` / `useTeamTrainingPlans`
- `useCreateOrUpdatePlan` / `useAddPlanItem` / `useDeletePlanItem` / `useUpdatePlanItem`
- `useEnrollUser` / `useUpdateEnrollment` / `useSubmitFeedback`
- `useCreateTraining` / `useUpdateTraining` / `useDeleteTraining`
- `useValidatePlan`

#### 4. Tests
- **30 nouveaux tests** (`useFormations.test.js`) : constantes, logique expiration, progression, feedback

### Fichiers livrés S57
- `src/sql/migration_s57_formations.sql`
- `src/hooks/useFormations.js`
- `src/components/formation/FormationCard.jsx`
- `src/components/formation/FormationDetail.jsx`
- `src/components/formation/FormationCatalog.jsx`
- `src/components/formation/MyEnrollments.jsx`
- `src/components/formation/MyCertifications.jsx`
- `src/components/formation/TrainingPlanPanel.jsx`
- `src/components/formation/TeamFormationDashboard.jsx`
- `src/components/formation/FormationAdminPanel.jsx`
- `src/pages/formation/Formation.jsx`
- `src/tests/useFormations.test.js`
- `src/App.jsx` (modifié : +route `/formation`)
- `src/components/layout/Sidebar.jsx` (modifié : +GraduationCap dans 3 vues)

---

## Roadmap future (estimé)

| Session | Module | Priorité |
|---------|--------|----------|
| S58 | Compensation & Benchmark salarial | 🔴 Haute |
| S59 | Portail candidats & Recrutement light | 🟡 Moyenne |
| S60 | Mobile app native (Capacitor/React Native) | 🟢 Long terme |
