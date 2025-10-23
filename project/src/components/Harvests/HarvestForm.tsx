import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAuth } from '../MultiTenantAuthProvider';
import { useFarms, useParcelsByFarm } from '../../hooks/useParcelsQuery';
import { useCreateHarvest, useUpdateHarvest } from '../../hooks/useHarvests';
import type { HarvestSummary } from '../../types/harvests';

interface HarvestFormProps {
  harvest?: HarvestSummary | null;
  onClose: () => void;
}

const HarvestForm: React.FC<HarvestFormProps> = ({ harvest, onClose }) => {
  const { currentOrganization } = useAuth();
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const [formData, setFormData] = useState({
    farm_id: harvest?.farm_id || '',
    parcel_id: harvest?.parcel_id || '',
    harvest_date: harvest?.harvest_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    quantity: harvest?.quantity || 0,
    unit: harvest?.unit || 'kg',
    status: harvest?.status || 'stored',
    notes: harvest?.notes || '',
  });

  const { data: parcels = [] } = useParcelsByFarm(formData.farm_id || null);
  const createMutation = useCreateHarvest();
  const updateMutation = useUpdateHarvest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    try {
      if (harvest) {
        await updateMutation.mutateAsync({ harvestId: harvest.id, updates: formData });
      } else {
        await createMutation.mutateAsync({ ...formData, organization_id: currentOrganization.id, workers: [] } as any);
      }
      onClose();
    } catch (error) {
      alert('Erreur');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">{harvest ? 'Modifier' : 'Nouvelle récolte'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <select required value={formData.farm_id} onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Ferme</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select required value={formData.parcel_id} onChange={(e) => setFormData({ ...formData, parcel_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Parcelle</option>
            {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" required value={formData.harvest_date} onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          <input type="number" required placeholder="Quantité" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HarvestForm;
