# MEMOIRE_PROJET.md — APEX RH
> Mis à jour : Session 76 — Performance PULSE — Alertes proactives + Calibration ✅ DÉPLOYÉ (08/03/2026)

## 🔴 RÈGLE D'OR — LIVRAISON OBLIGATOIRE (chaque session)

**Claude doit livrer en fin de CHAQUE session :**
1. `MEMOIRE_PROJET_SXX.md` mis à jour
2. `ROADMAP_SXX.md` mis à jour
3. `SESSION_START_SXX+1.md` créé et pré-rempli pour la session suivante
4. **ZIP `src_SXX.zip` du dossier `src/` COMPLET**
5. **Commande Git prête à copier-coller** pour déployer sur Vercel

**Commande ZIP :**
```bash
cd /home/claude && zip -r /mnt/user-data/outputs/src_SXX.zip src/
```

**Commande Git :**
```bash
cd C:\Users\DELL\APEX_RH\apex-rh && git add -A && git commit -m "feat(SXX): [description]" && git push
```

---

## Informations projet
- **URL production** : https://apex-rh-h372.vercel.app
- **Supabase** : ptpxoczdycajphrshdnk
- **Stack** : React 18 + Vite + TailwindCSS + Supabase + Vercel
- **Sessions déployées** : 1 → 76
- **Nature** : Outil interne NITA (pas un SaaS commercialisé)

---

## Décisions architecturales critiques

1. **Score IPR composite SUPPRIMÉ (S37)** — Ne jamais réintroduire.
2. **Navigation 6 rôles DÉPLOYÉE (S69)** — Helpers AuthContext uniquement.
3. **PWA + Mobile-First DÉPLOYÉ (S39)**.
4. **IA Générative DÉPLOYÉE (S43)** — Claude API via Edge Functions uniquement.
5. **Multi-tenancy DÉPLOYÉ (S52)** — 8 MVs + RLS multi-tenant.
6. **Réorganisation UX Hub & Spoke DÉPLOYÉE (S64)**.
7. **Congés — Moteur de règles DÉPLOYÉ (S70)**.
8. **Sécurité Supabase Hotfix post-S70** — 0 erreurs / 1 warning résiduel pg_trgm.
9. **Gestion des Temps — Règles HS + Export paie DÉPLOYÉ (S71)**.
10. **Recrutement — Pipeline structuré + scoring DÉPLOYÉ (S72)**.
11. **Formation — Budget + Obligatoire + Évaluation DÉPLOYÉ (S73)**.
12. **Compensation — Workflow révision salariale DÉPLOYÉ (S74)**.
13. **Onboarding — Parcours progressif automatisé DÉPLOYÉ (S75)**.
14. **Performance PULSE — Alertes proactives + Calibration DÉPLOYÉ (S76)** :
    - `s76_pulse_alertes.sql` — 2 enums nouveaux (pulse_alert_type, pulse_alert_status, pulse_dimension), 3 tables, MV `mv_pulse_trends`, RLS
    - `usePulse.js` — 11 hooks S76 appended
    - `PulseAlertCenter.jsx` — centre d'alertes + gestion règles
    - `PulseCalibration.jsx` — calibration poids dimensions + seuils (admin)
    - `PulseTrendChart.jsx` — graphe SVG tendance 30j
    - `TeamPulseHeatmap.jsx` — heatmap semaine × collaborateur SVG natif
    - `IntelligenceRH.jsx` — +3 onglets : Alertes PULSE / Heatmap équipe / Calibration

---

## ⚠️ RÔLES UTILISATEURS — RÉFÉRENCE DÉFINITIVE (S69)

### Les 6 rôles
- `collaborateur` — lecture seule sur ses propres données
- `manager` — + accès équipe directe
- `rh` — + accès org-wide, validation révisions
- `admin` — accès complet, cycles, application révisions
- `direction` — lecture org-wide + tableaux de bord
- `recruteur` — module recrutement uniquement

