PRESCRIPTIONS RÉACTIVES
FICHES D'ACTION PAR ALERTE OLI-XX
Action, dose, durée, plafond et suivi pour chaque alerte
Module Olivier — 20 alertes codifiées
Version 1.0 — Avril 2026
⚠ Ce document complète le Moteur Opérationnel (Partie 7-8) et le Référentiel (Partie J). Il prescrit l'ACTION EXACTE pour chaque alerte, éliminant la marge d'interprétation de l'IA sur le « combien » et le « combien de temps ».

# PARTIE 0 — OBJET ET PRINCIPES
Ce document formalise, pour chaque code alerte OLI-XX, la prescription réactive complète : type d'action, quantification (dose, volume, durée), plafond, conditions de blocage, et critères de suivi post-application.
⚠ RÈGLE ABSOLUE — L'IA ne quantifie JAMAIS une action réactive par elle-même. Elle applique la fiche prescription correspondant au code OLI-XX déclenché. Si aucune fiche ne couvre le cas, elle signale le gap et applique la règle d'humilité (confiance ⭐, demander données terrain).
Chaque fiche suit la structure en 6 blocs de la Gouvernance des Recommandations. Les blocs 1 (constat spectral) et 2 (diagnostic) sont générés dynamiquement par le Moteur Opérationnel. Les blocs 3-6 sont prescrits par ce document.
→ Voir GOUVERNANCE_RECOMMANDATIONS : Partie 4 — Structure obligatoire en 6 blocs
→ Voir MOTEUR_OPERATIONNEL : Partie 7 — Génération des alertes + Partie 8 — Formulation

# SECTION A — ALERTES HYDRIQUES
## OLI-01 — Stress hydrique — Super-intensif

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §12, §13 — Moteur Opérationnel §7.2, §9


## OLI-02 — Stress hydrique — Intensif

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §12, §13 — Moteur Opérationnel §7.2

## OLI-12 — Sur-irrigation

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §13.2 — Tensiomètre interprétation


# SECTION B — ALERTES CLIMATIQUES
## OLI-03 — Gel floraison

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §4 BBCH, §11.3 Aminés, §22 Modèle prédictif — Moteur Opérationnel §6.7


## OLI-07 — Canicule prolongée

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §11.4 Algues, §12 Irrigation, §13.4 RDI — Moteur Opérationnel §6.7

## OLI-08 — Déficit heures de froid

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §3.4 Besoins froid, §9 Bore, §11.4 Algues — Moteur Opérationnel §6.7


## OLI-15 — Chergui (vent chaud sec)

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §12, §11.4 Algues — Moteur Opérationnel §7


# SECTION C — ALERTES NUTRITIONNELLES ET SANITAIRES
## OLI-16 — Carence azotée détectée

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §6, §7.1, §8, §9.3 — Moteur Opérationnel §9.2


## OLI-04 — Risque œil de paon

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §17.1 Œil de paon, §17.3 Calendrier phyto — Gouvernance §5.2 Délais

## OLI-05 — Risque mouche de l'olive

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §17.2 Mouche olive — Gouvernance §5.2


## OLI-06 — Verticilliose suspectée

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §17.1 Verticilliose, §16.4 Résidus — Moteur Opérationnel §7

## OLI-18 — Lessivage traitement détecté

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ Gouvernance §5.2 — Exception délai minimum phyto pour OLI-18


# SECTION D — ALERTES PHÉNOLOGIQUES ET STRUCTURELLES
## OLI-09 — Année OFF probable

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §8.4 Alternance NPK, §15 Alternance, §16.2 Taille alternance

## OLI-10 — Dépérissement

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §11 Biostimulants — Moteur Opérationnel §4, §7


## OLI-11 — Arbre mort

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ Moteur Calibrage §7.1 Zones intra-parcellaires

## OLI-13 — Floraison ratée

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §8 NPK stade, §22 Prévision — Moteur Opérationnel §6.7


## OLI-14 — Récolte optimale

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §18 Récolte qualité — Fiches Calibrage F3

## OLI-17 — Fin de cycle super-intensif

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §2 Systèmes, §3.2 Rendement par âge — Moteur Opérationnel §7


# SECTION E — ALERTES SALINITÉ
## OLI-19 — Accumulation saline sol

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §14 Salinité, §10.3 FL, §5.4 Option C

## OLI-20 — Toxicité chlorures foliaire

### PRESCRIPTION RÉACTIVE

### SUIVI POST-APPLICATION
→ REF_OLIVIER §14.1 Seuils Cl, §14.5 Symptômes, §7.3 Formes K


