# AGROGINA_STACK.md
# Stack technique complète — Pour les agents Dev uniquement
# ⚠️ Ne pas modifier l'architecture sans validation CEO + Chef d'Orchestre

---

## 1. VUE D'ENSEMBLE

```
agritech/                        ← Repo principal (ruby-pinwheel)
├── project/                     ← Frontend React
├── backend-service/             ← Backend Python
├── supabase/                    ← Config base de données
├── directus/                    ← CMS headless (contenu)
├── data/                        ← Données statiques
├── docs/                        ← Documentation
└── docker-compose.yml           ← Orchestration complète

agrogina-api/                    ← API Node.js séparée
├── services/
├── templates/                   ← Templates PDF (EJS)
│   └── business_plan.ejs
└── server.js

agrogina-landing/                ← Landing page statique
├── assets/
├── css/
├── js/
├── locales/                     ← i18n (fr, ar, en)
└── index.html
```

---

## 2. FRONTEND — React Application

### Technologies principales
```
React 18+
TypeScript (strict mode — pas de `any`)
Vite (bundler)
TanStack Router (file-based routing)
TanStack Query (data fetching + cache)
Tailwind CSS (styling)
shadcn/ui (composants UI)
React Hook Form + Zod (formulaires + validation)
i18next (internationalisation)
Playwright (tests E2E)
Vitest (tests unitaires)
```

### Structure du frontend
```
project/src/
├── components/          ← Composants réutilisables
│   ├── ui/              ← shadcn/ui components
│   ├── authorization/   ← Can, PermissionGuard, RoleGuard
│   └── MultiTenantAuthProvider.tsx ← Auth centrale
├── routes/              ← Pages (file-based routing TanStack)
│   ├── __root.tsx       ← Layout racine
│   ├── _authenticated.tsx ← Layout protégé
│   ├── dashboard.tsx
│   ├── parcels.tsx
│   ├── tasks.tsx
│   └── ...
├── hooks/               ← Custom hooks (useQuery pattern)
├── lib/
│   └── casl/            ← Permissions fine-grained
│       └── defineAbilityFor.ts
├── schemas/             ← Validation Zod
├── locales/             ← Traductions en/fr/ar
│   ├── en/translation.json
│   ├── fr/translation.json
│   └── ar/translation.json
└── routeTree.gen.ts     ← ⚠️ AUTO-GÉNÉRÉ — NE JAMAIS MODIFIER MANUELLEMENT
```

### Règles TanStack Query — OBLIGATOIRES
```typescript
// ✅ TOUJOURS définir staleTime
useQuery({
  queryKey: ['parcels', { farmId }],
  queryFn: () => supabase.from('parcels').select('*'),
  staleTime: 5 * 60 * 1000, // 5 minutes
  enabled: !!farmId,
})

// ✅ UN SEUL QueryClient — dans main.tsx UNIQUEMENT
// ❌ JAMAIS créer un QueryClient dans __root.tsx ou ailleurs

// ✅ Invalider après mutation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['parcels'] })
}
```

### Structure des query keys
```typescript
// Auth
['auth', 'profile', userId]
['auth', 'organizations', userId]
['auth', 'farms', organizationId]

// Features
['parcels', { organizationId, farmId }]
['workers', { organizationId }]
['tasks', { parcelId }]
['analyses', { parcelId }]
['satellite-data', parcelId, { startDate, endDate }]
['inventory', { farmId }]
['accounting', { organizationId }]
```

### Routing — Conventions de nommage
```
__root.tsx              → Layout racine avec providers
_authenticated.tsx      → Layout protégé (vérifie auth + subscription)
dashboard.tsx           → /dashboard
settings.profile.tsx    → /settings/profile (dot = nested)
tasks.index.tsx         → /tasks (index)
tasks.calendar.tsx      → /tasks/calendar
$moduleId.tsx           → Route dynamique /:moduleId
```

### Protection des routes
```typescript
// Simple protection
export const Route = createFileRoute('/feature')({
  component: FeatureComponent,
})

// Avec protection CASL
export const Route = createFileRoute('/feature')({
  component: withRouteProtection(FeatureComponent, 'read', 'Feature'),
})
```

