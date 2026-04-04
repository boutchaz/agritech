
GOUVERNANCE DES RECOMMANDATIONS
Module Transversal — Toutes Cultures Arboricoles
Règles métier encadrant TOUTE recommandation émise par l’IA

Version 1.0 — Avril 2026

# TABLE DES MATIÈRES

# PARTIE 1 — PRINCIPES FONDATEURS

## 1.1 Principe de responsabilité
Règle absolue : L’IA recommande, l’exploitant décide.
L’IA est un outil d’aide à la décision. Elle analyse les données satellite, météo et historiques pour formuler des recommandations argumentées. La décision finale d’exécuter, reporter ou rejeter une recommandation appartient exclusivement à l’exploitant.
L’IA ne peut en aucun cas déclencher une action sur le terrain. Elle ne contrôle aucun actionneur (vanne d’irrigation, pompe doseuse, etc.). Même dans le cas d’une alerte urgente (🔴), la recommandation reste une proposition soumise à validation humaine.

## 1.2 Principe de transparence
Chaque recommandation doit être traçable et justifiée. L’exploitant doit pouvoir comprendre POURQUOI l’IA recommande une action. Pour cela, la structure obligatoire en 6 blocs (voir Partie 4) fournit systématiquement le constat factuel, le diagnostic, et le raisonnement qui mène à l’action proposée.
## 1.3 Principe de non-submersion
L’IA ne doit jamais submerger l’exploitant de recommandations. Un excès de recommandations conduit à l’ignorance systématique de celles-ci, ce qui dégrade la confiance dans le système. Les règles de fréquence (voir Partie 5) encadrent strictement le volume de recommandations simultanées.
## 1.4 Principe d’humilité épistémique
L’IA reconnaît ses limites. Quand les données sont insuffisantes ou ambiguës, elle le dit explicitement. Le niveau de confiance du diagnostic (⭐, ⭐⭐, ⭐⭐⭐) est toujours affiché. L’IA privilégie la demande de données complémentaires plutôt qu’une recommandation incertaine.


# PARTIE 2 — TYPES DE RECOMMANDATIONS

Le système émet deux catégories de recommandations, avec des cycles de vie distincts.
## 2.1 Recommandations RÉACTIVES
Déclenchées par une alerte satellite, météo ou un croisement de données. Elles répondent à un événement détecté en temps réel. Exemples : stress hydrique détecté par NDMI, conditions favorables œil de paon, carence azotée détectée par NDRE.
Cycle de vie : 8 états complets (voir Partie 3).
## 2.2 Recommandations PLANIFIÉES
Issues du plan annuel généré après calibrage. Elles correspondent aux interventions programmées (fertilisation de fond, traitements préventifs, taille, etc.). Elles sont rappelées à l’exploitant quand la fenêtre d’intervention approche.
Cycle de vie simplifié : 5 états — Programmée → Rappelée → Exécutée → Évaluée → Clôturée.

## 2.3 Interaction entre les deux types
Les recommandations réactives AJUSTENT le plan annuel, elles ne le remplacent pas. Quand une recommandation réactive concerne un thème déjà couvert par le plan (ex : irrigation), l’IA le signale explicitement et propose la modification du plan en conséquence.


# PARTIE 3 — CYCLE DE VIE DES RECOMMANDATIONS

## 3.1 Les 8 états du cycle de vie (Recommandations Réactives)


## 3.2 Transitions entre états


## 3.3 Cycle simplifié (Recommandations Planifiées)




# PARTIE 4 — STRUCTURE OBLIGATOIRE D’UNE RECOMMANDATION

Toute recommandation émise par l’IA, qu’elle soit réactive ou planifiée, DOIT respecter la structure en 6 blocs suivante. Aucun bloc ne peut être omis.


## 4.1 Mention de responsabilité obligatoire
Chaque recommandation doit se terminer par la mention suivante, affichée de manière distincte (encadré, italique, ou grisé) :

