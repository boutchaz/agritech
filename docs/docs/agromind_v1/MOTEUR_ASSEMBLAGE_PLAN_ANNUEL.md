MOTEUR D'ASSEMBLAGE
PLAN ANNUEL POST-CALIBRAGE
Algorithme déterministe d'assemblage du plan annuel
Module Olivier — Toutes configurations parcellaires
Version 1.0 — Avril 2026
⚠ PRÉREQUIS : Ce moteur ne s'exécute QU'APRÈS validation du calibrage (Phase 1). Il est déclenché automatiquement par la transition vers la phase opérationnelle.
→ Voir Moteur Calibrage IA : Partie 8 — Conditions de sortie du calibrage

# PARTIE 0 — OBJET DU DOCUMENT
Ce document formalise l'algorithme complet d'assemblage du plan annuel. Son objectif est d'éliminer toute marge d'interprétation de l'IA lors de la génération du plan. Chaque étape est déterministe : elle prend des ENTRÉES définies, applique des RÈGLES référencées, et produit des SORTIES vérifiables.
L'IA n'a AUCUNE latitude dans l'exécution de cet algorithme. Elle ne choisit pas, elle chaîne. Toute la matière première (formules, tables, seuils) existe déjà dans le Référentiel Olivier. Ce document ne crée aucune donnée nouvelle — il formalise l'ordre d'exécution et les branchements conditionnels.
⚠ RÈGLE ABSOLUE — Si un cas n'est pas couvert par cet algorithme, l'IA NE DOIT PAS improviser. Elle doit signaler le cas manquant, appliquer les valeurs par défaut du référentiel, et marquer la recommandation avec confiance ⭐ (faible).

# PARTIE 1 — ENTRÉES REQUISES
## 1.1 Paramètres du profil parcelle
Ces paramètres sont issus du calibrage validé (Formulaire F1) et de la baseline.
## 1.2 Détermination automatique de l'option nutrition
✓ RÈGLE : L'option nutrition n'est PAS un choix utilisateur. Elle est déterminée automatiquement par l'IA selon les données disponibles.
⚠ L'option C est CUMULATIVE avec A ou B. Si C est active, l'IA applique les règles C (lessivage, engrais faible index salin) EN PLUS des règles A ou B selon la disponibilité des analyses sol.

# PARTIE 2 — ÉTAPE 1 : CALCUL DES DOSES NPK ANNUELLES
## 2.1 Formule fondamentale
Dose_totale (kg/ha) = (Rendement_cible × Coef_export) + Entretien − Correction_sol − Correction_eau
→ Voir REF_OLIVIER : §6.1 Coefficients d'exportation, §6.2 Besoins d'entretien, §6.3 Formule
## 2.2 Algorithme pas à pas
### Pas 2.2.1 — Calcul export
N_export = parcelle.rdt_cible × 3.5
P2O5_export = parcelle.rdt_cible × 1.2
K2O_export = parcelle.rdt_cible × 6.0
MgO_export = parcelle.rdt_cible × 2.5
### Pas 2.2.2 — Ajout entretien
✓ RÈGLE : Utiliser le milieu de fourchette du référentiel. Ne pas improviser de valeur intermédiaire.
### Pas 2.2.3 — Correction sol (Option A uniquement)
SI parcelle.option = B → Aucune correction sol (données absentes). Passer au pas 2.2.4.
SI parcelle.option = A :
### Pas 2.2.4 — Correction eau (nitrates)
N_correction_eau = parcelle.volume_irrigation_mm × parcelle.NO3_eau × 0.00226
SI parcelle.NO3_eau = NULL ou non disponible → N_correction_eau = 0
→ Voir REF_OLIVIER : §6.3.2 — Formule et démonstration
### Pas 2.2.5 — Dose brute
N_brut = N_export + N_entretien − N_correction_eau
P2O5_brut = P2O5_export + P2O5_entretien − P2O5_correction_sol
K2O_brut = K2O_export + K2O_entretien − K2O_correction_sol
### Pas 2.2.6 — Ajustement cible production
### Pas 2.2.7 — Ajustement alternance
### Pas 2.2.8 — Ajustement Option B
SI parcelle.option = B → Réduire toutes les doses fertigation de 30%.
N_final = N_ajusté × 0.70
P_final = P_ajusté × 0.70
K_final = K_ajusté × 0.70
→ Voir REF_OLIVIER : §5.3 — Doses réduites de 30% (sécurité)
### Pas 2.2.9 — SORTIE ÉTAPE 1
Variables produites : N_final, P2O5_final, K2O_final, MgO_final (kg/ha/an)

