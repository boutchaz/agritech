import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ];

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

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="Change language"
      >
        <Languages className="h-5 w-5" />
        <span className="text-sm font-medium">
          {languages.find(lang => lang.code === i18n.language)?.nativeName || 'English'}
        </span>
      </button>

      <div className="absolute end-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`block w-full text-start px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
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
    </div>
  );
};

export default LanguageSwitcher;
