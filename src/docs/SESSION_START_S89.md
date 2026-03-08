# SESSION_START — S89
> Statut : 🎯 Prochaine session — Reprise des enrichissements OU consolidation S88

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S89.md` mis à jour
2. `src/docs/ROADMAP_S89.md` mis à jour
3. `src/docs/SESSION_START_S90.md` créé
4. **ZIP `src_S89.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S89.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S89): [module]" && git push
```

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S88.md` → toutes les règles d'or incluant les nouvelles de S88
2. Lire `ROADMAP_S88.md` → état des corrections
3. Annoncer : "Session S89 chargée — [objectif] — Livrables : [...]"

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Règles critiques S88** :
  - `role::text` pour comparaison avec text/text[] (enum)
  - `pulse_alerts` (pas `performance_alerts`)
  - `enabled: !!orgId` + orgId dans queryKey pour TOUT hook de ressources org
  - Vues mat: utiliser `v_*_secure` (s88_fixes.sql)

## ⚠️ Action requise avant S89 : exécuter `s88_fixes.sql` dans Supabase

Toutes les corrections SQL S88 sont dans `src/sql/s88_fixes.sql`.
À exécuter dans le SQL Editor Supabase **avant** de démarrer S89.

## Objectifs possibles S89

1. **Continuer l'audit** : pousser les corrections des WARN (vues mat → hooks mis à jour)
2. **Nouveau module** : Export paie (Temps + Congés → SAGE/Silae)
3. **Mobile** : améliorer l'expérience mobile
4. **Tests** : ajouter des tests pour usePulseAlerts, useFormations S73