---

## 3. BACKEND — Python Service

### Technologies principales
```
Python 3.11+
FastAPI ou Django (vérifier dans requirements.txt)
Supabase Python Client
Celery (tâches asynchrones)
Redis (broker Celery) ← ⚠️ À CONFIGURER dans docker-compose
Docker + Dockerfile
```

### Structure backend
```
backend-service/
├── app/                 ← Application principale
├── database/            ← Modèles et migrations
├── scripts/             ← Scripts utilitaires
├── requirements.txt     ← Dépendances Python
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dokploy.yml  ← Config production (Dokploy)
└── dokploy.yml          ← Déploiement Dokploy
```

### Règle critique Supabase Python
```python
# ❌ JAMAIS monkey-patching
client._internal_method = lambda: ...  # INTERDIT

# ✅ Utiliser l'API officielle
supabase.auth.set_session(access_token, refresh_token)
# ou passer via les options officielles du client
```

### Configuration Redis (À AJOUTER — BUG-005)
```yaml
# Dans docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  restart: unless-stopped
  
backend:
  depends_on:
    - redis
  environment:
    - REDIS_URL=redis://redis:6379
```

---

## 4. BASE DE DONNÉES — Supabase

### Architecture multi-tenant
```
Organizations (niveau 1)
    └── Farms (niveau 2)
            └── Parcels (niveau 3)
                    └── Sub-parcels AOI (niveau 4)
```

### Règles base de données — OBLIGATOIRES
```sql
-- ✅ Toute nouvelle table doit avoir RLS activé
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- ✅ Policy de base par organisation
CREATE POLICY "org_isolation" ON new_table
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- ✅ Index sur les colonnes fréquemment filtrées
CREATE INDEX idx_new_table_org ON new_table(organization_id);
CREATE INDEX idx_new_table_farm ON new_table(farm_id);
```

### Workflow migrations
```bash
# 1. Créer le fichier de migration
# Location: project/supabase/migrations/YYYYMMDDHHMMSS_nom.sql

# 2. Tester en local
npm run db:reset
npm run db:generate-types

# 3. Vérifier les changements
npm run schema:diff

# 4. Backup avant push
npm run schema:backup

# 5. Déployer (APRÈS validation CEO si migration majeure)
npm run schema:push

# 6. Régénérer les types TypeScript
npm run db:generate-types-remote
```

### Types de migrations
```
Migration MINEURE (automatique) :
→ Ajouter une colonne nullable
→ Ajouter un index
→ Ajouter une policy RLS
→ Créer une fonction/trigger simple

Migration MAJEURE (validation CEO requise) :
→ Créer une nouvelle table
→ Supprimer une table ou colonne
→ Modifier le type d'une colonne
→ Changer l'architecture multi-tenant
→ Modifier les RLS policies existantes
```

---

## 5. SYSTÈME D'AUTORISATION

### Deux couches combinées

**Couche 1 — CASL (permissions fine-grained)**
```typescript
// Fichier : src/lib/casl/defineAbilityFor.ts
// Permissions : manage, create, read, update, delete, invite, export
// Ressources : Farm, Parcel, User, Analysis, Task, SatelliteReport...

// Usage composant
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>

// Usage programmatique
const canCreate = useCan('create', 'Farm');
```

**Couche 2 — RoleBasedAccess (checks DB)**
```typescript
// Usage
<PermissionGuard resource="analyses" action="create">
  <CreateAnalysisButton />
</PermissionGuard>

<RoleGuard roles={['farm_manager', 'organization_admin']}>
  <ManagementPanel />
</RoleGuard>
```

### Hiérarchie des rôles
```
1. system_admin        → Accès plateforme AGROGINA complète
2. organization_admin  → Gestion complète de l'organisation
3. farm_manager        → Opérations au niveau ferme
4. farm_worker         → Tâches, analyses, gestion coûts
5. day_laborer         → Uniquement tâches assignées
6. viewer              → Lecture seule
```

