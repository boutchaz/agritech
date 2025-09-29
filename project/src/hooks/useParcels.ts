import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Parcel {
  id: string;
  name: string;
  boundary: number[][];
  farm_id: string;
  crop_id?: string;
  soil_type: string | null;
  area: number | null;
  calculated_area?: number | null;
  perimeter?: number | null;
  planting_density: number | null;
  irrigation_type: string | null;
  created_at: string;
  updated_at: string;
}

export function useParcels(farmId: string | null) {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Invalidate any pending requests
    requestIdRef.current++;
    if (farmId) {
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
  }, [farmId]);

  const fetchParcels = async () => {
    if (!farmId) return;
    const myRequestId = ++requestIdRef.current;

    try {
      // Validate UUID format (v1-5). If it doesn't match, skip strict validation rather than failing.
      const uuidV1toV5 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidV1toV5.test(farmId)) {
        console.warn('Non-standard farm ID format; proceeding without strict UUID validation');
      }

      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('farm_id', farmId);

      if (requestIdRef.current !== myRequestId) return; // stale result

      if (error) throw error;

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
    } = {}
  ) => {
    if (!farmId) throw new Error('No farm ID provided');

    try {
      const { data, error } = await supabase
        .from('parcels')
        .insert([
          {
            name,
            boundary,
            farm_id: farmId,
            ...details
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setParcels(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding parcel');
      throw err;
    }
  };

  const updateParcel = async (
    id: string,
    updates: Partial<Omit<Parcel, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setParcels(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating parcel');
      throw err;
    }
  };

  const deleteParcel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('parcels')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