# PARTIE 3 — ÉTAPE 2 : FRACTIONNEMENT PAR STADE
## 3.1 Table de fractionnement (fixe)
Appliquer les pourcentages ci-dessous aux doses finales de l'Étape 1.
→ Voir REF_OLIVIER : §8.1 — Fractionnement standard (Option A)
✓ RÈGLE : Ces pourcentages sont FIXES et ne varient pas selon l'option (A, B, C). Seules les doses totales changent.
## 3.2 Calcul
Pour chaque mois M et chaque élément E :
Dose_M_E (kg/ha) = E_final × Pourcentage_M_E
Exemple : N en avril = N_final × 0.25
## 3.3 SORTIE ÉTAPE 2
Tableau 7 lignes (mois) × 4 colonnes (N, P, K, Mg) en kg/ha par période.

# PARTIE 4 — ÉTAPE 3 : SÉLECTION DES FORMES D'ENGRAIS
## 4.1 Arbre de décision — Azote
⚠ RÈGLE SOL CALCAIRE — Sur sol calcaire (pH > 7.2), l'urée subit 50-60% de pertes par volatilisation. Utiliser UNIQUEMENT formes nitrique ou ammoniacale stabilisée.
## 4.2 Arbre de décision — Phosphore
## 4.3 Arbre de décision — Potasse
⚠ INCOMPATIBILITÉ CUVE — Ne JAMAIS mélanger Ca(NO₃)₂ avec phosphates ou sulfates dans la même cuve. Injecter séparément avec rinçage.
## 4.4 SORTIE ÉTAPE 3
Pour chaque mois : forme d'engrais sélectionnée + quantité produit commercial (kg ou L) calculée à partir des doses élémentaires.

# PARTIE 5 — ÉTAPE 4 : PROGRAMME MICROÉLÉMENTS
## 5.1 Arbre de décision
✓ RÈGLE : Les microéléments (Fe, B, Zn, Mn) et biostimulants de base (humiques, algues) sont des composantes OBLIGATOIRES du programme sur sol calcaire. Ce ne sont PAS des options.
→ Voir REF_OLIVIER : §9 — Microéléments, §9.3 — Détection carences par indices multiples
## 5.2 Sélection chélate Fe selon calcaire actif

# PARTIE 6 — ÉTAPE 5 : PROGRAMME BIOSTIMULANTS
## 6.1 Calendrier de référence (à ajuster selon option)
→ Voir REF_OLIVIER : §11.6 — Calendrier annuel biostimulants
## 6.2 Coefficients d'ajustement par option
Calcul : Dose_biostim_M = Dose_référence_M × Coefficient_option

