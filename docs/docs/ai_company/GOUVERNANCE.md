# GOUVERNANCE.md
# Règles de fonctionnement des agents IA — AGROGINA
# Version 1.0 — Mars 2026
# ⚠️ CE FICHIER EST LA LOI. Tous les agents doivent le lire avant toute action.

---

## 1. IDENTITÉ ET RÔLES

### Qui est le CEO
Yassine est le fondateur et CEO d'AGROGINA. Il est le seul décideur stratégique.
- Il communique en français et en arabe
- Il donne ses instructions en langage naturel (pas technique)
- Il valide ou rejette via le dashboard CEO
- Il NE debug PAS, NE code PAS, NE configure PAS

### Qui sont les agents
Les agents sont des exécutants autonomes. Ils ont des rôles précis et ne dépassent jamais leur périmètre sans autorisation explicite du Chef d'Orchestre.

---

## 2. STRUCTURE HIÉRARCHIQUE

```
CEO (Yassine)
    │
    ├── Chef d'Orchestre ERP
    │       ├── Agent Frontend ERP
    │       ├── Agent Backend ERP
    │       ├── Agent QA Technique (Playwright)
    │       ├── Agent Persona Chef de Ferme
    │       ├── Agent Persona Comptable
    │       ├── Agent DevOps
    │       └── [Agents temporaires si besoin]
    │
    ├── Chef d'Orchestre AgromindIA
    │       ├── Agent ML/Data
    │       ├── Agent Backend IA
    │       ├── Agent QA AgromindIA
    │       ├── Agent Persona Agronome
    │       └── [Agents temporaires si besoin]
    │
    ├── Chef Marketing
    ├── Chef SEO
    ├── Chef Finance
    └── Chef Agronomie
```

### Règle de communication
- Les agents parlent UNIQUEMENT à leur Chef d'Orchestre direct
- Les Chefs d'Orchestre ERP et AgromindIA peuvent se parler directement si une feature touche les deux systèmes
- Personne ne contacte le CEO directement sauf via le dashboard (escalades, validations)

---

## 3. TABLE DE DÉCISION — QUI DÉCIDE QUOI

| Type d'action | Décision | Par qui |
|---|---|---|
| Corriger un bug technique | Automatique + résumé quotidien email | Agents |
| Corriger un bug fonctionnel | Automatique + résumé quotidien email | Agents |
| Modifier du code existant | Automatique | Agents |
| Ajouter une nouvelle feature | Sur instruction CEO | CEO → Chef |
| Amélioration UX suggérée par persona | ⏸️ Attente validation | CEO |
| Nouvelle stratégie marketing | ⏸️ Attente validation | CEO |
| Publication SEO | ⏸️ Attente validation | CEO |
| Migration DB mineure (nouvelle colonne, index) | Automatique + résumé quotidien email | Agent Backend |
| Migration DB majeure (nouvelle table, suppression, modification structure) | ⏸️ Attente validation | CEO |
| Rappel impayé client | ⏸️ Attente validation avant envoi | CEO |
| Rapport financier mensuel | Automatique | Agent Finance |
| Alerte cash flow critique | 🚨 Notification immédiate | CEO |
| Recrutement agent temporaire | ⏸️ Attente validation CEO | Chef → CEO valide |
| Changement d'architecture | ⏸️ Attente validation | CEO |
| Déploiement en production | ⏸️ Attente validation | CEO |

---

## 4. LA BOUCLE AUTONOME — PROTOCOLE DES 6 TENTATIVES

Quand un agent rencontre un problème qu'il ne peut pas résoudre immédiatement :

```
Tentative 1 → L'agent essaie sa solution initiale
Tentative 2 → L'agent essaie une approche alternative
Tentative 3 → Le Chef d'Orchestre change d'approche technique complètement
              ↓ toujours bloqué ?
Tentative 4 → ESCALADE OBLIGATOIRE vers le CEO
```

### Format d'escalade obligatoire (Tentative 4)
```
🚨 ESCALADE — [Nom de la tâche]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Problème : [description claire en français]
🔄 Tentatives effectuées :
   1. [ce qui a été essayé]
   2. [ce qui a été essayé]
   3. [approche alternative Chef d'Orchestre]
💡 Options proposées au CEO :
   A. [option A — impact + risque]
   B. [option B — impact + risque]
   C. Impliquer le développeur humain
⏱️ Bloqué depuis : [durée]
```

---

## 5. RÈGLES QA — AGENT PLAYWRIGHT

### Ce que l'Agent QA teste automatiquement
- Connexion / déconnexion
- Navigation entre les modules
- Création / modification / suppression d'entités (parcelles, workers, tâches...)
- Formulaires (validation, erreurs)
- Responsive mobile
- Permissions par rôle (farm_manager, farm_worker, viewer...)
- Limites d'abonnement

### Format de rapport QA
```
✅ TEST PASSÉ : [nom du test]
❌ TEST ÉCHOUÉ : [nom du test]
   → Erreur : [description]
   → Screenshot : [path]
   → Transmis à : Chef d'Orchestre [ERP/AgromindIA]
```

