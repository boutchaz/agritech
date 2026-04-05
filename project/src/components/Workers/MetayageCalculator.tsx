import {  useState, useEffect  } from "react";
import { Calculator, Info, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWorkers, useCreateMetayageSettlement } from '../../hooks/useWorkers';
import { calculateMetayageShare } from '../../types/workers';
import type { CalculationBasis } from '../../types/workers';
import { useCurrency } from '../../hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { ButtonLoader } from '@/components/ui/loader';


interface MetayageCalculatorProps {
  organizationId: string;
  farmId?: string;
  onSuccess?: () => void;
}

const MetayageCalculator = ({
  organizationId,
  farmId,
  onSuccess,
}: MetayageCalculatorProps) => {
  const { t } = useTranslation();
  const { data: workers = [] } = useWorkers(organizationId, farmId);
  const createSettlement = useCreateMetayageSettlement();
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();

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
  /* eslint-disable react-hooks/set-state-in-effect -- sync state from worker prop */
  useEffect(() => {
    if (selectedWorker?.calculation_basis) {
      setCalculationBasis(selectedWorker.calculation_basis);
    }
  }, [selectedWorker]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      toast.error(t('workers.metayage.validation.fillAllRequired'));
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
      toast.success(t('workers.metayage.validation.settlementSaved'));
    } catch (error) {
      console.error('Error saving settlement:', error);
      toast.error(t('workers.metayage.validation.saveError'));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('workers.metayage.title')}
        </h2>
      </div>

      {metayageWorkers.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            {t('workers.metayage.noWorkers')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Worker Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('workers.metayage.fields.worker')} *
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('workers.metayage.fields.selectWorker')}</option>
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
                      {t('workers.metayage.workerConfig.title')}:
                    </p>
                    <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                      <li><strong>{t('workers.metayage.workerConfig.type')}:</strong> {selectedWorker.metayage_type?.toUpperCase()}</li>
                      <li><strong>{t('workers.metayage.workerConfig.percentage')}:</strong> {selectedWorker.metayage_percentage}%</li>
                      <li>
                        <strong>{t('workers.metayage.workerConfig.calculationBasis')}:</strong>{' '}
                        {selectedWorker.calculation_basis === 'gross_revenue' ? t('workers.metayage.type.grossRevenue') : t('workers.metayage.type.netRevenue')}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('workers.metayage.fields.periodStart')} *
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
                    {t('workers.metayage.fields.periodEnd')} *
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
                    {t('workers.metayage.fields.harvestDate')}
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
                    {t('workers.metayage.fields.grossRevenue', { currency: currencySymbol })} *
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
                    {t('workers.metayage.fields.grossRevenueHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('workers.metayage.fields.totalCharges', { currency: currencySymbol })}
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
                    {t('workers.metayage.fields.totalChargesHint')}
                  </p>
                </div>
              </div>

              {/* Calculation Basis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('workers.metayage.fields.calculationBasis')}
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
                      {t('workers.metayage.type.grossRevenue')}
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
                      {t('workers.metayage.type.netRevenue')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Calculation Results */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('workers.metayage.results.title')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('workers.metayage.results.grossRevenue')}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(grossRevenueNum)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('workers.metayage.results.totalCharges')}:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        -{formatCurrency(totalChargesNum)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-purple-200 dark:border-purple-700">
                      <span className="text-gray-600 dark:text-gray-400">{t('workers.metayage.results.netRevenue')}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(netRevenue)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('workers.metayage.results.calculationBasis')}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('workers.metayage.results.workerPercentage')}:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-purple-200 dark:border-purple-700">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{t('workers.metayage.results.workerShare')}:</span>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(workerShare)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workers.metayage.fields.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('workers.metayage.fields.notesPlaceholder')}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button variant="purple" onClick={handleSaveSettlement} disabled={createSettlement.isPending || !grossRevenue || !periodStart || !periodEnd} className="flex items-center gap-2 px-6 py-3 rounded-lg disabled:cursor-not-allowed" >
                  {createSettlement.isPending ? (
                    <>
                      <ButtonLoader />
                      <span>{t('workers.metayage.buttons.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{t('workers.metayage.buttons.save')}</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MetayageCalculator;
