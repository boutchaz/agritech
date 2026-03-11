import React, { useState, useEffect, useRef } from 'react';
import { Save, User, Mail, Phone, Globe, Camera, AlertCircle, Loader2, Lock, Eye, EyeOff, Shield, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../lib/api/users';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { useTranslation } from 'react-i18next';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfileSettings: React.FC = () => {
  const { user, currentOrganization, userRole } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timezones = [
    { value: 'UTC', label: t('profile.timezones.utc') },
    { value: 'Africa/Casablanca', label: t('profile.timezones.morocco') },
    { value: 'Europe/Paris', label: t('profile.timezones.france') },
    { value: 'Europe/Madrid', label: t('profile.timezones.spain') },
    { value: 'Africa/Tunis', label: t('profile.timezones.tunisia') },
    { value: 'Africa/Algiers', label: t('profile.timezones.algeria') }
  ];

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
    { value: 'es', label: 'Español' }
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await usersApi.getMe();

        if (data) {
          setProfile(data);
        } else {
          // Profile should exist, but if not, set defaults
          setProfile({
            id: user.id,
            email: user.email,
            timezone: 'UTC',
            language: 'fr'
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(t('profile.errors.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, t]);

  const handleSave = async () => {
    if (!profile || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedProfile = await usersApi.updateMe({
        full_name: profile.full_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        timezone: profile.timezone,
        language: profile.language,
      });

      setProfile(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t('profile.errors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t('profile.errors.passwordMismatch'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError(t('profile.errors.passwordTooShort'));
      return;
    }

    setChangingPassword(true);
    setError(null);

    try {
      await usersApi.changePassword(passwordData.newPassword);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordChange(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || t('profile.errors.passwordChangeError'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setAvatarError(t('profile.errors.invalidFileType'));
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError(t('profile.errors.fileTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const { avatar_url } = await usersApi.uploadAvatar(file);

      if (profile) {
        setProfile({ ...profile, avatar_url });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAvatarError(t('profile.errors.uploadError'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      await usersApi.removeAvatar();

      if (profile) {
        setProfile({ ...profile, avatar_url: undefined });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error removing avatar:', err);
      setAvatarError(t('profile.errors.removeError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{t('profile.errors.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <User className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('profile.title')}
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? t('profile.saving') : t('profile.save')}</span>
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
            {t('profile.success')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.sections.personalInfo')}
          </h3>
          <div className="space-y-4">
            <FormField label={t('profile.fields.fullName')} htmlFor="full_name">
              <Input
                id="full_name"
                type="text"
                value={profile.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder={t('profile.placeholders.fullName')}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t('profile.fields.firstName')} htmlFor="first_name">
                <Input
                  id="first_name"
                  type="text"
                  value={profile.first_name || ''}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder={t('profile.placeholders.firstName')}
                />
              </FormField>
              <FormField label={t('profile.fields.lastName')} htmlFor="last_name">
                <Input
                  id="last_name"
                  type="text"
                  value={profile.last_name || ''}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder={t('profile.placeholders.lastName')}
                />
              </FormField>
            </div>

            <FormField label={<><Mail className="inline h-4 w-4 mr-1" /> {t('profile.fields.email')}</>} htmlFor="email" helper={t('profile.fields.emailHelper')}>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
              />
            </FormField>

            <FormField
              label={<><Shield className="inline h-4 w-4 mr-1" /> {t('profile.fields.role')}</>}
              htmlFor="role"
              helper={currentOrganization ? t('profile.fields.roleHelper', { orgName: currentOrganization.name }) : t('profile.fields.roleHelperOrg')}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  id="role"
                  type="text"
                  value={userRole?.role_display_name || userRole?.role_name || 'N/A'}
                  disabled
                  className="flex-1"
                />
                <span className={`px-3 py-2 rounded-md text-sm font-medium text-center whitespace-nowrap ${
                  userRole?.role_name === 'organization_admin'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                    : userRole?.role_name === 'farm_manager'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                    : userRole?.role_name === 'farm_worker'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : userRole?.role_name === 'day_laborer'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {userRole?.role_name === 'organization_admin' ? t('profile.roles.admin')
                    : userRole?.role_name === 'farm_manager' ? t('profile.roles.manager')
                    : userRole?.role_name === 'farm_worker' ? t('profile.roles.worker')
                    : userRole?.role_name === 'day_laborer' ? t('profile.roles.laborer')
                    : t('profile.roles.other')}
                </span>
              </div>
            </FormField>

            <FormField label={<><Phone className="inline h-4 w-4 mr-1" /> {t('profile.fields.phone')}</>} htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder={t('profile.placeholders.phone')}
              />
            </FormField>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.sections.preferences')}
          </h3>
          <div className="space-y-4">
            <FormField label={<><Globe className="inline h-4 w-4 mr-1" /> {t('profile.fields.timezone')}</>} htmlFor="timezone">
              <Select
                id="timezone"
                value={profile.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('profile.fields.language')} htmlFor="language">
              <Select
                id="language"
                value={profile.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.fields.profilePhoto')}
              </label>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <>
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('profile.removePhoto')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{t('profile.changePhoto')}</span>
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                    {t('profile.photoFormats')}
                  </p>
                  {avatarError && (
                    <p className="text-xs text-red-600 dark:text-red-400 text-center sm:text-left">
                      {avatarError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <Lock className="inline h-5 w-5 mr-2" />
            {t('profile.sections.security')}
          </h3>

          {!showPasswordChange ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{t('profile.password.title')}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('profile.password.lastModified')}
                </p>
              </div>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 border border-green-600 dark:border-green-400 rounded-lg"
              >
                {t('profile.password.change')}
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.password.current')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:text-white"
                    placeholder={t('profile.password.currentPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.password.new')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:text-white"
                    placeholder={t('profile.password.newPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.password.confirm')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:text-white"
                    placeholder={t('profile.password.confirmPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setError(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg order-2 sm:order-1"
                >
                  {t('profile.cancel')}
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  {changingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span>{changingPassword ? t('profile.password.changing') : t('profile.password.change')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
