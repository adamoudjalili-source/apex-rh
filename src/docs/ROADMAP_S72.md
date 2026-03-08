# ROADMAP.md — APEX RH
> Mis à jour : Session 72 ✅ — Recrutement — Pipeline structuré + scoring — DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET** (l'utilisateur remplace son dossier src/ local)
5. **Commande Git prête à copier-coller** pour déployer sur Vercel

---

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S20 | Core (Auth, Tâches, Projets, OKR, PULSE) | ✅ Production |
| S21–S30 | Analytics, Feedback 360°, Surveys | ✅ Production |
| S31–S36 | Review Cycles, Notifications, Briefs | ✅ Production |
| S37 | Activité Réelle NITA | ✅ Production |
| S38 | Navigation 3 expériences | ✅ Production |
| S39 | PWA + Mobile-First | ✅ Production |
| S40 | Ma Performance | ✅ Production |
| S41 | Mon Développement | ✅ Production |
| S42 | Référentiel Compétences + Transparency | ✅ Production |
| S43 | IA Générative + Coach Prédictif | ✅ Production |
| S44 | Reporting Automatisé IA | ✅ Production |
| S45 | NITA Temps Réel + Export | ✅ Production |
| S46 | Analytics Prédictifs Avancés | ✅ Production |
| S47 | Tableau de Bord DRH | ✅ Production |
| S48 | Dashboard Direction Générale | ✅ Production |
| S49 | Audit & Revalorisation Stratégique | ✅ Production |
| S50 | OKR Enterprise | ✅ Production |
| S51 | Succession Planning & Cartographie Talents | ✅ Production |
| S52 | Performance Technique & Multi-tenancy | ✅ Production |
| S53 | API Ouverte & Connecteurs SIRH | ✅ Production |
| S54 | Behavioral Intelligence Engine | ✅ Production |
| S55 | Calibration Multi-niveaux & eNPS Enrichi | ✅ Production |
| S56 | Alertes Push & Onboarding Enrichi | ✅ Production |
| S57 | Module Formation & Certifications | ✅ Production |
| S58 | Compensation & Benchmark Salarial | ✅ Production |
| S59 | Portail Candidats & Recrutement Light | ✅ Production |
| S60 | Entretiens annuels & Évaluation avancée | ✅ Production |
| S61 | IA Recrutement (matching + scoring) | ✅ Production |
| S62 | Dashboard Enrichi Entretiens | ✅ Production |
| S63 | CV Parser IA | ✅ Production |
| S64 | Réorganisation UX Hub & Spoke | ✅ Production |
| S65 | Communication Interne | ✅ Production |
| S66 | Gestion des Temps | ✅ Production |
| S67 | Congés & Absences | ✅ Production |
| S68 | Offboarding | ✅ Production |
| S69 | Restructuration UX Navigation — 6 rôles | ✅ Production |
| S70 | Congés — Moteur de règles complet | ✅ Production |
| S70b | Hotfix Sécurité — Security Advisor clean | ✅ Production |
| S71 | Temps — Règles heures sup + export paie | ✅ Production |
| **S72** | **Recrutement — Pipeline structuré + scoring** | ✅ **DÉPLOYÉ** |

---

## Session 72 — Recrutement — Pipeline structuré + scoring ✅

### Livrables S72

#### SQL (`src/sql/s72_recrutement_pipeline.sql`)
- `job_applications` + 6 colonnes : match_score, stage_order, pipeline_notes, source, archived_at, archived_reason
- `recruitment_stages` + 4 colonnes : color, is_terminal, auto_notify, terminal_outcome
- `job_postings` + 3 colonnes : required_skills, required_experience_years, scoring_criteria
- `pipeline_actions` — table NEW : historique actions pipeline avec RLS
- `recruitment_metrics` — table NEW : cache métriques recrutement avec RLS
- MV `mv_pipeline_by_job` — pipeline agrégé par offre + statut (REVOKE API)
- MV `mv_recruitment_dashboard` — dashboard complet time-to-hire, sources, taux (REVOKE API)
- Fonction `compute_application_score()` — score depuis feedbacks entretien
- Fonction `refresh_recruitment_mvs()` — refresh concurrent des 2 MVs

#### Hooks (`src/hooks/useRecruitment.js` — appends S72)
- `SCORE_LABELS`, `APPLICATION_SOURCE_LABELS`, `APPLICATION_SOURCE_COLORS` — constantes
- `getScoreInfo()`, `getScoreLevel()` — helpers score
- `useJobApplicationsEnriched()` — candidatures avec entretiens + feedback enrichis
- `usePipelineByJob()` — MV pipeline par offre
- `useRecruitmentDashboard()` — MV dashboard enrichi avec fallback
- `useMoveApplicationStage()` — déplacer candidat + log pipeline_actions
- `useArchiveApplication()` — archiver avec motif + log
- `useAddPipelineNote()` — note pipeline + log
- `usePipelineActions()` — historique actions candidature
- `useRecruitmentGlobalStats()` — stats globales avec fallback direct
- `useComputeApplicationScore()` — RPC compute_application_score
- `useRefreshRecruitmentMVs()` — refresh MVs pour admin
- `useUpdateApplicationScore()` — mise à jour manuelle score

#### Composants S72 (dans `src/components/recrutement/`)
- `RecruitmentPipelineKanban.jsx` — Kanban 7 colonnes configurables, filtres avancés (recherche/poste/source/score), actions rapides par carte (déplacer±1/refuser/archiver/entretien/recalcul score), collapsible columns, modal 4 onglets (Infos/Déplacer/Note/Entretien), badge score visuel
- `RecruitmentDashboard.jsx` — Stats globales 4 KPIs, time-to-hire, durée moy. en cours, entonnoir conversion SVG, donut sources SVG, distribution scores SVG, top postes barres SVG, refresh admin
- `RecruitmentScoringPanel.jsx` — Gauge score SVG par candidat, score manuel ou recalcul auto, distribution résumé 5 catégories, filtres niveau/poste/tri

#### Page hub (`src/pages/recrutement/Recrutement.jsx`)
- 9 onglets : Offres / Mes candidatures / Pipeline(S72) / Dashboard(S72) / Scoring(S72) / Entretiens / IA Matching / Parser CV / Administration
- Badges visuels "S72" sur les nouveaux onglets
- Stats header via `useRecruitmentGlobalStats()` avec fallback

---

## Roadmap S73–S87 — Plan d'enrichissement modules

### Cycle RH opérationnel (S73–S75)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S73** | **Formation — Budget + obligatoire + évaluation** | 🔴 Haute | 🎯 Prochaine |
| S74 | Compensation — Workflow révision salariale | 🔴 Haute | ⏳ Planifiée |
| S75 | Onboarding — Parcours progressif automatisé | 🔴 Haute | ⏳ Planifiée |

### Cycle performance & travail (S76–S79)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| S76 | Performance PULSE — Alertes proactives + calibration | 🟠 Moyenne | ⏳ Planifiée |
| S77 | Tâches — Dépendances + récurrence + charge | 🟠 Moyenne | ⏳ Planifiée |
| S78 | OKR — Cycle complet + check-ins + lien évaluation | 🟠 Moyenne | ⏳ Planifiée |
| S79 | Projets — Connexions + budget + Gantt avancé | 🟠 Moyenne | ⏳ Planifiée |

### Cycle évaluation & développement (S80–S84)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| S80 | Entretiens Annuels — Mi-année + auto-éval + suivi engagements | 🟠 Moyenne | ⏳ Planifiée |
| S81 | Feedback 360° — Cycles planifiés + continu + tendances | 🟡 Basse | ⏳ Planifiée |
| S82 | Intelligence RH — Bilan social + turnover + absentéisme | 🟠 Moyenne | ⏳ Planifiée |
| S83 | Succession & Talents — Vivier + gap analysis + revue formelle | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps + recommandations | 🟠 Moyenne | ⏳ Planifiée |

### Cycle infrastructure & transversal (S85–S87)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| S85 | Offboarding — Automatisation + lien recrutement + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade + digest | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture + programmation | 🟡 Basse | ⏳ Planifiée |
