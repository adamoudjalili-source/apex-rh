# ROADMAP.md — APEX RH
> Mis à jour : Session 71 ✅ — Gestion des Temps — Règles HS + export paie — DÉPLOYÉ (08/03/2026)

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
| S70 | Congés — Moteur de règles complet | ✅ Production |
| S70b | Hotfix Sécurité — Security Advisor clean | ✅ Production |
| **S71** | **Temps — Règles heures sup + export paie** | ✅ **DÉPLOYÉ** |

---

## Session 71 — Gestion des Temps — Règles HS + export paie ✅

### Livrables S71

#### SQL (`src/sql/s71_temps_heures_sup.sql`)
- `time_settings` + 9 colonnes : daily_threshold_hours, weekly_threshold_hours, ot_rate_25_after, ot_rate_50_after, ot_rate_100_after, submission_deadline_days, alert_enabled, overtime_requires_approval, overtime_calc_mode
- `time_sheets` + 8 colonnes : regular_hours, ot_25_hours, ot_50_hours, ot_100_hours, overtime_approved, overtime_approved_by, overtime_approved_at, overtime_rejected_reason
- MV `mv_overtime_monthly_summary` — synthèse mensuelle HS par collaborateur (REVOKE API)

#### Hooks (`src/hooks/useTemps.js` — appends S71)
- `calculateOvertimeBreakdown()` — calcul HS modes journalier / hebdo / both
- `DEFAULT_OT_SETTINGS` + `OT_MODES` — constantes exportées
- `useRecalculateOvertime()` — recalcul HS feuille unique
- `useRecalculateOrgOvertime()` — recalcul global organisation
- `useApproveOvertime()` + `useRejectOvertime()` — workflow validation manager
- `useOvertimeAlerts()` — alertes proactives (retard, pending, volume élevé)
- `useExportOvertimePayroll()` — export XLSX/CSV mensuel 2 feuilles (récap + détail)
- `usePendingOvertimeSheets()` — feuilles HS soumises en attente

#### Composants S71 (dans `src/components/temps/`)
- `OvertimeRulesEngine.jsx` — config seuils/taux/modes + aperçu barème + recalcul org
- `OvertimeSummary.jsx` — 4 semaines glissantes avec barres empilées SVG + navigation
- `OvertimeValidation.jsx` — approbation/refus HS par managers + historique
- `OvertimeAlerts.jsx` — panneau alertes proactives avec filtres sévérité/type
- `OvertimePayrollExport.jsx` — export paie mensuel + aperçu stats + colonnes

#### Page hub (`src/pages/temps/GestionTemps.jsx`)
- 5 onglets : Ma Feuille / Mon Équipe / Heures Sup. / Alertes (`canValidate`) / Administration (`canAdmin`)
- Badge rouge sur onglet Alertes si alertes critiques
- Sous-navigation Équipe : Feuilles / Validation HS
- Sous-navigation Admin : Général / Règles heures sup. / Export paie

---

## Roadmap S72–S87 — Plan d'enrichissement modules

### Cycle RH opérationnel (S72–S75)

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S72** | **Recrutement — Pipeline structuré + scoring** | 🔴 Haute | 🎯 Prochaine |
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

## Brief S72 — Recrutement — Pipeline structuré + scoring

### Problème actuel
Le module Recrutement (S59–S63) existe à ~50%. Les candidatures arrivent mais il n'y a pas de pipeline visuel structuré, pas de scoring automatique des candidats, pas de suivi d'étapes configurables par poste.

### Livrables S72
- Pipeline visuel kanban par offre : colonnes configurables (Candidature → Pré-sélection → Entretien RH → Entretien manager → Offre → Embauché / Refusé)
- Scoring candidat automatique : matching CV ↔ profil recherché (compétences, expérience)
- Tableau de bord recrutement : time-to-hire, taux conversion par étape, sources
- Actions rapides : planifier entretien, envoyer feedback, déplacer étape
- Filtres avancés : source, score, statut, date

### Contraintes S72
- ✅ Helpers S69 : `canAdmin`, `canValidate` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Tables existantes : `job_postings`, `job_applications`, `interview_schedules`, `interview_feedback`, `recruitment_stages`
