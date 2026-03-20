## FICHES DE SAISIE STANDARDISÉES

## MODULE CALIBRAGE AGRONOMIQUE

Ce document définit les trois formulaires de saisie de la plateforme :

  -------- --------------------------------------------- ----------------------------------------- ---------------------------------------------------
  **N°**   **Formulaire**                                **Déclenchement**                         **Volume saisie manuelle**
  F1       Saisie initiale --- Nouvelle parcelle         Création de la parcelle dans l'app       Moyen --- données de base + analyses
  F2       Recalibrage partiel --- Changement ponctuel   Manuel --- initié par l'utilisateur      Faible --- bloc concerné uniquement
  F3       Recalibrage annuel --- Post-campagne          Automatique --- déclaration fin récolte   Très faible --- vérification + nouvelles analyses
  -------- --------------------------------------------- ----------------------------------------- ---------------------------------------------------

## Version 1.0 --- Février 2026

> **F1 --- SAISIE INITIALE : NOUVELLE PARCELLE**
>
> ℹ Ce formulaire est déclenché après que l'utilisateur a : (1) dessiné le contour AOI de la parcelle, (2) choisi la culture, la variété, la densité et le type d'irrigation. Les données satellitaires sont chargées automatiquement dès validation de l'AOI.
>
> ***\[DEV\] Surface calculée automatiquement depuis l'AOI. Nombre d'arbres estimé = Surface × densité standard. Ces valeurs sont pré-remplies et modifiables par l'utilisateur.***

**ÉTAPE 1 COMPLÉMENTS PLANTATION**

*Données complétant les informations déjà saisies (culture, variété, densité, irrigation).*

  ---------------------------------------------- --------------------------------------------------------------- ------------------- ------------------------------------------------------------------------------------------
  **Champ**                                      **Format / Type de saisie**                                     **Statut**          **Note / Aide à la saisie**
  Âge de la plantation                           Nombre entier --- années                                        **● Obligatoire**   Ex: 25. Si planté en plusieurs phases, indiquer l'âge dominant.
  Nombre d'arbres réel                          Nombre entier                                                   ◑ Recommandé        Si différent de l'estimation automatique. Permet un calcul précis volume/arbre.
  Écartement réel (L × l)                        Texte --- ex: 6×6 m                                             ◑ Recommandé        Si différent du standard de la variété. Impacte la densité et les volumes d'irrigation.
  Source d'eau actuelle                         Liste : Puits / Barrage / Seguia / Réseau AEP / Mixte / Autre   **● Obligatoire**   Si mixte : préciser la proportion principale.
  Y a-t-il eu un changement de source d'eau ?   Oui / Non                                                       **● Obligatoire**   Si Oui → afficher les 2 champs suivants.
  └ Date du changement                           Mois / Année                                                    ◑ Recommandé        Conditionnel. Permet à l'IA de contextualiser l'historique satellite avant/après.
  └ Ancienne source d'eau                       Texte libre                                                     ◑ Recommandé        Information de contexte pour l'interprétation historique.
  ---------------------------------------------- --------------------------------------------------------------- ------------------- ------------------------------------------------------------------------------------------

**ÉTAPE 2 HISTORIQUE IRRIGATION**

*Données sur le régime d'irrigation actuel et passé.*

  ------------------------------------- ---------------------------------------------------------------------- ------------------- --------------------------------------------------------------------------------------------
  **Champ**                             **Format / Type de saisie**                                            **Statut**          **Note / Aide à la saisie**
  Fréquence d'irrigation actuelle      Liste : Quotidien / 2--3×/semaine / 1×/semaine / 1×/15 jours / Autre   **● Obligatoire**   
  Volume par arbre par irrigation       Nombre --- litres/arbre                                                **● Obligatoire**   Donnée critique pour le bilan hydrique et le calcul de fraction de lessivage (eau saline).
  Le régime a-t-il changé récemment ?   Oui / Non                                                              **● Obligatoire**   Si Oui → afficher les champs suivants.
  └ Date du changement de régime        Mois / Année                                                           ◑ Recommandé        Conditionnel.
  └ Fréquence avant changement          Même liste                                                             ◑ Recommandé        Ex: 1×/15 jours avant forage d'un nouveau puits.
  └ Volume avant changement             Nombre --- litres/arbre                                                ◑ Recommandé        
  ------------------------------------- ---------------------------------------------------------------------- ------------------- --------------------------------------------------------------------------------------------

