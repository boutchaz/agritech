---
sidebar_position: 1
title: "AI Workflow - 12 Phases"
---

## WORKFLOW IA

Processus Complet --- Diagnostic et Recommandation

Module Transversal --- Toutes Cultures Arboricoles

> **⚠ DOCUMENT GÉNÉRIQUE**
> Ce workflow s'applique à TOUTES les cultures arboricoles. Les données spécifiques sont dans les RÉFÉRENTIELS CULTURE.

Version 1.0 --- Février 2026

## VUE D'ENSEMBLE DU WORKFLOW

Le workflow IA se déroule en 12 phases, de l'initialisation jusqu'au recalibrage annuel.

  **Phase**   **Nom**                  **Objectif**                **Fréquence**
  ----------- ------------------------ --------------------------- -------------------
  0           Initialisation           Création parcelle           Une fois
  1           Calibrage                État zéro (baseline)        Une fois + annuel
  2           Acquisition données      Satellite + météo           5j / quotidien
  3           Analyse spectrale        Comparer vs baseline        Chaque passage S2
  4           Croisement météo         Contextualiser climat       Chaque analyse
  5           Détermination stade      Stade phénologique          Continue
  6           Diagnostic               Problèmes / alertes         Chaque analyse
  7           Vérification fenêtres    Compatibilité stade         Avant reco
  8           Formulation reco         Construire recommandation   Si nécessaire
  9           Vérification météo J+7   Conditions application      Avant envoi
  10          Suivi évaluation         Mesurer efficacité          Post-application
  11          Prévision rendement      Estimer production          Dates clés
  12          Recalibrage annuel       Mettre à jour baseline      Post-récolte

## PHASE 0 --- INITIALISATION

Création de la parcelle dans le système.

**Étape 0.1 : Dessin du contour AOI**

-   L'utilisateur dessine le polygone de sa parcelle

-   Calcul automatique de la surface

**Étape 0.2 : Saisie des informations**

-   Culture, Variété, Système, Âge, Densité, Irrigation

  ----------------------------------------------
  *→ Voir Fiches de Calibrage : Formulaire F1*
  ----------------------------------------------

**Étape 0.3 : Chargement données satellite**

-   Extraction automatique historique Sentinel-2 (12-36 mois)

## PHASE 1 --- CALIBRAGE

Établissement de l'état zéro. AUCUNE RECOMMANDATION pendant cette phase.

  ---------------------------------------------------------
  *→ Voir Moteur Calibrage IA --- pour le détail complet*
  ---------------------------------------------------------

**Étapes du calibrage**

-   1.1 Extraction données historiques (satellite + météo)

-   1.2 Calcul percentiles personnalisés (P10, P25, P50, P75, P90)

-   1.3 Détection phénologie historique

-   1.4 Détection anomalies passées

-   1.5 Calcul potentiel rendement

-   1.6 Génération rapport calibrage

-   1.7 Validation utilisateur

  -------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Sections Seuils, Stades BBCH, Modèle prédictif*
  -------------------------------------------------------------------------------

## PHASE 2 --- ACQUISITION DES DONNÉES

Exécution continue après calibrage.

### 2.1 Données satellite

-   Fréquence : tous les 5 jours (Sentinel-2)

-   Indices : NDVI, NIRv, NDMI, NDRE, EVI, MSAVI, MSI, GCI

-   Filtrage images nuageuses (>20%)

### 2.2 Données météo

-   Fréquence : quotidienne

-   Variables : Tmin, Tmax, Précip, ETP, HR, Vent

-   Calcul GDD cumulé

  ------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Paramètres climatiques --- pour Tbase*
  ------------------------------------------------------------------------------

## PHASE 3 --- ANALYSE SPECTRALE

Comparaison des indices actuels avec la baseline.

### 3.1 Positionnement vs baseline

  **Position**   **Interprétation**   **Code**
  -------------- -------------------- ----------
  < P10         Critique             🔴
  P10 - P25      Vigilance            🟠
  P25 - P75      Normal               🟢
  > P90         Surveiller excès     🟡

### 3.2 Analyse tendance

-   Minimum 3 passages pour confirmer une tendance

-   Vitesse de changement (brutal vs progressif)

### 3.3 Cohérence inter-indices

  ----------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Scénarios de diagnostic*
  ----------------------------------------------------------------

> **⚠ RÈGLE**
> Si indices incohérents → Signaler AMBIGUÏTÉ DIAGNOSTIQUE

## PHASE 4 --- CROISEMENT MÉTÉO

### 4.1 Bilan hydrique

-   Calcul : Précipitations + Irrigation - ETP

  --------------------------------------------------------
  *→ Voir Référentiel Culture : Section Coefficients Kc*
  --------------------------------------------------------

### 4.2 Cumul thermique (GDD)

-   GDD = Σ max(0, Tmoy - Tbase)

