import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Action } from 'kbar';
import { CommandPalette } from './CommandPalette';

interface GlobalCommandPaletteProps {
  children: React.ReactNode;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({ children }) => {
  const navigate = useNavigate();

  const globalActions = useMemo<Action[]>(() => {
    const navigationActions: Action[] = [
      {
        id: 'go-dashboard',
        name: 'Aller au tableau de bord',
        shortcut: ['g', 'd'],
        keywords: 'dashboard accueil home tableau',
        section: 'Navigation',
        perform: () => navigate({ to: '/dashboard' }),
      },
      {
        id: 'go-analyses',
        name: 'Ouvrir les analyses',
        shortcut: ['g', 'a'],
        keywords: 'analyses soil rapport',
        section: 'Navigation',
        perform: () => navigate({ to: '/analyses' }),
      },
      {
        id: 'go-parcels',
        name: 'Voir les parcelles',
        shortcut: ['g', 'p'],
        keywords: 'parcelles champs map',
        section: 'Navigation',
        perform: () => navigate({ to: '/parcels' }),
      },
      {
        id: 'go-stock',
        name: 'Accéder au stock',
        shortcut: ['g', 's'],
        keywords: 'stock inventaire',
        section: 'Navigation',
        perform: () => navigate({ to: '/stock' }),
      },
      {
        id: 'go-infrastructure',
        name: 'Consulter les infrastructures',
        shortcut: ['g', 'i'],
        keywords: 'infrastructure irrigation équipements',
        section: 'Navigation',
        perform: () => navigate({ to: '/infrastructure' }),
      },
      {
        id: 'go-farm-hierarchy',
        name: 'Gérer les fermes',
        shortcut: ['g', 'f'],
        keywords: 'fermes farms hiérarchie hierarchy',
        section: 'Navigation',
        perform: () => navigate({ to: '/farm-hierarchy' }),
      },
      {
        id: 'go-tasks',
        name: 'Gérer les tâches',
        shortcut: ['g', 'k'],
        keywords: 'tâches tasks missions travail',
        section: 'Navigation',
        perform: () => navigate({ to: '/tasks' }),
      },
      {
        id: 'go-settings',
        name: 'Ouvrir les paramètres',
        shortcut: ['g', 't'],
        keywords: 'paramètres settings organisation',
        section: 'Navigation',
        perform: () => navigate({ to: '/settings' }),
      },
    ];

    const createActions: Action[] = [
      {
        id: 'create-parcel',
        name: 'Créer une parcelle',
        shortcut: ['c', 'p'],
        keywords: 'nouvelle parcelle create parcel new',
        section: 'Création',
        perform: () => {
          window.location.href = '/parcels?create=true';
        },
      },
      {
        id: 'create-task',
        name: 'Créer une tâche',
        shortcut: ['c', 't'],
        keywords: 'nouvelle tâche create task new',
        section: 'Création',
        perform: () => {
          window.location.href = '/tasks?create=true';
        },
      },
      {
        id: 'create-cycle',
        name: 'Créer un cycle de culture',
        shortcut: ['c', 'c'],
        keywords: 'nouveau cycle crop create',
        section: 'Création',
        perform: () => {
          window.location.href = '/crop-cycles?create=true';
        },
      },
      {
        id: 'create-stock-entry',
        name: 'Créer une entrée de stock',
        shortcut: ['c', 's'],
        keywords: 'nouvelle entrée stock create',
        section: 'Création',
        perform: () => {
          window.location.href = '/stock?tab=entries&create=true';
        },
      },
      {
        id: 'create-invoice',
        name: 'Créer une facture',
        shortcut: ['c', 'i'],
        keywords: 'nouvelle facture invoice create',
        section: 'Création',
        perform: () => {
          window.location.href = '/accounting/invoices?create=true';
        },
      },
      {
        id: 'create-worker',
        name: 'Ajouter un travailleur',
        shortcut: ['c', 'w'],
        keywords: 'nouveau travailleur worker create',
        section: 'Création',
        perform: () => {
          window.location.href = '/workers?create=true';
        },
      },
    ];

    const preferenceActions: Action[] = [
      {
        id: 'toggle-theme',
        name: 'Changer de thème',
        shortcut: ['t'],
        keywords: 'theme mode sombre clair dark light',
        section: 'Préférences',
        perform: () => {
          document.documentElement.classList.toggle('dark');
        },
      },
    ];

    return [...navigationActions, ...createActions, ...preferenceActions];
  }, [navigate]);

  return <CommandPalette actions={globalActions}>{children}</CommandPalette>;
};
