import { createOrgCrudHooks } from './useOrgQuery';
import { customersApi, type Customer, type CreateCustomerInput, type CustomerFilters } from '../lib/api/customers';

// Re-export the Customer type for backward compatibility
export type { Customer } from '../lib/api/customers';

// Create all CRUD hooks using the factory
const customerHooks = createOrgCrudHooks<Customer, CreateCustomerInput, CustomerFilters>(
  'customers',
  customersApi
);

/**
 * Hook to fetch all customers for the current organization
 */
export function useCustomers() {
  return customerHooks.useList({ is_active: true });
}

/**
 * Hook to fetch a single customer
 */
export function useCustomer(customerId: string | null) {
  return customerHooks.useOne(customerId);
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  return customerHooks.useCreate();
}

/**
 * Hook to update a customer
 */
export function useUpdateCustomer() {
  return customerHooks.useUpdate();
}

/**
 * Hook to delete/deactivate a customer
 */
export function useDeleteCustomer() {
  return customerHooks.useDelete();
}