**ÉTAPE 3 ANALYSE SOL**

> **⚠ Obligatoire pour générer un calibrage de niveau de confiance élevé. Sans analyse sol, le calibrage est possible mais limité (niveau de confiance réduit).**

  -------------------------- ----------------------------------- ------------------- -------------------------------------------------------------------------------------------------------
  **Champ**                  **Format / Type de saisie**         **Statut**          **Note / Aide à la saisie**
  Analyse sol disponible ?   Oui / Non / À venir (date prévue)   **● Obligatoire**   Si Non ou À venir → passer au Bloc suivant. Le calibrage sera généré avec niveau de confiance réduit.
  └ Date de l'analyse       Mois / Année                        ◑ Recommandé        Permet à l'IA d'évaluer la fraîcheur de la donnée (coefficient de confiance).
  └ Laboratoire / Source     Texte libre                         ◑ Recommandé        Information de traçabilité.
  -------------------------- ----------------------------------- ------------------- -------------------------------------------------------------------------------------------------------

## Paramètres disponibles --- cocher et saisir uniquement ce qui figure dans le rapport :

  ------------------------------ --------------------------------------- ------------------- ------------- ---------------------------------------------------------
  **Paramètre**                  **Unité standard**                      **Valeur saisie**   **Statut**    **Note IA**
  pH eau                         Sans unité                              \[ \_\_\_ \]        Prioritaire   Conditionne biodisponibilité de tous les microéléments.
  Conductivité électrique (CE)   dS/m ou mS/cm                           \[ \_\_\_ \]        Prioritaire   Risque salinité sol. Correction fertilisation.
  Texture globale                Sableux / Limoneux / Argileux / Mixte   \[ \_\_\_ \]        Prioritaire   Impact drainage, irrigation, compaction.
  Matière organique (MO %)       \%                                      \[ \_\_\_ \]        Prioritaire   
  Phosphore assimilable          mg/kg P₂O₅                              \[ \_\_\_ \]        Recommandé    Base calcul dose P.
  Potassium échangeable          mg/kg K₂O                               \[ \_\_\_ \]        Recommandé    Base calcul dose K. Correction si > 350 ppm.
  Calcium échangeable (Ca)       meq/100g ou mg/kg                       \[ \_\_\_ \]        Recommandé    
  Magnésium échangeable (Mg)     meq/100g ou mg/kg                       \[ \_\_\_ \]        Recommandé    Rapport Ca/Mg critique sur sol calcaire.
  Calcaire total (%)             \%                                      \[ \_\_\_ \]        Recommandé    Indicateur blocage microéléments.
  Calcaire actif (%)             \%                                      \[ \_\_\_ \]        Recommandé    Plus précis que calcaire total pour blocage Fe/Zn.
  Profondeur exploitée (cm)      cm                                      \[ \_\_\_ \]        Recommandé    Profondeur racinaire réelle.
  Azote total (N)                ‰ ou mg/kg                              \[ \_\_\_ \]        Optionnel     
  Fer (Fe)                       mg/kg                                   \[ \_\_\_ \]        Optionnel     Complément microéléments sol.
  Zinc (Zn)                      mg/kg                                   \[ \_\_\_ \]        Optionnel     
  Manganèse (Mn)                 mg/kg                                   \[ \_\_\_ \]        Optionnel     
  Bore (B)                       mg/kg                                   \[ \_\_\_ \]        Optionnel     
  Cuivre (Cu)                    mg/kg                                   \[ \_\_\_ \]        Optionnel     
  Autres (champ libre)           Paramètre + unité + valeur              \[ \_\_\_ \]        Optionnel     Tout paramètre supplémentaire figurant sur le rapport.
  ------------------------------ --------------------------------------- ------------------- ------------- ---------------------------------------------------------