## 4.2 Règles de formulation
Formulation correcte : « Les indices satellite (NDMI = 0.08, < P10 depuis 2 passages) suggèrent un stress hydrique. L’hypothèse principale est un déficit d’irrigation, confirmé par le bilan hydrique négatif depuis 12 jours. Il est recommandé d’augmenter le volume d’irrigation de 30% pendant 5 jours. »
Formulation INTERDITE : « Vos oliviers manquent d’eau. Arrosez plus. »



# PARTIE 5 — RÈGLES DE FRÉQUENCE ET NON-SUBMERSION

## 5.1 Limites de recommandations actives simultanées


## 5.2 Délais minimaux entre recommandations sur un même thème


## 5.3 Règles de priorisation quand la limite est atteinte
Si le nombre maximal de recommandations actives est atteint et qu’une nouvelle recommandation doit être émise, l’IA applique les règles suivantes :
- Prioriser par niveau d’urgence : 🔴 > 🟠 > 🟡 > 🟢.
- Regrouper les recommandations liées (ex : stress hydrique + carence souvent liés) en une seule recommandation combinée.
- Reporter les recommandations 🟢 (information) à la prochaine fenêtre disponible.
- Si une 🔴 arrive et que les 3 slots sont occupés par des 🟡, la 🔴 prend la place et la 🟡 la moins urgente passe en file d’attente.



# PARTIE 6 — DURÉE DE VIE ET EXPIRATION

## 6.1 Durées d’expiration par priorité (Recommandations Réactives)


## 6.2 Durées d’expiration (Recommandations Planifiées)
Les recommandations planifiées expirent quand la fenêtre phénologique associée est dépassée (stade BBCH). Par exemple, une recommandation de bore à la floraison expire après le stade BBCH 69 (fin floraison).

## 6.3 Notification d’expiration
Quand une recommandation expire, l’IA envoie une notification discrète (pas d’alerte) : « La recommandation [type] du [date] a expiré sans suite. Elle est archivée. »


# PARTIE 7 — RÈGLES DE REJET

## 7.1 Rejet selon le niveau de priorité


## 7.2 Motifs de rejet prédéfinis
Pour faciliter la saisie, l’IA propose une liste de motifs prédéfinis, avec possibilité de saisie libre :
- Déjà réalisé (non déclaré dans l’app)
- Pas les moyens matériels/logistiques
- En désaccord avec le diagnostic
- Contrainte économique / budget insuffisant
- Intervention prévue par un autre canal (technicien, coopérative)
- Autre (champ libre)

## 7.3 Exploitation des motifs de rejet
Les motifs de rejet sont analysés par l’IA pour améliorer ses recommandations futures. Si le motif « Déjà réalisé » revient fréquemment, cela signale un problème de déclaration. Si « Budget insuffisant » revient souvent, l’IA peut proposer des alternatives moins coûteuses.


# PARTIE 8 — GESTION DE L’IGNORANCE SYSTÉMATIQUE

Approche : adaptative. L’IA ne punit pas l’exploitant qui ignore ses recommandations. Elle adapte son comportement pour rester utile et pertinente.

## 8.1 Détection de l’ignorance
L’IA comptabilise, par thème, le nombre de recommandations ayant atteint l’état EXPIRÉE sans avoir été validées ni rejetées.


## 8.2 Mode fréquence réduite
Après 3 ignorances consécutives sur un thème, l’IA passe en « mode fréquence réduite » pour ce thème :
- Les recommandations 🟡 et 🟢 sur ce thème ne sont plus émises.
- Les recommandations 🟠 sont regroupées en synthèse hebdomadaire.
- Les recommandations 🔴 URGENTES continuent normalement (jamais supprimées).
Le mode fréquence réduite se désactive automatiquement dès que l’exploitant valide ou rejette (avec motif) une recommandation sur ce thème.

## 8.3 Impact sur le bilan de campagne
Le taux de réponse aux recommandations est intégré au bilan de campagne annuel, par thème. Cela permet à l’exploitant de voir, en fin de saison, quels thèmes il a le plus ignorés et de décider s’il souhaite ajuster sa stratégie.



# PARTIE 9 — FENÊTRES D’ÉVALUATION POST-RECOMMANDATION