# SECTION F — MATRICE DE CO-OCCURRENCE
Quand deux alertes se déclenchent simultanément, l'IA doit identifier le lien causal et prioriser l'action. Cette matrice est déterministe.
✓ RÈGLE : En cas de co-occurrence non listée : appliquer la priorité standard (🔴 > 🟠 > 🟡 > 🟢). Traiter les alertes séquentiellement, pas simultanément.
— Fin du document Prescriptions Réactives OLI-XX v1.0 —

| Catégorie | Hydrique |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | NDMI < 0.12 + MSI > 1.3 + sec > 10 jours |
| Seuil de sortie | NDMI > 0.20 (2 passages consécutifs) |


| Type d'action | Irrigation d'urgence |
| --- | --- |
| Action détaillée | Augmenter le volume d'irrigation par rapport au plan en cours |
| Dose / Quantification | +40% du volume planifié pour le stade en cours. Exemple : si plan = 200 L/arbre/jour → passer à 280 L/arbre/jour |
| Durée d'application | Jusqu'à seuil de sortie : NDMI > 0.20 sur 2 passages (≈ 10 jours minimum) |
| Plafond / Limite | Ne pas dépasser 120% de la capacité au champ estimée. Si Option C active : ne pas oublier FL dans le calcul majoré. |
| Condition de blocage | SI sol saturé (NDMI > 0.45 ou déclaration utilisateur) → NE PAS augmenter. Investiguer autre cause (compaction, maladie racinaire). |
| Conditions météo requises | Matin tôt ou soir. Éviter plein soleil midi. |
| Fenêtre BBCH | Tous stades — aucune restriction BBCH |


| Indicateur à surveiller | NDMI |
| --- | --- |
| Réponse attendue | Hausse NDMI vers P25 puis P50 |
| Délai d'évaluation | 3-7 jours après augmentation |
| Impact sur le plan annuel | Modifier le volume dans le plan irrigation pour le mois en cours. Rétablir volume plan initial quand seuil de sortie atteint. |


| Catégorie | Hydrique |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | NDMI < 0.06 + MSI > 1.6 + sec > 15 jours |
| Seuil de sortie | NDMI > 0.12 (2 passages consécutifs) |


| Type d'action | Augmentation irrigation |
| --- | --- |
| Action détaillée | Augmenter le volume d'irrigation par rapport au plan en cours |
| Dose / Quantification | +30% du volume planifié pour le stade en cours |
| Durée d'application | Jusqu'à seuil de sortie : NDMI > 0.12 sur 2 passages |
| Plafond / Limite | Ne pas dépasser 120% de la capacité au champ estimée. |
| Condition de blocage | SI sol saturé → NE PAS augmenter. Investiguer. |
| Conditions météo requises | Matin tôt ou soir. |
| Fenêtre BBCH | Tous stades — aucune restriction BBCH |


| Indicateur à surveiller | NDMI |
| --- | --- |
| Réponse attendue | Hausse NDMI vers P25 |
| Délai d'évaluation | 3-7 jours |
| Impact sur le plan annuel | Ajuster volume irrigation dans le plan. Rétablir quand seuil de sortie atteint. |


| Catégorie | Hydrique |
| --- | --- |
| Priorité | 🟡 VIGILANCE |
| Seuil d'entrée | NDMI > 0.45 + sol saturé |
| Seuil de sortie | NDMI < 0.35 |


| Type d'action | Réduction irrigation |
| --- | --- |
| Action détaillée | Réduire le volume d'irrigation |
| Dose / Quantification | -30% du volume planifié pour le stade en cours. Vérifier que volume reste ≥ 50% ETC calculée. |
| Durée d'application | Jusqu'à NDMI < 0.35 (1 passage suffit) |
| Plafond / Limite | Ne pas descendre sous 50% des besoins ETc du stade. |
| Condition de blocage | SI stade = floraison ou nouaison (BBCH 55-71) → Réduction limitée à -15% (stade très sensible au déficit). |
| Conditions météo requises | N/A |
| Fenêtre BBCH | Tous stades, restriction floraison-nouaison ci-dessus |


| Indicateur à surveiller | NDMI |
| --- | --- |
| Réponse attendue | Baisse NDMI sous 0.35 |
| Délai d'évaluation | 5-10 jours |
| Impact sur le plan annuel | Modifier volume irrigation dans le plan pour le mois en cours. |


| Catégorie | Climatique |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | Tmin < -2°C en BBCH 55-69 |
| Seuil de sortie | T > 5°C (3 jours consécutifs) |


