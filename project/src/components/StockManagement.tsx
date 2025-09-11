import React, { useState, useEffect } from 'react';
import { Plus, Package, ShoppingCart, AlertTriangle, Search, Edit2, Trash2, X } from 'lucide-react';
import { supabase, DEFAULT_FARM_ID } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  category_id: string;
  subcategory_id: string;
  quantity: number;
  unit: string;
  minimum_level: number;
  price_per_unit: number;
  supplier: string;
  last_purchase_date: string;
  product_categories?: {
    name: string;
    code: string;
  };
  product_subcategories?: {
    name: string;
    code: string;
  };
}

interface Purchase {
  id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  purchase_date: string;
  supplier: string;
  notes: string;
}

const StockManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProduct, setNewProduct] = useState({
    name: '',
    category_id: '',
    subcategory_id: '',
    quantity: 0,
    unit: '',
    minimum_level: 0,
    price_per_unit: 0,
    supplier: ''
  });

  const [newPurchase, setNewPurchase] = useState({
    product_id: '',
    quantity: 0,
    price_per_unit: 0,
    total_price: 0,
    supplier: '',
    notes: '',
    purchase_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product_categories (
            name,
            code
          ),
          product_subcategories (
            name,
            code
          )
        `)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert([{
          ...newProduct,
          farm_id: DEFAULT_FARM_ID
        }])
        .select()
        .single();

      if (error) throw error;

      setProducts([...products, data]);
      setShowAddProduct(false);
      setNewProduct({
        name: '',
        category_id: '',
        subcategory_id: '',
        quantity: 0,
        unit: '',
        minimum_level: 0,
        price_per_unit: 0,
        supplier: ''
      });
    } catch (error) {
      console.error('Error adding product:', error);
      setError('Failed to add product');
    }
  };

  const handleAddPurchase = async () => {
    try {
      // First, create the purchase record
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          ...newPurchase,
          farm_id: DEFAULT_FARM_ID,
          total_price: newPurchase.quantity * newPurchase.price_per_unit
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Then update the product quantity and last purchase date
      const product = products.find(p => p.id === newPurchase.product_id);
      if (product) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: product.quantity + newPurchase.quantity,
            last_purchase_date: newPurchase.purchase_date,
            price_per_unit: newPurchase.price_per_unit,
            supplier: newPurchase.supplier
          })
          .eq('id', product.id)
          .eq('farm_id', DEFAULT_FARM_ID);

        if (updateError) throw updateError;

        // Update local state
        setProducts(products.map(p => 
          p.id === product.id 
            ? {
                ...p,
                quantity: p.quantity + newPurchase.quantity,
                last_purchase_date: newPurchase.purchase_date,
                price_per_unit: newPurchase.price_per_unit,
                supplier: newPurchase.supplier
              }
            : p
        ));
      }

      setShowAddPurchase(false);
      setNewPurchase({
        product_id: '',
        quantity: 0,
        price_per_unit: 0,
        total_price: 0,
        supplier: '',
        notes: '',
        purchase_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding purchase:', error);
      setError('Failed to add purchase');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product');
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion du Stock
        </h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="h-5 w-5" />
            <span>Nouveau Produit</span>
          </button>
          <button
            onClick={() => setShowAddPurchase(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Nouvel Achat</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
        />
      </div>

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Produit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Prix Unitaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Dernier Achat
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {products
              .filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {product.supplier}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm ${
                        product.quantity <= product.minimum_level
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {product.quantity} {product.unit}
                      </span>
                      {product.quantity <= product.minimum_level && (
                        <AlertTriangle className="ml-2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {product.price_per_unit?.toFixed(2)} €/{product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {product.last_purchase_date ? new Date(product.last_purchase_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nouvel Achat
              </h3>
              <button
                onClick={() => setShowAddPurchase(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Produit
                </label>
                <select
                  value={newPurchase.product_id}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setNewPurchase({
                      ...newPurchase,
                      product_id: e.target.value,
                      price_per_unit: product?.price_per_unit || 0,
                      supplier: product?.supplier || ''
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity} {product.unit} en stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={newPurchase.quantity}
                    onChange={(e) => setNewPurchase({
                      ...newPurchase,
                      quantity: Number(e.target.value),
                      total_price: Number(e.target.value) * newPurchase.price_per_unit
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prix Unitaire (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPurchase.price_per_unit}
                    onChange={(e) => setNewPurchase({
                      ...newPurchase,
                      price_per_unit: Number(e.target.value),
                      total_price: newPurchase.quantity * Number(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date d'achat
                </label>
                <input
                  type="date"
                  value={newPurchase.purchase_date}
                  onChange={(e) => setNewPurchase({ ...newPurchase, purchase_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={newPurchase.supplier}
                  onChange={(e) => setNewPurchase({ ...newPurchase, supplier: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={newPurchase.notes}
                  onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                ></textarea>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {(newPurchase.quantity * newPurchase.price_per_unit).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddPurchase(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddPurchase}
                disabled={!newPurchase.product_id || !newPurchase.quantity}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;