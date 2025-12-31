import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = async (lng: string) => {
    // Change language immediately in UI
    await i18n.changeLanguage(lng);

    // Set document direction for RTL languages
    if (lng === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lng;
    }

    // Save language preference to backend if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ language: lng })
          .eq('id', user.id);

        if (error) {
          console.error('Failed to save language preference:', error);
        } else {
          // Invalidate auth profile query to refresh data
          queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
        }
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  // Set initial direction on mount
  useEffect(() => {
    const currentLang = i18n.language;
    if (currentLang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = currentLang;
    }
  }, [i18n.language]);

  const isRTL = i18n.language === 'ar';

  const handleLanguageChange = async (lng: string) => {
    await changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
        title="Change language"
      >
        <Languages className="h-5 w-5" />
        <span className="text-sm font-medium">
          {languages.find(lang => lang.code === i18n.language)?.nativeName || 'English'}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-[100] start-0"
        >
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`block w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isRTL ? 'text-right' : 'text-left'
                } ${
                  i18n.language === lang.code
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
