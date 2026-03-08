# ROADMAP.md — APEX RH
> Mis à jour : Session 87 ✅ — Communication — Ciblage + accusés lecture — DÉPLOYÉ (08/03/2026)

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
| S1–S86 | (voir MEMOIRE_PROJET_S87.md) | ✅ Production |
| **S87** | **Communication — Ciblage avancé + accusés lecture** | ✅ **DÉPLOYÉ** |

---

## Session 87 — Livrables ✅

- `s87_communication_advanced.sql` — ALTER communication_announcements, table announcement_read_receipts, vue v_announcement_stats, fonctions mark_announcement_read + get_announcement_recipients, RLS + indexes
- `useCommunicationS87.js` — 6 hooks (stats, markRead, receipts, create, update, unreadImportant)
- `MessageReadReceipts.jsx` — panel accusés de lecture (filtre, barre progression, export CSV)
- `MessageStats.jsx` — widget taux lecture compact + full
- `AnnouncementCard.jsx` modifié — badge important + auto-mark read + bouton stats
- `AnnouncementForm.jsx` modifié — ciblage avancé (all/roles/manual) + flag important

---

## Roadmap S88–S91

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S88** | **Intégration référentiel → Vivier S83 (auto-sync skills_gap)** | 🟠 Moyenne | 🎯 **Prochaine** |
| S89 | Analytics avancés — Heatmaps RH + prédiction turnover | 🟡 Basse | ⏳ Planifiée |
| S90 | Mobile — Notifications push native + offline mode | 🟡 Basse | ⏳ Planifiée |
| S91 | Communication — Relances automatiques annonces importantes non lues | 🟡 Basse | ⏳ Planifiée |
