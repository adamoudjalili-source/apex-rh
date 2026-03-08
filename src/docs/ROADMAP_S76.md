# ROADMAP.md — APEX RH
> Mis à jour : Session 76 ✅ — Performance PULSE — Alertes proactives + Calibration — DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **Commande Git prête à copier-coller**

---

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S75 | (voir MEMOIRE_PROJET_S76.md) | ✅ Production |
| **S76** | **Performance PULSE — Alertes proactives + Calibration** | ✅ **DÉPLOYÉ** |

---

## Session 76 — Livrables ✅

- `s76_pulse_alertes.sql` — 3 enums, 3 tables (pulse_alert_rules, pulse_alerts, pulse_calibration), MV `mv_pulse_trends`, fonction refresh, RLS, index
- `usePulse.js` — 11 hooks S76 appended (usePulseAlerts, useTeamPulseAlerts, usePulseAlertRules, useCreateAlertRule, useUpdateAlertRule, useDeleteAlertRule, useAcknowledgeAlert, usePulseCalibration, useUpdateCalibration, usePulseTrends, useTeamPulseTrends, useRefreshPulseTrendsMV)
- `PulseAlertCenter.jsx` — centre d'alertes : liste filtrable, KPIs, actions acknowledge/resolve/dismiss, modal règles CRUD
- `PulseCalibration.jsx` — calibration poids dimensions, seuils alerte et cibles, barre de répartition visuelle
- `PulseTrendChart.jsx` — graphe SVG tendance 30j : courbe lissée, zone, ligne moyenne, tendance 7j
- `TeamPulseHeatmap.jsx` — heatmap équipe : SVG natif, 14j/30j, tri, drawer détail par collaborateur
- `IntelligenceRH.jsx` — +3 onglets Mesure : Alertes PULSE / Heatmap équipe / Calibration

---

## Roadmap S77–S87

| Session | Module | Priorité | Statut |
|---------|--------|----------|--------|
| **S77** | **Tâches — Dépendances + récurrence + charge** | 🟠 Moyenne | 🎯 **Prochaine** |
| S78 | OKR — Cycle complet + check-ins + lien évaluation | 🟠 Moyenne | ⏳ Planifiée |
| S79 | Projets — Connexions + budget + Gantt avancé | 🟠 Moyenne | ⏳ Planifiée |
| S80 | Entretiens Annuels — Mi-année + auto-éval + suivi | 🟠 Moyenne | ⏳ Planifiée |
| S81 | Feedback 360° — Cycles planifiés + tendances | 🟡 Basse | ⏳ Planifiée |
| S82 | Intelligence RH — Bilan social + turnover | 🟠 Moyenne | ⏳ Planifiée |
| S83 | Succession & Talents — Vivier + gap analysis | 🟡 Basse | ⏳ Planifiée |
| S84 | Référentiel Compétences — Cartographie + gaps | 🟠 Moyenne | ⏳ Planifiée |
| S85 | Offboarding — Automatisation + solde auto | 🟡 Basse | ⏳ Planifiée |
| S86 | Notifications — Moteur de règles + escalade | 🟠 Moyenne | ⏳ Planifiée |
| S87 | Communication — Ciblage + accusés lecture | 🟡 Basse | ⏳ Planifiée |
