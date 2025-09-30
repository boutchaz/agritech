import React from 'react';
import { Link } from '@tanstack/react-router';
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

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: MapPin,
      title: 'Gestion Parcellaire',
      description: 'Gérez vos parcelles avec précision. Suivez les cultures, surfaces et données géospatiales.',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Users,
      title: 'Gestion des Équipes',
      description: 'Employés permanents et journaliers. Présences, salaires et planning optimisés.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Satellite,
      title: 'Analyse Satellite',
      description: 'Indices NDVI, NDWI, NDMI pour surveiller la santé des cultures par satellite.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Droplets,
      title: 'Analyse du Sol',
      description: 'pH, humidité, NPK, matière organique. Analyses en laboratoire et terrain.',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      icon: Boxes,
      title: 'Gestion des Stocks',
      description: 'Intrants, engrais, semences. Alertes de stock bas et gestion des expirations.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      icon: TrendingUp,
      title: 'Rentabilité Parcellaire',
      description: 'Calculez coûts et revenus par parcelle. Optimisez votre rentabilité.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      icon: BarChart3,
      title: 'Rapports & Analytics',
      description: 'Tableaux de bord personnalisables. Exportez vos données et rapports.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      icon: Tractor,
      title: 'Gestion Infrastructure',
      description: 'Équipements, bâtiments, systèmes d\'irrigation. Maintenance et suivi.',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      icon: CloudRain,
      title: 'Météo & Services',
      description: 'Prévisions météo intégrées et services utilitaires pour votre ferme.',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      icon: Building2,
      title: 'Multi-Organisation',
      description: 'Gérez plusieurs exploitations. Permissions et rôles par organisation.',
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
    {
      icon: Shield,
      title: 'Sécurisé & Conforme',
      description: 'Authentification sécurisée, RLS Supabase. Vos données sont protégées.',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    {
      icon: Clock,
      title: 'Temps Réel',
      description: 'Mises à jour en temps réel avec React Query. Interface réactive.',
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Productivité accrue',
      description: 'Automatisez vos tâches et gagnez du temps sur la gestion quotidienne.',
    },
    {
      icon: DollarSign,
      title: 'Réduction des coûts',
      description: 'Optimisez vos intrants et réduisez le gaspillage grâce aux données.',
    },
    {
      icon: TrendingUp,
      title: 'Meilleurs rendements',
      description: 'Prenez des décisions basées sur les données pour maximiser vos récoltes.',
    },
    {
      icon: Sprout,
      title: 'Agriculture durable',
      description: 'Réduisez votre impact environnemental avec une gestion précise.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Sprout className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">AgriTech</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Commencer gratuitement
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Transformez votre agriculture avec{' '}
            <span className="text-green-600">la donnée</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Plateforme complète de gestion agricole. Parcelles, équipes, stocks, analyses satellite,
            sol et rentabilité. Tout en un seul endroit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
            >
              Démarrer maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:border-green-600 dark:hover:border-green-500 transition-colors text-lg font-semibold"
            >
              Découvrir les fonctionnalités
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Essai gratuit
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Sans engagement
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Support inclus
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Fonctionnalités complètes
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Tous les outils dont vous avez besoin pour gérer votre exploitation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 ${feature.bgColor} rounded-lg mb-4`}>
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-100 dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Pourquoi choisir AgriTech ?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tarifs simples et transparents
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choisissez le plan adapté à vos besoins
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
            const isPopular = plan.highlighted;
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${
                  isPopular ? 'ring-2 ring-green-600 scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="bg-green-600 text-white text-center py-2 text-sm font-semibold">
                    Le plus populaire
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 min-h-[3rem]">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    {plan.priceAmount > 0 && (
                      <span className="text-gray-600 dark:text-gray-400 ml-2">/mois</span>
                    )}
                  </div>
                  <Link
                    to="/register"
                    className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                      isPopular
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Nous contacter' : 'Commencer'}
                  </Link>
                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
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
      <section className="bg-green-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à moderniser votre agriculture ?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Rejoignez des centaines d'agriculteurs qui optimisent déjà leur exploitation.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold"
          >
            Commencer gratuitement
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sprout className="h-6 w-6 text-green-500" />
                <span className="text-lg font-bold text-white">AgriTech</span>
              </div>
              <p className="text-sm">
                La plateforme complète pour moderniser votre agriculture.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-green-500">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-green-500">Tarifs</a></li>
                <li><Link to="/register" className="hover:text-green-500">Essai gratuit</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-green-500">Documentation</a></li>
                <li><a href="#" className="hover:text-green-500">Contact</a></li>
                <li><a href="#" className="hover:text-green-500">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-green-500">Confidentialité</a></li>
                <li><a href="#" className="hover:text-green-500">CGU</a></li>
                <li><a href="#" className="hover:text-green-500">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 AgriTech. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