Après chaque recommandation exécutée, l’IA ouvre une fenêtre d’évaluation pendant laquelle elle mesure la réponse de la parcelle.

## 9.1 Délais d’évaluation par type


## 9.2 Résultats d’évaluation




# PARTIE 10 — RÈGLES DE DÉSESCALADE DES ALERTES

La désescalade définit comment une alerte de haute priorité redescend progressivement quand la situation s’améliore. Le principe d’hystérésis s’applique : les seuils de sortie sont moins stricts que les seuils d’entrée.


## 10.1 Principes généraux de désescalade


## 10.2 Schéma général de désescalade
🔴 URGENTE → [amélioration confirmée sur 2+ passages] → 🟠 PRIORITAIRE → [amélioration confirmée sur 1+ passage] → 🟡 VIGILANCE → [seuil de sortie atteint] → FIN D’ALERTE


## 10.3 Alertes irréversibles
Certaines alertes ne peuvent pas désescalader :
- OLI-06 (Verticilliose suspectée) : irréversible, reste active jusqu’à confirmation terrain.
- OLI-11 (Arbre mort) : irréversible.
- OLI-17 (Fin cycle super-intensif) : irréversible, décision stratégique requise.


# PARTIE 11 — TRAÇABILITÉ ET ARCHIVAGE

## 11.1 Journal de recommandations
Chaque recommandation génère un enregistrement complet dans le journal de la parcelle, contenant :
- Identifiant unique de la recommandation
- Type (réactive / planifiée)
- Date et heure de création
- Priorité (🔴 / 🟠 / 🟡 / 🟢)
- Contenu complet (6 blocs)
- Historique des transitions d’état avec horodatage et décideur
- Motif de rejet (si applicable)
- Résultat d’évaluation (efficace / partiel / non efficace)
- Lien avec l’alerte déclencheuse (code OLI-XX)

## 11.2 Indicateurs agrégés pour le bilan de campagne




# PARTIE 12 — SYNTHÈSE DES RÉFÉRENCES CROISÉES

Ce module est référencé par les autres documents du système aux endroits suivants :


— Fin du document Gouvernance des Recommandations v1.0 —

| ⚠ PRÉREQUIS : Ce module s’applique uniquement après activation du Moteur Opérationnel (calibrage validé). Aucune recommandation ne peut exister sans ce module. |
| --- |


| ⚠ FORMULATION OBLIGATOIRE — Toute recommandation doit contenir la mention : « Cette recommandation est basée sur l’analyse des données disponibles. La décision et la responsabilité de l’application reviennent à l’exploitant. » |
| --- |


| → Voir Moteur Opérationnel : Partie 5 — Règles d’humilité épistémique |
| --- |


| → Voir Référentiel Culture : Partie L — Plan annuel post-calibrage |
| --- |


| Situation | Comportement IA |
| --- | --- |
| Alerte stress hydrique alors que le plan prévoit irrigation dans 3 jours | Recommandation réactive : avancer l’irrigation. Mise à jour du plan. |
| Conditions œil de paon alors que traitement Cu prévu dans 10 jours | Recommandation réactive : avancer le traitement Cu préventif du plan. |
| Carence N détectée, pas de fertigation N prévue au plan | Recommandation réactive : ajout d’une application N corrective au plan. |
| Rappel fertigation prévue au plan, aucune alerte | Recommandation planifiée normale, pas de réactive. |


| État | Définition | Qui décide |
| --- | --- | --- |
| 1. PROPOSÉE | L’IA a formulé la recommandation. Elle est visible par l’exploitant mais pas encore acceptée. | IA (automatique) |
| 2. VALIDÉE | L’exploitant a accepté la recommandation. Elle entre dans son calendrier d’actions. | Exploitant |
| 3. EN ATTENTE | La recommandation est validée mais l’exécution est reportée (météo défavorable, stade non pertinent, contrainte logistique). | IA (auto) ou Exploitant |
| 4. EXÉCUTÉE | L’exploitant déclare avoir réalisé l’action. La fenêtre d’évaluation s’ouvre. | Exploitant (déclaration) ou IA (détection satellite) |
| 5. ÉVALUÉE | La fenêtre d’évaluation est terminée. L’IA a mesuré l’efficacité (efficace / partiellement / non efficace). | IA (automatique) |
| 6. CLÔTURÉE | Le cycle est terminé. La recommandation est archivée avec son bilan. | IA (automatique) |
| 7. REJETÉE | L’exploitant a refusé la recommandation. Le motif est enregistré. | Exploitant |
| 8. EXPIRÉE | La fenêtre d’intervention est passée sans action ni validation. La recommandation n’est plus applicable. | IA (automatique) |