**ÉTAPE 4 ANALYSE EAU D'IRRIGATION**

> **⚠ Obligatoire si irrigation. Sans analyse eau, la stratégie hydrique et la gestion de la salinité ne peuvent pas être calculées.**

  -------------------------- ----------------------------------- ------------------- ----------------------------------------------------------------------------------------
  **Champ**                  **Format / Type de saisie**         **Statut**          **Note / Aide à la saisie**
  Analyse eau disponible ?   Oui / Non / À venir (date prévue)   **● Obligatoire**   Si irrigation existante et pas d'analyse → signal d'alerte affiché à l'utilisateur.
  └ Date de l'analyse       Mois / Année                        ◑ Recommandé        Eau de puits : analyser tous les 2 ans minimum. Barrage : tous les ans.
  └ Source correspondante    Lien vers source saisie Bloc 1      ◑ Recommandé        Pré-rempli automatiquement depuis Bloc 1.
  -------------------------- ----------------------------------- ------------------- ----------------------------------------------------------------------------------------

## Paramètres disponibles --- saisir uniquement ce qui figure dans le rapport :

  ---------------------- ---------------------------- ------------------- ------------- ---------------------------------------------------------------------------------
  **Paramètre**          **Unité standard**           **Valeur saisie**   **Statut**    **Note IA**
  CE eau                 dS/m ou µS/cm                \[ \_\_\_ \]        Prioritaire   Seuil tolérance olivier : < 4 dS/m. Calcul fraction lessivage.
  pH eau                 Sans unité                   \[ \_\_\_ \]        Prioritaire   pH > 7.5 → acidification recommandée. Impact biodisponibilité.
  SAR                    Sans unité (calculé)         \[ \_\_\_ \]        Prioritaire   Risque sodicité sol. Peut être calculé par l'IA si Na, Ca, Mg disponibles.
  Sodium (Na⁺)           meq/L ou mg/L                \[ \_\_\_ \]        Prioritaire   Seuil toxicité olivier : > 115 mg/L.
  Chlorures (Cl⁻)        meq/L ou mg/L                \[ \_\_\_ \]        Prioritaire   Seuil toxicité olivier : > 150 mg/L.
  Bicarbonates (HCO₃⁻)   meq/L ou mg/L                \[ \_\_\_ \]        Recommandé    Seuil : > 500 mg/L nécessite acidification.
  Calcium (Ca²⁺)         meq/L ou mg/L                \[ \_\_\_ \]        Recommandé    Nécessaire au calcul SAR si non fourni.
  Magnésium (Mg²⁺)       meq/L ou mg/L                \[ \_\_\_ \]        Recommandé    Nécessaire au calcul SAR si non fourni.
  Nitrates (NO₃⁻)        mg/L                         \[ \_\_\_ \]        Recommandé    Correction dose N : Apport N (kg/ha) = Vol irrigation (mm) × \[NO3\] × 0.00226.
  Bore (B)               mg/L                         \[ \_\_\_ \]        Optionnel     Plage normale : 0.5--2.0 mg/L. Toxicité > 2 mg/L.
  Sulfates (SO₄²⁻)       meq/L ou mg/L                \[ \_\_\_ \]        Optionnel     
  Autres (champ libre)   Paramètre + unité + valeur   \[ \_\_\_ \]        Optionnel     
  ---------------------- ---------------------------- ------------------- ------------- ---------------------------------------------------------------------------------

**ÉTAPE 5 ANALYSE FOLIAIRE**