| Type d'action | Post-gel : évaluation + ajustement plan |
| --- | --- |
| Action détaillée | 1. Inspection terrain demandée (photo bourgeons/fleurs). 2. Application acides aminés foliaires (récupération stress). 3. Révision prévision rendement à la baisse. |
| Dose / Quantification | Acides aminés foliaires : 4-5 L/ha (hydrolysat végétal 15-20%). Algues : 3-4 L/ha. Application unique post-gel. |
| Durée d'application | Application unique dans les 3-5 jours post-gel (si T > 5°C confirmé). |
| Plafond / Limite | N/A — application unique. |
| Condition de blocage | SI gel < -5°C ET durée > 4h → Considérer perte totale floraison. Ne pas traiter (inutile). Passer directement à révision rendement -50% à -100%. |
| Conditions météo requises | T > 5°C, pas de pluie dans les 6h, vent < 15 km/h, matin tôt. |
| Fenêtre BBCH | BBCH 55-69 (floraison) uniquement |


| Indicateur à surveiller | NIRv |
| --- | --- |
| Réponse attendue | Stabilisation NIRv (pas d'aggravation) dans les 10-15 jours |
| Délai d'évaluation | 10-15 jours |
| Impact sur le plan annuel | Réviser prévision rendement : -30% si gel modéré (-2 à -4°C < 2h), -50% si gel sévère (-4°C ou > 2h), -80 à -100% si gel extrême. Ajuster programme N : réduire N de 25% (moins de fruits à alimenter). Maintenir K et biostimulants. |


| Catégorie | Climatique |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | Tmax > 42°C pendant > 3 jours consécutifs |
| Seuil de sortie | Tmax < 38°C (2 jours consécutifs) |


| Type d'action | Irrigation de soutien + protection |
| --- | --- |
| Action détaillée | 1. Augmenter irrigation. 2. Application algues (osmoprotection). 3. Éviter tout traitement foliaire pendant la canicule. |
| Dose / Quantification | Irrigation : +25% du volume planifié. Algues : 3-4 L/ha foliaire si possible (matin très tôt uniquement, avant 7h). |
| Durée d'application | Pendant toute la durée de la canicule + 3 jours après retour Tmax < 38°C. |
| Plafond / Limite | Volume irrigation : ne pas dépasser 130% ETc. Si Option C : maintenir FL dans le calcul. |
| Condition de blocage | SI BBCH 55-65 (floraison) → Pas de traitement foliaire (brûlure certaine). Irrigation uniquement. |
| Conditions météo requises | Irrigation : matin tôt ou nuit. Foliaire algues : UNIQUEMENT avant 7h (T < 30°C). |
| Fenêtre BBCH | Tous stades, restriction foliaire en floraison |


| Indicateur à surveiller | NDMI + NDVI |
| --- | --- |
| Réponse attendue | Stabilisation NDMI (pas de chute), NDVI maintenu |
| Délai d'évaluation | 5-10 jours post-canicule |
| Impact sur le plan annuel | Si canicule pendant grossissement (juil-août) : réviser rendement -10 à -20%. Si canicule pendant floraison : réviser rendement -20 à -40%. Suspendre RDI si actif. |


| Catégorie | Climatique |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | Heures froid < 100h au 28 février |
| Seuil de sortie | N/A — alerte ponctuelle, pas de sortie |


| Type d'action | Information + ajustement plan |
| --- | --- |
| Action détaillée | 1. Notification exploitant. 2. Prévoir floraison hétérogène. 3. Renforcer bore à la floraison. |
| Dose / Quantification | Bore : augmenter de +50% la dose floraison (1.5 kg/ha au lieu de 1 kg/ha). Algues floraison : +50% (4.5 L/ha au lieu de 3 L/ha). |
| Durée d'application | Application unique au stade BBCH 51-55 (pré-floraison). |
| Plafond / Limite | N/A. |
| Condition de blocage | Aucune. |
| Conditions météo requises | Conditions standard foliaire : T 15-25°C, HR > 60%, vent < 15 km/h. |
| Fenêtre BBCH | BBCH 51-55 (pré-floraison) |


| Indicateur à surveiller | NIRvP pic |
| --- | --- |
| Réponse attendue | Pic NIRvP ≥ 70% de l'attendu |
| Délai d'évaluation | Évaluer au stade BBCH 65-69 (pleine floraison) |
| Impact sur le plan annuel | Ajuster prévision rendement : -10 à -20% (floraison hétérogène = nouaison réduite). Prévoir éclaircissage inutile (charge naturellement faible). |


| Catégorie | Climatique |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | T > 40°C + HR < 20% + vent > 30 km/h |
| Seuil de sortie | T < 38°C ET HR > 30% |


| Type d'action | Irrigation d'urgence + suspension foliaire |
| --- | --- |
| Action détaillée | 1. Irrigation immédiate (+50% volume). 2. Suspendre TOUT traitement foliaire. 3. Algues en fertigation si possible. |
| Dose / Quantification | Irrigation : +50% du volume planifié. Algues en fertigation : 3-4 L/ha (osmoprotection racinaire). |
| Durée d'application | Pendant l'épisode Chergui + 48h après fin conditions. |
| Plafond / Limite | Ne pas dépasser 150% ETc. Si Option C : maintenir FL. |
| Condition de blocage | Aucune — action toujours justifiée en situation de Chergui. |
| Conditions météo requises | Irrigation : immédiate, jour ou nuit. AUCUN foliaire pendant Chergui (brûlure certaine + dérive spray). |
| Fenêtre BBCH | Tous stades |


| Indicateur à surveiller | NDMI + MSI |
| --- | --- |
| Réponse attendue | Stabilisation NDMI, MSI ne dépasse pas 1.5 |
| Délai d'évaluation | 3-5 jours post-épisode |
| Impact sur le plan annuel | Si Chergui pendant floraison : réviser rendement -30 à -50%. Si Chergui pendant grossissement : réviser -10 à -15%. Annuler tout RDI en cours. |


| Catégorie | Nutritionnelle |
| --- | --- |
| Priorité | 🟡 VIGILANCE |
| Seuil d'entrée | NDRE < P10 + GCI en baisse |
| Seuil de sortie | NDRE > P30 (2 passages consécutifs) |


| Type d'action | Application corrective N |
| --- | --- |
| Action détaillée | Fertigation N corrective en complément du plan |
| Dose / Quantification | 15-20 kg N/ha en application corrective unique. Forme : Nitrate de calcium (si pH > 7.2) ou Ammonitrate (si pH ≤ 7.2). Option B : ajouter N foliaire urée 0.5% à 8 kg/ha. |
| Durée d'application | Application unique. Réévaluer à J+14 sur NDRE. |
| Plafond / Limite | Dose N totale saison (plan + correctifs) ne doit pas dépasser 150 kg N/ha. |
| Condition de blocage | SI BBCH > 81 (maturation) → NE PAS appliquer N (risque dilution polyphénols, retard maturation). Reporter à post-récolte. SI NDMI aussi < P10 → Traiter d'abord le stress hydrique (OLI-01/02). N non assimilé en sol sec. |
| Conditions météo requises | Sol humide (post-irrigation ou pluie). Pas de stress hydrique actif. |
| Fenêtre BBCH | BBCH 01-79 (dormance à grossissement). INTERDIT après BBCH 81. |


| Indicateur à surveiller | NDRE + GCI |
| --- | --- |
| Réponse attendue | Hausse NDRE de 5-15%, stabilisation GCI |
| Délai d'évaluation | 7-14 jours |
| Impact sur le plan annuel | Ajouter l'application N corrective au plan annuel. Si 2ème carence N dans la saison : revoir doses N du plan à la hausse pour la saison suivante (+15%). |


| Catégorie | Sanitaire |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | T 15-20°C + HR > 80% + pluie |
| Seuil de sortie | 72h sans conditions favorables |


| Type d'action | Traitement cuivre préventif |
| --- | --- |
| Action détaillée | Application cuivre hydroxyde préventif |
| Dose / Quantification | Cuivre hydroxyde : 2-3 kg/ha. Adjuvant mouillant si HR < 50%. |
| Durée d'application | Application unique par épisode de risque. Délai minimum 7 jours entre 2 traitements Cu (sauf OLI-18 lessivage). |
| Plafond / Limite | Maximum 3 traitements Cu par saison (30 kg Cu métal/ha/5 ans réglementation). |
| Condition de blocage | SI traitement Cu déjà appliqué < 7 jours → NE PAS retraiter (sauf OLI-18). SI BBCH 55-65 (pleine floraison) → Reporter à BBCH 67+ (risque brûlure florale). |
| Conditions météo requises | T 15-25°C, HR > 60%, vent < 15 km/h, pas de pluie dans les 6h suivantes. |
| Fenêtre BBCH | BBCH tout sauf 55-65 (floraison) |


| Indicateur à surveiller | Aucun signal satellite attendu |
| --- | --- |
| Réponse attendue | Absence de symptômes (taches foliaires) dans les 30 jours |
| Délai d'évaluation | 30 jours |
| Impact sur le plan annuel | Si traitement Cu était prévu dans le plan < 10 jours : avancer au jour de l'alerte. Si traitement Cu était prévu > 10 jours : ajouter ce traitement, maintenir celui du plan. |


| Catégorie | Sanitaire |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | T 16-28°C + HR > 60% + captures > 5/piège/sem OU > 2% fruits piqués |
| Seuil de sortie | T > 35°C (3 jours) OU récolte déclarée |


| Type d'action | Traitement insecticide curatif |
| --- | --- |
| Action détaillée | Application insecticide |
| Dose / Quantification | Deltaméthrine : 0.5 L/ha OU Spinosad : 0.2 L/ha. Choix : Spinosad si récolte < 14 jours (DAR plus court). Deltaméthrine sinon. |
| Durée d'application | Application unique. Renouveler si captures persistent après 7 jours. |
| Plafond / Limite | Maximum 2 applications Deltaméthrine par saison. Maximum 3 applications Spinosad par saison. |
| Condition de blocage | SI récolte prévue < 7 jours (DAR Deltaméthrine et Spinosad = 7j) → NE PAS traiter. Récolter immédiatement. |
| Conditions météo requises | T 15-25°C, vent < 15 km/h, pas de pluie dans les 6h. |
| Fenêtre BBCH | BBCH 75-89 (grossissement à maturation) — les fruits doivent être présents |


| Indicateur à surveiller | Captures pièges |
| --- | --- |
| Réponse attendue | Baisse captures < 5/piège/semaine ET < 2% fruits piqués |
| Délai d'évaluation | 7 jours |
| Impact sur le plan annuel | Si mouche récurrente (3ème alerte dans la saison) : considérer avancer récolte de 7-10 jours si IM ≥ 1.5. |


| Catégorie | Sanitaire |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | NIRv en baisse asymétrique progressive |
| Seuil de sortie | IRRÉVERSIBLE — alerte reste active |


| Type d'action | Investigation terrain urgente + isolation |
| --- | --- |
| Action détaillée | 1. Demander inspection terrain URGENTE (photos branches, coupe vasculaire). 2. Suspendre irrigation localisée sur zone suspecte si confirmé. 3. Désinfection outils obligatoire. |
| Dose / Quantification | Aucun traitement curatif efficace. SI confirmée terrain : arrachage arbre(s) atteint(s). Brûlage résidus OBLIGATOIRE. NE PAS broyer in situ. |
| Durée d'application | Continue — surveillance permanente. |
| Plafond / Limite | N/A — pas de traitement chimique. |
| Condition de blocage | NE JAMAIS recommander de fongicide contre verticilliose (inefficace). NE JAMAIS broyer les résidus d'arbres atteints. |
| Conditions météo requises | N/A |
| Fenêtre BBCH | Tous stades |


| Indicateur à surveiller | NIRv zone suspecte |
| --- | --- |
| Réponse attendue | Stabilisation = faux positif probable. Aggravation = confirmation. |
| Délai d'évaluation | 30-60 jours |
| Impact sur le plan annuel | Si confirmée : modifier AOI (exclure zone morte). Recalibrage partiel si > 10% surface affectée. |


| Catégorie | Sanitaire |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | Pluie > 10mm dans les 6h post-application d'un traitement foliaire |
| Seuil de sortie | N/A — alerte ponctuelle |


| Type d'action | Renouvellement traitement |
| --- | --- |
| Action détaillée | Renouveler le traitement foliaire qui a été lessivé |
| Dose / Quantification | Même produit, même dose que le traitement original. Exception : si Cu, vérifier le plafond saisonnier avant de retraiter. |
| Durée d'application | Renouveler dans les 48-72h si conditions météo favorables. |
| Plafond / Limite | Respecter les plafonds produit (Cu : max saisonnier ; insecticide : max applications). |
| Condition de blocage | SI plafond saisonnier du produit atteint → NE PAS retraiter. Signaler le gap et passer en surveillance renforcée. |
| Conditions météo requises | Conditions standard du produit à renouveler. Vérifier prévisions J+3 : pas de pluie prévue. |
| Fenêtre BBCH | Même fenêtre BBCH que le traitement original |


| Indicateur à surveiller | Même indicateur que la recommandation originale |
| --- | --- |
| Réponse attendue | Idem recommandation originale |
| Délai d'évaluation | Idem recommandation originale |
| Impact sur le plan annuel | Comptabiliser comme traitement supplémentaire dans le bilan phyto de campagne. |


| Catégorie | Phénologique |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | NIRvP de l'année N << NIRvP de N-2 (-30%) au stade floraison |
| Seuil de sortie | N/A — alerte saisonnière |


| Type d'action | Ajustement plan annuel |
| --- | --- |
| Action détaillée | 1. Ajuster doses NPK selon table alternance OFF. 2. Renforcer P (+20%). 3. Prévoir taille sévère de renouvellement. |
| Dose / Quantification | N : ×0.75. P : ×1.20. K : ×0.80 (par rapport aux doses plan initial). Taille : sévère renouvellement 25-35% volume en nov-déc. |
| Durée d'application | Ajustement valable pour toute la saison restante. |
| Plafond / Limite | N/A. |
| Condition de blocage | SI c'est la première année (pas d'historique N-2) → NE PAS déclencher. Confiance insuffisante. |
| Conditions météo requises | N/A — ajustement plan, pas d'application directe. |
| Fenêtre BBCH | Détecté au stade floraison (BBCH 55-65). Ajustements appliqués immédiatement. |


