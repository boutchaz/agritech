import type React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../lib/api/users';
import { useQueryClient } from '@tanstack/react-query';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { loadLanguage } from '@/i18n/config';
import { cn } from '@/lib/utils';
import { headerToolbarIconTriggerClass, headerToolbarTextTriggerClass } from '@/lib/header-toolbar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type LanguageSwitcherProps = {
  /** Icon-only trigger; use in tight headers (e.g. next to org switcher on mobile). */
  compact?: boolean;
  /** Raise the dropdown above high z-index layers (e.g. full-screen mobile nav at z-[1001]). */
  elevatePopover?: boolean;
};

const LanguageSwitcher = ({ compact = false, elevatePopover = false }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ];

  useEffect(() => {
    const currentLang = i18n.language;
    if (isRTLLocale(currentLang)) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = currentLang.split('-')[0] || 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = currentLang;
    }
  }, [i18n.language]);

  const changeLanguage = async (lng: string) => {
    await loadLanguage(lng);

    if (isRTLLocale(lng)) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = lng.split('-')[0] || 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lng;
    }

    if (user) {
      try {
        await usersApi.updateMe({ language: lng });
        queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  const currentNative =
    languages.find((lang) => lang.code === i18n.language)?.nativeName || 'English';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          className={cn(
            compact ? headerToolbarIconTriggerClass : cn(headerToolbarTextTriggerClass, 'max-w-[220px]'),
          )}
          title={`Change language — ${currentNative}`}
          aria-label={`Change language, current: ${currentNative}`}
        >
          <Languages className="h-5 w-5 shrink-0" />
          {!compact && <span className="min-w-0 flex-1 truncate text-start">{currentNative}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          elevatePopover ? 'z-[1100]' : 'z-[200]',
          'w-48 max-w-[min(12rem,calc(100vw-1.5rem))] border-gray-200 dark:border-gray-700 dark:bg-gray-800',
        )}
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={cn(
              'cursor-pointer justify-start px-4 py-2 text-start',
              i18n.language === lang.code
                ? 'bg-green-50 font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400'
                : 'text-gray-700 dark:text-gray-300',
            )}
            onSelect={() => {
              void changeLanguage(lang.code);
            }}
          >
            {lang.nativeName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
