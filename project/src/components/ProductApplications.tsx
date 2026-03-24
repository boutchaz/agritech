import React, { useState, useEffect } from 'react';
import { Plus, X, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_CURRENCY } from '../utils/currencies';
import { productApplicationsApi, ProductApplication } from '../lib/api/product-applications';
import { inventoryApi, InventoryProduct } from '../lib/api/inventory';
import { parcelsApi, Parcel } from '../lib/api/parcels';
import { farmsApi } from '../lib/api/farms';

type Application = ProductApplication;

const ProductApplications: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [_selectedProduct, setSelectedProduct] = useState<string>('');
  const [farmId, setFarmId] = useState<string | null>(null);

  const currency = currentOrganization?.currency || DEFAULT_CURRENCY;

  const [newApplication, setNewApplication] = useState({
    product_id: '',
    application_date: new Date().toISOString().split('T')[0],
    quantity_used: 0,
    area_treated: 0,
    notes: '',
    parcel_id: '',
    cost: 0
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchApplications();
      fetchProducts();
      fetchParcels();
      fetchUserFarm();
    }
     
  }, [currentOrganization?.id]);

  const fetchParcels = async () => {
    try {
      if (!currentOrganization?.id) return;

      const data = await parcelsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );
      setParcels(data || []);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    }
  };

  const fetchUserFarm = async () => {
    try {
      if (!currentOrganization?.id) return;

      const data = await farmsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );

      const farms = (data || []).map((farm: any) => ({
        id: farm.farm_id || farm.id,
        name: farm.farm_name || farm.name,
      }));

      if (farms && farms.length > 0) {
        setFarmId(farms[0].id);
      }
    } catch (error) {
      console.error('Error fetching user farm:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      if (!currentOrganization?.id) {
        setLoading(false);
        return;
      }

      const data = await productApplicationsApi.getAll(currentOrganization.id);
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      if (!currentOrganization?.id) return;

      const data = await inventoryApi.getAvailableProducts(currentOrganization.id);
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

    if (!currentOrganization?.id) {
      console.error('No organization ID available');
      return;
    }

    try {
      await productApplicationsApi.create(
        {
          ...newApplication,
          farm_id: farmId,
          currency: currency,
        },
        currentOrganization.id
      );

      await fetchApplications();
      await fetchProducts();
      setShowAddModal(false);
      setNewApplication({
        product_id: '',
        application_date: new Date().toISOString().split('T')[0],
        quantity_used: 0,
        area_treated: 0,
        notes: '',
        parcel_id: '',
        cost: 0
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
                    step="1"
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
                    step="1"
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
                  Parcelle
                </label>
                <select
                  value={newApplication.parcel_id}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    parcel_id: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Sélectionner une parcelle</option>
                  {parcels.map(parcel => (
                    <option key={parcel.id} value={parcel.id}>
                      {parcel.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Coût ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newApplication.cost}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    cost: Number(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder={`Coût total de l'application en ${currency}`}
                />
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