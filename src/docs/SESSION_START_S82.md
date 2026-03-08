# SESSION_START — S82
> Intelligence RH — Bilan social + turnover
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S82.md` mis à jour
2. `src/docs/ROADMAP_S82.md` mis à jour
3. `src/docs/SESSION_START_S83.md` créé
4. **ZIP `src_S82.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S82.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S82): Intelligence RH — Bilan social + turnover" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S81.md` → contexte complet
2. Lire `ROADMAP_S81.md` → session suivante confirmée
3. Lire `SESSION_START_S82.md` → brief opérationnel
4. Annoncer : "Session S82 chargée — Intelligence RH — Bilan social + turnover — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam`, `canManageOrg` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · `organization_id` · liste via `useUsersList()` (useSettings.js)

---

## Problème à résoudre

APEX RH dispose de nombreuses données RH (users, contrats, départs, formations, congés, temps) mais n'offre pas encore de **vue consolidée bilan social**. Il manque :
- **Bilan social** : effectifs, pyramide des âges, ancienneté, répartition F/H, statuts
- **Turnover** : taux de rotation, durée moyenne d'emploi, motifs de départ
- **Absentéisme** : taux par période, département, type d'absence
- **Masse salariale** : évolution, répartition, coût moyen par poste
- **Export PDF/Excel** du bilan social (format réglementaire)

---

## Livrables S82

### SQL (`src/sql/s82_hr_intelligence.sql`)
- Table `employee_departures` (organization_id, user_id, departure_date, reason, type — démission/licenciement/fin-contrat/retraite, rehirable)
- MV `mv_headcount_stats` — effectifs par mois, département, statut
- MV `mv_turnover_stats` — taux turnover mensuel/annuel par département
- MV `mv_absenteeism_stats` — taux absentéisme par mois, type congé
- RPC `get_social_report(p_year int)` — données complètes bilan social annuel
- RLS + indexes

### Hooks (`src/hooks/useHRIntelligence.js` — nouveau fichier S82)
- `useHeadcountStats(year)` — effectifs et évolutions
- `useTurnoverStats(year)` — taux turnover et motifs
- `useAbsenteeismStats(year)` — taux absentéisme
- `useSalaryMassStats(year)` — masse salariale (depuis compensation_records)
- `useSocialReport(year)` — bilan social complet (RPC)
- `useEmployeeDepartures()` — liste des départs
- `useRegisterDeparture()` — enregistrer un départ

### Composants (`src/components/intelligence/`)
- `HeadcountChart.jsx` — pyramide des âges SVG + répartition F/H + courbe effectifs
- `TurnoverDashboard.jsx` — taux turnover, motifs départ (donut SVG), durée moyenne
- `AbsenteeismChart.jsx` — taux absentéisme, heatmap mensuelle SVG, par type
- `SalaryMassDashboard.jsx` — évolution masse salariale, coût moyen, répartition
- `SocialReportExport.jsx` — génération bilan social (données structurées + bouton export)

### Intégration
- Nouvelle page `src/pages/intelligence/HRIntelligencePage.jsx` avec onglets
- Entrée Sidebar dans le hub "Intelligence" (accessible directeur + administrateur)

---

## Règles d'or S82

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ `REVOKE ALL` sur toutes les nouvelles MVs
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ Ne pas recréer les tables S80/S81 (review_*, feedback360_*)
