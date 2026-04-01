import React, { useState, useEffect } from 'react';
import { Save, Building, Mail, Phone, MapPin, Globe, AlertCircle, Loader2, ExternalLink, Map as MapIcon, ShoppingCart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { organizationsApi } from '../lib/api/organizations';
import { useQueryClient } from '@tanstack/react-query';
import CurrencySelector from './CurrencySelector';
import { DEFAULT_CURRENCY, type Currency } from '../utils/currencies';
import { useTranslation } from 'react-i18next';
import { getMarketplaceUrl } from '@/lib/marketplace-link';
import { Button } from '@/components/ui/button';

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  contact_person?: string;
  website?: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  currency?: string;
  currency_symbol?: string;
  timezone?: string;
  currency_code?: string;
  is_active?: boolean;
  map_provider?: 'default' | 'mapbox' | null;
  allow_negative_stock?: boolean;
}

type SettingsTab = 'general' | 'ai-providers';

const OrganizationSettings: React.FC = () => {
  const { currentOrganization, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Get tab from URL search params or default to 'general'
  const getInitialTab = (): SettingsTab => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      return tab === 'ai-providers' ? 'ai-providers' : 'general';
    }
    return 'general';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!currentOrganization) {
        setLoading(false);
        return;
      }

      try {
        const data = await organizationsApi.getOne(currentOrganization.id);
        // Map API response to component state
        setOrgData({
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          currency_code: data.currency_code,
          currency: data.currency_code,
          timezone: data.timezone,
          is_active: data.is_active,
          status: data.is_active ? 'active' : 'inactive',
          // Contact and address fields from API
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postal_code: data.postal_code,
          contact_person: data.contact_person,
          website: data.website,
          currency_symbol: undefined,
          map_provider: data.map_provider,
          allow_negative_stock: data.accounting_settings?.allow_negative_stock ?? true,
        });
      } catch (err) {
        console.error('Error fetching organization data:', err);
        setError(t('organization.errors.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [currentOrganization, t]);

  const handleSave = async () => {
    if (!orgData || !currentOrganization) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Convert empty strings to undefined for optional validated fields
      const cleanString = (val: string | undefined | null): string | undefined =>
        val && val.trim() !== '' ? val.trim() : undefined;
      // Send all fields to the API
      const updatedOrg = await organizationsApi.update(currentOrganization.id, {
        name: orgData.name,
        description: cleanString(orgData.description),
        email: cleanString(orgData.email),
        phone: cleanString(orgData.phone),
        address: cleanString(orgData.address),
        city: cleanString(orgData.city),
        state: cleanString(orgData.state),
        postal_code: cleanString(orgData.postal_code),
        country: cleanString(orgData.country),
        contact_person: cleanString(orgData.contact_person),
        website: cleanString(orgData.website),
        map_provider: orgData.map_provider,
        accounting_settings: { allow_negative_stock: orgData.allow_negative_stock ?? true },
      });

      // Update local state with API response
      setOrgData({
        id: updatedOrg.id || orgData.id,
        name: updatedOrg.name || orgData.name,
        slug: updatedOrg.slug || orgData.slug,
        description: updatedOrg.description ?? orgData.description,
        currency_code: updatedOrg.currency_code ?? orgData.currency_code,
        currency: updatedOrg.currency_code ?? orgData.currency,
        timezone: updatedOrg.timezone ?? orgData.timezone,
        is_active: updatedOrg.is_active ?? orgData.is_active,
        status: (updatedOrg.is_active ?? orgData.is_active) ? 'active' : 'inactive',
        // Contact and address fields from API response
        email: updatedOrg.email ?? orgData.email,
        phone: updatedOrg.phone ?? orgData.phone,
        address: updatedOrg.address ?? orgData.address,
        city: updatedOrg.city ?? orgData.city,
        state: updatedOrg.state ?? orgData.state,
        country: updatedOrg.country ?? orgData.country,
        postal_code: updatedOrg.postal_code ?? orgData.postal_code,
        contact_person: updatedOrg.contact_person ?? orgData.contact_person,
        website: updatedOrg.website ?? orgData.website,
        currency_symbol: orgData.currency_symbol,
        map_provider: updatedOrg.map_provider ?? orgData.map_provider,
        allow_negative_stock: updatedOrg.accounting_settings?.allow_negative_stock ?? orgData.allow_negative_stock ?? true,
      });

      // Invalidate ALL organization-related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'organizations'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      ]);

      // Wait for queries to refetch
      await queryClient.refetchQueries({ queryKey: ['auth', 'organizations', user?.id] });

      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(t('organization.errors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof OrganizationData, value: string) => {
    if (!orgData) return;
    setOrgData({ ...orgData, [field]: value });
  };

  const handleCurrencyChange = (currency: Currency) => {
    if (!orgData) return;
    setOrgData({
      ...orgData,
      currency: currency.code,
      currency_symbol: currency.symbol
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{t('organization.errors.notFound')}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general' as const, label: t('organization.tabs.general', 'Général'), icon: Building },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Building className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('organization.title')}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
           <Button
             onClick={async () => {
               const url = await getMarketplaceUrl(`/sellers/${orgData.slug}`);
               window.open(url, '_blank', 'noopener,noreferrer');
             }}
             className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
           >
             <ExternalLink className="h-4 w-4" />
             <span className="hidden sm:inline">Preview on Marketplace</span>
             <span className="sm:hidden">Preview</span>
           </Button>
          {activeTab === 'general' && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? t('organization.saving') : t('organization.save')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {activeTab === 'general' && success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-green-600 dark:text-green-400">
            {t('organization.success')}
          </p>
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.sections.basicInfo')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.name')} *
              </label>
              <input
                type="text"
                value={orgData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.slug')}
              </label>
              <input
                type="text"
                value={orgData.slug}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                placeholder={t('organization.placeholders.slug')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('organization.fields.slugHelper')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.description')}
              </label>
              <textarea
                value={orgData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.description')}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.sections.contactInfo')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.contactPerson')}
              </label>
              <input
                type="text"
                value={orgData.contact_person || ''}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.contactPerson')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                {t('organization.fields.email')}
              </label>
              <input
                type="email"
                value={orgData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.email')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                {t('organization.fields.phone')}
              </label>
              <input
                type="tel"
                value={orgData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.phone')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="inline h-4 w-4 mr-1" />
                {t('organization.fields.website')}
              </label>
              <input
                type="url"
                value={orgData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.website')}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <MapPin className="inline h-5 w-5 mr-2" />
            {t('organization.sections.address')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.address')}
              </label>
              <input
                type="text"
                value={orgData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.address')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.city')}
              </label>
              <input
                type="text"
                value={orgData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.city')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.state')}
              </label>
              <input
                type="text"
                value={orgData.state || ''}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.state')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.postalCode')}
              </label>
              <input
                type="text"
                value={orgData.postal_code || ''}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('organization.placeholders.postalCode')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('organization.fields.country')}
              </label>
              <select
                value={orgData.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('organization.placeholders.selectCountry')}</option>
                <option value="Morocco">{t('organization.countries.morocco')}</option>
                <option value="France">{t('organization.countries.france')}</option>
                <option value="Spain">{t('organization.countries.spain')}</option>
                <option value="Tunisia">{t('organization.countries.tunisia')}</option>
                <option value="Algeria">{t('organization.countries.algeria')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.sections.regionalSettings')}
          </h3>
          <CurrencySelector
            value={orgData.currency || DEFAULT_CURRENCY}
            onChange={handleCurrencyChange}
            disabled={saving}
          />
        </div>

        {/* Map Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <MapIcon className="inline h-5 w-5 mr-2" />
            {t('organization.sections.mapConfiguration', 'Map Configuration')}
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('organization.mapProviderDescription', 'Select the tile source for map backgrounds.')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Default provider card */}
              <Button
                type="button"
                disabled={saving}
                onClick={() => setOrgData({ ...orgData, map_provider: 'default' })}
                className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left ${
                  (orgData.map_provider || 'default') === 'default'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {(orgData.map_provider || 'default') === 'default' && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">
                    &#10003;
                  </span>
                )}
                <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('organization.mapProviderDefault', 'Default (OpenStreetMap / ESRI)')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('organization.mapProviderDefaultDesc', 'Free, no API key required. Good general-purpose satellite and street tiles.')}
                </span>
              </Button>

              {/* Mapbox provider card */}
              <Button
                type="button"
                disabled={saving}
                onClick={() => setOrgData({ ...orgData, map_provider: 'mapbox' })}
                className={`relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left ${
                  orgData.map_provider === 'mapbox'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {orgData.map_provider === 'mapbox' && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">
                    &#10003;
                  </span>
                )}
                <MapIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('organization.mapProviderMapbox', 'Mapbox')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('organization.mapProviderMapboxDesc', 'Higher-quality satellite imagery. Requires an API token.')}
                </span>
              </Button>
            </div>

            {/* Mapbox token warning */}
            {orgData.map_provider === 'mapbox' && !import.meta.env.VITE_MAPBOX_TOKEN && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('organization.mapProviderTokenWarning', 'Mapbox requires a VITE_MAPBOX_TOKEN environment variable. The map will fall back to default tiles until one is configured.')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sales & Stock Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('organization.sections.salesStock', 'Ventes & Stock')}
            </h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('organization.settings.allowNegativeStock', 'Permettre la vente sans stock')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('organization.settings.allowNegativeStockDesc', 'Si désactivé, les devis bloqueront les articles dont le stock est insuffisant')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => orgData && setOrgData({ ...orgData, allow_negative_stock: !(orgData.allow_negative_stock ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                (orgData?.allow_negative_stock ?? true) ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                (orgData?.allow_negative_stock ?? true) ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Organization Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.sections.status')}
          </h3>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              orgData.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : orgData.status === 'inactive'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {orgData.status === 'active' && t('organization.status.active')}
              {orgData.status === 'inactive' && t('organization.status.inactive')}
              {orgData.status === 'suspended' && t('organization.status.suspended')}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('organization.status.contactSupport')}
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default OrganizationSettings;
