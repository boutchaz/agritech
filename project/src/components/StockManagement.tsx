import React, { useState, useEffect } from 'react';
import { Plus, Package, ShoppingCart, AlertTriangle, Search, Trash2, X, Users, Warehouse, Building2, Phone, Mail, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import { useCurrency } from '../hooks/useCurrency';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';

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
  farm_id: string | null;
  name: string;
  description: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  capacity: number | null;
  capacity_unit: string | null;
  temperature_controlled: boolean | null;
  humidity_controlled: boolean | null;
  security_level: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}


const StockManagement: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const { symbol: currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState<'stock' | 'suppliers' | 'warehouses'>('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newPurchase, setNewPurchase] = useState({
    product_id: '',
    product_name: '',  // Nouveau: nom du produit pour création automatique
    category: '',
    brand: '',
    packaging_type: '', // Nouveau: type de conditionnement
    packaging_size: 0,  // Nouveau: taille du conditionnement
    quantity: 0,
    unit: 'units',
    cost_per_unit: 0,
    total_cost: 0,
    supplier: '',
    supplier_id: '',
    warehouse_id: '',
    notes: '',
    batch_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_file: null as File | null, // Nouveau: fichier de facture/bon
    invoice_number: '' // Nouveau: numéro de facture
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Morocco',
    website: '',
    tax_id: '',
    payment_terms: '',
    notes: ''
  });

  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    description: '',
    location: '',
    address: '',
    city: '',
    postal_code: '',
    capacity: '',
    capacity_unit: 'm3',
    temperature_controlled: false,
    humidity_controlled: false,
    security_level: 'standard',
    manager_name: '',
    manager_phone: ''
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchProducts();
      fetchSuppliers();
      fetchWarehouses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization]);

  const fetchProducts = async () => {
    if (!currentOrganization) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      
      // Map to Product interface (inventory_items uses 'name', interface uses 'item_name')
      const mappedData = (data || []).map(item => {
        // Calculate status based on quantity and minimum_stock
        const quantity = item.quantity || 0;
        const minStock = item.minimum_stock || 10;
        const status = quantity === 0 ? 'out_of_stock' :
                      quantity < minStock ? 'low_stock' : 'available';
        
        return {
          ...item,
          item_name: item.name,
          item_type: item.category,
          brand: item.brand || null,
          status,
          minimum_quantity: item.minimum_stock,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
          storage_location: item.location,
          packaging_type: item.packaging_type || null,
          packaging_size: item.packaging_size || null,
          last_purchase_date: item.last_purchase_date || null
        };
      });
      
      setProducts(mappedData as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError('Failed to fetch suppliers');
    }
  };

  const fetchWarehouses = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setError('Failed to fetch warehouses');
    }
  };

  // Removed handleAddProduct - products are now created automatically during purchase

  const handleAddPurchase = async () => {
    if (!currentOrganization) return;

    try {
      let productId = newPurchase.product_id;
      let product = products.find(p => p.id === productId);

      // Si le produit n'existe pas, le créer automatiquement
      if (!productId && newPurchase.product_name) {
        const { data: newProductData, error: createError } = await supabase
          .from('inventory_items')
          .insert([{
            organization_id: currentOrganization.id,
            farm_id: currentFarm?.id,
            name: newPurchase.product_name,
            category: newPurchase.category || 'other',
            brand: newPurchase.brand,
            packaging_type: newPurchase.packaging_type,
            packaging_size: newPurchase.packaging_size,
            quantity: newPurchase.quantity,
            unit: newPurchase.unit,
            cost_per_unit: newPurchase.cost_per_unit,
            supplier: newPurchase.supplier,
            warehouse_id: newPurchase.warehouse_id,
            batch_number: newPurchase.batch_number,
            minimum_stock: 10
          }])
          .select()
          .single();

        if (createError) throw createError;

        // Map to Product interface
        const newProduct: Product = {
          ...newProductData,
          item_name: newProductData.name,
          item_type: newProductData.category,
          brand: newProductData.brand || null,
          status: 'available',
          minimum_quantity: newProductData.minimum_stock,
          storage_location: newProductData.location,
          last_purchase_date: newPurchase.purchase_date
        };

        // Ajouter le nouveau produit à la liste locale
        setProducts([...products, newProduct]);
        product = newProduct;
        productId = newProduct.id;

        // Si un fichier de facture est fourni, l'uploader
        if (newPurchase.invoice_file) {
          const fileName = `invoices/${currentOrganization.id}/${productId}/${newPurchase.invoice_number || Date.now()}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, newPurchase.invoice_file);

          if (uploadError) {
            console.error('Error uploading invoice:', uploadError);
          }
        }
      } else if (product) {
        // Si le produit existe, mettre à jour sa quantité
        const newQuantity = product.quantity + newPurchase.quantity;

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            quantity: newQuantity,
            cost_per_unit: newPurchase.cost_per_unit,
            supplier: newPurchase.supplier,
            batch_number: newPurchase.batch_number || product.batch_number,
            packaging_type: newPurchase.packaging_type || product.packaging_type,
            packaging_size: newPurchase.packaging_size || product.packaging_size
          })
          .eq('id', product.id)
          .eq('organization_id', currentOrganization.id);

        if (updateError) throw updateError;

        // Update local state
        if (product) {
          const updatedProductId = product.id;
          setProducts(products.map(p =>
            p.id === updatedProductId
              ? {
                  ...p,
                  quantity: newQuantity,
                  cost_per_unit: newPurchase.cost_per_unit,
                  supplier: newPurchase.supplier,
                  batch_number: newPurchase.batch_number || p.batch_number,
                  packaging_type: newPurchase.packaging_type || p.packaging_type,
                  packaging_size: newPurchase.packaging_size || p.packaging_size
                }
              : p
          ));
        }

        // Upload invoice if provided
        if (newPurchase.invoice_file) {
          const fileName = `invoices/${currentOrganization.id}/${product.id}/${newPurchase.invoice_number || Date.now()}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, newPurchase.invoice_file);

          if (uploadError) {
            console.error('Error uploading invoice:', uploadError);
          }
        }
      } else {
        setError('Veuillez sélectionner un produit existant ou entrer le nom d\'un nouveau produit');
        return;
      }

      setShowAddPurchase(false);
      // Reset form
      setNewPurchase({
        product_id: '',
        product_name: '',
        category: '',
        brand: '',
        packaging_type: '',
        packaging_size: 0,
        quantity: 0,
        unit: 'units',
        cost_per_unit: 0,
        total_cost: 0,
        supplier: '',
        supplier_id: '',
        warehouse_id: '',
        notes: '',
        batch_number: '',
        purchase_date: new Date().toISOString().split('T')[0],
        invoice_file: null,
        invoice_number: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding purchase:', error);
      setError(error instanceof Error ? error.message : 'Failed to add purchase');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;
    if (!currentOrganization) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
      setError(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete product');
    }
  };

  const handleAddSupplier = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          ...newSupplier,
          organization_id: currentOrganization.id
        }])
        .select()
        .single();

      if (error) throw error;

      setSuppliers([...suppliers, data]);
      setShowAddSupplier(false);
      setNewSupplier({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'Morocco',
        website: '',
        tax_id: '',
        payment_terms: '',
        notes: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding supplier:', error);
      setError(error instanceof Error ? error.message : 'Failed to add supplier');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur?')) return;
    if (!currentOrganization) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      setSuppliers(suppliers.filter(s => s.id !== id));
      setError(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete supplier');
    }
  };

  const handleAddWarehouse = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('warehouses')
        .insert([{
          ...newWarehouse,
          capacity: newWarehouse.capacity ? parseFloat(newWarehouse.capacity) : null,
          organization_id: currentOrganization.id,
          farm_id: currentFarm?.id || null
        }])
        .select()
        .single();

      if (error) throw error;

      setWarehouses([...warehouses, data]);
      setShowAddWarehouse(false);
      setNewWarehouse({
        name: '',
        description: '',
        location: '',
        address: '',
        city: '',
        postal_code: '',
        capacity: '',
        capacity_unit: 'm3',
        temperature_controlled: false,
        humidity_controlled: false,
        security_level: 'standard',
        manager_name: '',
        manager_phone: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding warehouse:', error);
      setError(error instanceof Error ? error.message : 'Failed to add warehouse');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entrepôt?')) return;
    if (!currentOrganization) return;

    try {
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active: false })
        .eq('id', id)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      setWarehouses(warehouses.filter(w => w.id !== id));
      setError(null);
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete warehouse');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Gestion du Stock
        </h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'stock'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Stock</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Fournisseurs</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'warehouses'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Warehouse className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Entrepôts</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
        {activeTab === 'stock' && (
          <button
            onClick={() => setShowAddPurchase(true)}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nouvel Achat</span>
          </button>
        )}
        {activeTab === 'suppliers' && (
          <button
            onClick={() => setShowAddSupplier(true)}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nouveau Fournisseur</span>
          </button>
        )}
        {activeTab === 'warehouses' && (
          <button
            onClick={() => setShowAddWarehouse(true)}
            className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nouvel Entrepôt</span>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'stock' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:pl-10 text-sm"
            />
          </div>

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Produit
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Stock
              </th>
              <th className="hidden sm:table-cell px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Prix Unitaire
              </th>
              <th className="hidden md:table-cell px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {products
              .filter(product =>
                product.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((product) => (
                <tr key={product.id}>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                      </div>
                      <div className="ml-2 sm:ml-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {product.item_name}
                          {product.packaging_type && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                              {product.packaging_type} {product.packaging_size && `${product.packaging_size}${product.unit}`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {product.category} • {product.supplier}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                    <div className="flex items-center">
                      <span className={`text-xs sm:text-sm ${
                        product.status === 'out_of_stock'
                          ? 'text-red-600 dark:text-red-400'
                          : product.status === 'low_stock'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {product.quantity} {product.unit}
                      </span>
                      {(product.status === 'low_stock' || product.status === 'out_of_stock') && (
                        <AlertTriangle className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                      )}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {product.cost_per_unit?.toFixed(2)} {currencySymbol}/{product.unit}
                  </td>
                  <td className="hidden md:table-cell px-4 lg:px-6 py-3 sm:py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'available'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : product.status === 'low_stock'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {product.status === 'available' ? 'Disponible' :
                       product.status === 'low_stock' ? 'Stock faible' : 'Rupture'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-medium">
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun produit</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Commencez par ajouter un nouveau produit à votre inventaire.
            </p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Suppliers List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Localisation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {suppliers
                  .filter(supplier =>
                    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    supplier.city?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {supplier.contact_person}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          {supplier.email && (
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {supplier.city && supplier.country ? `${supplier.city}, ${supplier.country}` : supplier.country || supplier.city || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {suppliers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun fournisseur</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Commencez par ajouter un nouveau fournisseur.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un entrepôt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Warehouses List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Entrepôt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Capacité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Responsable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Conditions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {warehouses
                  .filter(warehouse =>
                    warehouse.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    warehouse.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    warehouse.manager_name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Warehouse className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {warehouse.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {warehouse.location || warehouse.city || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {warehouse.capacity ? `${warehouse.capacity} ${warehouse.capacity_unit}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {warehouse.manager_name || '-'}
                        </div>
                        {warehouse.manager_phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {warehouse.manager_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs space-y-1">
                          {warehouse.temperature_controlled && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Température contrôlée
                            </span>
                          )}
                          {warehouse.humidity_controlled && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Humidité contrôlée
                            </span>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            Sécurité: {warehouse.security_level}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteWarehouse(warehouse.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {warehouses.length === 0 && (
              <div className="text-center py-12">
                <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun entrepôt</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Commencez par ajouter un nouvel entrepôt.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Removed Add Product Modal - Products are now created automatically during purchase */}
      {/* {showAddProduct && (
        <div className="modal-overlay">
          <div className="modal-panel p-4 sm:p-6 max-w-2xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                Nouveau Produit
              </h3>
              <button
                onClick={() => setShowAddProduct(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
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
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500 order-2 sm:order-1"
              >
                Annuler
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!newProduct.item_name || !newProduct.category || newProduct.quantity === undefined || newProduct.quantity < 0 || !newProduct.unit}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )} */}

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <div className="modal-overlay">
          <div className="modal-panel p-4 sm:p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nouvel Achat de Produit
              </h3>
              <button
                onClick={() => setShowAddPurchase(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Toggle between existing product or new product */}
            <div className="mb-6">
              <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setNewPurchase({ ...newPurchase, product_id: '', product_name: '' })}
                  className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                    !newPurchase.product_id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Nouveau Produit
                </button>
                <button
                  onClick={() => setNewPurchase({ ...newPurchase, product_name: '', product_id: products.length > 0 ? products[0].id : '' })}
                  className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                    newPurchase.product_id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  disabled={products.length === 0}
                >
                  Produit Existant
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Product Selection or Creation */}
              {newPurchase.product_id ? (
                <div>
                  <FormField label="Sélectionner un produit existant *" htmlFor="purchase_product" required>
                    <Select
                      id="purchase_product"
                      value={newPurchase.product_id}
                      onChange={(e) => {
                        const value = (e.target as HTMLSelectElement).value;
                        const product = products.find(p => p.id === value);
                        setNewPurchase({
                          ...newPurchase,
                          product_id: value,
                          cost_per_unit: product?.cost_per_unit || 0,
                          supplier: product?.supplier || '',
                          unit: product?.unit || 'units',
                          packaging_type: product?.packaging_type || '',
                          packaging_size: product?.packaging_size || 0
                        });
                      }}
                      required
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.item_name}
                          {product.packaging_type && ` - ${product.packaging_type} ${product.packaging_size}${product.unit}`}
                          ({product.quantity} {product.unit} en stock)
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              ) : (
                <>
                  {/* New Product Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <FormField label="Nom du produit *" htmlFor="product_name" required>
                        <Input
                          id="product_name"
                          type="text"
                          value={newPurchase.product_name}
                          onChange={(e) => setNewPurchase({ ...newPurchase, product_name: e.target.value })}
                          placeholder="Ex: Engrais NPK 15-15-15"
                          required
                        />
                      </FormField>
                    </div>

                    <div>
                      <FormField label="Catégorie *" htmlFor="purchase_category" required>
                        <Select
                          id="purchase_category"
                          value={newPurchase.category}
                          onChange={(e) => setNewPurchase({ ...newPurchase, category: (e.target as HTMLSelectElement).value })}
                          required
                        >
                          <option value="">Sélectionner...</option>
                          <option value="seeds">Semences</option>
                          <option value="fertilizers">Engrais</option>
                          <option value="pesticides">Pesticides</option>
                          <option value="herbicides">Herbicides</option>
                          <option value="fungicides">Fongicides</option>
                          <option value="equipment">Équipement</option>
                          <option value="tools">Outils</option>
                          <option value="irrigation">Irrigation</option>
                          <option value="other">Autre</option>
                        </Select>
                      </FormField>
                    </div>

                    <div>
                      <FormField label="Marque" htmlFor="purchase_brand">
                        <Input
                          id="purchase_brand"
                          type="text"
                          value={newPurchase.brand}
                          onChange={(e) => setNewPurchase({ ...newPurchase, brand: e.target.value })}
                          placeholder="Ex: Bayer, Syngenta, etc."
                        />
                      </FormField>
                    </div>
                  </div>
                </>
              )}

              {/* Packaging Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Conditionnement</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <FormField label="Type de conditionnement *" htmlFor="packaging_type" required>
                      <Select
                        id="packaging_type"
                        value={newPurchase.packaging_type}
                        onChange={(e) => setNewPurchase({ ...newPurchase, packaging_type: (e.target as HTMLSelectElement).value })}
                        required
                      >
                        <option value="">Sélectionner...</option>
                        <option value="bidon">Bidon</option>
                        <option value="bouteille">Bouteille</option>
                        <option value="sac">Sac</option>
                        <option value="boite">Boîte</option>
                        <option value="carton">Carton</option>
                        <option value="palette">Palette</option>
                        <option value="vrac">Vrac</option>
                        <option value="unite">Unité</option>
                      </Select>
                    </FormField>
                  </div>

                  <div>
                    <FormField label="Taille *" htmlFor="packaging_size" required>
                      <Input
                        id="packaging_size"
                        type="number"
                        step="0.01"
                        value={newPurchase.packaging_size}
                        onChange={(e) => setNewPurchase({ ...newPurchase, packaging_size: Number(e.target.value) })}
                        placeholder="Ex: 5, 25, 1000"
                        required
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField label="Unité *" htmlFor="purchase_unit" required>
                      <Select
                        id="purchase_unit"
                        value={newPurchase.unit}
                        onChange={(e) => setNewPurchase({ ...newPurchase, unit: (e.target as HTMLSelectElement).value })}
                        required
                      >
                        <option value="L">Litres (L)</option>
                        <option value="mL">Millilitres (mL)</option>
                        <option value="kg">Kilogrammes (kg)</option>
                        <option value="g">Grammes (g)</option>
                        <option value="units">Unités</option>
                        <option value="pieces">Pièces</option>
                        <option value="m">Mètres (m)</option>
                        <option value="m2">Mètres carrés (m²)</option>
                      </Select>
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormField label="Quantité achetée *" htmlFor="purchase_qty" required>
                    <Input
                      id="purchase_qty"
                      type="number"
                      value={newPurchase.quantity}
                      onChange={(e) => setNewPurchase({
                        ...newPurchase,
                        quantity: Number(e.target.value),
                        total_cost: Number(e.target.value) * newPurchase.cost_per_unit
                      })}
                      placeholder="Nombre de conditionnements"
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={`Prix unitaire (${currencySymbol}) *`} htmlFor="purchase_cpu" required>
                    <Input
                      id="purchase_cpu"
                      type="number"
                      step="0.01"
                      value={newPurchase.cost_per_unit}
                      onChange={(e) => setNewPurchase({
                        ...newPurchase,
                        cost_per_unit: Number(e.target.value),
                        total_cost: newPurchase.quantity * Number(e.target.value)
                      })}
                      placeholder="Prix par conditionnement"
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Date d'achat *" htmlFor="purchase_date" required>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={newPurchase.purchase_date}
                      onChange={(e) => setNewPurchase({ ...newPurchase, purchase_date: e.target.value })}
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Numéro de lot" htmlFor="purchase_batch">
                    <Input
                      id="purchase_batch"
                      type="text"
                      value={newPurchase.batch_number}
                      onChange={(e) => setNewPurchase({ ...newPurchase, batch_number: e.target.value })}
                      placeholder="Ex: LOT2024001"
                    />
                  </FormField>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormField label="Fournisseur *" htmlFor="purchase_supplier" required>
                    <Select
                      id="purchase_supplier"
                      value={newPurchase.supplier}
                      onChange={(e) => {
                        const value = (e.target as HTMLSelectElement).value;
                        const selectedSupplier = suppliers.find(s => s.name === value);
                        setNewPurchase({
                          ...newPurchase,
                          supplier: value,
                          supplier_id: selectedSupplier?.id || ''
                        });
                      }}
                      required
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
                  <FormField label="Entrepôt de stockage" htmlFor="purchase_warehouse">
                    <Select
                      id="purchase_warehouse"
                      value={newPurchase.warehouse_id}
                      onChange={(e) => setNewPurchase({ ...newPurchase, warehouse_id: (e.target as HTMLSelectElement).value })}
                    >
                      <option value="">Sélectionner un entrepôt</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* Invoice Upload */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Document d'achat</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FormField label="Numéro de facture/bon" htmlFor="invoice_number">
                      <Input
                        id="invoice_number"
                        type="text"
                        value={newPurchase.invoice_number}
                        onChange={(e) => setNewPurchase({ ...newPurchase, invoice_number: e.target.value })}
                        placeholder="Ex: FAC-2024-001"
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField label="Importer facture/bon (PDF, Image)" htmlFor="invoice_file">
                      <div className="flex items-center space-x-2">
                        <label htmlFor="invoice_upload" className="cursor-pointer flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">{newPurchase.invoice_file ? newPurchase.invoice_file.name : 'Choisir un fichier'}</span>
                        </label>
                        <input
                          id="invoice_upload"
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewPurchase({ ...newPurchase, invoice_file: file });
                            }
                          }}
                          className="hidden"
                        />
                        {newPurchase.invoice_file && (
                          <button
                            onClick={() => setNewPurchase({ ...newPurchase, invoice_file: null })}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <FormField label="Notes" htmlFor="purchase_notes">
                  <Textarea
                    id="purchase_notes"
                    value={newPurchase.notes}
                    onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                    rows={3}
                    placeholder="Informations supplémentaires sur cet achat..."
                  />
                </FormField>
              </div>

              {/* Total */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total de l'achat
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {(newPurchase.quantity * newPurchase.cost_per_unit).toFixed(2)} {currencySymbol}
                  </span>
                </div>
                {newPurchase.packaging_type && newPurchase.packaging_size > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {newPurchase.quantity} × {newPurchase.packaging_type} de {newPurchase.packaging_size}{newPurchase.unit}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddPurchase(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddPurchase}
                disabled={(!newPurchase.product_id && !newPurchase.product_name) || !newPurchase.quantity || !newPurchase.cost_per_unit || !newPurchase.packaging_type}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Enregistrer l'achat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nouveau Fournisseur
              </h3>
              <button
                onClick={() => setShowAddSupplier(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField label="Nom du fournisseur *" htmlFor="supplier_name" required>
                    <Input
                      id="supplier_name"
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Personne de contact" htmlFor="supplier_contact">
                    <Input
                      id="supplier_contact"
                      type="text"
                      value={newSupplier.contact_person}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Email" htmlFor="supplier_email">
                    <Input
                      id="supplier_email"
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Téléphone" htmlFor="supplier_phone">
                    <Input
                      id="supplier_phone"
                      type="tel"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Adresse" htmlFor="supplier_address">
                    <Input
                      id="supplier_address"
                      type="text"
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Ville" htmlFor="supplier_city">
                    <Input
                      id="supplier_city"
                      type="text"
                      value={newSupplier.city}
                      onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Code postal" htmlFor="supplier_postal">
                    <Input
                      id="supplier_postal"
                      type="text"
                      value={newSupplier.postal_code}
                      onChange={(e) => setNewSupplier({ ...newSupplier, postal_code: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Pays" htmlFor="supplier_country">
                    <Input
                      id="supplier_country"
                      type="text"
                      value={newSupplier.country}
                      onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Site web" htmlFor="supplier_website">
                    <Input
                      id="supplier_website"
                      type="url"
                      value={newSupplier.website}
                      onChange={(e) => setNewSupplier({ ...newSupplier, website: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Numéro TVA" htmlFor="supplier_tax">
                    <Input
                      id="supplier_tax"
                      type="text"
                      value={newSupplier.tax_id}
                      onChange={(e) => setNewSupplier({ ...newSupplier, tax_id: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Conditions de paiement" htmlFor="supplier_payment" helper="Ex: Net 30, COD, etc.">
                    <Input
                      id="supplier_payment"
                      type="text"
                      value={newSupplier.payment_terms}
                      onChange={(e) => setNewSupplier({ ...newSupplier, payment_terms: e.target.value })}
                      placeholder="Net 30, COD, etc."
                    />
                  </FormField>
                </div>

                <div className="col-span-2">
                  <FormField label="Notes" htmlFor="supplier_notes">
                    <Textarea
                      id="supplier_notes"
                      value={newSupplier.notes}
                      onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                      rows={3}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddSupplier(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={!newSupplier.name}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
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
                Nouvel Entrepôt
              </h3>
              <button
                onClick={() => setShowAddWarehouse(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField label="Nom de l'entrepôt *" htmlFor="warehouse_name" required>
                    <Input
                      id="warehouse_name"
                      type="text"
                      value={newWarehouse.name}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                      required
                    />
                  </FormField>
                </div>

                <div className="col-span-2">
                  <FormField label="Description" htmlFor="warehouse_desc">
                    <Textarea
                      id="warehouse_desc"
                      value={newWarehouse.description}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, description: e.target.value })}
                      rows={2}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Emplacement" htmlFor="warehouse_location">
                    <Input
                      id="warehouse_location"
                      type="text"
                      value={newWarehouse.location}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Adresse" htmlFor="warehouse_address">
                    <Input
                      id="warehouse_address"
                      type="text"
                      value={newWarehouse.address}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Ville" htmlFor="warehouse_city">
                    <Input
                      id="warehouse_city"
                      type="text"
                      value={newWarehouse.city}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, city: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Code postal" htmlFor="warehouse_postal">
                    <Input
                      id="warehouse_postal"
                      type="text"
                      value={newWarehouse.postal_code}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, postal_code: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Capacité" htmlFor="warehouse_capacity">
                    <Input
                      id="warehouse_capacity"
                      type="number"
                      step={1}
                      value={newWarehouse.capacity}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Unité de capacité" htmlFor="warehouse_capacity_unit">
                    <Select
                      id="warehouse_capacity_unit"
                      value={newWarehouse.capacity_unit}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity_unit: (e.target as HTMLSelectElement).value })}
                    >
                      <option value="m3">Mètres cubes (m³)</option>
                      <option value="m2">Mètres carrés (m²)</option>
                      <option value="kg">Kilogrammes</option>
                      <option value="t">Tonnes</option>
                    </Select>
                  </FormField>
                </div>

                <div>
                  <FormField label="Responsable" htmlFor="warehouse_manager">
                    <Input
                      id="warehouse_manager"
                      type="text"
                      value={newWarehouse.manager_name}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, manager_name: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Téléphone du responsable" htmlFor="warehouse_manager_phone">
                    <Input
                      id="warehouse_manager_phone"
                      type="tel"
                      value={newWarehouse.manager_phone}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, manager_phone: e.target.value })}
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="Niveau de sécurité" htmlFor="warehouse_security">
                    <Select
                      id="warehouse_security"
                      value={newWarehouse.security_level}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, security_level: (e.target as HTMLSelectElement).value })}
                    >
                      <option value="basic">Basique</option>
                      <option value="standard">Standard</option>
                      <option value="high">Élevé</option>
                      <option value="maximum">Maximum</option>
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
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, temperature_controlled: e.target.checked })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label htmlFor="temperature_controlled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Température contrôlée
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="humidity_controlled"
                        checked={newWarehouse.humidity_controlled}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, humidity_controlled: e.target.checked })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label htmlFor="humidity_controlled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Humidité contrôlée
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddWarehouse(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddWarehouse}
                disabled={!newWarehouse.name}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
