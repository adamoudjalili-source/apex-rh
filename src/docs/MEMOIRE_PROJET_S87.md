# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 87 — Communication — Ciblage + accusés lecture ✅ DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **`ARCHITECTURE.md` mis à jour** (nouvelles tables, règles d'or, nouveaux modules)
6. **Commande Git prête à copier-coller** pour déployer sur Vercel
7. `README.md` **uniquement si** stack / installation / structure a changé

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S87.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S87): Communication — Ciblage avancé + accusés lecture" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 87
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1–22. (voir MEMOIRE_PROJET_S86.md)
23. **Notifications — Moteur de règles + escalade DÉPLOYÉ (S86)** : (voir MEMOIRE_PROJET_S86.md)
24. **Communication — Ciblage avancé + accusés lecture DÉPLOYÉ (S87)** :
    - `s87_communication_advanced.sql` — ALTER `communication_announcements` (+targeting_rules jsonb, +important boolean), Table `announcement_read_receipts` (organization_id, announcement_id, user_id, read_at, UNIQUE(announcement_id, user_id)), Vue `v_announcement_stats` (total_recipients, read_count, read_pct, last_read_at), Fonctions `mark_announcement_read`, `get_announcement_recipients` — SECURITY DEFINER, RLS + index
    - `useCommunicationS87.js` — 6 hooks : useAnnouncementStats, useMarkAnnouncementRead, useReadReceipts, useCreateTargetedAnnouncement, useUpdateTargetedAnnouncement, useUnreadImportantCount
    - `MessageReadReceipts.jsx` — panel slide-in accusés de lecture (filtre lu/non-lu/tous, export CSV, barre progression)
    - `MessageStats.jsx` — barre taux lecture (compact + full), métriques total/lu/dernière lecture, lien panel receipts
    - `AnnouncementCard.jsx` modifié — badge "important" rouge, auto-mark read (2s useEffect), bouton stats admin (BarChart2)
    - `AnnouncementForm.jsx` modifié — ciblage 3 modes (tous/par rôle/manuel), toggle important, sélection utilisateurs avec search, useCreateTargetedAnnouncement + useUpdateTargetedAnnouncement S87
    - **NOTE S87** : `useCommunication.js` (S65) NON écrasé. `AnnouncementCard.bak` + `AnnouncementForm.bak` conservés. dispatch_notification S86 appelé si important=true.

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les vrais noms en base
- `collaborateur`, `chef_service`, `chef_division`, `administrateur`, `directeur`

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canManageOrg } = useAuth()
```

---

## Tables critiques — référence (nouvelles S87)

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `announcement_read_receipts` | organization_id, announcement_id, user_id, read_at, UNIQUE(announcement_id, user_id) | S87 — RLS owner + admin |
| `communication_announcements` | +targeting_rules jsonb, +important boolean | S87 — ALTER de la table S65 |

## Vue S87
- `v_announcement_stats` — announcement_id, organization_id, total_recipients, read_count, read_pct, last_read_at

## Fonctions S87
- `mark_announcement_read(p_announcement_id)` → void — SECURITY DEFINER, ON CONFLICT DO NOTHING
- `get_announcement_recipients(p_announcement_id)` → TABLE(user_id, first_name, last_name, role, has_read, read_at) — SECURITY DEFINER

## Hooks S87 — référence rapide
```
useAnnouncementStats(announcementId)     — v_announcement_stats (staleTime 30s)
useMarkAnnouncementRead()                — RPC mark_announcement_read
useReadReceipts(announcementId)          — RPC get_announcement_recipients (adminOnly)
useCreateTargetedAnnouncement()          — insert + dispatch_notification si important
useUpdateTargetedAnnouncement()          — update announcement
useUnreadImportantCount()                — badge annonces importantes non lues (refetch 2min)
```

## Pattern targeting_rules (S87)
```json
{ "type": "all" }
{ "type": "roles", "roles": ["collaborateur", "chef_service"] }
{ "type": "manual", "user_ids": ["uuid1", "uuid2"] }
```
Compat S65 : `target_roles[]` aussi mis à jour si `type="roles"`.

---

## Règles d'or techniques (jamais violer)

- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js`
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ `useCompetencyFramework.js` (S42) — NE PAS ÉCRASER
- ✅ `useOffboarding.js` (S68) — NE PAS ÉCRASER — hooks S85 dans `useOffboardingS85.js`
- ✅ `useNotifications.js` (S12) et `NotificationCenter.jsx` (S56) — NE PAS ÉCRASER
- ✅ `useCommunication.js` (S65) — NE PAS ÉCRASER — hooks S87 dans `useCommunicationS87.js`
- ✅ `dispatch_notification` S86 — appelé si annonce `important=true`, silencieux sur erreur
- ✅ `mark_announcement_read` — SECURITY DEFINER, ON CONFLICT DO NOTHING (idempotent)
- ✅ `announcement_read_receipts` (S87) ≠ `views[]` (S65) — deux systèmes coexistants
- ✅ Auto-mark read dans AnnouncementCard : useEffect + setTimeout 2s, silencieux
- ✅ Toutes les règles S86 restent valides
