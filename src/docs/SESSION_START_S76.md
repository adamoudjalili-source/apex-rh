# SESSION_START — S76
> Performance PULSE — Alertes proactives + calibration
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S76.md` mis à jour
2. `src/docs/ROADMAP_S76.md` mis à jour
3. `src/docs/SESSION_START_S77.md` créé
4. **ZIP `src_S76.zip` complet**
5. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S76.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S76): Performance PULSE — Alertes proactives + calibration" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S75.md` → contexte complet
2. Lire `ROADMAP_S75.md` → session suivante confirmée
3. Lire `SESSION_START_S76.md` → brief opérationnel
4. Annoncer : "Session S76 chargée — Performance PULSE — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · colonne `organization_id` · liste via `useUsersList()` (useSettings.js)

---

## Problème à résoudre

Le module Performance PULSE est fonctionnel (S37–S39) mais manque de :
- **Alertes proactives** : détecter les collaborateurs en décrochage (score bas plusieurs jours consécutifs)
- **Calibration** : ajustement des seuils PULSE par l'admin (pondérations, fréquences)
- **Tendances comparatives** : équipe vs org, mois vs mois
- **Vue manager enrichie** : heatmap temporelle par collaborateur

---

## Livrables S76

### SQL (`src/sql/s76_pulse_alertes.sql`)
- `pulse_alert_rules` — règles d'alerte (seuil, période, type: decrochage/absence/stagnation)
- `pulse_alerts` — alertes générées (user_id, rule_id, triggered_at, status, context_json)
- `pulse_calibration` — config seuils par org (org_id, dimension, weight, min_trigger_score)
- MV `mv_pulse_trends` — tendances 7j/30j par user (REVOKE API)
- RLS sur toutes les tables

### Hooks (`src/hooks/usePulse.js` — appends S76)
- `usePulseAlerts()` — mes alertes / alertes équipe
- `usePulseAlertRules()` — règles actives
- `useCreateAlertRule()` / `useUpdateAlertRule()` / `useDeleteAlertRule()`
- `usePulseCalibration()` — config seuils org
- `useUpdateCalibration()`
- `usePulseTrends(userId?)` — tendances 7j/30j
- `useTeamPulseTrends()` — heatmap équipe
- `useAcknowledgeAlert()` — marquer alerte vue/traitée

### Composants (`src/components/pulse/`)
- `PulseAlertCenter.jsx` — centre d'alertes : liste, filtres, actions
- `PulseCalibration.jsx` — config poids dimensions, seuils (admin)
- `PulseTrendChart.jsx` — graphe SVG tendance 30j (ligne + zone)
- `TeamPulseHeatmap.jsx` — heatmap semaine × collaborateur (SVG natif)

### Intégration
- Onglets dans module existant : + Alertes(S76) / Calibration(S76)

---

## Règles d'or S76

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ Cast `::text` sur nouvelles valeurs d'enum dans MVs créées la même session
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated)
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