> ℹ Optionnel à la création. Fortement recommandé si disponible : c'est la vérité physiologique terrain qui prime sur toutes les autres analyses. Idéalement réalisée en juillet.

  ------------------------------------- --------------------------------------- -------------- -------------------------------------------------------------------------------------------
  **Champ**                             **Format / Type de saisie**             **Statut**     **Note / Aide à la saisie**
  Analyse foliaire disponible ?         Oui / Non / Prévue (date)               ○ Optionnel    Si Prévue : rappel automatique à la date indiquée pour inviter à saisir les résultats.
  └ Date de prélèvement                 Jour / Mois / Année                     ◑ Recommandé   Essentiel pour évaluer la validité : juillet = référence. Autre mois = précision réduite.
  └ Stade phénologique au prélèvement   Texte libre ou liste BBCH               ◑ Recommandé   Ex: BBCH 75 --- grossissement fruit. Conditionne l'interprétation des normes §6.4.
  └ Rameaux fructifères ou non ?        Fructifères / Non fructifères / Mixte   ◑ Recommandé   Standard : feuilles de l'année sur rameaux NON fructifères.
  ------------------------------------- --------------------------------------- -------------- -------------------------------------------------------------------------------------------

**Éléments disponibles --- saisir uniquement ce qui figure dans le rapport :**

  ---------------------- ------------- ------------------- ----------------------------- ---------------------------------------
  **Élément**            **Unité**     **Valeur saisie**   **Norme suffisante (§6.4)**   **Statut affiché auto**
  Azote (N)              \%            \[ \_\_\_ \]        1.5 -- 2.0 %                  ✅ Suffisant / ⚠ Déficient / 🔴 Carence
  Phosphore (P)          \%            \[ \_\_\_ \]        0.10 -- 0.30 %                Idem
  Potassium (K)          \%            \[ \_\_\_ \]        0.80 -- 1.20 %                Idem
  Calcium (Ca)           \%            \[ \_\_\_ \]        1.0 -- 3.0 %                  Idem
  Magnésium (Mg)         \%            \[ \_\_\_ \]        0.10 -- 0.30 %                Idem
  Fer (Fe)               ppm           \[ \_\_\_ \]        50 -- 150 ppm                 Idem
  Zinc (Zn)              ppm           \[ \_\_\_ \]        15 -- 30 ppm                  Idem
  Manganèse (Mn)         ppm           \[ \_\_\_ \]        20 -- 80 ppm                  Idem
  Bore (B)               ppm           \[ \_\_\_ \]        19 -- 150 ppm                 Idem + alerte si > 200
  Cuivre (Cu)            ppm           \[ \_\_\_ \]        4 -- 20 ppm                   Idem
  Sodium (Na)            \%            \[ \_\_\_ \]        < 0.20 %                     Idem + alerte si > 0.50%
  Chlorures (Cl)         \%            \[ \_\_\_ \]        < 0.50 %                     Idem
  Autres (champ libre)   unité libre   \[ \_\_\_ \]        ---                           ---
  ---------------------- ------------- ------------------- ----------------------------- ---------------------------------------

**ÉTAPE 6 HISTORIQUE DES RÉCOLTES**

> ℹ Minimum 3 années si disponible. Ces données permettent à l'IA d'évaluer le potentiel réel atteint et l'indice d'alternance.

  ----------- ----------------------------------- --------------------------- ------------------------- -----------------------
  **Année**   **Rendement (T/ha ou kg totaux)**   **Unité**                   **Qualité (si connue)**   **Observation libre**
  20\_\_\_    \[ \_\_\_ \]                        T/ha / kg total (choisir)   \[ \_\_\_ \]              
  20\_\_\_    \[ \_\_\_ \]                        T/ha / kg total (choisir)   \[ \_\_\_ \]              
  20\_\_\_    \[ \_\_\_ \]                        T/ha / kg total (choisir)   \[ \_\_\_ \]              
  20\_\_\_    \[ \_\_\_ \]                        T/ha / kg total (choisir)   \[ \_\_\_ \]              
  20\_\_\_    \[ \_\_\_ \]                        T/ha / kg total (choisir)   \[ \_\_\_ \]              
  ----------- ----------------------------------- --------------------------- ------------------------- -----------------------

  -------------------------------- ------------------------------------------------ -------------- -------------------------------------------------------------------------
  **Champ**                        **Format / Type de saisie**                      **Statut**     **Note / Aide à la saisie**
  Régularité perçue des récoltes   Stable / Alternance marquée / Très irrégulière   ◑ Recommandé   Information qualitative. Aide l'IA à calibrer l'indice d'alternance.
  -------------------------------- ------------------------------------------------ -------------- -------------------------------------------------------------------------