# PARTIE 7 — ÉTAPE 6 : PLAN IRRIGATION
## 7.1 Formule de base
Volume/arbre (L/jour) = (ETo × Kc × Surface_arbre) / Efficience × (1 + FL)
→ Voir REF_OLIVIER : §12.1 — Formule complète ETc
## 7.2 Table Kc par stade et système (fixe)
→ Voir REF_OLIVIER : §12.3 — Coefficients Kc
## 7.3 Fraction de lessivage (Option C uniquement)
FL = CE_eau / (5 × 4 − CE_eau)
SI parcelle.option ≠ C → FL = 0
→ Voir REF_OLIVIER : §14.3 — Fraction de lessivage — Calcul détaillé
## 7.4 ETo — Source et calcul
L'ETo mensuel moyen est extrait d'Open-Meteo (ERA5) pour les coordonnées de la parcelle. Le plan utilise les ETo moyens historiques par mois. Le suivi hebdomadaire utilisera l'ETo réel.
✓ RÈGLE : Le plan annuel produit des VOLUMES DE RÉFÉRENCE par stade. L'ajustement hebdomadaire en phase opérationnelle utilise l'ETo réel du moment.
## 7.5 Stratégie RDI (optionnelle)
Le RDI est inclus dans le plan SI ET SEULEMENT SI :
1. Le système est intensif ou super-intensif
2. La parcelle a au moins 2 ans d'historique
3. L'option C n'est PAS active (RDI déconseillé sur eau saline)

# PARTIE 8 — ÉTAPE 7 : CALENDRIER PHYTOSANITAIRE PRÉVENTIF
## 8.1 Calendrier fixe
→ Voir REF_OLIVIER : §17.3 — Calendrier phytosanitaire préventif
## 8.2 Traitements conditionnels (déclenchés par alertes)
Ces traitements NE SONT PAS dans le plan fixe. Ils sont déclenchés par les alertes OLI-XX en phase opérationnelle.
✓ RÈGLE : Les traitements mouche et œil de paon réactifs relèvent du Point 2 (prescriptions réactives OLI-XX), pas du plan annuel.

# PARTIE 9 — ÉTAPE 8 : RECOMMANDATION TAILLE
## 9.1 Arbre de décision
→ Voir REF_OLIVIER : §16.1-16.2 — Types de taille et intensité selon alternance

# PARTIE 10 — ÉTAPE 9 : MODULE SALINITÉ (Option C uniquement)
Cette étape NE S'EXÉCUTE QUE SI parcelle.option inclut C.
## 10.1 Actions déterministes
⚠ Le gypse n'est PAS systématique. Il n'est nécessaire que si SAR > 6. Condition stricte et non négociable.

# PARTIE 11 — ÉTAPE 10 : PRÉVISION RÉCOLTE INITIALE
## 11.1 Fenêtre de récolte optimale
L'alerte OLI-14 (Récolte optimale) sera affinée en cours de saison par le suivi NIRvP + GDD.
→ Voir REF_OLIVIER : §18 — Cibles de production, §22 — Modèle prédictif

# PARTIE 12 — ASSEMBLAGE FINAL ET VALIDATION
## 12.1 Ordre d'exécution obligatoire
## 12.2 Format de sortie — Plan annuel consolidé
Le plan annuel est présenté à l'utilisateur sous forme d'un tableau synthétique mois par mois, regroupant les 8 composantes. Il reprend exactement la structure du §23.3 du Référentiel, mais avec des valeurs CALCULÉES pour cette parcelle spécifique.
## 12.3 Vérifications automatiques avant présentation
## 12.4 Présentation à l'utilisateur
Le plan est présenté avec trois options :
1. Valider tel quel → Activation immédiate
2. Modifier des paramètres → Ajustement avant activation
3. Reporter → Plan non activé
Une fois activé, le plan alimente le calendrier de la parcelle et déclenche les rappels (recommandations planifiées).
→ Voir REF_OLIVIER : §23.5 — Enregistrement et validation
→ Voir GOUVERNANCE : §2.2 — Recommandations planifiées — Cycle simplifié 5 états

# PARTIE 13 — RÉFÉRENCES CROISÉES
Ce document chaîne exclusivement des données existantes. Aucune valeur nouvelle n'est créée. Voici la traçabilité complète :
— Fin du document Moteur d'Assemblage Plan Annuel v1.0 —

