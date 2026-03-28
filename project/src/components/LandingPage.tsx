import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Users,
  BarChart3,
  Satellite,
  Droplets,
  TrendingUp,
  Boxes,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Sprout,
  CloudRain,
  Tractor,
  DollarSign,
  Building2,
  Clock,
  BookOpen,
  Calendar,
  ShieldCheck,
  Store,
  FileSpreadsheet,
} from 'lucide-react';
import { blogsApi } from '../lib/api/blogs';
import { SUBSCRIPTION_PLANS } from '../lib/polar';
import LanguageSwitcher from './LanguageSwitcher';
import ROICalculator from './ROICalculator';
import heroBg from '../assets/hero-bg.avif';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';
import { appConfig } from '@/config/app';

const DEFAULT_SIAM_DATES = ['2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24'];

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

  // Fetch latest blog posts for the landing page
  const { data: latestPosts } = useQuery({
    queryKey: ['landing-blogs'],
    queryFn: () => blogsApi.getBlogs({ limit: 3, sortBy: 'publishedAt', sortOrder: 'desc' }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Structured data for SEO - moved before useEffect
  const structuredData = useMemo(() => {
    const name = t('app.name', { defaultValue: appConfig.name });
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'applicationCategory': 'BusinessApplication',
      name,
      url: `${siteOrigin}/`,
      description: t('landing.seo.description', {
        defaultValue:
          `${appConfig.name}: La plateforme complète de gestion agricole au Maroc. Gérez vos parcelles, équipes, stocks, analyses satellite et comptabilité.`,
      }),
      image: `${siteOrigin}/og-image.png`,
      sameAs: ['https://marketplace.thebzlab.online'],
      offers: {
        '@type': 'Offer',
        price: '25',
        priceCurrency: 'USD',
      },
      featureList: [
        t('landing.features.parcelManagement', { defaultValue: 'Gestion des parcelles agricoles' }),
        t('landing.features.teamManagement', { defaultValue: 'Gestion des équipes et tâches' }),
        t('landing.features.satelliteAnalysis', { defaultValue: 'Analyses satellite NDVI/NDWI' }),
        t('landing.features.profitability', { defaultValue: 'Comptabilité analytique et générale' }),
        t('landing.features.stockManagement', { defaultValue: 'Gestion des stocks et inventaires' }),
        t('landing.features.qualityControl', { defaultValue: 'Contrôle qualité et traçabilité' }),
        t('landing.features.marketplace', { defaultValue: 'Marketplace B2B intégrée' }),
      ],
    };
  }, [siteOrigin, t]);

  useEffect(() => {
    const pageTitle = t('landing.seo.title', {
      defaultValue: `${appConfig.name} - La Suite de Gestion Agricole Tout-en-Un | Maroc`,
    });
    const description = t('landing.seo.description', {
      defaultValue:
        `${appConfig.name} révolutionne l'agriculture au Maroc. Une plateforme unique pour piloter production, finance, RH, stocks et commercialisation. Agriculture de précision et gestion d'exploitation simplifiée.`,
    });

    document.title = pageTitle;

    const ensureMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${nameOrProperty}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, nameOrProperty);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Primary meta tags
    ensureMeta('description', description);
    ensureMeta('keywords', t('landing.seo.keywords', { defaultValue: 'gestion agricole, logiciel agriculture maroc, erp agricole, parcelles, NDVI, analyse satellite, comptabilité agricole, gestion ferme, agriculture de précision, marketplace agricole, contrôle qualité fruit, gestion main d\'oeuvre agricole, agrogina, agritech' }));

    // Open Graph meta tags
    ensureMeta('og:type', 'website', true);
    ensureMeta('og:url', siteOrigin, true);
    ensureMeta('og:title', pageTitle, true);
    ensureMeta('og:description', description, true);
    ensureMeta('og:image', `${siteOrigin}/og-image.png`, true);
    ensureMeta('og:site_name', appConfig.name, true);

    // Twitter meta tags
    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:title', pageTitle);
    ensureMeta('twitter:description', description);
    ensureMeta('twitter:image', `${siteOrigin}/og-image.png`);

    // Inject structured data
    const existingScript = document.querySelector('script[data-landing-schema]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-landing-schema', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.querySelector('script[data-landing-schema]');
      if (script) {
        script.remove();
      }
    };
  }, [t, siteOrigin, structuredData]);

  const features = [
    {
      icon: MapPin,
      title: t('landing.features.parcelManagement'),
      description: t('landing.features.parcelDesc'),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Users,
      title: t('landing.features.teamManagement'),
      description: t('landing.features.teamDesc'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Satellite,
      title: t('landing.features.satelliteAnalysis'),
      description: t('landing.features.satelliteDesc'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Droplets,
      title: t('landing.features.soilAnalysis'),
      description: t('landing.features.soilDesc'),
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      icon: Boxes,
      title: t('landing.features.stockManagement'),
      description: t('landing.features.stockDesc'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      icon: TrendingUp,
      title: t('landing.features.profitability'),
      description: t('landing.features.profitabilityDesc'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      icon: BarChart3,
      title: t('landing.features.analytics'),
      description: t('landing.features.analyticsDesc'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      icon: Tractor,
      title: t('landing.features.infrastructure'),
      description: t('landing.features.infrastructureDesc'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      icon: CloudRain,
      title: t('landing.features.weather'),
      description: t('landing.features.weatherDesc'),
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      icon: Building2,
      title: t('landing.features.multiOrg'),
      description: t('landing.features.multiOrgDesc'),
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
    {
      icon: Shield,
      title: t('landing.features.secure'),
      description: t('landing.features.secureDesc'),
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    {
      icon: Clock,
      title: t('landing.features.realtime'),
      description: t('landing.features.realtimeDesc'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
    {
      icon: ShieldCheck,
      title: t('landing.features.quality'),
      description: t('landing.features.qualityDesc', { defaultValue: 'Contrôle qualité rigoureux et suivi de la conformité aux standards.' }),
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
    },
    {
      icon: Store,
      title: t('landing.features.marketplace'),
      description: t('landing.features.marketplaceDesc', { defaultValue: 'Accédez aux meilleurs fournisseurs et vendez votre production.' }),
      color: 'text-fuchsia-600',
      bgColor: 'bg-fuchsia-100',
    },
    {
      icon: FileSpreadsheet,
      title: t('landing.features.advancedAccounting'),
      description: t('landing.features.advancedAccountingDesc', { defaultValue: 'Bilan, compte de résultat et suivi de trésorerie en temps réel.' }),
      color: 'text-sky-600',
      bgColor: 'bg-sky-100',
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: t('landing.benefits.productivity'),
      description: t('landing.benefits.productivityDesc'),
    },
    {
      icon: DollarSign,
      title: t('landing.benefits.costReduction'),
      description: t('landing.benefits.costReductionDesc'),
    },
    {
      icon: TrendingUp,
      title: t('landing.benefits.betterYields'),
      description: t('landing.benefits.betterYieldsDesc'),
    },
    {
      icon: Sprout,
      title: t('landing.benefits.sustainable'),
      description: t('landing.benefits.sustainableDesc'),
    },
  ];

  const trustedSectors = [
    t('landing.trusted.agronomists'),
    t('landing.trusted.coops'),
    t('landing.trusted.exporters'),
    t('landing.trusted.labs'),
  ];

  const siamAvailableDates = useMemo(() => {
    if (typeof window === 'undefined') return DEFAULT_SIAM_DATES;
    const cached = localStorage.getItem('agrogina:siam:available-dates');
    if (!cached) return DEFAULT_SIAM_DATES;

    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return DEFAULT_SIAM_DATES;
      const normalized = parsed
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
      return normalized.length > 0 ? normalized : DEFAULT_SIAM_DATES;
    } catch {
      return DEFAULT_SIAM_DATES;
    }
  }, []);

  const [siamForm, setSiamForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredDate: siamAvailableDates[0] || '',
  });
  const [siamSuccessMessage, setSiamSuccessMessage] = useState<string | null>(null);

  const handleSiamFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setSiamForm((previous) => ({
      ...previous,
      [name]: value,
    }));
    if (siamSuccessMessage) setSiamSuccessMessage(null);
  };

  const handleSiamSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siamForm.fullName || !siamForm.email || !siamForm.phone || !siamForm.preferredDate) {
      return;
    }

    setSiamSuccessMessage(
      t('landing.siam.form.success'),
    );
    setSiamForm((previous) => ({
      ...previous,
      fullName: '',
      email: '',
      phone: '',
    }));
  };

  const solutionModules = [
    {
      icon: MapPin,
      title: t('landing.modules.parcels.title'),
      description: t('landing.modules.parcels.desc'),
      to: '/parcels',
      color: 'text-green-600',
    },
    {
      icon: CheckCircle,
      title: t('landing.modules.tasks.title'),
      description: t('landing.modules.tasks.desc'),
      to: '/tasks',
      color: 'text-blue-600',
    },
    {
      icon: DollarSign,
      title: t('landing.modules.accounting.title'),
      description: t('landing.modules.accounting.desc'),
      to: '/accounting',
      color: 'text-emerald-600',
    },
    {
      icon: Satellite,
      title: t('landing.modules.analytics.title'),
      description: t('landing.modules.analytics.desc'),
      to: '/analyses',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2">
              <Sprout className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{t('app.name')}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher />
              <Link
                to="/blog"
                className="hidden sm:inline text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors text-sm"
              >
                {t('landing.nav.blog')}
              </Link>
              <Link
                to="/login"
                className="hidden sm:inline text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors text-sm"
              >
                {t('auth.login')}
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                {t('landing.cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main role="main" aria-labelledby="landing-hero-title">
        {/* Hero Section */}
        <section
          className="relative min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden"
          aria-labelledby="landing-hero-title"
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${heroBg})`,
                filter: 'brightness(0.4)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-gray-900/80" />
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 text-center">
            <div className="max-w-3xl mx-auto">
              <h1
                id="landing-hero-title"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in-up leading-tight"
              >
                {t('landing.hero.title')}{' '}
                <span className="text-green-400 animate-pulse-slow">{t('landing.hero.titleHighlight')}</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 px-4 sm:px-0 animate-fade-in-up animation-delay-200">
                {t('landing.hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0 animate-fade-in-up animation-delay-400">
                <Button
                  asChild
                  size="lg"
                  className="bg-green-600 text-white shadow-lg transition-transform duration-300 hover:scale-105 hover:bg-green-700 hover:shadow-xl text-lg font-semibold"
                >
                  <Link to="/register">
                    {t('landing.hero.ctaPrimary')}
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-green-600 transition-colors duration-300 text-lg font-semibold"
                >
                  <a href="#features">
                    {t('landing.hero.ctaSecondary')}
                  </a>
                </Button>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-200 animate-fade-in-up animation-delay-600 px-4">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t('landing.hero.freeTrial')}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t('landing.hero.noCommitment')}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t('landing.hero.supportIncluded')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Background Elements */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-5 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-green-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-5 sm:right-10 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
          </div>
        </section>

        {/* Visual Showcase Section */}
        <section className="relative z-20 -mt-20 sm:-mt-32 px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
          <div className="max-w-6xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 dark:border-gray-800/50 bg-gray-900/5 aspect-[16/10] sm:aspect-[16/9] group">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                poster="/assets/video-poster.jpg"
              >
                <source src="/assets/agritech-promo.mp4" type="video/mp4" />
              </video>

              {/* Overlay Gradient for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Trusted By */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">
              {t('landing.trustedBy')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {trustedSectors.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200 sm:text-base"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* SIAM Rendezvous */}
        <section className="py-12 sm:py-16 bg-gradient-to-r from-green-700 via-green-600 to-lime-500">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 bg-white/95 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-gray-900">
                    {t('landing.siam.title')}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {t('landing.siam.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {t('landing.siam.features.demo')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {t('landing.siam.features.focus')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {t('landing.siam.features.slots')}
                    </li>
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {siamAvailableDates.map((date) => (
                      <Badge key={date} variant="secondary" className="bg-green-100 text-green-800">
                        {date}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/95 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-gray-900">{t('landing.siam.form.title')}</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {t('landing.siam.form.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleSiamSubmit}>
                    <input
                      name="fullName"
                      value={siamForm.fullName}
                      onChange={handleSiamFieldChange}
                      placeholder={t('landing.siam.form.fullName')}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="email"
                      type="email"
                      value={siamForm.email}
                      onChange={handleSiamFieldChange}
                      placeholder={t('landing.siam.form.email')}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="phone"
                      value={siamForm.phone}
                      onChange={handleSiamFieldChange}
                      placeholder={t('landing.siam.form.phone')}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      name="preferredDate"
                      value={siamForm.preferredDate}
                      onChange={handleSiamFieldChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {siamAvailableDates.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" className="w-full">
                      {t('landing.siam.form.submit')}
                    </Button>
                    {siamSuccessMessage && (
                      <p className="text-xs text-green-700">{siamSuccessMessage}</p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section
          className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900"
          aria-labelledby="landing-modules-title"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2
                id="landing-modules-title"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white"
              >
                {t('landing.modules.title')}
              </h2>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                {t('landing.modules.subtitle')}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {solutionModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Card
                    key={module.title}
                    className="flex h-full flex-col transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="flex flex-row items-center gap-3 pb-4">
                      <span className={cn('rounded-full bg-gray-100 p-3 dark:bg-gray-700', module.color)}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <CardTitle className="text-lg font-semibold">{module.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pt-0">
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button
                        asChild
                        variant="link"
                        className="px-0 text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                      >
                        <Link to={module.to}>
                          {t('landing.modules.cta')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="py-12 sm:py-16 lg:py-20 bg-gray-50 dark:bg-gray-900"
          aria-labelledby="landing-features-title"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2
                id="landing-features-title"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white"
              >
                {t('landing.features.title')}
              </h2>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                {t('landing.features.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="h-full shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader className="space-y-3 pb-4">
                      <span
                        className={cn(
                          'inline-flex h-12 w-12 items-center justify-center rounded-lg',
                          feature.bgColor
                        )}
                      >
                        <Icon className={cn('h-6 w-6', feature.color)} />
                      </span>
                      <CardTitle className="text-lg sm:text-xl font-semibold">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section
          className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900"
          aria-labelledby="landing-benefits-title"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2
                id="landing-benefits-title"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white"
              >
                {t('landing.benefits.title')}
              </h2>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                {t('landing.benefits.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="h-full text-center">
                    <CardHeader className="items-center space-y-4 pb-4">
                      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </span>
                      <CardTitle className="text-lg sm:text-xl font-semibold">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm sm:text-base text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ROI Calculator */}
        <section
          id="roi-calculator"
          className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800"
          aria-labelledby="landing-roi-title"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2
                id="landing-roi-title"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white"
              >
                {t('common.roiCalculator.title')}
              </h2>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                {t('common.roiCalculator.subtitle')}
              </p>
            </div>
            <ROICalculator />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 px-4">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
              const isPopular = plan.highlighted;
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'flex h-full flex-col overflow-hidden border',
                    isPopular ? 'border-green-600 ring-2 ring-green-600 sm:scale-[1.02]' : ''
                  )}
                >
                  {isPopular && (
                    <div className="bg-green-600 text-white text-center py-2 text-xs sm:text-sm font-semibold">
                      {t('landing.pricing.mostPopular')}
                    </div>
                  )}
                  <CardHeader className="space-y-3 pb-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="min-h-[3rem] text-sm sm:text-base">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">
                        {plan.pricePerHaYearHt} MAD
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {t('landing.pricing.perHaYear')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      asChild
                      className={cn(
                        'w-full',
                        isPopular
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      )}
                    >
                      <Link to="/register">
                        {plan.id === 'enterprise'
                          ? t('landing.pricing.contactUs')
                          : t('landing.pricing.getStarted')}
                      </Link>
                    </Button>
                    <ul className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm text-muted-foreground">
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Blog Section */}
        {latestPosts?.data && latestPosts.data.length > 0 && (
          <section
            className="py-12 sm:py-16 lg:py-20 bg-gray-50 dark:bg-gray-800"
            aria-labelledby="landing-blog-title"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 sm:mb-12">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {t('landing.blog.label')}
                    </span>
                  </div>
                  <h2
                    id="landing-blog-title"
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white"
                  >
                    {t('landing.blog.title')}
                  </h2>
                  <p className="mt-2 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                    {t('landing.blog.subtitle')}
                  </p>
                </div>
                <Button asChild variant="outline" className="self-start sm:self-center">
                  <Link to="/blog">
                    {t('landing.blog.viewAll')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {latestPosts.data.map((post) => {
                  // Image URL should already be a full URL from the NestJS API
                  const imageUrl = post.featured_image?.url || null;
                  const formattedDate = post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString(i18n.language || 'fr', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : null;

                  return (
                    <Card
                      key={post.id}
                      className="group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <Link to="/blog/$slug" params={{ slug: post.slug }} className="flex flex-col h-full">
                        {imageUrl && (
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={post.featured_image?.alternativeText || post.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {post.blog_category && (
                              <Badge className="absolute top-3 left-3 bg-green-600 text-white">
                                {post.blog_category.name}
                              </Badge>
                            )}
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {post.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.excerpt}
                          </p>
                        </CardContent>
                        <CardFooter className="pt-0 text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            {formattedDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formattedDate}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {post.reading_time} {t('landing.blog.readingTime')}
                            </span>
                          </div>
                        </CardFooter>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-green-600 py-12 sm:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6 px-4">
              {t('landing.cta.title')}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-green-100 mb-6 sm:mb-8 px-4">
              {t('landing.cta.subtitle')}
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-green-600 hover:bg-gray-100 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              <Link to="/register">
                {t('landing.cta.button')}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
          </div>
        </section>

      </main>

      <section aria-hidden="true" className="sr-only">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <Sprout className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                <span className="text-base sm:text-lg font-bold text-white">{t('app.name')}</span>
              </div>
              <p className="text-xs sm:text-sm">
                {t('landing.footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('landing.footer.product')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-green-500 transition-colors">{t('landing.footer.features')}</a></li>
                <li><a href="#pricing" className="hover:text-green-500 transition-colors">{t('landing.footer.pricing')}</a></li>
                <li><Link to="/blog" className="hover:text-green-500 transition-colors">{t('landing.footer.blog')}</Link></li>
                <li><Link to="/register" className="hover:text-green-500 transition-colors">{t('landing.footer.freeTrial')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('landing.footer.support')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-green-500 transition-colors">{t('landing.footer.documentation')}</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">{t('landing.footer.contact')}</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">{t('landing.footer.faq')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('landing.footer.legal')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-green-500 transition-colors">{t('landing.footer.privacy')}</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">{t('landing.footer.terms')}</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">{t('landing.footer.legalNotice')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
            <p>&copy; {new Date().getFullYear()} {t('app.name')}. {t('landing.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
