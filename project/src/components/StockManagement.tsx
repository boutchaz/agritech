import {  useState, useEffect, useCallback  } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Package as _Package,
  ShoppingCart as _ShoppingCart,
  AlertTriangle as _AlertTriangle,
  Trash2,
  X,
  Users,
  Warehouse,
  Building2,
  Phone,
  Mail,
  Upload as _Upload,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCurrency } from "../hooks/useCurrency";
import { FormField } from "./ui/FormField";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { suppliersApi } from "@/lib/api/suppliers";
import { warehousesApi } from "@/lib/api/warehouses";
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';


interface Product {
  id: string;
  item_name: string | null;
  item_type: string | null;
  category: string | null;
  brand: string | null;
  quantity: number;
  unit: string;
  packaging_type?: string | null; // Type de conditionnement (bidon 5L, bouteille 1L, sac 25Kg, etc.)
  packaging_size?: number | null; // Taille du conditionnement
  cost_per_unit: number | null;
  supplier: string | null;
  supplier_id?: string | null;
  warehouse_id?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  storage_location?: string | null;
  status: string | null;
  minimum_quantity?: number | null;
  last_purchase_date?: string | null;
}

interface Supplier {
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

interface WarehouseData {
  id: string;
  organization_id: string;
  farm_id?: string | null;
  name: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  capacity?: number | null;
  capacity_unit?: string | null;
  temperature_controlled?: boolean | null;
  humidity_controlled?: boolean | null;
  security_level?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

  const _createDefaultPurchaseState = () => ({
  product_id: "",
  product_name: "",
  category: "",
  brand: "",
  packaging_type: "",
  packaging_size: 0,
  quantity: 0,
  unit: "units",
  cost_per_unit: 0,
  total_cost: 0,
  supplier: "",
  supplier_id: "",
  warehouse_id: "",
  notes: "",
  batch_number: "",
  purchase_date: new Date().toISOString().split("T")[0],
  invoice_file: null as File | null,
  invoice_number: "",
});
void _createDefaultPurchaseState;

const createDefaultSupplierState = () => ({
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postal_code: "",
  country: "Morocco",
  website: "",
  tax_id: "",
  payment_terms: "",
  notes: "",
});

const createDefaultWarehouseState = () => ({
  name: "",
  description: "",
  location: "",
  address: "",
  city: "",
  postal_code: "",
  capacity: "",
  capacity_unit: "m3",
  temperature_controlled: false,
  humidity_controlled: false,
  security_level: "standard",
  manager_name: "",
  manager_phone: "",
});

export type InventoryTab = "stock" | "suppliers" | "warehouses";

interface StockManagementProps {
  activeTab: InventoryTab;
}

const StockManagement = ({ activeTab }: StockManagementProps) => {
  const { t } = useTranslation('stock');
  const { currentOrganization, currentFarm } = useAuth();
  const { symbol: _currencySymbol } = useCurrency();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const _showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };
void _showConfirm;

  const [_products, _setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // showAddPurchase removed - purchases now handled via Stock Entries
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // newPurchase state removed - purchases now handled via Stock Entries

  const [newSupplier, setNewSupplier] = useState(createDefaultSupplierState());

  const [newWarehouse, setNewWarehouse] = useState(
    createDefaultWarehouseState(),
  );
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null,
  );
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(
    null,
  );
  const [_selectedProduct, _setSelectedProduct] = useState<Product | null>(null);
  const [_quantityModalOpen, _setQuantityModalOpen] = useState(false);
  const [_quantityAdjustment, _setQuantityAdjustment] = useState<{
    type: "increase" | "decrease";
    amount: number;
    reason: string;
  }>({
    type: "increase",
    amount: 0,
    reason: "",
  });
  const [_isAdjustingQuantity, _setIsAdjustingQuantity] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [isSubmittingWarehouse, setIsSubmittingWarehouse] = useState(false);

  // resetPurchaseForm removed - purchases now handled via Stock Entries
  const resetSupplierForm = () => {
    setNewSupplier(createDefaultSupplierState());
    setEditingSupplierId(null);
  };
  const resetWarehouseForm = () => {
    setNewWarehouse(createDefaultWarehouseState());
    setEditingWarehouseId(null);
  };

