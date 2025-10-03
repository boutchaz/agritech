# Guide de Gestion du Personnel Agricole
## Système Unifié pour Salariés, Ouvriers et Métayage

---

## 📋 Vue d'ensemble

Ce système unifie la gestion de **trois types de main-d'œuvre** couramment utilisés dans l'agriculture marocaine:

1. **Salariés fixes** (à l'année) - Salaire mensuel régulier
2. **Ouvriers journaliers** - Payés à la tâche ou à la journée
3. **Partage de production (Métayage)** - Khammass (20%), Rebâa (25%), Tholth (33%)

---

## 🗄️ Architecture de la base de données

### Tables créées

#### 1. `workers` - Table unifiée pour tous les travailleurs
```sql
CREATE TABLE workers (
  -- Identification
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  farm_id UUID,

  -- Informations personnelles
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  cin TEXT,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,

  -- Type de travailleur
  worker_type worker_type NOT NULL, -- 'fixed_salary' | 'daily_worker' | 'metayage'
  position TEXT,
  hire_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- CNSS
  is_cnss_declared BOOLEAN DEFAULT false,
  cnss_number TEXT,

  -- Rémunération (conditionnelle selon le type)
  monthly_salary DECIMAL(10, 2),  -- Pour fixed_salary
  daily_rate DECIMAL(10, 2),       -- Pour daily_worker
  metayage_type metayage_type,     -- Pour metayage: 'khammass' | 'rebaa' | 'tholth' | 'custom'
  metayage_percentage DECIMAL(5, 2), -- Pour metayage: 20%, 25%, 33%, etc.
  calculation_basis calculation_basis, -- 'gross_revenue' | 'net_revenue'

  -- Compétences
  specialties TEXT[],
  certifications TEXT[],

  -- Stats
  total_days_worked INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0
);
```

#### 2. `work_records` - Suivi des journées de travail
```sql
CREATE TABLE work_records (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL,
  farm_id UUID,
  parcel_id UUID,

  work_date DATE NOT NULL,
  task_category TEXT,  -- 'pruning', 'harvest', 'treatment', etc.
  task_description TEXT,
  hours_worked DECIMAL(5, 2),

  amount_paid DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pending',

  -- Pour travail à la tâche
  units_completed DECIMAL(10, 2),
  unit_type TEXT,
  rate_per_unit DECIMAL(10, 2)
);
```

#### 3. `metayage_settlements` - Règlements de métayage
```sql
CREATE TABLE metayage_settlements (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  parcel_id UUID,

  -- Période
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  harvest_date DATE,

  -- Calcul
  gross_revenue DECIMAL(12, 2) NOT NULL,
  total_charges DECIMAL(12, 2) DEFAULT 0,
  net_revenue DECIMAL(12, 2) GENERATED ALWAYS AS (gross_revenue - total_charges) STORED,

  worker_percentage DECIMAL(5, 2) NOT NULL,
  worker_share_amount DECIMAL(12, 2) NOT NULL,

  calculation_basis calculation_basis NOT NULL,
  payment_status TEXT DEFAULT 'pending'
);
```

---

## 🎯 Fonctionnalités principales

### 1. Gestion unifiée des travailleurs

**Fichier**: `src/components/Workers/WorkersList.tsx`

**Fonctionnalités**:
- ✅ Liste tous les travailleurs (salariés, journaliers, métayage)
- ✅ Filtres par type, ferme, statut actif/inactif
- ✅ Recherche par nom/CIN
- ✅ Statistiques en temps réel
- ✅ Actions: Ajouter, Modifier, Désactiver, Supprimer

**Statistiques affichées**:
- Total de travailleurs
- Nombre de salariés fixes
- Nombre d'ouvriers journaliers
- Nombre de travailleurs en métayage

### 2. Formulaire intelligent

**Fichier**: `src/components/Workers/WorkerForm.tsx`

**Champs conditionnels** selon le type:
- **Salarié fixe**: Salaire mensuel
- **Ouvrier journalier**: Taux journalier
- **Métayage**: Type (Khammass/Rebâa/Tholth), Pourcentage, Base de calcul

**Validation avec Zod**:
```typescript
workerSchema.refine((data) => {
  if (data.worker_type === 'fixed_salary' && !data.monthly_salary) return false;
  if (data.worker_type === 'daily_worker' && !data.daily_rate) return false;
  if (data.worker_type === 'metayage' && !data.metayage_percentage) return false;
  return true;
});
```

### 3. Calculateur de métayage

**Fichier**: `src/components/Workers/MetayageCalculator.tsx`

**Fonctionnalités**:
- Sélection du travailleur (Khammass/Rebâa/Tholth)
- Saisie du revenu brut de la récolte
- Saisie des charges (intrants, eau, etc.)
- Choix base de calcul: Revenu brut OU Revenu net
- **Calcul automatique** de la part du travailleur
- Enregistrement du règlement

**Exemple de calcul**:
```
Revenu brut: 15,000 DH
Charges: 3,000 DH
Revenu net: 12,000 DH

Travailleur: Khammass (20%)
Base: Revenu net
Part travailleur: 12,000 × 20% = 2,400 DH
```

---

## 📊 Types de métayage au Maroc

### Khammass (خمّاس) - 1/5
- **Part travailleur**: 20%
- **Signification**: "Cinquième" en arabe
- Le plus courant dans le centre du Maroc

### Rebâa (رّباع) - 1/4
- **Part travailleur**: 25%
- **Signification**: "Quart" en arabe
- Utilisé dans certaines régions agricoles intensives

### Tholth (ثلث) - 1/3
- **Part travailleur**: 33.33%
- **Signification**: "Tiers" en arabe
- Plus rare, négocié dans certaines zones

### Custom
- **Part travailleur**: Personnalisée
- Pourcentage négocié entre propriétaire et travailleur

---

## 🔧 Hooks React disponibles

**Fichier**: `src/hooks/useWorkers.ts`

```typescript
// Lister les travailleurs
const { data: workers } = useWorkers(organizationId, farmId);

// Obtenir un travailleur
const { data: worker } = useWorker(workerId);

// Créer un travailleur
const createWorker = useCreateWorker();
await createWorker.mutateAsync(workerData);

// Désactiver un travailleur
const deactivateWorker = useDeactivateWorker();
await deactivateWorker.mutateAsync({ workerId, endDate });

// Enregistrements de travail
const { data: workRecords } = useWorkRecords(workerId, startDate, endDate);

// Règlements de métayage
const { data: settlements } = useMetayageSettlements(workerId);

// Calculer la part de métayage (fonction DB)
const calculateShare = useCalculateMetayageShare();
const share = await calculateShare.mutateAsync({
  workerId,
  grossRevenue: 15000,
  totalCharges: 3000
});

// Statistiques d'un travailleur
const { data: stats } = useWorkerStats(workerId);
```

---

## 🎨 Composants UI

### WorkersList
```tsx
import WorkersList from '@/components/Workers/WorkersList';

<WorkersList
  organizationId={currentOrganization.id}
  farms={farms}
/>
```

### WorkerForm (Modal)
```tsx
import WorkerForm from '@/components/Workers/WorkerForm';

<WorkerForm
  worker={selectedWorker} // null pour créer
  organizationId={organizationId}
  farms={farms}
  onClose={() => setShowForm(false)}
  onSuccess={() => refetch()}
/>
```

### MetayageCalculator
```tsx
import MetayageCalculator from '@/components/Workers/MetayageCalculator';

<MetayageCalculator
  organizationId={organizationId}
  farmId={farmId}
  onSuccess={() => alert('Règlement enregistré')}
/>
```

---

## 🔐 Sécurité (RLS)

### Policies implémentées

```sql
-- Les utilisateurs peuvent voir les travailleurs de leur organisation
CREATE POLICY "Users can view workers in their organization"
  ON workers FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Seuls les admins et managers peuvent gérer les travailleurs
CREATE POLICY "Admins and managers can manage workers"
  ON workers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = workers.organization_id
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );
```

---

## 📈 Fonctions utiles

### Calcul de la part de métayage (SQL)
```sql
SELECT calculate_metayage_share(
  'worker-uuid',
  15000.00,  -- Revenu brut
  3000.00    -- Charges
);
```

### Vue des travailleurs actifs
```sql
SELECT * FROM active_workers_summary
WHERE organization_id = 'org-uuid';
```

---

## 🚀 Utilisation pratique

### Scénario 1: Ajouter un salarié fixe
1. Cliquer "Ajouter un travailleur"
2. Sélectionner type: "Salarié fixe"
3. Remplir infos personnelles
4. Entrer salaire mensuel: 4000 DH
5. Cocher "Déclaré CNSS" si applicable
6. Ajouter spécialités: Tractoriste, Irrigation
7. Sauvegarder

### Scénario 2: Ajouter un ouvrier journalier
1. Type: "Ouvrier journalier"
2. Infos personnelles
3. Taux journalier: 150 DH
4. Spécialités: Taille, Récolte
5. Sauvegarder

### Scénario 3: Ajouter un travailleur en métayage
1. Type: "Partage de production (Métayage)"
2. Infos personnelles
3. Type métayage: Khammass (1/5)
4. Pourcentage: 20% (auto-rempli)
5. Base calcul: Revenu net (après charges)
6. Sauvegarder

### Scénario 4: Calculer et enregistrer un règlement
1. Ouvrir calculateur de métayage
2. Sélectionner travailleur: Mohamed Alami (Khammass 20%)
3. Période: 01/09/2024 - 30/09/2024
4. Revenu brut: 18,000 DH
5. Charges: 4,000 DH
6. Base: Revenu net
7. **Résultat automatique**: 14,000 × 20% = 2,800 DH
8. Enregistrer le règlement

---

## 📝 Notes importantes

### Contraintes de la base de données
- ✅ Un travailleur **doit avoir** une rémunération selon son type
- ✅ Les pourcentages de métayage sont limités à **0-50%**
- ✅ Les enums empêchent les valeurs invalides
- ✅ Les RLS policies protègent les données multi-tenant

### Migrations de données existantes
Si vous avez des tables `employees` ou `day_laborers` existantes:

```sql
-- Migrer les salariés
INSERT INTO workers (
  organization_id, first_name, last_name, worker_type,
  monthly_salary, hire_date, is_active
)
SELECT
  organization_id, first_name, last_name, 'fixed_salary',
  salary, hire_date, is_active
FROM employees;

-- Migrer les ouvriers
INSERT INTO workers (
  organization_id, first_name, last_name, worker_type,
  daily_rate, hire_date, is_active
)
SELECT
  organization_id, first_name, last_name, 'daily_worker',
  daily_rate, hire_date, is_active
FROM day_laborers;
```

---

## 🎯 Prochaines étapes

1. **Intégration avec la paie**: Calculer automatiquement les salaires mensuels
2. **Rapports**: Générer des rapports de paie par période
3. **Notifications**: Alerter les gestionnaires des paiements en attente
4. **Mobile**: Interface mobile pour enregistrer les journées de travail
5. **Traductions**: Support complet FR/AR/EN pour Directus

---

## 🆘 Support

Pour toute question ou problème:
- Consulter les types TypeScript: `src/types/workers.ts`
- Voir les hooks: `src/hooks/useWorkers.ts`
- Tester avec le calculateur de métayage
- Vérifier les RLS policies dans la migration SQL

---

**✅ Système déployé et opérationnel!**
