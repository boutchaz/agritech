
MOTEUR CALIBRAGE IA
Phase 1 — Établissement de l’État Zéro
Module Transversal — Toutes Cultures Arboricoles


Version 2.0 — Avril 2026

# PARTIE 1 — PRINCIPES FONDAMENTAUX
## 1.1 Objectif du calibrage
Le calibrage est la première phase obligatoire de l’intégration d’une nouvelle parcelle dans le système. Son objectif est d’établir l’ÉTAT ZÉRO de la parcelle, c’est-à-dire une photographie complète et objective de son état actuel et de son comportement historique.
Le calibrage permet de : comprendre le comportement spécifique de CETTE parcelle (pas d’une parcelle générique), établir des seuils de référence personnalisés basés sur l’historique réel, identifier les patterns récurrents (alternance, stress saisonniers, zones problématiques), calculer le potentiel de rendement réaliste, détecter les anomalies passées qui contextualisent l’historique, et établir une baseline contre laquelle toutes les analyses futures seront comparées.

## 1.2 Règle absolue : pas de recommandations pendant le calibrage
Pendant toute la durée du calibrage, l’IA est en mode OBSERVATION PURE. Cette règle est non négociable et s’applique sans exception.

## 1.3 Durée et conditions du calibrage
La durée du calibrage dépend de la disponibilité des données historiques et de la qualité des données utilisateur saisies. Le minimum absolu pour démarrer un calibrage est de 12 mois d'historique satellite exploitable.

### Profondeur historique satellite (selon l'âge de l'arbre)

La profondeur de l'historique extrait dépend de l'âge de la parcelle (calculé à partir de `planting_year`) :

| Âge de la parcelle | Profondeur historique |
|---|---|
| ≥ 3 ans | 36 mois |
| 2–3 ans | 24 mois |
| < 2 ans | Depuis le 1er janvier de l'année de plantation |
| `planting_year` non renseigné | 24 mois (par défaut) |

