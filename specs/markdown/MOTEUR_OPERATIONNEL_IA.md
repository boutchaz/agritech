## MOTEUR OPÉRATIONNEL IA

Phase 2 --- Diagnostic, Alertes et Recommandations

Module Transversal --- Toutes Cultures Arboricoles

> **⚠ PRÉREQUIS**
> Ce module ne s'active QU'APRÈS validation du calibrage (Phase 1). Sans calibrage validé, aucune recommandation ne peut être générée.

Version 1.0 --- Février 2026

## PARTIE 1 --- PRÉREQUIS ET ACTIVATION

### 1.1 Calibrage validé obligatoire

Le moteur opérationnel ne peut s'activer que si les conditions suivantes sont remplies :

-   La parcelle a complété la Phase 1 (Calibrage)

-   L'utilisateur a validé explicitement la baseline

-   Le niveau de confiance est ≥ 25%

-   Aucune incohérence majeure non résolue

  -------------------------------------------------------------------------------
  *→ Voir Moteur Calibrage IA : Partie 8 --- Conditions de sortie du calibrage*
  -------------------------------------------------------------------------------

### 1.2 Données disponibles pour l'IA

À l'entrée en phase opérationnelle, l'IA dispose de :

  **Catégorie**   **Données**                                 **Source**
  --------------- ------------------------------------------- ---------------------
  Baseline        Seuils personnalisés (P10-P90) par indice   Calibrage
  Baseline        Phénologie historique (dates, GDD)          Calibrage
  Baseline        Potentiel de rendement estimé               Calibrage
  Baseline        Zones intra-parcellaires                    Calibrage
  Temps réel      Indices satellite (tous les 5 jours)        Sentinel-2
  Temps réel      Données météo (quotidien)                   ERA5/Open-Meteo
  Temps réel      Prévisions météo J+7                        Open-Meteo
  Utilisateur     Déclarations d'actions                     Saisie
  Référentiel     Règles culture-spécifiques                  Référentiel culture

### 1.3 Lien avec la gouvernance des recommandations

Toute recommandation générée par le moteur opérationnel est soumise aux règles de gouvernance.

  --------------------------------------------------------------------------------------------------------------------
  *→ Voir Module Gouvernance Recommandations --- pour le cycle de vie, les fréquences et les fenêtres d'évaluation*
  --------------------------------------------------------------------------------------------------------------------

## PARTIE 2 --- CYCLE D'ACQUISITION DES DONNÉES

### 2.1 Données satellite

Fréquence : Tous les 5 jours (passage Sentinel-2)

Processus à chaque nouveau passage :

-   Vérification couverture nuageuse sur l'AOI

-   Si couverture < 20% : calcul de tous les indices

-   Comparaison immédiate vs baseline calibrée

-   Détection écarts significatifs

-   Mise à jour de l'état courant de la parcelle

### 2.2 Données météo

Fréquence : Quotidienne

Variables suivies :

-   Température (min, max, moy) → Calcul GDD, détection gel/canicule

-   Précipitations → Bilan hydrique

-   ETP → Besoins en eau

-   Humidité relative → Risque maladies fongiques

-   Vent → Conditions application traitements

Prévisions J+7 :

-   Vérification quotidienne des prévisions

-   Anticipation des fenêtres d'application

-   Alerte si conditions défavorables prévues

### 2.3 Données utilisateur

L'utilisateur peut déclarer à tout moment :

-   Applications réalisées (irrigation, fertilisation, traitement)

-   Observations terrain (symptômes, dégâts)

-   Événements (récolte, taille)

Ces données permettent :

-   Mise à jour du stock intrants

-   Déclenchement de la fenêtre d'évaluation post-application

-   Calibrage fin du modèle

### 2.4 Synchronisation des sources

