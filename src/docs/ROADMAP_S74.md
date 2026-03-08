# ROADMAP.md — APEX RH
> Mis à jour : Session 74 ✅ — Compensation — Workflow révision salariale — DÉPLOYÉ (08/03/2026)

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
| S1–S73 | (voir MEMOIRE_PROJET_S74.md) | ✅ Production |
| **S74** | **Compensation — Workflow révision salariale** | ✅ **DÉPLOYÉ** |

---

## Session 74 — Compensation — Workflow révision salariale ✅

### Livrables S74

#### SQL (`src/sql/s74_compensation_workflow.sql`)
- `compensation_reviews` + 9 colonnes : status, submitted_at, manager_approved_by/at, hr_approved_by/at, applied_at, refused_reason, review_cycle_id
- `compensation_cycles` — table NEW : cycles de révision annuelle avec RLS
- MV `mv_compensation_cycles_progress` — avancement cycles (REVOKE API)
- MV `mv_revision_stats` — stats globales révisions par org (REVOKE API)
- Fonction `refresh_compensation_mvs()` — refresh concurrent des MVs
- Index performance sur status, cycle_id, employee_id, org+year

#### Hooks (`src/hooks/useCompensation.js` — appends S74)
- Constantes : `REVIEW_WORKFLOW_STATUS_LABELS/COLORS`, `REVIEW_REASON_WORKFLOW_LABELS`, `CYCLE_STATUS_LABELS/COLORS`, `getWorkflowStatusInfo()`
- `useCompensationCycles()` — cycles par org
- `useCreateCycle()` / `useUpdateCycle()` / `useDeleteCycle()` — CRUD cycles
- `useCyclesProgress()` — avancement depuis MV
- `usePendingReviews()` — révisions en attente de validation
- `useAllReviews(filters)` — vue admin avec filtres
- `useTeamReviews()` — révisions équipe directe
- `useCreateRevision()` — soumettre demande (status soumis auto)
- `useApproveRevision()` — validation 2 niveaux (manager→RH)
- `useRefuseRevision()` — refus avec motif
- `useApplyRevision()` — application + création compensation_record
- `useRevisionStats()` — stats globales depuis MV
- `useRevisionBudgetSimulation(cycleId)` — impact total, avg%, par dept, distribution tranches
- `useRefreshCompensationMVs()` — refresh MVs admin

#### Composants S74 (dans `src/components/compensation/`)
- `RevisionWorkflow.jsx` — KPIs, WorkflowStepper 4 étapes, cartes révision avec actions inline (valider/refuser/appliquer), modal création, filtres statut
- `CycleRevision.jsx` — Gestion cycles : avancement, BudgetSimulationWidget, actions démarrer/clôturer, modal création
- `SimulationBudget.jsx` — Simulation : KPIs, alerte dépassement, jauge demi-cercle SVG, donut distribution, barres département
- `CompensationDashboardEnrichi.jsx` — Dashboard : KPIs révisions, alerte en attente, répartition statuts, cycles actifs, budget engagé

#### Page hub (`src/pages/compensation/Compensation.jsx`)
- 9 onglets : Dashboard(S74)/Ma rémunération/Benchmark/Historique/Révisions(S74)/Cycles(S74)/Simulation(S74)/Mon équipe/Administration
- Badges visuels "S74" sur les nouveaux onglets
- QuickStats enrichie : révisions actives + révisions à valider (rouge si > 0)

---

## Roadmap S75–S87 — Plan d'enrichissement modules

### Cycle RH opérationnel (S75)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S75** | **Onboarding — Parcours progressif automatisé** | 🔴 Haute | 🎯 Prochaine |

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
