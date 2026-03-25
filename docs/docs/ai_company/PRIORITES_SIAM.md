# PRIORITES_SIAM.md
# Tâches critiques avant SIAM 2026
# Date limite absolue : 20 Avril 2026 — Meknès
# ⚠️ Tout agent Dev lit ce fichier avant de commencer toute tâche.

---

## CONTEXTE

SIAM 2026 (Salon International de l'Agriculture du Maroc) est le lancement officiel
d'AGROGINA. La plateforme doit être démontrée en conditions réelles devant des
investisseurs, coopératives, agro-industriels et prescripteurs institutionnels.

**Tolérance zéro pour les bugs visibles en démo.**
**Tolérance zéro pour les features incomplètes annoncées.**

---

## 🔴 PRIORITÉ 1 — BUGS CRITIQUES (Audit Antigravity)
### Status : ❌ Aucun corrigé — À traiter EN PREMIER

Ces bugs doivent être corrigés AVANT toute nouvelle feature.
Ils sont bloquants pour la stabilité de la plateforme.

---

### BUG-001 — Double QueryClient (CRITIQUE)
**Fichiers concernés :**
- `project/src/main.tsx`
- `project/src/routes/__root.tsx`

**Problème :**
Deux `QueryClient` créés en parallèle → deux caches React Query séparés →
données obsolètes, requêtes dupliquées, comportement imprévisible.

**Correction :**
1. Conserver le `QueryClient` uniquement dans `main.tsx`
2. Supprimer l'instance dans `__root.tsx`
3. Supprimer le `<QueryClientProvider>` wrapper dans `__root.tsx`

**Test de validation :**
- Vérifier qu'une seule instance QueryClient existe dans le bundle
- Tester que les données se synchronisent correctement entre les routes

---

### BUG-002 — Vérification abonnement dupliquée (CRITIQUE)
**Fichiers concernés :**
- `project/src/routes/_authenticated.tsx` (lignes 62-84)
- `project/src/components/MultiTenantAuthProvider.tsx` (lignes 494-513)

**Problème :**
Logique de vérification d'abonnement implémentée deux fois →
boucles de redirection, flashs d'écran, débogage difficile.

**Correction :**
Centraliser uniquement dans `MultiTenantAuthProvider.tsx`
Supprimer la vérification dans `_authenticated.tsx`

**Test de validation :**
- Tester connexion avec compte sans abonnement → redirection propre
- Tester connexion avec compte abonné → accès direct sans flash

---

### BUG-003 — URLs localhost hardcodées (CRITIQUE)
**Fichiers concernés :**
- `project/src/routes/register.tsx` (lignes 196, 243)
- `project/src/routes/select-trial.tsx` (ligne 210)

**Problème :**
`http://localhost:5173/select-trial` affiché aux utilisateurs en production →
liens cassés en production.

**Correction :**
Remplacer toutes les occurrences par `/select-trial`
ou `window.location.origin + '/select-trial'`

**Test de validation :**
- Vérifier que le lien fonctionne en environnement de production
- Tester le flow complet d'inscription → sélection trial

---

### BUG-004 — Monkey-patching Supabase backend (CRITIQUE)
**Fichier concerné :**
- `backend-service/app/supabase_client.py`

**Problème :**
Modification dynamique des méthodes internes du client Supabase →
code fragile, toute mise à jour de `supabase-py` peut casser
silencieusement l'authentification.

**Correction :**
Utiliser l'API officielle `supabase.auth.set_session()`
ou passer les headers via les options officielles du client.

**Test de validation :**
- Tester tous les endpoints authentifiés après correction
- Vérifier que les headers d'auth sont correctement transmis

---

### BUG-005 — Celery/Redis non configuré (BLOQUANT)
**Fichier concerné :**
- `backend-service/docker-compose.yml`

**Problème :**
Backend attend Redis sur `redis://localhost:6379` mais aucun
conteneur Redis dans docker-compose → toutes les tâches de fond
échouent silencieusement.

**Correction :**
Ajouter service Redis dans `docker-compose.yml` :
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  restart: unless-stopped
```
Ajouter dépendance dans le service backend.

**Test de validation :**
- Vérifier que Celery démarre sans erreur
- Tester une tâche de fond (ex: génération rapport)

---

### BUG-006 — Fichiers .bak en production (MINEUR)
**Fichiers à supprimer :**
```
components/Billing/QuoteDetailDialog.tsx.bak
components/DayLaborerManagement.tsx.bak
components/UtilitiesManagement.tsx.bak
routes/accounting.layout.tsx.bak
routes/analyses.tsx.bak
routes/farm-hierarchy.tsx.bak
routes/parcels.tsx.bak
routes/tasks.tsx.bak
routes/workers.tsx.bak
```

**Correction :**
1. Supprimer tous les fichiers `.bak`
2. Ajouter `*.bak` dans `.gitignore`
3. Ajouter `*.bak` dans `.dockerignore`

---

## 🟠 PRIORITÉ 2 — FEATURES CRITIQUES SIAM

### FEATURE-001 — PWA Push Notifications (NOUVEAU)
**Status :** ❌ À implémenter
**Deadline interne :** 1 avril 2026

**Description :**
Intégrer les push notifications pour que l'application fonctionne
comme une vraie app mobile (PWA — Progressive Web App).

**Scope :**
- Configuration Service Worker
- Manifest PWA complet
- Demande de permission notifications au premier login
- Notifications pour : alertes AgromindIA, rappels tâches, alertes météo
- Compatible iOS (Safari) et Android (Chrome)

**Fichiers à créer/modifier :**
- `project/public/manifest.json`
- `project/public/sw.js` (Service Worker)
- `project/src/hooks/usePushNotifications.ts`
- `project/vite.config.ts` (plugin PWA)

**Test de validation (Playwright) :**
- Installer l'app sur mobile depuis le navigateur
- Recevoir une notification de test
- Notification redirige vers le bon module

---

### FEATURE-002 — Agents AgromindIA dans l'application (NOUVEAU)
**Status :** ⏳ Dev dit intégration demain
**Deadline interne :** 5 avril 2026

**Description :**
Les agents AgromindIA doivent être visibles et fonctionnels dans
l'interface utilisateur — c'est le cœur de la proposition de valeur AGROGINA.

**Ce que l'utilisateur doit voir :**
- Recommandations générées automatiquement par parcelle
- Alertes proactives (météo, maladies, stock insuffisant)
- Justification de chaque recommandation
- Action directe depuis la recommandation (ex: créer tâche)

**⚠️ NOTE IMPORTANTE :**
Les workflows et référentiels AgromindIA sont déjà préparés par Yassine.
L'agent Dev AgromindIA doit les demander avant d'implémenter.

**Test de validation (Playwright + Persona Agronome Hassan) :**
- Hassan ouvre une parcelle → voit une recommandation AgromindIA
- Hassan clique sur la recommandation → peut créer une tâche directement
- Hassan reçoit une alerte météo → notification push

---

### FEATURE-003 — Niveaux de lecture agronomique (NOUVEAU — DÉCISION CEO)
**Status :** ❌ À implémenter
**Deadline interne :** 10 avril 2026

**Description :**
3 niveaux d'affichage des données agronomiques selon le profil utilisateur.
Ce niveau est configurable par l'admin de l'organisation pour chaque utilisateur.

**Niveau 1 — Basique**
- Langage simple, vulgarisé, compréhensible par tout agriculteur
- Exemple : "Ton blé a besoin d'eau. Arrose demain matin avant 8h."
- Pas de données scientifiques visibles
- Icônes et couleurs intuitives

**Niveau 2 — Intermédiaire**
- ⚠️ À définir avec Yassine — NE PAS IMPLÉMENTER SANS VALIDATION CEO
- Attendre instruction explicite avant de coder ce niveau

**Niveau 3 — Expert**
- Données scientifiques complètes (ce qui existe actuellement)
- Indices, valeurs précises, graphiques détaillés
- Pour agronomes et conseillers techniques

**Implémentation :**
- Ajouter champ `agro_level` (1/2/3) dans le profil utilisateur
- L'admin de l'org choisit le niveau pour chaque utilisateur
- Les composants AgromindIA s'adaptent selon ce niveau
- Ajouter dans CASL permissions

**Test de validation :**
- Créer 3 utilisateurs avec niveaux différents
- Vérifier que les mêmes données s'affichent différemment
- Persona Ahmed (basique) doit comprendre sans formation

---

### FEATURE-004 — Définition complète des rôles (CRITIQUE)
**Status :** ❌ À finaliser avec CEO
**Deadline interne :** 1 avril 2026

**Description :**
Les rôles existants dans le code doivent être validés et complétés
selon la réalité terrain des fermes marocaines.

**Rôles actuels dans le code :**
1. `system_admin` — Admin plateforme AGROGINA
2. `organization_admin` — Admin organisation/coopérative
3. `farm_manager` — Chef de ferme
4. `farm_worker` — Ouvrier agricole qualifié
5. `day_laborer` — Journalier (accès très limité)
6. `viewer` — Lecture seule

**⚠️ ACTION REQUISE CEO :**
Valider que ces rôles correspondent à la réalité des fermes cibles.
Définir exactement ce que chaque rôle peut voir et faire.
Sans cette validation, les agents ne modifient pas les permissions CASL.

---

## 🟡 PRIORITÉ 3 — QUALITÉ & PERFORMANCE

### QA-001 — Sécurité RLS Supabase
**Action :** Audit complet de toutes les tables
Vérifier que chaque table a des RLS policies correctes.
Aucune donnée d'une organisation ne doit être visible par une autre.

### QA-002 — Performance chargement
**Cible :** Temps de chargement initial < 3 secondes
**Actions :**
- Audit bundle size (vite build --analyze)
- Lazy loading des modules lourds
- Optimisation des requêtes Supabase (éviter N+1)
- Images optimisées

### QA-003 — Version mobile complète
**Action :** Tests Playwright sur viewport mobile (375px, 390px, 414px)
Tous les modules critiques doivent être utilisables sur mobile.
La PWA doit s'installer correctement sur iOS et Android.

### QA-004 — Tests Playwright complets pré-SIAM
**Flows à tester obligatoirement avant le 15 avril :**
- [ ] Inscription → onboarding → premier login
- [ ] Création organisation → ferme → parcelle
- [ ] Ajout ouvrier → assignation tâche
- [ ] Création analyse → visualisation résultats
- [ ] Recommandation AgromindIA → création tâche
- [ ] Facturation → génération facture
- [ ] PWA installation → réception notification push
- [ ] Test multi-rôles (chaque rôle sur chaque module)

---

## 📅 CALENDRIER AGENTS

| Semaine | Dates | Focus |
|---|---|---|
| S1 | 13-19 Mars | 🔴 Tous les bugs Antigravity (BUG-001 à 006) |
| S2 | 20-26 Mars | 🟠 PWA notifications + Rôles validés |
| S3 | 27 Mars-2 Avril | 🟠 AgromindIA intégration + Niveaux lecture |
| S4 | 3-9 Avril | 🟠 Features restantes + RLS audit |
| S5 | 10-15 Avril | 🟡 QA Playwright complet + Performance |
| S6 | 16-19 Avril | 🔒 FREEZE — Correction bugs QA uniquement |
| SIAM | 20-26 Avril | 🎯 Démo — Aucune modification code |

---

## ⛔ RÈGLE DE FREEZE

**À partir du 16 Avril 2026 :**
- Aucune nouvelle feature
- Aucune modification de code non liée à un bug critique
- Seuls les bugs détectés par QA peuvent être corrigés
- Toute exception nécessite validation explicite du CEO

---

## 📋 CHECKLIST AGENT AVANT CHAQUE TÂCHE

Avant de commencer, l'agent vérifie :
- [ ] Lu `GOUVERNANCE.md`
- [ ] Lu `PRIORITES_SIAM.md` (ce fichier)
- [ ] Vérifié `bugs_connus.md` — ce bug n'est pas déjà traité
- [ ] La tâche est dans la bonne priorité pour la semaine en cours
- [ ] Si feature niveau 2 agronomique → STOP, attendre validation CEO
- [ ] Si modification rôles CASL → STOP, attendre validation CEO
- [ ] Si migration DB majeure → STOP, attendre validation CEO

---

*Dernière mise à jour : Mars 2026 — Yassine, CEO AGROGINA*
*Ce fichier est mis à jour par le Chef d'Orchestre après chaque tâche complétée.*
