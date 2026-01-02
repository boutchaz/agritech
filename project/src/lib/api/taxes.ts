import { createCrudApi } from './createCrudApi';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
export type Tax = Tables['taxes']['Row'];

export interface TaxFilters {
  tax_type?: 'sales' | 'purchase' | 'both';
  is_active?: boolean;
  search?: string;
}

export interface CreateTaxInput {
  name: string;
  code?: string;
  rate: number;
  tax_type: 'sales' | 'purchase' | 'both';
  is_compound?: boolean;
  is_active?: boolean;
  description?: string;
}

export type UpdateTaxInput = Partial<CreateTaxInput>;

// Base CRUD operations
const baseCrud = createCrudApi<Tax, CreateTaxInput, TaxFilters>('/api/v1/taxes');

// Alias for backward compatibility
export const taxesApi = {
  ...baseCrud,
  // Alias getOne as getById for backward compatibility
  getById: baseCrud.getOne,
};