L'IA croise systématiquement les données des différentes sources pour établir un diagnostic cohérent.

  **Source 1**           **Source 2**                  **Objectif du croisement**
  ---------------------- ----------------------------- ------------------------------------
  NDMI (satellite)       Bilan hydrique (météo)        Confirmer/infirmer stress hydrique
  NDRE (satellite)       Stade phénologique (GDD)      Contextualiser niveau chlorophylle
  NIRv (satellite)       Historique même période N-1   Détecter anomalie vs normal
  Météo (conditions)     Calendrier traitements        Valider faisabilité application
  Satellite (tendance)   Application déclarée          Évaluer efficacité intervention

## PARTIE 3 --- ANALYSE VS BASELINE

### 3.1 Comparaison indices actuels vs percentiles calibrés

À chaque nouveau passage satellite, l'IA positionne chaque indice par rapport aux percentiles de la baseline.

  **Position**   **Interprétation**                     **Action IA**
  -------------- -------------------------------------- ----------------------------------------
  < P10         Valeur critique (très inhabituelle)    Alerte potentielle, investigation
  P10 - P25      Valeur basse (vigilance)               Surveillance renforcée
  P25 - P75      Valeur normale                         Aucune action
  P75 - P90      Valeur haute (favorable)               Aucune action
  > P90         Valeur très haute (surveiller excès)   Vérifier si excès (ex: sur-irrigation)

### 3.2 Détection des écarts significatifs

Un écart est considéré comme SIGNIFICATIF si :

-   L'indice est en dehors de la plage P25-P75 pendant 2+ passages consécutifs

-   OU l'indice chute/monte de > 15% entre deux passages

-   OU l'indice atteint la zone critique (< P10 ou > P90)

> **⚠ RÈGLE**
> Un seul passage en zone de vigilance ne déclenche PAS d'alerte. L'IA attend confirmation sur au moins 2 passages pour éviter les faux positifs.

### 3.3 Analyse des tendances

L'IA ne réagit jamais à un seul point. Elle analyse les tendances sur plusieurs passages.

  **Tendance observée**   **Durée**       **Interprétation**
  ----------------------- --------------- -----------------------------------------------------
  Déclin progressif       2-4 semaines    Stress chronique en installation
  Déclin brutal           < 10 jours     Événement ponctuel (gel, attaque, panne irrigation)
  Stagnation basse        > 4 semaines   Blocage (compaction, toxicité, maladie racinaire)
  Remontée progressive    2-4 semaines    Récupération après intervention
  Remontée brutale        < 10 jours     Artefact possible, vérifier qualité image

### 3.4 Cohérence inter-indices

Les indices doivent être cohérents entre eux. Une incohérence signale une ambiguïté diagnostique.

  ---------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Scénarios de diagnostic --- pour la matrice de cohérence inter-indices*
  ---------------------------------------------------------------------------------------------------------------

Exemples de cohérence :

-   NDVI bas + NIRv bas + NDMI bas = Stress généralisé sévère ✓ Cohérent

-   NDVI normal + NDRE bas = Carence azotée débutante ✓ Cohérent

-   NDVI bas + NDMI élevé = Incohérent → Investigation requise

> **⚠ RÈGLE AMBIGUÏTÉ**
> Si les indices divergent sans explication logique, l'IA doit signaler une AMBIGUÏTÉ DIAGNOSTIQUE et demander des données complémentaires (photo terrain, analyse foliaire) avant de recommander.

## PARTIE 4 --- DIAGNOSTIC DIFFÉRENTIEL

### 4.1 Principe : un signal peut avoir plusieurs causes

Un même signal satellite peut correspondre à plusieurs causes possibles. L'IA doit établir un diagnostic DIFFÉRENTIEL.

Exemple : NDVI en baisse

-   Cause 1 : Stress hydrique (vérifier NDMI, bilan hydrique)

-   Cause 2 : Carence nutritionnelle (vérifier NDRE, historique fertilisation)

-   Cause 3 : Attaque parasitaire (vérifier conditions météo, historique phyto)

