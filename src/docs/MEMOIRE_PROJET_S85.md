# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 85 — Offboarding — Automatisation + solde auto ✅ DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour** (nouvelles tables, règles d'or, nouveaux modules)
6. **Commande Git prête à copier-coller** pour déployer sur Vercel
7. `README.md` **uniquement si** stack / installation / structure a changé

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S85.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S85): Offboarding — Automatisation + solde auto" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 85
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1–20. (voir MEMOIRE_PROJET_S84.md)
21. **Référentiel Compétences — Cartographie + gaps DÉPLOYÉ (S84)**
22. **Offboarding — Automatisation + solde auto DÉPLOYÉ (S85)** :
    - `s85_offboarding_automation.sql` — ALTER offboarding_processes (+departure_id, +auto_triggered), vue `v_offboarding_dashboard`, RPC `calculate_final_settlement`, RPC `auto_create_offboarding`, trigger `trg_auto_offboarding` sur employee_departures INSERT, index overdue
    - `useOffboardingS85.js` — 6 hooks : useOffboardingDashboard, useOffboardingAlerts, useFinalSettlement, useApplySettlementToProcess, useAutoCreateOffboarding, useOffboardingByDeparture, useCompleteOffboarding
    - `OffboardingDashboard.jsx` — dashboard RH avec KPIs, filtres alertes/on_track, ProcessRow avec urgence + progression, bannière auto-trigger
    - `FinalSettlementCard.jsx` — calcul auto depuis RPC (leave_balances + compensation_records), détail CP/RTT/taux journalier, bouton "Appliquer au dossier", écart vs montant enregistré
    - `Offboarding.jsx` modifié — +onglet Dashboard (adminOnly, défaut pour admins), FinalSettlementCard intégré dans onglet Solde, badge alertes sur onglet Dashboard, import useOffboardingAlerts
    - **NOTE S85** : `useOffboarding.js` (S68) NON écrasé. Nouveaux hooks dans `useOffboardingS85.js`. Composants existants (FinalSettlementPanel, OffboardingChecklist, etc.) NON écrasés.

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les vrais noms en base
- `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canManageOrg } = useAuth()
```

---

## Tables critiques — référence

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `users` | id, organization_id, role, manager_id | PAS `profiles` |
| `compensation_records` | employee_id, salary_amount, **is_current** | `is_current` PAS `current` |
| `compensation_reviews` | **user_id**, old_base_salary, new_base_salary | `increase_amount/pct` GENERATED |
| `annual_reviews` | ..., **review_type** | S80 : 'annual' \| 'mid_year' \| 'probation' |
| `feedback360_requests` | cycle_id, evaluatee_id, evaluator_id, relationship, status, answers, is_anonymous | S81 |
| `employee_departures` | organization_id, user_id, departure_date, reason, type, rehirable | S82 |
| `talent_pool_entries` | organization_id, user_id, target_role, target_position_id, readiness, skills_gap | S83 |
| `succession_gaps` | organization_id, position_id, required_skills, current_coverage_pct | S83 |
| `competency_categories` | organization_id, name, color, icon, order_index | S84 |
| `competencies` | organization_id, category_id, name, description, levels jsonb, is_active | S84 |
| `role_competency_requirements` | organization_id, role_name OR position_id, competency_id, required_level, weight | S84 |
| `user_competency_assessments` | organization_id, user_id, competency_id, assessed_level, assessed_by, source | S84 |
| `offboarding_processes` | +departure_id, +auto_triggered | S85 ALTER |
| `offboarding_templates` | organization_id, name, steps jsonb, is_default | S68 (inchangé) |
| `offboarding_checklists` | process_id, organization_id, title, category, due_date, status | S68 (inchangé) |

## Vues S85
- `v_offboarding_dashboard` — processus + total_tasks / done_tasks / overdue_tasks / days_until_exit, infos user

## RPCs S85
- `calculate_final_settlement(p_user_id, p_org_id)` → JSONB {monthly_salary, daily_rate, cp_balance, rtt_balance, cp_amount, rtt_amount, total_amount, computed_at}
- `auto_create_offboarding(p_departure_id)` → UUID (process_id) — SECURITY DEFINER, idempotent

## Trigger S85
- `trg_auto_offboarding` AFTER INSERT ON employee_departures → appelle auto_create_offboarding, silencieux sur erreur

## Hooks S85 — référence rapide
```
useOffboardingDashboard()           — vue consolidée v_offboarding_dashboard
useOffboardingAlerts()              — sous-ensemble : processus avec retard ou départ < 7j
useFinalSettlement(userId)          — RPC calcul solde auto
useApplySettlementToProcess()       — mutation : appliquer solde calculé au process
useAutoCreateOffboarding()          — mutation : auto_create_offboarding(departureId)
useOffboardingByDeparture(depId)    — process lié à un departure_id
useCompleteOffboarding()            — mutation : status→completed + final_amount_paid_at
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `useCompetencyFramework.js` (S42) — NE PAS ÉCRASER
- ✅ `useOffboarding.js` (S68) — NE PAS ÉCRASER — hooks S85 dans `useOffboardingS85.js`
- ✅ `employee_departures` (S82) est la source de vérité pour les départs
- ✅ `leave_balances` + `compensation_records.is_current` pour le calcul de solde auto
- ✅ `calculate_final_settlement` — SECURITY DEFINER avec vérification org
- ✅ `auto_create_offboarding` — idempotent : ne crée pas si processus en_cours existe déjà
- ✅ Trigger `trg_auto_offboarding` — silencieux sur erreur (RAISE WARNING, ne bloque pas INSERT)
- ✅ `v_offboarding_dashboard` — pas de RLS directe, hérite des tables sous-jacentes
- ✅ Toutes les règles S84 restent valides
