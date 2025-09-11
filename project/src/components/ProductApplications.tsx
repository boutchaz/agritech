import React, { useState, useEffect } from 'react';
import { Plus, X, FileText, Calendar } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface Application {
  id: string;
  product_id: string;
  application_date: string;
  quantity_used: number;
  area_treated: number;
  notes: string;
  created_at: string;
}

const ProductApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [farmId, setFarmId] = useState<string | null>(null);

  const [newApplication, setNewApplication] = useState({
    product_id: '',
    application_date: new Date().toISOString().split('T')[0],
    quantity_used: 0,
    area_treated: 0,
    notes: ''
  });

  useEffect(() => {
    fetchApplications();
    fetchProducts();
    fetchUserFarm();
  }, []);

  const fetchUserFarm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (farms) {
      setFarmId(farms.id);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('product_applications')
        .select(`
          *,
          inventory:product_id (
            name,
            unit
          )
        `)
        .order('application_date', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .gt('quantity', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddApplication = async () => {
    if (!farmId) {
      console.error('No farm ID available');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_applications')
        .insert([{
          ...newApplication,
          farm_id: farmId
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchApplications();
      await fetchProducts();
      setShowAddModal(false);
      setNewApplication({
        product_id: '',
        application_date: new Date().toISOString().split('T')[0],
        quantity_used: 0,
        area_treated: 0,
        notes: ''
      });
    } catch (error) {
      console.error('Error adding application:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Applications de Produits
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle Application</span>
        </button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune application enregistrée
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Commencez par enregistrer une nouvelle application
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {applications.map((app: any) => (
              <div key={app.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {app.inventory.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(app.application_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {app.quantity_used} {app.inventory.unit}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Surface traitée: {app.area_treated} ha
                    </p>
                  </div>
                </div>
                {app.notes && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {app.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Nouvelle Application
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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
                  value={newApplication.product_id}
                  onChange={(e) => {
                    setNewApplication({
                      ...newApplication,
                      product_id: e.target.value
                    });
                    setSelectedProduct(e.target.value);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity} {product.unit} disponible)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date d'application
                </label>
                <input
                  type="date"
                  value={newApplication.application_date}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    application_date: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantité utilisée
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newApplication.quantity_used}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      quantity_used: Number(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Surface traitée (ha)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newApplication.area_treated}
                    onChange={(e) => setNewApplication({
                      ...newApplication,
                      area_treated: Number(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={newApplication.notes}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="Conditions d'application, observations..."
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleAddApplication}
                disabled={!newApplication.product_id || !newApplication.quantity_used}
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

export default ProductApplications;