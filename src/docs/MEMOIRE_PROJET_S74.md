# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 74 — Compensation — Workflow révision salariale ✅ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour  
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET** (l'utilisateur remplace son dossier src/ local)
5. **Commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP (toujours la même) :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_SXX.zip src/
```

**Commande Git déploiement (toujours la même) :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(SXX): [description session]" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 74
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 3 vues MIGRÉE vers 6 vues (S69)** — Voir section rôles ci-dessous.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **Ma Performance COMPLÈTE (S40)** + transparency (S42) + Rapports IA (S44).
5. **Mon Développement COMPLET (S41)** + IA Coach (S43).
6. **Référentiel Compétences DÉPLOYÉ (S42)**.
7. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
8. **Reporting Automatisé IA DÉPLOYÉ (S44)**.
9. **NITA Temps Réel DÉPLOYÉ (S45)**.
10. **Analytics Prédictifs DÉPLOYÉ (S46)**.
11. **Tableau de Bord DRH DÉPLOYÉ (S47)**.
12. **Dashboard Direction Générale DÉPLOYÉ (S48)**.
13. **OKR Enterprise DÉPLOYÉ (S50)** — Cascade parent-enfant + KPI custom.
14. **Succession Planning DÉPLOYÉ (S51)**.
15. **Multi-tenancy Foundation DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant.
16. **API Ouverte & Connecteurs SIRH DÉPLOYÉ (S53)**.
17. **Behavioral Intelligence Engine DÉPLOYÉ (S54)**.
18. **Calibration Multi-niveaux & eNPS Enrichi DÉPLOYÉ (S55)**.
19. **Alertes Push & Onboarding Enrichi DÉPLOYÉ (S56)**.
20. **Module Formation & Certifications DÉPLOYÉ (S57)**.
21. **Compensation & Benchmark Salarial DÉPLOYÉ (S58)**.
22. **Portail Candidats & Recrutement Light DÉPLOYÉ (S59)**.
23. **Entretiens annuels & Évaluation avancée DÉPLOYÉ (S60)**.
24. **IA Recrutement DÉPLOYÉ (S61)**.
25. **CV Parser IA DÉPLOYÉ (S63)**.
26. **Réorganisation UX Hub & Spoke DÉPLOYÉ (S64)**.
27. **Communication Interne DÉPLOYÉ (S65)**.
28. **Gestion des Temps DÉPLOYÉ (S66)**.
29. **Congés & Absences DÉPLOYÉ (S67)**.
30. **Offboarding DÉPLOYÉ (S68)**.
31. **Restructuration UX Navigation 6 rôles DÉPLOYÉ (S69)**.
32. **Congés — Moteur de règles DÉPLOYÉ (S70)**.
33. **Sécurité Supabase — Hotfix post-S70** : 0 erreurs / 1 warning résiduel pg_trgm.
34. **Gestion des Temps — Règles HS + Export paie DÉPLOYÉ (S71)**.
35. **Recrutement — Pipeline structuré + scoring DÉPLOYÉ (S72)**.
36. **Formation — Budget + Obligatoire + Évaluation DÉPLOYÉ (S73)**.
37. **Compensation — Workflow révision salariale DÉPLOYÉ (S74)** :
    - `s74_compensation_workflow.sql` — colonnes compensation_reviews (status, submitted_at, manager_approved_by/at, hr_approved_by/at, applied_at, refused_reason, review_cycle_id), table compensation_cycles, FK review→cycle, RLS cycles, MV mv_compensation_cycles_progress, MV mv_revision_stats, fonction refresh_compensation_mvs(), index performance
    - `useCompensation.js` — appends S74 :
      - Constantes : `REVIEW_WORKFLOW_STATUS_LABELS`, `REVIEW_WORKFLOW_STATUS_COLORS`, `REVIEW_REASON_WORKFLOW_LABELS`, `CYCLE_STATUS_LABELS`, `CYCLE_STATUS_COLORS`, `getWorkflowStatusInfo()`
      - `useCompensationCycles()` — cycles par org
      - `useCreateCycle()` — créer cycle
      - `useUpdateCycle()` — modifier cycle (statut, dates, budget)
      - `useDeleteCycle()` — supprimer cycle
      - `useCyclesProgress()` — avancement cycles depuis MV
      - `usePendingReviews()` — révisions en attente de validation (manager ou RH)
      - `useAllReviews(filters)` — toutes révisions filtrable par statut/cycle (admin)
      - `useTeamReviews()` — révisions équipe directe (manager)
      - `useCreateRevision()` — soumettre demande révision (status=soumis auto)
      - `useApproveRevision()` — valider (manager→valide_manager, RH/admin→valide_rh)
      - `useRefuseRevision()` — refuser avec motif
      - `useApplyRevision()` — appliquer révision validée (création nouveau compensation_record)
      - `useRevisionStats()` — stats globales depuis MV
      - `useRevisionBudgetSimulation(cycleId)` — simulation impact (total, moyenne %, par dept, distribution tranches)
      - `useRefreshCompensationMVs()` — refresh MVs
    - `RevisionWorkflow.jsx` — KPIs en-tête, WorkflowStepper (4 étapes SVG), cartes révision (salaire actuel/proposé/hausse %), modal création révision, formulaires inline validation/refus, filtres par statut
    - `CycleRevision.jsx` — Gestion cycles : cartes avec avancement (barre progression), BudgetSimulationWidget inline, actions Démarrer/Clôturer, modal création cycle avec enveloppe budget
    - `SimulationBudget.jsx` — Simulation : sélecteur cycle, KPIs impact, alerte dépassement, jauge budget SVG demi-cercle, donut distribution augmentations, barres horizontales par département
    - `CompensationDashboardEnrichi.jsx` — Dashboard S74 : KPIs (total/en attente/appliquées/hausse moy.), alerte révisions en attente, répartition statuts barres, cycles actifs avec progression, budget engagé par cycle
    - `Compensation.jsx` — 9 onglets : Dashboard(S74)/Ma rémunération/Benchmark/Historique/Révisions(S74)/Cycles(S74)/Simulation(S74)/Mon équipe/Administration — badges S74, QuickStats enrichie (révisions actives + à valider)

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (implémenté S69)

### Les 6 rôles
- `collaborateur` — accès lecture seule sur ses propres données
- `manager` — + accès équipe directe (manager_id = profile.id dans users)
- `rh` — + accès org-wide RH, validation révisions
- `admin` — accès complet, configuration, cycles, application révisions
- `direction` — accès lecture org-wide + tableaux de bord
- `recruteur` — accès module recrutement uniquement

### Helpers AuthContext (S69) — TOUJOURS utiliser ces helpers
```js
const { canAdmin, canValidate, canManageTeam, canRecruit, canViewAnalytics } = useAuth()
// canAdmin       → role IN ('admin')
// canValidate    → role IN ('admin', 'rh')  
// canManageTeam  → role IN ('admin', 'rh', 'manager', 'direction')
// canRecruit     → role IN ('admin', 'rh', 'recruteur')
// canViewAnalytics → role IN ('admin', 'rh', 'direction')
```

---

## Tables critiques — référence

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `users` | id, organization_id, role, manager_id, full_name, email | PAS `profiles` |
| `compensation_records` | employee_id, salary_amount, is_current, effective_date, currency | `is_current` PAS `current` |
| `compensation_reviews` | employee_id, current_salary, new_salary, review_reason, status, review_cycle_id, ... | `increase_amount` et `increase_pct` sont GENERATED — ne pas insérer |
| `compensation_cycles` | organization_id, name, year, start_date, end_date, status, budget_envelope | NEW S74 |
| `salary_grades` | id, code, label, category, min_salary, mid_salary, max_salary, currency | — |

---

## Règles d'or techniques (jamais violer)

- ✅ `compensation_reviews.increase_amount` et `increase_pct` sont GENERATED — ne JAMAIS les insérer
- ✅ `compensation_records.is_current` (pas `current`)
- ✅ Table `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers S69 uniquement pour les guards de rôles
- ✅ SVG natif uniquement — pas de recharts
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT
- ✅ Motions : `framer-motion` uniquement
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated) pour sécurité
