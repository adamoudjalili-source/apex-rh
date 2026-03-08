# AUDIT_S88.md — Bilan d'exécution S70→S87
> Date : 08/03/2026 · Session S88 — Audit complet + plan de correction

---

## 🔴 BUGS CRITIQUES (données invisibles ou crash garanti)

### BUG-C1 — S76 PulseAlerts : mauvaise table (`performance_alerts` → `pulse_alerts`)
**Sévérité** : 🔴 CRITIQUE — toutes les alertes PULSE sont invisibles  
**Fichier** : `src/hooks/usePulseAlerts.js` (lignes 49, 51, 191, 214)  
**Symptôme** : `usePulseAlerts` query la table `performance_alerts` qui **n'existe pas** en base. S76 a créé `pulse_alerts`. Résultat : zéro alerte affichée dans PulseAlertCenter, erreur Supabase silencieuse.

```js
// ❌ ACTUEL
.from('performance_alerts')

// ✅ CORRECTION
.from('pulse_alerts')
```

**Étendue** : 3 occurrences dans `usePulseAlerts.js`  
**FK join à corriger aussi** :
```js
// ❌ ACTUEL
user:users!performance_alerts_user_id_fkey(id, first_name, last_name)
// ✅ CORRECTION
user:users!pulse_alerts_user_id_fkey(id, first_name, last_name)
```

---

### BUG-C2 — S65 SQL : 26× `profiles` + 29× `org_id` dans `migration_s65_communication.sql`
**Sévérité** : 🔴 CRITIQUE — migration SQL invalide, FKs cassées  
**Fichier** : `src/sql/migration_s65_communication.sql`  
**Symptôme** : La migration référence `profiles(id)` comme FK sur toutes les tables de communication. La table `profiles` n'existe pas dans ce projet (`users` est la bonne table). De plus, les colonnes RLS utilisent `org_id` au lieu de `organization_id`. Les joins dans les hooks JS sont cassés en production car la FK Supabase générée est `_profiles_fkey` alors que les hooks cherchent `_users_fkey`.

**Impact direct sur `useAnnonces.js`** :
```js
// ❌ ACTUEL (ligne 27)
author:users!communication_announcements_author_id_fkey(...)
// Cette FK n'existe pas — la vraie FK pointe vers profiles

// ✅ APRÈS CORRECTION SQL : la FK sera bien _users_fkey
```

**Occurrences dans migration_s65_communication.sql** :
- FKs cassées : `communication_announcements`, `communication_channels`, `communication_messages`, `communication_fil_posts`, `communication_announcement_comments`, `communication_user_presence` → toutes référencent `profiles(id)` au lieu de `users(id)`
- RLS cassée : `org_id = (SELECT org_id FROM profiles ...)` → `organization_id = (SELECT organization_id FROM users ...)`

**Correction SQL requise** : voir `s88_fixes.sql` section S65

---

### BUG-C3 — S86 Notification Engine : enum `role` vs `text` (2 occurrences)
**Sévérité** : 🔴 CRITIQUE — dispatch_notification et process_escalations silencieusement cassés  
**Fichier** : `src/sql/s86_notification_engine.sql`

**Occurrence 1** (ligne 161, fonction `dispatch_notification`) :
```sql
-- ❌ ACTUEL : si role est un type enum, comparaison avec text[] échoue
AND role = ANY(v_rule.target_roles)

-- ✅ CORRECTION
AND role::text = ANY(v_rule.target_roles)
```

**Occurrence 2** (ligne 258, fonction `process_notification_escalations`) :
```sql
-- ❌ ACTUEL
AND role = v_notif.escalate_to_role

-- ✅ CORRECTION
AND role::text = v_notif.escalate_to_role
```

**Impact** : Toute notification ciblée par rôle (règles `target_roles`) ne se distribue à personne. L'escalade ne fonctionne pas non plus. Les erreurs sont absorbées par le `EXCEPTION WHEN OTHERS THEN NULL` en fin de fonction → silence total en production.

---

### BUG-C4 — S73 Formation Budget : absence de filtre `organization_id` + `enabled` manquant
**Sévérité** : 🔴 CRITIQUE — cache partagé entre organisations + pas de guard  
**Fichier** : `src/hooks/useFormations.js` (fonctions `useTrainingBudgets`, `useBudgetConsumed`)

```js
// ❌ ACTUEL — useTrainingBudgets
return useQuery({
  queryKey: ['training-budget', year],   // ← orgId absent du queryKey !
  queryFn: async () => {
    const { data, error } = await supabase
      .from('training_budget')
      .select('*')
      .eq('year', year)                   // ← PAS de .eq('organization_id', orgId) !
      // RLS protège les données mais le cache React Query est pollué
  },
  // ← PAS de enabled: !!orgId
})

// ✅ CORRECTION
const { profile } = useAuth()
const orgId = profile?.organization_id
return useQuery({
  queryKey: ['training-budget', orgId, year],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('training_budget')
      .select('*')
      .eq('organization_id', orgId)
      .eq('year', year)
      .order('division_id', { ascending: true, nullsFirst: true })
    if (error) throw error
    return data || []
  },
  enabled: !!orgId,
  staleTime: 2 * 60 * 1000,
})
```

