# SESSION_START — S85
> Offboarding — Automatisation + solde auto
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S85.md` mis à jour
2. `src/docs/ROADMAP_S85.md` mis à jour
3. `src/docs/SESSION_START_S86.md` créé
4. **ZIP `src_S85.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S85.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S85): Offboarding — Automatisation + solde auto" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S84.md` → contexte complet
2. Lire `ROADMAP_S84.md` → session suivante confirmée
3. Lire `SESSION_START_S85.md` → brief opérationnel
4. Annoncer : "Session S85 chargée — Offboarding — Automatisation + solde auto — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam`, `canManageOrg` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · `organization_id` · liste via `useUsersList()` (useSettings.js)
- **⚠️ useCompetencyFramework.js** (S42) existe → ne pas écraser → hooks S84 dans `useCompetencyS84.js`

---

## Contexte Offboarding existant (S68)

- `offboarding_processes` table existe depuis S68 avec statuts de base
- Composants dans `src/components/offboarding/` (vérifier avant d'écraser)
- Page dans `src/pages/offboarding/` (vérifier)

---

## Problème à résoudre

L'offboarding S68 est basique (création de processus). Il manque :
- **Automatisation** : déclenchement automatique à la date de départ (depuis `employee_departures` S82)
- **Checklist dynamique** : étapes configurables par org (équipement, accès IT, solde congés, entretien de sortie)
- **Calcul solde auto** : congés restants × salaire journalier depuis `leave_balances` + `compensation_records`
- **Dashboard RH** : vue consolidée des départs en cours avec alertes retard

---

## Livrables S85

### SQL (`src/sql/s85_offboarding_automation.sql`)
- Table `offboarding_templates` (organization_id, name, steps jsonb, auto_trigger bool)
- Table `offboarding_tasks` (process_id, step_key, assigned_to, due_date, completed_at, status)
- Fonction `auto_create_offboarding(p_departure_id)` — déclenchée par trigger sur employee_departures
- Fonction `calculate_final_settlement(p_user_id, p_org_id)` → solde congés + prorata salaire
- RLS + indexes

### Hooks (`src/hooks/useOffboardingS85.js`)
- `useOffboardingTemplates()` — templates par org
- `useUpsertTemplate()` — CRUD template
- `useOffboardingTasks(processId)` — tâches d'un processus
- `useCompleteTask()` — marquer tâche complète
- `useFinalSettlement(userId)` — calcul solde de tout compte
- `useOffboardingDashboard()` — vue agrégée des processus en cours

### Composants (`src/components/offboarding/`)
- `OffboardingDashboard.jsx` — liste processus en cours, alertes retard, statut global
- `OffboardingChecklist.jsx` — checklist interactive par processus
- `FinalSettlementCard.jsx` — calcul solde de tout compte (congés restants + prorata)

### Intégration
- Onglet dans le hub RH approprié (vérifier où est l'offboarding S68)
- Lien depuis `employee_departures` (S82) vers le processus d'offboarding

---

## Règles d'or S85

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Helpers S69 pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ RLS sur toutes les nouvelles tables
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ Vérifier contenu de `src/components/offboarding/` et `src/pages/offboarding/` avant de créer
- ✅ Ne pas recréer tables S80/S81/S82/S83/S84
- ✅ `employee_departures` (S82) est la source de vérité pour les départs
- ✅ `leave_balances` + `compensation_records.is_current` pour le calcul de solde