| Paramètre | Variable | Source | Exemple |
| --- | --- | --- | --- |
| Système de plantation | parcelle.systeme | F1 | intensif |
| Variété | parcelle.variete | F1 | Picholine Marocaine |
| Âge plantation | parcelle.age | F1 | 25 ans |
| Densité (arbres/ha) | parcelle.densite | Calculé | 277 |
| Surface arbre (m²) | parcelle.surface_arbre | Calculé | 36 |
| Rendement cible (T/ha) | parcelle.rdt_cible | Calibrage | 10 |
| Cible production | parcelle.cible | F1 | huile / table / mixte |
| Option nutrition | parcelle.option | Auto | A / B / C |
| Statut alternance | parcelle.alternance | Calibrage | ON / OFF / inconnu |
| Efficience irrigation | parcelle.efficience | F1 | 0.90 |
| CE eau (dS/m) | parcelle.CE_eau | F1 Analyse | 2.5 |
| pH sol | parcelle.pH_sol | F1 Analyse | 7.8 |
| Calcaire actif (%) | parcelle.calcaire_actif | F1 Analyse | 12 |
| NO₃ eau (mg/L) | parcelle.NO3_eau | F1 Analyse | 30 |
| P Olsen sol (ppm) | parcelle.P_sol | F1 Analyse | 25 |
| K échangeable sol (ppm) | parcelle.K_sol | F1 Analyse | 200 |
| SAR eau | parcelle.SAR | F1 Analyse | 4 |


| Option | Condition d'activation | Priorité |
| --- | --- | --- |
| C | CE_eau > 2.5 dS/m OU CE_sol > 3 dS/m | PRIORITAIRE — si condition remplie, C s'applique toujours |
| A | Analyse sol < 2 ans ET Analyse eau disponible ET option C non déclenchée | Standard — données complètes |
| B | Pas d'analyse sol récente (> 3 ans) OU pas d'analyse sol du tout | Par défaut — données incomplètes |


| Système | N entretien | K₂O entretien | P₂O₅ entretien |
| --- | --- | --- | --- |
| Traditionnel pluvial | 20 kg/ha (milieu fourchette) | 20 kg/ha | 12 kg/ha |
| Intensif irrigué | 45 kg/ha | 45 kg/ha | 20 kg/ha |
| Super-intensif | 60 kg/ha | 60 kg/ha | 25 kg/ha |


| Élément | Condition | Action | Réf. |
| --- | --- | --- | --- |
| P₂O₅ | P_sol > 40 ppm | Réduire P à entretien seul | REF §6.3.1 |
| K₂O | K_sol > 350 ppm | Réduire K de 50% | REF §6.3.1 |
| MgO | Mg_sol > 150 ppm | Supprimer apport Mg sol | REF §6.3.1 |


| Cible | Ajustement N | Ajustement K | Réf. |
| --- | --- | --- | --- |
| Huile qualité | ×1.00 (standard) | ×1.00 | REF §8.3 |
| Olive de table | ×1.10 | ×1.20 | REF §8.3 |
| Mixte | ×1.00 | ×1.10 | REF §8.3 |


| Statut alternance | N | P | K | Réf. |
| --- | --- | --- | --- | --- |
| Année ON (forte charge) | ×1.15 | ×1.00 | ×1.20 | REF §8.4 |
| Année OFF (sain) | ×0.75 | ×1.20 | ×0.80 | REF §8.4 |
| Épuisement post-ON sévère | ×0.85 | ×1.30 | ×0.70 | REF §8.4 |
| Inconnu / Neutre | ×1.00 | ×1.00 | ×1.00 | Défaut |