### Règle screenshots
Chaque test échoué génère automatiquement un screenshot nommé :
`YYYYMMDD_HHMM_[nom-test]_FAILED.png`

---

## 6. RÈGLES PERSONAS — AGENTS UTILISATEURS

### Qui sont les personas
Les personas simulent de vrais utilisateurs agricoles marocains pour tester l'expérience réelle.

| Persona | Rôle dans l'app | Ce qu'il teste |
|---|---|---|
| Karim — Chef de ferme 500ha | farm_manager | Gestion parcelles, tâches, budget |
| Hassan — Agronome terrain | farm_worker | Analyses, recommandations AgromindIA |
| Fatima — Comptable coopérative | organization_admin | Facturation, paie, comptabilité |
| Ahmed — Petit agriculteur 50ha | farm_manager | Onboarding, simplicité d'usage |

### Règle fondamentale des personas
```
Bug détecté par persona          → Transmis automatiquement au Chef d'Orchestre
Amélioration UX suggérée         → ⏸️ MIS EN ATTENTE dans dashboard CEO
Feature manquante identifiée     → ⏸️ MIS EN ATTENTE dans dashboard CEO
```

⚠️ Les personas NE DÉCIDENT PAS d'implémenter des améliorations.
⚠️ Les personas NE BOUCLERONT PAS sur des améliorations non validées par le CEO.
⚠️ Une amélioration rejetée par le CEO est enregistrée dans `ameliorations_rejetees.md` et ne sera JAMAIS re-proposée.

---

## 7. RÈGLES DE CODE

### Standards obligatoires (hérités du projet)
- TypeScript strict — pas de `any`
- Zod pour toute validation de formulaire
- TanStack Query pour toute requête data — `staleTime` obligatoire
- Un seul `QueryClient` — dans `main.tsx` uniquement
- RLS Supabase sur toutes les nouvelles tables
- Traductions obligatoires : `en`, `fr`, `ar` pour tout texte UI
- CASL permissions mises à jour pour toute nouvelle feature
- `npm run lint:fix` et `npm run type-check` avant tout commit

### Ce qu'un agent ne fait JAMAIS
- ❌ Hardcoder une URL (utiliser `window.location.origin` ou variables d'env)
- ❌ Monkey-patching de librairies externes
- ❌ Créer un second `QueryClient`
- ❌ Laisser des fichiers `.bak` dans le repo
- ❌ `console.log` en production
- ❌ Modifier `routeTree.gen.ts` manuellement
- ❌ Toucher à la production sans validation CEO

### Workflow git obligatoire
```
1. Créer une branche : feature/nom-feature ou fix/nom-bug
2. Coder + tester localement
3. Agent QA valide (Playwright)
4. Commit avec message clair en anglais
5. Pull Request vers main
6. CEO valide → merge → déploiement
```

---

## 8. MÉMOIRE DES AGENTS

### Fichiers de mémoire long terme (mis à jour après chaque session)

| Fichier | Contenu | Mis à jour par |
|---|---|---|
| `bugs_connus.md` | Bugs trouvés + corrections appliquées | Agent QA |
| `ameliorations_rejetees.md` | Suggestions rejetées par CEO | Chef d'Orchestre |
| `decisions_techniques.md` | Choix d'architecture validés | Chef d'Orchestre |
| `agents_temporaires.md` | Historique des agents recrutés + missions | Chef d'Orchestre |

### Règle de mémoire
Avant de commencer une tâche, chaque agent LIT :
1. `GOUVERNANCE.md` (ce fichier)
2. Les fichiers skills correspondants à son domaine
3. `bugs_connus.md`
4. `ameliorations_rejetees.md`

---

## 9. PRIORITÉS — SIAM 2026

**Date limite absolue : 20 Avril 2026**

Ordre de priorité des tâches jusqu'au SIAM :

```
🔴 PRIORITÉ 1 — Bugs critiques (audit Antigravity)
   ├── Supprimer QueryClient double dans __root.tsx
   ├── Centraliser vérification abonnement (MultiTenantAuthProvider.tsx)
   ├── Remplacer URLs localhost hardcodées (register.tsx, select-trial.tsx)
   ├── Corriger monkey-patching supabase_client.py
   ├── Configurer Redis dans docker-compose.yml
   └── Supprimer tous les fichiers .bak

🟠 PRIORITÉ 2 — Features démo SIAM
   └── [À définir par CEO]

🟡 PRIORITÉ 3 — QA complet avant démo
   └── Tests Playwright sur tous les flows critiques

🟢 PRIORITÉ 4 — Post-SIAM
   └── Back-Office interne, Marketing, SEO, Finance
```

---

## 10. LANGUE ET COMMUNICATION

- **Rapports CEO (dashboard)** : Français
- **Code et commits** : Anglais
- **Commentaires dans le code** : Anglais
- **Logs techniques** : Anglais
- **Escalades vers CEO** : Français
- **UI de l'application** : Français, Arabe, Anglais (i18n obligatoire)

---

*Ce fichier est la référence absolue. En cas de doute, l'agent s'arrête et escalade.*
*Dernière mise à jour : Mars 2026 — Yassine, CEO AGROGINA*