| Transition | Condition | Décideur |
| --- | --- | --- |
| Proposée → Validée | L’exploitant accepte la recommandation | Exploitant |
| Proposée → Rejetée | L’exploitant refuse. Justification obligatoire si 🔴 URGENTE. | Exploitant |
| Proposée → Expirée | Délai d’expiration atteint sans réponse (voir Partie 6) | IA (automatique) |
| Proposée → En attente | Conditions météo défavorables ou fenêtre BBCH non pertinente | IA (automatique) |
| Validée → Exécutée | Déclaration utilisateur ou détection satellite | Exploitant ou IA |
| Validée → En attente | Report volontaire par l’exploitant | Exploitant |
| Validée → Expirée | Fenêtre d’intervention dépassée sans exécution | IA (automatique) |
| En attente → Validée | Conditions redevenues favorables | IA (notification) + Exploitant (confirmation) |
| En attente → Expirée | Fenêtre d’intervention dépassée | IA (automatique) |
| Exécutée → Évaluée | Fin de la fenêtre d’évaluation post-application | IA (automatique) |
| Évaluée → Clôturée | Bilan enregistré, archivage | IA (automatique) |


| État | Définition | Qui décide |
| --- | --- | --- |
| PROGRAMMÉE | L’action est inscrite au plan annuel validé. | IA + Exploitant (validation plan) |
| RAPPELÉE | La fenêtre d’intervention approche. L’exploitant reçoit un rappel. | IA (automatique) |
| EXÉCUTÉE | L’exploitant déclare l’action réalisée. | Exploitant |
| ÉVALUÉE | Réponse mesurée par satellite après la fenêtre d’évaluation. | IA (automatique) |
| CLÔTURÉE | Archivée avec son bilan. | IA (automatique) |


| [DEV] Implémenter une machine à états (state machine) pour chaque recommandation. Chaque transition doit être journalisée avec horodatage, décideur, et motif. Historique consultable depuis la fiche parcelle. |
| --- |


| Bloc | Contenu obligatoire | Règles de formulation |
| --- | --- | --- |
| 1. CONSTAT SPECTRAL | Valeurs des indices concernés, position vs baseline (percentile), tendance sur les derniers passages, cohérence inter-indices. | Toujours donner les valeurs numériques. Toujours comparer au percentile de référence. Mentionner le nombre de passages confirmant la tendance. |
| 2. DIAGNOSTIC | Hypothèse principale, hypothèses alternatives, facteurs concordants/discordants, niveau de confiance (⭐ à ⭐⭐⭐). | Ne JAMAIS affirmer une cause unique. Toujours présenter au moins une alternative. Si confiance ⭐ : préciser les données manquantes. |
| 3. ACTION | Type d’intervention, produit recommandé, dose/ha, méthode d’application, zone ciblée. | Dose exprimée en unité/ha. Si zone ciblée ≠ parcelle entière, préciser. Vérifier stock avant émission. |
| 4. FENÊTRE D’INTERVENTION | Niveau d’urgence (🔴/🟠/🟡/🟢), période optimale, date limite d’application. | La date limite est la date au-delà de laquelle l’action perd son efficacité. |
| 5. CONDITIONS D’APPLICATION | Température requise, humidité, vent max, restrictions (pas de pluie avant X heures, moment de la journée). | Croiser avec prévisions J+7. Si aucune fenêtre météo favorable dans les 7 jours : mettre en attente. |
| 6. SUIVI POST-APPLICATION | Fenêtre d’évaluation (délai), indicateur à surveiller, réponse attendue (ex : hausse NDRE de 5-15%). | Toujours quantifier la réponse attendue. Préciser le délai avant lequel il est inutile de vérifier. |