**ÉTAPE 7 HISTORIQUE CULTURAL**

  ---------------------------------- -------------------------------------------------------------------- -------------- ------------------------------------------------------------------
  **Champ**                          **Format / Type de saisie**                                          **Statut**     **Note / Aide à la saisie**
  Taille pratiquée ?                 Oui / Non / Irrégulièrement                                          ◑ Recommandé   
  └ Type de taille habituel          Production / Rajeunissement / Sanitaire / Mixte                      ○ Optionnel    
  └ Dernière taille : date           Mois / Année                                                         ○ Optionnel    
  └ Dernière taille : intensité      Légère (<15%) / Modérée (15--25%) / Sévère (>25%)                  ○ Optionnel    \% du volume canopée retiré.
  Fertilisation passée pratiquée ?   Oui / Non / Partielle                                                ◑ Recommandé   
  └ Type                             Organique / Minérale / Les deux / Inconnue                           ○ Optionnel    
  Biostimulants utilisés ?           Oui / Non / Inconnu                                                  ○ Optionnel    
  Stress majeurs identifiés          Sécheresse / Gel / Maladie / Ravageur / Salinité / Autre --- Année   ○ Optionnel    Peut en sélectionner plusieurs. Champ libre pour détail.
  Observations terrain libres        Texte libre                                                          ○ Optionnel    Tout élément jugé pertinent par l'utilisateur ou le technicien.
  ---------------------------------- -------------------------------------------------------------------- -------------- ------------------------------------------------------------------

**ÉTAPE 8 VALIDATION ET NIVEAU DE CONFIANCE** \[AUTOMATIQUE\]

> ℹ Avant de lancer le calibrage, l'IA analyse les données disponibles et affiche un bilan de confiance.
>
> ***\[DEV\] Afficher le niveau de confiance 0--100 % sur cet écran (calculé selon MOTEUR\_CALIBRAGE\_IA §5.1) avec la mention suivante à côté : 'Ce score reflète la qualité des données disponibles --- il ne préjuge pas de la qualité du calibrage.' Afficher le détail des composantes (satellite, sol, eau, rendements, profil, cohérence) avec barres de progression. Décision affichage agriculteur / technicien à confirmer avant mise en production.***

## Affichage automatique avant validation :

  ------------------------- ---------------------------- ----------------------------------------------------------------------------------------------------------
  **Élément affiché**       **Format**                   **Logique IA**
  Données disponibles       Liste ✅ avec icône verte     Tous les blocs renseignés avec statut Oui.
  Données manquantes        Liste ⚠️ avec icône orange   Blocs non renseignés ou marqués Non/À venir. Indication de l'impact sur la précision.
  Niveau de confiance       Score 0--100 %               Calculé selon le moteur de calibrage (→ MOTEUR\_CALIBRAGE\_IA §5.1) : historique satellite (30 pts), analyse sol (20 pts), analyse eau (15 pts), historique rendements (20 pts), complétude profil (10 pts), cohérence données (5 pts).
  Message d'amélioration   Texte dynamique              Ex: 'Ajouter une analyse foliaire permettrait d'améliorer le niveau de confiance à 8/10.'
  ------------------------- ---------------------------- ----------------------------------------------------------------------------------------------------------

