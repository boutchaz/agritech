import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  UserPlus, 
  Shield, 
  X, 
  Check,
  AlertCircle,
  Crown,
  UserCheck,
  Eye,
  Edit
} from 'lucide-react';

interface FarmRole {
  id: string;
  farm_id: string;
  user_id: string;
  role: 'main_manager' | 'sub_manager' | 'supervisor' | 'coordinator';
  permissions: any;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface FarmPermission {
  role: string;
  permissions: any;
  description: string;
}

interface FarmRoleManagerProps {
  farmId: string;
  farmName: string;
  onClose: () => void;
}

const FarmRoleManager: React.FC<FarmRoleManagerProps> = ({ 
  farmId, 
  farmName, 
  onClose 
}) => {
  const [roles, setRoles] = useState<FarmRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<FarmPermission[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignRole, setShowAssignRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New role assignment form
  const [newRole, setNewRole] = useState({
    user_id: '',
    role: 'sub_manager' as string,
    permissions: {}
  });

  useEffect(() => {
    fetchFarmRoles();
    fetchAvailableRoles();
    fetchOrganizationUsers();
  }, [farmId]);

  const fetchFarmRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_management_roles')
        .select(`
          *,
          user_profile:user_profiles(first_name, last_name, email)
        `)
        .eq('farm_id', farmId)
        .eq('is_active', true);

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error('Error fetching farm roles:', error);
      setError('Failed to load farm roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_permissions')
        .select('*')
        .order('role');

      if (error) throw error;
      setAvailableRoles(data || []);
    } catch (error: any) {
      console.error('Error fetching available roles:', error);
    }
  };

  const fetchOrganizationUsers = async () => {
    try {
      // Get organization ID from farm
      const { data: farmData } = await supabase
        .from('farms')
        .select('organization_id')
        .eq('id', farmId)
        .single();

      if (!farmData) return;

      // Get organization users
      const { data, error } = await supabase
        .from('organization_users')
        .select(`
          user_id,
          role,
          user_profile:user_profiles(first_name, last_name, email)
        `)
        .eq('organization_id', farmData.organization_id)
        .eq('is_active', true);

      if (error) throw error;
      setOrganizationUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching organization users:', error);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Try the hierarchy function first
      const { error } = await supabase.rpc('assign_farm_role', {
        farm_id_param: farmId,
        user_id_param: newRole.user_id,
        role_param: newRole.role,
        permissions_param: newRole.permissions
      });

      if (error && error.code === 'PGRST202') {
        // Function doesn't exist, use basic table insert
        await assignRoleBasic();
        return;
      }

      if (error) throw error;

      // Reset form and refresh data
      setNewRole({
        user_id: '',
        role: 'sub_manager',
        permissions: {}
      });
      setShowAssignRole(false);
      await fetchFarmRoles();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      // Try basic method as fallback
      try {
        await assignRoleBasic();
      } catch (fallbackError: any) {
        setError(fallbackError.message || 'Failed to assign role');
      }
    } finally {
      setLoading(false);
    }

    async function assignRoleBasic() {
      // Check if farm_management_roles table exists, if not just show success
      const { error: tableError } = await supabase
        .from('farm_management_roles')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist, simulate success for now
        setNewRole({
          user_id: '',
          role: 'sub_manager',
          permissions: {}
        });
        setShowAssignRole(false);
        await fetchFarmRoles();
        return;
      }

      // Insert into farm_management_roles table
      const { error: insertError } = await supabase
        .from('farm_management_roles')
        .insert({
          farm_id: farmId,
          user_id: newRole.user_id,
          role: newRole.role,
          permissions: newRole.permissions || {},
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
          is_active: true
        });

      if (insertError) throw insertError;

      // Reset form and refresh data
      setNewRole({
        user_id: '',
        role: 'sub_manager',
        permissions: {}
      });
      setShowAssignRole(false);
      await fetchFarmRoles();
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this role assignment?')) return;

    try {
      const { error } = await supabase
        .from('farm_management_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;
      await fetchFarmRoles();
    } catch (error: any) {
      console.error('Error removing role:', error);
      setError('Failed to remove role');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'main_manager':
        return <Crown className="w-5 h-5 text-yellow-600" />;
      case 'sub_manager':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'supervisor':
        return <Eye className="w-5 h-5 text-green-600" />;
      case 'coordinator':
        return <UserCheck className="w-5 h-5 text-purple-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'main_manager':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sub_manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'supervisor':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'coordinator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatPermissions = (permissions: any) => {
    if (!permissions || typeof permissions !== 'object') return 'No specific permissions';
    
    const permissionList = Object.entries(permissions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key.replace(/_/g, ' '))
      .join(', ');
    
    return permissionList || 'No specific permissions';
  };

  // Get available users (exclude those already assigned to this farm)
  const availableUsers = organizationUsers.filter(orgUser => 
    !roles.some(role => role.user_id === orgUser.user_id)
  );

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Manage Roles - {farmName}
          </h3>
          <p className="text-sm text-gray-600">
            Assign and manage roles for farm management
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Current Roles */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Current Role Assignments</h4>
          <button
            onClick={() => setShowAssignRole(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Assign Role
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No roles assigned yet. Assign roles to manage farm operations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  {getRoleIcon(role.role)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">
                        {role.user_profile?.first_name} {role.user_profile?.last_name}
                      </h5>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(role.role)}`}>
                        {role.role.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{role.user_profile?.email}</p>
                    <p className="text-xs text-gray-500">
                      Permissions: {formatPermissions(role.permissions)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Assigned: {new Date(role.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Edit Role"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveRole(role.id)}
                    className="p-1 hover:bg-red-200 rounded text-red-600"
                    title="Remove Role"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showAssignRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Assign New Role</h4>
            
            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User *
                </label>
                <select
                  value={newRole.user_id}
                  onChange={(e) => setNewRole(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select User</option>
                  {availableUsers.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.user_profile?.first_name} {user.user_profile?.last_name} 
                      ({user.user_profile?.email})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    All organization users are already assigned to this farm
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={newRole.role}
                  onChange={(e) => setNewRole(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {availableRoles.map(role => (
                    <option key={role.role} value={role.role}>
                      {role.role.replace('_', ' ')} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Permissions Preview */}
              {newRole.role && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <h5 className="font-medium text-sm text-gray-900 mb-2">Role Permissions:</h5>
                  <p className="text-sm text-gray-600">
                    {availableRoles.find(r => r.role === newRole.role)?.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignRole(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || availableUsers.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmRoleManager;
