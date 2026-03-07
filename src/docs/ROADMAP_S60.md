# ROADMAP.md — APEX RH
> Mis à jour : Session 60 ✅ — Entretiens annuels & Évaluation avancée — DÉPLOYÉ EN PRODUCTION (07/03/2026)

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
| S57 | Module Formation & Certifications | ✅ Production |
| S58 | Compensation & Benchmark Salarial | ✅ Production |
| S59 | Portail Candidats & Recrutement Light | ✅ Production |
| **S60** | **Entretiens annuels & Évaluation avancée** | ✅ **DÉPLOYÉ** |
| **S61** | **IA dans le Recrutement (matching + scoring)** | 🎯 Prochaine cible |

---

## Session 60 — Entretiens annuels & Évaluation avancée ✅

### Livrables S60

#### 1. Base de données
- **3 tables Supabase** : `annual_review_campaigns`, `annual_reviews`, `annual_review_signatures`
- **2 vues matérialisées** : `mv_annual_campaign_stats` + `mv_employee_review_history`
- **3 enums** : `annual_review_status`, `campaign_status`, `salary_recommendation`
- **5 notifications** : `annual_review_opened`, `annual_review_self_reminder`, `annual_review_submitted`, `annual_review_completed`, `annual_review_signed`
- **pg_cron** : refresh MVs chaque nuit à 3h00

#### 2. Interface utilisateur (4 onglets adaptatifs)
- **Mon entretien** (tous) : Statut en temps réel + barre de progression + formulaire auto-évaluation + bouton signature
- **Historique** (tous) : Timeline chronologique + graphe évolution notes + résumé carrière
- **Mon équipe** (manager) : Cartes collaborateurs filtrables + badge urgence + accès formulaire évaluation manager + planification réunion
- **Campagnes** (admin) : CRUD campagnes + stats KPI + répartition notes + liste entretiens

#### 3. Formulaire multi-étapes (`AnnualReviewForm.jsx`)
- **Navigation par sections** : 5 onglets (Bilan · Compétences · Objectifs N+1 · Développement · Commentaires)
- **Section Bilan** : 4 champs textarea (accomplissements, points forts, difficultés, apprentissages)
- **Section Compétences** : Notation étoiles 1-5 (6 compétences) avec labels dynamiques + vue comparaison self/manager
- **Section Objectifs N+1** : Formulaire dynamique SMART (jusqu'à 5 objectifs avec indicateur + cible + deadline)
- **Section Développement** : 3 champs (besoins formation, souhaits évolution, actions prioritaires)
- **Synthèse auto** : Bloc PULSE + OKR + F360 calculé automatiquement
- **Signature électronique** : Flow employee + manager avec commentaire optionnel
- **Sauvegarde brouillon** : Auto-save possible à tout moment

#### 4. Hooks React (`useAnnualReviews.js`)
- `useActiveCampaigns` / `useAllCampaigns` / `useCampaign` / `useCampaignStats`
- `useMyReview` / `useMyReviews` / `useTeamReviews` / `useCampaignReviews` / `useReview`
- `useManagerPendingReviews` / `useEmployeeReviewHistory`
- `useCreateCampaign` / `useUpdateCampaign` / `usePublishCampaign` / `useArchiveCampaign`
- `useCreateCampaignReviews`
- `useSaveAutoEval` / `useSubmitAutoEval` / `useSaveManagerEval` / `useSubmitManagerEval`
- `useScheduleMeeting` / `useSignReview` / `useManagerSignReview` / `useArchiveReview`
- Helpers : `getReviewStatusOrder`, `isReviewEditable`, `computeSelfScore`, `computeManagerScore`, `ratingToScore`, `scoreToRating`, `formatReviewYear`, `getReviewProgress`, `isSignedByEmployee`, `isSignedByManager`, `isFullySigned`, `getDaysUntilDeadline`, `isDeadlineOverdue`, `isDeadlineSoon`

#### 5. Tests
- **42 nouveaux tests** (`useAnnualReviews.test.js`) : constantes, status order, editability, scores, ratings, progress, signatures, deadlines

### Fichiers livrés S60
- `src/sql/migration_s60_entretiens_annuels.sql`
- `src/hooks/useAnnualReviews.js`
- `src/components/entretiens/AnnualReviewForm.jsx`
- `src/components/entretiens/AnnualReviewDashboard.jsx`
- `src/components/entretiens/AnnualReviewAdmin.jsx`
- `src/components/entretiens/AnnualReviewHistory.jsx`
- `src/pages/entretiens/EntretiensAnnuels.jsx`
- `src/tests/useAnnualReviews.test.js` — 42 tests
- `src/App.jsx` (modifié : +route `/entretiens`)
- `src/components/layout/Sidebar.jsx` (modifié : +ClipboardList dans 3 vues)

---

## Roadmap future (estimé)

| Session | Module | Priorité |
|---------|--------|----------|
| S61 | IA dans le Recrutement (matching automatique, scoring candidats) | 🔴 Haute |
| S62 | Mobile app native (Capacitor/React Native) | 🟢 Long terme |
