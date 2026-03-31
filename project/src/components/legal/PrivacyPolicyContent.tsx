/**
 * Politique de confidentialité — cadre marocain (Loi n° 09-08, CNDP).
 * À valider par un conseil marocain (identifiants légaux, finalités exactes, sous-traitants).
 */
export function PrivacyPolicyContent() {
  return (
    <>
      <p className="not-prose rounded-lg border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Le présent document s&apos;applique aux traitements de données à caractère personnel mis en
        œuvre dans le cadre de la plateforme AgroGina, sous la loi marocaine n° 09-08. Il pourra être
        complété ou ajusté après avis juridique.
      </p>

      <h2 id="responsable" tabIndex={-1}>
        1. Responsable du traitement et coordonnées
      </h2>
      <p>
        Le <strong>responsable du traitement</strong> des données à caractère personnel collectées via
        AgroGina est la société <strong>CodeLovers</strong>, dont le siège social est situé à{' '}
        <strong>Casablanca, Royaume du Maroc</strong>.
      </p>
      <p>
        Pour toute question relative à cette politique ou à vos données, vous pouvez nous contacter :
      </p>
      <ul>
        <li>
          <strong>Dénomination</strong> : CodeLovers
        </li>
        <li>
          <strong>Adresse</strong> : Casablanca, Maroc
        </li>
        <li>
          <strong>Courriel</strong> :{' '}
          <a
            href="mailto:contact@agrogina.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            contact@agrogina.com
          </a>
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Les informations d&apos;immatriculation au registre du commerce (ICE, RC, etc.), lorsqu&apos;elles
        sont publiées, pourront être ajoutées ici ou communiquées sur demande conformément aux usages.
      </p>

      <h2 id="cadre-juridique" tabIndex={-1}>
        2. Cadre juridique (Loi n° 09-08 et CNDP)
      </h2>
      <p>
        Les traitements décrits ci-dessous sont régis par la{' '}
        <strong>
          loi n° 09-08 relative à la protection des personnes physiques à l&apos;égard du traitement
          des données à caractère personnel
        </strong>
        , ainsi que par les textes d&apos;application et les orientations de la{' '}
        <strong>
          Commission Nationale de Contrôle de la Protection des Données à Caractère Personnel (CNDP)
        </strong>
        .
      </p>
      <p>
        Pour plus d&apos;informations sur vos droits et les missions de la CNDP :{' '}
        <a
          href="https://www.cndp.ma"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          www.cndp.ma
        </a>
        .
      </p>
      <p>
        Lorsque la loi l&apos;exige, les traitements peuvent faire l&apos;objet d&apos;une déclaration, d&apos;une
        demande d&apos;autorisation ou d&apos;autres formalités auprès de la CNDP, selon les catégories de
        données et les finalités. AgroGina veille à respecter ces obligations dans la mesure où elles
        sont applicables à ses activités.
      </p>

      <h2 id="donnees-collectees" tabIndex={-1}>
        3. Données collectées
      </h2>
      <p>
        Nous collectons uniquement les données <strong>nécessaires</strong> aux finalités décrites
        ci-dessous. Certaines informations sont <strong>obligatoires</strong> pour créer un compte ou
        utiliser les services ; d&apos;autres sont <strong>facultatives</strong> et indiquées comme telles
        dans les formulaires.
      </p>

      <h3>3.1 Données d&apos;identification et de compte</h3>
      <ul>
        <li>Nom et prénom</li>
        <li>Adresse électronique</li>
        <li>Numéro de téléphone (lorsque renseigné)</li>
        <li>Identifiant et paramètres de compte (langue, préférences)</li>
        <li>Données relatives à l&apos;organisation (nom, rattachement des utilisateurs)</li>
      </ul>

      <h3>3.2 Données agronomiques et d&apos;exploitation</h3>
      <ul>
        <li>Localisation et caractéristiques des parcelles (dont coordonnées ou périmètres lorsque saisis)</li>
        <li>Informations sur les cultures, interventions, récoltes ou stocks agricoles</li>
        <li>Données issues d&apos;imagerie satellite ou d&apos;indices de végétation</li>
        <li>Données météorologiques ou agronomiques associées aux parcelles</li>
        <li>Données sur le cheptel, les plantations ou autres actifs biologiques lorsque enregistrés</li>
      </ul>

      <h3>3.3 Données économiques et de facturation</h3>
      <ul>
        <li>Données de facturation, comptabilité et abonnements</li>
        <li>Données relatives aux transactions effectuées via les fonctionnalités prévues sur la plateforme</li>
      </ul>

      <h3>3.4 Données techniques et de connexion</h3>
      <ul>
        <li>Adresse IP, identifiants de session, journaux techniques</li>
        <li>Type de navigateur, système d&apos;exploitation ou terminal</li>
        <li>Données de géolocalisation, <strong>uniquement avec votre consentement</strong> lorsque cette collecte est activée</li>
      </ul>

      <h2 id="finalites" tabIndex={-1}>
        4. Finalités du traitement
      </h2>
      <p>Les données sont traitées pour les finalités suivantes, de manière licite et transparente :</p>
      <ul>
        <li>Création, authentification et gestion des comptes utilisateurs et organisations</li>
        <li>Fourniture, personnalisation et amélioration des fonctionnalités d&apos;AgroGina</li>
        <li>Analyses agronomiques, recommandations et rapports liés à l&apos;activité de l&apos;exploitation</li>
        <li>Facturation, recouvrement et gestion des abonnements</li>
        <li>Notifications de service, alertes et communications relatives à l&apos;exécution du contrat</li>
        <li>Mesure d&apos;audience, statistiques agrégées ou anonymisées pour améliorer le produit</li>
        <li>Sécurité des systèmes, prévention de la fraude et respect des obligations légales</li>
        <li>Communications commerciales, le cas échéant, sous réserve de votre consentement lorsque la loi l&apos;exige</li>
      </ul>

      <h2 id="base-legale" tabIndex={-1}>
        5. Licéité du traitement (fondements prévus par la loi n° 09-08)
      </h2>
      <p>
        Chaque traitement repose sur l&apos;un des fondements applicables, notamment :
      </p>
      <ul>
        <li>
          <strong>Exécution du contrat</strong> ou mesures précontractuelles : fourniture des services
          AgroGina demandés par l&apos;utilisateur ou l&apos;organisation.
        </li>
        <li>
          <strong>Consentement</strong> : lorsque la loi l&apos;impose (par exemple géolocalisation,
          cookies non essentiels, prospection commerciale électronique lorsque requis).
        </li>
        <li>
          <strong>Obligation légale</strong> : conservation comptable, fiscalité, réponse aux réquisitions
          des autorités habilitées.
        </li>
        <li>
          <strong>Intérêt légitime</strong>, sans préjudice des droits et libertés des personnes : sécurité
          du service, lutte contre les abus, amélioration du produit dans des conditions conformes à la loi.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Les fondements exacts peuvent varier selon le type de donnée et le traitement ; votre conseil
        pourra les cartographier précisément par traitement.
      </p>

      <h2 id="conservation" tabIndex={-1}>
        6. Durée de conservation
      </h2>
      <p>
        Les données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont
        été collectées, augmentée le cas échéant des délais légaux de prescription ou d&apos;archivage.
      </p>
      <ul>
        <li>
          <strong>Compte et données d&apos;usage</strong> : pendant la durée du contrat ; après clôture,
          certaines données peuvent être conservées pour la preuve ou les obligations légales (durée
          indicative communiquée : jusqu&apos;à trois ans pour les éléments liés à la relation client,
          sauf obligation plus longue).
        </li>
        <li>
          <strong>Données agronomiques</strong> : pendant la durée du contrat ; export possible avant
          résiliation selon les fonctionnalités offertes.
        </li>
        <li>
          <strong>Facturation et comptabilité</strong> : durées imposées par la législation marocaine en
          matière comptable et fiscale (souvent jusqu&apos;à dix ans pour les pièces justificatives, sous
          réserve de mise à jour par votre expert-comptable ou avocat).
        </li>
        <li>
          <strong>Journaux et données techniques</strong> : durées limitées (par exemple douze mois pour
          certains journaux de sécurité), sauf besoin probatoire plus long.
        </li>
      </ul>

      <h2 id="destinataires" tabIndex={-1}>
        7. Destinataires, sous-traitants et communication des données
      </h2>
      <p>
        Vos données peuvent être accessibles aux personnes autorisées au sein de CodeLovers, ainsi
        qu&apos;à des <strong>prestataires agissant en tant que sous-traitants</strong> (hébergement,
        messagerie, paiement, analyse, traitement d&apos;images, etc.), dans la stricte mesure nécessaire
        à leurs missions et sur la base d&apos;instructions documentées et d&apos;engagements de
        confidentialité et de sécurité.
      </p>
      <ul>
        <li>Prestataires d&apos;hébergement et d&apos;infrastructure cloud</li>
        <li>Prestataires de services de paiement ou de facturation</li>
        <li>Partenaires techniques pour l&apos;imagerie, la météo ou l&apos;analyse de données</li>
        <li>Autorités administratives ou judiciaires, lorsque la loi l&apos;impose</li>
      </ul>
      <p>
        Nous ne vendons pas vos données à caractère personnel. Toute cession ou nouvelle catégorie de
        destinataires pourra être portée à votre connaissance conformément à la loi.
      </p>

      <h2 id="transfert" tabIndex={-1}>
        8. Transferts de données hors du territoire marocain
      </h2>
      <p>
        Certains prestataires peuvent traiter des données dans des pays situés en dehors du Maroc. Dans
        ce cas, CodeLovers s&apos;efforce de mettre en œuvre des <strong>garanties appropriées</strong>{' '}
        (clauses contractuelles, mesures organisationnelles et techniques, choix de prestataires offrant
        un niveau de protection suffisant), conformément aux exigences de la loi n° 09-08 et aux
        orientations de la CNDP.
      </p>
      <p>
        Lorsque la loi impose une <strong>autorisation préalable</strong> ou des formalités spécifiques
        pour certains transferts, celles-ci sont prises en compte dans la mesure applicable.
      </p>

      <h2 id="securite" tabIndex={-1}>
        9. Sécurité et confidentialité
      </h2>
      <p>
        Conformément aux obligations de sécurité prévues par la loi n° 09-08 et aux principes de
        confidentialité et d&apos;intégrité des données, nous mettons en œuvre des mesures techniques et organisationnelles
        appropriées au regard des risques, notamment :
      </p>
      <ul>
        <li>Chiffrement des communications (TLS) et protection des accès</li>
        <li>Authentification des utilisateurs et contrôle des habilitations (dont accès par rôles)</li>
        <li>Sauvegardes, continuité d&apos;activité et journalisation</li>
        <li>Mise à jour des correctifs et sensibilisation des personnes habilitées</li>
      </ul>

      <h2 id="droits" tabIndex={-1}>
        10. Droits des personnes concernées
      </h2>
      <p>
        Conformément à la loi n° 09-08, vous disposez notamment des droits suivants, dans les conditions
        et limites prévues par les textes en vigueur :
      </p>
      <ul>
        <li>
          <strong>Droit d&apos;information</strong> sur les traitements (dont via la présente politique et,
          le cas échéant, des mentions au moment de la collecte).
        </li>
        <li>
          <strong>Droit d&apos;accès</strong> à vos données à caractère personnel.
        </li>
        <li>
          <strong>Droit de rectification</strong> des données inexactes ou incomplètes.
        </li>
        <li>
          <strong>Droit d&apos;opposition</strong>, notamment pour des motifs légitimes, dans les cas
          prévus par la loi (y compris, le cas échéant, à la prospection commerciale).
        </li>
        <li>
          <strong>Demande de suppression ou limitation</strong> : vous pouvez demander l&apos;effacement
          ou la limitation du traitement lorsque les conditions légales sont réunies (par exemple lorsque
          les données ne sont plus nécessaires aux finalités, sous réserve des obligations légales de
          conservation).
        </li>
      </ul>
      <p>
        Pour exercer vos droits, adressez une demande à{' '}
        <a
          href="mailto:contact@agrogina.com"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          contact@agrogina.com
        </a>
        , en joignant le cas échéant une copie d&apos;une pièce d&apos;identité pour permettre de vérifier
        votre identité. Nous nous efforçons de répondre dans un délai raisonnable, et en principe dans
        les délais fixés par la loi ou les usages (souvent un mois, sous réserve de complexité ou de
        nombre de demandes).
      </p>
      <p>
        Vous pouvez introduire une <strong>réclamation</strong> auprès de la CNDP (
        <a
          href="https://www.cndp.ma"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          www.cndp.ma
        </a>
        ) si vous estimez que le traitement de vos données ne respecte pas la loi applicable.
      </p>

      <h2 id="violation" tabIndex={-1}>
        11. Violation de données
      </h2>
      <p>
        En cas de violation de données à caractère personnel susceptible d&apos;engendrer un risque pour
        vos droits et libertés, CodeLovers mettra en œuvre les mesures prévues par la loi n° 09-08 et par
        les textes d&apos;application, y compris, le cas échéant, <strong>information de la CNDP</strong>{' '}
        et <strong>notification des personnes concernées</strong> lorsque les conditions légales sont
        remplies.
      </p>

      <h2 id="cookies" tabIndex={-1}>
        12. Cookies et traceurs
      </h2>
      <p>
        La plateforme utilise des cookies et technologies similaires pour le fonctionnement du service,
        la mémorisation de vos préférences (par exemple la langue) et, avec votre accord lorsque requis,
        la mesure d&apos;audience.
      </p>
      <ul>
        <li>
          <strong>Cookies strictement nécessaires</strong> au fonctionnement et à la sécurité (session,
          authentification).
        </li>
        <li>
          <strong>Cookies de mesure d&apos;audience ou de performance</strong> : uniquement s&apos;ils sont
          déposés conformément à la loi et, le cas échéant, après consentement.
        </li>
      </ul>
      <p>
        Vous pouvez paramétrer votre navigateur pour refuser certains cookies ; le refus des cookies
        essentiels peut empêcher l&apos;utilisation normale du service.
      </p>

      <h2 id="automatisation" tabIndex={-1}>
        13. Profilage et aide à la décision
      </h2>
      <p>
        Certaines fonctionnalités peuvent proposer des <strong>recommandations</strong> ou des analyses
        agronomiques fondées sur des algorithmes. Ces traitements visent à vous assister dans la gestion
        de l&apos;exploitation et ne se substituent pas à votre jugement professionnel ni aux obligations
        réglementaires applicables à votre secteur. Vous pouvez demander des précisions sur la logique
        générale de ces traitements en nous contactant.
      </p>

      <h2 id="mineurs" tabIndex={-1}>
        14. Mineurs
      </h2>
      <p>
        Les services AgroGina s&apos;adressent à des utilisateurs professionnels ou adultes. Nous ne
        collectons pas sciemment de données relatives à des mineurs de moins de dix-huit ans. Si vous
        avez connaissance d&apos;une telle collecte, contactez-nous afin que nous puissions prendre les
        mesures appropriées.
      </p>

      <h2 id="modifications" tabIndex={-1}>
        15. Évolution de la politique
      </h2>
      <p>
        Nous pouvons modifier la présente politique pour refléter l&apos;évolution de nos pratiques ou des
        obligations légales. Les changements substantiels seront portés à votre attention par des moyens
        appropriés (notification sur la plateforme ou par courriel). La date de mise à jour figure en tête
        de cette page.
      </p>

      <h2 id="contact" tabIndex={-1}>
        16. Contact
      </h2>
      <p>Pour toute question relative à cette politique ou à vos données personnelles :</p>
      <ul>
        <li>
          <strong>CodeLovers</strong> — AgroGina
        </li>
        <li>
          <strong>Courriel</strong> :{' '}
          <a
            href="mailto:contact@agrogina.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            contact@agrogina.com
          </a>
        </li>
        <li>
          <strong>Adresse</strong> : Casablanca, Maroc
        </li>
      </ul>
    </>
  )
}