| Période | BBCH | N (%) | P₂O₅ (%) | K₂O (%) | Objectif |
| --- | --- | --- | --- | --- | --- |
| Fév-Mars | 01-15 | 25% | 100% | 15% | Reprise, P en fond |
| Avril | 31-51 | 25% | 0% | 15% | Croissance végétative |
| Mai | 55-65 | 15% | 0% | 20% | Floraison, K nouaison |
| Juin | 67-71 | 15% | 0% | 25% | Nouaison, grossissement |
| Juil-Août | 75-79 | 10% | 0% | 20% | Grossissement fruit |
| Sept | 81-85 | 5% | 0% | 5% | Maturation, réduire N |
| Oct-Nov | 89-92 | 5% | 0% | 0% | Post-récolte, reconstitution |


| Condition | Forme recommandée | Réf. |
| --- | --- | --- |
| pH_sol > 7.2 (sol calcaire) | Nitrate de calcium 15.5-0-0 OU Ammonitrate 33.5% | REF §7.1 |
| pH_sol ≤ 7.2 | Urée 46% OU Ammonitrate 33.5% | REF §7.1 |
| Option C (salinité) | Nitrate de calcium (faible index salin) | REF §5.4 |


| Condition | Forme recommandée | Réf. |
| --- | --- | --- |
| Application fond (fév-mars) | TSP 46% ou MAP 12-61-0 | REF §7.2 |
| Fertigation continue | Acide phosphorique 75% | REF §7.2 |
| Option C (eau pH > 7.5 et HCO3 > 500) | Acide phosphorique (double effet : P + acidification) | REF §10.4 |


| Condition | Forme recommandée | Réf. |
| --- | --- | --- |
| Standard / Option A | Sulfate de potasse SOP 0-0-50 | REF §7.3 |
| Besoin N+K simultané (mai-juin) | Nitrate de potasse NOP 13-0-46 | REF §7.3 |
| Option C (salinité) | SOP uniquement — JAMAIS KCl (apporte Cl toxique) | REF §5.4 + §7.3 |


| Élément | Condition d'inclusion | Dose Opt. A | Dose Opt. B | Stade / Réf. |
| --- | --- | --- | --- | --- |
| Fe-EDDHA | TOUJOURS si pH > 7.2 ou calcaire actif > 5% | 10 kg/ha/an | 1.5 kg/ha foliaire | Mars + Juin / REF §9 |
| Zn sulfate | TOUJOURS sur sol calcaire | 500 g/ha fol. | 750 g/ha fol. | Mars / REF §9 |
| Mn sulfate | TOUJOURS sur sol calcaire | 400 g/ha fol. | 600 g/ha fol. | Mars / REF §9 |
| B acide borique | TOUJOURS | 1 kg/ha fol. | 1.5 kg/ha fol. | Mai (floraison) / REF §9 |
| Mg sulfate | SI Mg_sol < 150 ppm ou non disponible | 5 kg/ha fol. | 7 kg/ha fol. | Avr + Juin / REF §9 |


| Calcaire actif | Chélate recommandé | Réf. |
| --- | --- | --- |
| < 5% | Fe-EDTA ou Fe-DTPA | REF §9 |
| 5-10% | Fe-EDDHA 6% | REF §9 |
| > 10% | Fe-EDDHA 6% dose majorée ou fractionner en 3 | REF §9 |


| Période | BBCH | Humiques | Fulviques | Aminés | Algues |
| --- | --- | --- | --- | --- | --- |
| Nov-Déc | Post-réc | 25 kg/ha granulé | — | 6 L/ha fertig. | — |
| Fév-Mars | 00-15 | 4 L/ha fertig. | 1.5 L/ha + Fe | 4 L/ha fol. | 3 L/ha |
| Avr-Mai | 51-65 | — | — | 4 L/ha fol. | 3 L/ha floraison |
| Mai-Juin | 69-75 | 4 L/ha fertig. | 1.5 L/ha + Fe | — | — |
| Juillet | 75 | — | — | — | 3 L/ha stress |
| Août-Sept | 79-89 | 3 L/ha fertig. | — | — | — |


