import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Mail, Phone } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { farmsService } from '../../services/farmsService';

interface EditFarmManagerModalProps {
  farmId: string;
  farmName: string;
  currentManagerName?: string;
  currentManagerEmail?: string;
  currentManagerPhone?: string;
  onClose: () => void;
}

const EditFarmManagerModal: React.FC<EditFarmManagerModalProps> = ({
  farmId,
  farmName,
  currentManagerName,
  currentManagerEmail,
  currentManagerPhone,
  onClose,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    manager_name: currentManagerName || '',
    manager_email: currentManagerEmail || '',
    manager_phone: currentManagerPhone || '',
  });

  const updateManagerMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      return farmsService.updateFarm(farmId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      toast.success(t('farmHierarchy.farm.managerUpdated'));
      onClose();
    },
    onError: (error: Error) => {
      console.error('Error updating farm manager:', error);
      toast.error(t('farmHierarchy.farm.managerUpdateError'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateManagerMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('farmHierarchy.farm.editManager')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('farmHierarchy.farm.for')}: <span className="font-semibold text-gray-900 dark:text-white">{farmName}</span>
            </p>
          </div>

          {/* Manager Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('farmHierarchy.farm.managerName')} *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.manager_name}
                onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('farmHierarchy.farm.managerNamePlaceholder')}
                required
              />
            </div>
          </div>

          {/* Manager Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('farmHierarchy.farm.managerEmail')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('farmHierarchy.farm.managerEmailPlaceholder')}
              />
            </div>
          </div>

          {/* Manager Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('farmHierarchy.farm.managerPhone')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.manager_phone}
                onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('farmHierarchy.farm.managerPhonePlaceholder')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t('app.cancel')}
            </button>
            <button
              type="submit"
              disabled={updateManagerMutation.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {updateManagerMutation.isPending ? t('farmHierarchy.farm.updating') : t('farmHierarchy.farm.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFarmManagerModal;
