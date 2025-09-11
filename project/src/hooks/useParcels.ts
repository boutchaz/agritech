import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Parcel {
  id: string;
  name: string;
  boundary: number[][];
  crop_id: string;
  soil_type: string | null;
  area: number | null;
  planting_density: number | null;
  irrigation_type: string | null;
  created_at: string;
  updated_at: string;
}

export function useParcels(cropId: string | null) {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cropId) {
      fetchParcels();
    } else {
      setParcels([]);
      setLoading(false);
    }
  }, [cropId]);

  const fetchParcels = async () => {
    if (!cropId) return;

    try {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cropId)) {
        throw new Error('Invalid crop ID format. Must be a valid UUID.');
      }

      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('crop_id', cropId);

      if (error) throw error;

      setParcels(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching parcels');
    } finally {
      setLoading(false);
    }
  };

  const addParcel = async (
    name: string,
    boundary: number[][],
    details: {
      soil_type?: string;
      area?: number;
      planting_density?: number;
      irrigation_type?: string;
    } = {}
  ) => {
    if (!cropId) throw new Error('No crop ID provided');

    try {
      const { data, error } = await supabase
        .from('parcels')
        .insert([
          {
            name,
            boundary,
            crop_id: cropId,
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