**Même problème** dans `useBudgetConsumed` — queryKey sans orgId, pas de filtre org.

---

## 🟠 BUGS MOYENS (fonctionnalités dégradées)

### BUG-M1 — Navigation : `/conges`, `/temps`, `/offboarding` absents de la Sidebar
**Sévérité** : 🟠 MOYEN — modules inaccessibles sans connaître l'URL  
**Fichiers concernés** : `src/Sidebar.jsx`

Les routes `/conges`, `/temps` et `/offboarding` existent dans `App.jsx` et leurs pages/hooks sont fonctionnels, mais **aucun lien n'est présent** dans la Sidebar, ManagementHub ou AdministrationHub. Un utilisateur ne peut pas y accéder via la navigation normale.

| Module | Route | Session | Sidebar | Hub |
|--------|-------|---------|---------|-----|
| Congés & Absences | `/conges` | S67+S70 | ❌ absent | ❌ absent |
| Gestion des Temps | `/temps` | S66+S71 | ❌ absent | ❌ absent |
| Offboarding | `/offboarding` | S68+S85 | ❌ absent | ❌ absent |

**Correction** : Ajouter dans Sidebar.jsx (section RH Opérationnel, profils admin/DRH) et/ou dans ManagementHub/AdministrationHub.

---

### BUG-M2 — S86 NotificationRulesAdmin : composant orphelin (non monté nulle part)
**Sévérité** : 🟠 MOYEN — admin ne peut pas configurer les règles de notification  
**Fichier** : `src/components/NotificationRulesAdmin.jsx`

Le composant `NotificationRulesAdmin.jsx` est complet et fonctionnel mais n'est importé **nulle part** dans l'application. L'admin ne peut donc pas créer/modifier les règles de dispatch via l'UI.

**Correction** : L'intégrer dans la page Settings (`/admin/settings`) ou dans NotificationBell avec onglet admin.

---

### BUG-M3 — S86 Seed manquant : règle `announcement_important` absente
**Sévérité** : 🟠 MOYEN — dispatch_notification S87 n'a aucune règle cible  
**Contexte** : `useCommunicationS87.js` appelle `dispatch_notification` avec `p_event_type: 'announcement_important'` quand une annonce est marquée `important=true`. Mais le seed SQL de S86 ne contient **aucune règle** pour l'événement `announcement_important`. Résultat : dispatch appelé, 0 notification générée.

**Correction** : Ajouter une règle seed dans `s88_fixes.sql` pour l'event `announcement_important`.

---

### BUG-M4 — S82/S83/S84 Vues matérialisées : isolation multi-tenant côté DB absente
**Sévérité** : 🟠 MOYEN — sécurité multi-tenant insuffisante  
**Vues concernées** : `mv_headcount_stats`, `mv_turnover_stats`, `mv_absenteeism_stats` (S82), `mv_succession_coverage` (S83), `mv_competency_coverage` (S84)

Les vues matérialisées **ne supportent pas le RLS** de Supabase. Le filtrage `organization_id` repose entièrement sur le code JavaScript des hooks. Si un acteur malveillant accède directement à ces vues via l'API Supabase (clé anon), il voit toutes les organisations.

**Correction recommandée** : Créer des wrapper views régulières avec RLS qui lisent les mat views.

```sql
-- Exemple pour mv_headcount_stats
CREATE OR REPLACE VIEW v_headcount_stats_secure AS
  SELECT * FROM mv_headcount_stats
  WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid());
ALTER VIEW v_headcount_stats_secure ENABLE ROW LEVEL SECURITY; -- Supabase support
```

---

### BUG-M5 — S73 Formation : `useTrainingBudgets` queryKey instable + `useDeleteBudget` invalide
**Sévérité** : 🟠 MOYEN — invalidation cache incorrecte  
**Fichier** : `src/hooks/useFormations.js`

`useDeleteBudget` invalide `['training-budget', year]` mais après correction C4, la queryKey devient `['training-budget', orgId, year]`. L'invalidation actuelle ne matche plus la query existante.

---

## 🟡 AVERTISSEMENTS (UX / Maintenabilité)

### WARN-1 — S83/S84 Succession & Compétences : accessibilité indirecte uniquement
**Sévérité** : 🟡 AVERTISSEMENT  
Les modules S83 (Vivier & Relève) et S84 (Référentiel Compétences) sont accessibles uniquement via `IntelligenceRH > Talent`, et seulement pour les `adminOnly`. Aucun lien direct. Acceptable si c'est voulu.

