# SESSION_START — S87
> Communication — Ciblage + accusés lecture
> Statut : 🎯 Prochaine session

---

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE FIN DE SESSION

1. `src/docs/MEMOIRE_PROJET_S87.md` mis à jour
2. `src/docs/ROADMAP_S87.md` mis à jour
3. `src/docs/SESSION_START_S88.md` créé
4. **ZIP `src_S87.zip` complet**
5. **`ARCHITECTURE.md` mis à jour**
6. **Commande Git prête**

```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_S87.zip src/
```
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(S87): Communication — Ciblage + accusés lecture" && git push
```

---

## 📋 PROTOCOLE DÉMARRAGE

1. Lire `MEMOIRE_PROJET_S86.md` → contexte complet
2. Lire `ROADMAP_S86.md` → session suivante confirmée
3. Lire `SESSION_START_S87.md` → brief opérationnel
4. Annoncer : "Session S87 chargée — Communication — Ciblage + accusés lecture — Livrables : [liste]"
5. Exécuter sans redemander ce qui est documenté

---

## Contexte rapide

- **URL prod** : https://apex-rh-h372.vercel.app
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sidebar** : `src/Sidebar.jsx` UNIQUEMENT
- **Helpers rôles** : `canAdmin`, `canValidate`, `canManageTeam`, `canManageOrg` (AuthContext S69)
- **Charts** : SVG natif uniquement — pas de recharts
- **Users** : table `users` · `organization_id` · liste via `useUsersList()` (useSettings.js)
- **⚠️ useNotifications.js** (S12) + **useNotificationsS86.js** (S86) existent → ne pas écraser
- **⚠️ Communication existant** : `useCommunication.js` + `useUnreadCount` (S65)

---

## Contexte Communication existant

- Chercher dans src/hooks/ tout hook `useCommunication*`
- Chercher dans src/components/ tout composant `Communication*` ou `Message*`
- Module `/communication` existe depuis S65

---

## Problème à résoudre

Le module Communication actuel permet l'envoi de messages basiques. Il manque :
- **Ciblage avancé** : cibler par rôle, département, localisation, ou liste manuelle
- **Accusés de lecture** : savoir qui a lu le message et quand
- **Statistiques de lecture** : taux de lecture par groupe, par date
- **Messages importants** : flag "important" avec relance automatique aux non-lus

---

## Livrables S87

### SQL (`src/sql/s87_communication_advanced.sql`)
- ALTER `messages` (ou table communication existante) : +`targeting_rules jsonb`, +`important` boolean, +`expires_at`
- Table `message_read_receipts` (message_id, user_id, read_at, organization_id)
- Vue `v_message_stats` (message_id, total_recipients, read_count, read_pct, last_read_at)
- RPC `get_message_recipients(p_message_id)` → liste des destinataires selon targeting_rules
- RLS + indexes

### Hooks (`src/hooks/useCommunicationS87.js`)
- `useMessageStats(messageId)` — taux de lecture
- `useMarkMessageRead(messageId)` — mutation
- `useReadReceipts(messageId)` — qui a lu (adminOnly)
- `useTargetedMessage()` — mutation : envoyer avec ciblage

### Composants
- `MessageReadReceipts.jsx` — liste accusés de lecture (adminOnly)
- `MessageStats.jsx` — barre de progression taux lecture
- Modifier `Communication.jsx` existant — intégrer ciblage dans formulaire envoi

### Règles d'or S87
- ✅ Ne pas écraser `useCommunication.js` (S65) → append ou nouveau fichier `useCommunicationS87.js`
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Vérifier tables communication existantes avant ALTER
- ✅ `dispatch_notification` S86 disponible pour notifier les destinataires
