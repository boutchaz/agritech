import React from 'react';
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
  Calendar,
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
import { SUBSCRIPTION_PLANS, type PlanType } from '../lib/polar';
import LanguageSwitcher from './LanguageSwitcher';
import heroBg from '../assets/hero-bg.avif';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
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

      {/* Hero Section */}
      <section className="relative min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden">
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in-up leading-tight">
              {t('landing.hero.title')}{' '}
              <span className="text-green-400 animate-pulse-slow">{t('landing.hero.titleHighlight')}</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 px-4 sm:px-0 animate-fade-in-up animation-delay-200">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0 animate-fade-in-up animation-delay-400">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:scale-105 transition-all duration-300 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl"
              >
                {t('landing.hero.ctaPrimary')}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-green-600 transition-all duration-300 text-base sm:text-lg font-semibold backdrop-blur-sm"
              >
                {t('landing.hero.ctaSecondary')}
              </a>
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

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-4">
            {t('landing.features.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 px-4">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 ${feature.bgColor} rounded-lg mb-3 sm:mb-4`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-4">
              {t('landing.benefits.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center px-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-100 dark:bg-green-900 rounded-full mb-3 sm:mb-4">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
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
              <div
                key={plan.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${
                  isPopular ? 'ring-2 ring-green-600 sm:scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="bg-green-600 text-white text-center py-2 text-xs sm:text-sm font-semibold">
                    {t('landing.pricing.mostPopular')}
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 min-h-[3rem]">
                    {plan.description}
                  </p>
                  <div className="mb-4 sm:mb-6">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    {plan.priceAmount > 0 && (
                      <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 ml-2">{t('landing.pricing.perMonth')}</span>
                    )}
                  </div>
                  <Link
                    to="/register"
                    className={`block w-full text-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                      isPopular
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    {plan.id === 'enterprise' ? t('landing.pricing.contactUs') : t('landing.pricing.getStarted')}
                  </Link>
                  <ul className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            {t('landing.cta.button')}
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        </div>
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
