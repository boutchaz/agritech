import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Search, Sprout } from 'lucide-react';
import { Button } from './ui/button';

interface NotFoundProps {
  title?: string;
  message?: string;
  showSearch?: boolean;
}

export const NotFound: React.FC<NotFoundProps> = ({
  title = 'Page Not Found',
  message = "The page you're looking for doesn't exist or hasn't been created yet.",
  showSearch = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleGoHome = () => {
    navigate({ to: '/dashboard' });
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full">
        {/* Animated Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Decorative circles */}
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className="w-32 h-32 rounded-full bg-green-500"></div>
            </div>
            <div className="absolute inset-0 animate-pulse opacity-30">
              <div className="w-32 h-32 rounded-full bg-emerald-400"></div>
            </div>

            {/* Main icon */}
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl">
              <Sprout className="w-16 h-16 text-white animate-bounce" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-6">
          {/* 404 Text */}
          <div className="space-y-2">
            <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">
              404
            </h1>
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              onClick={handleGoHome}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Home className="mr-2 h-5 w-5" />
              {t('app.goHome') || 'Go to Dashboard'}
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              size="lg"
              className="border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t('app.goBack') || 'Go Back'}
            </Button>
          </div>

          {/* Search (optional) */}
          {showSearch && (
            <div className="pt-8">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a page..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Helpful Links */}
          <div className="pt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              You might be looking for:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Parcels', path: '/parcels' },
                { label: 'Stock', path: '/stock' },
                { label: 'Tasks', path: '/tasks' },
                { label: 'Reports', path: '/reports' },
                { label: 'Settings', path: '/settings/profile' },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate({ to: link.path })}
                  className="px-4 py-2 text-sm rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-500 dark:hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            If you believe this is a mistake, please contact support or check your permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
