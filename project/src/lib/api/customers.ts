import { createCrudApi } from './createCrudApi';

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  customer_code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  website: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  currency_code: string | null;
  customer_type: string | null;
  price_list: string | null;
  assigned_to: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface CustomerFilters {
  name?: string;
  customer_code?: string;
  customer_type?: string;
  is_active?: boolean;
  assigned_to?: string;
}

export interface CreateCustomerInput {
  name: string;
  customer_code?: string;
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
  credit_limit?: number;
  currency_code?: string;
  customer_type?: string;
  price_list?: string;
  assigned_to?: string;
  notes?: string;
  is_active?: boolean;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

// Use the generic CRUD factory
export const customersApi = createCrudApi<Customer, CreateCustomerInput, CustomerFilters, UpdateCustomerInput>(
  '/api/v1/customers'
);
