import { createOrgCrudHooks } from './useOrgQuery';
import { suppliersApi, type Supplier, type CreateSupplierInput, type SupplierFilters } from '../lib/api/suppliers';

// Re-export the Supplier type for backward compatibility
export type { Supplier } from '../lib/api/suppliers';

// Create all CRUD hooks using the factory
const supplierHooks = createOrgCrudHooks<Supplier, CreateSupplierInput, SupplierFilters>(
  'suppliers',
  suppliersApi
);

/**
 * Hook to fetch all suppliers for the current organization
 */
export function useSuppliers() {
  return supplierHooks.useList({ is_active: true });
}

/**
 * Hook to fetch a single supplier
 */
export function useSupplier(supplierId: string | null) {
  return supplierHooks.useOne(supplierId);
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  return supplierHooks.useCreate();
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  return supplierHooks.useUpdate();
}

/**
 * Hook to delete/deactivate a supplier
 */
export function useDeleteSupplier() {
  return supplierHooks.useDelete();
}