| Indicateur à surveiller | NIRvP cumulé saison |
| --- | --- |
| Réponse attendue | NIRvP cumulé ≈ 70% d'une année ON |
| Délai d'évaluation | Fin de saison (bilan campagne) |
| Impact sur le plan annuel | Recalculer doses NPK restantes de la saison avec coefficients OFF. Modifier recommandation taille. Réviser prévision rendement -40 à -60%. |


| Catégorie | Structurelle |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | NIRv en baisse > 25% sur 3 passages consécutifs |
| Seuil de sortie | NIRv stabilisé (2 passages consécutifs) |


| Type d'action | Investigation urgente multi-cause |
| --- | --- |
| Action détaillée | 1. Demander inspection terrain URGENTE. 2. Vérifier irrigation (réseau, goutteurs). 3. Vérifier signes verticilliose (OLI-06). 4. Vérifier compaction sol. 5. Application biostimulants de soutien. |
| Dose / Quantification | Aminés foliaires : 5 L/ha. Algues fertigation : 4 L/ha. Humiques fertigation : 5 L/ha. Application de soutien en attendant diagnostic terrain. |
| Durée d'application | Biostimulants : application unique. Surveillance continue jusqu'à stabilisation NIRv. |
| Plafond / Limite | N/A. |
| Condition de blocage | SI NIRv < seuil_min persistant → Basculer vers OLI-11 (arbre mort). NE PAS continuer à traiter un arbre mort. |
| Conditions météo requises | Biostimulants : conditions standard fertigation/foliaire. |
| Fenêtre BBCH | Tous stades |


