## GÉNÉRATION DU PLAN ANNUEL

Règles Algorithmiques pour le Moteur IA

Module Transversal --- Toutes Cultures Arboricoles

> **⚠ DÉCLENCHEMENT**
> Ce module s'active automatiquement : (1) Après la première validation du calibrage, (2) Chaque année après la clôture de campagne (recalibrage F3), (3) En cas de changement majeur déclaré par l'utilisateur.

Version 1.0 --- Février 2026

**1. PRINCIPE DU PLAN ANNUEL**

### 1.1 Définition

Le Plan Annuel est un calendrier intégré généré automatiquement par l'IA après validation du calibrage. Il couvre l'ensemble des interventions prévues pour la saison à venir : fertilisation, biostimulants, phytosanitaire préventif, irrigation, et jalons de suivi.

Le plan n'est PAS une liste de recommandations ponctuelles. C'est un programme complet qui sert de référence tout au long de la saison. Les recommandations générées en cours de saison AJUSTENT ce plan, elles ne le remplacent pas.

### 1.2 Déclenchement automatique

  **Événement**              **Déclencheur**                           **Action**
  -------------------------- ----------------------------------------- --------------------------------------
  Premier calibrage validé   Utilisateur clique \"Valider baseline\"   Génération plan pour saison en cours
  Recalibrage annuel (F3)    Campagne clôturée + validation            Génération plan pour saison N+1
  Changement majeur          Déclaration irrigation/variété/système    Régénération partielle du plan

### 1.3 Composantes du plan

  **Composante**              **Contenu**                                **Fréquence mise à jour**
  --------------------------- ------------------------------------------ --------------------------------
  Programme NPK               Doses mensuelles, formes, fractionnement   Annuel + ajustements si alerte
  Programme microéléments     Fe, Zn, Mn, B selon analyses               Annuel
  Programme biostimulants     Humiques, aminés, algues par stade         Annuel
  Programme phyto préventif   Traitements préventifs calendaires         Annuel + alertes si conditions
  Plan irrigation             Volumes par stade, fréquence               Hebdomadaire (selon météo)
  Gestion salinité            Lessivage, acidification, gypse            Si Option C active
  Taille prévue               Type, période, intensité                   Annuel
  Prévision récolte           Fenêtre optimale, IM cible                 Affinée en saison

**2. DONNÉES D'ENTRÉE POUR LA GÉNÉRATION**

### 2.1 Données issues du calibrage

-   Système de plantation (traditionnel / intensif / super-intensif)

-   Variété et ses caractéristiques (alternance, sensibilités)

-   Âge de la plantation

-   Densité (arbres/ha) et surface

-   Option nutrition sélectionnée (A / B / C)

-   Cible de production (huile / table / mixte)

-   Percentiles spectraux (P10 à P90)

-   Potentiel de rendement estimé

-   Score de santé initial

### 2.2 Données analyses (si disponibles)

-   Analyse sol : pH, CE, P Olsen, K échangeable, calcaire actif, MO

-   Analyse eau : CE, pH, SAR, Cl, Na, HCO₃, NO₃, B

-   Analyse foliaire : N, P, K, Ca, Mg, Fe, Zn, Mn, B, Cu

### 2.3 Données historiques

-   Rendements réels N-1, N-2, N-3

-   Statut alternance détecté (ON / OFF / épuisement)

-   Événements passés (gel, sécheresse, maladie)

### 2.4 Données externes

-   Prévisions météo saisonnières (si disponibles)

-   Date actuelle pour déterminer le point de départ du plan

**3. ALGORITHME DE GÉNÉRATION**

### 3.1 Étape 1 --- Déterminer le rendement cible

> SI rendement\_historique\_disponible ALORS
>
> rendement\_cible = moyenne(3\_meilleures\_annees) × 0.95
>
> SINON
>
> rendement\_cible = potentiel\_calibrage × 0.85
>
> FIN SI

Le coefficient de sécurité (0.85-0.95) évite de surestimer et de sur-fertiliser.

### 3.2 Étape 2 --- Calculer les doses annuelles NPK

### 2.1 Dose brute

> Dose\_N\_brute = (rendement\_cible × 3.5) + entretien\_systeme
>
> Dose\_P\_brute = (rendement\_cible × 1.2) + entretien\_systeme
>
> Dose\_K\_brute = (rendement\_cible × 6.0) + entretien\_systeme

### 2.2 Corrections

