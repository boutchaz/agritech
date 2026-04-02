import { createCrudApi } from './createCrudApi';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
export type CostCenter = Tables['cost_centers']['Row'];

export interface CostCenterFilters {
  is_active?: boolean;
  search?: string;
}

export interface CreateCostCenterInput {
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  farm_id?: string;
  parcel_id?: string;
  is_active?: boolean;
}

export type UpdateCostCenterInput = Partial<CreateCostCenterInput>;

export const costCentersApi = createCrudApi<CostCenter, CreateCostCenterInput, CostCenterFilters>(
  '/api/v1/cost-centers'
);