| Biostimulant | Option A | Option B | Option C | Réf. |
| --- | --- | --- | --- | --- |
| Humiques | ×1.00 | ×0.60 | ×1.00 | REF §11.7 |
| Fulviques | ×1.00 | ×0.60 | ×1.00 | REF §11.7 |
| Aminés | ×1.00 | ×1.50 | ×1.20 | REF §11.7 |
| Algues | ×1.00 | ×1.00 | ×1.50 | REF §11.7 |


| Stade | Mois | Kc Tradi. | Kc Intensif | Kc Super-int. |
| --- | --- | --- | --- | --- |
| Repos hivernal | Déc-Fév | 0.40 | 0.50 | 0.55 |
| Débourrement | Mars | 0.45 | 0.55 | 0.60 |
| Croissance | Avr | 0.50 | 0.60 | 0.65 |
| Floraison | Mai | 0.55 | 0.65 | 0.70 |
| Nouaison | Juin | 0.60 | 0.75 | 0.80 |
| Grossissement | Juil-Août | 0.65 | 0.80 | 0.90 |
| Maturation | Sept-Oct | 0.55 | 0.65 | 0.70 |
| Post-récolte | Nov | 0.45 | 0.55 | 0.60 |


| Stade | RDI possible ? | Réduction | Réf. |
| --- | --- | --- | --- |
| Floraison / Nouaison | NON — JAMAIS | 0% | REF §13.4 |
| Grossissement II (août) | OUI | 20-30% | REF §13.4 |
| Maturation (sept) | OUI | 30-40% | REF §13.4 |
| Pré-récolte (oct-nov) | OUI | 40-50% | REF §13.4 |


| Période | Cible | Produit | Dose | Conditions |
| --- | --- | --- | --- | --- |
| Jan-Fév | Cochenille noire | Huile blanche | 15-20 L/ha | Hors gel, T > 5°C |
| Mars | Œil de paon (si risque) | Cuivre hydroxyde | 2 kg/ha | Si pluies printanières |
| Post-taille | Tuberculose | Cuivre hydroxyde | 2-3 kg/ha | Immédiat après taille |
| Oct-Nov | Œil de paon | Cuivre hydroxyde | 2-3 kg/ha | Après premières pluies |


| Alerte | Cible | Produit | Dose | Condition déclenchement |
| --- | --- | --- | --- | --- |
| OLI-04 | Œil de paon | Cuivre hydroxyde | 2-3 kg/ha | T 15-20°C + HR>80% + pluie |
| OLI-05 | Mouche olive | Deltaméthrine 0.5 L/ha OU Spinosad 0.2 L/ha | Voir REF | >2% fruits piqués OU >5 captures/piège/sem |


| Condition parcelle | Type taille | Intensité | Période |
| --- | --- | --- | --- |
| Âge < 6 ans | Formation | Forte | Nov-Jan |
| Alternance = ON (forte charge) | Légère + éclaircie | 10-15% | Nov-Déc |
| Alternance = OFF classique | Sévère renouvellement | 25-35% | Nov-Déc |
| Épuisement post-ON | Progressive | <20%/an | Nov-Déc |
| Âge > 25 ans + déclin (OLI-17) | Rajeunissement lourd | 30-40% sur 3 ans | Fév-Mars |
| Standard (aucune des conditions ci-dessus) | Production | Modérée (15-25%) | Nov-Déc |


| Action | Condition | Valeur | Réf. |
| --- | --- | --- | --- |
| Fraction de lessivage | TOUJOURS si Option C | Calculée §7.3 | REF §14.3 |
| Engrais faible index salin | TOUJOURS si Option C | Voir §4 (Étape 3) | REF §5.4 |
| Acidification eau | pH_eau > 7.5 ET HCO3 > 500 mg/L | Acide phosphorique 0.3-0.8 L/m³ | REF §10.4 |
| Amendement gypse | SAR > 6 — UNIQUEMENT | 1-2 T/ha si SAR 6-9 | REF §10.5 |
| Algues prioritaires | TOUJOURS si Option C | ×1.50 (voir Étape 5) | REF §11.7 |