| Indicateur à surveiller | NIRv |
| --- | --- |
| Réponse attendue | Stabilisation NIRv (arrêt du déclin). Idéal : remontée progressive. |
| Délai d'évaluation | 15-30 jours |
| Impact sur le plan annuel | Si dépérissement confirmé sur > 20% de la parcelle : déclencher recalibrage partiel (F2). Réviser rendement en conséquence. |


| Catégorie | Structurelle |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | NIRv < seuil_min persistant (> 4 passages) |
| Seuil de sortie | IRRÉVERSIBLE |


| Type d'action | Constatation + mise à jour parcelle |
| --- | --- |
| Action détaillée | 1. Confirmer par inspection terrain. 2. Marquer arbre(s) pour arrachage. 3. Mettre à jour densité parcelle. |
| Dose / Quantification | Aucun intrant. Action administrative uniquement. |
| Durée d'application | N/A. |
| Plafond / Limite | N/A. |
| Condition de blocage | NE JAMAIS recommander de traitement sur un arbre mort. |
| Conditions météo requises | N/A. |
| Fenêtre BBCH | Tous stades |


| Indicateur à surveiller | N/A |
| --- | --- |
| Réponse attendue | N/A |
| Délai d'évaluation | N/A |
| Impact sur le plan annuel | Mettre à jour parcelle.densite. Si > 10% arbres morts : recalibrage partiel (F2) + modification AOI potentielle. Réviser rendement proportionnellement. |


