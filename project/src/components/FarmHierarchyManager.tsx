import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  Settings,
  TreePine
} from 'lucide-react';

interface Farm {
  farm_id: string;
  farm_name: string;
  farm_location: string;
  farm_size: number;
  farm_type: 'main' | 'sub';
  parent_farm_id: string | null;
  hierarchy_level: number;
  manager_name: string;
  sub_farms_count: number;
  is_active: boolean;
}

interface FarmRole {
  farm_id: string;
  farm_name: string;
  role: string;
  permissions: any;
  assigned_at: string;
  is_active: boolean;
}

interface FarmHierarchyManagerProps {
  organizationId: string;
  currentUserId: string;
  onManageRoles?: (farmId: string, farmName: string) => void;
}

const FarmHierarchyManager: React.FC<FarmHierarchyManagerProps> = ({ 
  organizationId, 
  currentUserId,
  onManageRoles
}) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [userRoles, setUserRoles] = useState<FarmRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFarms, setExpandedFarms] = useState<Set<string>>(new Set());
  const [showCreateFarm, setShowCreateFarm] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState<string | null>(null);
  const [selectedParentFarm, setSelectedParentFarm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New farm form state
  const [newFarm, setNewFarm] = useState({
    name: '',
    location: '',
    size: 0,
    size_unit: 'hectares',
    description: '',
    farm_type: 'main' as 'main' | 'sub',
    manager_id: ''
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchFarmHierarchy();
      // Wait for farms to be loaded before fetching roles
      await fetchUserRoles();
    };
    loadData();
  }, [organizationId]);

  // Refetch roles when farms change (for the basic roles implementation)
  useEffect(() => {
    if (farms.length > 0 && userRoles.length === 0) {
      fetchUserRoles();
    }
  }, [farms]);

  const fetchFarmHierarchy = async () => {
    try {
      // Try hierarchy function first
      const { data, error } = await supabase.rpc('get_farm_hierarchy_tree', {
        org_uuid: organizationId
      });

      if (error && error.code === 'PGRST202') {
        // Function doesn't exist, fallback to basic farm fetch
        await fetchBasicFarms();
        return;
      }

      if (error) throw error;
      setFarms(data || []);
    } catch (error: any) {
      console.error('Error fetching farm hierarchy:', error);
      // Try fallback method
      await fetchBasicFarms();
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicFarms = async () => {
    try {
      // Use basic get_organization_farms function
      const { data, error } = await supabase.rpc('get_organization_farms', {
        org_uuid: organizationId
      });

      if (error) throw error;

      // Transform to hierarchy format
      const hierarchyFarms: Farm[] = (data || []).map((farm: any) => ({
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        farm_location: farm.farm_location,
        farm_size: farm.farm_size || 0,
        farm_type: farm.farm_type || 'main',
        parent_farm_id: farm.parent_farm_id || null,
        hierarchy_level: farm.hierarchy_level || 1,
        manager_name: farm.manager_name || 'No Manager',
        sub_farms_count: farm.sub_farms_count || 0,
        is_active: true
      }));

      setFarms(hierarchyFarms);
    } catch (error: any) {
      console.error('Error fetching basic farms:', error);
      setError('Failed to load farms');
    }
  };

  const fetchUserRoles = async () => {
    try {
      // Try the hierarchy function first, fallback to basic implementation
      const { data, error } = await supabase.rpc('get_user_farm_roles', {
        user_uuid: currentUserId
      });

      if (error && error.code === 'PGRST202') {
        // Function doesn't exist, implement basic roles system
        await createBasicUserRoles();
        return;
      }

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
      // Fallback to basic roles
      await createBasicUserRoles();
    }
  };

  const createBasicUserRoles = async () => {
    try {
      // Get organization membership to determine basic role
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', currentUserId)
        .single();

      if (orgError) {
        console.error('Error fetching organization role:', orgError);
        setUserRoles([]);
        return;
      }

      // Create basic roles based on organization membership
      const basicRoles: FarmRole[] = farms.map(farm => ({
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        role: orgUser.role === 'admin' ? 'main_manager' :
              orgUser.role === 'manager' ? 'sub_manager' : 'supervisor',
        permissions: {
          manage_farms: orgUser.role === 'admin',
          manage_sub_farms: orgUser.role !== 'member',
          manage_users: orgUser.role === 'admin',
          view_reports: true,
          manage_crops: true,
          manage_parcels: orgUser.role !== 'member',
          manage_inventory: orgUser.role !== 'member',
          manage_activities: true
        },
        assigned_at: new Date().toISOString(),
        is_active: true
      }));

      setUserRoles(basicRoles);
    } catch (error) {
      console.error('Error creating basic roles:', error);
      setUserRoles([]);
    }
  };

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
    setLoading(true);
    setError(null);

    try {
      let farmId: string;

      if (newFarm.farm_type === 'sub' && selectedParentFarm) {
        // Create sub-farm using the hierarchy function
        const { data, error } = await supabase.rpc('create_sub_farm', {
          parent_farm_id_param: selectedParentFarm,
          sub_farm_name: newFarm.name,
          sub_farm_location: newFarm.location,
          sub_farm_area: newFarm.size,
          area_unit_param: newFarm.size_unit,
          sub_farm_description: newFarm.description,
          manager_id_param: newFarm.manager_id || null
        });

        if (error) throw error;
        farmId = data;
      } else {
        // Create main farm
        const { data, error } = await supabase
          .from('farms')
          .insert({
            organization_id: organizationId,
            name: newFarm.name,
            location: newFarm.location,
            size: newFarm.size,
            area_unit: newFarm.size_unit,
            description: newFarm.description,
            farm_type: 'main',
            hierarchy_level: 1,
            manager_id: newFarm.manager_id || null
          })
          .select()
          .single();

        if (error) throw error;
        farmId = data.id;
      }

      // Reset form and refresh data
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

      console.log('Farm created successfully with ID:', farmId);
      await fetchFarmHierarchy();
    } catch (error: any) {
      console.error('Error creating farm:', error);
      setError(error.message || 'Failed to create farm');
    } finally {
      setLoading(false);
    }
  };

  const renderFarmNode = (farm: Farm, level: number = 0) => {
    const hasChildren = farm.sub_farms_count > 0;
    const isExpanded = expandedFarms.has(farm.farm_id);
    const userRole = userRoles.find(role => role.farm_id === farm.farm_id);

    return (
      <div key={farm.farm_id} className="ml-4">
        <div 
          className={`flex items-center p-3 rounded-lg border ${
            farm.farm_type === 'main' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-gray-50 border-gray-200'
          } ${level > 0 ? 'ml-6' : ''}`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleFarmExpansion(farm.farm_id)}
            className="mr-2 p-1 hover:bg-gray-200 rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

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
                  <span>{farm.farm_size} {farm.farm_type === 'main' ? 'hectares' : 'hectares'}</span>
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
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    userRole.role === 'main_manager' 
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
                  <button
                    onClick={() => onManageRoles ? onManageRoles(farm.farm_id, farm.farm_name) : setShowManageRoles(farm.farm_id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Manage Roles"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Edit Farm"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-red-200 rounded"
                    title="Delete Farm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading farm hierarchy...</span>
      </div>
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
        <button
          onClick={() => setShowCreateFarm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Farm
        </button>
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
                    step="0.1"
                    value={newFarm.size}
                    onChange={(e) => setNewFarm(prev => ({ ...prev, size: parseFloat(e.target.value) || 0 }))}
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
                <button
                  type="button"
                  onClick={() => setShowCreateFarm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Farm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmHierarchyManager;