-   Cause 4 : Phénologie normale (vérifier GDD, période de l'année)

-   Cause 5 : Artefact satellite (vérifier qualité image, nuages)

### 4.2 Matrice de diagnostic

L'IA utilise une matrice croisant les indices pour établir le diagnostic le plus probable.

  -----------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Scénarios de diagnostic (A à I) --- pour la matrice complète*
  -----------------------------------------------------------------------------------------------------

  **Scénario**   **NDVI**   **NIRv**   **NDRE**   **NDMI**   **Diagnostic probable**
  -------------- ---------- ---------- ---------- ---------- -------------------------------------
  A              ↓ Bas      ↓ Bas      ↓ Bas      ↓ Bas      Stress généralisé sévère
  B              ↓ Bas      ↓ Bas      Normal     Normal     Sol nu visible / faible couverture
  C              Normal     Normal     ↓ Bas      Normal     Carence azotée débutante
  D              Normal     Normal     Normal     ↓ Bas      Stress hydrique débutant
  E              ↑ Élevé    ↑ Élevé    ↑ Élevé    ↓ Bas      Végétation saine, bien alimentée
  F              ↑ Élevé    ↓ Bas      ↓ Bas      Normal     Biomasse forte mais chlorose
  G              Normal     ↓ Bas      Normal     Normal     Productivité réduite malgré vigueur
  H              Variable   Variable   Variable   Variable   Problème localisé (foyer)

### 4.3 Hypothèse principale vs alternatives

Pour chaque diagnostic, l'IA formule :

-   Une HYPOTHÈSE PRINCIPALE : la cause la plus probable

-   Des HYPOTHÈSES ALTERNATIVES : autres causes possibles

-   Des FACTEURS CONCORDANTS : éléments qui soutiennent l'hypothèse

-   Des FACTEURS DISCORDANTS : éléments qui la contredisent

### 4.4 Niveau de confiance du diagnostic

Chaque diagnostic est accompagné d'un niveau de confiance.

  **Niveau**   **Symbole**   **Signification**                   **Action**
  ------------ ------------- ----------------------------------- -------------------------------------------
  Élevé        ⭐⭐⭐           Indices cohérents, cause claire     Recommandation directe
  Moyen        ⭐⭐            Indices partiellement concordants   Recommandation avec vérification suggérée
  Faible       ⭐             Ambiguïté ou données manquantes     Demande données complémentaires

### 4.5 Quand demander des données complémentaires

L'IA demande des données complémentaires si :

-   Le diagnostic a un niveau de confiance FAIBLE

-   Les indices sont incohérents entre eux

-   L'hypothèse principale contredit l'historique

-   L'intervention requise est coûteuse ou irréversible

Types de données demandées :

-   Photo terrain (pour confirmer symptômes visuels)

-   Analyse foliaire (pour confirmer carence)

-   Inspection localisée (pour problème de foyer)

-   Vérification irrigation (pour problème hydrique)

## PARTIE 5 --- RÈGLES D'HUMILITÉ ÉPISTÉMIQUE

L'IA doit être consciente de ses LIMITES. Cette section définit ce que l'IA peut et ne peut pas affirmer.

### 5.1 Ce que l'IA PEUT affirmer avec confiance

-   Les valeurs des indices satellite (mesure objective)

-   La position de ces valeurs vs la baseline calibrée

-   Les tendances observées sur plusieurs passages

-   Les conditions météo passées et présentes

-   La cohérence ou incohérence entre indices

-   Le stade phénologique estimé (basé sur GDD)

### 5.2 Ce que l'IA PEUT suggérer avec prudence

-   Le diagnostic le plus probable (avec niveau de confiance)

-   Les causes possibles d'un signal anormal

-   Les actions recommandées (avec conditions)

-   La fourchette de rendement attendue (pas une valeur précise)

-   La tendance ON/OFF probable (alternance)

### 5.3 Ce que l'IA NE DOIT PAS affirmer

-   Un rendement précis avec certitude

-   Un diagnostic sans alternative possible

-   Une cause unique quand plusieurs sont possibles

-   L'efficacité garantie d'une intervention

-   Des affirmations contredisant les données terrain

> **⚠ RÈGLE FONDAMENTALE**
> L'IA ne doit JAMAIS présenter une estimation comme une certitude. Toute prévision doit être accompagnée de sa marge d'incertitude et de ses conditions de validité.

### 5.4 Formulation de l'incertitude

L'IA utilise des formulations qui reflètent le niveau d'incertitude :

  **Confiance**   **Formulations à utiliser**                                          **Formulations interdites**
  --------------- -------------------------------------------------------------------- ---------------------------------------------------------
  Élevée          \"Les données indiquent\...\", \"Il est probable que\...\"           \"C'est certain que\...\", \"Il est garanti que\...\"
  Moyenne         \"Les indices suggèrent\...\", \"Une hypothèse plausible est\...\"   \"C'est définitivement\...\", \"Sans aucun doute\...\"
  Faible          \"Il est possible que\...\", \"Sous réserve de vérification\...\"    \"Malgré l'incertitude, c'est\...\"

### 5.5 Quand dire \"je ne sais pas\"

L'IA doit explicitement reconnaître son ignorance dans ces cas :

-   Données satellite manquantes (nuages) depuis > 20 jours

-   Incohérence non résolue entre les sources

-   Situation jamais rencontrée dans l'historique

-   Demande hors du périmètre du système (ex: conseil juridique)

Formulation type : \"Je ne dispose pas de données suffisantes pour établir un diagnostic fiable. Je vous recommande \[action de vérification terrain\].\"

## PARTIE 6 --- PRÉVISION DE RENDEMENT

### 6.1 Variables requises

La prévision de rendement nécessite PLUSIEURS variables, pas uniquement le satellite.

  -------------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Modèle prédictif rendement --- pour les coefficients et poids par variable*
  -------------------------------------------------------------------------------------------------------------------

  **Variable**              **Source**          **Poids relatif**   **Ce qu'elle capture**
  ------------------------- ------------------- ------------------- --------------------------------------
  NIRvP cumulé (avr-sept)   Satellite + phéno   Fort (30-40%)       Productivité photosynthétique réelle
  Alternance (N-1, N-2)     Historique          Fort (20-30%)       Pattern génétique ON/OFF
  Heures froid hiver        Météo               Moyen (5-10%)       Qualité de la dormance
  Déficit hydrique cumulé   Bilan hydrique      Moyen (10-20%)      Stress eau
  Gel floraison (0/1)       Météo               Fort si = 1         Perte potentielle 50-100%
  Précip floraison          Météo               Moyen (5-10%)       Perturbation pollinisation
  Âge verger                Profil              Ajustement          Courbe de maturité
  Densité                   Profil              Ajustement          Conversion kg/arbre → T/ha

### 6.2 Conditions pour faire une prévision

L'IA ne peut émettre une prévision de rendement que si :

-   Le calibrage est validé avec confiance ≥ 50%

-   Au moins 1 cycle complet (floraison → récolte) est disponible dans l'historique

-   Les données météo de la saison en cours sont disponibles

-   Le stade phénologique actuel est identifié

Moments clés pour la prévision :

-   Post-floraison (mai-juin) : Première estimation (large fourchette)

-   Post-nouaison (juillet) : Estimation affinée

-   Pré-récolte (septembre) : Estimation finale

### 6.3 Limites et marge d'erreur attendue

La prévision de rendement est TOUJOURS une estimation avec une marge d'erreur.

  **Système**            **R² attendu**   **MAE typique**   **Confiance prévision**
  ---------------------- ---------------- ----------------- -------------------------
  Traditionnel pluvial   0.40 - 0.60      ± 30-40%          Faible à moyenne
  Intensif irrigué       0.50 - 0.70      ± 20-30%          Moyenne
  Super-intensif         0.60 - 0.80      ± 15-25%          Moyenne à élevée

> **⚠ AVERTISSEMENT**
> Même avec un bon modèle (R² = 0.70), 30% de la variance reste inexpliquée. Des événements imprévisibles (gel tardif, grêle, maladie soudaine) peuvent invalider toute prévision.

### 6.4 Formulation prudente

La prévision doit TOUJOURS être formulée comme une fourchette, pas une valeur unique.

Formulation correcte :

\"Sur la base des données disponibles (satellite, météo, historique), le rendement attendu pour cette saison est estimé entre 8 et 12 T/ha, avec une probabilité plus élevée autour de 10 T/ha. Cette estimation est soumise aux conditions météo jusqu'à la récolte.\"

Formulation interdite :

\"Vous aurez un rendement de 10 T/ha cette année.\"

### 6.5 Ce que le NIRvP détecte vs ne détecte pas

Le NIRvP est un indicateur précieux mais il a des LIMITES.

  **Ce que NIRvP DÉTECTE**          **Ce que NIRvP NE DÉTECTE PAS**
  --------------------------------- ---------------------------------
  Vigueur végétative globale        Qualité de la pollinisation
  Capacité photosynthétique         Taux de nouaison réel
  Stress sévère (si prolongé)       Problèmes racinaires précoces
  Récupération après intervention   Charge en fruits (nombre)
  Tendance inter-annuelle           Calibre des fruits

> **⚠ CLÉ**
> Un NIRvP élevé signifie que l'arbre a la CAPACITÉ de produire. Cela ne garantit pas qu'il produira effectivement, car la floraison et la nouaison dépendent d'autres facteurs (météo, pollinisation).

### 6.6 Rôle de l'alternance

L'alternance (pattern ON/OFF) est souvent le PREMIER facteur explicatif du rendement, surtout en traditionnel.

  ---------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Alternance --- pour les indices par variété et la logique de détection*
  ---------------------------------------------------------------------------------------------------------------

Règle simplifiée :

-   Année N-1 très productive (> 15 T/ha) → Année N probablement OFF (réduction 50-70%)

-   Année N-1 faible (< 5 T/ha) → Année N probablement ON

-   Années N-1 et N-2 moyennes → Année N stable

### 6.7 Révision de la prévision en cours de saison

La prévision est révisée à chaque événement significatif :

-   Gel floraison détecté → Révision forte à la baisse

-   Stress hydrique prolongé (> 4 semaines) → Révision à la baisse

-   NIRvP pic > attendu → Révision légère à la hausse

-   Canicule pendant grossissement → Révision à la baisse

## PARTIE 7 --- GÉNÉRATION DES ALERTES

### 7.1 Types d'alertes

Les alertes sont codifiées par culture. Chaque alerte a un code unique.

  -----------------------------------------------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Alertes --- pour la liste complète des alertes (ex: OLI-01 à OLI-18 pour l'olivier)*
  -----------------------------------------------------------------------------------------------------------------------------

Catégories d'alertes :

-   Alertes HYDRIQUES : stress hydrique, sur-irrigation

-   Alertes CLIMATIQUES : gel, canicule, Chergui

-   Alertes NUTRITIONNELLES : carences détectées

-   Alertes SANITAIRES : conditions favorables maladies

-   Alertes PHÉNOLOGIQUES : floraison ratée, année OFF probable

-   Alertes STRUCTURELLES : dépérissement, fin de cycle

### 7.2 Seuils d'entrée et de sortie (hystérésis)

Chaque alerte a un seuil d'ENTRÉE (déclenchement) et un seuil de SORTIE (fin d'alerte) différents.

> **⚠ PRINCIPE HYSTÉRÉSIS**
> Le seuil de sortie est moins strict que le seuil d'entrée pour éviter les oscillations (alerte ON/OFF/ON/OFF à chaque passage satellite).

  **Alerte**        **Seuil entrée**             **Seuil sortie**               **Raison**
  ----------------- ---------------------------- ------------------------------ ---------------------------
  Stress hydrique   NDMI < P10                  NDMI > P25 (2 passages)       Éviter alternance alerte
  Carence N         NDRE < P10                  NDRE > P30 (2 passages)       Rattrapage met du temps
  Dépérissement     NIRv ↘ > 25% (3 passages)   NIRv stabilisé (2 passages)    Confirmer récupération
  Risque maladie    Conditions météo atteintes   72h après dernière condition   Période latence pathogène

### 7.3 Priorisation des alertes

Les alertes ont des niveaux de priorité.

  **Priorité**   **Couleur**   **Signification**           **Délai action**
  -------------- ------------- --------------------------- ------------------
  URGENTE        🔴 Rouge       Action immédiate requise    24-48h
  PRIORITAIRE    🟠 Orange      Action rapide recommandée   3-7 jours
  VIGILANCE      🟡 Jaune       Surveillance renforcée      Prochain passage
  INFORMATION    🟢 Vert        Pour information            Aucune urgence

### 7.4 Alertes multiples simultanées

En cas d'alertes multiples, l'IA doit :

-   Prioriser par niveau d'urgence

-   Identifier les alertes liées (ex: stress hydrique + carence souvent liés)

-   Proposer une action qui traite plusieurs problèmes si possible

-   Ne pas submerger l'utilisateur (max 3 alertes actives affichées)

## PARTIE 8 --- FORMULATION DES RECOMMANDATIONS

### 8.1 Structure obligatoire d'une recommandation

Toute recommandation doit suivre la structure définie.

  -----------------------------------------------------------------------------
  *→ Voir Module Gouvernance Recommandations : Section Structure obligatoire*
  -----------------------------------------------------------------------------

Éléments obligatoires :

-   CONSTAT SPECTRAL : Valeurs des indices, position vs baseline, tendance

-   DIAGNOSTIC : Hypothèse principale, niveau de confiance, alternatives

-   RECOMMANDATION D'ACTION : Type, produit, dose, méthode, zone ciblée

-   FENÊTRE D'INTERVENTION : Urgence, période optimale, date limite

-   CONDITIONS D'APPLICATION : Météo requise, moment journée, restrictions

-   SUIVI POST-APPLICATION : Fenêtre évaluation, indicateurs attendus

### 8.2 Lien avec le module gouvernance

Toute recommandation émise entre dans le cycle de vie défini par la gouvernance.

  ----------------------------------------------------------------------------------
  *→ Voir Module Gouvernance Recommandations --- pour les 8 états du cycle de vie*
  ----------------------------------------------------------------------------------

États possibles : Proposée → Validée → En attente → Exécutée → Évaluée → Clôturée

### 8.3 Fenêtres d'intervention par stade

Certaines interventions ne sont possibles qu'à certains stades phénologiques.

  --------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Fenêtres d'intervention par stade BBCH*
  --------------------------------------------------------------------------------

Types de fenêtres :

-   FENÊTRE EFFICACE : Recommandation possible

-   FENÊTRE CRITIQUE : Recommandation prioritaire

-   FENÊTRE INTERDITE : Bloquer la recommandation

-   FENÊTRE NON PERTINENTE : Reporter

### 8.4 Conditions d'application

Chaque recommandation spécifie les conditions météo requises.

  **Type intervention**   **Conditions optimales**                **Conditions à éviter**
  ----------------------- --------------------------------------- -------------------------
  Traitement foliaire     T 15-25°C, HR > 60%, vent < 15 km/h   Pluie < 6h, T > 30°C
  Fertigation             Sol humide, pas de stress               Sol sec, forte chaleur
  Irrigation urgence      Matin tôt ou soir                       Plein soleil midi
  Taille                  Temps sec, pas de gel prévu             Pluie, gel

### 8.5 Vérification stock

Avant d'émettre une recommandation, l'IA vérifie le stock d'intrants.

-   SI stock suffisant → Recommandation normale

-   SI stock insuffisant → Recommandation + alerte stock + suggestion achat

-   SI stock = 0 → Alerte stock prioritaire

  -----------------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Gestion des stocks --- pour les calculs de stock*
  -----------------------------------------------------------------------------------------

## PARTIE 9 --- SUIVI POST-RECOMMANDATION

### 9.1 Fenêtre d'évaluation

Après chaque recommandation exécutée, une fenêtre d'évaluation s'ouvre.

  --------------------------------------------------------------------------------------------------
  *→ Voir Module Gouvernance Recommandations : Section Fenêtres d'évaluation post-recommandation*
  --------------------------------------------------------------------------------------------------

  **Type recommandation**      **Fenêtre évaluation**   **Raison**
  ---------------------------- ------------------------ -----------------------------------
  Fertigation azotée           7-14 jours               Temps assimilation + réponse NDRE
  Irrigation                   3-7 jours                Réponse hydrique rapide
  Amendement sol               30-90 jours              Minéralisation lente
  Biostimulants                5-10 jours               Réponse physiologique
  Traitement phyto préventif   Non applicable           Pas de signal attendu

### 9.2 Indicateurs de réponse attendus

Pour chaque type de recommandation, des indicateurs de succès sont définis.

  **Recommandation**   **Indicateur**    **Réponse attendue**    **Délai**
  -------------------- ----------------- ----------------------- -------------
  Fertigation N        NDRE              Hausse de 5-15%         7-14 jours
  Irrigation           NDMI              Hausse vers P50         3-7 jours
  Chélate Fe           GCI               Hausse (verdissement)   10-20 jours
  Traitement mouche    Captures pièges   Baisse                  7 jours

### 9.3 Détection d'exécution par satellite

L'IA peut détecter si une application a été réalisée même sans déclaration utilisateur.

Indices de détection :

-   Hausse NDMI après période sèche → Irrigation probable

-   Hausse NDRE après recommandation N → Fertigation probable

-   Changement localisé cohérent → Application probable

En cas de détection :

-   L'IA notifie l'utilisateur

-   Demande confirmation

-   Propose saisie antidatée

-   Si non confirmé : marque \"Exécutée détectée par IA\"

### 9.4 Ajustement si inefficace

Si la réponse attendue n'est pas observée :

-   Statut recommandation → \"Pas de réponse post-intervention\"

-   L'IA analyse les causes possibles (dose insuffisante, conditions défavorables, mauvais diagnostic)

-   Ajustement de la stratégie pour la prochaine recommandation

-   Éventuellement : révision du diagnostic initial

## PARTIE 10 --- RECALIBRAGE CONTINU

### 10.1 Événements déclencheurs de recalibrage

Certains événements déclenchent un recalibrage partiel ou complet de la baseline.

  **Événement**                        **Type recalibrage**   **Éléments mis à jour**
  ------------------------------------ ---------------------- ---------------------------------------------
  Fin de campagne (F3)                 Annuel complet         Tous les percentiles, potentiel, alternance
  Nouvelle analyse sol/eau             Partiel (F2)           Paramètres nutritionnels
  Changement irrigation                Partiel (F2)           Baseline NDMI, bilan hydrique
  Écart prévision vs réel > 30%       Automatique            Coefficients modèle prédictif
  12 mois de données supplémentaires   Progressif             Percentiles avec plus de points

### 10.2 Mise à jour des seuils

Les seuils parcellaires sont recalculés périodiquement pour intégrer les nouvelles données.

Règles de mise à jour :

-   Les nouvelles données PONDÈRENT les anciennes (pas de remplacement total)

-   Les périodes anormales restent exclues

-   Le niveau de confiance est réévalué

-   L'utilisateur est notifié des changements significatifs

### 10.3 Amélioration du modèle prédictif

À chaque campagne validée avec rendement réel, le modèle s'améliore.

Processus :

-   Comparaison prévision vs réel

-   Calcul de l'erreur

-   Ajustement des coefficients par régression

-   Recalcul du R² estimé

-   Notification de l'amélioration du niveau de confiance

> **⚠ APPRENTISSAGE**
> Plus l'utilisateur fournit de données réelles (rendements, analyses), plus le modèle devient précis pour SA parcelle. C'est un cercle vertueux.

### 10.4 Apprentissage par parcelle

Chaque parcelle a son propre \"profil d'apprentissage\".

Éléments appris au fil du temps :

-   Pattern d'alternance spécifique

-   Sensibilité aux stress hydriques

-   Réponse aux interventions (vitesse, amplitude)

-   Zones problématiques récurrentes

-   Décalages phénologiques vs GDD théorique

Cet apprentissage permet des recommandations de plus en plus personnalisées et précises.

*--- Fin du document Moteur Opérationnel IA v1.0 ---*
