# SESSION_START — S92
> 🔴 Continuation S91 — Architecture V2 : 9 modules + RBAC 3 phases
> Statut : S91 ✅ — Module 9 Contrôle d'accès livré + usePermission Phase A opérationnel

---

## 🔴 RÈGLE D'OR ABSOLUE — S92

> L'architecture cible V2 est figée et validée.
> L'implémentation doit être fidèle, propre et complète.
> **Aucune déviation sans validation explicite.**
> Chaque session est livrée dans l'ordre de la séquence. Aucune session sautée.

---

## 🔴 DOCUMENT OBLIGATOIRE EN DÉBUT DE SESSION

> **`APEX_RH_ARCHITECTURE_CIBLE_S90.md`** doit être fourni par l'utilisateur
> au début de **chaque nouvelle discussion**.
>
> **Sans ce document, Claude doit le demander avant tout développement.**

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S92.md` mis à jour
2. `src/docs/ROADMAP_S92.md` mis à jour
3. `src/docs/SESSION_START_S93.md` créé
4. **ZIP `src_S92.zip` complet**
5. **`src/docs/ARCHITECTURE_S92.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S92.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S92): Module 3 Temps & Absences hub unifié /temps-absences" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE S92

1. Vérifier que `APEX_RH_ARCHITECTURE_CIBLE_S90.md` est fourni
2. Lire `MEMOIRE_PROJET_S91.md` → contexte + breaking changes
3. Lire `ROADMAP_S91.md` → état des 18 sessions
4. Annoncer : "Session S92 chargée — Module 3 Temps & Absences — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## 🎯 OBJECTIF S92 — Module 3 : Temps & Absences

**Route** : `/temps-absences`
**Redirections** : `/temps` → `/temps-absences` · `/conges` → `/temps-absences`

**Onglets à créer** :
| Onglet | Contenu | Portée |
|--------|---------|--------|
| Ma Feuille | Pointage + saisie temps + mes congés | own |
| Mon Équipe | Calendrier unifié absences + timesheets | team — chef_service+ |
| Heures Sup. | Résumé HS + validation | own / team selon rôle |
| Validation | Approbation congés + HS en attente | team — chef_service+ |
| Administration | Règles congés + règles HS + jours fériés + exports paie | org — directeur+ |

**Permissions** :
```js
can('temps', 'own', 'read')           // tous
can('temps', 'team', 'read')          // chef_service+
can('temps', 'team', 'validate')      // chef_service+
can('temps', 'export_paie', 'read')   // directeur+
can('temps', 'regles', 'admin')       // directeur+
can('temps', 'feries', 'admin')       // administrateur
```

**Composants existants à réutiliser** :
- `src/components/temps/` — pointer vers existants S71
- `src/components/conges/` — pointer vers existants S70
- `src/hooks/useTemps.js` · `src/hooks/useConges.js` — existants

**Pattern V2** :
- Hub page `src/pages/temps-absences/GestionTempsAbsences.jsx`
- `can()` sur chaque onglet — jamais de check rôle direct dans JSX
- `<Navigate replace />` dans App.jsx pour `/temps` et `/conges`

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **usePermission** : `src/hooks/usePermission.js` ✅ opérationnel depuis S91
- **RBAC V2** : `{ can, scope, hasRole }` — zéro requête — standard S91+

---

## État des 18 sessions

| Session | Livrable | Statut |
|---------|----------|--------|
| S90 | Fondation V2 | ✅ |
| S91 | Module 9 Contrôle d'accès + usePermission | ✅ |
| **S92** | **Module 3 — Temps & Absences** | 🔲 EN COURS |
| S93 | Module 5 — Performance | 🔲 |
| S94 | Module 6 — Évaluations | 🔲 |
| S95 | Module 8 — Intelligence RH épurée | 🔲 |
| S96 | Module 2 — Gestion des Employés | 🔲 |
| S97 | Module 7 — Formation & Développement | 🔲 |
| S98 | Module 4 — Cycle RH | 🔲 |
| S99 | Sidebar finale | 🔲 |
| S100→S107 | Phase C RBAC | 🔲 |

---

## ⚠️ Points de vigilance V2 (rappel)

- `can()` via `usePermission()` — jamais check rôle direct dans JSX
- JAMAIS `'direction'`, `'admin'`, `'rh'`, `'manager'` dans SQL/JS
- Redirections `/temps` + `/conges` → `<Navigate replace to="/temps-absences" />`
- Helpers AuthContext conservés en permanence (ne jamais supprimer)
- `pulse_alerts.triggered_at` — jamais `alert_date` ou `is_resolved`
- `useDeleteObjective` → `{ id, periodId }` — jamais `id` seul
- Mat views → toujours via `v_*_secure`