  // fetchProducts removed - stock management is now handled by InventoryStock component
  // which uses the items table instead of the obsolete inventory_items table

  const fetchSuppliers = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const data = await suppliersApi.getAll(
        { is_active: true },
        currentOrganization.id,
      );
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      setError(t('stockManagement.toast.fetchSuppliersFailed'));
    }
  }, [currentOrganization, t]);

  const fetchWarehouses = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const data = await warehousesApi.getAll(
        undefined,
        currentOrganization.id,
      );
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      setError(t('stockManagement.toast.fetchWarehousesFailed'));
    }
  }, [currentOrganization, t]);

  useEffect(() => {
    if (currentOrganization) {
      // Only fetch suppliers and warehouses - stock tab is handled by InventoryStock component
      fetchSuppliers();
      fetchWarehouses();
    }
  }, [currentOrganization, fetchSuppliers, fetchWarehouses]);

  // openCreatePurchaseModal, closePurchaseModal removed - purchases now handled via Stock Entries
  // openRestockModal removed - stock management now handled by InventoryStock component

  const openCreateSupplierModal = () => {
    resetSupplierForm();
    setError(null);
    setShowAddSupplier(true);
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setNewSupplier({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      postal_code: supplier.postal_code || "",
      country: supplier.country || "Morocco",
      website: supplier.website || "",
      tax_id: supplier.tax_id || "",
      payment_terms: supplier.payment_terms || "",
      notes: supplier.notes || "",
    });
    setError(null);
    setShowAddSupplier(true);
  };

  const closeSupplierModal = () => {
    setShowAddSupplier(false);
    resetSupplierForm();
    setIsSubmittingSupplier(false);
  };

  const openCreateWarehouseModal = () => {
    resetWarehouseForm();
    setError(null);
    setShowAddWarehouse(true);
  };

  const openEditWarehouseModal = (warehouse: WarehouseData) => {
    setEditingWarehouseId(warehouse.id);
    setNewWarehouse({
      name: warehouse.name,
      description: warehouse.description || "",
      location: warehouse.location || "",
      address: warehouse.address || "",
      city: warehouse.city || "",
      postal_code: warehouse.postal_code || "",
      capacity: warehouse.capacity?.toString() || "",
      capacity_unit: warehouse.capacity_unit || "m3",
      temperature_controlled: Boolean(warehouse.temperature_controlled),
      humidity_controlled: Boolean(warehouse.humidity_controlled),
      security_level: warehouse.security_level || "standard",
      manager_name: warehouse.manager_name || "",
      manager_phone: warehouse.manager_phone || "",
    });
    setError(null);
    setShowAddWarehouse(true);
  };

  const closeWarehouseModal = () => {
    setShowAddWarehouse(false);
    resetWarehouseForm();
    setIsSubmittingWarehouse(false);
  };

  // openAdjustQuantityModal, handleAdjustQuantity removed - stock adjustments now handled via Stock Entries

  // handleAddPurchase, handleDeleteProduct removed - purchases and stock management
  // are now handled via Stock Entries and Items system (not inventory_items)

  const handleSubmitSupplier = async () => {
    if (!currentOrganization) return;

    setIsSubmittingSupplier(true);
    try {
      if (editingSupplierId) {
        const data = await suppliersApi.update(
          editingSupplierId,
          newSupplier,
          currentOrganization.id,
        );

        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.id === editingSupplierId ? data : supplier,
          ),
        );
        toast.success(t('stockManagement.toast.supplierUpdated'));
      } else {
        const data = await suppliersApi.create(
          {
            ...newSupplier,
            is_active: true,
          },
          currentOrganization.id,
        );

        setSuppliers([...suppliers, data]);
        toast.success(t('stockManagement.toast.supplierCreated'));
      }

      closeSupplierModal();
      setError(null);
    } catch (error) {
      console.error("Error saving supplier:", error);
      const message =
        error instanceof Error ? error.message : t('stockManagement.toast.supplierSaveFailed');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm(t('stockManagement.toast.supplierArchiveConfirm'))) return;
    if (!currentOrganization) return;

    try {
      await suppliersApi.delete(id, currentOrganization.id);

      setSuppliers(suppliers.filter((s) => s.id !== id));
      if (editingSupplierId === id) {
        closeSupplierModal();
      }
      setError(null);
      toast.success(t('stockManagement.toast.supplierArchived'));
    } catch (error) {
      console.error("Error deleting supplier:", error);
      const message =
        error instanceof Error ? error.message : t('stockManagement.toast.supplierArchiveFailed');
      setError(message);
      toast.error(message);
    }
  };

  const handleSubmitWarehouse = async () => {
    if (!currentOrganization) return;

    setIsSubmittingWarehouse(true);
    try {
      const payload = {
        ...newWarehouse,
        capacity: newWarehouse.capacity
          ? parseFloat(newWarehouse.capacity)
          : undefined,
        farm_id: currentFarm?.id || undefined,
      };

      if (editingWarehouseId) {
        const data = await warehousesApi.update(
          editingWarehouseId,
          payload,
          currentOrganization.id,
        );

        setWarehouses((prev) =>
          prev.map((warehouse) =>
            warehouse.id === editingWarehouseId ? data : warehouse,
          ),
        );
        toast.success(t('stockManagement.toast.warehouseUpdated'));
      } else {
        const data = await warehousesApi.create(
          payload,
          currentOrganization.id,
        );

        setWarehouses([...warehouses, data]);
        toast.success(t('stockManagement.toast.warehouseCreated'));
      }

      closeWarehouseModal();
      setError(null);
    } catch (error) {
      console.error("Error saving warehouse:", error);
      const message =
        error instanceof Error ? error.message : t('stockManagement.toast.warehouseSaveFailed');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmittingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm(t('stockManagement.toast.warehouseArchiveConfirm'))) return;
    if (!currentOrganization) return;

    try {
      await warehousesApi.delete(id, currentOrganization.id);

      setWarehouses(warehouses.filter((w) => w.id !== id));
      if (editingWarehouseId === id) {
        closeWarehouseModal();
      }
      setError(null);
      toast.success(t('stockManagement.toast.warehouseArchived'));
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      const message =
        error instanceof Error ? error.message : t('stockManagement.toast.warehouseArchiveFailed');
      setError(message);
      toast.error(message);
    }
  };

  const normalizedSearchTerm = searchTerm.toLowerCase();
  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name?.toLowerCase().includes(normalizedSearchTerm) ||
      supplier.contact_person?.toLowerCase().includes(normalizedSearchTerm) ||
      supplier.city?.toLowerCase().includes(normalizedSearchTerm),
  );
  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.name?.toLowerCase().includes(normalizedSearchTerm) ||
      warehouse.location?.toLowerCase().includes(normalizedSearchTerm) ||
      warehouse.manager_name?.toLowerCase().includes(normalizedSearchTerm),
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <ListPageLayout
        header={
          activeTab === 'suppliers' || activeTab === 'warehouses' ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-4">
              {activeTab === 'suppliers' && (
                <Button variant="green" onClick={openCreateSupplierModal} className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-sm" >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{t('stockManagement.newSupplier')}</span>
                </Button>
              )}
              {activeTab === 'warehouses' && (
                <Button variant="green" onClick={openCreateWarehouseModal} className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-sm" >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{t('stockManagement.newWarehouse')}</span>
                </Button>
              )}
            </div>
          ) : undefined
        }
        filters={
          activeTab === "suppliers" || activeTab === "warehouses" ? (
            <FilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder={
                activeTab === "suppliers"
                  ? t('stockManagement.searchSupplier')
                  : t('stockManagement.searchWarehouse')
              }
            />
          ) : undefined
        }
      >
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stock tab is handled by InventoryStock component via Outlet in parent route */}
        {/* Stock tab content removed - now handled by InventoryStock component using items table */}

        {/* Suppliers Tab */}
        {activeTab === "suppliers" && (
          <ResponsiveList
            items={filteredSuppliers}
            isLoading={loading}
            keyExtractor={(supplier) => supplier.id}
            emptyIcon={Users}
            emptyTitle={t('stockManagement.noSuppliers')}
            emptyMessage={t('stockManagement.noSuppliersHint')}
            renderCard={(supplier) => (
              <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {supplier.name}
                      </div>
                      {supplier.payment_terms && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {supplier.payment_terms}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditSupplierModal(supplier)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('stockManagement.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('stockManagement.archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {supplier.contact_person && (
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {t('stockManagement.supplierTable.contact')}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {supplier.contact_person}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {t('stockManagement.supplierTable.location')}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {supplier.city && supplier.country
                        ? `${supplier.city}, ${supplier.country}`
                        : supplier.country || supplier.city || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                  {supplier.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            renderTableHeader={
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.supplierTable.supplier')}
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.supplierTable.contact')}
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.supplierTable.location')}
                </TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.supplierTable.actions')}
                </TableHead>
              </TableRow>
            }
            renderTable={(supplier) => (
              <>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Building2 className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {supplier.name}
                      </div>
                      {supplier.payment_terms && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {supplier.payment_terms}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {supplier.contact_person}
                  </div>
                  <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    {supplier.email && (
                      <div className="flex items-center">
                        <Mail className="mr-1 h-3 w-3" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        {supplier.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {supplier.city && supplier.country
                      ? `${supplier.city}, ${supplier.country}`
                      : supplier.country || supplier.city || "-"}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditSupplierModal(supplier)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('stockManagement.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('stockManagement.archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </>
            )}
          />
        )}

        {/* Warehouses Tab */}
        {activeTab === "warehouses" && (
          <ResponsiveList
            items={filteredWarehouses}
            isLoading={loading}
            keyExtractor={(warehouse) => warehouse.id}
            emptyIcon={Warehouse}
            emptyTitle={t('stockManagement.noWarehouses')}
            emptyMessage={t('stockManagement.noWarehousesHint')}
            renderCard={(warehouse) => (
              <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Warehouse className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {warehouse.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {warehouse.location || warehouse.city || "-"}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditWarehouseModal(warehouse)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('stockManagement.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteWarehouse(warehouse.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('stockManagement.archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {t('stockManagement.warehouseTable.capacity')}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {warehouse.capacity
                        ? `${warehouse.capacity} ${warehouse.capacity_unit}`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {t('stockManagement.warehouseTable.manager')}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {warehouse.manager_name || "-"}
                    </span>
                  </div>
                </div>

                {warehouse.manager_phone && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{warehouse.manager_phone}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {warehouse.temperature_controlled && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {t('stockManagement.tempControlled')}
                    </span>
                  )}
                  {warehouse.humidity_controlled && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      {t('stockManagement.humidityControlled')}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {t('stockManagement.security')}{warehouse.security_level}
                  </span>
                </div>
              </div>
            )}
            renderTableHeader={
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.warehouseTable.warehouse')}
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.warehouseTable.capacity')}
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.warehouseTable.manager')}
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.warehouseTable.conditions')}
                </TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  {t('stockManagement.warehouseTable.actions')}
                </TableHead>
              </TableRow>
            }
            renderTable={(warehouse) => (
              <>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Warehouse className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {warehouse.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {warehouse.location || warehouse.city || "-"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {warehouse.capacity
                      ? `${warehouse.capacity} ${warehouse.capacity_unit}`
                      : "-"}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {warehouse.manager_name || "-"}
                  </div>
                  {warehouse.manager_phone && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="mr-1 h-3 w-3" />
                      {warehouse.manager_phone}
                    </div>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1 text-xs">
                    {warehouse.temperature_controlled && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {t('stockManagement.tempControlled')}
                      </span>
                    )}
                    {warehouse.humidity_controlled && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                        {t('stockManagement.humidityControlled')}
                      </span>
                    )}
                    <div className="text-xs capitalize text-gray-500 dark:text-gray-400">
                      {t('stockManagement.security')}{warehouse.security_level}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditWarehouseModal(warehouse)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('stockManagement.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteWarehouse(warehouse.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('stockManagement.archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </>
            )}
          />
        )}
      </ListPageLayout>

      {/* Removed Add Product Modal - Products are now created automatically during purchase */}
      {/* {showAddProduct && (
        <div className="modal-overlay">
          <div className="modal-panel p-4 sm:p-6 max-w-2xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                Nouveau Produit
              </h3>
              <Button
                onClick={() => setShowAddProduct(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <FormField label="Nom du produit *" htmlFor="item_name" required>
                    <Input
                      id="item_name"
                      type="text"
                      value={newProduct.item_name}
                      onChange={(e) => setNewProduct({ ...newProduct, item_name: e.target.value })}
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Catégorie *" htmlFor="category" required>
                    <Select
                      id="category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: (e.target as HTMLSelectElement).value })}
                      required
                    >
                    <option value="">Sélectionner...</option>
                    <option value="seeds">Semences</option>
                    <option value="fertilizers">Engrais</option>
                    <option value="pesticides">Pesticides</option>
                    <option value="equipment">Équipement</option>
                    <option value="tools">Outils</option>
                    <option value="other">Autre</option>
                    </Select>
                  </FormField>
                </div>

                <div>
                  <FormField label="Marque" htmlFor="brand">
                    <Input
                      id="brand"
                      type="text"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Fournisseur" htmlFor="supplier">
                    <Select
                      id="supplier"
                      value={newProduct.supplier}
                      onChange={(e) => {
                        const value = (e.target as HTMLSelectElement).value;
                        const selectedSupplier = suppliers.find(s => s.name === value);
                        setNewProduct({
                          ...newProduct,
                          supplier: value,
                          supplier_id: selectedSupplier?.id
                        });
                      }}
                    >
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </option>
                    ))}
                    </Select>
                  </FormField>
                </div>

                <div>
                  <FormField label="Quantité initiale *" htmlFor="quantity" required>
                    <Input
                      id="quantity"
                      type="number"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Unité *" htmlFor="unit" required>
                    <Select
                      id="unit"
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({ ...newProduct, unit: (e.target as HTMLSelectElement).value })}
                    >
                      <option value="kg">Kilogrammes</option>
                      <option value="g">Grammes</option>
                      <option value="l">Litres</option>
                      <option value="ml">Millilitres</option>
                      <option value="units">Unités</option>
                      <option value="pieces">Pièces</option>
                      <option value="m">Mètres</option>
                      <option value="m2">Mètres carrés</option>
                    </Select>
                  </FormField>
                </div>

                <div>
                  <FormField label={`Coût unitaire (${currencySymbol}) *`} htmlFor="cpu" required>
                    <Input
                      id="cpu"
                      type="number"
                      step={1}
                      value={newProduct.cost_per_unit}
                      onChange={(e) => setNewProduct({ ...newProduct, cost_per_unit: Number(e.target.value) })}
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Quantité minimum" htmlFor="min_qty">
                    <Input
                      id="min_qty"
                      type="number"
                      value={newProduct.minimum_quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, minimum_quantity: Number(e.target.value) })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Numéro de lot" htmlFor="batch">
                    <Input
                      id="batch"
                      type="text"
                      value={newProduct.batch_number}
                      onChange={(e) => setNewProduct({ ...newProduct, batch_number: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Date d'expiration" htmlFor="expiry">
                    <Input
                      id="expiry"
                      type="date"
                      value={newProduct.expiry_date}
                      onChange={(e) => setNewProduct({ ...newProduct, expiry_date: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Entrepôt" htmlFor="warehouse">
                    <Select
                      id="warehouse"
                      value={newProduct.storage_location}
                      onChange={(e) => {
                        const value = (e.target as HTMLSelectElement).value;
                        const selectedWarehouse = warehouses.find(w => w.name === value);
                        setNewProduct({
                          ...newProduct,
                          storage_location: value,
                          warehouse_id: selectedWarehouse?.id
                        });
                      }}
                    >
                      <option value="">Sélectionner un entrepôt</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.name}>
                          {warehouse.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500 order-2 sm:order-1"
              >
                Annuler
              </Button>
              <Button variant="green" onClick={handleAddProduct} disabled={!newProduct.item_name || !newProduct.category || newProduct.quantity === undefined || newProduct.quantity < 0 || !newProduct.unit} className="px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed order-1 sm:order-2" >
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      {null}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingSupplierId
                  ? t('stockManagement.supplierForm.editTitle')
                  : t('stockManagement.supplierForm.createTitle')}
              </h3>
              <Button
                onClick={closeSupplierModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    label={t('stockManagement.supplierForm.name')}
                    htmlFor="supplier_name"
                    required
                  >
                    <Input
                      id="supplier_name"
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) =>
                        setNewSupplier({ ...newSupplier, name: e.target.value })
                      }
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField
                    label={t('stockManagement.supplierForm.contactPerson')}
                    htmlFor="supplier_contact"
                  >
                    <Input
                      id="supplier_contact"
                      type="text"
                      value={newSupplier.contact_person}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          contact_person: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.email')} htmlFor="supplier_email">
                    <Input
                      id="supplier_email"
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          email: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.phone')} htmlFor="supplier_phone">
                    <Input
                      id="supplier_phone"
                      type="tel"
                      value={newSupplier.phone}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          phone: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.address')} htmlFor="supplier_address">
                    <Input
                      id="supplier_address"
                      type="text"
                      value={newSupplier.address}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          address: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.city')} htmlFor="supplier_city">
                    <Input
                      id="supplier_city"
                      type="text"
                      value={newSupplier.city}
                      onChange={(e) =>
                        setNewSupplier({ ...newSupplier, city: e.target.value })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.postalCode')} htmlFor="supplier_postal">
                    <Input
                      id="supplier_postal"
                      type="text"
                      value={newSupplier.postal_code}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          postal_code: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.country')} htmlFor="supplier_country">
                    <Input
                      id="supplier_country"
                      type="text"
                      value={newSupplier.country}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          country: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.website')} htmlFor="supplier_website">
                    <Input
                      id="supplier_website"
                      type="url"
                      value={newSupplier.website}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          website: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.supplierForm.taxId')} htmlFor="supplier_tax">
                    <Input
                      id="supplier_tax"
                      type="text"
                      value={newSupplier.tax_id}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          tax_id: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField
                    label={t('stockManagement.supplierForm.paymentTerms')}
                    htmlFor="supplier_payment"
                    helper={t('stockManagement.supplierForm.paymentTermsPlaceholder')}
                  >
                    <Input
                      id="supplier_payment"
                      type="text"
                      value={newSupplier.payment_terms}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          payment_terms: e.target.value,
                        })
                      }
                      placeholder={t('stockManagement.supplierForm.paymentTermsPlaceholder')}
                    />
                  </FormField>
                </div>

                <div className="col-span-2">
                  <FormField label={t('stockManagement.supplierForm.notes')} htmlFor="supplier_notes">
                    <Textarea
                      id="supplier_notes"
                      value={newSupplier.notes}
                      onChange={(e) =>
                        setNewSupplier({
                          ...newSupplier,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                onClick={closeSupplierModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                {t('stockManagement.supplierForm.cancel')}
              </Button>
              <Button variant="green" onClick={handleSubmitSupplier} disabled={isSubmittingSupplier || !newSupplier.name} className="px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed" >
                {isSubmittingSupplier
                  ? t('stockManagement.supplierForm.saving')
                  : editingSupplierId
                    ? t('stockManagement.supplierForm.update')
                    : t('stockManagement.supplierForm.add')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddWarehouse && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingWarehouseId ? t('stockManagement.warehouseForm.editTitle') : t('stockManagement.warehouseForm.createTitle')}
              </h3>
              <Button
                onClick={closeWarehouseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    label={t('stockManagement.warehouseForm.name')}
                    htmlFor="warehouse_name"
                    required
                  >
                    <Input
                      id="warehouse_name"
                      type="text"
                      value={newWarehouse.name}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </FormField>
                </div>

                <div className="col-span-2">
                  <FormField label={t('stockManagement.warehouseForm.description')} htmlFor="warehouse_desc">
                    <Textarea
                      id="warehouse_desc"
                      value={newWarehouse.description}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.warehouseForm.location')} htmlFor="warehouse_location">
                    <Input
                      id="warehouse_location"
                      type="text"
                      value={newWarehouse.location}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          location: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.warehouseForm.address')} htmlFor="warehouse_address">
                    <Input
                      id="warehouse_address"
                      type="text"
                      value={newWarehouse.address}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          address: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.warehouseForm.city')} htmlFor="warehouse_city">
                    <Input
                      id="warehouse_city"
                      type="text"
                      value={newWarehouse.city}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          city: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.warehouseForm.postalCode')} htmlFor="warehouse_postal">
                    <Input
                      id="warehouse_postal"
                      type="text"
                      value={newWarehouse.postal_code}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          postal_code: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.warehouseForm.capacity')} htmlFor="warehouse_capacity">
                    <Input
                      id="warehouse_capacity"
                      type="number"
                      step={1}
                      value={newWarehouse.capacity}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          capacity: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField
                    label={t('stockManagement.warehouseForm.capacityUnit')}
                    htmlFor="warehouse_capacity_unit"
                  >
                    <Select
                      id="warehouse_capacity_unit"
                      value={newWarehouse.capacity_unit}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          capacity_unit: (e.target as HTMLSelectElement).value,
                        })
                      }
                    >
                      <option value="m3">{t('stockManagement.warehouseForm.capacityUnits.m3')}</option>
                      <option value="m2">{t('stockManagement.warehouseForm.capacityUnits.m2')}</option>
                      <option value="kg">{t('stockManagement.warehouseForm.capacityUnits.kg')}</option>
                      <option value="t">{t('stockManagement.warehouseForm.capacityUnits.ton')}</option>
                    </Select>
                  </FormField>
                </div>

                <div>
                  <FormField label={t('stockManagement.warehouseForm.manager')} htmlFor="warehouse_manager">
                    <Input
                      id="warehouse_manager"
                      type="text"
                      value={newWarehouse.manager_name}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          manager_name: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField
                    label={t('stockManagement.warehouseForm.managerPhone')}
                    htmlFor="warehouse_manager_phone"
                  >
                    <Input
                      id="warehouse_manager_phone"
                      type="tel"
                      value={newWarehouse.manager_phone}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          manager_phone: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div>
                  <FormField
                    label={t('stockManagement.warehouseForm.securityLevel')}
                    htmlFor="warehouse_security"
                  >
                    <Select
                      id="warehouse_security"
                      value={newWarehouse.security_level}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          security_level: (e.target as HTMLSelectElement).value,
                        })
                      }
                    >
                      <option value="basic">{t('stockManagement.warehouseForm.securityLevels.basic')}</option>
                      <option value="standard">{t('stockManagement.warehouseForm.securityLevels.standard')}</option>
                      <option value="high">{t('stockManagement.warehouseForm.securityLevels.high')}</option>
                      <option value="maximum">{t('stockManagement.warehouseForm.securityLevels.maximum')}</option>
                    </Select>
                  </FormField>
                </div>

                <div className="col-span-2">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="temperature_controlled"
                        checked={newWarehouse.temperature_controlled}
                        onChange={(e) =>
                          setNewWarehouse({
                            ...newWarehouse,
                            temperature_controlled: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label
                        htmlFor="temperature_controlled"
                        className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {t('stockManagement.warehouseForm.tempControlled')}
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="humidity_controlled"
                        checked={newWarehouse.humidity_controlled}
                        onChange={(e) =>
                          setNewWarehouse({
                            ...newWarehouse,
                            humidity_controlled: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label
                        htmlFor="humidity_controlled"
                        className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {t('stockManagement.warehouseForm.humidityControlled')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                onClick={closeWarehouseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                {t('stockManagement.warehouseForm.cancel')}
              </Button>
              <Button variant="green" onClick={handleSubmitWarehouse} disabled={isSubmittingWarehouse || !newWarehouse.name} className="px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed" >
                {isSubmittingWarehouse
                  ? t('stockManagement.warehouseForm.saving')
                  : editingWarehouseId
                    ? t('stockManagement.warehouseForm.update')
                    : t('stockManagement.warehouseForm.add')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default StockManagement;
