# ROADMAP.md — APEX RH
> Mis à jour : Session 85 ✅ — Offboarding — Automatisation + solde auto — DÉPLOYÉ (08/03/2026)

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
| S1–S84 | (voir MEMOIRE_PROJET_S85.md) | ✅ Production |
| **S85** | **Offboarding — Automatisation + solde auto** | ✅ **DÉPLOYÉ** |

---

## Session 85 — Livrables ✅

- `s85_offboarding_automation.sql` — ALTER offboarding_processes, vue v_offboarding_dashboard, RPC calculate_final_settlement + auto_create_offboarding, trigger trg_auto_offboarding
- `useOffboardingS85.js` — 7 hooks (dashboard, alertes, settlement RPC, apply, auto-create, by-departure, complete)
- `OffboardingDashboard.jsx` — dashboard KPIs + liste alertes/filtres + bannière auto-trigger
- `FinalSettlementCard.jsx` — calcul auto CP + RTT + taux journalier, bouton appliquer
- `Offboarding.jsx` modifié — onglet Dashboard + FinalSettlementCard intégrée

---

## Roadmap S86–S89

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S86** | **Notifications — Moteur de règles + escalade** | 🟠 Moyenne | 🎯 **Prochaine** |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
| S88 | Intégration référentiel → Vivier S83 (auto-sync skills_gap) | 🟠 Moyenne | ⏳ Planifiée |
| S89 | Analytics avancés — Heatmaps RH + prédiction turnover | 🟡 Basse | ⏳ Planifiée |
