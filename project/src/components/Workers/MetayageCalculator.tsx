import React, { useState, useEffect } from 'react';
import { Calculator, Info, Save } from 'lucide-react';
import { useWorkers, useCalculateMetayageShare, useCreateMetayageSettlement } from '../../hooks/useWorkers';
import { calculateMetayageShare } from '../../types/workers';
import type { CalculationBasis } from '../../types/workers';

interface MetayageCalculatorProps {
  organizationId: string;
  farmId?: string;
  onSuccess?: () => void;
}

const MetayageCalculator: React.FC<MetayageCalculatorProps> = ({
  organizationId,
  farmId,
  onSuccess,
}) => {
  const { data: workers = [] } = useWorkers(organizationId, farmId);
  const _calculateShare = useCalculateMetayageShare();
  const createSettlement = useCreateMetayageSettlement();

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [grossRevenue, setGrossRevenue] = useState<string>('');
  const [totalCharges, setTotalCharges] = useState<string>('');
  const [calculationBasis, setCalculationBasis] = useState<CalculationBasis>('net_revenue');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [harvestDate, setHarvestDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const metayageWorkers = workers.filter(w => w.worker_type === 'metayage' && w.is_active);
  const selectedWorker = metayageWorkers.find(w => w.id === selectedWorkerId);

  // Auto-set calculation basis from worker
  useEffect(() => {
    if (selectedWorker?.calculation_basis) {
      setCalculationBasis(selectedWorker.calculation_basis);
    }
  }, [selectedWorker]);

  // Calculate share
  const grossRevenueNum = parseFloat(grossRevenue) || 0;
  const totalChargesNum = parseFloat(totalCharges) || 0;
  const percentage = selectedWorker?.metayage_percentage || 0;

  const netRevenue = grossRevenueNum - totalChargesNum;
  const baseAmount = calculationBasis === 'gross_revenue' ? grossRevenueNum : netRevenue;
  const workerShare = calculateMetayageShare(
    grossRevenueNum,
    totalChargesNum,
    percentage,
    calculationBasis
  );

  const handleSaveSettlement = async () => {
    if (!selectedWorkerId || !grossRevenue || !periodStart || !periodEnd) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await createSettlement.mutateAsync({
        worker_id: selectedWorkerId,
        farm_id: farmId || '',
        period_start: periodStart,
        period_end: periodEnd,
        harvest_date: harvestDate || undefined,
        gross_revenue: grossRevenueNum,
        total_charges: totalChargesNum,
        worker_percentage: percentage,
        worker_share_amount: workerShare,
        calculation_basis: calculationBasis,
        payment_status: 'pending',
        notes: notes || undefined,
      });

      // Reset form
      setSelectedWorkerId('');
      setGrossRevenue('');
      setTotalCharges('');
      setPeriodStart('');
      setPeriodEnd('');
      setHarvestDate('');
      setNotes('');

      onSuccess?.();
      alert('Règlement enregistré avec succès');
    } catch (error) {
      console.error('Error saving settlement:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Calculateur de Métayage
        </h2>
      </div>

      {metayageWorkers.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Aucun travailleur en métayage actif. Veuillez d'abord ajouter un travailleur de type "Métayage".
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Worker Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Travailleur (Khammass/Rebâa) *
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Sélectionner un travailleur --</option>
              {metayageWorkers.map(worker => (
                <option key={worker.id} value={worker.id}>
                  {worker.first_name} {worker.last_name} ({worker.metayage_type?.toUpperCase()} - {worker.metayage_percentage}%)
                </option>
              ))}
            </select>
          </div>

          {selectedWorker && (
            <>
              {/* Worker Info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                      Configuration du travailleur:
                    </p>
                    <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                      <li><strong>Type:</strong> {selectedWorker.metayage_type?.toUpperCase()}</li>
                      <li><strong>Pourcentage:</strong> {selectedWorker.metayage_percentage}%</li>
                      <li>
                        <strong>Base de calcul:</strong>{' '}
                        {selectedWorker.calculation_basis === 'gross_revenue' ? 'Revenu brut' : 'Revenu net (après charges)'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Début période *
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fin période *
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date de récolte
                  </label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Revenue Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Revenu brut (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossRevenue}
                    onChange={(e) => setGrossRevenue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="15000.00"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Montant total de la vente de la récolte
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Charges totales (DH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCharges}
                    onChange={(e) => setTotalCharges(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="3000.00"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Intrants, eau, frais de récolte, etc.
                  </p>
                </div>
              </div>

              {/* Calculation Basis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base de calcul
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                    calculationBasis === 'gross_revenue'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <input
                      type="radio"
                      value="gross_revenue"
                      checked={calculationBasis === 'gross_revenue'}
                      onChange={(e) => setCalculationBasis(e.target.value as CalculationBasis)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Revenu brut
                    </span>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                    calculationBasis === 'net_revenue'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <input
                      type="radio"
                      value="net_revenue"
                      checked={calculationBasis === 'net_revenue'}
                      onChange={(e) => setCalculationBasis(e.target.value as CalculationBasis)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Revenu net (après charges)
                    </span>
                  </label>
                </div>
              </div>

              {/* Calculation Results */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Résultat du calcul
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Revenu brut:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {grossRevenueNum.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Charges totales:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        -{totalChargesNum.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-purple-200 dark:border-purple-700">
                      <span className="text-gray-600 dark:text-gray-400">Revenu net:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {netRevenue.toFixed(2)} DH
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Base de calcul:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {baseAmount.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Pourcentage travailleur:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">Part travailleur:</span>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {workerShare.toFixed(2)} DH
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Détails sur la récolte, conditions spéciales..."
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettlement}
                  disabled={createSettlement.isPending || !grossRevenue || !periodStart || !periodEnd}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createSettlement.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Enregistrer le règlement</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MetayageCalculator;