> ✅ Bouton principal : \[ Lancer le calibrage \] --- actif dès que les champs obligatoires (Blocs 1 et 2) sont complétés.
>
> ℹ Bouton secondaire : \[ Sauvegarder et compléter plus tard \] --- le calibrage peut être lancé à tout moment.
>
> **F2 --- RECALIBRAGE PARTIEL : CHANGEMENT PONCTUEL**
>
> ℹ Ce formulaire est initié manuellement par l'utilisateur quand un changement significatif intervient sur la parcelle. Seul le bloc concerné est mis à jour. La baseline existante reste figée sur tout le reste.
>
> **⚠ Règle fondamentale : ne recalibrer que ce qui a changé. Chaque recalibrage partiel est horodaté et conservé dans l'historique de la parcelle.**

**ÉTAPE 1 SÉLECTION DU MOTIF DE RECALIBRAGE**

*L'utilisateur sélectionne le motif. Un seul formulaire simplifié s'affiche selon le choix.*

  -------------------------------------------------------------- -------------------------------------------------------- -------------------------------------------------------
  **Motif sélectionné**                                          **Bloc mis à jour**                                      **Reste de la baseline**
  Changement source d'eau                                       Analyse eau (F1 Bloc 4) + régime irrigation si modifié   Inchangé
  Changement système irrigation                                  Régime irrigation (F1 Bloc 2)                            Inchangé
  Nouvelle analyse sol disponible                                Analyse sol (F1 Bloc 3)                                  Inchangé
  Nouvelle analyse eau disponible                                Analyse eau (F1 Bloc 4)                                  Inchangé
  Nouvelle analyse foliaire disponible                           Analyse foliaire (F1 Bloc 5)                             Inchangé
  Restructuration parcelle (arrachage, replantation partielle)   Bloc 1 + nouveau AOI si nécessaire                       Partiellement modifié --- validation complète requise
  Autre (champ libre)                                            À définir par l'utilisateur                             Selon évaluation IA
  -------------------------------------------------------------- -------------------------------------------------------- -------------------------------------------------------

**ÉTAPE 2 SAISIE DU BLOC CONCERNÉ**

> ℹ Le formulaire affiche uniquement les champs du bloc sélectionné en Étape 1. Même structure flexible que F1. Les valeurs existantes sont pré-affichées pour comparaison.

## Affichage pour chaque paramètre modifié :

  --------------- ---------------------- --------------------- -----------------------------------
  **Paramètre**   **Ancienne valeur**    **Nouvelle valeur**   **Écart calculé**
  Ex: CE eau      2.5 dS/m (mars 2024)   \[ \_\_\_ \]          Calculé automatiquement par l'IA
  Ex: pH eau      7.2 (mars 2024)        \[ \_\_\_ \]          Calculé automatiquement par l'IA
  \...            \...                   \...                  \...
  --------------- ---------------------- --------------------- -----------------------------------

**ÉTAPE 3 COMPARAISON ET IMPACT IA** \[AUTOMATIQUE\]

## Affichage automatique après saisie des nouvelles valeurs :

  -------------------------------- ----------------------------------------------------------------------------------------------------------------------------
  **Élément affiché**              **Description**
  Paramètres modifiés              Liste des champs mis à jour avec ancienne → nouvelle valeur.
  Impact sur la baseline           Quelles recommandations seront recalculées. Ex: 'La stratégie hydrique et la gestion de la salinité seront recalculées.'
  Modules affectés                 Liste : Nutrition / Hydrique / Phytosanitaire --- selon ce qui change.
  Nouveau niveau de confiance      Score mis à jour. Note développeur \[DEV\] visible.
  Recalibrage partiel ou total ?   Si le changement est majeur (ex: restructuration), l'IA peut recommander un recalibrage complet.
  -------------------------------- ----------------------------------------------------------------------------------------------------------------------------

**ÉTAPE 4 VALIDATION**

  -------------------------------------- ------------------------------------------------------------------------------------
  **Action**                             **Description**
  \[ Valider le recalibrage partiel \]   La nouvelle baseline partielle est activée. L'ancienne est archivée avec sa date.
  \[ Annuler \]                          Aucune modification. Retour à la baseline existante.
  \[ Lancer un recalibrage complet \]    Si recommandé par l'IA ou voulu par l'utilisateur. Redirige vers F1.
  -------------------------------------- ------------------------------------------------------------------------------------