### 4.3 Heures de froid

  ---------------------------------------------------------
  *→ Voir Référentiel Culture : Section Besoins en froid*
  ---------------------------------------------------------

### 4.4 Risques maladies

  ---------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Phytosanitaire --- conditions favorables*
  ---------------------------------------------------------------------------------

## PHASE 5 --- DÉTERMINATION DU STADE PHÉNOLOGIQUE

### 5.1 Méthode GDD

-   GDD cumulé depuis date référence → correspondance BBCH

### 5.2 Validation satellite

-   Comparaison courbe NIRv vs années précédentes

  ----------------------------------------------------
  *→ Voir Référentiel Culture : Section Stades BBCH*
  ----------------------------------------------------

## PHASE 6 --- DIAGNOSTIC

### 6.1 Arbre de diagnostic

-   1\. Signal cohérent entre indices ? OUI/NON

-   2\. Explicable par phénologie ? OUI/NON

-   3\. Correspond à scénario connu ?

  ------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Scénarios de diagnostic (A à I)*
  ------------------------------------------------------------------------

### 6.2 Déclenchement alertes

  -------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Alertes --- seuils entrée/sortie*
  -------------------------------------------------------------------------

  **Priorité**    **Délai action**
  --------------- ------------------
  🔴 URGENTE       24-48h
  🟠 PRIORITAIRE   3-7 jours
  🟡 VIGILANCE     Prochain passage

## PHASE 7 --- VÉRIFICATION FENÊTRES D'INTERVENTION

Le stade actuel permet-il l'intervention ?

  **Fenêtre**      **Action IA**
  ---------------- ----------------------------
  EFFICACE         Recommandation possible
  CRITIQUE         Recommandation prioritaire
  INTERDITE        BLOQUER recommandation
  NON PERTINENTE   Reporter

  ---------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Fenêtres d'intervention par stade*
  ---------------------------------------------------------------------------

## PHASE 8 --- FORMULATION DE LA RECOMMANDATION

## Structure obligatoire

-   CONSTAT SPECTRAL : valeurs, position, tendance

-   DIAGNOSTIC : hypothèse, confiance, alternatives

-   ACTION : type, produit, dose, méthode

-   FENÊTRE : urgence, période optimale

-   CONDITIONS : météo requise

-   SUIVI : fenêtre évaluation, indicateurs

  ---------------------------------------------------------------------
  *→ Voir Module Gouvernance Recommandations : Structure obligatoire*
  ---------------------------------------------------------------------

  --------------------------------------------------------------------------------
  *→ Voir Référentiel Culture : Sections Programme nutritionnel, Phytosanitaire*
  --------------------------------------------------------------------------------

## PHASE 9 --- VÉRIFICATION MÉTÉO J+7

Compatibilité conditions météo prévues.

  **Intervention**      **Conditions OK**          **Conditions KO**
  --------------------- -------------------------- -----------------------
  Traitement foliaire   T 15-25°C, vent <15km/h   Pluie <6h, T>30°C
  Fertigation           Sol pas saturé             Fortes pluies prévues

-   Si conflit → Reporter ou avancer l'application

## PHASE 10 --- SUIVI ET ÉVALUATION

  ------------------------------------------------------
  *→ Voir Module Gouvernance : Fenêtres d'évaluation*
  ------------------------------------------------------

  **Recommandation**   **Fenêtre évaluation**
  -------------------- ------------------------
  Fertigation N        7-14 jours
  Irrigation           3-7 jours
  Amendement sol       30-90 jours

## Analyse réponse

-   Efficace / Partiellement efficace / Non efficace

-   Si non efficace → Réévaluer diagnostic

## PHASE 11 --- PRÉVISION DE RENDEMENT

## Conditions requises

-   Calibrage validé (confiance ≥50%)

-   Au moins 1 cycle complet dans historique

## Moments de prévision

  **Moment**       **Précision**
  ---------------- ---------------
  Post-floraison   ±40%
  Post-nouaison    ±25%
  Pré-récolte      ±15-20%

  -------------------------------------------------------------------
  *→ Voir Référentiel Culture : Section Modèle prédictif rendement*
  -------------------------------------------------------------------

> **⚠ ATTENTION**
> Toujours exprimer en FOURCHETTE, jamais en valeur précise.

## PHASE 12 --- RECALIBRAGE ANNUEL

  ----------------------------------------------
  *→ Voir Fiches de Calibrage : Formulaire F3*
  ----------------------------------------------

## Processus

-   12.1 Collecte données campagne (rendement réel, applications)

-   12.2 Comparaison prévision vs réel

-   12.3 Mise à jour baseline (percentiles, potentiel, coefficients)

-   12.4 Génération rapport de campagne

-   12.5 Validation nouvelle baseline

*--- Fin du document Workflow IA v1.0 ---*