---

### WARN-2 — S76 PulseAlertCenter : dépendance à `pulse_alert_rules` non utilisée dans le hook
**Sévérité** : 🟡 AVERTISSEMENT  
`usePulseAlerts.js` implémente `useCreateAlert` / `useResolveAlert` qui font référence à la table `pulse_alerts` correcte (après correction BUG-C1), mais la table `pulse_alert_rules` (config des seuils auto) n'est pas consommée par le hook — seule la création manuelle fonctionne. La génération automatique d'alertes par dépassement de seuil (feature clé S76) n'a pas de hook correspondant.

---

### WARN-3 — S78 OKR check-ins : queryKey `['objectives']` trop large
**Sévérité** : 🟡 AVERTISSEMENT  
Plusieurs mutations OKR invalident `['objectives']` au complet, ce qui peut provoquer des re-renders inutiles. Non bloquant mais à optimiser.

---

### WARN-4 — S81 feedback360 : cycles RLS `USING` sans `WITH CHECK`
**Sévérité** : 🟡 AVERTISSEMENT  
Les policies RLS de `feedback360_cycles` ont `USING` mais pas `WITH CHECK` sur les INSERT, ce qui laisse possible l'insertion dans une orga différente si un attaquant connaît un UUID valide.

---

## ✅ MODULES SAINS (pas de bug détecté)

| Session | Module | Status |
|---------|--------|--------|
| S70 | Congés moteur règles | ✅ SQL propre, hooks corrects |
| S71 | Temps heures sup | ✅ SQL propre, hooks corrects |
| S72 | Recrutement pipeline | ✅ Tables OK, hooks OK, `auth_user_organization_id()` présent |
| S74 | Compensation workflow | ✅ SQL + hooks corrects |
| S75 | Onboarding parcours | ✅ Tables correctes, WizardV2 monté dans AppLayout |
| S77 | Tasks advanced | ✅ Tables `task_dependencies/recurrences/time_tracking` OK |
| S78 | OKR advanced | ✅ Tables `okr_cycles/checkins` OK (voir WARN-3) |
| S79 | Projets advanced | ✅ Tables + hooks OK |
| S80 | Entretiens advanced | ✅ Tables + hooks OK |
| S81 | Feedback 360° | ✅ Tables OK (voir WARN-4) |
| S83 | Succession Vivier | ✅ Hooks + tables OK, mat view (voir BUG-M4) |
| S84 | Compétences | ✅ Hooks + tables OK, mat view (voir BUG-M4) |
| S85 | Offboarding auto | ✅ SQL + hooks OK (navigation manquante — BUG-M1) |
| S87 | Communication S87 | ✅ SQL correct, hooks OK (dépend correction BUG-C2) |

---

## 📋 PLAN DE CORRECTION PRIORISÉ

### Étape 1 — Corrections immédiates (1 session)

| Priorité | Bug | Fichiers à modifier |
|----------|-----|-------------------|
| 🔴 P1 | BUG-C1 : table `performance_alerts` → `pulse_alerts` | `usePulseAlerts.js` |
| 🔴 P2 | BUG-C3 : role enum cast S86 | `s88_fixes.sql` (recréer fonctions) |
| 🔴 P3 | BUG-C4 : org filter manquant S73 | `useFormations.js` |
| 🟠 P4 | BUG-M1 : /conges + /temps + /offboarding dans Sidebar | `Sidebar.jsx` |
| 🟠 P5 | BUG-M2 : monter NotificationRulesAdmin dans Settings | `Settings.jsx` ou `NotificationBell.jsx` |
| 🟠 P6 | BUG-M3 : seed règle `announcement_important` | `s88_fixes.sql` |

### Étape 2 — Corrections différées

| Priorité | Bug | Effort |
|----------|-----|--------|
| 🟠 P7 | BUG-C2 : corriger migration S65 (ALTER FKs) | `s88_fixes.sql` — ALTER TABLE + DROP/CREATE POLICY |
| 🟠 P8 | BUG-M4 : wrapper views RLS sur mat views S82/S83/S84 | `s88_fixes.sql` |
| 🟡 P9 | BUG-M5 : fix queryKey `useDeleteBudget` | `useFormations.js` |
| 🟡 P10 | WARN-4 : WITH CHECK sur feedback360_cycles | `s88_fixes.sql` |

---

## 📁 LIVRABLES DE CORRECTION

1. `src/sql/s88_fixes.sql` — Toutes les corrections SQL
2. `src/hooks/usePulseAlerts.js` — Correction BUG-C1 (// FIX S88)
3. `src/hooks/useFormations.js` — Correction BUG-C4 (// FIX S88)
4. `src/Sidebar.jsx` — Correction BUG-M1 (// FIX S88)
5. `src/pages/admin/Settings.jsx` — Intégration NotificationRulesAdmin (BUG-M2)
