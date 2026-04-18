# SCHEMA DÉVELOPPEUR — AgromindIA
## Architecture complète + Base de données + Workflow IA
Version 1.0 — Mars 2026

---

## 1. FICHIERS À INTÉGRER

| Fichier | Rôle | Charger quand |
|---|---|---|
| `MOTEUR_CONFIG.json` | Logique de raisonnement IA — chargé EN PREMIER | À chaque appel IA |
| `DATA_OLIVIER_v5.json` | Référentiel données olivier | Si culture = olivier |
| `DATA_AGRUMES_v1.json` | Référentiel données agrumes | Si culture = agrumes |
| `DATA_AVOCATIER_v1.json` | Référentiel données avocatier | Si culture = avocatier |
| `DATA_PALMIER_v1.json` | Référentiel données palmier dattier | Si culture = palmier_dattier |
| `calibrage.prompt.v2.1.ts` | System prompt moteur calibrage | Lors du calibrage |
| `operationnel.prompt.v2.ts` | System prompt moteur recommandations | Lors des recommandations |
| `plan_annuel.prompt.ts` | System prompt génération plan annuel | Après validation calibrage |
| `recalibrage.prompt.ts` | System prompt recalibrage F2/F3 | Sur événement ou fin saison |
| `agromind.types.ts` | Types TypeScript contrats données | Import dans tous les fichiers TS |

**Ordre d'injection dans chaque appel IA :**
```
system_prompt = buildXxxSystemPrompt(MOTEUR_CONFIG, DATA_CULTURE)
user_prompt   = buildXxxUserPrompt(input_data)
```

---

## 2. SCHÉMA BASE DE DONNÉES

