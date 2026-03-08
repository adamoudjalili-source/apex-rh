# SESSION_START — S75
> Onboarding — Parcours progressif automatisé
> Date cible : prochaine session | Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE CHAQUE SESSION

**À la fin de chaque session, Claude DOIT obligatoirement :**

1. Mettre à jour `src/docs/MEMOIRE_PROJET_S75.md` (nouvelle version numérotée)
2. Mettre à jour `src/docs/ROADMAP_S75.md` (session complétée + prochaine marquée)
3. Créer `src/docs/SESSION_START_S76.md` (brief complet de la prochaine session)
4. **Livrer un ZIP du dossier `src` COMPLET** — pas seulement les fichiers modifiés
5. **Fournir la commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S75.zip src/
```

**Commande Git déploiement :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S75): Onboarding — Parcours progressif automatisé" && git push
```

---

## 📋 PROTOCOLE AUTO-REMPLISSAGE SESSION_START (pour Claude)

1. Lire `MEMOIRE_PROJET_S74.md` → récupérer le contexte projet complet
2. Lire `ROADMAP_S74.md` → identifier la prochaine session planifiée
3. Lire `SESSION_START_S75.md` → charger le brief opérationnel
4. Annoncer : "Session S75 chargée — Onboarding — Livrables : [liste]"
5. Exécuter sans redemander ce qui est déjà documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/components/layout/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : AuthContext S69 (`canAdmin`, `canValidate`, `canManageTeam`, etc.)
- **Charts** : SVG natif uniquement — pas de recharts
- **Table users** : `users` (pas `profiles`) · `organization_id` (pas `org_id`)

---

## Problème à résoudre en S75

Le module Onboarding (S56) existe mais est basique :
- Checklist statique présente
- **Pas de parcours progressif** avec étapes ordonnées et dépendances
- **Pas d'assignation automatique** de tâches à un nouveau collaborateur selon son profil (poste, département)
- **Pas de templates de parcours** réutilisables (parcours cadre, parcours technicien, etc.)
- **Pas de suivi manager** avec vue d'avancement en temps réel
- **Pas de notifications** pour rappels d'étapes en retard

---

## Livrables S75

### 1. Templates de parcours d'onboarding
- Créer des templates réutilisables (ex : "Parcours cadre", "Parcours technicien")
- Chaque template contient des étapes ordonnées avec : titre, description, délai (J+N), responsable (nouvel arrivant / manager / RH), documents attendus
- Assigner un template à un nouveau collaborateur à son arrivée

### 2. Parcours progressif avec étapes
- Étapes débloquées progressivement (dépendance sur l'étape précédente)
- Statuts : à faire / en cours / complété / bloqué / en retard
- Pourcentage d'avancement automatique
- Documents/preuves attachables à une étape

### 3. Vue collaborateur — Mon onboarding
- Timeline visuelle de mes étapes (à venir / en cours / faites)
- Marquage d'étape comme complétée avec commentaire
- Téléchargement documents requis

### 4. Vue manager — Suivi équipe
- Tableau d'avancement de tous les nouveaux arrivants de l'équipe
- Alertes étapes en retard (rouge)
- Actions rapides : relancer, marquer complété pour le collaborateur

### 5. Dashboard admin
- Nombre d'onboardings en cours / terminés
- Taux de complétion moyen par template
- Durée moyenne d'onboarding

---

## Tables existantes à utiliser (S56)

```
onboarding_tasks      — tâches onboarding existantes
onboarding_records    — suivi par collaborateur
```

## Nouvelles tables

```
onboarding_templates  — templates de parcours (name, description, target_role, target_department)
onboarding_steps      — étapes d'un template (template_id, order_index, title, description, due_day_offset, assignee_type: self/manager/rh, is_required)
onboarding_step_completions — complétion d'une étape par un collaborateur (step_id, user_id, status, completed_at, comment, document_url)
```

---

## Règles d'or S75

- ✅ Helpers S69 : `canAdmin`, `canValidate`, `canManageTeam` pour tous les guards
- ✅ SVG natif — pas de recharts
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Sidebar : `src/components/layout/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
