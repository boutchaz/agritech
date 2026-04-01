import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useHotkey, useHotkeyRegistrations } from '@tanstack/react-hotkeys';
import { useTranslation } from 'react-i18next';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  FlaskConical,
  MapPin,
  Package,
  Wrench,
  Settings,
  Plus,
  ListTodo,
  Sprout,
  FileText,
  Users,
  Sun,
  Keyboard,
} from 'lucide-react';

interface GlobalCommandPaletteProps {
  children: React.ReactNode;
}

interface CommandAction {
  id: string;
  labelKey: string;
  labelFallback: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  keywords: string[];
  onSelect: () => void;
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({ children }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const { hotkeys } = useHotkeyRegistrations();

  // Listen for programmatic toggle from useCommandPaletteToggle()
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener('toggle-command-palette', handler);
    return () => window.removeEventListener('toggle-command-palette', handler);
  }, []);

  useHotkey('Mod+K', () => setOpen((prev) => !prev), {
    meta: { name: t('keyboardShortcuts', 'Keyboard shortcuts'), description: 'Toggle command palette' },
  });

  const handleSelect = useCallback(
    (action: () => void) => {
      setOpen(false);
      action();
    },
    [],
  );

  const navActions: CommandAction[] = useMemo(
    () => [
      {
        id: 'go-dashboard',
        labelKey: 'dashboard.commands.navigation.dashboard',
        labelFallback: 'Go to dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
        shortcut: ['g', 'd'],
        keywords: ['dashboard', 'home', 'tableau'],
        onSelect: () => navigate({ to: '/dashboard' }),
      },
      {
        id: 'go-analyses',
        labelKey: 'dashboard.commands.navigation.analyses',
        labelFallback: 'Open analyses',
        icon: <FlaskConical className="h-4 w-4" />,
        shortcut: ['g', 'a'],
        keywords: ['analyses', 'soil', 'rapport'],
        onSelect: () => navigate({ to: '/analyses' }),
      },
      {
        id: 'go-parcels',
        labelKey: 'dashboard.commands.navigation.parcels',
        labelFallback: 'View parcels',
        icon: <MapPin className="h-4 w-4" />,
        shortcut: ['g', 'p'],
        keywords: ['parcelles', 'champs', 'map'],
        onSelect: () => navigate({ to: '/parcels' }),
      },
      {
        id: 'go-stock',
        labelKey: 'dashboard.commands.navigation.stock',
        labelFallback: 'Access stock',
        icon: <Package className="h-4 w-4" />,
        shortcut: ['g', 's'],
        keywords: ['stock', 'inventaire'],
        onSelect: () => navigate({ to: '/stock' }),
      },
      {
        id: 'go-infrastructure',
        labelKey: 'dashboard.commands.navigation.infrastructure',
        labelFallback: 'View infrastructure',
        icon: <Wrench className="h-4 w-4" />,
        shortcut: ['g', 'i'],
        keywords: ['infrastructure', 'irrigation', 'equipment'],
        onSelect: () => navigate({ to: '/infrastructure' }),
      },
      {
        id: 'go-farm-hierarchy',
        labelKey: 'dashboard.commands.navigation.farmHierarchy',
        labelFallback: 'Manage farms',
        icon: <MapPin className="h-4 w-4" />,
        shortcut: ['g', 'f'],
        keywords: ['fermes', 'farms', 'hierarchy'],
        onSelect: () => navigate({ to: '/farm-hierarchy' }),
      },
      {
        id: 'go-tasks',
        labelKey: 'dashboard.commands.navigation.tasks',
        labelFallback: 'Manage tasks',
        icon: <ListTodo className="h-4 w-4" />,
        shortcut: ['g', 'k'],
        keywords: ['tasks', 'missions', 'travail'],
        onSelect: () => navigate({ to: '/tasks' }),
      },
      {
        id: 'go-settings',
        labelKey: 'dashboard.commands.navigation.settings',
        labelFallback: 'Open settings',
        icon: <Settings className="h-4 w-4" />,
        shortcut: ['g', 't'],
        keywords: ['settings', 'organization'],
        onSelect: () => navigate({ to: '/settings' }),
      },
    ],
    [navigate],
  );

  const createActions: CommandAction[] = useMemo(
    () => [
      {
        id: 'create-parcel',
        labelKey: 'dashboard.commands.create.parcel',
        labelFallback: 'Create parcel',
        icon: <Plus className="h-4 w-4" />,
        shortcut: ['c', 'p'],
        keywords: ['nouvelle', 'parcelle', 'create', 'new'],
        onSelect: () => { window.location.href = '/parcels?create=true'; },
      },
      {
        id: 'create-task',
        labelKey: 'dashboard.commands.create.task',
        labelFallback: 'Create task',
        icon: <Plus className="h-4 w-4" />,
        shortcut: ['c', 't'],
        keywords: ['nouvelle', 'tache', 'create', 'new'],
        onSelect: () => { window.location.href = '/tasks?create=true'; },
      },
      {
        id: 'create-cycle',
        labelKey: 'dashboard.commands.create.cycle',
        labelFallback: 'Create crop cycle',
        icon: <Sprout className="h-4 w-4" />,
        shortcut: ['c', 'c'],
        keywords: ['nouveau', 'cycle', 'crop', 'create'],
        onSelect: () => { window.location.href = '/crop-cycles?create=true'; },
      },
      {
        id: 'create-stock-entry',
        labelKey: 'dashboard.commands.create.stockEntry',
        labelFallback: 'Create stock entry',
        icon: <Plus className="h-4 w-4" />,
        shortcut: ['c', 's'],
        keywords: ['nouvelle', 'entree', 'stock', 'create'],
        onSelect: () => { window.location.href = '/stock?tab=entries&create=true'; },
      },
      {
        id: 'create-invoice',
        labelKey: 'dashboard.commands.create.invoice',
        labelFallback: 'Create invoice',
        icon: <FileText className="h-4 w-4" />,
        shortcut: ['c', 'i'],
        keywords: ['nouvelle', 'facture', 'invoice', 'create'],
        onSelect: () => { window.location.href = '/accounting/invoices?create=true'; },
      },
      {
        id: 'create-worker',
        labelKey: 'dashboard.commands.create.worker',
        labelFallback: 'Add worker',
        icon: <Users className="h-4 w-4" />,
        shortcut: ['c', 'w'],
        keywords: ['nouveau', 'travailleur', 'worker', 'create'],
        onSelect: () => { window.location.href = '/workers?create=true'; },
      },
    ],
    [],
  );

  const preferenceActions: CommandAction[] = useMemo(
    () => [
      {
        id: 'toggle-theme',
        labelKey: 'dashboard.commands.preferences.lightMode',
        labelFallback: 'Toggle theme',
        icon: <Sun className="h-4 w-4" />,
        shortcut: ['t'],
        keywords: ['theme', 'dark', 'light', 'mode'],
        onSelect: () => document.documentElement.classList.toggle('dark'),
      },
    ],
    [],
  );

  const renderShortcut = (shortcut?: string[]) => {
    if (!shortcut?.length) return null;
    return (
      <CommandShortcut>
        {shortcut.map((key) => key.toUpperCase()).join(' ')}
      </CommandShortcut>
    );
  };

  const shortcutRegistrations = useMemo(
    () =>
      hotkeys
        .filter((reg) => reg.options.meta?.name)
        .slice(0, 10),
    [hotkeys],
  );

  return (
    <>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t('dashboard.commands.searchPlaceholder', 'Search for an action or page...')} />
        <CommandList>
          <CommandEmpty>{t('dashboard.commands.noResults', 'No results found.')}</CommandEmpty>

          <CommandGroup heading={t('dashboard.commands.sections.navigation', 'Navigation')}>
            {navActions.map((action) => (
              <CommandItem
                key={action.id}
                value={action.id}
                onSelect={() => handleSelect(action.onSelect)}
              >
                {action.icon}
                <span>{t(action.labelKey, action.labelFallback)}</span>
                {renderShortcut(action.shortcut)}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t('dashboard.commands.sections.modules', 'Create')}>
            {createActions.map((action) => (
              <CommandItem
                key={action.id}
                value={action.id}
                onSelect={() => handleSelect(action.onSelect)}
              >
                {action.icon}
                <span>{t(action.labelKey, action.labelFallback)}</span>
                {renderShortcut(action.shortcut)}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t('dashboard.commands.sections.preferences', 'Preferences')}>
            {preferenceActions.map((action) => (
              <CommandItem
                key={action.id}
                value={action.id}
                onSelect={() => handleSelect(action.onSelect)}
              >
                {action.icon}
                <span>{t(action.labelKey, action.labelFallback)}</span>
                {renderShortcut(action.shortcut)}
              </CommandItem>
            ))}
          </CommandGroup>

          {shortcutRegistrations.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t('keyboardShortcuts', 'Keyboard shortcuts')}>
                {shortcutRegistrations.map((reg) => (
                  <CommandItem
                    key={reg.hotkey}
                    value={`shortcut-${reg.hotkey}`}
                    onSelect={() => setOpen(false)}
                  >
                    <Keyboard className="h-4 w-4" />
                    <span>{reg.options.meta?.name}</span>
                    <CommandShortcut>{reg.hotkey}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export function useCommandPaletteToggle() {
  const toggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-command-palette'));
  }, []);
  return { toggle };
}