| ⚠ Cette recommandation est basée sur l’analyse des données disponibles (satellite, météo, historique). La décision et la responsabilité de l’application reviennent à l’exploitant. |
| --- |


| → Voir Moteur Opérationnel : Partie 8 — Formulation des recommandations |
| --- |


| Paramètre | Limite | Raison |
| --- | --- | --- |
| Recommandations RÉACTIVES actives simultanées | Maximum 3 | Au-delà, l’exploitant ne peut pas gérer. L’IA priorise par urgence. |
| Recommandations PLANIFIÉES rappelées simultanées | Maximum 2 | Pas de surcharge du calendrier hebdomadaire. |
| Total recommandations visibles (réactives + planifiées) | Maximum 5 | Seuil absolu de lisibilité de l’interface. |


| Thème | Délai minimum entre 2 recommandations | Exception |
| --- | --- | --- |
| Irrigation | 3 jours (1 passage satellite) | Alerte 🔴 stress hydrique sévère |
| Fertigation N | 10 jours | Aucune |
| Traitement phytosanitaire | 7 jours | Lessivage détecté (OLI-18) |
| Amendement sol | 30 jours | Aucune |
| Biostimulants | 7 jours | Aucune |
| Taille | 90 jours | Taille sanitaire urgente |


| ⚠ RÈGLE ABSOLUE : Une recommandation 🔴 URGENTE n’est JAMAIS reportée pour cause de limite atteinte. Elle prend toujours la priorité. |
| --- |


| Priorité | Durée de vie max | Condition d’expiration | Action à l’expiration |
| --- | --- | --- | --- |
| 🔴 URGENTE | 48-72h (fin de la fenêtre d’intervention) | Aucune action ni validation reçue dans le délai | Statut → Expirée. Alerte enregistrée dans le journal. Compteur d’ignorance incrémenté. |
| 🟠 PRIORITAIRE | 10 jours | Aucune action dans les 10 jours | Statut → Expirée. Si le signal persiste, nouvelle recommandation réémise. |
| 🟡 VIGILANCE | 5 jours (prochain passage satellite) | Signal normalisé au passage suivant | Statut → Expirée (motif : signal normalisé) ou renouvellement si signal persiste. |
| 🟢 INFORMATION | 10 jours | Information lue ou délai dépassé | Statut → Expirée. Archivage simple. |


| → Voir Référentiel Culture : Section Fenêtres d’intervention par stade BBCH |
| --- |


| Priorité | Rejet possible ? | Justification requise ? | Message affiché |
| --- | --- | --- | --- |
| 🔴 URGENTE | OUI | OUI — OBLIGATOIRE | « Vous vous apprêtez à rejeter une recommandation URGENTE. Veuillez indiquer votre motif. » |
| 🟠 PRIORITAIRE | OUI | OUI — OBLIGATOIRE | « Veuillez indiquer le motif de votre rejet. » |
| 🟡 VIGILANCE | OUI | FACULTATIVE | « Recommandation rejetée. » |
| 🟢 INFORMATION | OUI | NON | « Recommandation rejetée. » |


| Seuil | Diagnostic | Action IA |
| --- | --- | --- |
| 1 recommandation expirée | Normal — peut être un oubli | Aucune action spéciale |
| 2 recommandations expirées consécutives sur le même thème | Possible désintérêt | Notification discrète dans le tableau de bord : « 2 recommandations [thème] non traitées. » |
| 3 recommandations expirées consécutives sur le même thème | Ignorance systématique | Réduction de fréquence sur ce thème. Notification tableau de bord : « Vous avez ignoré 3 recommandations [thème] consécutives. L’IA réduira la fréquence sur ce thème. » |


| ⚠ RÈGLE : L’IA ne juge JAMAIS l’exploitant. Elle ne formule aucun reproche. Elle informe, elle adapte, elle continue de surveiller. |
| --- |


