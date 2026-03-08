# ROADMAP.md — APEX RH
> Mis à jour : Session 73 ✅ — Formation — Budget + Obligatoire + Évaluation — DÉPLOYÉ (08/03/2026)

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
| S1–S72 | (voir MEMOIRE_PROJET_S73.md) | ✅ Production |
| **S73** | **Formation — Budget + Obligatoire + Évaluation** | ✅ **DÉPLOYÉ** |

---

## Session 73 — Formation — Budget + Obligatoire + Évaluation ✅

### Livrables S73

#### SQL (`src/sql/s73_formation_budget_obligatoire.sql`)
- `training_catalog` + 5 colonnes : is_mandatory, mandatory_roles, mandatory_services, renewal_months, budget_cost
- `training_enrollments` + 6 colonnes : satisfaction_score/comment/at, effectiveness_score/comment/at
- `training_plans` + 4 colonnes : budget_allocated, budget_consumed, approved_by, approved_at
- `training_budget` — table NEW : budget par org/division/année avec RLS
- `training_mandatory_rules` — table NEW : règles formations obligatoires avec RLS
- MV `mv_mandatory_compliance` — conformité par formation + statut (REVOKE API)
- MV `mv_training_satisfaction` — agrégats satisfaction/efficacité (REVOKE API)
- Fonction `refresh_formation_mvs()` — refresh concurrent des MVs
- Fonction `update_budget_consumed()` — recalcul consommation budget

#### Hooks (`src/hooks/useFormations.js` — appends S73)
- `MANDATORY_TARGET_LABELS`, `COMPLIANCE_STATUS_LABELS`, `COMPLIANCE_STATUS_COLORS` — constantes
- `getComplianceInfo()` — helper statut conformité
- `useTrainingBudgets()` — budgets par année
- `useCreateOrUpdateBudget()` — CRUD budget organisation/division
- `useDeleteBudget()` — suppression budget
- `useBudgetConsumed()` — consommation temps réel depuis training_enrollments
- `useMandatoryRules()` — toutes les règles formations obligatoires actives
- `useCreateMandatoryRule()` — créer règle (all/role/service/division + renouvellement)
- `useDeleteMandatoryRule()` — soft delete règle
- `useMandatoryCompliance()` — conformité globale depuis MV
- `useMyMandatoryStatus()` — statut conformité user courant (calcul côté client)
- `useSubmitSatisfaction()` — soumettre note satisfaction + commentaire
- `useSubmitEffectiveness()` — soumettre note efficacité J+30 + commentaire
- `useMyPendingEvaluations()` — formations terminées sans évaluation complète
- `useFormationSatisfactionStats()` — stats depuis MV par formation
- `useGlobalEvaluationStats()` — stats globales évaluation pour admin
- `useRefreshFormationMVs()` — refresh MVs formation (admin)

#### Composants S73 (dans `src/components/formation/`)
- `FormationBudget.jsx` — Gestion budget : KPIs 3 cartes (alloué/consommé/solde), barre progression couleur adaptative, CRUD budget org/division, sélecteur année, alertes dépassement
- `FormationObligatoire.jsx` — 2 vues : Ma conformité (user) + Configuration règles (admin) ; badges conformité colorés, modal création règle par périmètre, stats % conformes depuis MV
- `FormationEvaluation.jsx` — Évaluations en attente + Stats admin ; StarRating interactive, jauge SVG satisfaction/efficacité, modal évaluation (satisfaction immédiate + efficacité J+30), taux participation, notes moyennes
- `FormationDashboardEnrichi.jsx` — Dashboard enrichi : KPIs taux complétion + heures, donut inscriptions SVG, barre budget, widget conformité obligatoires, stats évaluation agrégées

#### Page hub (`src/pages/formation/Formation.jsx`)
- 10 onglets : Dashboard(S73) / Catalogue / Mes formations / Évaluations(S73) / Obligatoires(S73) / Certifications / Mon plan / Équipe / Budget(S73) / Administration
- Badges visuels "S73" sur les nouveaux onglets
- QuickStats enrichie : alertes évaluations en attente + conformité obligatoires non réalisées

---

## Roadmap S74–S87 — Plan d'enrichissement modules

### Cycle RH opérationnel (S74–S75)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S74** | **Compensation — Workflow révision salariale** | 🔴 Haute | 🎯 Prochaine |
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
