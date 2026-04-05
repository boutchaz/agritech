import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Search, X, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { farmsService } from '../../services/farmsService';
import { organizationUsersApi, type OrganizationUser } from '../../lib/api/organization-users';
import { ResponsiveDialog } from '../ui/responsive-dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../hooks/useAuth';
import { SectionLoader } from '@/components/ui/loader';


interface UserOptionProps {
  user: OrganizationUser;
  isSelected: boolean;
  onSelect: (userId: string) => void;
}

const UserOption = ({ user, isSelected, onSelect }: UserOptionProps) => {
  const { t } = useTranslation();
  const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim();
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Button
      type="button"
      onClick={() => onSelect(user.user_id)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {/* Avatar - same pattern as UsersSettings */}
      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
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

      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900 dark:text-white">
          {fullName || t('farmHierarchy.farm.unnamedUser')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {user.profile?.email || t('farmHierarchy.farm.noEmail')}
        </p>
      </div>

      {isSelected && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">
          <Check className="w-4 h-4" />
        </div>
      )}
    </Button>
  );
};


interface EditFarmManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  farmName: string;
  currentManagerName?: string;
  currentManagerEmail?: string;
  currentManagerPhone?: string;
}

const EditFarmManagerModal = ({
  open,
  onOpenChange,
  farmId,
  farmName,
  currentManagerName,
  currentManagerEmail,
  currentManagerPhone,
}: EditFarmManagerModalProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [managerPhone, setManagerPhone] = useState(currentManagerPhone || '');

  // Fetch organization users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['organization-users', currentOrganization?.id],
    queryFn: () => organizationUsersApi.getAllWithProfiles(currentOrganization!.id),
    enabled: open && !!currentOrganization?.id,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setManagerPhone(currentManagerPhone || '');
      // Find and pre-select current manager
      const currentManager = users.find(
        (u) => u.profile?.email === currentManagerEmail
      );
      setSelectedUserId(currentManager?.user_id || null);
    }
  }, [open, currentManagerPhone, currentManagerEmail, users]);

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.toLowerCase();
    const email = (user.profile?.email || '').toLowerCase();
    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower)
    );
  });

  // Get selected user details
  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  const updateManagerMutation = useMutation({
    mutationFn: (data: { manager_name: string; manager_email: string; manager_phone?: string }) => {
      return farmsService.updateFarm(farmId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      toast.success(t('farmHierarchy.farm.managerUpdated'));
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('Error updating farm manager:', error);
      toast.error(t('farmHierarchy.farm.managerUpdateError'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.profile) {
      toast.error(t('farmHierarchy.farm.selectManagerError'));
      return;
    }

    const fullName = `${selectedUser.profile.first_name || ''} ${selectedUser.profile.last_name || ''}`.trim();

    updateManagerMutation.mutate({
      manager_name: fullName,
      manager_email: selectedUser.profile.email || '',
      manager_phone: managerPhone || undefined,
    });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('farmHierarchy.farm.editManager')}
      description={
        <span>
          {t('farmHierarchy.farm.for')}: <span className="font-semibold text-gray-900 dark:text-white">{farmName}</span>
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('app.cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-manager-form"
            disabled={!selectedUser || updateManagerMutation.isPending}
          >
            {updateManagerMutation.isPending ? t('farmHierarchy.farm.updating') : t('farmHierarchy.farm.update')}
          </Button>
        </div>
      }
      className="sm:max-w-md"
    >
      <form id="edit-manager-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Search Users */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('farmHierarchy.farm.searchUsersPlaceholder') || 'Search by name or email...'}
            className="pl-9"
          />
        </div>

        {/* Users List */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <ScrollArea className="h-64">
            {isLoadingUsers ? (
              <SectionLoader />
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <User className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery
                    ? t('farmHierarchy.farm.noUsersFound')
                    : t('farmHierarchy.farm.noUsersInOrganization')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map((user) => (
                  <UserOption
                    key={user.user_id}
                    user={user}
                    isSelected={selectedUserId === user.user_id}
                    onSelect={setSelectedUserId}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Selected User Details */}
        {selectedUser?.profile && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('farmHierarchy.farm.managerName')} *
              </span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white pl-6">
              {selectedUser.profile.first_name} {selectedUser.profile.last_name}
            </p>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('farmHierarchy.farm.managerEmail')}
              </span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white pl-6">
              {selectedUser.profile.email || t('farmHierarchy.farm.noEmail')}
            </p>

            {/* Optional Phone */}
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('farmHierarchy.farm.managerPhone')}
              </span>
            </div>
            <Input
              type="tel"
              value={managerPhone}
              onChange={(e) => setManagerPhone(e.target.value)}
              placeholder={t('farmHierarchy.farm.managerPhonePlaceholder') || 'Ex: +1234567890'}
              className="pl-6"
            />
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
};

export default EditFarmManagerModal;
