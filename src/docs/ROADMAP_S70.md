# ROADMAP.md — APEX RH
> Mis à jour : Session 70 ✅ — Congés — Moteur de règles complet — DÉPLOYÉ EN PRODUCTION (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET** (l'utilisateur remplace son dossier src/ local)

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_SXX.zip src/
```

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
| **S70** | **Congés — Moteur de règles complet** | ✅ **DÉPLOYÉ** |

---

## Session 70 — Congés — Moteur de règles ✅

### Livrables S70

#### SQL (`src/sql/s70_conges_moteur_regles.sql`)
- `leave_types` + `accrual_rate`, `accrual_enabled`, `contract_types[]`, `carry_over_policy`, `carry_over_max_days`
- `leave_balances` + `accrued_days`, `carried_over`, `expiry_date`
- `leave_settings` + `public_holidays jsonb[]`, `carry_over_deadline`, `low_balance_threshold`, `pending_alert_hours`, `accrual_day`

#### Hooks (`src/hooks/useConges.js`)
- `SENEGAL_PUBLIC_HOLIDAYS_DEFAULT` — 15 jours fériés sénégalais (fixes + mobiles)
- `countWorkDays()` — exclut maintenant les jours fériés actifs du décompte
- `calculateAccruedDays()` — calcul pro-rata par date entrée + contrat
- `useRecalculateBalances()` — recalcul automatique pour toute l'org
- `useApplyCarryOver()` — application report N-1 → N avec politique par type
- `useLeaveAlerts()` — alertes proactives (pending, low_balance, expiry)
- `useExportPayroll()` — export paie mensuel CSV/XLSX

#### Composants S70 (dans `src/components/conges/`)
- `PublicHolidaysManager.jsx` — gestion jours fériés avec import liste Sénégal
- `LeaveRulesEngine.jsx` — config acquisition + report par type de congé + actions moteur
- `LeaveAlerts.jsx` — panneau alertes proactives avec filtres sévérité/type
- `LeavePayrollExport.jsx` — export paie mensuel avec aperçu colonnes

#### Page hub (`src/pages/conges/GestionConges.jsx`)
- 4 onglets : Mes Congés / Mon Équipe / Alertes (`canValidate`) / Administration (`canAdmin`)
- Badge rouge dynamique sur onglet Alertes si alertes critiques
- Sous-navigation admin : Général / Règles d'accrual / Jours fériés / Export paie

---

## Roadmap S71–S87 — Plan d'enrichissement modules

### Cycle RH opérationnel (S71–S75)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S71** | **Temps — Règles heures sup + export paie** | 🔴 Haute | 🎯 Prochaine |
| S72 | Recrutement — Pipeline structuré + scoring | 🔴 Haute | ⏳ Planifiée |
| S73 | Formation — Budget + obligatoire + évaluation | 🔴 Haute | ⏳ Planifiée |
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

---

## Brief S71 — Gestion des Temps — Règles heures sup + export paie

### Problème actuel
Le module Gestion des Temps (S66) existe à ~45%. Les feuilles de temps sont saisies mais il n'y a aucune règle sur les heures supplémentaires, pas de seuils configurables, pas d'export structuré pour la paie.

### Livrables S71
- Règles heures supplémentaires : seuil légal configurable (ex : >8h/jour ou >40h/semaine → HS)
- Taux de majoration par tranche (25%, 50%, 100%) configurables par admin
- Récapitulatif hebdomadaire automatique : normal / HS 25% / HS 50%
- Validation manager des HS avec workflow similaire congés
- Export paie mensuel structuré : heures normales + HS par collaborateur
- Alertes proactives : dépassement seuil HS, feuille non soumise

### Contraintes S71
- ✅ Helpers S69 : `canAdmin`, `canValidate` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Enrichir `time_settings` — pas de nouvelle table si possible
