import { supabase } from '../supabase';

export interface Crop {
  id: string;
  farm_id: string;
  organization_id?: string;
  parcel_id?: string;
  variety_id: string;
  name: string;
  planting_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  planted_area?: number;
  expected_yield?: number;
  actual_yield?: number;
  yield_unit?: string;
  status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  farm_name?: string;
  parcel_name?: string;
  variety_name?: string;
}

export const cropsApi = {
  async getAll(organizationId: string, farmId?: string, parcelId?: string): Promise<Crop[]> {
    let query = supabase
      .from('crops')
      .select(`
        *,
        farms!inner(id, name, organization_id),
        parcels(id, parcel_name),
        crop_varieties(id, name)
      `)
      .eq('farms.organization_id', organizationId)
      .order('name');

    if (farmId) {
      query = query.eq('farm_id', farmId);
    }

    if (parcelId) {
      query = query.eq('parcel_id', parcelId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((crop: any) => ({
      ...crop,
      farm_name: crop.farms?.name,
      parcel_name: crop.parcels?.parcel_name,
      variety_name: crop.crop_varieties?.name,
    }));
  },

  async getById(organizationId: string, cropId: string): Promise<Crop | null> {
    const { data, error } = await supabase
      .from('crops')
      .select(`
        *,
        farms!inner(id, name, organization_id),
        parcels(id, parcel_name),
        crop_varieties(id, name)
      `)
      .eq('id', cropId)
      .eq('farms.organization_id', organizationId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      farm_name: data.farms?.name,
      parcel_name: data.parcels?.parcel_name,
      variety_name: data.crop_varieties?.name,
    };
  },
};