### Limites d'abonnement (Polar.sh)
```typescript
// Plans : Free, Basic, Pro, Enterprise
// Limites vérifiées par CASL :
max_farms
max_parcels
max_users
max_satellite_reports

// Feature flags :
has_analytics
has_sensor_integration
has_api_access
has_advanced_reporting
```

---

## 6. API NODE.JS SÉPARÉE (agrogina-api)

### Rôle
API complémentaire pour des fonctionnalités spécifiques :
- Génération de PDFs (business plan, rapports)
- Templates EJS
- Intégrations externes

### Stack
```
Node.js
Express
EJS (templates PDF)
SQLite (leads.db — local)
```

---

## 7. LANDING PAGE (agrogina-landing)

### Stack
```
HTML/CSS/JS vanilla (pas de framework)
i18n via fichiers locales/
Simulateur intégré (simulateur.html)
```

### Bugs connus à corriger (audit Antigravity)
- Clés i18n cassées → vérifier tous les fichiers locales/
- Ancien branding → mettre à jour avec identité AGROGINA actuelle
- Stats fabriquées → remplacer par vraies données ou supprimer

---

## 8. DÉPLOIEMENT

### Infrastructure actuelle
```
Dokploy (orchestration déploiement)
Docker Compose (conteneurs)
Dockerfile.satellite (satellite data processing)
Traefik (reverse proxy — traefik-config.yml)
GitHub Actions (CI/CD — main.yml)
```

### Environnements
```
Local       → développement et tests agents
Staging     → tests QA Playwright avant déploiement
Production  → ⚠️ VALIDATION CEO OBLIGATOIRE avant tout push
```

### Règle déploiement
```
1. Agent Dev → branche feature/fix
2. Agent QA → tests Playwright ✅
3. Pull Request → main
4. CEO valide dans dashboard
5. Merge → CI/CD automatique
6. Déploiement production via Dokploy
```

---

## 9. PWA — PROGRESSIVE WEB APP (À IMPLÉMENTER)

### Fichiers à créer
```
project/public/manifest.json     ← Manifest PWA
project/public/sw.js             ← Service Worker
project/src/hooks/usePushNotifications.ts
```

### Configuration Vite requise
```typescript
// vite.config.ts — ajouter plugin PWA
import { VitePWA } from 'vite-plugin-pwa'

plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'AGROGINA',
      short_name: 'AGROGINA',
      theme_color: '#2D6A4F',
      icons: [...]
    }
  })
]
```

---

## 10. COMMANDES UTILES

```bash
# Frontend
npm run dev              # Démarrer en développement
npm run build            # Build production
npm run lint:fix          # Corriger les erreurs ESLint
npm run type-check        # Vérifier les types TypeScript
npm run db:generate-types # Générer types depuis schema local
npm run db:generate-types-remote # Générer types depuis Supabase remote
npm run schema:diff       # Voir les changements DB
npm run schema:backup     # Backup schema actuel
npm run schema:push       # Pousser migrations

# Tests
npx playwright test       # Lancer tous les tests E2E
npx playwright test --ui  # Interface visuelle Playwright
npx vitest               # Tests unitaires

# Docker
docker-compose up -d      # Démarrer tous les services
docker-compose logs -f    # Voir les logs en temps réel
docker-compose down       # Arrêter tous les services
```

---

## 11. CHECKLIST AGENT AVANT COMMIT

```
[ ] npm run lint:fix        → Zéro erreur ESLint
[ ] npm run type-check      → Zéro erreur TypeScript
[ ] Traductions ajoutées    → en, fr, ar dans locales/
[ ] RLS policies créées     → Si nouvelle table
[ ] staleTime défini        → Sur tous les useQuery
[ ] QueryClient unique      → Vérifier qu'il n'y en a qu'un
[ ] Pas d'URL hardcodée     → Utiliser variables d'env ou window.location
[ ] Pas de fichiers .bak    → Supprimer avant commit
[ ] CASL mis à jour         → Si nouvelle feature
[ ] Tests Playwright passés → Si flow critique modifié
```

---

*Dernière mise à jour : Mars 2026*
*Pour toute question sur l'architecture → escalader vers Chef d'Orchestre*
*Pour toute décision d'architecture majeure → validation CEO obligatoire*
