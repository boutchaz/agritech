import React, { useState, useEffect } from 'react';
import { Save, Building, Mail, Phone, MapPin, Globe, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <Building className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {t('organization.title')}
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Configure your organization identity, contact details and regional preferences
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline"
            onClick={async () => {
              const url = await getMarketplaceUrl(`/sellers/${orgData.slug}`);
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Preview Marketplace</span>
            <span className="sm:hidden">Preview</span>
          </Button>

          {activeTab === 'general' && (
            <Button 
              variant="default" 
              onClick={handleSave} 
              disabled={saving} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all duration-300"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? t('organization.saving') : t('organization.save')}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <AlertTitle className="text-sm font-black uppercase tracking-tight">Error</AlertTitle>
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (activeTab === 'general') && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{t('organization.success')}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 w-fit overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-slate-700"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            {/* Basic Information */}
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('organization.sections.basicInfo')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.name')} *</Label>
                    <Input
                      type="text"
                      value={orgData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 focus:ring-emerald-500/20"
                      placeholder={t('organization.placeholders.name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.slug')}</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={orgData.slug}
                        disabled
                        className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold px-5 opacity-60 cursor-not-allowed"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('organization.fields.slugHelper')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.description')}</Label>
                  <textarea
                    value={orgData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-medium text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                    placeholder={t('organization.placeholders.description')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('organization.sections.address')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.address')}</Label>
                  <Input
                    type="text"
                    value={orgData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                    placeholder={t('organization.placeholders.address')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.city')}</Label>
                    <Input
                      type="text"
                      value={orgData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                      placeholder={t('organization.placeholders.city')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.state')}</Label>
                    <Input
                      type="text"
                      value={orgData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                      placeholder={t('organization.placeholders.state')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.postalCode')}</Label>
                    <Input
                      type="text"
                      value={orgData.postal_code || ''}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                      placeholder={t('organization.placeholders.postalCode')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.country')}</Label>
                    <Select
                      value={orgData.country || ''}
                      onValueChange={(val) => handleInputChange('country', val)}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5">
                        <SelectValue placeholder={t('organization.placeholders.selectCountry')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="Morocco" className="font-bold text-xs uppercase">{t('organization.countries.morocco')}</SelectItem>
                        <SelectItem value="France" className="font-bold text-xs uppercase">{t('organization.countries.france')}</SelectItem>
                        <SelectItem value="Spain" className="font-bold text-xs uppercase">{t('organization.countries.spain')}</SelectItem>
                        <SelectItem value="Tunisia" className="font-bold text-xs uppercase">{t('organization.countries.tunisia')}</SelectItem>
                        <SelectItem value="Algeria" className="font-bold text-xs uppercase">{t('organization.countries.algeria')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-8">
            {/* Contact Information */}
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                    <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('organization.sections.contactInfo')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.contactPerson')}</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      type="text"
                      value={orgData.contact_person || ''}
                      onChange={(e) => handleInputChange('contact_person', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold pl-11 pr-5"
                      placeholder={t('organization.placeholders.contactPerson')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      type="email"
                      value={orgData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold pl-11 pr-5"
                      placeholder={t('organization.placeholders.email')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.phone')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      type="tel"
                      value={orgData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold pl-11 pr-5"
                      placeholder={t('organization.placeholders.phone')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.fields.website')}</Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      type="url"
                      value={orgData.website || ''}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold pl-11 pr-5"
                      placeholder={t('organization.placeholders.website')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional & Stock Settings */}
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    System Preferences
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('organization.sections.regionalSettings')}</Label>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                    <CurrencySelector
                      value={orgData.currency || DEFAULT_CURRENCY}
                      onChange={handleCurrencyChange}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                        {t('organization.settings.allowNegativeStock', 'Allow Negative Stock')}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight max-w-[200px]">
                        {t('organization.settings.allowNegativeStockDesc', 'Enable sales when stock is unavailable')}
                      </p>
                    </div>
                    <Switch 
                      checked={orgData.allow_negative_stock ?? true} 
                      onCheckedChange={(val) => setOrgData({ ...orgData, allow_negative_stock: val })}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                        Current Status
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={cn(
                          "border-none font-black text-[9px] tracking-[0.15em] px-3 py-1 uppercase",
                          orgData.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'
                        )}>
                          {orgData.status === 'active' ? t('organization.status.active') : t('organization.status.suspended')}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 max-w-[120px] text-right italic">
                      {t('organization.status.contactSupport')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSettings;