| Catégorie | Phénologique |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | NIRvP pic < 70% de l'attendu + conditions météo défavorables pendant floraison |
| Seuil de sortie | N/A — alerte saisonnière |


| Type d'action | Ajustement plan post-floraison |
| --- | --- |
| Action détaillée | 1. Réviser rendement à la baisse. 2. Réduire K (moins de fruits à grossir). 3. Maintenir biostimulants (récupération arbre). |
| Dose / Quantification | K : réduire de 30% sur les mois restants. N : réduire de 15%. P : maintenir. Biostimulants : maintenir 100%. |
| Durée d'application | Ajustement valable pour le reste de la saison. |
| Plafond / Limite | N/A. |
| Condition de blocage | SI floraison ratée + année OFF → Double impact. Réviser rendement -60 à -80%. |
| Conditions météo requises | N/A — ajustement plan, pas d'application directe. |
| Fenêtre BBCH | Détecté post-floraison (BBCH 67-69) |


| Indicateur à surveiller | NIRvP cumulé |
| --- | --- |
| Réponse attendue | NIRvP cumulé bas confirmé |
| Délai d'évaluation | Fin de saison |
| Impact sur le plan annuel | Recalculer doses K et N restantes. Réviser prévision rendement -30 à -50%. Considérer éclaircissage inutile. |


