# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 86 — Notifications — Moteur de règles + escalade ✅ DÉPLOYÉ (08/03/2026)

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
cd /home/claude && zip -r /mnt/user-data/outputs/src_S86.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S86): Notifications — Moteur de règles + escalade" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 86
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1–21. (voir MEMOIRE_PROJET_S85.md)
22. **Offboarding — Automatisation + solde auto DÉPLOYÉ (S85)** : (voir MEMOIRE_PROJET_S85.md)
23. **Notifications — Moteur de règles + escalade DÉPLOYÉ (S86)** :
    - `s86_notification_engine.sql` — Table `notification_rules` (trigger_event, target_roles[], message_template, escalate_after_days, escalate_to_role), Table `notification_inbox` (user_id, rule_id, priority, read_at, archived_at, escalated_at, escalated_from), Fonctions `dispatch_notification`, `process_notification_escalations`, `mark_notification_read`, `mark_all_notifications_read` — SECURITY DEFINER
    - `useNotificationsS86.js` — 8 hooks : useNotificationInbox, useUnreadCountS86 (realtime), useMarkRead, useMarkAllRead, useArchiveNotification, useNotificationRules, useUpsertRule, useDeleteRule, useDispatchNotification
    - `NotificationBell.jsx` — cloche dans Sidebar avec badge count dégradé rouge/or
    - `NotificationInbox.jsx` — panneau slide-in, filtres (toutes/non lues/urgentes), marquage lu, archivage, indicateurs priorité, badge escalade
    - `NotificationRulesAdmin.jsx` — CRUD règles : toggle actif/inactif, formulaire (nom, déclencheur, rôles cibles multi-sélection, template, escalade)
    - `Sidebar.jsx` modifié — import NotificationBell, ajouté au bas de la nav au-dessus du profil
    - **NOTE S86** : `useNotifications.js` (S12) et `NotificationCenter.jsx` (S56) NON écrasés. Nouveau hook dans `useNotificationsS86.js`. `dispatch_notification` utilise `notification_inbox` (S86), pas `notifications` (S12).

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les vrais noms en base
- `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canManageOrg } = useAuth()
```

---

## Tables critiques — référence (nouvelles S86)

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `notification_rules` | organization_id, trigger_event, target_roles[], message_template, escalate_after_days, escalate_to_role, is_active | S86 — RLS par org + admin |
| `notification_inbox` | organization_id, user_id, rule_id, title, body, event_type, priority, read_at, archived_at, escalated_at, escalated_from | S86 — RLS owner + admin |

## Fonctions S86
- `dispatch_notification(p_org_id, p_event_type, p_reference_id, p_data jsonb)` → integer — SECURITY DEFINER, silencieux sur erreur, évalue les règles actives et insère dans notification_inbox
- `process_notification_escalations()` → integer — à appeler en cron, escalade les notifications non lues après X jours
- `mark_notification_read(p_notification_id)` → void — sécurisé, user = auth.uid()
- `mark_all_notifications_read(p_org_id)` → integer

## Hooks S86 — référence rapide
```
useNotificationInbox({ limit, onlyUnread })    — notifications non archivées
useUnreadCountS86()                             — badge count + realtime subscribe
useMarkRead()                                   — mutation : mark_notification_read RPC
useMarkAllRead()                                — mutation : mark_all_notifications_read RPC
useArchiveNotification()                        — mutation : archived_at = now()
useNotificationRules()                          — règles de l'org
useUpsertRule()                                 — mutation : upsert notification_rules
useDeleteRule()                                 — mutation : delete notification_rules
useDispatchNotification()                       — mutation : dispatch_notification RPC
```

## Variables template dispatch_notification
```
p_data = {
  title:           "Titre affiché",
  employee_name:   "Prénom Nom",
  event_date:      "DD/MM/YYYY",
  details:         "Description libre",
  priority:        "normal|high|urgent",
  reference_type:  "leave_request|departure|...",
  target_user_id:  "uuid",      // notifier aussi cet user en direct
  exclude_user_id: "uuid",      // exclure cet user des rôles ciblés
}
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
- ✅ `useNotifications.js` (S12) et `NotificationCenter.jsx` (S56) — NE PAS ÉCRASER — hooks S86 dans `useNotificationsS86.js`
- ✅ `dispatch_notification` — SECURITY DEFINER, ne bloque jamais la mutation appelante (RAISE WARNING)
- ✅ `process_notification_escalations` — à appeler via cron ou Edge Function scheduled
- ✅ `notification_inbox` (S86) ≠ `notifications` (S12) — deux systèmes coexistants
- ✅ Toutes les règles S85 restent valides