> ***\[DEV\] Historique des recalibrages : conserver chaque version de la baseline avec sa date, son motif, et son niveau de confiance. L'utilisateur doit pouvoir consulter l'historique depuis la fiche parcelle.***
>
> **F3 --- RECALIBRAGE ANNUEL : POST-CAMPAGNE**
>
> ℹ Ce formulaire est déclenché automatiquement par la plateforme. Il s'appuie sur toutes les tâches et données déjà enregistrées par l'utilisateur tout au long de l'année. L'objectif est de mettre à jour la baseline avec les données réelles de la campagne écoulée.

**ÉTAPE 1 DÉCLENCHEMENT --- MESSAGE AUTOMATIQUE À L'UTILISATEUR** \[AUTOMATIQUE\]

## Condition de déclenchement :

-   L'utilisateur déclare la fin de récolte dans l'application (tâche 'Récolte' marquée terminée)

-   OU une date fixe de déclenchement est atteinte (configurable par culture --- ex: 15 janvier pour l'olivier)

> 💬 Votre récolte est-elle complètement terminée sur l'ensemble de la parcelle ? Si oui, vous pouvez lancer le recalibrage annuel pour mettre à jour le profil agronomique de votre parcelle et préparer la saison suivante.

  --------------------------------------------------- -----------------------------------------------
  **Réponse utilisateur**                             **Action système**
  ✅ Oui, récolte terminée --- Lancer le recalibrage   Passer à l'Étape 2.
  ⏳ Non, pas encore terminée                          Reporter. Nouvelle notification dans 7 jours.
  Rappeler dans X jours (champ libre)                 Snooze configurable par l'utilisateur.
  --------------------------------------------------- -----------------------------------------------

**ÉTAPE 2 VÉRIFICATION DES TÂCHES ANNUELLES** \[AUTOMATIQUE\]

> ℹ L'IA parcourt automatiquement le calendrier et les tâches de l'année. Elle identifie les interventions non renseignées ou incomplètes et les soumet à l'utilisateur avant de clore la campagne.
>
> 💬 Avant de finaliser le recalibrage, nous avons détecté les éléments suivants qui n'ont pas été renseignés cette année. Souhaitez-vous les compléter maintenant ?

  -------------------------------------------------- ------------------------------------------------------------------------------------------------------------------ ---------------------------------------------
  **Type de tâche non renseignée**                   **Message affiché à l'utilisateur**                                                                               **Action**
  Application fertilisante non confirmée             'Avez-vous réalisé une application de fertilisants en \[période\] ? Si oui, renseignez la dose et le produit.'   Champ de saisie rapide ou 'Non réalisée'
  Traitement phytosanitaire non confirmé             'Avez-vous traité contre \[maladie/ravageur\] cette saison ? Si oui, renseignez le produit et la date.'          Champ de saisie rapide ou 'Non réalisé'
  Irrigation --- période sans données                'Aucune donnée d'irrigation enregistrée en \[mois\]. Était-ce voulu (arrêt saisonnier) ?'                       Confirmer arrêt / Saisir données manquantes
  Taille non renseignée                              'Avez-vous réalisé une taille cette saison ? Si oui, indiquez le type et l'intensité.'                          Champ de saisie rapide ou 'Non réalisée'
  Observation terrain manquante (période critique)   'Aucune observation terrain enregistrée pendant la floraison / nouaison. Souhaitez-vous en ajouter une ?'        Saisie libre ou 'Ignorer'
  -------------------------------------------------- ------------------------------------------------------------------------------------------------------------------ ---------------------------------------------

  ------------------------- -----------------------------------------------------------------------------------------------------------------------------
  **Réponse utilisateur**   **Action système**
  Compléter maintenant      Afficher les champs de saisie rapide pour chaque élément manquant. L'utilisateur complète puis continue.
  Ignorer et continuer      Les éléments non renseignés sont marqués 'Non confirmé' dans le bilan annuel. Impact possible sur le niveau de confiance.
  ------------------------- -----------------------------------------------------------------------------------------------------------------------------

**ÉTAPE 3 NOUVELLES ANALYSES DISPONIBLES**

> 💬 Avez-vous réalisé de nouvelles analyses cette année (sol, eau ou foliaire) dont les résultats ne sont pas encore dans le système ?

  ------------------------------ ----------------------------------------------------------------------------------------------------------
  **Réponse**                    **Action**
  Oui --- analyse sol            Afficher le formulaire flexible Bloc 3 de F1. Pré-remplir avec les valeurs existantes pour comparaison.
  Oui --- analyse eau            Afficher le formulaire flexible Bloc 4 de F1. Pré-remplir avec les valeurs existantes.
  Oui --- analyse foliaire       Afficher le formulaire flexible Bloc 5 de F1. Vérifier que le prélèvement est de juillet (sinon signal).
  Non, aucune nouvelle analyse   Passer directement à l'Étape 4.
  ------------------------------ ----------------------------------------------------------------------------------------------------------

**ÉTAPE 4 COMPARAISON AUTOMATIQUE IA --- BILAN DE CAMPAGNE** \[AUTOMATIQUE\]

> ℹ L'IA calcule automatiquement le bilan de campagne à partir de toutes les données de l'année. Aucune saisie supplémentaire requise à cette étape.

  -------------------------------------- -----------------------------------------------------------------------------------------------------------------------------
  **Élément calculé**                    **Description**
  Rendement réel vs calibré prévu        Ex: 'Rendement calibré prévu : 10--12 T/ha. Rendement réel obtenu : 20 T/ha. Écart : +67%.'
  Explication probable de l'écart       Ex: 'Combinaison année ON post-OFF sévère + amélioration régime hydrique + hiver favorable.'
  Statut alternance saison N+1           Ex: 'Après une année ON à 20 T/ha, une année OFF ou de transition est probable en N+1. Indice Haouzia : 0.22.'
  Mise à jour potentiel calibré          Si rendement réel > potentiel calibré de façon cohérente : proposition de révision du potentiel à la hausse.
  Alertes identifiées sur la campagne    Ex: 'Période juillet--août : stress hydrique détecté (NDMI < seuil alerte OLI-02). Impact estimé sur rendement : --10%.'
  Bilan biostimulants et microéléments   Interventions réalisées vs recommandées. Écart et impact probable.
  -------------------------------------- -----------------------------------------------------------------------------------------------------------------------------

**ÉTAPE 5 VALIDATION NOUVELLE BASELINE**

## Affichage avant validation finale :

  --------------------------------------- ----------------------------------------------------------------------------------------------------------
  **Élément affiché**                     **Description**
  Ancienne baseline → Nouvelle baseline   Paramètres modifiés mis en évidence. Paramètres inchangés en grisé.
  Nouveau niveau de confiance             Score mis à jour. Plus il y a de campagnes validées, plus le score augmente.
  Gain de précision                       Ex: 'Avec cette 2ème campagne validée, le modèle prédictif de rendement atteint un R² estimé de 0.55.'
  Date et motif de recalibrage            Archivé automatiquement dans l'historique de la parcelle.
  --------------------------------------- ----------------------------------------------------------------------------------------------------------

> ***\[DEV\] Niveau de confiance affiché à cette étape avec la mention : 'Ce score s'améliore automatiquement à chaque campagne validée.' Décision affichage agriculteur / technicien à confirmer avant mise en production.***
>
> ✅ Bouton principal : \[ Valider et mettre à jour la baseline \] --- la nouvelle baseline est activée. L'ancienne est archivée avec sa date.
>
> ℹ Bouton secondaire : \[ Consulter le rapport de campagne complet \] --- rapport PDF téléchargeable avec tous les indicateurs de la saison.
>
> **--- Fin des Fiches de Saisie Standardisées v1.0 --- Module Calibrage --- Février 2026 ---**