| Catégorie | Phénologique |
| --- | --- |
| Priorité | 🟢 INFORMATION |
| Seuil d'entrée | NIRvP en baisse + NDVI stable + GDD > 2800 |
| Seuil de sortie | Récolte déclarée par l'exploitant |


| Type d'action | Notification de récolte |
| --- | --- |
| Action détaillée | Informer l'exploitant que la fenêtre de récolte optimale est ouverte selon la cible définie. |
| Dose / Quantification | Aucun intrant. Message informatif avec IM cible rappelé : Huile qualité = 2.0-3.5, Table = 1.0-2.0, Mixte = 2.5-3.5. |
| Durée d'application | Notification valable 15-20 jours (fenêtre de récolte). |
| Plafond / Limite | N/A. |
| Condition de blocage | SI IM terrain > 4.0 → Signaler dépassement optimal pour huile qualité. Urgence si cible = qualité. |
| Conditions météo requises | N/A. |
| Fenêtre BBCH | BBCH 85-89 |


| Indicateur à surveiller | Déclaration récolte utilisateur |
| --- | --- |
| Réponse attendue | Récolte déclarée → passer en post-récolte |
| Délai d'évaluation | Jusqu'à déclaration |
| Impact sur le plan annuel | À la déclaration de récolte : basculer plan en mode post-récolte. Déclencher F3 (recalibrage annuel) si conditions remplies. |


| Catégorie | Structurelle |
| --- | --- |
| Priorité | 🟡 VIGILANCE |
| Seuil d'entrée | NIRv en déclin sur 2 saisons consécutives (super-intensif uniquement) |
| Seuil de sortie | IRRÉVERSIBLE — alerte reste active |


| Type d'action | Alerte stratégique |
| --- | --- |
| Action détaillée | Informer l'exploitant de la fin probable du cycle productif. Présenter les options : rajeunissement lourd, sur-greffage, ou arrachage-replantation. |
| Dose / Quantification | Aucun intrant immédiat. Recommandation de consultation expert. |
| Durée d'application | N/A — décision stratégique pluriannuelle. |
| Plafond / Limite | N/A. |
| Condition de blocage | NE JAMAIS recommander de maintien en production intensive d'un verger SI en fin de cycle. Le forçage est contre-productif. |
| Conditions météo requises | N/A. |
| Fenêtre BBCH | Détecté post-récolte (comparaison inter-annuelle) |


| Indicateur à surveiller | NIRv saison suivante |
| --- | --- |
| Réponse attendue | Si remontée NIRv saison suivante : faux positif possible |
| Délai d'évaluation | 12 mois |
| Impact sur le plan annuel | Si confirmé : basculer vers un programme de transition (réduction intrants -50%). Proposer analyse coût-bénéfice replantation vs maintien. |


| Catégorie | Salinité |
| --- | --- |
| Priorité | 🟠 PRIORITAIRE |
| Seuil d'entrée | CE sol > 4 dS/m (analyse terrain) |
| Seuil de sortie | CE sol < 3 dS/m (analyse terrain) |


| Type d'action | Lessivage intensif + ajustement nutrition |
| --- | --- |
| Action détaillée | 1. Augmenter fraction de lessivage. 2. Passer en Option C si pas déjà active. 3. Renforcer algues. |
| Dose / Quantification | FL : recalculer avec CE_sol mesurée. Si FL calculée < 20% → appliquer minimum 20%. Algues : ×1.50. Basculer vers engrais faible index salin. |
| Durée d'application | Jusqu'à prochaine analyse sol (recommander analyse à 3 mois). |
| Plafond / Limite | Volume total irrigation (ETc + FL) ne doit pas saturer le sol. |
| Condition de blocage | SI drainage parcelle insuffisant (sol argileux, pas de drain) → Lessivage risque d'aggraver l'asphyxie. Demander avis expert. |
| Conditions météo requises | N/A — ajustement régime irrigation. |
| Fenêtre BBCH | Tous stades, priorité en période chaude (lessivage plus efficace) |


