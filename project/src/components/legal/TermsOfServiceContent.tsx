export function TermsOfServiceContent() {
  return (
    <>
      <div className="not-prose mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">En bref</p>
          <p className="mt-1 text-sm text-foreground">
            Ces CGU définissent les règles d’accès et d’utilisation d’AgroGina, ainsi que les responsabilités de
            l’Éditeur et des Utilisateurs.
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Points clés</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Compte</span> : vous êtes responsable de vos identifiants.
            </li>
            <li>
              <span className="font-medium text-foreground">Données</span> : vous restez propriétaire de vos données.
            </li>
            <li>
              <span className="font-medium text-foreground">Recommandations</span> : informations indicatives, pas un avis professionnel.
            </li>
          </ul>
        </div>
      </div>

      <h2 id="objet" tabIndex={-1} className="not-prose mt-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        1. Objet
      </h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir
        les modalités et conditions d'utilisation de la plateforme AgroGina (ci-après « la Plateforme »),
        éditée par la société CodeLovers (ci-après « l'Éditeur »), ainsi que les droits et obligations
        des utilisateurs (ci-après « l'Utilisateur »).
      </p>
      <p>
        L'accès et l'utilisation de la Plateforme impliquent l'acceptation sans réserve des présentes CGU.
      </p>

      <h2 id="definitions" tabIndex={-1}>
        2. Définitions
      </h2>
      <div className="not-prose mt-4 grid gap-3 rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-background/70 p-3">
            <dt className="text-sm font-semibold text-foreground">Plateforme</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Application web et mobile AgroGina accessible à l’adresse <span className="font-medium text-foreground">app.agrogina.com</span>.
            </dd>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/70 p-3">
            <dt className="text-sm font-semibold text-foreground">Utilisateur</dt>
            <dd className="mt-1 text-sm text-muted-foreground">Toute personne physique ou morale inscrite sur la Plateforme.</dd>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/70 p-3">
            <dt className="text-sm font-semibold text-foreground">Organisation</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Entité (exploitation agricole, coopérative, entreprise) créée par l’Utilisateur sur la Plateforme.
            </dd>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/70 p-3">
            <dt className="text-sm font-semibold text-foreground">Services</dt>
            <dd className="mt-1 text-sm text-muted-foreground">Ensemble des fonctionnalités proposées par la Plateforme.</dd>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/70 p-3 sm:col-span-2">
            <dt className="text-sm font-semibold text-foreground">Contenu</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Toute donnée, texte, image ou fichier téléchargé par l’Utilisateur.
            </dd>
          </div>
        </dl>
      </div>

      <h2 id="inscription-compte" tabIndex={-1}>
        3. Inscription et Compte
      </h2>
      <p>
        L'utilisation de la Plateforme nécessite la création d'un compte. L'Utilisateur s'engage à fournir
        des informations exactes et à jour lors de son inscription. L'Utilisateur est responsable de la
        confidentialité de ses identifiants de connexion et de toute activité effectuée depuis son compte.
      </p>
      <p>
        L'Éditeur se réserve le droit de suspendre ou de supprimer tout compte en cas de violation
        des présentes CGU.
      </p>

      <h2 id="services" tabIndex={-1}>
        4. Description des Services
      </h2>
      <p>La Plateforme AgroGina propose les services suivants :</p>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
        {[
          "Gestion d'exploitations agricoles et de parcelles",
          'Suivi des cultures et des récoltes',
          'Planification et gestion des tâches agricoles',
          "Analyse d'imagerie satellite (indices NDVI, NDRE, SAVI)",
          'Gestion comptable et facturation',
          'Gestion des ressources humaines agricoles',
          'Place de marché pour la vente de produits agricoles',
          'Suivi météorologique',
        ].map((item) => (
          <div key={item} className="rounded-lg border border-border/80 bg-background/70 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item}</span>
          </div>
        ))}
      </div>
      <p>
        L'Éditeur se réserve le droit de modifier, d'ajouter ou de supprimer des fonctionnalités
        à tout moment, sans préavis.
      </p>

      <h2 id="donnees-propriete" tabIndex={-1}>
        5. Données et Propriété
      </h2>
      <p>
        L'Utilisateur conserve la propriété de toutes les données qu'il saisit sur la Plateforme.
        L'Éditeur s'engage à ne pas utiliser les données de l'Utilisateur à des fins commerciales
        autres que la fourniture des Services.
      </p>
      <p>
        L'Utilisateur accorde à l'Éditeur une licence non exclusive pour héberger, stocker et
        traiter ses données dans le cadre strict de la fourniture des Services.
      </p>

      <h2 id="obligations" tabIndex={-1}>
        6. Obligations de l'Utilisateur
      </h2>
      <p>L'Utilisateur s'engage à :</p>
      <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
        {[
          'Utiliser la Plateforme conformément à sa destination et aux lois en vigueur',
          "Ne pas tenter d'accéder de manière non autorisée aux systèmes de la Plateforme",
          'Ne pas diffuser de contenu illicite, offensant ou portant atteinte aux droits de tiers',
          "Respecter les droits de propriété intellectuelle de l'Éditeur et des tiers",
          'Ne pas utiliser la Plateforme à des fins de concurrence déloyale',
        ].map((item) => (
          <div key={item} className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm text-muted-foreground">
            {item}
          </div>
        ))}
      </div>

      <h2 id="propriete-intellectuelle" tabIndex={-1}>
        7. Propriété Intellectuelle
      </h2>
      <p>
        La Plateforme, son architecture, son design, ses algorithmes, son code source et l'ensemble
        de ses éléments sont la propriété exclusive de l'Éditeur. Toute reproduction, représentation
        ou exploitation non autorisée est strictement interdite.
      </p>

      <h2 id="abonnements" tabIndex={-1}>
        8. Abonnements et Paiement
      </h2>
      <p>
        Certains Services sont accessibles via un abonnement payant. Les tarifs en vigueur sont
        disponibles sur la Plateforme. L'Éditeur se réserve le droit de modifier ses tarifs avec
        un préavis de 30 jours.
      </p>
      <p>
        En cas de non-paiement, l'Éditeur se réserve le droit de suspendre l'accès aux Services
        concernés après mise en demeure restée infructueuse.
      </p>

      <h2 id="responsabilite" tabIndex={-1}>
        9. Responsabilité
      </h2>
      <p>
        La Plateforme est fournie « en l'état ». L'Éditeur met en œuvre les moyens raisonnables
        pour assurer la disponibilité et la fiabilité des Services, mais ne saurait être tenu
        responsable en cas de :
      </p>
      <ul>
        <li>Interruptions temporaires pour maintenance ou mises à jour</li>
        <li>Dommages résultant de l'utilisation ou de l'impossibilité d'utiliser la Plateforme</li>
        <li>Pertes de données dues à des circonstances indépendantes de sa volonté</li>
        <li>Décisions agricoles prises sur la base des données fournies par la Plateforme</li>
      </ul>
      <p>
        Les informations fournies par la Plateforme (données satellite, recommandations, analyses)
        sont données à titre indicatif et ne sauraient se substituer à l'expertise d'un professionnel.
      </p>

      <h2 id="donnees-personnelles" tabIndex={-1}>
        10. Protection des Données Personnelles
      </h2>
      <p>
        Le traitement des données personnelles est régi par notre Politique de Confidentialité,
        accessible depuis la Plateforme. L'Éditeur s'engage à respecter la législation marocaine
        en matière de protection des données personnelles (Loi n° 09-08).
      </p>

      <h2 id="resiliation" tabIndex={-1}>
        11. Résiliation
      </h2>
      <p>
        L'Utilisateur peut résilier son compte à tout moment depuis les paramètres de la Plateforme.
        En cas de violation des présentes CGU, l'Éditeur se réserve le droit de résilier le compte
        de l'Utilisateur sans préavis ni indemnité.
      </p>
      <p>
        En cas de résiliation, l'Utilisateur peut demander l'export de ses données dans un délai
        de 30 jours suivant la résiliation.
      </p>

      <h2 id="droit-applicable" tabIndex={-1}>
        12. Droit Applicable et Juridiction
      </h2>
      <p>
        Les présentes CGU sont régies par le droit marocain. Tout litige relatif à l'interprétation
        ou à l'exécution des présentes sera soumis aux tribunaux compétents de Casablanca, Maroc.
      </p>

      <h2 id="contact" tabIndex={-1}>
        13. Contact
      </h2>
      <p>
        Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse suivante :
      </p>
      <ul>
        <li><strong>Société</strong> : CodeLovers</li>
        <li><strong>Email</strong> : contact@agrogina.com</li>
        <li><strong>Adresse</strong> : Casablanca, Maroc</li>
      </ul>
    </>
  )
}
