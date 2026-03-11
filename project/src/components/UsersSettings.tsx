import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Trash2, Mail, Shield, UserCheck, UserX, Crown, Settings, Eye, Key, Copy, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import type { Role } from '../types/auth';
import { Can, useCan } from '../lib/casl';
import { LimitWarning } from './authorization/LimitWarning';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { organizationUsersApi } from '../lib/api/organization-users';

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

const UsersSettings: React.FC = () => {
  const { currentOrganization, user: currentUser, userRole } = useAuth();
  const { can } = useCan();
  const { t, i18n } = useTranslation();

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

      const accessToken = useAuthStore.getState().getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inviteUser.email,
            role_id: inviteUser.role_id,
            organization_id: currentOrganization.id,
            first_name: inviteUser.first_name,
            last_name: inviteUser.last_name
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to invite user');
      }

      // Show success message
      if (result.message.includes('Invitation email sent')) {
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
  const handleRemoveUser = async (userId: string) => {
    if (!currentOrganization?.id || userId === currentUser?.id) return;

    if (!confirm(t('users.remove.confirm'))) return;

    try {
      await organizationUsersApi.removeUser(currentOrganization.id, userId);
      await fetchUsers();
      toast.success(t('users.remove.success'));
    } catch (err) {
      console.error('Error removing user:', err);
      setError(t('users.remove.failed'));
      toast.error(t('users.remove.failed'));
    }
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
      <div className="p-6">
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('users.title')}
          </h2>
          {currentOrganization && (
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              {currentOrganization.name}
            </span>
          )}
        </div>
        <Can
          I="invite"
          a="User"
          fallback={
            <div className="text-sm text-gray-500 italic">
              {t('users.upgradeToInvite')}
            </div>
          }
        >
          <button
            onClick={() => setShowInviteUser(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>{t('users.invite.button')}</span>
          </button>
        </Can>
      </div>

      {/* Limit Warning */}
      <LimitWarning
        resourceType="users"
        currentCount={users.length}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('users.description')}
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('users.count', { count: users.length })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {t('users.empty.title')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('users.empty.description')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
          {users.map((user) => {
            const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || t('users.defaultName');
            const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
            const canModify = can('update', 'User') &&
              (user.user_id !== currentUser?.id || userRole?.role_name === 'system_admin');

            return (
              <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    {user.profile?.avatar_url ? (
                      <img
                        src={user.profile.avatar_url}
                        alt={fullName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {fullName}
                      </span>
                      {user.user_id === currentUser?.id && (
                        <span className="text-xs text-gray-500">({t('users.you')})</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.profile?.email}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {getRoleIcon(user.role.name)}
                        <span className={`px-2 text-xs font-semibold rounded-full ${getRoleColor(user.role.name)}`}>
                          {user.role.display_name}
                        </span>
                      </div>
                      <span className={`px-2 text-xs font-semibold rounded-full
                        ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                      >
                        {user.is_active ? t('users.status.active') : t('users.status.inactive')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {t('users.table.joinedOn')}: {new Date(user.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {(canModify || (can('remove', 'User') && user.user_id !== currentUser?.id)) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t dark:border-gray-700 flex-wrap">
                    {canModify && (
                      <>
                        <select
                          value={user.role_id}
                          onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value)}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-1 min-w-0"
                          disabled={user.user_id === currentUser?.id}
                        >
                          {getAvailableRoles().map(role => (
                            <option key={role.id} value={role.id}>
                              {role.display_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleToggleUserStatus(user.user_id, user.is_active)}
                          className={`p-2 rounded-lg ${user.is_active ?
                            'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                            'text-green-600 bg-green-50 dark:bg-green-900/20'}`}
                          title={user.is_active ? t('users.actions.deactivate') : t('users.actions.activate')}
                          disabled={user.user_id === currentUser?.id}
                        >
                          {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        {user.role?.name === 'farm_worker' && (
                          <button
                            onClick={() => handleViewPassword(user)}
                            className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                            title={t('users.actions.viewPassword')}
                          >
                            <Key className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                    {can('remove', 'User') && user.user_id !== currentUser?.id && (
                      <button
                        onClick={() => handleRemoveUser(user.user_id)}
                        className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"
                        title={t('users.actions.remove')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('users.table.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('users.table.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('users.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('users.table.joinedOn')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('users.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => {
                const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || t('users.defaultName');
                const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                const canModify = can('update', 'User') &&
                  (user.user_id !== currentUser?.id || userRole?.role_name === 'system_admin');

                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          {user.profile?.avatar_url ? (
                            <img
                              src={user.profile.avatar_url}
                              alt={fullName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {initials}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                            {fullName}
                            {user.user_id === currentUser?.id && (
                              <span className="ml-2 text-xs text-gray-500">({t('users.you')})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.profile?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role.name)}
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role.name)}`}>
                          {user.role.display_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                      >
                        {user.is_active ? t('users.status.active') : t('users.status.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {canModify && (
                          <>
                            {/* Role Dropdown */}
                            <select
                              value={user.role_id}
                              onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value)}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              disabled={user.user_id === currentUser?.id}
                            >
                              {getAvailableRoles().map(role => (
                                <option key={role.id} value={role.id}>
                                  {role.display_name}
                                </option>
                              ))}
                            </select>

                            {/* Toggle Status */}
                            <button
                              onClick={() => handleToggleUserStatus(user.user_id, user.is_active)}
                              className={`p-1 rounded ${user.is_active ?
                                'text-yellow-600 hover:text-yellow-800 dark:text-yellow-400' :
                                'text-green-600 hover:text-green-800 dark:text-green-400'}`}
                              title={user.is_active ? t('users.actions.deactivate') : t('users.actions.activate')}
                              disabled={user.user_id === currentUser?.id}
                            >
                              {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>

                            {/* Password Management - for worker users */}
                            {user.role?.name === 'farm_worker' && (
                              <button
                                onClick={() => handleViewPassword(user)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                title={t('users.actions.viewPassword')}
                              >
                                <Key className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}

                        {can('remove', 'User') && user.user_id !== currentUser?.id && (
                          <button
                            onClick={() => handleRemoveUser(user.user_id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                            title={t('users.actions.remove')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Invite User Modal */}
      {showInviteUser && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('users.invite.title')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowInviteUser(false);
                  setInviteUser({ email: '', role_id: '', first_name: '', last_name: '' });
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('users.invite.description')}
            </p>

            <div className="space-y-4">
              <div>
                <FormField label={t('users.invite.fields.email')} htmlFor="invite_email" required>
                  <Input
                    id="invite_email"
                    type="email"
                    value={inviteUser.email}
                    onChange={(e) => setInviteUser({ ...inviteUser, email: e.target.value })}
                    placeholder={t('users.invite.placeholders.email')}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={t('users.invite.fields.firstName')} htmlFor="invite_first_name">
                  <Input
                    id="invite_first_name"
                    type="text"
                    value={inviteUser.first_name}
                    onChange={(e) => setInviteUser({ ...inviteUser, first_name: e.target.value })}
                    placeholder={t('users.invite.placeholders.firstName')}
                  />
                </FormField>
                <FormField label={t('users.invite.fields.lastName')} htmlFor="invite_last_name">
                  <Input
                    id="invite_last_name"
                    type="text"
                    value={inviteUser.last_name}
                    onChange={(e) => setInviteUser({ ...inviteUser, last_name: e.target.value })}
                    placeholder={t('users.invite.placeholders.lastName')}
                  />
                </FormField>
              </div>

              <div>
                <FormField label={t('users.invite.fields.role')} htmlFor="invite_role" required>
                  <Select
                    id="invite_role"
                    value={inviteUser.role_id}
                    onChange={(e) => setInviteUser({ ...inviteUser, role_id: e.target.value })}
                  >
                    <option value="">{t('users.invite.placeholders.selectRole')}</option>
                    {getAvailableRoles().map(role => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => {
                  setShowInviteUser(false);
                  setInviteUser({ email: '', role_id: '', first_name: '', last_name: '' });
                  setError(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                {t('users.invite.cancel')}
              </button>
              <button
                onClick={handleInviteUser}
                disabled={!inviteUser.email || !inviteUser.role_id || loading}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('users.invite.inviting') : t('users.invite.invite')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      {passwordDialogUser && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('users.password.title')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setPasswordDialogUser(null);
                  setTempPassword('');
                  setPasswordExpiresAt('');
                  setCopiedToClipboard(false);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('users.password.description', { email: passwordDialogUser.profile?.email })}
            </p>

            {passwordLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : tempPassword ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('users.password.tempPassword')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-white">
                      {tempPassword}
                    </code>
                    <button
                      onClick={handleCopyPassword}
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title={t('users.password.copy')}
                    >
                      {copiedToClipboard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('users.password.expiresAt', { date: new Date(passwordExpiresAt).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US') })}
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {t('users.password.warning')}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => {
                      setPasswordDialogUser(null);
                      setTempPassword('');
                      setPasswordExpiresAt('');
                      setCopiedToClipboard(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    {t('users.password.close')}
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={passwordLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  >
                    {t('users.password.reset')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('users.password.noPassword')}
                </p>
                <button
                  onClick={handleResetPassword}
                  disabled={passwordLoading}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {passwordLoading ? t('users.password.resetting') : t('users.password.reset')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSettings;