> SI analyse\_sol.P\_Olsen > 40 ppm ALORS
>
> Dose\_P = entretien\_seul // Sol riche en P
>
> FIN SI
>
> SI analyse\_sol.K > 350 ppm ALORS
>
> Dose\_K = Dose\_K\_brute × 0.5 // Sol riche en K
>
> FIN SI
>
> SI analyse\_eau.NO3 > 10 mg/L ALORS
>
> N\_eau = volume\_irrigation\_mm × NO3\_mg\_L × 0.00226
>
> Dose\_N = Dose\_N\_brute - N\_eau
>
> FIN SI

### 2.3 Ajustement alternance

> SI statut\_alternance == \"annee\_ON\" ALORS
>
> Dose\_N = Dose\_N × 1.15
>
> Dose\_K = Dose\_K × 1.20
>
> SINON SI statut\_alternance == \"annee\_OFF\_sain\" ALORS
>
> Dose\_N = Dose\_N × 0.75
>
> Dose\_P = Dose\_P × 1.20
>
> Dose\_K = Dose\_K × 0.80
>
> SINON SI statut\_alternance == \"epuisement\" ALORS
>
> Dose\_N = Dose\_N × 0.85
>
> Dose\_P = Dose\_P × 1.30
>
> Dose\_K = Dose\_K × 0.70
>
> FIN SI

### 2.4 Ajustement cible production

> SI cible == \"olive\_table\" ALORS
>
> Dose\_K = Dose\_K × 1.20
>
> SINON SI cible == \"mixte\" ALORS
>
> Dose\_K = Dose\_K × 1.10
>
> FIN SI

### 3.3 Étape 3 --- Fractionner par mois

Les doses annuelles sont réparties selon le calendrier de fractionnement du référentiel.

  **Mois**    **N (%)**   **P (%)**   **K (%)**   **Action IA**
  ----------- ----------- ----------- ----------- ---------------------------------------
  Fév-Mars    25          100         15          Planifier 1ère fertigation N + P fond
  Avril       25          0           15          Planifier 2ème fertigation N
  Mai         15          0           20          Planifier K floraison
  Juin        15          0           25          Planifier K nouaison
  Juil-Août   10          0           20          Planifier K grossissement
  Sept        5           0           5           Planifier réduction pré-récolte
  Oct-Nov     5           0           0           Planifier N post-récolte

