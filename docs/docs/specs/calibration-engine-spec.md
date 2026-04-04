---
sidebar_position: 7
title: "Calibration Engine Specification"
---

## MOTEUR CALIBRAGE IA

Phase 1 --- Établissement de l'État Zéro

Module Transversal --- Toutes Cultures Arboricoles

> **⚠ RÈGLE FONDAMENTALE**
> Pendant le calibrage, l'IA observe et analyse. Elle NE GÉNÈRE AUCUNE RECOMMANDATION.

Version 1.0 --- Février 2026

## PARTIE 1 --- PRINCIPES FONDAMENTAUX

### 1.1 Objectif du calibrage

Le calibrage est la première phase obligatoire de l'intégration d'une nouvelle parcelle dans le système. Son objectif est d'établir l'ÉTAT ZÉRO de la parcelle, c'est-à-dire une photographie complète et objective de son état actuel et de son comportement historique.

Le calibrage permet de :

-   Comprendre le comportement spécifique de CETTE parcelle (pas d'une parcelle générique)

-   Établir des seuils de référence personnalisés basés sur l'historique réel

-   Identifier les patterns récurrents (alternance, stress saisonniers, zones problématiques)

-   Calculer le potentiel de rendement réaliste

-   Détecter les anomalies passées qui contextualisent l'historique

-   Établir une baseline contre laquelle toutes les analyses futures seront comparées

> **⚠ PRINCIPE FONDAMENTAL**
> Le calibrage n'est PAS une analyse ponctuelle. C'est l'établissement d'un référentiel complet qui servira de base à toutes les décisions futures. Un calibrage bâclé = des recommandations erronées pendant toute la durée de vie de la parcelle dans le système.

### 1.2 Règle absolue : pas de recommandations pendant le calibrage

Pendant toute la durée du calibrage, l'IA est en mode OBSERVATION PURE. Cette règle est non négociable et s'applique sans exception.

  **Ce que l'IA PEUT faire**                **Ce que l'IA NE PEUT PAS faire**
  ------------------------------------------ --------------------------------------------
  Collecter des données satellite et météo   Émettre des recommandations d'action
  Analyser l'historique de la parcelle      Déclencher des alertes opérationnelles
  Calculer des statistiques et percentiles   Suggérer des traitements ou fertilisations
  Détecter des patterns et anomalies         Proposer des modifications de pratiques
  Établir des seuils de référence            Estimer un rendement avec promesse
  Générer un rapport d'état des lieux       Critiquer les pratiques de l'utilisateur

### 1.3 Durée et conditions du calibrage

La durée du calibrage dépend de la disponibilité des données historiques et de la qualité des données utilisateur saisies.

  **Condition**                                          **Durée calibrage**     **Niveau confiance initial**
  ------------------------------------------------------ ----------------------- ------------------------------
  Historique satellite ≥ 36 mois + données complètes     Immédiat                Élevé (75-90%)
  Historique satellite 24-36 mois + données partielles   Immédiat                Moyen (50-75%)
  Historique satellite 12-24 mois + données minimales    Immédiat mais limité    Faible (30-50%)
  Historique satellite < 12 mois                        Attente données         Très faible (<30%)
  Nouvelle plantation sans historique                    6-12 mois observation   Minimal puis croissant

### 1.4 Niveau de confiance et ses composantes

Le niveau de confiance est un score de 0 à 100% qui reflète la fiabilité de la baseline établie.

  **Composante**          **Poids**   **Description**
  ----------------------- ----------- ----------------------------------------------
  Historique satellite    30%         Durée et qualité des données S2 disponibles
  Données sol             20%         Analyse de sol complète et récente (<2 ans)
  Données eau             15%         Analyse eau irrigation disponible
  Historique rendements   20%         Rendements réels des 3-5 dernières années
  Données utilisateur     10%         Complétude du profil parcelle
  Cohérence données       5%          Absence de contradictions entre sources

## PARTIE 2 --- DONNÉES D'ENTRÉE

### 2.1 Données utilisateur obligatoires

Ces données sont saisies par l'utilisateur lors de la création de la parcelle. Elles constituent le socle minimum pour démarrer le calibrage.

  ------------------------------------------------------------------------------------
  *→ Voir Fiches de Calibrage : Formulaire F1 --- Saisie initiale nouvelle parcelle*
  ------------------------------------------------------------------------------------

  **Catégorie**   **Donnée**               **Format**     **Usage IA**
  --------------- ------------------------ -------------- ------------------------------
  Identité        Nom/Code parcelle        Texte          Référence unique
  Localisation    Contour AOI (polygone)   GeoJSON        Extraction satellite + météo
  Localisation    Surface (ha)             Auto-calculé   Calculs volumes, rendements
  Culture         Espèce                   Liste          Règles culture-spécifiques
  Culture         Variété                  Liste          Seuils variétaux, alternance
  Plantation      Densité (arbres/ha)      Numérique      Couverture, rendement/ha
  Plantation      Écartement (m × m)       Numérique      Sol visible attendu
  Plantation      Âge plantation           Années         Courbe rendement, maturité
  Plantation      Système                  Liste          Seuils satellite du système
  Irrigation      Type                     Liste          Efficience eau
  Irrigation      Fréquence                Liste          Calcul apport
  Irrigation      Volume (L/arbre)         Numérique      Bilan hydrique
  Irrigation      Source eau               Liste          Qualité eau estimée

### 2.2 Données utilisateur recommandées

Ces données améliorent significativement la précision du calibrage. Leur absence ne bloque pas le calibrage mais réduit le niveau de confiance.

  **Catégorie**   **Donnée**                                    **Impact sur confiance**
  --------------- --------------------------------------------- --------------------------
  Sol             Analyse complète (pH, CE, texture, MO, NPK)   +15-20%
  Sol             Microéléments (Fe, Zn, Mn, B, Cu)             +5%
  Sol             Calcaire actif (%)                            +3% (cultures sensibles)
  Eau             Analyse eau irrigation (CE, pH, Cl, NO3)      +10-15%
  Plante          Analyse foliaire récente                      +10%
  Historique      Rendements 3-5 dernières années               +15-20%
  Historique      Fertilisation appliquée par an                +5%
  Historique      Problèmes phytosanitaires connus              +5%

### 2.3 Données satellite extraites automatiquement

Dès que le contour AOI est validé, le système extrait automatiquement l'historique satellite disponible.

  **Source**          **Indices extraits**                           **Période**   **Fréquence**
  ------------------- ---------------------------------------------- ------------- ---------------
  Sentinel-2          NDVI, NIRv, NDMI, NDRE, EVI, MSAVI, MSI, GCI   12-36 mois    5 jours
  ERA5 / Open-Meteo   Température (min, max, moy), Précipitations    12-36 mois    Quotidien
  ERA5                ETP (évapotranspiration potentielle)           12-36 mois    Quotidien
  ERA5                Rayonnement solaire (SSRD/PAR)                 12-36 mois    Quotidien
  ERA5                Humidité relative, Vent                        12-36 mois    Quotidien

### 2.4 Hiérarchie des sources de données

En cas de conflit ou d'incohérence entre les sources, l'IA applique la hiérarchie suivante :

  **Priorité**   **Source**                                    **Raison**
  -------------- --------------------------------------------- --------------------------------------
  1 (haute)      Données terrain utilisateur (analyses labo)   Mesure directe, précise
  2              Historique rendements réels déclarés          Vérité terrain
  3              Données satellite S2                          Objectif, répétable, couvrant
  4              Données météo ERA5/Open-Meteo                 Modélisation, peut avoir biais local
  5 (basse)      Valeurs par défaut référentiel                Génériques, non personnalisées

> **⚠ RÈGLE DE COHÉRENCE**
> Si les données utilisateur contredisent fortement les données satellite (ex: rendement déclaré de 20 T/ha mais NIRv historiquement très bas), l'IA doit signaler l'incohérence et demander vérification AVANT de finaliser le calibrage.

## PARTIE 3 --- PROCESSUS DE CALIBRAGE

Le calibrage se déroule en 8 étapes séquentielles. Chaque étape doit être complétée avant de passer à la suivante.

### 3.1 Étape 1 : Extraction historique satellite

Objectif : Récupérer toutes les données satellite disponibles pour la parcelle. La profondeur historique dépend de l'âge de la parcelle (`planting_year`) :

| Âge de la parcelle | Profondeur historique |
|---|---|
| ≥ 3 ans | 36 mois |
| 2–3 ans | 24 mois |
| < 2 ans | Depuis le 1er janvier de l'année de plantation |
| `planting_year` non renseigné | 24 mois (par défaut) |

Cette logique est implémentée par `getCalibrationLookbackDate()` dans `calibration.service.ts`, identique à la stratégie de delta sync satellite (voir [Delta Sync Strategy](../features/cron-jobs.md#delta-sync-strategy)).

Processus détaillé :

-   Interrogation de l'archive Sentinel-2 pour l'AOI défini

-   Filtrage des images avec couverture nuageuse > 20% sur l'AOI

-   Pour chaque image valide : calcul des indices spectraux, extraction statistiques par pixel

-   Construction des séries temporelles pour chaque indice

-   Détection des valeurs aberrantes (> 3 écarts-types de la moyenne mobile)

-   Interpolation linéaire pour les dates manquantes (max 15 jours de gap)

  **Indice**   **Formule**                                        **Ce qu'il mesure**
  ------------ -------------------------------------------------- ---------------------------------
  NDVI         (NIR - Red) / (NIR + Red)                          Vigueur végétative générale
  NIRv         NDVI × NIR                                         Productivité photosynthétique
  NDMI         (NIR - SWIR1) / (NIR + SWIR1)                      Contenu en eau de la végétation
  NDRE         (NIR - RedEdge) / (NIR + RedEdge)                  Teneur en chlorophylle, azote
  EVI          2.5 × (NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1)   Vigueur corrigée atmosphère
  MSAVI        (2×NIR + 1 - √((2×NIR+1)² - 8×(NIR-Red))) / 2      Vigueur corrigée sol nu
  MSI          SWIR1 / NIR                                        Stress hydrique (inverse)
  GCI          (NIR / Green) - 1                                  Teneur en chlorophylle

### 3.2 Étape 2 : Extraction historique météo

Objectif : Récupérer les données climatiques pour contextualiser l'historique satellite.

Processus détaillé :

-   Extraction des coordonnées du centroïde de l'AOI

-   Requête ERA5 ou Open-Meteo pour la période correspondant à l'historique satellite

-   Extraction quotidienne : Tmin, Tmax, Tmoy, Précip, ETP, HR, Vent, Rayonnement

-   Calcul des cumuls : précipitations par mois/saison, GDD par mois, heures froid par hiver

-   Identification des événements extrêmes (gel tardif, canicule, sécheresse prolongée)

  --------------------------------------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Paramètres climatiques --- pour Tbase GDD, seuil gel, seuil stress thermique, heures froid requises*
  --------------------------------------------------------------------------------------------------------------------------------------------

### 3.3 Étape 3 : Calcul des percentiles personnalisés

Objectif : Établir les seuils de référence propres à CETTE parcelle, pas des seuils génériques.

> **⚠ PRINCIPE CLÉ**
> Les seuils génériques du référentiel culture sont des GARDE-FOUS, pas des cibles. Les vrais seuils opérationnels sont calculés à partir de l'historique de la parcelle elle-même.

Processus détaillé :

-   Pour chaque indice : regrouper toutes les valeurs historiques

-   Calculer les percentiles : P10, P25, P50 (médiane), P75, P90

-   Calculer la moyenne et l'écart-type

-   Si historique >24 mois : segmenter par période phénologique (dormance, croissance, floraison, maturation)

-   Comparer aux seuils génériques du référentiel

  **Percentile**   **Signification**                  **Usage opérationnel**
  ---------------- ---------------------------------- ----------------------------
  P10              Valeur très basse (10% du temps)   Seuil d'alerte critique
  P25              Valeur basse (25% du temps)        Seuil de vigilance
  P50              Valeur médiane (normale)           Référence de comparaison
  P75              Valeur haute                       Bonne condition
  P90              Valeur très haute                  Excellent / Possible excès

### 3.4 Étape 4 : Détection de la phénologie historique

Objectif : Identifier les dates typiques des stades phénologiques pour cette parcelle.

Processus détaillé :

-   Analyser la courbe NIRv (ou NDVI) sur chaque année disponible

-   Identifier les points caractéristiques : sortie dormance, pic végétation, plateau estival, déclin automnal, entrée dormance

-   Calculer les dates moyennes pour chaque point caractéristique

-   Calculer l'écart-type des dates (variabilité inter-annuelle)

-   Corréler avec le cumul GDD pour chaque point

  ------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Stades BBCH --- pour les stades phénologiques et GDD attendus*
  ------------------------------------------------------------------------------------------------------

### 3.5 Étape 5 : Détection des anomalies passées

Objectif : Identifier les événements anormaux qui contextualisent l'historique.

Types d'anomalies recherchées :

-   Chute brutale d'un indice (> 25% en < 15 jours) → événement ponctuel (gel, grêle, maladie)

-   Déclin progressif sur plusieurs mois → stress chronique (sécheresse, carence)

-   Valeur anormalement basse/haute vs historique → année exceptionnelle

-   Rupture de tendance → changement de pratique (irrigation, taille sévère)

-   Hétérogénéité spatiale soudaine → problème localisé (maladie foyer, fuite irrigation)

Pour chaque anomalie détectée, l'IA :

-   Enregistre la date et la nature de l'anomalie

-   Croise avec les données météo (gel, canicule, sécheresse ?)

-   Croise avec les données utilisateur (changement déclaré ?)

-   Marque la période pour contextualisation (ne pas utiliser comme référence normale)

### 3.6 Étape 6 : Calcul du potentiel de rendement initial

Objectif : Estimer le rendement potentiel réaliste de la parcelle.

> **⚠ ATTENTION**
> Le potentiel de rendement calculé au calibrage est une ESTIMATION INITIALE. Il sera affiné après chaque campagne avec les rendements réels déclarés. L'IA ne doit JAMAIS présenter ce potentiel comme une promesse.

Méthode de calcul :

-   SI historique rendements réels disponible (≥ 3 ans) : Potentiel = Moyenne des 3 meilleures années × 1.1

-   SI PAS d'historique rendements : Estimation basée sur NIRvP cumulé × coefficients culture

  -----------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Modèle prédictif rendement --- pour les coefficients et la formule*
  -----------------------------------------------------------------------------------------------------------

### 3.7 Étape 7 : Détection des zones intra-parcellaires

Objectif : Identifier l'hétérogénéité spatiale de la parcelle.

Processus détaillé :

-   Construire une carte de vigueur moyenne (NIRv ou NDVI médian sur 12+ mois)

-   Classifier chaque pixel en 5 classes :

• Classe A (> P90) : Zone très vigoureuse

• Classe B (P75-P90) : Zone vigoureuse

• Classe C (P25-P75) : Zone normale

• Classe D (P10-P25) : Zone faible

• Classe E (< P10) : Zone problématique

-   Calculer le pourcentage de surface dans chaque classe

-   Identifier les patterns spatiaux (gradient, taches, lignes)

### 3.8 Étape 8 : Score de santé initial

Objectif : Synthétiser l'état général de la parcelle en un score compréhensible.

  **Composante**         **Poids**   **Calcul**
  ---------------------- ----------- ------------------------------------------------
  Vigueur végétative     30%         Position du NIRv médian vs référentiel culture
  Homogénéité spatiale   20%         \% surface en classe C ou mieux
  Stabilité temporelle   15%         Faible variance inter-annuelle = bon
  État hydrique          20%         Position NDMI vs percentiles
  État nutritionnel      15%         Position NDRE vs percentiles

  **Score**   **Interprétation**   **Communication utilisateur**
  ----------- -------------------- ----------------------------------------------------------------
  80-100      Excellent            La parcelle est en très bon état général.
  60-80       Bon                  La parcelle est en bon état avec quelques points d'attention.
  40-60       Moyen                La parcelle présente des faiblesses à investiguer.
  20-40       Faible               La parcelle montre des signes de stress significatifs.
  0-20        Critique             La parcelle nécessite une attention urgente.

## PARTIE 4 --- CALCUL DES SEUILS PERSONNALISÉS

### 4.1 Principe : seuils parcellaires vs seuils génériques

Le système utilise DEUX types de seuils qui jouent des rôles différents :

  **Type**              **Source**                            **Rôle**                               **Priorité**
  --------------------- ------------------------------------- -------------------------------------- ----------------
  Seuils parcellaires   Calculés depuis historique parcelle   Référence principale pour diagnostic   1 (primaire)
  Seuils génériques     Référentiel culture (par système)     Garde-fous, validation cohérence       2 (secondaire)

> **⚠ RÈGLE**
> Les seuils parcellaires sont TOUJOURS utilisés pour le diagnostic opérationnel. Les seuils génériques servent uniquement à valider que les seuils parcellaires sont cohérents et à définir des limites absolues.

### 4.2 Méthode de calcul pour chaque indice

Pour chaque indice spectral, les seuils sont calculés comme suit :

-   SEUIL D'ALERTE CRITIQUE = P10 parcelle

-   SEUIL DE VIGILANCE = P25 parcelle

-   SEUIL NORMAL BAS = P40 parcelle

-   RÉFÉRENCE = P50 parcelle (médiane)

-   SEUIL NORMAL HAUT = P60 parcelle

-   SEUIL EXCELLENT = P75 parcelle

-   SEUIL EXCÈS POSSIBLE = P90 parcelle

### 4.3 Ajustement selon le système de plantation

Les seuils parcellaires doivent être validés contre les seuils génériques du système de plantation.

  --------------------------------------------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Systèmes de plantation --- pour les seuils satellite par système (traditionnel, intensif, super-intensif)*
  --------------------------------------------------------------------------------------------------------------------------------------------------

Règles de validation :

-   SI P50 parcelle < seuil alerte référentiel système : La parcelle est historiquement en mauvais état → Signaler à l'utilisateur

-   SI P50 parcelle > seuil optimal référentiel système : La parcelle performe au-dessus de la moyenne → Les seuils parcellaires restent la référence

-   SI écart > 50% entre seuils parcellaires et génériques : Incohérence possible → Vérifier le système déclaré vs système réel

### 4.4 Ajustement selon l'âge de la plantation

Les jeunes plantations et les plantations sénescentes ont des comportements spectraux différents.

  ------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Courbe de rendement par âge --- pour les coefficients d'ajustement*
  ------------------------------------------------------------------------------------------------------------

  **Phase**           **Âge typique**   **Ajustement seuils**
  ------------------- ----------------- --------------------------------------
  Juvénile            0-5 ans           Seuils de vigueur abaissés de 20-30%
  Entrée production   5-10 ans          Seuils progressivement normalisés
  Pleine production   10-40 ans         Seuils standards
  Maturité avancée    40-60 ans         Seuils légèrement abaissés
  Sénescence          > 60 ans         Seuils abaissés de 10-20%

### 4.5 Cas des parcelles sans historique suffisant

Si l'historique satellite est inférieur à 12 mois, le calibrage est limité.

Stratégie pour historique insuffisant :

-   Utiliser les seuils génériques du référentiel comme référence temporaire

-   Marquer le niveau de confiance comme FAIBLE

-   Activer le mode \"calibrage progressif\" :

\- À 6 mois d'historique : premiers percentiles parcellaires (faible confiance)

\- À 12 mois : percentiles utilisables (confiance moyenne)

\- À 24 mois : percentiles fiables (confiance élevée)

-   Notifier l'utilisateur de l'évolution du niveau de confiance

## PARTIE 5 --- NIVEAU DE CONFIANCE

### 5.1 Composantes du score de confiance

Le niveau de confiance est un score composite de 0 à 100% qui reflète la fiabilité globale du calibrage.

  **Composante**          **Poids max**   **Critères de scoring**
  ----------------------- --------------- ----------------------------------------------------------------------
  Historique satellite    30 pts          36+ mois = 30 \| 24-36 mois = 20 \| 12-24 mois = 10 \| <12 mois = 5
  Analyse sol             20 pts          Complète <2 ans = 20 \| Partielle = 10 \| Absente = 0
  Analyse eau             15 pts          Complète = 15 \| Partielle = 8 \| Absente = 0
  Historique rendements   20 pts          5+ ans = 20 \| 3-4 ans = 15 \| 1-2 ans = 8 \| Aucun = 0
  Profil complet          10 pts          100% champs remplis = 10 \| Prorata sinon
  Cohérence données       5 pts           Pas d'incohérence = 5 \| Mineures = 2 \| Majeures = 0

  **Score**   **Niveau**   **Conséquence**
  ----------- ------------ --------------------------------------------------------------
  75-100%     ÉLEVÉ        Recommandations avec haute confiance
  50-75%      MOYEN        Recommandations avec prudence, vérification terrain suggérée
  25-50%      FAIBLE       Recommandations limitées, nombreuses vérifications requises
  0-25%       MINIMAL      Mode observation, pas de recommandations actives

### 5.2 Impact des données manquantes

Chaque donnée manquante a un impact spécifique sur le calibrage et les recommandations futures.

  **Donnée manquante**    **Impact calibrage**                  **Impact recommandations**
  ----------------------- ------------------------------------- ---------------------------------------------------
  Analyse sol             Fertilisation basée sur export seul   Doses NPK moins précises, pas de correction sol
  Analyse eau             Salinité non prise en compte          Risque de sous-estimer le lessivage requis
  Historique rendements   Potentiel basé sur satellite seul     Prévisions moins fiables, alternance mal détectée
  Âge plantation          Courbe maturité non appliquée         Seuils potentiellement inadaptés
  Densité réelle          Estimation depuis écartement          Calculs volumes/arbre imprécis

### 5.3 Évolution du score dans le temps

Le niveau de confiance n'est pas statique. Il évolue à chaque événement significatif.

  **Événement**                                   **Impact sur confiance**
  ----------------------------------------------- --------------------------
  Nouvelle campagne validée avec rendement réel   +5 à +10 pts
  Nouvelle analyse sol/eau uploadée               +5 à +15 pts
  12 mois supplémentaires de données satellite    +5 pts
  Incohérence détectée entre prévision et réel    -5 à -10 pts
  Données utilisateur corrigées après erreur      -2 pts (temporaire)

### 5.4 Seuil minimum pour passer en phase opérationnelle

Pour qu'une parcelle puisse recevoir des recommandations actives, un niveau minimum est requis.

> **⚠ RÈGLE**
> Le seuil minimum pour activer les recommandations est de 25% de confiance. En dessous, la parcelle reste en mode observation (calibrage progressif).

Conditions minimales absolues pour passer en phase opérationnelle :

-   AU MOINS 6 mois d'historique satellite

-   AU MOINS les données obligatoires du profil (culture, variété, système, irrigation)

-   PAS d'incohérence majeure non résolue

-   Validation explicite de l'utilisateur de la baseline

## PARTIE 6 --- DÉTECTION D'ANOMALIES HISTORIQUES

### 6.1 Changements de source d'eau

Un changement de source d'eau (ex: passage puits → barrage) peut modifier significativement le comportement de la parcelle.

Détection :

-   Donnée déclarée par l'utilisateur (formulaire F1)

-   OU rupture détectée dans la série NDMI sans cause météo

Action IA :

-   Segmenter l'historique en AVANT et APRÈS le changement

-   Calculer des percentiles séparés pour chaque période

-   Utiliser uniquement la période APRÈS comme référence (si > 6 mois)

-   Documenter le changement dans le rapport de calibrage

### 6.2 Changements de régime d'irrigation

Un changement de fréquence ou volume d'irrigation impacte directement les indices hydriques.

Détection :

-   Donnée déclarée par l'utilisateur (formulaire F1)

-   OU changement de niveau moyen du NDMI sans cause météo

Action IA : Même logique que pour le changement de source, plus recalcul du bilan hydrique avec les nouveaux paramètres.

### 6.3 Événements climatiques extrêmes

Les événements extrêmes (gel, canicule, sécheresse prolongée, grêle) laissent des traces dans l'historique satellite.

  **Événement**            **Signature satellite**               **Action IA**
  ------------------------ ------------------------------------- -----------------------------------------------------
  Gel tardif (floraison)   Chute brutale NIRv en avril-mai       Marquer année anormale, exclure du calcul potentiel
  Canicule prolongée       Chute NDMI + NDVI simultanée en été   Marquer la période, contextualiser
  Sécheresse (> 3 mois)   Déclin progressif tous indices        Marquer la période, ajuster les percentiles
  Grêle                    Chute brutale localisée               Détecter la zone, marquer l'événement
  Chergui (vent chaud)     Chute brutale MSI, NDMI               Croiser avec données météo, documenter

### 6.4 Interventions majeures

Certaines interventions agricoles modifient durablement le profil spectral de la parcelle.

  **Intervention**                 **Signature satellite**             **Durée impact**
  -------------------------------- ----------------------------------- ------------------
  Taille sévère / rajeunissement   Chute NDVI 30-50%, lente remontée   12-24 mois
  Arrachage partiel                Zones à NDVI nul permanent          Permanent
  Replantation partielle           Hétérogénéité nouvelle              Variable
  Changement couvert sol           Modification MSAVI inter-rang       Permanent
  Installation irrigation          Hausse NDMI progressive             3-6 mois

### 6.5 Comment l'IA contextualise l'historique

L'IA ne traite pas aveuglément toutes les données historiques. Elle les contextualise.

Principes de contextualisation :

-   Les périodes anormales identifiées sont EXCLUES du calcul des percentiles de référence

-   Les événements sont DOCUMENTÉS pour explication future à l'utilisateur

-   Si > 50% de l'historique est anormal, le calibrage est marqué LIMITÉ

-   L'IA cherche la \"normalité\" de la parcelle, pas la moyenne de tout ce qui s'est passé

> **⚠ PRINCIPE**
> Le calibrage doit refléter le POTENTIEL NORMAL de la parcelle, pas ses pires moments. Une année de gel ne doit pas définir les seuils de référence.

## PARTIE 7 --- SORTIES DU CALIBRAGE

### 7.1 Baseline établie

À la fin du calibrage, une BASELINE complète est établie. C'est le référentiel contre lequel toutes les analyses futures seront comparées.

  **Catégorie**      **Éléments**                                     **Format**
  ------------------ ------------------------------------------------ ------------------------
  Profil             Toutes les données utilisateur saisies           Structured JSON
  Seuils spectraux   P10, P25, P50, P75, P90 pour chaque indice       Table numérique
  Seuils par stade   Percentiles segmentés par période phénologique   Table numérique
  Phénologie         Dates moyennes des stades, GDD associés          Table dates + GDD
  Potentiel          Rendement potentiel estimé, fourchette           Numérique + intervalle
  Zones              Classification spatiale A/B/C/D/E                Raster géoréférencé
  Score santé        Score 0-100 et détail composantes                Numérique + breakdown
  Confiance          Score 0-100% et détail composantes               Numérique + breakdown
  Anomalies          Liste des événements détectés avec dates         Liste structurée
  Métadonnées        Date calibrage, version, sources utilisées       Metadata

### 7.2 Rapport de calibrage initial

Un rapport est généré pour l'utilisateur, résumant l'état des lieux de sa parcelle.

Structure du rapport :

1\. SYNTHÈSE EXÉCUTIVE

-   Score de santé global avec interprétation

-   Niveau de confiance du calibrage

-   Potentiel de rendement estimé

-   Points forts identifiés

-   Points d'attention identifiés

2\. ANALYSE DÉTAILLÉE

-   État de la vigueur végétative (NIRv, NDVI)

-   État hydrique (NDMI, MSI)

-   État nutritionnel estimé (NDRE)

-   Homogénéité spatiale (carte zones)

-   Historique phénologique

3\. ANOMALIES DÉTECTÉES

-   Liste des événements passés identifiés

-   Impact sur le calibrage

4\. RECOMMANDATIONS D'AMÉLIORATION DU CALIBRAGE

-   Données manquantes suggérées (analyse sol, etc.)

-   Vérifications terrain recommandées

### 7.3 Ce que l'IA peut communiquer à l'utilisateur

Pendant et après le calibrage, l'IA peut communiquer uniquement des CONSTATS, pas des ACTIONS.

  **Autorisé (constats)**                                          **Interdit (actions)**
  ---------------------------------------------------------------- --------------------------------------------------------------
  \"Votre parcelle présente un score de santé de 72/100.\"         \"Vous devriez irriguer davantage.\"
  \"L'historique montre un stress hydrique récurrent en août.\"   \"Appliquez un traitement contre le stress.\"
  \"Le potentiel de rendement estimé est de 8-10 T/ha.\"           \"Vous pouvez espérer 15 T/ha si vous suivez mes conseils.\"
  \"Une zone faible est détectée dans le quart nord-est.\"         \"Fertilisez davantage cette zone.\"
  \"Les données sol manquantes réduisent la précision.\"           \"Faites une analyse sol immédiatement.\"

### 7.4 Ce que l'IA NE DOIT PAS communiquer

Les éléments suivants sont strictement interdits pendant la phase de calibrage :

-   Toute recommandation d'ACTION (irrigation, fertilisation, traitement)

-   Toute ALERTE opérationnelle (stress, maladie, carence)

-   Toute PRÉDICTION de rendement présentée comme fiable

-   Toute CRITIQUE des pratiques actuelles de l'utilisateur

-   Tout CONSEIL non sollicité sur la gestion de la parcelle

> **⚠ FORMULATION TYPE**
> \"Le calibrage de votre parcelle est en cours. Une fois validé, vous recevrez des recommandations personnalisées basées sur l'état réel de votre parcelle.\"

## PARTIE 8 --- CONDITIONS DE SORTIE DU CALIBRAGE

### 8.1 Données minimales requises

Pour qu'un calibrage soit considéré comme COMPLET et permettre le passage en phase opérationnelle, les conditions suivantes doivent être remplies :

  **Catégorie**   **Condition**                                        **Obligatoire**
  --------------- ---------------------------------------------------- ------------------------
  Profil          Culture, variété, système, âge renseignés            OUI
  Profil          Irrigation (type, fréquence, volume) renseignée      OUI
  Satellite       Minimum 6 mois d'historique exploitable             OUI
  Satellite       Au moins 10 images valides (non nuageuses)           OUI
  Calculs         Percentiles calculés pour NDVI, NIRv, NDMI minimum   OUI
  Cohérence       Pas d'incohérence majeure non résolue               OUI
  Sol             Analyse sol disponible                               NON (réduit confiance)
  Eau             Analyse eau disponible                               NON (réduit confiance)
  Rendement       Historique rendements disponible                     NON (réduit confiance)

### 8.2 Validation utilisateur obligatoire

Le calibrage ne peut être finalisé qu'avec une validation EXPLICITE de l'utilisateur.

Processus de validation :

-   Le système présente le rapport de calibrage à l'utilisateur

-   L'utilisateur vérifie que les données sont correctes

-   L'utilisateur peut corriger des erreurs si nécessaire

-   L'utilisateur clique sur \"Valider et activer les recommandations\"

-   Le système enregistre la date de validation et passe en phase opérationnelle

> **⚠ IMPORTANT**
> Sans validation utilisateur, la parcelle reste en mode calibrage. Aucune recommandation n'est générée. L'utilisateur doit explicitement accepter la baseline.

### 8.3 Transition vers la phase opérationnelle

Une fois le calibrage validé, le système bascule automatiquement en phase opérationnelle.

Changements activés :

-   Les alertes sont activées (codes culture : OLI-XX pour olivier, etc.)

-   Les recommandations peuvent être générées

-   Le plan annuel est calculé

-   Le suivi continu démarre

-   Les notifications sont activées

  -------------------------------------------------------------------------------------
  *→ Voir Moteur Opérationnel IA : pour le fonctionnement de la phase opérationnelle*
  -------------------------------------------------------------------------------------

La baseline reste modifiable après validation via :

-   Formulaire F2 : Recalibrage partiel (changement ponctuel)

-   Formulaire F3 : Recalibrage annuel (post-campagne)

  -----------------------------------------------------
  *→ Voir Fiches de Calibrage : Formulaires F2 et F3*
  -----------------------------------------------------

*--- Fin du document Moteur Calibrage IA v1.0 ---*
