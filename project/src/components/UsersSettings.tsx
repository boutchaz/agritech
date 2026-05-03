import {  useState, useEffect  } from "react";
import { createPortal } from "react-dom";
import { Users, Plus, X, Trash2, Mail, Shield, UserCheck, UserX, Crown, Settings, Eye, Key, Copy, Check, AlertCircle, Clock, RefreshCw, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from './ui/Input';
import type { Role } from '../types/auth';
import { Can, useCan } from '../lib/casl';
import { LimitWarning } from './authorization/LimitWarning';
import UserAvatar from '@/components/ui/UserAvatar';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { organizationUsersApi } from '../lib/api/organization-users';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionLoader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/radix-select';


interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email?: string;
  };
  role: {
    name: string;
    display_name: string;
    level: number;
  };
}

interface InviteUser {
  email: string;
  role_id: string;
  first_name: string;
  last_name: string;
}

const UsersSettings = () => {
  const { currentOrganization, user: currentUser, userRole } = useAuth();
  const { can } = useCan();
  const { t, i18n } = useTranslation();
  const isRTL = isRTLLocale(i18n.language);
  const dateLocale = isRTL ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [_editingUser, _setEditingUser] = useState<OrganizationUser | null>(null);

  // Password management state
  const [passwordDialogUser, setPasswordDialogUser] = useState<OrganizationUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordExpiresAt, setPasswordExpiresAt] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const [inviteUser, setInviteUser] = useState<InviteUser>({
    email: '',
    role_id: '',
    first_name: '',
    last_name: ''
  });

  // Fetch organization users
  const fetchUsers = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      const data = await organizationUsersApi.getAllWithProfiles(currentOrganization.id);
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(t('users.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch available roles
  const fetchRoles = async () => {
    try {
      const { rolesApi } = await import('../lib/api/roles');
      const data = await rolesApi.getAll();
      setRoles(data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  // Filter roles based on current user's level (can't assign roles higher than their own)
  const getAvailableRoles = () => {
    if (!userRole || !roles.length) return [];
    return roles.filter(role => {
      // System admins can assign any role
      if (userRole.role_name === 'system_admin') return true;
      // Others can only assign roles at their level or lower
      return role.level >= userRole.role_level;
    });
  };

  // Invite user to organization
  const handleInviteUser = async () => {
    if (!currentOrganization?.id || !inviteUser.email || !inviteUser.role_id) return;

    try {
      setLoading(true);
      setError(null);

      // Routed through NestJS now (POST /api/v1/organization-users/invite).
      // The previous Supabase Edge Function call was blocked by CORS from
      // the dashboard origin and the function wasn't owned by this repo.
      const result = await organizationUsersApi.invite(
        {
          email: inviteUser.email,
          role_id: inviteUser.role_id,
          organization_id: currentOrganization.id,
          first_name: inviteUser.first_name,
          last_name: inviteUser.last_name,
        },
        currentOrganization.id,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to invite user');
      }

      // Show success message
      if ((result.message ?? '').includes('Invitation email sent')) {
        toast.success(t('users.invite.success'), {
          description: t('users.invite.successDescription', { email: inviteUser.email }),
          duration: 5000,
        });
      } else {
        toast.success(result.message);
      }

      setShowInviteUser(false);
      setInviteUser({ email: '', role_id: '', first_name: '', last_name: '' });
      await fetchUsers();
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : t('users.invite.failed'));
      toast.error(t('users.invite.failed'), {
        description: err instanceof Error ? err.message : t('users.invite.failedDescription'),
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user role
  const handleUpdateUserRole = async (userId: string, newRoleId: string) => {
    if (!currentOrganization?.id) return;

    try {
      await organizationUsersApi.updateRole(currentOrganization.id, userId, newRoleId);
      await fetchUsers();
      toast.success(t('users.updateRole.success'));
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(t('users.updateRole.failed'));
      toast.error(t('users.updateRole.failed'));
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    if (!currentOrganization?.id) return;

    try {
      await organizationUsersApi.updateStatus(currentOrganization.id, userId, !isActive);
      await fetchUsers();
      toast.success(t('users.updateStatus.success', {
        status: !isActive ? t('users.status.active') : t('users.status.inactive')
      }));
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(t('users.updateStatus.failed'));
      toast.error(t('users.updateStatus.failed'));
    }
  };

  // Remove user from organization
  const handleRemoveUser = (user: OrganizationUser) => {
    if (!currentOrganization?.id || user.user_id === currentUser?.id) return;

    const fullName =
      `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() ||
      user.profile?.email ||
      t('users.defaultName');

    showConfirm(
      t('users.remove.confirm', `Remove ${fullName}?`),
      async () => {
        try {
          await organizationUsersApi.removeUser(currentOrganization.id, user.user_id);
          await fetchUsers();
          toast.success(t('users.remove.success'));
        } catch (err) {
          console.error('Error removing user:', err);
          setError(t('users.remove.failed'));
          toast.error(t('users.remove.failed'));
        }
      },
      {
        variant: 'destructive',
        description: t(
          'users.remove.confirmDescription',
          'They will lose access to this organization immediately. This cannot be undone.',
        ),
      },
    );
  };

  // View temporary password for a worker user
  const handleViewPassword = async (user: OrganizationUser) => {
    if (!currentOrganization?.id) return;

    setPasswordLoading(true);
    setPasswordDialogUser(user);
    setTempPassword('');
    setCopiedToClipboard(false);

    try {
      const result = await organizationUsersApi.getTempPassword(currentOrganization.id, user.user_id);
      setTempPassword(result.temp_password);
      setPasswordExpiresAt(result.expires_at);
    } catch (err) {
      console.error('Error fetching temporary password:', err);
      toast.error(err instanceof Error ? err.message : t('users.password.fetchFailed'));
      setPasswordDialogUser(null);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Reset password for a user
  const handleResetPassword = async () => {
    if (!currentOrganization?.id || !passwordDialogUser) return;

    setPasswordLoading(true);

    try {
      const result = await organizationUsersApi.resetPassword(currentOrganization.id, passwordDialogUser.user_id);
      setTempPassword(result.temp_password);
      setPasswordExpiresAt(result.expires_at);
      toast.success(t('users.password.resetSuccess'));
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error(err instanceof Error ? err.message : t('users.password.resetFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
    toast.success(t('users.password.copied'));
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [currentOrganization?.id]);

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'system_admin': return <Crown className="h-4 w-4 text-purple-600" />;
      case 'organization_admin': return <Settings className="h-4 w-4 text-blue-600" />;
      case 'farm_manager': return <Shield className="h-4 w-4 text-green-600" />;
      case 'farm_worker': return <UserCheck className="h-4 w-4 text-yellow-600" />;
      case 'day_laborer': return <UserCheck className="h-4 w-4 text-gray-600" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <UserCheck className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'system_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'organization_admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'farm_manager': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'farm_worker': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'day_laborer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!can('read', 'User')) {
    return (
      <div className="min-w-0">
        <div className="text-center py-12">
          <UserX className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {t('users.accessDenied.title')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('users.accessDenied.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">
              {t('users.title')}
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('users.description')}
          </p>
        </div>
        
        <Can
          I="invite"
          a="User"
          fallback={
            <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
              {t('users.upgradeToInvite')}
            </div>
          }
        >
          <Button 
            variant="default" 
            onClick={() => setShowInviteUser(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('users.invite.button')}
          </Button>
        </Can>
      </div>

      {/* Limit Warning & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <LimitWarning
            resourceType="users"
            currentCount={users.length}
          />
        </div>
        <div className="lg:col-span-4">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Seats</span>
            <span className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-sm">{users.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <AlertTitle className="text-sm font-semibold uppercase tracking-tight">Error</AlertTitle>
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="py-20">
          <SectionLoader />
        </div>
      ) : users.length === 0 ? (
        <Card className="rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
            {t('users.empty.title')}
          </h3>
          <p className="text-sm font-medium text-slate-400 mt-2 max-w-sm mx-auto">
            {t('users.empty.description')}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-4">
            {users.map((user) => {
              const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || t('users.defaultName');
              const isSelf = user.user_id === currentUser?.id;
              const isSysAdmin = userRole?.role_name === 'system_admin';
              const hasUpdatePerm = can('update', 'User');
              const hasRemovePerm = can('remove', 'User');
              const canEditRow = hasUpdatePerm && (!isSelf || isSysAdmin);
              const canRemoveRow = hasRemovePerm && !isSelf;
              const showActions = hasUpdatePerm || hasRemovePerm;

              return (
                <Card key={user.id} className="rounded-3xl border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-1 rounded-2xl border-2 border-slate-50 dark:border-slate-800">
                        <UserAvatar
                          src={user.profile?.avatar_url}
                          firstName={user.profile?.first_name}
                          lastName={user.profile?.last_name}
                          email={user.profile?.email}
                          size="lg"
                          className="h-14 w-14 rounded-xl shadow-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                            {fullName}
                          </span>
                          {user.user_id === currentUser?.id && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[8px] font-medium uppercase px-1.5 py-0">SELF</Badge>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate uppercase tracking-widest">
                          {user.profile?.email}
                        </div>
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border-none font-semibold text-[8px] tracking-widest uppercase", getRoleColor(user.role.name))}>
                            {getRoleIcon(user.role.name)}
                            {user.role.display_name}
                          </div>
                          <Badge className={cn(
                            "border-none font-semibold text-[8px] tracking-widest px-2 py-0.5 uppercase",
                            user.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30'
                          )}>
                            {user.is_active ? t('users.status.active') : t('users.status.inactive')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions — render if user has either permission, even on own row.
                        Self gets disabled buttons with a hint instead of an empty section. */}
                    {showActions && (
                      <div className="space-y-2 mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          {hasUpdatePerm && (
                            <Select
                              value={user.role_id}
                              onValueChange={(val) => handleUpdateUserRole(user.user_id, val)}
                              disabled={!canEditRow}
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold text-[10px] uppercase tracking-widest flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200">
                                {getAvailableRoles().map(role => (
                                  <SelectItem key={role.id} value={role.id} className="font-bold text-[10px] uppercase tracking-widest">
                                    {role.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {hasUpdatePerm && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleUserStatus(user.user_id, user.is_active)}
                              className={cn(
                                "h-10 w-10 rounded-xl",
                                user.is_active ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                              )}
                              disabled={!canEditRow}
                              title={!canEditRow && isSelf ? t('users.actions.cannotModifySelf', 'You cannot deactivate your own account') : undefined}
                            >
                              {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                          )}

                          {canEditRow && user.role?.name === 'farm_worker' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewPassword(user)}
                              className="h-10 w-10 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          )}

                          {hasRemovePerm && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveUser(user)}
                              className="h-10 w-10 text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl"
                              disabled={!canRemoveRow}
                              title={!canRemoveRow && isSelf ? t('users.actions.cannotRemoveSelf', 'You cannot remove your own account') : undefined}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {isSelf && (
                          <p className="text-[10px] text-slate-400 italic">
                            {t('users.actions.selfHint', 'Editing your own role and status is restricted')}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <Card className="hidden md:block rounded-[2.5rem] border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <Table dir={isRTL ? 'rtl' : 'ltr'}>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <TableRow>
                  <TableHead className="px-8 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {t('users.table.user')}
                  </TableHead>
                  <TableHead className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {t('users.table.role')}
                  </TableHead>
                  <TableHead className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {t('users.table.status')}
                  </TableHead>
                  <TableHead className="px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {t('users.table.joinedOn')}
                  </TableHead>
                  <TableHead className="px-8 py-5 text-end text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {t('users.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white dark:bg-slate-800">
                {users.map((user) => {
                  const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || t('users.defaultName');
                  const isSelf = user.user_id === currentUser?.id;
                  const isSysAdmin = userRole?.role_name === 'system_admin';
                  const hasUpdatePerm = can('update', 'User');
                  const hasRemovePerm = can('remove', 'User');
                  const canEditRow = hasUpdatePerm && (!isSelf || isSysAdmin);
                  const canRemoveRow = hasRemovePerm && !isSelf;
                  const showActions = hasUpdatePerm || hasRemovePerm;

                  return (
                    <TableRow key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <UserAvatar
                            src={user.profile?.avatar_url}
                            firstName={user.profile?.first_name}
                            lastName={user.profile?.last_name}
                            email={user.profile?.email}
                            size="md"
                            className="rounded-xl shadow-sm border border-slate-100 dark:border-slate-700"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                              <span className="truncate">{fullName}</span>
                              {user.user_id === currentUser?.id && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[8px] font-medium px-1.5 py-0 h-4">YOU</Badge>
                              )}
                            </div>
                            <div className="truncate text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              {user.profile?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-xl border-none font-semibold text-[9px] tracking-widest uppercase", getRoleColor(user.role.name))}>
                          {getRoleIcon(user.role.name)}
                          {user.role.display_name}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <Badge className={cn(
                          "border-none font-semibold text-[9px] tracking-widest px-3 py-1 uppercase",
                          user.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30'
                        )}>
                          {user.is_active ? t('users.status.active') : t('users.status.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest tabular-nums">
                          {new Date(user.created_at).toLocaleDateString(dateLocale, {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        {!showActions ? (
                          <div className="text-end text-[10px] text-slate-400 italic">—</div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            {hasUpdatePerm && (
                              <Select
                                value={user.role_id}
                                onValueChange={(val) => handleUpdateUserRole(user.user_id, val)}
                                disabled={!canEditRow}
                              >
                                <SelectTrigger
                                  className="h-9 w-40 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 font-bold text-[10px] uppercase tracking-widest"
                                  title={!canEditRow && isSelf ? t('users.actions.cannotChangeSelfRole', 'You cannot change your own role') : undefined}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                  {getAvailableRoles().map(role => (
                                    <SelectItem key={role.id} value={role.id} className="font-bold text-[10px] uppercase tracking-widest">
                                      {role.display_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {hasUpdatePerm && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleUserStatus(user.user_id, user.is_active)}
                                className={cn(
                                  "h-9 w-9 rounded-xl transition-all",
                                  user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                                )}
                                disabled={!canEditRow}
                                title={!canEditRow && isSelf ? t('users.actions.cannotModifySelf', 'You cannot deactivate your own account') : undefined}
                              >
                                {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </Button>
                            )}

                            {canEditRow && user.role?.name === 'farm_worker' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewPassword(user)}
                                className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            )}

                            {hasRemovePerm && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveUser(user)}
                                className="h-9 w-9 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                disabled={!canRemoveRow}
                                title={!canRemoveRow && isSelf ? t('users.actions.cannotRemoveSelf', 'You cannot remove your own account') : undefined}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <CardHeader className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('users.invite.title')}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowInviteUser(false);
                    setInviteUser({ email: '', role_id: '', first_name: '', last_name: '' });
                    setError(null);
                  }}
                  className="h-10 w-10 rounded-xl text-slate-400"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                {t('users.invite.description')}
              </p>

              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1">{t('users.invite.fields.email')} *</Label>
                  <Input
                    type="email"
                    value={inviteUser.email}
                    onChange={(e) => setInviteUser({ ...inviteUser, email: e.target.value })}
                    className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                    placeholder={t('users.invite.placeholders.email')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1">{t('users.invite.fields.firstName')}</Label>
                    <Input
                      type="text"
                      value={inviteUser.first_name}
                      onChange={(e) => setInviteUser({ ...inviteUser, first_name: e.target.value })}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                      placeholder={t('users.invite.placeholders.firstName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1">{t('users.invite.fields.lastName')}</Label>
                    <Input
                      type="text"
                      value={inviteUser.last_name}
                      onChange={(e) => setInviteUser({ ...inviteUser, last_name: e.target.value })}
                      className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5"
                      placeholder={t('users.invite.placeholders.lastName')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1">{t('users.invite.fields.role')} *</Label>
                  <Select
                    value={inviteUser.role_id}
                    onValueChange={(val) => setInviteUser({ ...inviteUser, role_id: val })}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 font-bold px-5">
                      <SelectValue placeholder={t('users.invite.placeholders.selectRole')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {getAvailableRoles().map(role => (
                        <SelectItem key={role.id} value={role.id} className="font-bold text-[10px] uppercase tracking-widest">
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-widest">{error}</p>
                </div>
              )}

              <div className="pt-6 flex flex-col sm:flex-row justify-end gap-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowInviteUser(false);
                    setInviteUser({ email: '', role_id: '', first_name: '', last_name: '' });
                    setError(null);
                  }}
                  className="h-12 px-8 rounded-2xl text-[10px] font-medium uppercase tracking-widest text-slate-400"
                >
                  {t('users.invite.cancel')}
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleInviteUser} 
                  disabled={!inviteUser.email || !inviteUser.role_id || loading}
                  className="h-12 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {loading ? t('users.invite.inviting') : t('users.invite.invite')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      , document.body)}

      {/* Password Management Dialog - Using same modern modal style */}
      {passwordDialogUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden">
            <CardHeader className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                    {t('users.password.title')}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPasswordDialogUser(null);
                    setTempPassword('');
                    setPasswordExpiresAt('');
                    setCopiedToClipboard(false);
                  }}
                  className="h-10 w-10 rounded-xl text-slate-400"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
                {t('users.password.description', { email: passwordDialogUser.profile?.email })}
              </p>

              {passwordLoading ? (
                <div className="py-10">
                  <SectionLoader />
                </div>
              ) : tempPassword ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-1">{t('users.password.tempPassword')}</Label>
                    <div className="flex items-center gap-2 p-1 pl-5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner group">
                      <code className="flex-1 font-mono text-base font-semibold tracking-wider text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {tempPassword}
                      </code>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={handleCopyPassword}
                        className={cn(
                          "h-10 w-10 rounded-xl transition-all",
                          copiedToClipboard ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 shadow-sm"
                        )}
                      >
                        {copiedToClipboard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 px-1">
                      <Clock className="h-3 w-3 text-slate-300" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {t('users.password.expiresAt', { date: new Date(passwordExpiresAt).toLocaleString(dateLocale) })}
                      </p>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-100 text-amber-800 rounded-2xl">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-[10px] font-medium uppercase tracking-widest leading-tight">
                      {t('users.password.warning')}
                    </AlertDescription>
                  </Alert>

                  <div className="pt-4 flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={() => setPasswordDialogUser(null)}
                      className="h-11 px-6 rounded-xl text-[10px] font-medium uppercase tracking-widest text-slate-400"
                    >
                      {t('users.password.close')}
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={handleResetPassword} 
                      disabled={passwordLoading}
                      className="h-11 px-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-[10px] uppercase tracking-widest shadow-xl"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      {t('users.password.reset')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-6">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full w-fit mx-auto border border-slate-100 dark:border-slate-800">
                    <Key className="h-10 w-10 text-slate-200" />
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">
                    {t('users.password.noPassword')}
                  </p>
                  <Button 
                    variant="default" 
                    onClick={handleResetPassword} 
                    disabled={passwordLoading}
                    className="h-12 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs uppercase tracking-widest shadow-lg shadow-blue-100"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {passwordLoading ? t('users.password.resetting') : t('users.password.reset')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      , document.body)}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default UsersSettings;
