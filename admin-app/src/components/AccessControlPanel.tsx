import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Save, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { apiRequest } from '@/lib/api-client';

type AccessRole = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  level: number;
  is_active: boolean;
  source: string | null;
};

type AccessPermission = {
  id: string;
  name: string;
  display_name: string;
  resource: string;
  action: string;
};

export function AccessControlPanel() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
    level: 50,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-access-roles'],
    queryFn: () => apiRequest<AccessRole[]>('/api/v1/admin/access-control/roles'),
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-access-permissions'],
    queryFn: () => apiRequest<AccessPermission[]>('/api/v1/admin/access-control/permissions'),
  });

  const { data: rolePermissionIdsResp, isLoading: rolePermLoading } = useQuery({
    queryKey: ['admin-access-role-permissions', selectedRoleId],
    queryFn: () =>
      apiRequest<{ role_id: string; permission_ids: string[] }>(
        `/api/v1/admin/access-control/roles/${selectedRoleId}/permissions`,
      ),
    enabled: !!selectedRoleId,
  });

  const selectedRolePermissionIds = useMemo(
    () => new Set(rolePermissionIdsResp?.permission_ids ?? []),
    [rolePermissionIdsResp],
  );

  const [localPermissionIds, setLocalPermissionIds] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const effectivePermissionIds = isDirty ? localPermissionIds : selectedRolePermissionIds;

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AccessPermission[]>();
    for (const permission of permissions) {
      const key = permission.resource;
      const existing = groups.get(key) ?? [];
      existing.push(permission);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([resource, rows]) => ({
      resource,
      rows: rows.sort((a, b) => a.action.localeCompare(b.action)),
    }));
  }, [permissions]);

  const refreshRoles = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-access-roles'] });
    queryClient.invalidateQueries({ queryKey: ['admin-access-role-permissions'] });
  };

  const createRoleMutation = useMutation({
    mutationFn: () =>
      apiRequest<AccessRole>('/api/v1/admin/access-control/roles', {
        method: 'POST',
        body: JSON.stringify({
          ...newRole,
          source: 'custom',
          is_active: true,
        }),
      }),
    onSuccess: (role) => {
      toast.success('Role created');
      setNewRole({ name: '', display_name: '', description: '', level: 50 });
      refreshRoles();
      setSelectedRoleId(role.id);
      setLocalPermissionIds(new Set());
      setIsDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const savePermissionsMutation = useMutation({
    mutationFn: (permissionIds: string[]) =>
      apiRequest<{ role_id: string; permission_ids: string[] }>(
        `/api/v1/admin/access-control/roles/${selectedRoleId}/permissions`,
        {
          method: 'PUT',
          body: JSON.stringify({ permission_ids: permissionIds }),
        },
      ),
    onSuccess: () => {
      toast.success('Role capabilities updated');
      setLocalPermissionIds(new Set());
      setIsDirty(false);
      queryClient.invalidateQueries({
        queryKey: ['admin-access-role-permissions', selectedRoleId],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disableRoleMutation = useMutation({
    mutationFn: (roleId: string) =>
      apiRequest(`/api/v1/admin/access-control/roles/${roleId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Role disabled');
      refreshRoles();
      if (selectedRoleId) {
        queryClient.invalidateQueries({
          queryKey: ['admin-access-role-permissions', selectedRoleId],
        });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const togglePermission = (permissionId: string) => {
    const next = new Set(effectivePermissionIds);
    if (next.has(permissionId)) next.delete(permissionId);
    else next.add(permissionId);
    setLocalPermissionIds(next);
    setIsDirty(true);
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Frontoffice Roles & Capabilities
        </h2>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Internal-admin only role builder. Organization admins in frontoffice can only assign roles to users.
      </p>

      <div className="mb-5 grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 md:grid-cols-5">
        <input
          value={newRole.name}
          onChange={(e) =>
            setNewRole((p) => ({
              ...p,
              name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
            }))
          }
          placeholder="role_name"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={newRole.display_name}
          onChange={(e) => setNewRole((p) => ({ ...p, display_name: e.target.value }))}
          placeholder="Display name"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={newRole.description}
          onChange={(e) => setNewRole((p) => ({ ...p, description: e.target.value }))}
          placeholder="Description"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={newRole.level}
          onChange={(e) =>
            setNewRole((p) => ({ ...p, level: Number(e.target.value || 50) }))
          }
          placeholder="Level"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => createRoleMutation.mutate()}
          disabled={!newRole.name || !newRole.display_name || createRoleMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {createRoleMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create Role
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600">Role</span>
        <select
          value={selectedRoleId}
          onChange={(e) => {
            setSelectedRoleId(e.target.value);
            setLocalPermissionIds(new Set());
            setIsDirty(false);
          }}
          className="min-w-[280px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select role…</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.display_name} ({role.name}) - level {role.level}
              {role.is_active ? '' : ' [inactive]'}
            </option>
          ))}
        </select>

        {selectedRoleId && (
          <>
            <button
              type="button"
              onClick={() =>
                savePermissionsMutation.mutate(Array.from(effectivePermissionIds))
              }
              disabled={savePermissionsMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savePermissionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Capabilities
            </button>

            <button
              type="button"
              onClick={() => disableRoleMutation.mutate(selectedRoleId)}
              disabled={disableRoleMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {disableRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Disable Role
            </button>
          </>
        )}
      </div>

      {(rolesLoading || permissionsLoading || rolePermLoading) && selectedRoleId ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !selectedRoleId ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
          Select a role to edit capabilities.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPermissions.map((group) => (
            <div key={group.resource} className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-800 uppercase">
                {group.resource}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.rows.map((permission) => {
                  const checked = effectivePermissionIds.has(permission.id);
                  return (
                    <button
                      key={permission.id}
                      type="button"
                      onClick={() => togglePermission(permission.id)}
                      className={clsx(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        checked
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {permission.action}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
