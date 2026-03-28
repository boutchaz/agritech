/**
 * Account Settings Component
 *
 * Consolidated user account settings with 3 tabs:
 * - Profile: Personal info, avatar, role
 * - Preferences: Language, timezone, experience level, notifications
 * - Security: Password change
 *
 * This merges the previous Profile and Preferences pages.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  User,
  Mail,
  Phone,
  Globe,
  Camera,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Shield,
  X,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api/users';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useTranslation } from 'react-i18next';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExperienceLevelSelector } from '@/components/settings/ExperienceLevelSelector';
import UserAvatar from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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

type TabId = 'profile' | 'preferences' | 'security';

const AccountSettings: React.FC = () => {
  const { user, currentOrganization, userRole } = useAuth();
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Avatar state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    alerts: true,
    reports: false,
  });

  // Tabs configuration
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: t('account.tabs.profile', 'Profile'), icon: User },
    { id: 'preferences', label: t('account.tabs.preferences', 'Preferences'), icon: Globe },
    { id: 'security', label: t('account.tabs.security', 'Security'), icon: Lock },
  ];

  // Timezone and language options
  const timezones = [
    { value: 'UTC', label: t('profile.timezones.utc') },
    { value: 'Africa/Casablanca', label: t('profile.timezones.morocco') },
    { value: 'Europe/Paris', label: t('profile.timezones.france') },
    { value: 'Europe/Madrid', label: t('profile.timezones.spain') },
    { value: 'Africa/Tunis', label: t('profile.timezones.tunisia') },
    { value: 'Africa/Algiers', label: t('profile.timezones.algeria') },
  ];

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
    { value: 'es', label: 'Español' },
  ];

  // Load profile data
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
          // Initialize notifications from profile if available
          if (data.notification_preferences) {
            setNotifications({
              email: data.notification_preferences.email ?? true,
              push: data.notification_preferences.push ?? true,
              alerts: data.notification_preferences.alerts ?? true,
              reports: data.notification_preferences.reports ?? false,
            });
          }
        } else {
          setProfile({
            id: user.id,
            email: user.email,
            timezone: 'UTC',
            language: i18n.language || 'fr',
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
   
  }, [user?.id, i18n.language]);

  // Handle language change — immediately apply + persist to DB
  const handleLanguageChange = async (newLanguage: string) => {
    if (!profile) return;

    setProfile({ ...profile, language: newLanguage });

    // Immediately change i18n language
    await i18n.changeLanguage(newLanguage);

    // Set document direction for RTL languages
    if (isRTLLocale(newLanguage)) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = newLanguage.split('-')[0] || 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = newLanguage;
    }

    // Persist to DB immediately (don't wait for Save button)
    try {
      await usersApi.updateMe({ language: newLanguage });
    } catch (err) {
      console.warn('Failed to persist language to DB:', err);
    }
  };

  // Save profile
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
        notification_preferences: notifications,
      });

      setProfile(updatedProfile);

      // Invalidate auth profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile', user.id] });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t('profile.errors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Change password
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
        confirmPassword: '',
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : t('profile.errors.passwordChangeError'));
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  // Avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setAvatarError(t('profile.errors.invalidFileType'));
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError(t('profile.errors.fileTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const { avatar_url } = await usersApi.uploadAvatar(file);

      setProfile((prev) => prev ? { ...prev, avatar_url } : prev);
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile', user.id] });

      toast.success(t('profile.toast.photoUpdated', 'Profile photo updated'));
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAvatarError(t('profile.errors.uploadError'));
      toast.error(t('profile.toast.photoUpdateFailed', 'Failed to update photo'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_url || !user) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      await usersApi.removeAvatar();

      setProfile((prev) => prev ? { ...prev, avatar_url: undefined } : prev);
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile', user.id] });

      toast.success(t('profile.toast.photoRemoved', 'Profile photo removed'));
    } catch (err) {
      console.error('Error removing avatar:', err);
      setAvatarError(t('profile.errors.removeError'));
      toast.error(t('profile.toast.photoRemoveFailed', 'Failed to remove photo'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Camera capture
  const openCamera = async () => {
    setAvatarError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Wait for video element to mount, then attach stream
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setAvatarError(t('profile.errors.cameraAccessDenied', 'Camera access denied. Please allow camera permissions.'));
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop to center square
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      async (blob) => {
        if (!blob || !user) return;
        stopCamera();
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });

        setUploadingAvatar(true);
        try {
          const { avatar_url } = await usersApi.uploadAvatar(file);
          setProfile((prev) => (prev ? { ...prev, avatar_url } : prev));
          queryClient.invalidateQueries({ queryKey: ['auth', 'profile', user.id] });
          toast.success(t('profile.toast.photoUpdated', 'Profile photo updated'));
        } catch (err) {
          console.error('Error uploading captured photo:', err);
          setAvatarError(t('profile.errors.uploadError'));
          toast.error(t('profile.toast.photoUpdateFailed', 'Failed to update photo'));
        } finally {
          setUploadingAvatar(false);
        }
      },
      'image/jpeg',
      0.9,
    );
  };

  // Get role badge styles
  const getRoleBadgeStyles = (roleName: string) => {
    switch (roleName) {
      case 'organization_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'farm_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'farm_worker':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'day_laborer':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Get role display name
  const getRoleDisplayName = (roleName: string) => {
    switch (roleName) {
      case 'organization_admin':
        return t('profile.roles.admin');
      case 'farm_manager':
        return t('profile.roles.manager');
      case 'farm_worker':
        return t('profile.roles.worker');
      case 'day_laborer':
        return t('profile.roles.laborer');
      default:
        return t('profile.roles.other');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <User className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('account.title', 'Account Settings')}
          </h2>
        </div>
        <Button
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
        </Button>
      </div>

      {/* Error/Success Messages */}
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
          <p className="text-green-600 dark:text-green-400">{t('profile.success')}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <>
            {/* Avatar Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('profile.fields.profilePhoto')}
              </h3>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <UserAvatar
                    src={profile?.avatar_url}
                    firstName={profile?.first_name}
                    lastName={profile?.last_name}
                    email={user?.email}
                    size="xl"
                  />
                  {profile?.avatar_url && (
                    <Button
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="absolute -top-1 -end-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('profile.removePhoto')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-4 w-4" />
                      <span>{t('profile.uploadPhoto', 'Upload')}</span>
                    </Button>
                    <Button
                      onClick={openCamera}
                      disabled={uploadingAvatar}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-4 w-4" />
                      <span>{t('profile.takePhoto', 'Take Photo')}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-start">
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

                <FormField
                  label={
                    <>
                      <Mail className="inline h-4 w-4 mr-1" /> {t('profile.fields.email')}
                    </>
                  }
                  htmlFor="email"
                  helper={t('profile.fields.emailHelper')}
                >
                  <Input id="email" type="email" value={user?.email || ''} disabled />
                </FormField>

                <FormField
                  label={
                    <>
                      <Shield className="inline h-4 w-4 mr-1" /> {t('profile.fields.role')}
                    </>
                  }
                  htmlFor="role"
                  helper={
                    currentOrganization
                      ? t('profile.fields.roleHelper', { orgName: currentOrganization.name })
                      : t('profile.fields.roleHelperOrg')
                  }
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                      id="role"
                      type="text"
                      value={userRole?.role_display_name || userRole?.role_name || 'N/A'}
                      disabled
                      className="flex-1"
                    />
                    <span
                      className={`px-3 py-2 rounded-md text-sm font-medium text-center whitespace-nowrap ${
                        userRole ? getRoleBadgeStyles(userRole.role_name) : ''
                      }`}
                    >
                      {userRole ? getRoleDisplayName(userRole.role_name) : 'N/A'}
                    </span>
                  </div>
                </FormField>

                <FormField
                  label={
                    <>
                      <Phone className="inline h-4 w-4 mr-1" /> {t('profile.fields.phone')}
                    </>
                  }
                  htmlFor="phone"
                >
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
          </>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <>
            {/* Experience Level Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <ExperienceLevelSelector />
            </div>

            {/* Interface Preferences */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                {t('preferences.sections.interface')}
              </h3>
              <div className="space-y-6">
                <FormField label={t('preferences.fields.language')} htmlFor="pref_language">
                  <Select
                    id="pref_language"
                    value={profile.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label={
                    <>
                      <Globe className="inline h-4 w-4 mr-1" /> {t('profile.fields.timezone')}
                    </>
                  }
                  htmlFor="pref_timezone"
                >
                  <Select
                    id="pref_timezone"
                    value={profile.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('preferences.sections.notifications')}
              </h3>
              <div className="space-y-4">
                {[
                  { key: 'email', icon: Mail },
                  { key: 'push', icon: Bell },
                  { key: 'alerts', icon: AlertCircle },
                  { key: 'reports', icon: ShieldCheck },
                ].map(({ key, icon: _Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {t(`preferences.notifications.${key}.title`)}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t(`preferences.notifications.${key}.description`)}
                      </p>
                    </div>
                    <Switch
                      checked={notifications[key as keyof typeof notifications]}
                      onCheckedChange={(val) =>
                        setNotifications({ ...notifications, [key]: val })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('preferences.sections.dataPrivacy')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('preferences.dataPrivacy.analytics.title')}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('preferences.dataPrivacy.analytics.description')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>{t('preferences.dataPrivacy.privacyNote')}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <Lock className="inline h-5 w-5 mr-2" />
              {t('profile.sections.security')}
            </h3>

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.password.current')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:text-white"
                    placeholder={t('profile.password.currentPlaceholder')}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.password.new')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:text-white"
                    placeholder={t('profile.password.newPlaceholder')}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.password.confirm')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:text-white"
                    placeholder={t('profile.password.confirmPlaceholder')}
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password mismatch warning */}
              {passwordData.newPassword &&
                passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {t('profile.errors.passwordMismatch')}
                  </div>
                )}

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  onClick={handlePasswordChange}
                  disabled={
                    changingPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span>
                    {changingPassword
                      ? t('profile.password.changing')
                      : t('profile.password.change')}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('profile.takePhoto', 'Take Photo')}
              </h3>
              <Button
                onClick={stopCamera}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative bg-black aspect-square">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
            <div className="flex items-center justify-center gap-4 p-4">
              <Button
                onClick={stopCamera}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('app.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={capturePhoto}
                className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                {t('profile.capture', 'Capture')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
