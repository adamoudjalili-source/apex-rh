# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 88 — Audit + Corrections bugs S70→S87 ✅ DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête à copier-coller**

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S88.zip src/
```
**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "fix(S88): Audit bugs S70→S87 — pulse_alerts + role::text + formation org_id + navigation congés/temps/offboarding + NotificationRulesAdmin" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 88

---

## Décisions architecturales critiques

1–24. (voir MEMOIRE_PROJET_S87.md)
25. **Audit S88 — Corrections bugs S70→S87 DÉPLOYÉ (S88)** :
    - **BUG-C1 CORRIGÉ** : `usePulseAlerts.js` — `performance_alerts` → `pulse_alerts` (table réelle créée par S76). FK join aussi corrigé.
    - **BUG-C3 CORRIGÉ** : `s88_fixes.sql` — `dispatch_notification` + `process_notification_escalations` : `role = ANY(...)` → `role::text = ANY(...)` (enum cast S86)
    - **BUG-C4 CORRIGÉ** : `useFormations.js` — `useTrainingBudgets` + `useBudgetConsumed` : ajout `organization_id` filter + `enabled: !!orgId` + `orgId` dans queryKey
    - **BUG-M1 CORRIGÉ** : `Sidebar.jsx` — ajout `/conges`, `/temps`, `/offboarding` dans les sections admin et manager
    - **BUG-M2 CORRIGÉ** : `Settings.jsx` — montage `NotificationRulesAdmin` dans l'onglet "Règles Notifications" (TABS_ADMIN)
    - **BUG-M3 CORRIGÉ** : `s88_fixes.sql` — seed règle `announcement_important` pour les orgs existantes
    - **BUG-C2 CORRIGÉ** : `s88_fixes.sql` — ALTER TABLE communication_* pour FKs `profiles` → `users` + policies RLS `org_id` → `organization_id`
    - **BUG-M4 CORRIGÉ** : `s88_fixes.sql` — vues wrapper sécurisées `v_*_secure` sur les mat views S82/S83/S84
    - **BUG-M5 CORRIGÉ** : `useFormations.js` — `useDeleteBudget` + `useCreateOrUpdateBudget` queryKey invalidation `['training-budget']` (préfixe large)

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les vrais noms en base
- `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canManageOrg } = useAuth()
```

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `role::text` pour toute comparaison role (enum) avec text ou text[]
- ✅ Toujours `enabled: !!orgId` + `organization_id` dans queryKey pour les hooks de budget/ressources
- ✅ `pulse_alerts` (S76) — PAS `performance_alerts` (table inexistante)
- ✅ `v_*_secure` pour requêter les vues matérialisées S82/S83/S84 (voir s88_fixes.sql)
- ✅ `NotificationRulesAdmin` est monté dans `/admin/settings` onglet "Règles Notifications"
- ✅ Toutes les règles S87 restent valides
