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
        id: 'go-settings',
        name: 'Ouvrir les paramètres',
        shortcut: ['g', 't'],
        keywords: 'paramètres settings organisation',
        section: 'Navigation',
        perform: () => navigate({ to: '/settings' }),
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

    return [...navigationActions, ...preferenceActions];
  }, [navigate]);

  return <CommandPalette actions={globalActions}>{children}</CommandPalette>;
};
