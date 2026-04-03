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
  FileText,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api/users';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/radix-select';
import { useTranslation } from 'react-i18next';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExperienceLevelSelector } from '@/components/settings/ExperienceLevelSelector';
import UserAvatar from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {t('account.title', 'Account Settings')}
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage your personal information, preferences and security
          </p>
        </div>
        
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
          {saving ? t('profile.saving') : t('profile.save')}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <AlertTitle className="text-sm font-black uppercase tracking-tight">Error</AlertTitle>
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{t('profile.success')}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
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

      {/* Tab Content */}
      <div className="space-y-8 min-h-[600px]">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Avatar & Identity Card */}
            <div className="lg:col-span-4 space-y-8">
              <Card className="rounded-[2rem] border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50 p-6">
                  <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Profile Identity</CardTitle>
                </CardHeader>
                <CardContent className="p-8 flex flex-col items-center">
                  <div className="relative group/avatar cursor-pointer mb-6" onClick={() => fileInputRef.current?.click()}>
                    <div className="p-1 rounded-full border-4 border-emerald-50 dark:border-emerald-900/20 group-hover:border-emerald-100 transition-all duration-500">
                      <UserAvatar
                        src={profile?.avatar_url}
                        firstName={profile?.first_name}
                        lastName={profile?.last_name}
                        email={user?.email}
                        size="2xl"
                        className="w-32 h-32 text-4xl shadow-xl"
                      />
                    </div>
                    
                    <div className="absolute inset-0 bg-emerald-600/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                      <Camera className="h-8 w-8 mb-1" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Change Photo</span>
                    </div>

                    {profile?.avatar_url && (
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }} 
                        disabled={uploadingAvatar} 
                        className="absolute -top-1 -right-1 h-8 w-8 rounded-full border-4 border-white dark:border-slate-800 shadow-lg z-10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-full flex items-center justify-center z-20 backdrop-blur-sm">
                        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-2 mb-8">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || user?.email?.split('@')[0]}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge className={cn("border-none font-black text-[9px] tracking-[0.15em] px-3 py-1 uppercase", userRole ? getRoleBadgeStyles(userRole.role_name) : '')}>
                        {userRole ? getRoleDisplayName(userRole.role_name) : 'No Role'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-black tracking-[0.15em] px-3 py-1 uppercase border-slate-200 text-slate-400">
                        {currentOrganization?.name || 'No Org'}
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      <Camera className="h-3.5 w-3.5 mr-2" />
                      {t('profile.uploadPhoto', 'Upload New')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={openCamera}
                      disabled={uploadingAvatar}
                      className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all"
                    >
                      <Camera className="h-3.5 w-3.5 mr-2" />
                      {t('profile.takePhoto', 'Snap via Camera')}
                    </Button>
                  </div>
                  
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </CardContent>
              </Card>
            </div>

            {/* Right: Detailed Information */}
            <div className="lg:col-span-8 space-y-8">
              <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t('profile.sections.personalInfo')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Full Display Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name || ''}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 focus:ring-emerald-500/20"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                          id="phone"
                          value={profile.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold pl-11 pr-5 focus:ring-emerald-500/20"
                          placeholder="+212 600 000 000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">First Name</Label>
                      <Input
                        id="first_name"
                        value={profile.first_name || ''}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profile.last_name || ''}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input
                        value={user?.email || ''}
                        disabled
                        className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold pl-11 pr-5 opacity-60 cursor-not-allowed"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.fields.emailHelper')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="max-w-4xl space-y-8">
            {/* Experience Level */}
            <div className="p-1 rounded-[2.5rem] bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden">
              <ExperienceLevelSelector />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Regional Preferences */}
              <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                      <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t('preferences.sections.interface')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('preferences.fields.language')}</Label>
                    <Select
                      id="pref_language"
                      value={profile.language}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value} className="rounded-lg font-bold uppercase text-[10px] tracking-widest">{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t('profile.fields.timezone')}</Label>
                    <Select
                      id="pref_timezone"
                      value={profile.timezone}
                      onValueChange={(val) => handleInputChange('timezone', val)}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 max-h-[300px]">
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value} className="rounded-lg font-bold text-xs">{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Data & Privacy */}
              <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                      <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t('preferences.sections.dataPrivacy')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 group hover:border-purple-200 transition-all">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {t('preferences.dataPrivacy.analytics.title')}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight pr-4">
                        {t('preferences.dataPrivacy.analytics.description')}
                      </p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      {t('preferences.dataPrivacy.privacyNote')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications Card - Full Width */}
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4 border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t('preferences.sections.notifications')}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your alert delivery channels</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {[
                  { key: 'email', icon: Mail, color: 'text-blue-500' },
                  { key: 'push', icon: Bell, color: 'text-emerald-500' },
                  { key: 'alerts', icon: AlertCircle, color: 'text-rose-500' },
                  { key: 'reports', icon: ShieldCheck, color: 'text-indigo-500' },
                ].map(({ key, icon: Icon, color }) => (
                  <div key={key} className="flex items-start justify-between group">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                          {t(`preferences.notifications.${key}.title`)}
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight max-w-[200px]">
                          {t(`preferences.notifications.${key}.description`)}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications[key as keyof typeof notifications]}
                      onCheckedChange={(val) =>
                        setNotifications({ ...notifications, [key]: val })
                      }
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="max-w-2xl">
            <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4 bg-slate-50/30 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t('profile.sections.security')}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Update your account authentication details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                    {t('profile.password.current')}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 pr-12 focus:ring-rose-500/20"
                      placeholder={t('profile.password.currentPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                      {t('profile.password.new')}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 pr-12 focus:ring-emerald-500/20"
                        placeholder={t('profile.password.newPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                      {t('profile.password.confirm')}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5 pr-12 focus:ring-emerald-500/20"
                        placeholder={t('profile.password.confirmPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password mismatch warning */}
                {passwordData.newPassword &&
                  passwordData.confirmPassword &&
                  passwordData.newPassword !== passwordData.confirmPassword && (
                    <div className="flex items-center gap-3 text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('profile.errors.passwordMismatch')}</span>
                    </div>
                  )}

                <Separator className="opacity-50" />

                {/* Submit Button */}
                <div className="pt-4 flex justify-end">
                  <Button 
                    variant="default" 
                    onClick={handlePasswordChange} 
                    disabled={ changingPassword || !passwordData.newPassword || !passwordData.confirmPassword } 
                    className="h-12 px-10 rounded-[1.25rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl"
                  >
                    {changingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    {changingPassword
                      ? t('profile.password.changing')
                      : t('profile.password.change')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <Camera className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {t('profile.takePhoto', 'Capture Profile')}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={stopCamera}
                className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative bg-slate-950 aspect-square overflow-hidden group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 border-[16px] border-white/10 rounded-full pointer-events-none"></div>
            </div>
            <div className="flex items-center justify-center gap-4 p-8 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                onClick={stopCamera}
                variant="ghost"
                className="px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                {t('app.cancel', 'Cancel')}
              </Button>
              <Button 
                variant="default" 
                onClick={capturePhoto} 
                className="px-10 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none"
              >
                <Zap className="h-4 w-4 mr-2" />
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
