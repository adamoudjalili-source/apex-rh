# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 83 — Succession & Talents — Vivier + gap analysis ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S83.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S83): Succession & Talents — Vivier + gap analysis" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 83
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1–18. (voir MEMOIRE_PROJET_S82.md)
19. **Intelligence RH — Bilan social + turnover DÉPLOYÉ (S82)**
20. **Succession & Talents — Vivier + gap analysis DÉPLOYÉ (S83)** :
    - `s83_succession_vivier.sql` — tables `talent_pool_entries` + `succession_gaps`, MV `mv_succession_coverage`, RPC `get_talent_gap_analysis` + `get_succession_coverage`, RLS, indexes
    - `useSuccessionVivier.js` — 7 hooks : useTalentPool, useAddToTalentPool, useRemoveFromTalentPool, useSuccessionGaps, useUpsertSuccessionGap, useTalentGapAnalysis, useSuccessionCoverage
    - `TalentPoolBoard.jsx` — kanban 3 colonnes (ready_now/1y/2y), cartes expandables avec barres de gap, modal ajout talent
    - `GapAnalysisChart.jsx` — radar SVG 8 compétences + histogramme gaps filtrés par priorité
    - `SuccessionMap.jsx` — grille postes avec couverture + panneau détail successeurs
    - `SuccessionVivierPage.jsx` — page 3 onglets (Vivier / Cartographie / Gap Analysis), alertes rapides, bouton refresh MV
    - `IntelligenceRH.jsx` — +onglet "Vivier & Relève" dans groupe Talent (adminOnly)

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
| `talent_pool_entries` | organization_id, user_id, target_role, target_position_id, readiness, skills_gap | NEW S83 |
| `succession_gaps` | organization_id, position_id, required_skills, current_coverage_pct | NEW S83 |

## MVs S83
- `mv_succession_coverage` — couverture postes clés (pool_count, readiness counts, is_at_risk) — REVOKE ALL
- `get_succession_coverage(p_org_id)` — RPC SECURITY DEFINER qui lit la MV
- `get_talent_gap_analysis(p_org_id)` — RPC SECURITY DEFINER, gaps agrégés par compétence

## Hooks S83 — référence rapide
```
useTalentPool(positionId?)        — vivier groupé par readiness
useAddToTalentPool()              — mutation : upsert talent pool entry
useRemoveFromTalentPool()         — mutation : supprimer du vivier
useSuccessionGaps(positionId?)    — gaps déclarés par poste
useUpsertSuccessionGap()          — mutation : créer/MAJ gap poste
useTalentGapAnalysis()            — RPC gaps agrégés par compétence
useSuccessionCoverage()           — RPC lecture MV + stats
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur mv_succession_coverage
- ✅ `talent_pool_entries.UNIQUE(organization_id, user_id, target_position_id)` — upsert par triplet
- ✅ `succession_gaps.UNIQUE(organization_id, position_id)` — upsert par paire
- ✅ `get_talent_gap_analysis` et `get_succession_coverage` — SECURITY DEFINER avec vérification org
- ✅ `succession_plans` et `talent_assessments` existent depuis S51/S55 — ne pas recréer
- ✅ `key_positions` existe depuis S51 — `target_position_id` référence cette table
- ✅ `talent_readiness` enum : 'ready_now' | 'ready_1y' | 'ready_2y'
- ✅ `useSuccessionVivier.js` : useQuery/useMutation/useQueryClient importés une seule fois en tête