> POUR chaque mois DANS calendrier:
>
> dose\_N\_mois = Dose\_N\_annuelle × pct\_N\[mois\] / 100
>
> dose\_K\_mois = Dose\_K\_annuelle × pct\_K\[mois\] / 100
>
> ajouter\_au\_plan(mois, \"NPK\", dose\_N\_mois, dose\_K\_mois)
>
> FIN POUR

### 3.4 Étape 4 --- Générer le programme microéléments

> SI option\_nutrition == \"B\" ALORS
>
> // Programme foliaire renforcé
>
> ajouter\_au\_plan(\"Mars\", \"Fe\_foliaire\", 1.5 kg/ha)
>
> ajouter\_au\_plan(\"Mai\", \"Fe\_foliaire\", 1.5 kg/ha)
>
> ajouter\_au\_plan(\"Mars\", \"Zn\_Mn\_foliaire\", \"renforcé\")
>
> SINON
>
> // Programme standard
>
> ajouter\_au\_plan(\"Mars\", \"Fe-EDDHA\", 5 kg/ha)
>
> ajouter\_au\_plan(\"Juin\", \"Fe-EDDHA\", 5 kg/ha)
>
> FIN SI
>
> SI analyse\_sol.pH > 8.0 OU analyse\_sol.calcaire\_actif > 10% ALORS
>
> marquer\_priorite(\"Fe\", \"HAUTE\")
>
> FIN SI
>
> // Bore floraison toujours
>
> ajouter\_au\_plan(\"Mai\_BBCH\_51-55\", \"B\_foliaire\", 1 kg/ha)
>
> ajouter\_au\_plan(\"Mai\_BBCH\_65-67\", \"B\_foliaire\", 1 kg/ha)

### 3.5 Étape 5 --- Générer le programme biostimulants

> SI option\_nutrition == \"B\" ALORS
>
> coef\_humiques = 0.60
>
> coef\_amines = 1.50
>
> SINON SI option\_nutrition == \"C\" ALORS
>
> coef\_algues = 1.50
>
> coef\_amines = 1.20
>
> SINON
>
> // Option A standard
>
> coef\_\* = 1.00
>
> FIN SI
>
> // Appliquer calendrier biostimulants × coefficients
>
> POUR chaque intervention DANS calendrier\_biostimulants:
>
> dose\_ajustee = dose\_standard × coef\_correspondant
>
> ajouter\_au\_plan(intervention.mois, intervention.type, dose\_ajustee)
>
> FIN POUR

### 3.6 Étape 6 --- Générer le programme phyto préventif

> // Traitements calendaires systématiques
>
> ajouter\_au\_plan(\"Oct-Nov\", \"Cuivre\_oeil\_paon\", \"2-3 kg/ha\")
>
> ajouter\_au\_plan(\"Jan-Fev\", \"Huile\_blanche\_cochenille\", \"15-20 L/ha\")
>
> SI variete.sensibilite\_oeil\_paon == \"sensible\" ALORS
>
> ajouter\_au\_plan(\"Mars\", \"Cuivre\_preventif\", \"2 kg/ha\", condition=\"si\_pluies\")
>
> FIN SI
>
> // Les traitements mouche seront déclenchés par alertes, pas planifiés
>
> ajouter\_note(\"Mai-Oct\", \"Surveillance mouche - traitement si seuil atteint\")

### 3.7 Étape 7 --- Générer le plan irrigation

> SI systeme == \"traditionnel\" ET irrigation == \"aucune\" ALORS
>
> plan\_irrigation = None
>
> ajouter\_note(\"Pluvial - pas de plan irrigation\")
>
> SINON
>
> POUR chaque mois DANS saison\_irrigation:
>
> Kc = get\_Kc(systeme, mois)
>
> ETo\_moyen = get\_ETo\_historique(mois)
>
> volume\_base = ETo\_moyen × Kc × surface\_arbre / efficience
>
> SI option\_nutrition == \"C\" ALORS
>
> FL = calculer\_fraction\_lessivage(CE\_eau)
>
> volume\_ajuste = volume\_base × (1 + FL)
>
> SINON
>
> volume\_ajuste = volume\_base
>
> FIN SI
>
> ajouter\_au\_plan(mois, \"irrigation\", volume\_ajuste, frequence)
>
> FIN POUR
>
> FIN SI

### 3.8 Étape 8 --- Gestion salinité (si Option C)

> SI option\_nutrition == \"C\" ALORS
>
> // Acidification eau
>
> SI analyse\_eau.pH > 7.5 ET analyse\_eau.HCO3 > 500 ALORS
>
> ajouter\_au\_plan(\"Toute\_saison\", \"acidification\_H3PO4\", dose)
>
> FIN SI
>
> // Gypse (SEULEMENT si SAR élevé)
>
> SI analyse\_eau.SAR > 6 ALORS
>
> dose\_gypse = calculer\_dose\_gypse(SAR)
>
> ajouter\_au\_plan(\"Automne\", \"gypse\", dose\_gypse)
>
> FIN SI
>
> // Forcer engrais faible index salin
>
> remplacer\_forme(\"N\", \"Nitrate\_calcium\_ou\_NOP\")
>
> remplacer\_forme(\"K\", \"SOP\_ou\_NOP\")
>
> exclure\_forme(\"KCl\")
>
> FIN SI

### 3.9 Étape 9 --- Planifier la taille

> SI statut\_alternance == \"annee\_ON\" ALORS
>
> type\_taille = \"legere\_eclaircie\"
>
> intensite = \"10-15%\"
>
> SINON SI statut\_alternance == \"annee\_OFF\_sain\" ALORS
>
> type\_taille = \"renouvellement\"
>
> intensite = \"25-35%\"
>
> SINON SI statut\_alternance == \"epuisement\" ALORS
>
> type\_taille = \"progressive\"
>
> intensite = \"< 20%\"
>
> ajouter\_note(\"Taille sur 2-3 ans, ne pas épuiser davantage\")
>
> FIN SI
>
> ajouter\_au\_plan(\"Nov-Dec\", \"taille\", type\_taille, intensite)

### 3.10 Étape 10 --- Prévision récolte

> SI cible == \"huile\_qualite\" ALORS
>
> IM\_cible = \[2.0, 3.5\]
>
> fenetre\_recolte = \"Oct debut Nov\"
>
> SINON SI cible == \"olive\_table\" ALORS
>
> IM\_cible = \[1.0, 2.0\]
>
> fenetre\_recolte = \"Sept-Oct (avant véraison)\"
>
> SINON
>
> IM\_cible = \[2.5, 3.5\]
>
> fenetre\_recolte = \"Oct-Nov\"
>
> FIN SI
>
> ajouter\_au\_plan(\"fenetre\_recolte\", \"recolte\", IM\_cible)
>
> ajouter\_note(\"Prévision affinée en saison selon NIRvP et terrain\")

**4. STRUCTURE DE SORTIE DU PLAN**

### 4.1 Format JSON du plan généré

Le plan est stocké en JSON pour permettre l'affichage calendrier et le suivi des modifications.

> {\
> \"parcelle\_id\": \"PARC-001\",\
> \"saison\": \"2026\",\
> \"date\_generation\": \"2026-02-15\",\
> \"version\": 1,\
> \"statut\": \"actif\",\
> \
> \"parametres\": {\
> \"systeme\": \"intensif\",\
> \"variete\": \"Haouzia\",\
> \"age\": 12,\
> \"densite\": 400,\
> \"surface\_ha\": 10,\
> \"option\_nutrition\": \"A\",\
> \"cible\_production\": \"huile\_qualite\",\
> \"statut\_alternance\": \"annee\_ON\",\
> \"rendement\_cible\_t\_ha\": 10\
> },\
> \
> \"doses\_annuelles\": {\
> \"N\_kg\_ha\": 85,\
> \"P2O5\_kg\_ha\": 32,\
> \"K2O\_kg\_ha\": 126\
> },\
> \
> \"interventions\": \[\
> {\
> \"id\": \"INT-001\",\
> \"type\": \"fertigation\",\
> \"categorie\": \"NPK\",\
> \"mois\": \"fev\",\
> \"semaine\": null,\
> \"stade\_BBCH\": \"01-09\",\
> \"produit\": \"TSP + Nitrate calcium\",\
> \"dose\": {\"N\": 21, \"P2O5\": 32, \"K2O\": 19},\
> \"unite\": \"kg/ha\",\
> \"statut\": \"planifie\",\
> \"priorite\": \"normale\"\
> },\
> {\
> \"id\": \"INT-002\",\
> \"type\": \"fertigation\",\
> \"categorie\": \"microelements\",\
> \"mois\": \"mar\",\
> \"produit\": \"Fe-EDDHA 6%\",\
> \"dose\": 5,\
> \"unite\": \"kg/ha\",\
> \"statut\": \"planifie\"\
> },\
> \...\
> \],\
> \
> \"irrigation\": {\
> \"type\": \"goutte\_a\_goutte\",\
> \"planning\_mensuel\": \[\
> {\"mois\": \"jan\", \"volume\_L\_arbre\_jour\": 50, \"frequence\": \"1x/sem\"},\
> {\"mois\": \"fev\", \"volume\_L\_arbre\_jour\": 70, \"frequence\": \"2x/sem\"},\
> \...\
> \],\
> \"option\_salinite\": {\
> \"actif\": false,\
> \"FL\_pct\": null,\
> \"acidification\": false\
> }\
> },\
> \
> \"recolte\": {\
> \"fenetre\_prevue\": \[\"2026-10-15\", \"2026-11-15\"\],\
> \"IM\_cible\": \[2.0, 3.5\],\
> \"rendement\_prevu\_t\_ha\": \[8, 12\]\
> }\
> }

**5. LOGIQUE D'AJUSTEMENT EN COURS DE SAISON**

### 5.1 Principe

Le plan annuel n'est pas figé. Il évolue en fonction des observations satellite, météo, et des déclarations utilisateur. Chaque ajustement est tracé avec sa justification.

### 5.2 Événements déclencheurs d'ajustement

  **Événement**                        **Impact sur le plan**                 **Traçabilité**
  ------------------------------------ -------------------------------------- -----------------------------------
  Alerte stress hydrique (OLI-01/02)   Augmenter volume irrigation            Modifier planning\_irrigation
  Alerte carence N (OLI-16)            Ajouter fertigation N corrective       Ajouter intervention au plan
  Gel floraison détecté (OLI-03)       Réviser rendement\_prevu à la baisse   Modifier recolte.rendement\_prevu
  Application déclarée utilisateur     Marquer intervention \"executee\"      Modifier statut intervention
  Nouvelle analyse foliaire            Ajuster doses microéléments            Modifier interventions concernées
  Conditions phyto favorables          Déclencher traitement prévu            Changer statut \"a\_executer\"

### 5.3 Règles d'ajustement NPK

> SI alerte\_carence\_N ALORS
>
> // Ajouter application corrective
>
> dose\_corrective = 15 kg N/ha
>
> ajouter\_intervention(\"fertigation\", \"N\_correctif\", dose\_corrective)
>
> // NE PAS modifier les doses futures prévues
>
> FIN SI
>
> SI rendement\_prevu\_revise < rendement\_cible × 0.7 ALORS
>
> // Réduire les doses K restantes (moins de fruits = moins export)
>
> POUR chaque intervention K non\_executee:
>
> intervention.dose = intervention.dose × 0.75
>
> FIN POUR
>
> enregistrer\_ajustement(\"Rendement révisé, K réduit\")
>
> FIN SI

### 5.4 Règles d'ajustement irrigation

> // Mise à jour hebdomadaire selon météo réelle
>
> CHAQUE semaine:
>
> ETo\_reel = get\_ETo\_semaine\_passee()
>
> ETo\_prevu = get\_ETo\_prevu\_semaine\_suivante()
>
> volume\_semaine\_suivante = ETo\_prevu × Kc × surface / efficience
>
> SI pluie\_prevue > 20 mm ALORS
>
> volume\_semaine\_suivante = volume\_semaine\_suivante - (pluie\_prevue × 0.7)
>
> FIN SI
>
> mettre\_a\_jour\_plan\_irrigation(semaine\_suivante, volume\_semaine\_suivante)
>
> FIN CHAQUE

**6. PRÉSENTATION À L'UTILISATEUR**

### 6.1 Vue calendrier

Le plan est présenté à l'utilisateur sous forme de calendrier interactif avec les interventions positionnées par mois/semaine.

-   Chaque intervention est cliquable pour voir les détails

-   Code couleur par type (NPK = bleu, phyto = vert, irrigation = cyan)

-   Statut visible (planifié / à exécuter / exécuté / ajusté)

### 6.2 Vue synthèse

Une vue résumée présente :

-   Doses totales NPK de l'année

-   Coût estimé du programme (basé sur prix prévisionnels)

-   Nombre d'interventions par catégorie

-   Prochaine intervention à venir

-   Alertes actives impactant le plan

### 6.3 Validation utilisateur

À la génération du plan, l'utilisateur peut :

-   Valider tel quel → Plan activé, rappels programmés

-   Modifier certains paramètres → Régénération partielle

-   Reporter → Plan non activé, pas de rappels

  -------------------------------------------------------------------------------------------------------------------------------
  ✓ RÈGLE : Sans validation utilisateur explicite, le plan reste en statut 'brouillon' et aucune notification n'est envoyée.
  -------------------------------------------------------------------------------------------------------------------------------

### 6.4 Notifications et rappels

Une fois le plan validé, le système génère des rappels :

-   J-7 avant chaque intervention majeure

-   Rappel si intervention non déclarée après la fenêtre prévue

-   Notification si ajustement automatique du plan

**7. RECALIBRAGE ET NOUVEAU PLAN**

### 7.1 Clôture de campagne

À la fin de la campagne (récolte déclarée + formulaire F3), le système :

-   Compare le réalisé vs le prévu (rendement, interventions)

-   Calcule les écarts et les explique

-   Ajuste les coefficients du modèle prédictif si écart > 20%

-   Met à jour la baseline avec les nouvelles données

-   Génère automatiquement le plan pour la saison N+1

### 7.2 Bilan de campagne

Un rapport est généré avec :

-   Rendement réel vs prévu

-   Interventions réalisées vs planifiées

-   Alertes survenues et réponses

-   Évolution du score de santé

-   Recommandations pour la saison suivante

### 7.3 Déclenchement du nouveau plan

> SI formulaire\_F3\_valide ET rendement\_reel\_declare ALORS
>
> // Mettre à jour l'historique
>
> ajouter\_rendement\_historique(saison, rendement\_reel)
>
> // Recalculer le statut alternance
>
> nouveau\_statut = calculer\_alternance(historique\_3\_ans)
>
> // Mettre à jour la baseline
>
> recalculer\_percentiles(nouvelles\_donnees)
>
> // Générer le plan N+1
>
> plan\_N\_plus\_1 = generer\_plan\_annuel(baseline\_mise\_a\_jour)
>
> // Présenter à l'utilisateur
>
> notifier\_utilisateur(\"Nouveau plan disponible pour validation\")
>
> FIN SI

**--- Fin du document Génération Plan Annuel v1.0 ---**