### Helpers AuthContext — TOUJOURS utiliser
```js
const { canAdmin, canValidate, canManageTeam, canRecruit, canViewAnalytics } = useAuth()
// canAdmin       → role = 'admin'
// canValidate    → role IN ('admin','rh')
// canManageTeam  → role IN ('admin','rh','manager','direction')
```

---

## Tables critiques — référence

| Table | Colonnes clés | Notes |
|-------|--------------|-------|
| `users` | id, organization_id, role, manager_id, full_name | PAS `profiles` |
| `compensation_records` | employee_id, salary_amount, **is_current**, effective_date | `is_current` PAS `current` |
| `compensation_reviews` | **user_id**, old_base_salary, new_base_salary, status, review_cycle_id | `increase_amount` et `increase_pct` GENERATED |
| `compensation_cycles` | organization_id, name, year, status, budget_envelope | NEW S74 |
| `onboarding_templates` | id, organization_id, name, target_role, target_department, is_active | NEW S75 |
| `onboarding_assignments` | id, organization_id, user_id, template_id, start_date, status | NEW S75 |
| `onboarding_step_completions` | id, assignment_id, step_id, user_id, status, completed_at, comment | NEW S75 |
| `pulse_alert_rules` | id, organization_id, name, alert_type, threshold_score, consecutive_days | NEW S76 |
| `pulse_alerts` | id, organization_id, rule_id, user_id, alert_type, status, severity, context_json | NEW S76 |
| `pulse_calibration` | id, organization_id, dimension, weight, min_trigger_score, target_score | NEW S76 |

---

## Hooks disponibles — PULSE S76 (référence rapide)

```
usePulseAlerts()            — mes alertes actives
useTeamPulseAlerts()        — alertes équipe (manager+)
usePulseAlertRules()        — règles d'alerte org
useCreateAlertRule()        — créer une règle
useUpdateAlertRule()        — modifier une règle
useDeleteAlertRule()        — supprimer une règle
useAcknowledgeAlert()       — traiter une alerte (acknowledge/resolve/dismiss)
usePulseCalibration()       — config calibration org
useUpdateCalibration()      — sauvegarder calibration (upsert par dimension)
usePulseTrends(userId?)     — tendances 30j d'un user
useTeamPulseTrends()        — scores 30j toute l'équipe (pour heatmap)
useRefreshPulseTrendsMV()   — rafraîchir MV mv_pulse_trends
```

---

## Enums S76

```sql
pulse_alert_type   : 'decrochage' | 'absence' | 'stagnation' | 'pic_negatif'
pulse_alert_status : 'active' | 'acknowledged' | 'resolved' | 'dismissed'
pulse_dimension    : 'delivery' | 'quality' | 'regularity' | 'bonus_okr' | 'global'
```

---

## Règles d'or techniques (jamais violer)

- ✅ `compensation_reviews.user_id` (PAS `employee_id`)
- ✅ `compensation_reviews.old_base_salary` / `new_base_salary` (PAS `current_salary` / `new_salary`)
- ✅ `increase_amount` et `increase_pct` sont GENERATED — ne JAMAIS les insérer
- ✅ `compensation_records.is_current` (pas `current`)
- ✅ `users` (pas `profiles`) · `organization_id` (pas `org_id`)
- ✅ Helpers AuthContext S69 uniquement pour les guards de rôles
- ✅ SVG natif uniquement — pas de recharts
- ✅ `useUsersList()` depuis `useSettings.js` pour liste des users org (PAS `useOrgUsers`)
- ✅ Sidebar : `src/Sidebar.jsx` UNIQUEMENT
- ✅ RLS sur toutes les nouvelles tables
- ✅ MVs avec REVOKE ALL (anon, authenticated)
- ✅ Cast `::text` sur les nouvelles valeurs d'enum dans les MVs créées la même session
