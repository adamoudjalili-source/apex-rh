# SESSION_START — S86
> Notifications — Moteur de règles + escalade
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S86.md` mis à jour
2. `src/docs/ROADMAP_S86.md` mis à jour
3. `src/docs/SESSION_START_S87.md` créé
4. **ZIP `src_S86.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S86.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S86): Notifications — Moteur de règles + escalade" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S85.md` → contexte complet
2. Lire `ROADMAP_S85.md` → session suivante confirmée
3. Lire `SESSION_START_S86.md` → brief opérationnel
4. Annoncer : "Session S86 chargée — Notifications — Moteur de règles + escalade — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam`, `canManageOrg` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · `organization_id` · liste via `useUsersList()` (useSettings.js)
- **⚠️ useOffboarding.js** (S68) + **useOffboardingS85.js** (S85) existent → ne pas écraser
- **⚠️ useCompetencyFramework.js** (S42) existe → ne pas écraser

---

## Contexte Notifications existant

- `migration_notifications.sql` (session ancienne) — vérifier les tables existantes avant de créer
- Chercher dans src/hooks/ tout hook `useNotification*`
- Chercher dans src/components/ tout composant `Notification*`

---

## Problème à résoudre

Le système de notifications actuel est basique (push simple). Il manque :
- **Moteur de règles** : déclencheurs configurables par org (ex: "si congé refusé → notifier manager", "si départ enregistré → notifier RH")
- **Escalade** : si notification non lue après X jours → escalader au responsable
- **Centre de notifications** : inbox in-app avec filtres, marquage lu/non-lu, archivage
- **Règles prédéfinies** : templates de règles pour les événements RH courants

---

## Livrables S86

### SQL (`src/sql/s86_notification_engine.sql`)
- Table `notification_rules` (organization_id, trigger_event, conditions jsonb, target_roles, message_template, escalate_after_days, escalate_to_role)
- Table `notification_inbox` (organization_id, user_id, rule_id, title, body, event_type, reference_id, reference_type, read_at, archived_at, escalated_at)
- Fonction `dispatch_notification(p_org_id, p_event_type, p_reference_id, p_data jsonb)` — évalue les règles et insère dans inbox
- RLS + indexes

### Hooks (`src/hooks/useNotificationsS86.js`)
- `useNotificationInbox()` — notifications non lues + récentes
- `useUnreadCount()` — badge count
- `useMarkRead(id)` — mutation
- `useMarkAllRead()` — mutation
- `useNotificationRules()` — règles admin
- `useUpsertRule()` — CRUD règle

### Composants
- `NotificationBell.jsx` — cloche dans header avec badge count
- `NotificationInbox.jsx` — panneau inbox slide-in avec liste + filtres
- `NotificationRulesAdmin.jsx` — CRUD règles (adminOnly)

### Intégration
- Cloche dans `src/Sidebar.jsx` ou header principal
- Appel `dispatch_notification` depuis les mutations clés (congé refusé, départ, évaluation…)

---

## Règles d'or S86

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ Vérifier tables notifications existantes avant de créer
- ✅ Ne pas recréer tables S80–S85
- ✅ `dispatch_notification` — SECURITY DEFINER, ne pas bloquer la mutation appelante