Cette logique est partagée entre la synchronisation satellite (cron jobs) et le moteur de calibrage via `getCalibrationLookbackDate()`. Voir aussi [Delta Sync Strategy](../features/cron-jobs.md#delta-sync-strategy).


## 1.4 Hiérarchie des sources de données
En cas de conflit ou d’incohérence entre les sources, l’IA applique la hiérarchie suivante :



# PARTIE 2 — EXTRACTION ET NETTOYAGE DES DONNÉES HISTORIQUES (Étape 1.1)
## 2.1 Extraction des séries temporelles satellite
Dès que le contour AOI est validé, le système extrait automatiquement l’historique Sentinel-2 disponible. La profondeur dépend de l’âge de la parcelle (voir §1.3) : de 24 à 36 mois pour les parcelles matures, depuis le 1er janvier de l’année de plantation pour les jeunes parcelles. Pour chaque image valide, les indices spectraux sont calculés et les statistiques par pixel extraites sur l’AOI.

## 2.2 Filtrage et nettoyage
Le processus de nettoyage suit les règles du Protocole Phénologique (document technique de référence) :
Masque nuageux : seuls les pixels avec SCL ∈ {4 (végétation), 5 (sol nu)} sont retenus. Si aucun pixel pur n’est disponible sur l’AOI, la date est exclue.
Seuil minimal de pixels : si moins de 5 pixels purs sont disponibles après filtrage, la date est exclue.
Buffer négatif : un retrait de 10 m (1 pixel) est appliqué sur les bordures du polygone pour éviter les effets de mélange spectral.
Filtre de plausibilité temporelle : toute valeur avec une variation > 30% par rapport à la date précédente est marquée comme SUSPECTE. Si dans les 10 jours suivants la valeur revient à ±10% de la valeur précédente, l’artéfact est confirmé et la valeur suspecte est exclue définitivement.
Agrégation : pour chaque indice et chaque date valide, la valeur retenue est la MÉDIANE des pixels purs sur l’AOI.
Lissage : après accumulation de données suffisantes, un lissage Whittaker (lambda 10-100) ou Savitzky-Golay (fenêtre 5-7 points, polynôme ordre 2) est appliqué sur chaque série temporelle.
## 2.3 Modèle chill–heating pour le calcul GDD
Le calcul des degrés-jours de croissance (GDD) ne démarre PAS à une date calendaire fixe. Il suit un modèle chill–heating en deux phases, basé sur De Melo-Abreu et al. (2004). Ce modèle a été validé sur 3 parcelles avec une précision confirmée.

Phase 1 — Accumulation du froid (dormance)
À partir de la chute des températures automnales, l’IA comptabilise les heures où T < 7.2°C (chill units). Le seuil de chill units requis pour lever la dormance dépend de la variété.


Phase 2 — Forçage thermique (GDD plafonnés)
Une fois la dormance levée, le cumul GDD démarre, mais seulement si une DOUBLE CONDITION est remplie :
Condition thermique : Tmoy > Tbase (7.5°C, référence Moriondo et al., 2001)
Condition satellite : hausse NIRv ou NIRvP ≥ 20% par rapport à la date précédente, confirmant une reprise d’activité végétative
Ce point d’activation est le stade phénologique 0 — il est différent chaque année et chaque parcelle. C’est l’approche la plus rigoureuse car les dates de départ pour accumuler la chaleur sont différentes spatialement et temporellement.

Formule GDD plafonnée
GDD = (Tmax* + Tmin*) / 2 − Tbase
Avec : Tmax* = min(Tmax, 30°C) et Tmin* = max(Tmin, 7.5°C)



## 2.4 Alignement temporel satellite / météo
Les données satellite (tous les 5 jours, irrégulier après filtrage nuageux) et les données météo (quotidiennes) sont alignées sur un axe temporel commun. Pour chaque date d’acquisition satellite valide, les variables météo correspondantes sont extraites : cumul de précipitations sur 30 jours, pourcentage de jours avec Tmax > 30°C sur 30 jours, GDD cumulé depuis l’activation, et heures de froid cumulées pendant la dormance.

# PARTIE 3 — CALCUL DES PERCENTILES PERSONNALISÉS (Étape 1.2)
## 3.1 Principe : percentiles bruts, pas de correction artificielle
Les percentiles sont calculés à partir des valeurs historiques brutes, quelle que soit la profondeur d’historique (12, 24 ou 36 mois). L’IA n’applique AUCUN facteur correctif pour compenser un historique court — elle ne « gonfle » pas artificiellement les percentiles. La compensation se fait uniquement par une pénalité sur le score de confiance.

## 3.2 Découpage par périodes phénologiques
L’année n’est PAS découpée en mois calendaires mais en périodes phénologiques définies par les transitions de phase du Protocole Phénologique (dormance, débourrement, floraison, nouaison, stress estival, reprise automnale). Les percentiles sont calculés par indice ET par période phénologique.
## 3.3 Percentiles calculés

## 3.4 Validation croisée avec les garde-fous référentiel
Après calcul, les percentiles parcellaires sont comparés aux seuils génériques du référentiel pour le système de plantation déclaré. Les seuils génériques ne remplacent JAMAIS les percentiles parcellaires — ils servent uniquement de filet de sécurité.


## 3.5 Pénalité de confiance selon la profondeur d’historique
La profondeur d’historique satellite impacte directement le score de confiance (Bloc A du score composite) mais ne modifie pas les percentiles eux-mêmes.


# PARTIE 4 — DÉTECTION DE LA PHÉNOLOGIE HISTORIQUE (Étape 1.3)
## 4.1 Protocole Phénologique — Document technique de référence
La détection des stades phénologiques est effectuée par un algorithme dédié décrit dans un document technique séparé : le Protocole Phénologique Olivier Sentinel-2 (version 2.1, format JSON-B Agent IA). Ce protocole a été validé sur 3 parcelles avec une précision confirmée.

## 4.2 Architecture de l’algorithme
L’algorithme est une machine à états phénologique avec 6 phases. Chaque phase a des conditions d’entrée, de maintien et de sortie formalisées. Il n’existe pas de Phase 5 (la récolte a été intégrée comme sous-phase de la Phase 4 car elle n’est pas détectable spectralement de manière autonome).

## 4.3 Seuils GDD de transition
Les seuils GDD utilisés pour les transitions de phase sont ceux du Protocole Phénologique validé, calculés avec Tbase = 7.5°C. Ils remplacent les seuils BBCH du référentiel (calculés avec Tbase = 10°C) pour toutes les opérations du calibrage et du suivi opérationnel.

## 4.4 Spécificités de l’algorithme
Le protocole intègre plusieurs mécanismes avancés qui le distinguent d’une simple analyse de courbes : un système de classification de l’état du signal (SIGNAL_PUR, MIXTE_MODÉRÉ, DOMINÉ_ADVENTICES) qui détermine la fiabilité des indices spectraux à chaque date ; un mode amorçage activé quand moins de 3 cycles complets sont disponibles, avec rétrogradation automatique de la confiance et valeurs par défaut calibrées ; un système de 7 alertes spécifiques (stress fonctionnel invisible, canicule en floraison, déclin parcelle, débourrement prématuré, reprise avortée, rupture spectrale, gel tardif) ; et une discrimination olivier/adventices par cinétique différentielle dNDVI/dt vs dNIRv/dt.
## 4.5 Sortie de la détection phénologique pour le calibrage
Pour chaque saison dans l’historique, l’algorithme produit : les dates de début et fin de chaque phase, les GDD cumulés à chaque transition, le niveau de confiance par phase, les alertes détectées, et les décalages parcelle vs référentiel. Ces données alimentent le profil phénologique parcellaire stocké dans la baseline.

# PARTIE 5 — DÉTECTION ET EXCLUSION DES ANOMALIES PASSÉES (Étape 1.4)
## 5.1 Règle de triple confirmation obligatoire
Une période n’est exclue du calcul des percentiles que si TROIS sources convergent. Cette règle est stricte et non négociable. Elle minimise le risque d’exclure à tort des données qui font partie du comportement normal de la parcelle.


## 5.2 Événements détectables

## 5.3 Traitement des périodes exclues
Quand une période est exclue par triple confirmation, elle est marquée dans la baseline avec sa date, sa nature, et les trois sources de confirmation. Elle est retirée du calcul des percentiles de référence mais conservée dans l’historique pour documentation et explication future à l’utilisateur.
Si plus de 50% de l’historique est anormal (après exclusion), le calibrage est marqué LIMITÉ et le score de confiance est fortement pénalisé.

## 5.4 Changements de régime détectés
Certains changements ne sont pas des anomalies à exclure mais des ruptures de régime qui nécessitent une segmentation de l’historique :


# PARTIE 6 — ESTIMATION DU POTENTIEL DE RENDEMENT INITIAL (Étape 1.5)
## 6.1 Méthode de calcul
Le potentiel de rendement est estimé par croisement de plusieurs sources, selon leur disponibilité. L’estimation est TOUJOURS exprimée en fourchette, jamais en valeur unique.


## 6.2 Variables du modèle prédictif

## 6.3 Indice d’alternance initial
L’IA calcule un indice d’alternance initial à partir de la comparaison inter-annuelle du NIRvP au même stade GDD. Si le NIRvP de l’année N est très supérieur à celui de N-1 au même GDD, une année ON est probable. Si très inférieur, une année OFF est probable. L’indice d’alternance par variété (Picholine Marocaine : 0.35, Haouzia : 0.22, etc.) est utilisé comme référence.
## 6.4 Cas sans historique de récolte
Si l’agriculteur ne déclare aucun historique de récolte, le potentiel est estimé uniquement à partir du référentiel (rendement par variété et par âge, section 3.2 du REF_OLIVIER) croisé avec le satellite (NIRvP cumulé). La marge d’erreur est élargie de 50% par rapport au cas avec historique, et la confiance est plafonnée sur le volet rendement.


# PARTIE 7 — ZONES INTRA-PARCELLAIRES ET RAPPORT DE CALIBRAGE (Étape 1.6)
## 7.1 Détection de l’hétérogénéité spatiale
L’IA analyse pixel par pixel la variance spatiale des indices sur l’AOI pour identifier les zones qui se comportent différemment. La carte de vigueur moyenne (NIRv ou NDVI médian sur 12+ mois) est construite et chaque pixel est classé en 5 classes :


Le pourcentage de surface dans chaque classe est calculé, et les patterns spatiaux sont identifiés (gradient, taches, lignes). Une hétérogénéité est déclarée significative si plus de 20% de la surface est en classe D ou E.
## 7.2 Score de santé initial
Un score de santé de 0 à 100 est calculé pour synthétiser l’état général de la parcelle. Ce score est DISTINCT du score de confiance (qui mesure la fiabilité du calibrage, pas l’état de la parcelle).


## 7.3 Rapport de calibrage
Un rapport est généré pour l’utilisateur, résumant l’état des lieux de sa parcelle. Sa structure est : (1) Synthèse exécutive avec score de santé, niveau de confiance, potentiel de rendement, points forts et points d’attention ; (2) Analyse détaillée de la vigueur, de l’état hydrique, de l’état nutritionnel estimé, de l’homogénéité spatiale et de l’historique phénologique ; (3) Anomalies détectées avec leur impact sur le calibrage ; (4) Message d’amélioration dynamique.
## 7.4 Message d’amélioration dynamique
Le rapport affiche les données disponibles en vert, les données manquantes en orange avec l’impact sur la précision, et un message concret indiquant ce que l’agriculteur gagnerait en ajoutant telle ou telle donnée.


# PARTIE 8 — CONDITIONS DE SORTIE DU CALIBRAGE ET VALIDATION (Étape 1.7)
## 8.1 Score de confiance composite
Le niveau de confiance est un score composite de 0 à 100 points, structuré en deux blocs. Ce score reflète la fiabilité globale du calibrage et détermine les capacités du Moteur Opérationnel.

Bloc A — Qualité données satellite (25 points)

Bloc B — Qualité données utilisateur (75 points)
## 8.2 Niveaux de confiance et conséquences

## 8.3 Cas types vérifiés
Le score a été calibré pour refléter la réalité du terrain marocain, où la majorité des oléiculteurs n’ont ni analyse sol ni analyse eau.

## 8.4 Calibrage sans analyse sol ni analyse eau
La majorité des oléiculteurs marocains n’ont ni analyse sol ni analyse eau. Le calibrage est autorisé dans ce cas — le système ne bloque JAMAIS un agriculteur qui a un historique satellite suffisant et un profil de base complet.

Ce que l’IA PEUT faire sans sol ni eau
Toutes les recommandations basées sur le satellite et la météo fonctionnent normalement : diagnostic spectral, détection de stress hydrique via NDMI, phénologie, alertes climatiques (gel, canicule, chergui), suivi de tendance, prévision de rendement (dans ses limites habituelles). La recommandation nutritionnelle est émise sur la base des doses génériques du référentiel (programme NPK par stade). L’irrigation est pilotée par le bilan hydrique (ETP, Kc, précipitations) + NDMI satellite.

Ce que l’IA NE PEUT PAS faire sans sol ni eau
Ajuster les doses d’engrais au pH réel du sol (blocage microéléments sur sol calcaire). Calculer la fraction de lessivage pour l’eau saline. Détecter un risque salinité sol. Personnaliser les formes d’engrais (chélates EDDHA vs EDTA selon le calcaire actif).

Posture de l’IA
L’IA émet ses recommandations génériques avec un avertissement systématique : « Cette recommandation est basée sur les doses standard pour votre système et variété. Une analyse sol permettrait d’ajuster les doses et de détecter d’éventuels blocages. » Le message d’amélioration dans le rapport de calibrage pousse vers l’analyse sol/eau comme levier de précision, pas comme prérequis. L’IA ne bloque jamais.

## 8.5 Conditions minimales absolues pour passer en phase opérationnelle

## 8.6 Transition vers la phase opérationnelle
Une fois le calibrage validé, le système bascule automatiquement en phase opérationnelle. Les alertes sont activées (codes culture OLI-XX pour l’olivier), les recommandations peuvent être générées, le plan annuel est calculé, le suivi continu démarre, et les notifications sont activées.


La baseline reste modifiable après validation via le Formulaire F2 (recalibrage partiel pour changement ponctuel) et le Formulaire F3 (recalibrage annuel post-campagne).

## 8.7 Évolution du score dans le temps
Le niveau de confiance n’est pas statique. Il évolue à chaque événement significatif :



— Fin du document Moteur Calibrage IA v2.0 —

| ⚠ | RÈGLE FONDAMENTALE — Pendant le calibrage, l’IA observe et analyse. Elle NE GÉNÈRE AUCUNE RECOMMANDATION. |
| --- | --- |


| ⚠ | PRINCIPE FONDAMENTAL — Le calibrage n’est PAS une analyse ponctuelle. C’est l’établissement d’un référentiel complet qui servira de base à toutes les décisions futures. Un calibrage bâclé = des recommandations erronées pendant toute la durée de vie de la parcelle dans le système. |
| --- | --- |


| Ce que l’IA PEUT faire | Ce que l’IA NE PEUT PAS faire |
| --- | --- |
| Collecter des données satellite et météo | Émettre des recommandations d’action |
| Analyser l’historique de la parcelle | Déclencher des alertes opérationnelles |
| Calculer des statistiques et percentiles | Suggérer des traitements ou fertilisations |
| Détecter des patterns et anomalies | Proposer des modifications de pratiques |
| Établir des seuils de référence | Estimer un rendement avec promesse |
| Générer un rapport d’état des lieux | Critiquer les pratiques de l’utilisateur |


| Condition | Calibrage | Confiance initiale |
| --- | --- | --- |
| Historique satellite ≥ 36 mois + données complètes | Immédiat | Élevé (75-100%) |
| Historique satellite 24-36 mois + données partielles | Immédiat | Moyen (50-75%) |
| Historique satellite 12-24 mois + données minimales | Immédiat mais limité | Faible (25-50%) |
| Historique satellite < 12 mois | BLOQUÉ — attendre 12 mois | Impossible |
| Nouvelle plantation sans historique | 6-12 mois observation puis calibrage | Minimal puis croissant |


| ⛔ | MINIMUM ABSOLU — Sans 12 mois d’historique satellite exploitable, le calibrage ne peut pas être lancé. La parcelle reste en mode collecte de données. |
| --- | --- |


| Priorité | Source | Raison |
| --- | --- | --- |
| 1 (haute) | Données terrain utilisateur (analyses labo) | Mesure directe, précise |
| 2 | Historique rendements réels déclarés | Vérité terrain |
| 3 | Données satellite Sentinel-2 | Objectif, répétable, couvrant |
| 4 | Données météo ERA5/Open-Meteo | Modélisation, peut avoir biais local |
| 5 (basse) | Valeurs par défaut référentiel | Génériques, non personnalisées |


| ⚠ | RÈGLE DE COHÉRENCE — Si les données utilisateur contredisent fortement les données satellite (ex: rendement déclaré de 20 T/ha mais NIRv historiquement très bas), l’IA doit signaler l’incohérence et demander vérification AVANT de finaliser le calibrage. |
| --- | --- |


| Source | Indices / Variables | Période | Fréquence |
| --- | --- | --- | --- |
| Sentinel-2 L2A | NDVI, NIRv, NDMI, NDRE, EVI, MSAVI, MSI, GCI | Selon âge (voir §1.3) | 5 jours |
| ERA5 / Open-Meteo | Tmin, Tmax, Tmoy, Précipitations | Selon âge (voir §1.3) | Quotidien |
| ERA5 / Open-Meteo | ETP, Rayonnement solaire (SSRD/PAR) | Selon âge (voir §1.3) | Quotidien |
| ERA5 / Open-Meteo | Humidité relative, Vent | Selon âge (voir §1.3) | Quotidien |


| Variété | Heures froid requises (< 7.2°C) | Conséquence si déficit |
| --- | --- | --- |
| Picholine Marocaine | 100-200 h | Floraison hétérogène |
| Haouzia | 100-150 h | Tolérant au déficit |
| Menara | 100-150 h | Tolérant au déficit |
| Arbequina | 200-400 h | Faible nouaison |
| Arbosana | 200-350 h | Problèmes modérés |
| Koroneiki | 150-300 h | Modérément tolérant |
| Picual | 400-600 h | Problèmes sévères si < 400h |


| Paramètre | Valeur | Référence |
| --- | --- | --- |
| Tbase | 7.5°C | Moriondo et al. (2001) |
| Tupper (plafond) | 30°C | Température optimale croissance olivier |
| Seuil chill units | 100-600 h selon variété | De Melo-Abreu et al. (2004) |
| Activation forçage | Tmoy > 7.5°C + NIRv ≥20% | Double condition thermique + satellite |


| ⚠ | IMPORTANT — Le plafonnement à 30°C empêche la surestimation de la croissance pendant les canicules estivales (fréquentes au Maroc). Au-delà de 30°C, la photosynthèse de l’olivier diminue. |
| --- | --- |


| → | Voir Référentiel Culture : Section Paramètres climatiques — Tbase sera mise à jour de 10°C vers 7.5°C dans une révision ultérieure du référentiel. |
| --- | --- |


| ⚠ | PRINCIPE — Élargir artificiellement les percentiles reviendrait à inventer de la variabilité qu’on n’a pas observée. C’est agronomiquement contestable et augmente le risque d’erreur. |
| --- | --- |


| Percentile | Signification | Usage opérationnel |
| --- | --- | --- |
| P10 | Valeur très basse (critique) | Seuil d’alerte critique |
| P25 | Valeur basse (vigilance) | Seuil de vigilance |
| P50 | Valeur médiane (normale) | Référence de comparaison |
| P75 | Valeur haute (favorable) | Bonne condition |
| P90 | Valeur très haute | Excellent / Possible excès |


| Situation détectée | Action IA |
| --- | --- |
| P50 parcelle < seuil alerte référentiel système | Signaler à l’utilisateur : parcelle historiquement en mauvais état |
| P50 parcelle > seuil optimal référentiel système | Les seuils parcellaires restent la référence (parcelle performante) |
| Écart > 50% entre seuils parcellaires et génériques | INCOHÉRENCE — vérifier le système déclaré vs système réel |
| Percentiles hors plages référentiel pour le système | BLOQUER et demander vérification avant de continuer |


| → | Voir Référentiel Culture : Section 2.2 — Seuils satellite par système (traditionnel, intensif, super-intensif) |
| --- | --- |


| Profondeur historique | Points Bloc A (sur 25) | Justification |
| --- | --- | --- |
| 36+ mois (3 cycles) | 20 pts | Variabilité inter-annuelle capturée |
| 24-36 mois (2 cycles) | 13 pts | Variabilité partielle |
| 12-24 mois (1 cycle) | 7 pts | Aucune variance inter-annuelle |
| < 12 mois | 0 pts — CALIBRAGE BLOQUÉ | Insuffisant |


| → | Voir Protocole Phénologique Olivier Sentinel-2 v2.1 (prompt_diagnostic_olivier_v2.1.json) — Document technique exécutable par l’agent IA |
| --- | --- |


| Phase | Nom | Condition de sortie (vers phase suivante) | Confiance |
| --- | --- | --- | --- |
| Phase 0 | Dormance hivernale | Tmoy > Tmoy_Q25 durablement (≥ 10 jours) | Élevée (0.85) |
| Phase 1 | Débourrement | GDD_cumul ≥ 350 ET Tmoy ≥ 18°C | Modérée (0.55) |
| Phase 2 | Floraison | GDD_cumul > 700 OU Tmoy > 25°C durablement | Faible (spectral) / Modérée (thermique) |
| Phase 3 | Nouaison / Clarification | État signal = SIGNAL_PUR ET Tmax > 30°C | Modérée (0.55) |
| Phase 4 | Stress estival + Maturation | Précipitations > 20mm ET Tmoy < 25°C ET dNIRv > 0 | Élevée (stress) / Modérée (maturation) |
| Phase 6 | Reprise automnale | Tmoy < Tmoy_Q25 ET NIRvP_norm < 0.15 | Modérée à élevée (0.70) |


| ⚠ | NOTE DE COHÉRENCE — Le référentiel culture (REF_OLIVIER section 1.2 et section 4.1) utilise actuellement Tbase = 10°C et des seuils GDD BBCH différents. Une mise à jour du référentiel est nécessaire pour harmoniser vers Tbase = 7.5°C. En attendant, le Protocole Phénologique fait autorité. |
| --- | --- |


| ⛔ | RÈGLE ABSOLUE — Les trois conditions suivantes sont CUMULATIVES. S’il manque ne serait-ce qu’une seule confirmation, la période RESTE dans le calcul des percentiles. |
| --- | --- |


| Source | Condition | Exemple |
| --- | --- | --- |
| 1. Météo | Événement extrême détecté (seuils OLI-xx) | Tmin < -2°C pendant BBCH 55-69 (OLI-03) |
| 2. Satellite | Signal anormal (hors corridor ≥3 passages consécutifs) | NDVI chute > 25% en < 15 jours |
| 3. Utilisateur | Déclaration de stress pour cette période dans F1 | Stress sécheresse déclaré en 2024 |


| Événement | Seuil météo (réf. OLI-xx) | Signature satellite |
| --- | --- | --- |
| Gel floraison | Tmin < -2°C en BBCH 55-69 (OLI-03) | Chute brutale NIRv en avril-mai |
| Canicule prolongée | Tmax > 42°C > 3 jours (OLI-07) | Chute NDMI + NDVI simultanée en été |
| Chergui | T > 40 + HR < 20% + vent > 30 km/h (OLI-15) | Chute brutale MSI, NDMI |
| Sécheresse extrême | Déficit hydrique prolongé > 3 mois | Déclin progressif tous indices |
| Grêle | Non détectable météo (déclaration utilisateur) | Chute brutale localisée |
| Année pluviométrique extrême | Précip annuelles > moyenne + 2σ | Biais adventices, indices anormalement hauts |


| ⚠ | PRINCIPE — Le calibrage doit refléter le POTENTIEL NORMAL de la parcelle, pas ses pires moments. Une année de gel ne doit pas définir les seuils de référence. |
| --- | --- |


| Changement | Détection | Action IA |
| --- | --- | --- |
| Changement source eau | Déclaration F1 OU rupture NDMI sans cause météo | Segmenter historique AVANT/APRÈS, utiliser APRÈS comme référence |
| Changement irrigation | Déclaration F1 OU changement niveau NDMI | Recalculer bilan hydrique avec nouveaux paramètres |
| Taille sévère | Déclaration F1 OU chute NDVI 30-50% | Exclure cycles pré-taille, 2 ans post-taille = reconstruction |
| Arrachage partiel | Déclaration F1 OU zones NDVI nul persistant | Modifier AOI si nécessaire, recalibrer |


| ⚠ | ATTENTION — Le potentiel de rendement calculé au calibrage est une ESTIMATION INITIALE. Il sera affiné après chaque campagne avec les rendements réels déclarés. L’IA ne doit JAMAIS présenter ce potentiel comme une promesse. |
| --- | --- |


| Cas | Méthode | Confiance |
| --- | --- | --- |
| Historique rendements ≥ 3 ans | Moyenne des 3 meilleures années × 1.1, croisé avec NIRvP cumulé | Élevée |
| Historique rendements 1-2 ans | Données déclarées croisées avec référentiel et satellite | Moyenne |
| AUCUN historique rendement | Référentiel (variété × âge × système) croisé satellite (NIRvP), marge élargie | Faible |


| Variable | Source | Poids | Ce qu’elle capture |
| --- | --- | --- | --- |
| Alternance (N-1, N-2) | Historique | Fort (25-35%) | Pattern génétique ON/OFF |
| Σ(NIRvP) avr-sept | Satellite | Fort (25-35%) | Productivité photosynthétique |
| Déficit hydrique cumulé | Bilan hydrique | Moyen (10-20%) | Stress eau |
| Heures froid hiver | Météo | Moyen (5-10%) | Qualité dormance |
| Gel floraison (0/1) | Météo | Fort si = 1 | Perte 50-100% |
| Âge verger | Profil | Ajustement | Courbe maturité |
| Densité | Profil | Conversion | kg/arbre → T/ha |


| → | Voir Référentiel Culture : Section 3.2 — Rendement par variété et par âge (kg/arbre) et Section 22 — Modèle prédictif |
| --- | --- |


| Classe | Critère | Interprétation |
| --- | --- | --- |
| A | > P90 | Zone très vigoureuse |
| B | P75-P90 | Zone vigoureuse |
| C | P25-P75 | Zone normale |
| D | P10-P25 | Zone faible |
| E | < P10 | Zone problématique |


| Composante | Poids | Calcul |
| --- | --- | --- |
| Vigueur végétative | 30% | Position du NIRv médian vs référentiel culture |
| Homogénéité spatiale | 20% | % surface en classe C ou mieux |
| Stabilité temporelle | 15% | Faible variance inter-annuelle = bon |
| État hydrique | 20% | Position NDMI vs percentiles |
| État nutritionnel | 15% | Position NDRE vs percentiles |


| Score | Interprétation | Communication utilisateur |
| --- | --- | --- |
| 80-100 | Excellent | La parcelle est en très bon état général. |
| 60-80 | Bon | La parcelle est en bon état avec quelques points d’attention. |
| 40-60 | Moyen | La parcelle présente des faiblesses à investiguer. |
| 20-40 | Faible | La parcelle montre des signes de stress significatifs. |
| 0-20 | Critique | La parcelle nécessite une attention urgente. |


| Donnée manquante | Impact sur la précision | Message type |
| --- | --- | --- |
| Analyse sol | -20 pts confiance | Une analyse sol permettrait d’ajuster les doses au pH réel et de détecter les blocages. |
| Analyse eau | -23 pts confiance | Une analyse eau est essentielle pour le calcul de la fraction de lessivage et la gestion de la salinité. |
| Analyse foliaire | -15 pts confiance | Une analyse foliaire améliorerait le diagnostic nutritionnel. |
| Historique rendements | -11 pts confiance | Les rendements passés permettraient d’affiner le modèle prédictif et de détecter l’alternance. |


| Composante | Points max | Critères de scoring |
| --- | --- | --- |
| Profondeur historique | 20 pts | 36+ mois = 20 | 24-36 mois = 13 | 12-24 mois = 7 | <12 mois = BLOQUÉ |
| Cohérence données | 5 pts | Pas d’incohérence = 5 | Mineures = 2 | Majeures = 0 |


| Composante | Points max | Critères de scoring |
| --- | --- | --- |
| Analyse sol | 20 pts | Complète <2 ans = 20 | Partielle = 10 | Absente = 0 |
| Analyse eau | 23 pts | Complète = 23 | Partielle = 12 | Absente = 0 |
| Analyse foliaire | 15 pts | Complète juillet = 15 | Autre période = 8 | Absente = 0 |
| Historique rendements | 11 pts | 5+ ans = 11 | 3-4 ans = 8 | 1-2 ans = 4 | Aucun = 0 |
| Profil cultural complet | 6 pts | 100% champs remplis = 6 | Prorata sinon |


| Score | Niveau | Conséquence |
| --- | --- | --- |
| 75-100 pts | ÉLEVÉ | Recommandations avec haute confiance |
| 50-75 pts | MOYEN | Recommandations avec prudence, vérification terrain suggérée |
| 25-50 pts | FAIBLE | Recommandations limitées, nombreuses vérifications requises |
| 0-25 pts | MINIMAL | Mode observation, pas de recommandations actives |


| Profil agriculteur | Détail score | Total | Niveau |
| --- | --- | --- | --- |
| Complet (36 mois + sol + eau + foliaire + rendements) | 20+5+20+23+15+11+6 | 100 pts | Élevé |
| Sol + eau + profil, 24 mois, pas foliaire ni rendements | 13+5+20+23+0+0+6 | 67 pts | Moyen |
| Typique marocain (36 mois satellite, profil seul) | 20+5+0+0+0+0+6 | 31 pts | Faible (valide) |
| 12 mois satellite + profil seul | 7+5+0+0+0+0+6 | 18 pts | Sous seuil (bloqué) |


| ⛔ | PRINCIPE STRATÉGIQUE — Bloquer le calibrage sans sol ni eau reviendrait à exclure la majorité des oléiculteurs marocains. Le système accepte un calibrage dégradé et pousse vers l’amélioration progressive. |
| --- | --- |


| Condition | Obligatoire | Détail |
| --- | --- | --- |
| Score de confiance ≥ 25 points | OUI | Seuil minimum pour activer les recommandations |
| Minimum 12 mois d’historique satellite | OUI | Au moins 10 images valides (non nuageuses) |
| Profil de base complet | OUI | Culture, variété, système, âge, irrigation |
| Percentiles calculés (NDVI, NIRv, NDMI min.) | OUI | Baseline spectrale établie |
| Pas d’incohérence majeure non résolue | OUI | Percentiles vs référentiel cohérents |
| Validation explicite utilisateur | OUI | Clic sur « Valider et activer » |
| Analyse sol disponible | NON | Réduit confiance de 20 pts |
| Analyse eau disponible | NON | Réduit confiance de 23 pts |
| Historique rendements | NON | Réduit confiance de 11 pts |


| → | Voir Moteur Opérationnel IA : Partie 1 — Prérequis et Activation |
| --- | --- |


| → | Voir Fiches de Calibrage : Formulaires F2 et F3 |
| --- | --- |


| Événement | Impact sur confiance |
| --- | --- |
| Nouvelle campagne validée avec rendement réel | +5 à +10 pts |
| Nouvelle analyse sol/eau uploadée | +5 à +15 pts |
| 12 mois supplémentaires de données satellite | +5 pts |
| Incohérence détectée entre prévision et réel | -5 à -10 pts |
| Données utilisateur corrigées après erreur | -2 pts (temporaire) |