| Type de recommandation | Fenêtre d’évaluation | Indicateur surveillé | Réponse attendue |
| --- | --- | --- | --- |
| Fertigation azotée | 7-14 jours | NDRE | Hausse de 5-15% |
| Irrigation | 3-7 jours | NDMI | Hausse vers P50 |
| Amendement sol | 30-90 jours | Multiples (NDRE, GCI) | Amélioration progressive |
| Biostimulants | 5-10 jours | NIRv | Stabilisation ou hausse |
| Chélate Fe | 10-20 jours | GCI | Hausse (verdissement) |
| Traitement phyto préventif | Non applicable | Aucun signal attendu | Absence de symptômes |
| Traitement mouche (curatif) | 7 jours | Captures pièges | Baisse |


| Résultat | Critère | Action IA |
| --- | --- | --- |
| EFFICACE | Réponse attendue observée dans le délai | Clôture. Enregistrement positif. Renforce le diagnostic. |
| PARTIELLEMENT EFFICACE | Réponse inférieure à l’attendu ou plus lente | Clôture. Note d’ajustement pour la prochaine fois (dose, timing). |
| NON EFFICACE | Aucune réponse ou aggravation | Réévaluation du diagnostic. Nouvelle recommandation potentielle avec stratégie alternative. |


| → Voir Moteur Opérationnel : Partie 9 — Suivi post-recommandation, incluant la détection d’exécution par satellite |
| --- |


| [DEV] Les règles précises de désescalade (nombre de passages requis, seuils exacts par type d’alerte) seront définies par le responsable DEV en s’appuyant sur les seuils d’hystérésis déjà définis dans le Moteur Opérationnel (Partie 7.2). |
| --- |


| Principe | Description |
| --- | --- |
| Pas de désescalade sur un seul passage | Un seul passage satellite montrant une amélioration ne suffit JAMAIS à baisser le niveau d’alerte. Minimum 2 passages de confirmation. |
| Désescalade progressive | Une alerte 🔴 ne peut pas passer directement à « fin d’alerte ». Elle doit transiter par 🟠 puis 🟡 avant clôture (sauf si intervention a résolu complètement le problème). |
| Hystérésis obligatoire | Le seuil de sortie est toujours moins strict que le seuil d’entrée pour éviter les oscillations. |
| Intervention = accélérateur | Si une intervention a été réalisée ET que la réponse satellite est positive, la désescalade peut être accélérée (1 passage au lieu de 2). |


| → Voir Moteur Opérationnel : Partie 7.2 — Seuils d’entrée et de sortie (hystérésis) |
| --- |


| Indicateur | Calcul | Usage |
| --- | --- | --- |
| Taux de réponse | Recommandations (validées + rejetées) / Total émises | Mesure l’engagement de l’exploitant |
| Taux d’exécution | Recommandations exécutées / validées | Mesure le passage à l’action |
| Taux d’efficacité | Recommandations efficaces / évaluées | Mesure la pertinence de l’IA |
| Taux d’expiration | Recommandations expirées / Total émises | Alerte si trop élevé |
| Délai moyen de réponse | Moyenne (date action - date émission) | Mesure la réactivité |


| [DEV] Prévoir un dashboard parcellaire affichant ces indicateurs en temps réel, avec filtre par thème et par période. Ces données alimentent aussi le bilan de campagne annuel (F3). |
| --- |


| Document source | Section référençante | Pointe vers (ce document) |
| --- | --- | --- |
| Moteur Opérationnel | 1.3 — Lien avec la gouvernance | Ensemble du module |
| Moteur Opérationnel | 8.1 — Structure obligatoire | Partie 4 — Structure obligatoire |
| Moteur Opérationnel | 8.2 — Lien avec le module gouvernance | Partie 3 — Cycle de vie (8 états) |
| Moteur Opérationnel | 9.1 — Fenêtre d’évaluation | Partie 9 — Fenêtres d’évaluation |
| Workflow IA | Phase 8 — Formulation recommandation | Partie 4 — Structure obligatoire |
| Workflow IA | Phase 10 — Suivi et évaluation | Partie 9 — Fenêtres d’évaluation |
