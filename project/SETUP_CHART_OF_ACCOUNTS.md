# Guide: Configurer le Plan Comptable pour les Charges

## Problème

Lorsque vous ajoutez une charge (utilities), vous obtenez cette erreur :

```
Charge enregistrée, mais l'écriture comptable n'a pas été créée:
Compte comptable de type "Expense" introuvable.
Veuillez créer ce compte dans le plan comptable.
```

## Solution

Vous devez créer les comptes comptables requis dans le **Plan Comptable**.

### Étape 1: Accéder au Plan Comptable

1. Dans la sidebar, cliquez sur **Comptabilité**
2. Sélectionnez **Plan Comptable** (ou naviguez vers `/accounting-accounts`)

### Étape 2: Créer les Comptes Requis

Vous devez créer au minimum **3 comptes** :

#### 1. Compte de Charges d'Exploitation (Expense Account)

**Utilisé pour**: Enregistrer toutes les dépenses de charges fixes

| Champ | Valeur |
|-------|--------|
| **Code** | 6000 (ou selon votre plan comptable) |
| **Nom** | Charges d'exploitation |
| **Type** | Expense |
| **Sous-type** | Operating Expense |
| **Est un groupe** | ❌ Non |
| **Actif** | ✅ Oui |

**Pour les charges spécifiques**, créez également :

| Code | Nom | Type | Sous-type |
|------|-----|------|-----------|
| 6061 | Électricité | Expense | Operating Expense |
| 6062 | Eau | Expense | Operating Expense |
| 6063 | Téléphone | Expense | Operating Expense |
| 6064 | Internet | Expense | Operating Expense |
| 6065 | Gaz | Expense | Operating Expense |
| 6066 | Diesel | Expense | Operating Expense |

**Note**: Si vous créez un compte avec le nom contenant "Utilities", il sera utilisé automatiquement.

#### 2. Compte de Trésorerie (Cash Account)

**Utilisé pour**: Enregistrer les paiements en cash

| Champ | Valeur |
|-------|--------|
| **Code** | 5300 |
| **Nom** | Caisse |
| **Type** | Asset |
| **Sous-type** | Cash |
| **Est un groupe** | ❌ Non |
| **Actif** | ✅ Oui |

**Ou** pour compte bancaire :

| Champ | Valeur |
|-------|--------|
| **Code** | 5400 |
| **Nom** | Banque |
| **Type** | Asset |
| **Sous-type** | Cash |
| **Est un groupe** | ❌ Non |
| **Actif** | ✅ Oui |

#### 3. Compte Fournisseurs (Accounts Payable)

**Utilisé pour**: Enregistrer les charges non encore payées

| Champ | Valeur |
|-------|--------|
| **Code** | 4010 |
| **Nom** | Fournisseurs |
| **Type** | Liability |
| **Sous-type** | Payable |
| **Est un groupe** | ❌ Non |
| **Actif** | ✅ Oui |

### Étape 3: Vérifier la Configuration

Une fois les comptes créés, testez en ajoutant une charge :

1. Allez sur `/utilities`
2. Cliquez sur **Nouvelle Charge**
3. Remplissez le formulaire
4. Sélectionnez un statut de paiement :
   - **Payé** → Utilise le compte Caisse/Banque
   - **En attente** → Utilise le compte Fournisseurs
5. Cliquez **Ajouter**

Si tout est correctement configuré, vous verrez :
- ✅ La charge est créée
- ✅ Une écriture comptable est automatiquement créée dans le journal
- ✅ Aucune erreur n'apparaît

### Étape 4: Vérifier l'Écriture Comptable

1. Allez dans **Comptabilité > Journal Comptable**
2. Recherchez l'écriture avec référence `utilities/[id]`
3. Vérifiez que :
   - Le compte de charges est **débité**
   - Le compte de trésorerie/fournisseurs est **crédité**
   - Le montant est correct

## Exemple d'Écriture Comptable Générée

### Cas 1: Facture d'Électricité Payée (500 MAD)

```
Date: 07/11/2025
Référence: utilities/abc-123-def
Statut: Posté

Compte                          Débit    Crédit
─────────────────────────────────────────────────
6061 - Électricité              500.00
5300 - Caisse                             500.00
─────────────────────────────────────────────────
Total                           500.00    500.00
```

### Cas 2: Facture d'Eau En Attente (300 MAD)

```
Date: 07/11/2025
Référence: utilities/xyz-456-ghi
Statut: Posté

Compte                          Débit    Crédit
─────────────────────────────────────────────────
6062 - Eau                      300.00
4010 - Fournisseurs                       300.00
─────────────────────────────────────────────────
Total                           300.00    300.00
```

## Logique de Sélection des Comptes

Le système utilise cette stratégie pour trouver les comptes :

### Pour le Compte de Charges (Débit)
1. **Première tentative**: Cherche un compte avec nom contenant "Utilities" dans Operating Expense
2. **Deuxième tentative**: Utilise n'importe quel compte Operating Expense
3. **Dernière tentative**: Utilise n'importe quel compte Expense

### Pour le Compte de Crédit
- **Si payé** (`payment_status = 'paid'`) → Compte Cash (Asset)
- **Si en attente** (`payment_status = 'pending'`) → Compte Payable (Liability)

## Codes de Plan Comptable Recommandés

Selon le **Plan Comptable Marocain** :

### Classe 4 - Comptes de Tiers
- **4010** - Fournisseurs
- **4411** - Clients

### Classe 5 - Comptes Financiers
- **5141** - Banques (comptes courants)
- **5161** - Caisses

### Classe 6 - Comptes de Charges
- **6000** - Achats et charges externes (groupe)
- **6061** - Fournitures non stockables (eau)
- **6125** - Primes d'assurances
- **6145** - Entretien et réparations
- **6167** - Électricité
- **6227** - Téléphone
- **6228** - Internet

## Dépannage

### Erreur: "Compte introuvable"
- ✅ Vérifiez que les comptes existent dans le plan comptable
- ✅ Vérifiez que `is_active = true`
- ✅ Vérifiez que `is_group = false` (ce doit être un compte de détail, pas un groupe)
- ✅ Vérifiez que `organization_id` correspond à votre organisation

### Erreur: "Plusieurs comptes trouvés"
- Si plusieurs comptes ont le même type/sous-type, le système prend le premier
- Recommandation: Utilisez des noms explicites (ex: "Utilities" pour être détecté automatiquement)

### L'écriture n'est pas créée
- Vérifiez les logs de la console (F12 > Console)
- Vérifiez que tous les comptes requis existent
- Vérifiez les permissions RLS sur la table `accounts`

## Code Source

L'intégration est dans :
- **Fichier**: `src/components/UtilitiesManagement.tsx`
- **Fonction**: `syncUtilityJournalEntry` (lignes 298-398)
- **Fonction helper**: `getAccountByType` (lignes 105-147)

## Amélioration de l'UX

Depuis la dernière mise à jour :
- ✅ Message d'erreur plus clair et informatif
- ✅ Bouton direct vers le Plan Comptable
- ✅ Indication visuelle (jaune au lieu de rouge) pour différencier un succès partiel
- ✅ Bouton de fermeture pour masquer le message

## Prochaines Étapes

Une fois le plan comptable configuré :
1. ✅ Ajoutez vos charges
2. ✅ Vérifiez les écritures dans le journal
3. ✅ Générez des rapports financiers
4. ✅ Suivez vos dépenses par catégorie

---

**Besoin d'aide ?** Consultez la documentation complète dans `UTILITIES_LEDGER_INTEGRATION.md`
