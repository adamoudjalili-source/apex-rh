# ARCHITECTURE.md — APEX RH
> Mis à jour : Session 91 — Contrôle d'accès RBAC (08/03/2026)
> 🔴 V2 : 9 modules homogènes + RBAC 3 phases + zéro dette

## Stack
- React 18 + Vite + TailwindCSS + Supabase + Vercel
- SVG natif uniquement — jamais recharts/d3/chart.js
- Sidebar : `src/Sidebar.jsx` UNIQUEMENT

## Règles critiques
```
✅ organization_id sur TOUTES les tables — jamais org_id
✅ table users — jamais profiles
✅ role::text pour toute comparaison enum vs text[]
✅ JAMAIS 'direction', 'admin', 'rh', 'manager' dans SQL ou JS
✅ can('module', 'resource', 'action') via usePermission() — standard V2
✅ Helpers AuthContext conservés en permanence (canAdmin, canManageTeam, etc.)
✅ useDeleteObjective → { id, periodId } — jamais id seul
✅ Mat views → toujours via v_*_secure
✅ pulse_alerts : status/triggered_at/context_json
✅ logAudit() sur mutation sensible — category:'rbac' si droits
```

## Rôles valides (enum PostgreSQL)
```
super_admin > administrateur > directeur > chef_division > chef_service > collaborateur
```

## Modules V2 — 9 modules

| Module | Route | Statut |
|--------|-------|--------|
| 1 Mon Espace | `/mon-tableau-de-bord` | ✅ Existant |
| 2 Gestion Employés | `/employes` | 🔲 S96 |
| 3 Temps & Absences | `/temps-absences` | 🔲 S92 |
| 4 Cycle RH | `/cycle-rh` | 🔲 S98 |
| 5 Performance | `/performance` | 🔲 S93 |
| 6 Évaluations | `/evaluations` | 🔲 S94 |
| 7 Formation & Dév | `/developpement` | 🔲 S97 |
| 8 Intelligence RH | `/intelligence` | 🔲 S95 |
| 9 Administration | `/admin/*` | ✅ S91 enrichi |

## Nouveaux fichiers S91

- `src/hooks/usePermission.js` — Hook RBAC Phase A (wrapper AuthContext, zéro requête)
- `src/components/admin/AccessControlMatrix.jsx` — Matrice rôles × modules lecture seule
- `src/pages/admin/AccessControl.jsx` — Onglet Contrôle d'accès (Matrice + Journal RBAC)
- `src/pages/administration/AdministrationHub.jsx` — Carte "Contrôle d'accès" ajoutée
- `src/App.jsx` — Route `/admin/access-control` ajoutée

## Hook RBAC V2 — usePermission (Phase A)
```js
const { can, scope, hasRole } = usePermission()
can('admin', 'access_control', 'read')  // boolean
scope('conges', 'requests')              // 'own'|'team'|'division'|'org'|'all'
hasRole('chef_division')                 // boolean — héritage inclus
```

## Tables critiques

| Table | Notes |
|-------|-------|
| `audit_logs` | +target_user_id +category('action'\|'rbac'\|'admin') — S90 extension |
| `user_permission_overrides` | Surcharges RBAC individuelles — S90 |
| `org_module_settings` | Modules activables par org — S90 |
| `career_events` | Historique carrière — S90 |
| `pulse_alerts` | status\|triggered_at\|context_json — S76 |

## Vues sécurisées
`v_headcount_stats_secure` · `v_turnover_stats_secure` · `v_absenteeism_stats_secure`
`v_succession_coverage_secure` · `v_competency_coverage_secure`
