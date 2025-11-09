import React, { useState, useEffect } from 'react';
import { Save, Building, Mail, Phone, MapPin, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import CurrencySelector from './CurrencySelector';
import type { Currency } from '../utils/currencies';
import { useTranslation } from 'react-i18next';

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
}

const OrganizationSettings: React.FC = () => {
  const { currentOrganization, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', currentOrganization.id)
          .single();

        if (error) throw error;
        setOrgData(data);
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
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          email: orgData.email,
          phone: orgData.phone,
          address: orgData.address,
          city: orgData.city,
          state: orgData.state,
          country: orgData.country,
          postal_code: orgData.postal_code,
          contact_person: orgData.contact_person,
          website: orgData.website,
          description: orgData.description,
          currency: orgData.currency,
          currency_symbol: orgData.currency_symbol,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      // Invalidate ALL organization-related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'organizations'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      ]);

      // Wait for queries to refetch
      await queryClient.refetchQueries({ queryKey: ['auth', 'organizations', user?.id] });

      setSuccess(true);

      // Force reload after a delay to ensure new data is loaded
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('organization.title')}
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? t('organization.saving') : t('organization.save')}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-green-600 dark:text-green-400">
            {t('organization.success')}
          </p>
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
            value={orgData.currency || 'MAD'}
            onChange={handleCurrencyChange}
            disabled={saving}
          />
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
    </div>
  );
};

export default OrganizationSettings;