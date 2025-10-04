import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  GripVertical,
  Plus
} from 'lucide-react';
import { Can } from '../lib/casl';

interface FarmNode {
  farm_id: string;
  farm_name: string;
  farm_type: 'main' | 'sub';
  parent_farm_id: string | null;
  hierarchy_level: number;
  manager_name: string;
  sub_farms_count: number;
  farm_size: number;
  is_active: boolean;
  children?: FarmNode[];
  parcels?: Parcel[];
}

interface Parcel {
  id: string;
  name: string;
  crop_type?: string;
  area: number;
  farm_id: string;
}

interface FarmHierarchyTreeProps {
  organizationId: string;
  onFarmSelect?: (farmId: string) => void;
  selectedFarmId?: string;
  onAddParcel?: (farmId: string) => void;
  onEditParcel?: (parcelId: string) => void;
  onDeleteParcel?: (parcelId: string) => void;
  onManageRoles?: (farmId: string) => void;
}

const FarmHierarchyTree: React.FC<FarmHierarchyTreeProps> = ({
  organizationId,
  onAddParcel,
  onEditParcel,
  onDeleteParcel,
  onManageRoles
}) => {
  const [farms, setFarms] = useState<FarmNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [newFarmName, setNewFarmName] = useState<string>('');

  useEffect(() => {
    fetchFarmHierarchy();
  }, [organizationId]);

  const fetchFarmHierarchy = async () => {
    try {
      // First fetch organization name
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      if (!orgError && orgData) {
        setOrganizationName(orgData.name);
      }

      const { data, error } = await supabase.rpc('get_farm_hierarchy_tree', {
        org_uuid: organizationId
      });

      if (error) throw error;

      // Build tree structure
      const farmMap = new Map<string, FarmNode>();
      const rootFarms: FarmNode[] = [];

      // First pass: create all nodes
      (data || []).forEach((farm: any) => {
        farmMap.set(farm.farm_id, {
          farm_id: farm.farm_id,
          farm_name: farm.farm_name,
          farm_type: farm.farm_type || 'main',
          parent_farm_id: farm.parent_farm_id,
          hierarchy_level: farm.hierarchy_level || 1,
          manager_name: farm.manager_name,
          sub_farms_count: farm.sub_farms_count || 0,
          farm_size: farm.farm_size || 0,
          is_active: farm.is_active !== false,
          children: [],
          parcels: []
        });
      });

      // Second pass: build tree structure
      (data || []).forEach((farm: any) => {
        const node = farmMap.get(farm.farm_id)!;
        
        if (farm.parent_farm_id) {
          const parent = farmMap.get(farm.parent_farm_id);
          if (parent) {
            parent.children!.push(node);
          }
        } else {
          rootFarms.push(node);
        }
      });

      // Fetch parcels for each farm
      const farmIds = Array.from(farmMap.keys());
      if (farmIds.length > 0) {
        const { data: parcelsData, error: parcelsError } = await supabase
          .from('parcels')
          .select('id, name, farm_id, area, area_unit, description')
          .in('farm_id', farmIds);

        if (!parcelsError && parcelsData) {
          // Group parcels by farm_id
          const parcelsByFarm = parcelsData.reduce((acc, parcel) => {
            if (!acc[parcel.farm_id]) acc[parcel.farm_id] = [];
            acc[parcel.farm_id].push({
              id: parcel.id,
              name: parcel.name,
              crop_type: parcel.description || 'No description', // Using description as crop_type for now
              area: parcel.area || 0,
              farm_id: parcel.farm_id
            });
            return acc;
          }, {} as Record<string, Parcel[]>);

          // Assign parcels to farms
          farmMap.forEach((farm) => {
            farm.parcels = parcelsByFarm[farm.farm_id] || [];
          });
        }
      }

      setFarms(rootFarms);
      
    } catch (error: any) {
      console.error('Error fetching farm hierarchy:', error);
      setError('Failed to load farm hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const renderFarmNode = (farm: FarmNode, level: number = 0) => {
    const hasChildren = farm.children && farm.children.length > 0;
    const hasParcels = farm.parcels && farm.parcels.length > 0;

    return (
      <div key={farm.farm_id} className="mb-4">
        {/* Farm Card */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
          {/* Farm Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
              <h3 className="text-lg font-semibold text-gray-900">
                {farm.farm_name}
              </h3>
            </div>
            <button
              onClick={() => onManageRoles?.(farm.farm_id)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Gérer Rôles
            </button>
          </div>

          {/* Parcels */}
          {hasParcels && (
            <div className="space-y-2">
              {farm.parcels!.map((parcel) => (
                <div key={parcel.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <div>
                      <h4 className="font-medium text-gray-900">{parcel.name}</h4>
                      <p className="text-sm text-gray-600">
                        {parcel.crop_type} • {parcel.area} ha
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Can I="update" a="Parcel">
                      <button
                        onClick={() => onEditParcel?.(parcel.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Modifier
                      </button>
                    </Can>
                    <Can I="delete" a="Parcel">
                      <button
                        onClick={() => onDeleteParcel?.(parcel.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Parcel Button */}
          <div className="mt-3">
            <Can
              I="create"
              a="Parcel"
              fallback={
                <div className="text-sm text-gray-500 italic">
                  Upgrade your plan to add more parcels
                </div>
              }
            >
              <button
                onClick={() => onAddParcel?.(farm.farm_id)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une parcelle</span>
              </button>
            </Can>
          </div>
        </div>

        {/* Render Sub-farms */}
        {hasChildren && (
          <div className="ml-6 space-y-4">
            {farm.children!.map(childFarm => renderFarmNode(childFarm, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading farm hierarchy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {organizationName || 'Organisation'}
        </h2>
        <p className="text-sm text-gray-600">Racine de l'organisation</p>
      </div>

      {/* Farms */}
      {farms.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No farms found. Create your first farm to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {farms.map(farm => renderFarmNode(farm))}
        </div>
      )}

      {/* Add New Farm Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Nom de la nouvelle ferme"
            value={newFarmName}
            onChange={(e) => setNewFarmName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button 
            onClick={() => {
              if (newFarmName.trim()) {
                // TODO: Implement farm creation
                console.log('Creating farm:', newFarmName);
                setNewFarmName('');
              }
            }}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Ajouter
          </button>
          <button 
            onClick={() => setNewFarmName('')}
            className="px-6 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmHierarchyTree;
