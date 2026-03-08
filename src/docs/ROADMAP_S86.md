# ROADMAP.md — APEX RH
> Mis à jour : Session 86 ✅ — Notifications — Moteur de règles + escalade — DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête à copier-coller**

---

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S85 | (voir MEMOIRE_PROJET_S86.md) | ✅ Production |
| **S86** | **Notifications — Moteur de règles + escalade** | ✅ **DÉPLOYÉ** |

---

## Session 86 — Livrables ✅

- `s86_notification_engine.sql` — Tables notification_rules + notification_inbox, fonctions dispatch_notification + process_notification_escalations + mark_notification_read + mark_all_notifications_read, RLS + indexes
- `useNotificationsS86.js` — 8 hooks (inbox, unreadCount realtime, markRead, markAllRead, archive, rules, upsertRule, deleteRule, dispatch)
- `NotificationBell.jsx` — cloche Sidebar avec badge count dégradé
- `NotificationInbox.jsx` — panneau slide-in filtres + actions
- `NotificationRulesAdmin.jsx` — CRUD règles adminOnly
- `Sidebar.jsx` modifié — intégration NotificationBell

---

## Roadmap S87–S90

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S87** | **Communication — Ciblage + accusés lecture** | 🟡 Basse | 🎯 **Prochaine** |
| S88 | Intégration référentiel → Vivier S83 (auto-sync skills_gap) | 🟠 Moyenne | ⏳ Planifiée |
| S89 | Analytics avancés — Heatmaps RH + prédiction turnover | 🟡 Basse | ⏳ Planifiée |
| S90 | Mobile — Notifications push native + offline mode | 🟡 Basse | ⏳ Planifiée |
