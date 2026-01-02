import { createCrudApi } from './createCrudApi';

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  website: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SupplierFilters {
  name?: string;
  supplier_code?: string;
  supplier_type?: string;
  is_active?: boolean;
  assigned_to?: string;
}

export interface CreateSupplierInput {
  name: string;
  supplier_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  tax_id?: string;
  payment_terms?: string;
  currency_code?: string;
  supplier_type?: string;
  assigned_to?: string;
  notes?: string;
  is_active?: boolean;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

// Use the generic CRUD factory
export const suppliersApi = createCrudApi<Supplier, CreateSupplierInput, SupplierFilters, UpdateSupplierInput>(
  '/api/v1/suppliers'
);
