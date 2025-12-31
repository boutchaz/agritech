import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { supabase } from '@/lib/supabase';

export type TourId = 
  | 'welcome'
  | 'full-app'
  | 'dashboard'
  | 'farm-management'
  | 'parcels'
  | 'tasks'
  | 'workers'
  | 'inventory'
  | 'harvests'
  | 'infrastructure'
  | 'billing'
  | 'accounting'
  | 'satellite'
  | 'reports'
  | 'settings';

interface TourState {
  completedTours: TourId[];
  currentTour: TourId | null;
  isRunning: boolean;
  stepIndex: number;
}

interface TourContextValue {
  startTour: (tourId: TourId) => void;
  endTour: () => void;
  completedTours: TourId[];
  isRunning: boolean;
  currentTour: TourId | null;
  isTourCompleted: (tourId: TourId) => boolean;
  resetTour: (tourId: TourId) => Promise<void>;
  resetAllTours: () => Promise<void>;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const TOUR_STORAGE_KEY = 'agritech_completed_tours';

const tourStyles = {
  options: {
    primaryColor: '#059669',
    zIndex: 10000,
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    textColor: '#374151',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  buttonNext: {
    backgroundColor: '#059669',
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
  },
  buttonBack: {
    color: '#6b7280',
    marginRight: '0.5rem',
  },
  buttonSkip: {
    color: '#9ca3af',
  },
};

const TOUR_DEFINITIONS: Record<TourId, Step[]> = {
  welcome: [
    {
      target: 'body',
      placement: 'center',
      title: 'Bienvenue sur AgriTech! 🌾',
      content: 'Découvrez comment gérer efficacement votre exploitation agricole. Cette visite guidée vous présentera les principales fonctionnalités de la plateforme.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      title: 'Navigation principale',
      content: 'Utilisez ce menu pour accéder à toutes les sections de l\'application : fermes, parcelles, tâches, stock, comptabilité et plus encore.',
      placement: 'right',
    },
    {
      target: '[data-tour="org-switcher"]',
      title: 'Changement d\'organisation',
      content: 'Si vous gérez plusieurs exploitations, vous pouvez facilement basculer entre elles ici.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="user-menu"]',
      title: 'Votre profil',
      content: 'Accédez à vos paramètres, préférences et options de déconnexion depuis ce menu.',
      placement: 'bottom-end',
    },
  ],
  'full-app': [
    {
      target: 'body',
      placement: 'center',
      title: 'Tour complet de l\'application 🌾',
      content: 'Découvrez toutes les fonctionnalités d\'AgriTech en une visite guidée complète. Nous allons parcourir chaque module de la plateforme.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      title: '1. Navigation principale',
      content: 'Le menu latéral vous donne accès à tous les modules : tableau de bord, fermes, parcelles, tâches, personnel, stock, récoltes, comptabilité, analyses satellite et rapports.',
      placement: 'right',
    },
    {
      target: '[data-tour="org-switcher"]',
      title: '2. Multi-organisation',
      content: 'AgriTech est multi-tenant. Gérez plusieurs exploitations agricoles depuis un seul compte et basculez facilement entre elles.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-stats"]',
      title: '3. Tableau de bord',
      content: 'Votre centre de commande. Visualisez les statistiques clés, les tâches urgentes, la météo et l\'état de santé de vos cultures en un coup d\'œil.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="farm-list"]',
      title: '4. Gestion des fermes',
      content: 'Organisez vos exploitations en fermes et sous-fermes. Chaque ferme peut contenir plusieurs parcelles avec leurs propres cultures.',
      placement: 'right',
    },
    {
      target: '[data-tour="parcel-list"]',
      title: '5. Parcelles',
      content: 'Définissez vos parcelles avec leurs limites géographiques, types de sol, systèmes d\'irrigation et cultures. Les parcelles sont la base de votre production.',
      placement: 'right',
    },
    {
      target: '[data-tour="task-list"]',
      title: '6. Gestion des tâches',
      content: 'Planifiez toutes vos activités agricoles : irrigation, fertilisation, traitements, récoltes. Assignez les tâches à votre équipe et suivez leur progression.',
      placement: 'right',
    },
    {
      target: '[data-tour="worker-list"]',
      title: '7. Personnel',
      content: 'Gérez votre équipe : employés permanents, ouvriers journaliers et métayers. Suivez leurs heures, calculez leurs salaires et gérez les paiements.',
      placement: 'right',
    },
    {
      target: '[data-tour="stock-overview"]',
      title: '8. Inventaire',
      content: 'Suivez votre stock d\'intrants : semences, engrais, produits phytosanitaires, équipements. Recevez des alertes de stock bas.',
      placement: 'right',
    },
    {
      target: '[data-tour="harvest-list"]',
      title: '9. Récoltes',
      content: 'Enregistrez vos récoltes avec la date, quantité, qualité et destination. Suivez la traçabilité de votre production de la parcelle à la vente.',
      placement: 'right',
    },
    {
      target: '[data-tour="infrastructure-list"]',
      title: '10. Infrastructures',
      content: 'Gérez vos bâtiments, puits, bassins, stations de pompage et autres équipements. Suivez leur maintenance et leur utilisation.',
      placement: 'right',
    },
    {
      target: '[data-tour="billing-quotes"]',
      title: '11. Facturation',
      content: 'Créez des devis, bons de commande et factures. Gérez vos clients et fournisseurs. Suivez les paiements et les créances.',
      placement: 'right',
    },
    {
      target: '[data-tour="accounting-overview"]',
      title: '12. Comptabilité',
      content: 'Comptabilité en partie double adaptée à l\'agriculture. Plan comptable agricole, journaux, bilan et compte de résultat.',
      placement: 'right',
    },
    {
      target: '[data-tour="satellite-map"]',
      title: '13. Analyses satellite',
      content: 'Visualisez la santé de vos cultures avec les images satellite. Indices NDVI, NDWI et détection précoce des problèmes.',
      placement: 'left',
    },
    {
      target: '[data-tour="reports-list"]',
      title: '14. Rapports',
      content: 'Générez des rapports détaillés : production par parcelle, rentabilité, main d\'œuvre, consommation d\'intrants. Exportez en PDF ou Excel.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings-menu"]',
      title: '15. Paramètres',
      content: 'Configurez votre organisation, gérez les utilisateurs et leurs rôles, personnalisez les modules actifs et les préférences.',
      placement: 'left',
    },
    {
      target: 'body',
      placement: 'center',
      title: 'Prêt à commencer! 🚀',
      content: 'Vous avez maintenant une vue d\'ensemble de toutes les fonctionnalités. Cliquez sur le bouton d\'aide (?) en bas à droite pour revoir cette visite ou accéder aux guides de chaque module.',
      disableBeacon: true,
    },
  ],
  dashboard: [
    {
      target: '[data-tour="dashboard-stats"]',
      title: 'Statistiques clés',
      content: 'Visualisez en un coup d\'œil les métriques importantes de votre exploitation : superficie, récoltes, revenus et tâches en cours.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-tasks"]',
      title: 'Tâches récentes',
      content: 'Suivez les tâches urgentes et leur progression directement depuis le tableau de bord.',
      placement: 'left',
    },
    {
      target: '[data-tour="dashboard-weather"]',
      title: 'Météo',
      content: 'Consultez les prévisions météo pour planifier vos activités agricoles.',
      placement: 'left',
    },
    {
      target: '[data-tour="dashboard-parcels"]',
      title: 'Aperçu des parcelles',
      content: 'Visualisez l\'état de santé de vos cultures grâce aux indices satellite.',
      placement: 'top',
    },
  ],
  'farm-management': [
    {
      target: '[data-tour="farm-list"]',
      title: 'Vos fermes',
      content: 'Gérez toutes vos exploitations agricoles depuis cette vue. Chaque ferme peut contenir plusieurs parcelles.',
      placement: 'right',
    },
    {
      target: '[data-tour="add-farm"]',
      title: 'Ajouter une ferme',
      content: 'Cliquez ici pour créer une nouvelle ferme et définir ses caractéristiques : nom, localisation, superficie, type de sol, etc.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="farm-map"]',
      title: 'Vue cartographique',
      content: 'Visualisez vos fermes et parcelles sur la carte. Vous pouvez dessiner les limites de vos parcelles directement sur la carte.',
      placement: 'left',
    },
  ],
  parcels: [
    {
      target: '[data-tour="parcel-list"]',
      title: 'Liste des parcelles',
      content: 'Toutes vos parcelles sont affichées ici avec leurs cultures actuelles, superficies et états de santé.',
      placement: 'right',
    },
    {
      target: '[data-tour="parcel-filters"]',
      title: 'Filtres',
      content: 'Filtrez vos parcelles par culture, ferme ou état pour trouver rapidement ce que vous cherchez.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="parcel-actions"]',
      title: 'Actions rapides',
      content: 'Accédez rapidement aux analyses satellite, à la météo, aux tâches et à la rentabilité de chaque parcelle.',
      placement: 'left',
    },
  ],
  tasks: [
    {
      target: '[data-tour="task-list"]',
      title: 'Gestion des tâches',
      content: 'Planifiez et suivez toutes les tâches agricoles : irrigation, fertilisation, récolte, traitements, etc.',
      placement: 'right',
    },
    {
      target: '[data-tour="task-calendar"]',
      title: 'Vue calendrier',
      content: 'Visualisez vos tâches sur un calendrier pour mieux planifier vos activités.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="task-create"]',
      title: 'Créer une tâche',
      content: 'Créez de nouvelles tâches, assignez-les à des ouvriers et définissez des priorités et des échéances.',
      placement: 'bottom',
    },
  ],
  workers: [
    {
      target: '[data-tour="worker-list"]',
      title: 'Gestion des ouvriers',
      content: 'Gérez votre équipe : ouvriers permanents, journaliers, et métayers. Suivez leurs paiements et performances.',
      placement: 'right',
    },
    {
      target: '[data-tour="worker-payments"]',
      title: 'Paiements',
      content: 'Calculez automatiquement les salaires basés sur le temps travaillé, les tâches effectuées ou le travail à la pièce.',
      placement: 'left',
    },
    {
      target: '[data-tour="worker-add"]',
      title: 'Ajouter un ouvrier',
      content: 'Enregistrez de nouveaux membres de votre équipe avec leurs informations et modalités de paiement.',
      placement: 'bottom',
    },
  ],
  inventory: [
    {
      target: '[data-tour="stock-overview"]',
      title: 'Aperçu du stock',
      content: 'Visualisez l\'état de votre inventaire : produits en stock, niveaux bas, et valeur totale.',
      placement: 'right',
    },
    {
      target: '[data-tour="stock-items"]',
      title: 'Catalogue d\'articles',
      content: 'Gérez votre catalogue de produits : intrants, engrais, semences, équipements, etc.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="stock-warehouses"]',
      title: 'Entrepôts',
      content: 'Organisez votre stock par entrepôt et suivez les mouvements entre sites.',
      placement: 'left',
    },
    {
      target: '[data-tour="stock-movements"]',
      title: 'Mouvements de stock',
      content: 'Enregistrez les entrées, sorties et transferts de stock avec traçabilité complète.',
      placement: 'top',
    },
  ],
  accounting: [
    {
      target: '[data-tour="accounting-overview"]',
      title: 'Comptabilité',
      content: 'Gérez toute votre comptabilité agricole : factures, paiements, journaux et rapports financiers.',
      placement: 'right',
    },
    {
      target: '[data-tour="accounting-invoices"]',
      title: 'Factures',
      content: 'Créez et gérez vos factures clients et fournisseurs. Suivez les paiements et les créances.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="accounting-journal"]',
      title: 'Journal comptable',
      content: 'Enregistrez vos écritures comptables en partie double selon le plan comptable agricole.',
      placement: 'left',
    },
    {
      target: '[data-tour="accounting-reports"]',
      title: 'Rapports financiers',
      content: 'Générez des rapports : bilan, compte de résultat, balance des comptes, et analyses de rentabilité.',
      placement: 'top',
    },
  ],
  satellite: [
    {
      target: '[data-tour="satellite-map"]',
      title: 'Analyse satellite',
      content: 'Visualisez la santé de vos cultures grâce aux images satellite. Les indices NDVI, NDWI et autres vous aident à détecter les problèmes.',
      placement: 'left',
    },
    {
      target: '[data-tour="satellite-indices"]',
      title: 'Indices de végétation',
      content: 'Comparez différents indices pour comprendre l\'état de vos cultures : stress hydrique, vigueur végétative, etc.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="satellite-timeline"]',
      title: 'Historique',
      content: 'Naviguez dans le temps pour voir l\'évolution de vos parcelles et détecter les tendances.',
      placement: 'top',
    },
  ],
  reports: [
    {
      target: '[data-tour="reports-list"]',
      title: 'Rapports',
      content: 'Accédez à tous vos rapports : production, finances, main d\'œuvre, et analyses de rentabilité.',
      placement: 'right',
    },
    {
      target: '[data-tour="reports-export"]',
      title: 'Export',
      content: 'Exportez vos rapports en PDF ou Excel pour les partager ou les archiver.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="reports-filters"]',
      title: 'Filtres et périodes',
      content: 'Personnalisez vos rapports en filtrant par période, ferme, parcelle ou type de culture.',
      placement: 'left',
    },
  ],
  harvests: [
    {
      target: '[data-tour="harvest-stats"]',
      title: 'Statistiques de récolte',
      content: 'Visualisez le résumé de vos récoltes : quantités totales, valeur estimée, répartition par culture.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="harvest-list"]',
      title: 'Liste des récoltes',
      content: 'Toutes vos récoltes sont listées ici avec la date, parcelle, culture, quantité et qualité.',
      placement: 'right',
    },
    {
      target: '[data-tour="harvest-add"]',
      title: 'Nouvelle récolte',
      content: 'Enregistrez une nouvelle récolte en spécifiant la parcelle, la quantité récoltée et la qualité du produit.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="harvest-filters"]',
      title: 'Filtres',
      content: 'Filtrez vos récoltes par période, ferme, culture ou statut pour retrouver rapidement les informations.',
      placement: 'left',
    },
  ],
  infrastructure: [
    {
      target: '[data-tour="infrastructure-list"]',
      title: 'Vos infrastructures',
      content: 'Gérez tous vos bâtiments et équipements : puits, bassins, stations de pompage, hangars, bureaux.',
      placement: 'right',
    },
    {
      target: '[data-tour="infrastructure-add"]',
      title: 'Ajouter une infrastructure',
      content: 'Créez de nouvelles infrastructures avec leur type, localisation, capacité et date de mise en service.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="infrastructure-maintenance"]',
      title: 'Maintenance',
      content: 'Planifiez et suivez la maintenance de vos équipements pour éviter les pannes et optimiser leur durée de vie.',
      placement: 'left',
    },
  ],
  billing: [
    {
      target: '[data-tour="billing-stats"]',
      title: 'Aperçu facturation',
      content: 'Visualisez le résumé de votre facturation : devis en cours, commandes à livrer, factures à encaisser.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="billing-quotes"]',
      title: 'Devis',
      content: 'Créez des devis professionnels pour vos clients. Suivez leur statut : envoyé, accepté, converti en commande.',
      placement: 'right',
    },
    {
      target: '[data-tour="billing-orders"]',
      title: 'Bons de commande',
      content: 'Gérez vos commandes clients et fournisseurs. Suivez les livraisons et les réceptions.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="billing-invoices"]',
      title: 'Factures',
      content: 'Émettez des factures et suivez les paiements. Gérez les relances et les créances clients.',
      placement: 'left',
    },
    {
      target: '[data-tour="billing-customers"]',
      title: 'Clients et fournisseurs',
      content: 'Gérez votre carnet d\'adresses : clients, fournisseurs, transporteurs avec leurs coordonnées et historique.',
      placement: 'top',
    },
  ],
  settings: [
    {
      target: '[data-tour="settings-menu"]',
      title: 'Paramètres',
      content: 'Accédez à tous les paramètres de votre organisation depuis ce menu.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings-organization"]',
      title: 'Organisation',
      content: 'Configurez les informations de votre exploitation : nom, adresse, logo, devise et année fiscale.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings-users"]',
      title: 'Utilisateurs',
      content: 'Gérez les membres de votre équipe, leurs rôles et permissions d\'accès à la plateforme.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings-subscription"]',
      title: 'Abonnement',
      content: 'Consultez votre formule actuelle, les fonctionnalités incluses et passez à un plan supérieur si besoin.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings-modules"]',
      title: 'Modules',
      content: 'Activez ou désactivez les modules selon vos besoins : comptabilité, satellite, métayage, etc.',
      placement: 'right',
    },
    {
      target: '[data-tour="settings-preferences"]',
      title: 'Préférences',
      content: 'Personnalisez votre expérience : langue, thème, format de date, notifications.',
      placement: 'left',
    },
  ],
};

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [tourState, setTourState] = useState<TourState>({
    completedTours: [],
    currentTour: null,
    isRunning: false,
    stepIndex: 0,
  });

  useEffect(() => {
    loadCompletedTours();
  }, [user?.id]);

  const loadCompletedTours = async () => {
    if (!user) {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (stored) {
        try {
          setTourState(prev => ({ ...prev, completedTours: JSON.parse(stored) }));
        } catch {
          console.error('Failed to parse stored tours');
        }
      }
      return;
    }

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('completed_tours')
        .eq('id', user.id)
        .single();

      if (data?.completed_tours) {
        setTourState(prev => ({ ...prev, completedTours: data.completed_tours as TourId[] }));
      }
    } catch (error) {
      console.error('Failed to load completed tours:', error);
    }
  };

