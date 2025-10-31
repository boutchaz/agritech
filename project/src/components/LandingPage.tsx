import React, { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
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
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../lib/polar';
import LanguageSwitcher from './LanguageSwitcher';
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

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

  useEffect(() => {
    const pageTitle = t('landing.seo.title', {
      defaultValue: 'Agritech Suite — Pilotez vos fermes de la parcelle à la comptabilité',
    });
    const description = t('landing.seo.description', {
      defaultValue:
        'Centralisez la gestion agricole : parcelles, main-d’œuvre, analyses satellite, comptabilité et ventes dans une même plateforme.',
    });

    document.title = pageTitle;

    const ensureMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    ensureMeta('description', description);
    ensureMeta('og:title', pageTitle);
    ensureMeta('og:description', description);
    ensureMeta('twitter:title', pageTitle);
    ensureMeta('twitter:description', description);
  }, [t]);

  const structuredData = useMemo(() => {
    const name = t('app.name', { defaultValue: 'Agritech Suite' });
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url: `${siteOrigin}/`,
      description: t('landing.seo.description', {
        defaultValue:
          'Centralisez la gestion agricole : parcelles, main-d’œuvre, analyses satellite, comptabilité et ventes dans une même plateforme.',
      }),
      sameAs: [],
      hasPart: [
        {
          '@type': 'Service',
          name: t('landing.features.parcelManagement', { defaultValue: 'Gestion des parcelles' }),
          url: `${siteOrigin}/parcels`,
        },
        {
          '@type': 'Service',
          name: t('landing.features.teamManagement', { defaultValue: 'Gestion des équipes' }),
          url: `${siteOrigin}/tasks`,
        },
        {
          '@type': 'Service',
          name: t('landing.features.profitability', { defaultValue: 'Suivi de la rentabilité' }),
          url: `${siteOrigin}/accounting`,
        },
        {
          '@type': 'Service',
          name: t('landing.features.satelliteAnalysis', { defaultValue: 'Analyses satellite' }),
          url: `${siteOrigin}/satellite-analysis`,
        },
      ],
    };
  }, [siteOrigin, t]);
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
    t('landing.trusted.agronomists', { defaultValue: 'Agronomes' }),
    t('landing.trusted.coops', { defaultValue: 'Coopératives' }),
    t('landing.trusted.exporters', { defaultValue: 'Exportateurs' }),
    t('landing.trusted.labs', { defaultValue: 'Laboratoires' }),
  ];

  const solutionModules = [
    {
      icon: MapPin,
      title: t('landing.modules.parcels.title', { defaultValue: 'Gestion des parcelles' }),
      description: t('landing.modules.parcels.desc', {
        defaultValue: 'Cartographiez vos parcelles, suivez les cultures et reliez-les aux analyses de sol.',
      }),
      to: '/parcels',
      color: 'text-green-600',
    },
    {
      icon: CheckCircle,
      title: t('landing.modules.tasks.title', { defaultValue: 'Planification des tâches' }),
      description: t('landing.modules.tasks.desc', {
        defaultValue: 'Assignez vos équipes, mesurez le temps passé et suivez la progression en direct.',
      }),
      to: '/tasks',
      color: 'text-blue-600',
    },
    {
      icon: DollarSign,
      title: t('landing.modules.accounting.title', { defaultValue: 'Comptabilité intégrée' }),
      description: t('landing.modules.accounting.desc', {
        defaultValue: 'Automatisez factures, paiements et suivi des coûts par ferme ou parcelle.',
      }),
      to: '/accounting',
      color: 'text-emerald-600',
    },
    {
      icon: Satellite,
      title: t('landing.modules.analytics.title', { defaultValue: 'Analyses & services' }),
      description: t('landing.modules.analytics.desc', {
        defaultValue: 'Exploitez les images satellite et commandez vos analyses laboratoire en quelques clics.',
      }),
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
                {t('landing.modules.title', { defaultValue: 'Les modules qui orchestrent vos opérations' })}
              </h2>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                {t('landing.modules.subtitle', {
                  defaultValue:
                    'Une suite intégrée reliant la planification des parcelles, le travail des équipes, la comptabilité et l’analyse agronomique.',
                })}
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
                          {t('landing.modules.cta', { defaultValue: 'Découvrir le module' })}
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
                    <span className="text-3xl sm:text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.priceAmount > 0 && (
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {t('landing.pricing.perMonth')}
                      </span>
                    )}
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
            <p>&copy; 2025 {t('app.name')}. {t('landing.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
