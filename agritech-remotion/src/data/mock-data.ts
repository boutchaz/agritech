export const moroccanData = {
  // Morocco-specific agriculture data
  regions: [
    "Doukkala-Abda",
    "Tadla-Azilal",
    "Gharb",
    "Saïss",
    "Souss-Massa",
    "Moulouya",
    "Tafilalet",
  ],

  crops: [
    { name: "Blé tendre", hectares: 3200, yield: "2.8 t/ha", icon: "🌾" },
    { name: "Orge", hectares: 2800, yield: "2.2 t/ha", icon: "🌾" },
    { name: "Olivier", hectares: 1500, yield: "3.5 t/ha", icon: "🫒" },
    { name: "Agrumes", hectares: 800, yield: "25 t/ha", icon: "🍊" },
    { name: "Tomate", hectares: 450, yield: "60 t/ha", icon: "🍅" },
    { name: "Pastèque", hectares: 320, yield: "40 t/ha", icon: "🍉" },
  ],

  // Moroccan Dirham pricing
  pricing: [
    {
      name: "Starter",
      price: "0",
      currency: "MAD",
      period: "toujours gratuit",
      features: ["1 exploitation", "10 parcelles", "Support email", "Application mobile"],
      popular: false,
    },
    {
      name: "Pro",
      price: "290",
      currency: "MAD",
      period: "/mois",
      features: [
        "5 exploitations",
        "100 parcelles",
        "Support prioritaire 24/7",
        "API accès",
        "Mode hors ligne",
        "Multi-langue (AR/FR)",
      ],
      popular: true,
    },
    {
      name: "Coopérative",
      price: "990",
      currency: "MAD",
      period: "/mois",
      features: [
        "Exploitations illimitées",
        "Formation incluse",
        "Support dédié",
        "Intégration ORMVA",
        "Tableaux de bord personnalisés",
        "Export PDF/Excel",
      ],
      popular: false,
    },
  ],

  // Moroccan farmer names and tasks
  tasks: [
    {
      name: "Semis blé - Campagne 2024",
      assignee: "Youssef Benali",
      location: "Doukkala",
      progress: 100,
      color: "#22c55e",
      priority: "Terminé",
    },
    {
      name: "Irrigation goutte à goutte",
      assignee: "Karim Tazi",
      location: "Souss-Massa",
      progress: 78,
      color: "#3b82f6",
      priority: "En cours",
    },
    {
      name: "Récolte agrumes",
      assignee: "Hassan Berrada",
      location: "Gharb",
      progress: 45,
      color: "#f59e0b",
      priority: "En cours",
    },
    {
      name: "Traitement mildiou",
      assignee: "Fatima Zahra",
      location: "Tadla",
      progress: 20,
      color: "#ef4444",
      priority: "Urgent",
    },
  ],

  organizations: [
    { name: "Ferme Benali", location: "Doukkala-Abda", role: "Administrateur", color: "#166534" },
    { name: "Coopérative Al Haouz", location: "Marrakech", role: "Manager", color: "#3b82f6" },
    { name: "Domaine Tadla", location: "Béni Mellal", role: "Observateur", color: "#f59e0b" },
  ],

  // Value props for Moroccan farmers
  valueProps: [
    {
      icon: "📱",
      title: "Application Mobile",
      description: "Gérez vos exploitations depuis votre téléphone, même sans connexion internet",
      highlight: "Fonctionne hors-ligne",
    },
    {
      icon: "🛰️",
      title: "Images Satellite Maroc",
      description: "Données NDVI actualisées toutes les semaines pour toutes les régions du Maroc",
      highlight: "Couverture nationale",
    },
    {
      icon: "🌡️",
      title: "Alertes Météo",
      description: "Prévisions météo locales et alertes gel, canicule, sécheresse pour votre région",
      highlight: "Alertes en temps réel",
    },
    {
      icon: "💰",
      title: "Suivi des Subventions",
      description: "Intégration avec les programmes de subventions agricoles marocaines (PMV, FDA)",
      highlight: "Éligibilité automatique",
    },
    {
      icon: "📊",
      title: "Conformité ORMVA",
      description: "Rapports automatiques pour les Offices Régionaux de Mise en Valeur Agricole",
      highlight: "Rapports certifiés",
    },
    {
      icon: "🌍",
      title: "Agriculte Durable",
      description: "Suivi consommation eau et engrais pour une agriculture plus durable",
      highlight: "Économie 30% eau",
    },
  ],

  security: [
    { icon: "🔐", title: "Authentification Sécurisée", description: "Protection de vos données sensibles" },
    { icon: "👥", title: "Rôles & Permissions", description: "Contrôle d'accès granulaire par utilisateur" },
    { icon: "📊", title: "Historique Complet", description: "Traçabilité de toutes les actions" },
    { icon: "🇲🇦", title: "Hébergement Local", description: "Données stockées au Maroc" },
  ],

  trustBadges: [
    { icon: "🔒", text: "Données hébergées au Maroc" },
    { icon: "🇲🇦", text: "Conforme RGPD marocain" },
    { icon: "📧", text: "Support en Arabe & Français" },
    { icon: "🏆", text: "+500 exploitations au Maroc" },
  ],

  stats: {
    parcels: 24,
    hectares: 158,
    crops: 6,
    activeTasks: 18,
    teamMembers: 12,
    monthlyRevenue: 285000,
    pendingInvoices: 8,
    satelliteCoverage: 98,
    updateFrequencyDays: 5,
    waterSaved: 34, // percentage
    co2Reduced: 22, // percentage
  },

  revenueData: [180, 220, 195, 280, 310, 295, 340, 380, 365, 420, 445, 485], // MAD in thousands
  months: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc"],
};
