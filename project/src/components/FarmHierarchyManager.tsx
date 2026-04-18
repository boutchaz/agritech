import React, { useState } from 'react';
import { farmsService } from '../services/farmsService';
import { useFarmHierarchy, useUserFarmRoles, type HierarchyFarm } from '../hooks/useFarmHierarchy';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Users,
  MapPin,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  UserPlus,
  TreePine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/ui/loader';


interface FarmHierarchyManagerProps {
  organizationId: string;
  currentUserId: string;
  onManageRoles?: (farmId: string, farmName: string) => void;
}

const FarmHierarchyManager = ({
  organizationId,
  currentUserId,
  onManageRoles
}: FarmHierarchyManagerProps) => {
  const roundToTwoDecimals = (value: number): number => Number(value.toFixed(2));
  const queryClient = useQueryClient();
  const [expandedFarms, setExpandedFarms] = useState<Set<string>>(new Set());
  const [showCreateFarm, setShowCreateFarm] = useState(false);
  const [_showManageRoles, setShowManageRoles] = useState<string | null>(null);
  const [selectedParentFarm, setSelectedParentFarm] = useState<string | null>(null);

  const [newFarm, setNewFarm] = useState({
    name: '',
    location: '',
    size: 0,
    size_unit: 'hectares',
    description: '',
    farm_type: 'main' as 'main' | 'sub',
    manager_id: ''
  });

  const { data: farms = [], isLoading: farmsLoading, error: farmsError } = useFarmHierarchy(organizationId);
  const { data: userRoles = [] } = useUserFarmRoles(currentUserId, farms);

  const createFarmMutation = useMutation({
    mutationFn: async (farmData: {
      name: string;
      location: string;
      size: number;
      size_unit: string;
      description: string;
      farm_type: 'main' | 'sub';
      parent_farm_id: string | null;
      manager_id: string | null;
    }) => {
      return farmsService.createFarm(farmData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-hierarchy'] });
      setNewFarm({
        name: '',
        location: '',
        size: 0,
        size_unit: 'hectares',
        description: '',
        farm_type: 'main',
        manager_id: ''
      });
      setSelectedParentFarm(null);
      setShowCreateFarm(false);
    },
  });

  const loading = farmsLoading || createFarmMutation.isPending;
  const error = farmsError?.message || createFarmMutation.error?.message || null;

  const toggleFarmExpansion = (farmId: string) => {
    const newExpanded = new Set(expandedFarms);
    if (newExpanded.has(farmId)) {
      newExpanded.delete(farmId);
    } else {
      newExpanded.add(farmId);
    }
    setExpandedFarms(newExpanded);
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();

    createFarmMutation.mutate({
      name: newFarm.name,
      location: newFarm.location,
      size: newFarm.size,
      size_unit: newFarm.size_unit,
      description: newFarm.description,
      farm_type: newFarm.farm_type,
      parent_farm_id: newFarm.farm_type === 'sub' ? selectedParentFarm : null,
      manager_id: newFarm.manager_id || null
    });
  };

  const renderFarmNode = (farm: HierarchyFarm, level: number = 0) => {
    const hasChildren = farm.sub_farms_count > 0;
    const isExpanded = expandedFarms.has(farm.farm_id);
    const userRole = userRoles.find(role => role.farm_id === farm.farm_id);

    return (
      <div key={farm.farm_id} className="ml-4">
        <div
          className={`flex items-center p-3 rounded-lg border ${farm.farm_type === 'main'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
            } ${level > 0 ? 'ml-6' : ''}`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {/* Expand/Collapse Button */}
          <Button
            onClick={() => toggleFarmExpansion(farm.farm_id)}
            className="mr-2 p-1 hover:bg-gray-200 rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-4 h-4" />
            )}
          </Button>

          {/* Farm Icon */}
          <div className="mr-3">
            {farm.farm_type === 'main' ? (
              <Building2 className="w-6 h-6 text-blue-600" />
            ) : (
              <TreePine className="w-5 h-5 text-green-600" />
            )}
          </div>

          {/* Farm Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{farm.farm_name}</h3>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{farm.farm_location}</span>
                  <span className="mx-2">•</span>
                  <span>{typeof farm.farm_size === 'number' ? farm.farm_size.toFixed(2) : farm.farm_size} hectares</span>
                  {farm.sub_farms_count > 0 && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{farm.sub_farms_count} sub-farm{farm.sub_farms_count > 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Manager Info */}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{farm.manager_name}</span>
                </div>

                {/* User Role Badge */}
                {userRole && (
                  <span className={`px-2 py-1 text-xs rounded-full ${userRole.role === 'main_manager'
                    ? 'bg-blue-100 text-blue-800'
                    : userRole.role === 'sub_manager'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    {userRole.role.replace('_', ' ')}
                  </span>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-1">
                  <Button
                    onClick={() => onManageRoles ? onManageRoles(farm.farm_id, farm.farm_name) : setShowManageRoles(farm.farm_id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Manage Roles"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                  <Button
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Edit Farm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    className="p-1 hover:bg-red-200 rounded"
                    title="Delete Farm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {farms
              .filter(childFarm => childFarm.parent_farm_id === farm.farm_id)
              .map(childFarm => renderFarmNode(childFarm, level + 1))
            }
          </div>
        )}
      </div>
    );
  };

  const getMainFarms = () => farms.filter(farm => farm.farm_type === 'main');

  if (loading) {
    return (
      <SectionLoader />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farm Hierarchy</h2>
          <p className="text-gray-600">Manage your organization's farm structure and management roles</p>
        </div>
        <Button variant="blue"
          onClick={() => setShowCreateFarm(true)}
          className="flex items-center px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Farm
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Farm Hierarchy Tree */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Farm Structure</h3>
        {getMainFarms().length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No farms found. Create your first farm to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {getMainFarms().map(farm => renderFarmNode(farm))}
          </div>
        )}
      </div>

      {/* Create Farm Modal */}
      {showCreateFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Farm</h3>

            <form onSubmit={handleCreateFarm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farm Type
                </label>
                <select
                  value={newFarm.farm_type}
                  onChange={(e) => setNewFarm(prev => ({
                    ...prev,
                    farm_type: e.target.value as 'main' | 'sub'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="main">Main Farm</option>
                  <option value="sub">Sub Farm</option>
                </select>
              </div>

              {newFarm.farm_type === 'sub' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Farm
                  </label>
                  <select
                    value={selectedParentFarm || ''}
                    onChange={(e) => setSelectedParentFarm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={newFarm.farm_type === 'sub'}
                  >
                    <option value="">Select Parent Farm</option>
                    {farms.filter(f => f.farm_type === 'main').map(farm => (
                      <option key={farm.farm_id} value={farm.farm_id}>
                        {farm.farm_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farm Name *
                </label>
                <input
                  type="text"
                  value={newFarm.name}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={newFarm.location}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFarm.size}
                    onChange={(e) => setNewFarm(prev => ({ ...prev, size: roundToTwoDecimals(parseFloat(e.target.value) || 0) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newFarm.size_unit}
                    onChange={(e) => setNewFarm(prev => ({ ...prev, size_unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hectares">Hectares</option>
                    <option value="acres">Acres</option>
                    <option value="square_meters">Square Meters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newFarm.description}
                  onChange={(e) => setNewFarm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateFarm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button variant="blue" type="submit" disabled={loading} className="px-4 py-2 rounded-md" >
                  {loading ? 'Creating...' : 'Create Farm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmHierarchyManager;
