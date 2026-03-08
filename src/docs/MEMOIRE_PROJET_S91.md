# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 91 — Module 9 Administration enrichi (08/03/2026)

## 🔴 RÈGLE D'OR — DÉMARRAGE OBLIGATOIRE (chaque session)

**L'utilisateur DOIT fournir en début de CHAQUE session :**
- **`APEX_RH_ARCHITECTURE_V2_S90.md`** (ou `APEX_RH_ARCHITECTURE_CIBLE_S90.md`) — document de référence architecture V2
- Sans ce document, Claude doit le demander avant de commencer tout développement.

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour**
6. **`APEX_RH_ARCHITECTURE_V2_S90.md` mis à jour** si architecture évolue
7. **Commande Git prête**

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 91

---

## Décisions architecturales critiques

(Voir MEMOIRE_PROJET_S90.md pour points 1–28)

29. **Module 9 Administration enrichi — Contrôle d'accès (S91)** :
    - `usePermission.js` Phase A créé (manquait de S90) — wrapper transparent sur AuthContext
    - PERMISSION_MATRIX complète : 9 modules × resources × actions → helper correspondant
    - `AccessControlMatrix.jsx` : tableau rôle × module interactif, lecture seule Phase A/B
    - `AccessControl.jsx` : page complète avec 2 onglets (Matrice + Journal RBAC)
    - Journal RBAC filtre `audit_logs WHERE category = 'rbac'` — pagination 20 entrées/page
    - Route `/admin/access-control` ajoutée dans App.jsx
    - Carte "Contrôle d'accès" ajoutée dans AdministrationHub.jsx
    - Guard RBAC : `can('admin', 'access_control', 'read')` — administrateur requis
    - ⚠️ Les surcharges individuelles restent dans fiche employé (Module 2, S96) — PAS ici

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE

### Les vrais noms en base
`collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`, `super_admin`

### Noms INTERDITS
❌ `direction` · ❌ `admin` · ❌ `rh` · ❌ `manager`

### Helpers AuthContext (toujours conserver)
```js
const { canAdmin, canValidate, canManageTeam, canManageOrg } = useAuth()
const { can, scope, hasRole } = usePermission()  // S91 — standard V2
```

---

## Tables critiques

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `pulse_alerts` | status · triggered_at · context_json · acknowledged_by | S76 |
| `user_permission_overrides` | user_id · module · resource · action · granted · expires_at | S90 |
| `org_module_settings` | module_key · is_enabled · permissions_version | S90 |
| `career_events` | user_id · event_type · old_value · new_value · effective_date | S90 |
| `audit_logs` | +target_user_id · +category ('action'\|'rbac'\|'admin') | S90 extension |

---

## Nouveaux fichiers S91

- `src/hooks/usePermission.js` — Phase A RBAC wrapper (manquait S90)
- `src/components/admin/AccessControlMatrix.jsx` — matrice lecture seule
- `src/pages/admin/AccessControl.jsx` — Contrôle d'accès (Matrice + Journal)
- `src/pages/administration/AdministrationHub.jsx` — carte ajoutée
- `src/App.jsx` — route `/admin/access-control`

---

## Règles d'or techniques (jamais violer)

- ✅ `users` · `organization_id` · `role::text` · SVG natif
- ✅ Helpers AuthContext conservés · `usePermission()` pour nouveaux composants
- ✅ `can('module', 'resource', 'action')` — jamais check rôle direct dans JSX
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `useDeleteObjective` → `{ id, periodId }` — PAS `id` seul
- ✅ Mat views → toujours via `v_*_secure`
- ✅ `pulse_alerts.status` enum : 'active' | 'acknowledged' | 'resolved' | 'dismissed'
- ✅ `logAudit()` sur changements rôle avec `category: 'rbac'`
- ✅ JAMAIS `'direction'`, `'admin'`, `'rh'`, `'manager'` dans SQL/JS
- ✅ Surcharges individuelles → fiche employé (S96) — PAS dans Administration
- ✅ Séquence 18 sessions respectée dans l'ordre

---

## 🔄 Tracker Phase C — Migration RBAC (S100→S107)

**Batch 1 — S100** :
- [ ] src/pages/admin/Users.jsx
- [ ] src/pages/admin/Integrations.jsx
- [ ] src/pages/admin/Organisation.jsx
- [ ] src/pages/admin/Notifications.jsx
- [ ] src/pages/compensation/Compensation.jsx
- [ ] src/pages/reconnaissances/Reconnaissances.jsx
- [ ] src/pages/mon-espace/MesReconnaissances.jsx
- [ ] src/components/admin/UserRoleSelector.jsx
- [ ] src/components/admin/ModuleToggle.jsx
- [ ] src/components/admin/OrgStructureManager.jsx

**Batch 2 — S101** :
- [ ] src/components/pulse/PulseAlertCenter.jsx
- [ ] src/components/pulse/TeamPulseHeatmap.jsx
- [ ] src/components/pulse/PulseCalibration.jsx
- [ ] src/components/pulse/PulseBoard.jsx
- [ ] src/components/pulse/PulseAnalytics.jsx
- [ ] src/pages/pulse/Board.jsx
- [ ] src/pages/pulse/Analytics.jsx
- [ ] src/pages/pulse/Team.jsx
- [ ] src/pages/ma-performance/MaPerformance.jsx
- [ ] src/pages/pulse/Journal.jsx

**Batch 3→8** : à détailler en S102+ (44 fichiers restants)
