# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 75 — Onboarding — Parcours progressif automatisé ✅ DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **Commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_SXX.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(SXX): [description]" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 75
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 6 rôles DÉPLOYÉE (S69)** — Helpers AuthContext uniquement.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
5. **Multi-tenancy DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant.
6. **Réorganisation UX Hub & Spoke DÉPLOYÉE (S64)**.
7. **Congés — Moteur de règles DÉPLOYÉ (S70)**.
8. **Sécurité Supabase Hotfix post-S70** — 0 erreurs / 1 warning résiduel pg_trgm.
9. **Gestion des Temps — Règles HS + Export paie DÉPLOYÉ (S71)**.
10. **Recrutement — Pipeline structuré + scoring DÉPLOYÉ (S72)**.
11. **Formation — Budget + Obligatoire + Évaluation DÉPLOYÉ (S73)**.
12. **Compensation — Workflow révision salariale DÉPLOYÉ (S74)** :
    - `s74_compensation_workflow.sql` — extension enum, colonnes workflow, cycles, MVs, RLS
    - 14 hooks S74 dans `useCompensation.js`
    - `RevisionWorkflow.jsx`, `CycleRevision.jsx`, `SimulationBudget.jsx`, `CompensationDashboardEnrichi.jsx`
    - `Compensation.jsx` — 9 onglets
13. **Onboarding — Parcours progressif automatisé DÉPLOYÉ (S75)** :
    - `s75_onboarding_parcours.sql` — 3 enums, 4 tables, MV `mv_onboarding_progress`, fonction refresh, RLS
    - `useOnboarding.js` — 12 hooks S75 appended (voir liste ci-dessous)
    - `OnboardingTemplateManager.jsx` — CRUD templates + étapes avec modale
    - `MyOnboardingJourney.jsx` — timeline visuelle collaborateur + modale complétion
    - `TeamOnboardingDashboard.jsx` — suivi manager + alertes retard
    - `OnboardingAdminDashboard.jsx` — stats globales SVG donut, assignation, liste
    - `pages/onboarding/Onboarding.jsx` — hub 4 onglets : Mon parcours / Mon équipe / Templates / Administration
    - `Sidebar.jsx` — MapPin ajouté + route `/onboarding` dans les 3 vues
    - `App.jsx` — route `/onboarding` lazy

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les 6 rôles
- `collaborateur` — lecture seule sur ses propres données
- `manager` — + accès équipe directe
- `rh` — + accès org-wide, validation révisions
- `admin` — accès complet, cycles, application révisions
- `direction` — lecture org-wide + tableaux de bord
- `recruteur` — module recrutement uniquement

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canRecruit, canViewAnalytics } = useAuth()
// canAdmin       → role = 'admin'
// canValidate    → role IN ('admin','rh')
// canManageTeam  → role IN ('admin','rh','manager','direction')
```

---

## Tables critiques — référence

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `users` | id, organization_id, role, manager_id, full_name | PAS `profiles` |
| `compensation_records` | employee_id, salary_amount, **is_current**, effective_date | `is_current` PAS `current` |
| `compensation_reviews` | **user_id**, old_base_salary, new_base_salary, status, review_cycle_id | `increase_amount` et `increase_pct` GENERATED |
| `compensation_cycles` | organization_id, name, year, status, budget_envelope | NEW S74 |
| `onboarding_templates` | id, organization_id, name, target_role, target_department, is_active | NEW S75 |
| `onboarding_steps` | id, template_id, order_index, title, due_day_offset, assignee_type, category | NEW S75 |
| `onboarding_assignments` | id, organization_id, user_id, template_id, start_date, status | NEW S75 |
| `onboarding_step_completions` | id, assignment_id, step_id, user_id, status, completed_at, comment | NEW S75 |

---

## Hooks disponibles — onboarding (référence rapide)

### S40 (existants)
`useOnboarding` (wizard première connexion)

### S75 (nouveaux — dans useOnboarding.js)
`useOnboardingTemplates`, `useCreateTemplate`, `useUpdateTemplate`, `useDeleteTemplate`,
`useTemplateSteps`, `useCreateStep`, `useUpdateStep`, `useDeleteStep`,
`useAssignTemplate`, `useMyOnboardingProgress`, `useCompleteStep`,
`useTeamOnboardingProgress`, `useAllOnboardingProgress`, `useOnboardingStats`,
`useRefreshOnboardingMVs`

---

## Enums S75

```sql
onboarding_assignee_type : 'self' | 'manager' | 'rh'
onboarding_step_status   : 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
onboarding_step_category : 'administrative' | 'equipment' | 'access' | 'training' | 'meeting' | 'documentation' | 'other'
```

---

## Règles d'or techniques (jamais violer)

- ✅ `compensation_reviews.user_id` (PAS `employee_id`)
- ✅ `compensation_reviews.old_base_salary` / `new_base_salary` (PAS `current_salary` / `new_salary`)
- ✅ `increase_amount` et `increase_pct` sont GENERATED — ne JAMAIS les insérer
- ✅ `compensation_records.is_current` (pas `current`)
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif uniquement — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js` pour liste des users org (PAS `useOrgUsers`)
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT (mais src/Sidebar.jsx à la racine de src)
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated)
- ✅ Cast `::text` sur les nouvelles valeurs d'enum dans les MVs créées la même session
