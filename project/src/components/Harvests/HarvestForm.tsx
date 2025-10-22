import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useCreateHarvest } from '../../hooks/useHarvests';
import { useWorkers } from '../../hooks/useWorkers';
import type { CreateHarvestRequest, HarvestUnit, QualityGrade } from '../../types/harvests';

interface HarvestFormProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
  parcels: Array<{ id: string; name: string; farm_id: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const HarvestForm: React.FC<HarvestFormProps> = ({
  organizationId,
  farms,
  parcels,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<CreateHarvestRequest>>({
    farm_id: '',
    parcel_id: '',
    harvest_date: new Date().toISOString().split('T')[0],
    quantity: 0,
    unit: 'kg',
    workers: [],
    expected_price_per_unit: 0,
  });

  const [newWorker, setNewWorker] = useState({
    worker_id: '',
    hours_worked: 8,
    quantity_picked: 0,
  });

  const createHarvest = useCreateHarvest();
  const { data: workers = [] } = useWorkers(organizationId);

  const availableParcels = parcels.filter(p => p.farm_id === formData.farm_id);

  const handleAddWorker = () => {
    if (newWorker.worker_id) {
      setFormData({
        ...formData,
        workers: [...(formData.workers || []), newWorker],
      });
      setNewWorker({ worker_id: '', hours_worked: 8, quantity_picked: 0 });
    }
  };

  const handleRemoveWorker = (index: number) => {
    setFormData({
      ...formData,
      workers: formData.workers?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createHarvest.mutateAsync({
        ...formData as CreateHarvestRequest,
        organization_id: organizationId,
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating harvest:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Enregistrer une récolte
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Farm & Parcel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ferme *
              </label>
              <select
                required
                value={formData.farm_id}
                onChange={(e) => setFormData({ ...formData, farm_id: e.target.value, parcel_id: '' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Sélectionnez une ferme</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parcelle *
              </label>
              <select
                required
                value={formData.parcel_id}
                onChange={(e) => setFormData({ ...formData, parcel_id: e.target.value })}
                disabled={!formData.farm_id}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">Sélectionnez une parcelle</option>
                {availableParcels.map(parcel => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Quantity */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de récolte *
              </label>
              <input
                type="date"
                required
                value={formData.harvest_date}
                onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unité *
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as HarvestUnit })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="kg">Kilogrammes</option>
                <option value="tons">Tonnes</option>
                <option value="units">Unités</option>
                <option value="boxes">Caisses</option>
                <option value="crates">Cageots</option>
                <option value="liters">Litres</option>
              </select>
            </div>
          </div>

          {/* Quality */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grade de qualité
              </label>
              <select
                value={formData.quality_grade}
                onChange={(e) => setFormData({ ...formData, quality_grade: e.target.value as QualityGrade })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Non spécifié</option>
                <option value="Extra">Extra</option>
                <option value="A">A</option>
                <option value="First">Premier choix</option>
                <option value="B">B</option>
                <option value="Second">Deuxième choix</option>
                <option value="C">C</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Score qualité (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.quality_score}
                onChange={(e) => setFormData({ ...formData, quality_score: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix unitaire estimé
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_price_per_unit}
                onChange={(e) => setFormData({ ...formData, expected_price_per_unit: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Workers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Travailleurs impliqués
            </label>
            
            {/* Add Worker */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <select
                value={newWorker.worker_id}
                onChange={(e) => setNewWorker({ ...newWorker, worker_id: e.target.value })}
                className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Sélectionner un travailleur</option>
                {workers.filter(w => w.is_active).map(worker => (
                  <option key={worker.id} value={worker.id}>
                    {worker.first_name} {worker.last_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.5"
                value={newWorker.hours_worked}
                onChange={(e) => setNewWorker({ ...newWorker, hours_worked: parseFloat(e.target.value) })}
                placeholder="Heures"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddWorker}
                disabled={!newWorker.worker_id}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>

            {/* Workers List */}
            {formData.workers && formData.workers.length > 0 && (
              <div className="space-y-2">
                {formData.workers.map((worker, index) => {
                  const workerInfo = workers.find(w => w.id === worker.worker_id);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {workerInfo?.first_name} {workerInfo?.last_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {worker.hours_worked}h travaillées
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorker(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Observations sur la récolte..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createHarvest.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createHarvest.isPending ? 'Enregistrement...' : 'Enregistrer la récolte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HarvestForm;

