import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useActiveBanners, useDismissBanner } from '@/hooks/useBanners';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import type { Banner } from '@/lib/api/banners';

const severityConfig: Record<
  Banner['severity'],
  { icon: typeof Info; border: string; bg: string; darkBorder: string; darkBg: string; iconColor: string; darkIconColor: string; text: string; darkText: string; btnBg: string; btnHover: string }
> = {
  info: {
    icon: Info,
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    darkBorder: 'dark:border-blue-800',
    darkBg: 'dark:bg-blue-900/20',
    iconColor: 'text-blue-600',
    darkIconColor: 'dark:text-blue-400',
    text: 'text-blue-900',
    darkText: 'dark:text-blue-100',
    btnBg: 'bg-blue-600',
    btnHover: 'hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    darkBorder: 'dark:border-emerald-800',
    darkBg: 'dark:bg-emerald-900/20',
    iconColor: 'text-emerald-600',
    darkIconColor: 'dark:text-emerald-400',
    text: 'text-emerald-900',
    darkText: 'dark:text-emerald-100',
    btnBg: 'bg-emerald-600',
    btnHover: 'hover:bg-emerald-700',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    darkBorder: 'dark:border-yellow-800',
    darkBg: 'dark:bg-yellow-900/20',
    iconColor: 'text-yellow-600',
    darkIconColor: 'dark:text-yellow-400',
    text: 'text-yellow-900',
    darkText: 'dark:text-yellow-100',
    btnBg: 'bg-yellow-600',
    btnHover: 'hover:bg-yellow-700',
  },
  critical: {
    icon: AlertCircle,
    border: 'border-red-200',
    bg: 'bg-red-50',
    darkBorder: 'dark:border-red-800',
    darkBg: 'dark:bg-red-900/20',
    iconColor: 'text-red-600',
    darkIconColor: 'dark:text-red-400',
    text: 'text-red-900',
    darkText: 'dark:text-red-100',
    btnBg: 'bg-red-600',
    btnHover: 'hover:bg-red-700',
  },
};

const BannerDisplay = () => {
  const { data: banners } = useActiveBanners();
  const dismissBanner = useDismissBanner();
  const { i18n } = useTranslation();
  const isRTL = isRTLLocale(i18n.language);

  if (!banners || banners.length === 0) return null;

  const banner = banners[0];
  const config = severityConfig[banner.severity] ?? severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative border-b px-4 py-3',
        config.border, config.bg, config.darkBorder, config.darkBg,
        isRTL && 'text-right',
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={cn(
          'mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4',
          isRTL && 'md:flex-row-reverse',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-1 items-start gap-3 md:items-center',
            isRTL && 'flex-row-reverse',
          )}
        >
          <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconColor, config.darkIconColor)} />
          <div className={cn('min-w-0 flex-1', isRTL ? 'text-right' : 'text-left')}>
            <p className={cn('text-pretty text-sm font-semibold leading-snug', config.text, config.darkText)}>
              {banner.title}
            </p>
            <p className={cn('text-pretty text-sm leading-snug mt-0.5', config.text, config.darkText, 'opacity-80')}>
              {banner.message}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex w-full shrink-0 items-center gap-2 md:w-auto md:justify-end',
            isRTL && 'flex-row-reverse',
          )}
        >
          {banner.cta_label && banner.cta_url && (
            <a href={banner.cta_url} target="_blank" rel="noopener noreferrer" className="contents">
              <Button
                type="button"
                className={cn('h-10 flex-1 rounded-md px-4 text-sm font-medium md:flex-initial text-white', config.btnBg, config.btnHover)}
              >
                {banner.cta_label}
                <ExternalLink className="h-4 w-4 ml-1.5" />
              </Button>
            </a>
          )}

          {banner.dismissible && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => dismissBanner.mutate(banner.id)}
              className="h-10 w-10 shrink-0 text-slate-500 hover:bg-accent hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label={i18n.language === 'ar' ? 'إغلاق' : 'Close'}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BannerDisplay;
