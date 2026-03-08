# ROADMAP.md — APEX RH
> Mis à jour : Session 88 ✅ — Audit + Corrections bugs S70→S87 DÉPLOYÉ (08/03/2026)

## Modules en production

| Session | Module | Statut |
|---------|--------|--------|
| S1–S87 | Voir MEMOIRE_PROJET_S87.md | ✅ Production |
| **S88** | **Audit + Corrections bugs S70→S87** | ✅ **DÉPLOYÉ** |

## Corrections S88 déployées

| Bug | Sévérité | Fichiers modifiés |
|-----|----------|------------------|
| BUG-C1 : pulse_alerts | 🔴 | `usePulseAlerts.js` |
| BUG-C3 : role::text S86 | 🔴 | `s88_fixes.sql` |
| BUG-C4 : org filter formation | 🔴 | `useFormations.js` |
| BUG-M1 : navigation /conges /temps /offboarding | 🟠 | `Sidebar.jsx` |
| BUG-M2 : NotificationRulesAdmin orphelin | 🟠 | `Settings.jsx` |
| BUG-M3 : seed announcement_important | 🟠 | `s88_fixes.sql` |
| BUG-C2 : S65 FKs profiles→users | 🟠 | `s88_fixes.sql` |
| BUG-M4 : vues mat views sécurisées | 🟠 | `s88_fixes.sql` |
| BUG-M5 : queryKey invalidation formation | 🟡 | `useFormations.js` |

## Post-S88 : reprise des enrichissements

Après la stabilisation S88, les nouveaux modules peuvent reprendre.
Pistes identifiées :
- Mobile-first : amélioration de l'expérience mobile
- Export global : rapport PDF/Excel par module
- Intégration paie : export SAGE/Silae depuis Temps+Congés