| Cible | IM cible | Période indicative | Réf. |
| --- | --- | --- | --- |
| Huile qualité | 2.0 - 3.5 | Oct - début nov | REF §18.1 |
| Olive de table | 1.0 - 2.0 | Sept - oct (avant véraison) | REF §18.1 |
| Mixte | 2.5 - 3.5 | Oct - nov | REF §18.1 |


| N° | Étape | Entrées | Sorties |
| --- | --- | --- | --- |
| 1 | Doses NPK annuelles | Profil parcelle, analyses | N, P, K, Mg (kg/ha/an) |
| 2 | Fractionnement par stade | Sortie Étape 1 | Tableau mois × éléments |
| 3 | Formes d'engrais | Sortie Étape 2, pH sol, option | Produits commerciaux par mois |
| 4 | Programme microéléments | pH sol, calcaire actif, option | Fe, Zn, Mn, B, Mg par stade |
| 5 | Programme biostimulants | Calendrier réf. × coeff. option | Humiques, aminés, algues par stade |
| 6 | Plan irrigation | ETo, Kc, surface arbre, FL | Volume/arbre/jour par mois |
| 7 | Calendrier phyto préventif | Calendrier fixe + variété | Traitements par période |
| 8 | Recommandation taille | Âge, alternance, état | Type, intensité, période |
| 9 | Module salinité | CE eau, SAR, pH (si Option C) | FL, gypse, acidification |
| 10 | Prévision récolte | Cible, modèle prédictif | IM cible, fenêtre, fourchette T/ha |


| Vérification | Action si échec | Réf. |
| --- | --- | --- |
| Somme des % de fractionnement = 100% pour chaque élément | Erreur bloquante — ne pas générer | §8.1 |
| Doses N annuelles dans fourchette 30-150 kg/ha | Avertissement si hors fourchette | REF §6 |
| Volumes irrigation plausibles (50-350 L/arbre/jour max) | Avertissement si dépassement | REF §12.5 |
| Pas de traitement Cu pendant floraison (BBCH 55-69) | Reporter automatiquement | REF §17 |
| Incompatibilités cuve respectées | Séparer les applications | REF §7.4 |
| Pas de gypse si SAR ≤ 6 | Retirer du plan | REF §10.5 |


| Étape | Sections référentiel utilisées | Document source |
| --- | --- | --- |
| 1. Doses NPK | §6.1, §6.2, §6.3, §6.3.1, §6.3.2, §8.3, §8.4 | REF_OLIVIER_COMPLET |
| 2. Fractionnement | §8.1 | REF_OLIVIER_COMPLET |
| 3. Formes engrais | §7.1, §7.2, §7.3, §7.4, §5.4 | REF_OLIVIER_COMPLET |
| 4. Microéléments | §9, §9.3 | REF_OLIVIER_COMPLET |
| 5. Biostimulants | §11.1-11.7 | REF_OLIVIER_COMPLET |
| 6. Irrigation | §12.1, §12.3, §12.4, §13.4, §14.3 | REF_OLIVIER_COMPLET |
| 7. Phytosanitaire | §17.1, §17.2, §17.3 | REF_OLIVIER_COMPLET |
| 8. Taille | §16.1, §16.2 | REF_OLIVIER_COMPLET |
| 9. Salinité | §5.4, §10.4, §10.5, §14.3 | REF_OLIVIER_COMPLET |
| 10. Prévision récolte | §18.1, §22 | REF_OLIVIER_COMPLET |
| Option nutrition | §5.1, §5.2, §5.3, §5.4 | REF_OLIVIER_COMPLET |
| Gouvernance plan | Parties 2.2, 3.3, 5, 6.2 | GOUVERNANCE_RECOMMANDATIONS |
| Activation | Partie 1, §8.6 | MOTEUR_CALIBRAGE_IA |
