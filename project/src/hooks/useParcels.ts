import { useEffect, useRef, useState } from 'react';
import { parcelsApi, type Parcel, type CreateParcelDto, type UpdateParcelDto } from '../lib/api/parcels';
import { useAuth } from '../hooks/useAuth';

export function useParcels(farmId: string | null) {
  const { currentOrganization } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Invalidate any pending requests
    requestIdRef.current++;
    if (farmId && currentOrganization?.id) {
      setLoading(true);
      setError(null);
      fetchParcels();
    } else {
      setParcels([]);
      setLoading(false);
      setError(null);
    }

    return () => {
      // Bump the request id so any in-flight resolves are ignored
      requestIdRef.current++;
    };
  }, [farmId, currentOrganization?.id]);

  const fetchParcels = async () => {
    if (!farmId || !currentOrganization?.id) return;
    const myRequestId = ++requestIdRef.current;

    try {
      const data = await parcelsApi.getAll(
        {
          organization_id: currentOrganization.id,
          farm_id: farmId,
        },
        currentOrganization.id
      );

      if (requestIdRef.current !== myRequestId) return; // stale result

      setParcels(data || []);
    } catch (err) {
      if (requestIdRef.current !== myRequestId) return; // ignore stale error
      setError(err instanceof Error ? err.message : 'Error fetching parcels');
    } finally {
      if (requestIdRef.current === myRequestId) {
        setLoading(false);
      }
    }
  };

  const addParcel = async (
    name: string,
    boundary: number[][],
    details: {
      soil_type?: string;
      area?: number;
      calculated_area?: number;
      perimeter?: number;
      planting_density?: number;
      irrigation_type?: string;
      crop_id?: string;
      variety?: string;
      planting_date?: string;
      planting_type?: string;
    } = {}
  ) => {
    if (!farmId) throw new Error('No farm ID provided');
    if (!currentOrganization?.id) throw new Error('No organization selected');

    try {
      const parcelData: CreateParcelDto = {
        name,
        boundary,
        farm_id: farmId,
        ...details,
      };

      const data = await parcelsApi.create(parcelData, currentOrganization.id);

      setParcels(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding parcel');
      throw err;
    }
  };

  const updateParcel = async (
    id: string,
    updates: UpdateParcelDto
  ) => {
    if (!currentOrganization?.id) throw new Error('No organization selected');

    try {
      const data = await parcelsApi.update(id, updates, currentOrganization.id);

      setParcels(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating parcel');
      throw err;
    }
  };

  const deleteParcel = async (id: string) => {
    if (!farmId) throw new Error('No farm ID provided');
    if (!currentOrganization?.id) throw new Error('No organization selected');

    try {
      await parcelsApi.delete(id, farmId, currentOrganization.id);

      setParcels(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting parcel');
      throw err;
    }
  };

  return {
    parcels,
    loading,
    error,
    addParcel,
    updateParcel,
    deleteParcel,
    refresh: fetchParcels
  };
}