  const saveCompletedTours = async (tours: TourId[]) => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tours));

    if (user) {
      try {
        await supabase
          .from('user_profiles')
          .update({ completed_tours: tours })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to save completed tours:', error);
      }
    }
  };

  const startTour = useCallback((tourId: TourId) => {
    setTourState(prev => ({
      ...prev,
      currentTour: tourId,
      isRunning: true,
      stepIndex: 0,
    }));
  }, []);

  const endTour = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      currentTour: null,
      isRunning: false,
      stepIndex: 0,
    }));
  }, []);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index } = data;

    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      setTourState(prev => ({ ...prev, stepIndex: index + 1 }));
    }

    if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
      setTourState(prev => ({ ...prev, stepIndex: index - 1 }));
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      const { currentTour, completedTours } = tourState;
      
      if (currentTour && status === STATUS.FINISHED && !completedTours.includes(currentTour)) {
        const newCompletedTours = [...completedTours, currentTour];
        setTourState(prev => ({
          ...prev,
          completedTours: newCompletedTours,
          currentTour: null,
          isRunning: false,
          stepIndex: 0,
        }));
        saveCompletedTours(newCompletedTours);
      } else {
        endTour();
      }
    }
  }, [tourState, endTour]);

  const isTourCompleted = useCallback((tourId: TourId) => {
    return tourState.completedTours.includes(tourId);
  }, [tourState.completedTours]);

  const resetTour = useCallback(async (tourId: TourId) => {
    const newCompletedTours = tourState.completedTours.filter(t => t !== tourId);
    setTourState(prev => ({ ...prev, completedTours: newCompletedTours }));
    await saveCompletedTours(newCompletedTours);
  }, [tourState.completedTours]);

  const resetAllTours = useCallback(async () => {
    setTourState(prev => ({ ...prev, completedTours: [] }));
    await saveCompletedTours([]);
  }, []);

  const currentSteps = tourState.currentTour ? TOUR_DEFINITIONS[tourState.currentTour] : [];

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        completedTours: tourState.completedTours,
        isRunning: tourState.isRunning,
        currentTour: tourState.currentTour,
        isTourCompleted,
        resetTour,
        resetAllTours,
      }}
    >
      {children}
      <Joyride
        steps={currentSteps}
        run={tourState.isRunning}
        stepIndex={tourState.stepIndex}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        spotlightClicks
        disableOverlayClose
        callback={handleJoyrideCallback}
        styles={tourStyles}
        locale={{
          back: 'Précédent',
          close: 'Fermer',
          last: 'Terminer',
          next: 'Suivant',
          open: 'Ouvrir',
          skip: 'Passer',
        }}
        floaterProps={{
          hideArrow: false,
        }}
      />
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextValue => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};

export const useAutoStartTour = (tourId: TourId, delay: number = 1000) => {
  const { startTour, isTourCompleted, isRunning } = useTour();

  useEffect(() => {
    if (!isTourCompleted(tourId) && !isRunning) {
      const timer = setTimeout(() => {
        startTour(tourId);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [tourId, startTour, isTourCompleted, isRunning, delay]);
};