### Table `parcelles`
```sql
CREATE TABLE parcelles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id        UUID NOT NULL REFERENCES utilisateurs(id),
  nom                   VARCHAR(100) NOT NULL,
  culture               VARCHAR(30) NOT NULL CHECK (culture IN ('olivier','agrumes','avocatier','palmier_dattier')),
  variete               VARCHAR(50) NOT NULL,
  systeme               VARCHAR(30) NOT NULL CHECK (systeme IN ('traditionnel','traditionnel_oasien','semi_intensif','intensif','super_intensif')),
  age_ans               INTEGER NOT NULL CHECK (age_ans >= 0),  -- OBLIGATOIRE — bloque création si absent
  densite_arbres_ha     INTEGER NOT NULL CHECK (densite_arbres_ha > 0),
  surface_ha            DECIMAL(8,2) NOT NULL CHECK (surface_ha > 0),
  localisation          GEOGRAPHY(POLYGON, 4326) NOT NULL,     -- Contour AOI GeoJSON
  centroide             GEOGRAPHY(POINT, 4326),                -- Calculé automatiquement
  region                VARCHAR(100),
  langue                VARCHAR(5) NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr','ar','ber')),
  irrigation_type       VARCHAR(50),
  irrigation_source     VARCHAR(100),
  date_plantation       DATE,
  statut                VARCHAR(30) NOT NULL DEFAULT 'en_attente_donnees'
                        CHECK (statut IN ('en_attente_donnees','pret_calibrage','calibrage_en_cours',
                                          'calibre','actif','archive')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `telechargements_satellite`
```sql
CREATE TABLE telechargements_satellite (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id       UUID NOT NULL REFERENCES parcelles(id),
  statut            VARCHAR(20) NOT NULL DEFAULT 'en_cours'
                    CHECK (statut IN ('en_cours','termine','erreur')),
  nb_passages       INTEGER DEFAULT 0,
  periode_debut     DATE,
  periode_fin       DATE,
  -- Colonnes extraites pour accès rapide (évite parsing JSONB)
  ndvi_passages     INTEGER DEFAULT 0,
  couverture_min_pct DECIMAL(5,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  termine_at        TIMESTAMPTZ
);
```

### Table `calibrages`
```sql
CREATE TABLE calibrages (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id               UUID NOT NULL REFERENCES parcelles(id),
  version                   INTEGER NOT NULL DEFAULT 1,
  type                      VARCHAR(20) NOT NULL DEFAULT 'initial'
                            CHECK (type IN ('initial','F2_partiel','F3_complet')),

  -- Colonnes extraites OBLIGATOIRES (ne pas forcer l'IA à parser le JSONB)
  mode_calibrage            VARCHAR(40) NOT NULL
                            CHECK (mode_calibrage IN ('lecture_pure','calibrage_progressif',
                                                       'calibrage_complet','calibrage_avec_signalement',
                                                       'age_manquant')),
  phase_age                 VARCHAR(25) NOT NULL
                            CHECK (phase_age IN ('juvenile','entree_production','pleine_production','senescence')),
  statut                    VARCHAR(20) NOT NULL DEFAULT 'en_attente_validation'
                            CHECK (statut IN ('en_attente_validation','valide','insuffisant','archive')),
  confiance_pct             INTEGER CHECK (confiance_pct BETWEEN 0 AND 100),
  score_sante               INTEGER CHECK (score_sante BETWEEN 0 AND 100),

  -- Percentiles extraits pour accès direct (évite parsing JSONB pour l'IA)
  p50_ndvi                  DECIMAL(6,4),
  p50_nirv                  DECIMAL(6,4),
  p50_ndmi                  DECIMAL(6,4),
  p50_ndre                  DECIMAL(6,4),
  p10_ndvi                  DECIMAL(6,4),
  p10_ndmi                  DECIMAL(6,4),

  -- Potentiel extrait
  potentiel_min_t_ha        DECIMAL(6,2),
  potentiel_max_t_ha        DECIMAL(6,2),
  coefficient_etat_parcelle DECIMAL(4,2),  -- 0.65 / 0.85 / 1.0

  -- Données complètes en JSONB
  baseline                  JSONB,         -- percentiles complets, phénologie, zones
  diagnostic_explicatif     JSONB,         -- écarts, causes, resume_pourquoi
  profil_reel               JSONB,         -- données profil au moment du calibrage
  anomalies_detectees       JSONB,
  scores_detail             JSONB,         -- détail composantes score santé + confiance

  -- Rapport lisible
  rapport_agriculteur_fr    TEXT,
  rapport_agriculteur_ar    TEXT,

  valide_par_utilisateur    BOOLEAN NOT NULL DEFAULT FALSE,
  date_validation           TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `recommandations`
```sql
CREATE TABLE recommandations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id         UUID NOT NULL REFERENCES parcelles(id),
  calibrage_id        UUID REFERENCES calibrages(id),
  chemin              VARCHAR(30) NOT NULL
                      CHECK (chemin IN ('A_plan_standard','B_recommandations','C_observation')),
  date_analyse        DATE NOT NULL,
  statut              VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (statut IN ('active','plan_standard_jeune','observation','archivee')),

  -- Alertes actives (extraites pour notifications)
  alertes_urgentes    INTEGER DEFAULT 0,    -- nb alertes priorite=urgente
  alertes_prioritaires INTEGER DEFAULT 0,

  -- Données complètes
  etat_actuel         JSONB,               -- indices, stade, bilan hydrique
  alertes_actives     JSONB,
  recommandations     JSONB,
  plan_annuel_standard JSONB,              -- rempli seulement si chemin=A
  prevision_rendement JSONB,

  -- Rapport lisible
  rapport_agriculteur TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```


### Table `recommandation_evenements`
```sql
-- Journal des transitions du cycle de vie (traçabilité complète)
CREATE TABLE recommandation_evenements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommandation_id   UUID NOT NULL REFERENCES recommandations(id),
  parcelle_id         UUID NOT NULL REFERENCES parcelles(id),
  de_statut           VARCHAR(20),
  vers_statut         VARCHAR(20) NOT NULL,
  decideur            VARCHAR(20) NOT NULL CHECK (decideur IN ('IA','Exploitant')),
  motif               TEXT,
  date_transition     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reco_evenements ON recommandation_evenements(recommandation_id);
```

### Table `plans_annuels`
```sql
CREATE TABLE plans_annuels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id         UUID NOT NULL REFERENCES parcelles(id),
  calibrage_id        UUID NOT NULL REFERENCES calibrages(id),
  saison              VARCHAR(4) NOT NULL,  -- ex: "2026"
  statut              VARCHAR(20) NOT NULL DEFAULT 'actif'
                      CHECK (statut IN ('actif','archive','remplace')),

  -- Paramètres extraits
  rendement_cible_t_ha DECIMAL(6,2),
  option_nutrition    VARCHAR(2) CHECK (option_nutrition IN ('A','B','C')),
  annee_cycle         VARCHAR(10),

  -- Doses annuelles extraites
  dose_N_kg_ha        DECIMAL(7,2),
  dose_P_kg_ha        DECIMAL(7,2),
  dose_K_kg_ha        DECIMAL(7,2),

  -- Plan complet
  calendrier_mensuel  JSONB NOT NULL,
  budget_estime_dh    DECIMAL(10,2),

  -- Rapport lisible
  rapport_agriculteur TEXT,

  valide_par_utilisateur BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `taches_calendrier`
```sql
CREATE TABLE taches_calendrier (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_annuel_id      UUID NOT NULL REFERENCES plans_annuels(id),
  parcelle_id         UUID NOT NULL REFERENCES parcelles(id),
  mois                VARCHAR(3) NOT NULL,  -- Jan Feb Mar ...
  type                VARCHAR(30) NOT NULL
                      CHECK (type IN ('fertilisation','irrigation','phyto','biostimulant','taille','recolte','autre')),
  description         TEXT NOT NULL,
  date_prevue         DATE,
  date_realisee       DATE,
  statut              VARCHAR(20) NOT NULL DEFAULT 'planifiee'
                      CHECK (statut IN ('planifiee','realisee','reportee','annulee')),
  assignee_a          UUID REFERENCES utilisateurs(id),
  dose                JSONB,               -- {valeur, unite}
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `evenements_parcelle`
```sql
-- Événements qui déclenchent un recalibrage partiel (F2)
CREATE TABLE evenements_parcelle (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id         UUID NOT NULL REFERENCES parcelles(id),
  date_evenement      DATE NOT NULL,
  type                VARCHAR(50) NOT NULL
                      CHECK (type IN (
                        'nouvelle_source_eau','changement_irrigation','analyse_eau',
                        'analyse_sol','analyse_foliaire','taille_severe',
                        'arrachage_partiel','replantation','gel_constate',
                        'maladie_confirmee','autre'
                      )),
  description         TEXT,
  donnees             JSONB,               -- ex: résultats analyse eau
  recalibrage_requis  BOOLEAN DEFAULT TRUE,
  recalibrage_id      UUID REFERENCES calibrages(id),  -- rempli après recalibrage
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `suivis_saison`
```sql
-- Données de suivi et résultats pour recalibrage F3 annuel
CREATE TABLE suivis_saison (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id         UUID NOT NULL REFERENCES parcelles(id),
  plan_annuel_id      UUID REFERENCES plans_annuels(id),
  saison              VARCHAR(4) NOT NULL,

  -- Rendement réel déclaré
  rendement_reel_t_ha DECIMAL(6,2),
  date_declaration    DATE,

  -- Applications réalisées (toutes)
  applications        JSONB,   -- [{date, type, produit, dose}]

  -- Événements de la saison
  evenements          JSONB,   -- [{date, type, description}]

  -- Recalibrage F3 annuel
  recalibrage_f3_id   UUID REFERENCES calibrages(id),
  recalibrage_fait    BOOLEAN DEFAULT FALSE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Index recommandés
```sql
CREATE INDEX idx_parcelles_utilisateur ON parcelles(utilisateur_id);
CREATE INDEX idx_calibrages_parcelle ON calibrages(parcelle_id);
CREATE INDEX idx_calibrages_statut ON calibrages(parcelle_id, statut);
CREATE INDEX idx_recommandations_parcelle_date ON recommandations(parcelle_id, date_analyse DESC);
CREATE INDEX idx_taches_parcelle_statut ON taches_calendrier(parcelle_id, statut, date_prevue);
CREATE INDEX idx_evenements_parcelle ON evenements_parcelle(parcelle_id, recalibrage_requis);
```

---

## 3. WORKFLOW COMPLET — ÉTAPE PAR ÉTAPE

### ÉTAPE 1 — Ajout de la parcelle
**Déclencheur :** utilisateur crée une parcelle
**Actions :**
1. Saisir : culture, variété, système, âge, densité, surface, contour AOI, langue
   - `age_ans` est OBLIGATOIRE — bloquer la création si absent
2. Calculer automatiquement : centroïde, surface depuis polygone
3. Créer enregistrement `parcelles` avec `statut = 'en_attente_donnees'`
4. **Lancer automatiquement** le téléchargement des données satellite :
   - Si `age_ans < entree_production_annee[0]` → télécharger seulement 6 mois (mode surveillance)
   - Sinon → télécharger 12-36 mois selon disponibilité
5. Lancer téléchargement météo (ERA5/Open-Meteo) pour la même période
6. Mettre `statut = 'pret_calibrage'` quand les données sont disponibles
7. Notifier l'utilisateur

**En attente ici :** téléchargement données satellite + météo (asynchrone)

---

### ÉTAPE 2 — Calibrage
**Déclencheur :** utilisateur clique "Lancer le calibrage"
**Prérequis :** `parcelles.statut = 'pret_calibrage'`
**Actions :**
1. Passer `statut = 'calibrage_en_cours'`
2. Charger : `MOTEUR_CONFIG.json` + `DATA_[CULTURE].json`
3. Appeler `buildCalibrageSystemPrompt(moteurConfig, referentiel)`
4. Appeler l'IA Claude avec les données satellite + météo + profil
5. Parser le JSON de retour
6. Extraire les colonnes clés en DB (confiance, score, percentiles, potentiel, phase_age...)
7. Stocker le JSON complet en JSONB
8. Présenter le rapport agriculteur à l'utilisateur
9. **Attendre validation utilisateur** → bouton "Valider et activer"
10. Sur validation : `calibrages.valide_par_utilisateur = TRUE` + `parcelles.statut = 'calibre'`

**En attente ici :** validation utilisateur du rapport calibrage

---

### ÉTAPE 3 — Plan annuel (après validation calibrage)
**Déclencheur :** validation utilisateur du calibrage
**Actions :**
1. Appeler le moteur recommandations avec `mode_calibrage` et `phase_age` du calibrage
2. Si `mode_calibrage = 'lecture_pure'` (juvénile) :
   - Le moteur génère un plan annuel standard depuis référentiel uniquement
   - `chemin = 'A_plan_standard'`
3. Sinon : le moteur génère le plan annuel complet personnalisé
4. Convertir le plan en tâches calendrier (`taches_calendrier`)
5. Présenter le plan à l'utilisateur
6. **Attendre validation utilisateur** → bouton "Valider le plan"
7. Sur validation : `plans_annuels.valide_par_utilisateur = TRUE`
8. Activer les tâches calendrier
9. L'utilisateur peut assigner les tâches aux membres de l'équipe
10. `parcelles.statut = 'actif'`

**En attente ici :** validation utilisateur du plan annuel

---

### ÉTAPE 4 — Suivi continu
**Déclencheur :** automatique — toutes les 5 jours (passage Sentinel-2)
**Actions :**
1. Récupérer nouveau passage satellite si disponible (nuages < 20%)
2. Récupérer météo quotidienne + prévisions J+7
3. Appeler le moteur recommandations avec nouvelles données + baseline calibrage
4. Si alertes urgentes détectées → notification push immédiate
5. Mettre à jour l'état de la parcelle dans l'interface
6. Recommandations générées → proposer à l'utilisateur
7. L'utilisateur déclare les actions réalisées → enregistrer dans `suivis_saison.applications`

---

### ÉTAPE 5 — Recalibrage partiel F2
**Déclencheur :** utilisateur déclare un événement (`evenements_parcelle`)
**Événements déclencheurs :** nouvelle source eau, nouvelle analyse eau/sol/foliaire, taille sévère, arrachage, replantation
**Actions :**
1. Créer enregistrement `evenements_parcelle`
2. Notifier l'utilisateur qu'un recalibrage partiel est recommandé
3. **Attendre que l'utilisateur confirme** → bouton "Recalibrer maintenant"
4. Appeler le moteur recalibrage F2 avec l'événement + nouvelles données
5. Recalculer UNIQUEMENT les composantes affectées par l'événement
6. Mettre à jour le calibrage en DB (nouvelle version)
7. Régénérer les recommandations et ajustements du plan annuel si nécessaire

**En attente ici :** confirmation utilisateur du recalibrage partiel

---

### ÉTAPE 6 — Recalibrage complet F3 (fin de saison)
**Déclencheur :** fin de saison — utilisateur déclare le rendement réel
**Actions :**
1. L'utilisateur déclare dans `suivis_saison` :
   - Rendement réel (T/ha ou kg/arbre)
   - Événements notables de la saison
2. Le système présente un bilan de campagne : prévu vs réel
3. **Attendre validation utilisateur** → bouton "Clôturer la saison et recalibrer"
4. Appeler le moteur recalibrage F3 complet
5. Recalculer toute la baseline + phénologie + potentiel + confiance
6. Nouveau calibrage créé (version N+1)
7. Générer automatiquement le plan annuel de la saison suivante
8. Repartir en étape 3

**En attente ici :** déclaration rendement réel par l'utilisateur

---

## 4. POINTS IMPORTANTS POUR LE DEV

### Problème JSONB signalé
Le dev a mentionné que l'IA a du mal à lire le JSONB.
**Solution :** Ne jamais injecter le JSONB brut dans le prompt IA.
Extraire les champs clés en colonnes séparées (voir schéma) et injecter uniquement ces colonnes dans le prompt. Le JSONB complet reste en DB pour stockage mais n'est pas injecté dans l'IA.

### Injection dans les prompts IA
```typescript
// ✅ CORRECT — injecter les champs extraits
const promptInput = {
  profil: {
    parcelle_id: parcelle.id,
    culture: parcelle.culture,
    age_ans: parcelle.age_ans,
    // ... colonnes séparées
  },
  baseline: {
    confiance_pct: calibrage.confiance_pct,      // colonne séparée
    phase_age: calibrage.phase_age,              // colonne séparée
    mode_calibrage: calibrage.mode_calibrage,    // colonne séparée
    percentiles: calibrage.baseline?.percentiles // JSONB seulement pour les percentiles
  }
}

// ❌ INCORRECT — injecter tout le JSONB brut
const promptInput = { calibrage_jsonb_complet: calibrage.baseline }
```

### Langue du rapport agriculteur
La langue est stockée dans `parcelles.langue`.
Les prompts lisent ce champ et génèrent le rapport dans la bonne langue.
Stocker les deux versions (fr + ar) dans `calibrages.rapport_agriculteur_fr` et `calibrages.rapport_agriculteur_ar`.

### Référentiel chargé selon la culture
```typescript
const referentiel = await loadReferentiel(parcelle.culture);
// olivier → DATA_OLIVIER_v5.json
// agrumes → DATA_AGRUMES_v1.json
// avocatier → DATA_AVOCATIER_v1.json
// palmier_dattier → DATA_PALMIER_v1.json
```

### Données pour la couche scientifique future
La table `suivis_saison` et `evenements_parcelle` doivent stocker les données dès maintenant même si elles ne sont pas utilisées. Dans 2 ans, ces données permettront d'entraîner un modèle par culture/région/système.