| Indicateur à surveiller | CE sol (prochaine analyse) |
| --- | --- |
| Réponse attendue | CE sol < 3 dS/m |
| Délai d'évaluation | 3-6 mois (prochaine analyse) |
| Impact sur le plan annuel | Activer Option C dans le plan si pas déjà active. Recalculer tous les volumes irrigation avec FL majorée. |


| Catégorie | Salinité |
| --- | --- |
| Priorité | 🔴 URGENTE |
| Seuil d'entrée | Cl foliaire > 0.5% (analyse) + brûlures marginales visibles |
| Seuil de sortie | Cl foliaire < 0.3% (analyse) |


| Type d'action | Lessivage d'urgence + changement engrais |
| --- | --- |
| Action détaillée | 1. Lessivage immédiat (irrigation longue). 2. Supprimer TOUT apport KCl (chlorure de potasse). 3. Utiliser uniquement SOP (sulfate de potasse). 4. Algues renforcées. |
| Dose / Quantification | Irrigation de lessivage : 1 application longue = 2× volume normal du jour. SOP : remplacement immédiat de tout KCl dans le programme. Algues : 4 L/ha fertigation. |
| Durée d'application | Lessivage : 1 application. Changement SOP : permanent pour la saison. Algues : 1 application, puis maintenir calendrier. |
| Plafond / Limite | Ne pas saturer le sol (risque asphyxie). |
| Condition de blocage | SI source d'eau elle-même riche en Cl (> 350 mg/L) → Le lessivage ne résoudra pas le problème. Recommander changement de source d'eau. |
| Conditions météo requises | Irrigation de lessivage : matin tôt. |
| Fenêtre BBCH | Tous stades, urgence immédiate |


| Indicateur à surveiller | Symptômes foliaires + Cl foliaire (prochaine analyse) |
| --- | --- |
| Réponse attendue | Arrêt progression brûlures. Cl < 0.3% à prochaine analyse. |
| Délai d'évaluation | 30-60 jours (prochaine analyse foliaire) |
| Impact sur le plan annuel | Remplacer tout KCl par SOP dans le plan. Augmenter FL dans le plan. Recommander analyse eau si Cl eau inconnu. |


| Alerte 1 | Alerte 2 | Lien causal | Action combinée |
| --- | --- | --- | --- |
| OLI-01/02 | OLI-16 | Le stress hydrique bloque l'absorption N même si N disponible. | Traiter d'abord OLI-01/02 (irrigation). Attendre 7-10j. Réévaluer OLI-16. |
| OLI-01/02 | OLI-07 | Canicule CAUSE le stress hydrique (ETP explose). | Action combinée : +50% irrigation (prendre le max des deux). Algues fertigation. |
| OLI-01/02 | OLI-15 | Chergui CAUSE stress hydrique aigu. | Action combinée : +50% irrigation (Chergui prime). Suspendre foliaire. |
| OLI-04 | OLI-07 | CONTRADICTOIRE — canicule tue le champignon œil de paon. | Annuler OLI-04. Maintenir OLI-07 seul. |
| OLI-04 | OLI-18 | Le traitement Cu a été lessivé → l'œil de paon reste non traité. | Renouveler Cu immédiatement (OLI-18 prime, même si délai < 7j). |
| OLI-03 | OLI-13 | Le gel pendant floraison CAUSE la floraison ratée. | Appliquer OLI-03 (aminés récupération). OLI-13 s'applique ensuite (ajustement plan). |
| OLI-09 | OLI-13 | Année OFF + floraison ratée = double impact. | Cumuler les deux ajustements. Rendement : -60 à -80%. |
| OLI-10 | OLI-06 | Le dépérissement peut ÊTRE la verticilliose. | Appliquer OLI-06 (investigation verticilliose). Si non confirmée, maintenir OLI-10. |
| OLI-16 | OLI-12 | Sur-irrigation peut lessiver N → carence N induite. | Traiter d'abord OLI-12 (réduire irrigation). Attendre 10j. Réévaluer OLI-16. |
| OLI-19 | OLI-20 | Accumulation saline sol + toxicité Cl = même problème, stade avancé. | Appliquer OLI-20 (urgence Cl). OLI-19 se résout en parallèle. |
