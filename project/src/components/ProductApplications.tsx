import {  useState, useEffect, useCallback  } from "react";
import { useTranslation } from 'react-i18next';
import { Plus, X, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_CURRENCY } from '../utils/currencies';
import { productApplicationsApi, ProductApplication } from '../lib/api/product-applications';
import { inventoryApi, InventoryProduct } from '../lib/api/inventory';
import { parcelsApi, Parcel } from '../lib/api/parcels';
import { farmsApi } from '../lib/api/farms';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/ui/loader';


type Application = ProductApplication;

const ProductApplications = () => {
  const { t } = useTranslation();
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

  const fetchParcels = useCallback(async () => {
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
  }, [currentOrganization?.id]);

  const fetchUserFarm = useCallback(async () => {
    try {
      if (!currentOrganization?.id) return;

      const data = await farmsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );

      const farms = (data || []).map((farm: { farm_id?: string; id?: string; farm_name?: string; name?: string }) => ({
        id: farm.farm_id || farm.id,
        name: farm.farm_name || farm.name,
      }));

      if (farms && farms.length > 0) {
        setFarmId(farms[0].id || null);
      }
    } catch (error) {
      console.error('Error fetching user farm:', error);
    }
  }, [currentOrganization?.id]);

  const fetchApplications = useCallback(async () => {
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
  }, [currentOrganization?.id]);

  const fetchProducts = useCallback(async () => {
    try {
      if (!currentOrganization?.id) return;

      const data = await inventoryApi.getAvailableProducts(currentOrganization.id);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchApplications();
      fetchProducts();
      fetchParcels();
      fetchUserFarm();
    }
      
  }, [currentOrganization?.id, fetchApplications, fetchProducts, fetchParcels, fetchUserFarm]);

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
      <SectionLoader />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('productApplications.title', 'Product Applications')}
        </h2>
        <Button variant="green"
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-md"
        >
          <Plus className="h-5 w-5" />
          <span>{t('productApplications.addNew', 'New Application')}</span>
        </Button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('productApplications.emptyTitle', 'No applications recorded')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('productApplications.emptyDescription', 'Start by recording a new application')}
            </p>
          </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {applications.map((app) => (
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
                      {app.quantity_used} {('unit' in app.inventory ? app.inventory.unit : '')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('productApplications.areaTreatedValue', 'Area treated: {{count}} ha', { count: app.area_treated })}
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
                {t('productApplications.modalTitle', 'New Application')}
              </h3>
              <Button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="product-application-product" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('productApplications.product', 'Product')}
                </label>
                <select
                  id="product-application-product"
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
                  <option value="">{t('productApplications.selectProduct', 'Select a product')}</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity} {product.unit} {t('productApplications.available', 'available')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="product-application-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('productApplications.applicationDate', 'Application date')}
                </label>
                <input
                  id="product-application-date"
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
                  <label htmlFor="product-application-quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('productApplications.quantityUsed', 'Quantity used')}
                  </label>
                  <input
                    id="product-application-quantity"
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
                  <label htmlFor="product-application-area" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('productApplications.treatedArea', 'Treated area (ha)')}
                  </label>
                  <input
                    id="product-application-area"
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
                <label htmlFor="product-application-parcel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('productApplications.parcel', 'Parcel')}
                </label>
                <select
                  id="product-application-parcel"
                  value={newApplication.parcel_id}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    parcel_id: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">{t('productApplications.selectParcel', 'Select a parcel')}</option>
                  {parcels.map(parcel => (
                    <option key={parcel.id} value={parcel.id}>
                      {parcel.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="product-application-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('productApplications.costLabel', 'Cost ({{currency}})', { currency })}
                </label>
                <input
                  id="product-application-cost"
                  type="number"
                  step="0.01"
                  value={newApplication.cost}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    cost: Number(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder={t('productApplications.costPlaceholder', 'Total application cost in {{currency}}', { currency })}
                />
              </div>
              <div>
                <label htmlFor="product-application-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('productApplications.notes', 'Notes')}
                </label>
                <textarea
                  id="product-application-notes"
                  value={newApplication.notes}
                  onChange={(e) => setNewApplication({
                    ...newApplication,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder={t('productApplications.notesPlaceholder', 'Application conditions, observations...')}
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                {t('productApplications.cancel', 'Cancel')}
              </Button>
              <Button variant="green" onClick={handleAddApplication} disabled={!newApplication.product_id || !newApplication.quantity_used} className="px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed" >
                {t('productApplications.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductApplications;
