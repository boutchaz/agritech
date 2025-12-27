import React, { useState, useEffect } from 'react';
import { X, Banknote, Calculator, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/radix-select';
import { useCalculatePayment, useCreatePaymentRecord } from '../../hooks/usePayments';
import type { Worker } from '../../types/workers';
import type { PaymentType, PaymentMethod, CalculatePaymentResponse } from '../../types/payments';
import { getWorkerTypeLabel, getCompensationDisplay } from '../../types/workers';
import { PAYMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS, formatCurrency } from '../../types/payments';

interface WorkerPaymentDialogProps {
  open: boolean;
  worker: Worker;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function getPaymentTypeForWorker(workerType: string): PaymentType {
  switch (workerType) {
    case 'fixed_salary':
      return 'monthly_salary';
    case 'daily_worker':
      return 'daily_wage';
    case 'metayage':
      return 'metayage_share';
    default:
      return 'daily_wage';
  }
}

function getDefaultPeriodDates(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
  };
}

const WorkerPaymentDialog: React.FC<WorkerPaymentDialogProps> = ({
  open,
  worker,
  organizationId,
  onClose,
  onSuccess,
}) => {
  const defaultDates = getDefaultPeriodDates();
  const [periodStart, setPeriodStart] = useState(defaultDates.start);
  const [periodEnd, setPeriodEnd] = useState(defaultDates.end);
  const [paymentType, setPaymentType] = useState<PaymentType>(getPaymentTypeForWorker(worker.worker_type));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [calculatedPayment, setCalculatedPayment] = useState<CalculatePaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const calculatePayment = useCalculatePayment();
  const createPayment = useCreatePaymentRecord();

  useEffect(() => {
    if (open) {
      setPaymentType(getPaymentTypeForWorker(worker.worker_type));
      setCalculatedPayment(null);
      setError(null);
    }
  }, [open, worker.worker_type]);

  const handleCalculate = async () => {
    setError(null);
    try {
      const result = await calculatePayment.mutateAsync({
        worker_id: worker.id,
        period_start: periodStart,
        period_end: periodEnd,
        include_advances: true,
      });
      setCalculatedPayment(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul');
    }
  };

  const handleCreatePayment = async () => {
    if (!calculatedPayment) return;
    
    setError(null);
    try {
      await createPayment.mutateAsync({
        worker_id: worker.id,
        farm_id: worker.farm_id || '',
        payment_type: paymentType,
        period_start: periodStart,
        period_end: periodEnd,
        base_amount: calculatedPayment.base_amount,
        days_worked: calculatedPayment.days_worked,
        hours_worked: calculatedPayment.hours_worked,
        tasks_completed: calculatedPayment.tasks_completed,
        overtime_amount: calculatedPayment.overtime_amount,
        bonuses: calculatedPayment.bonuses?.map(b => ({
          bonus_type: b.bonus_type,
          amount: b.amount,
          description: b.description,
        })),
        deductions: calculatedPayment.deductions?.map(d => ({
          deduction_type: d.deduction_type,
          amount: d.amount,
          description: d.description,
        })),
        harvest_amount: calculatedPayment.harvest_amount,
        gross_revenue: calculatedPayment.gross_revenue,
        metayage_percentage: calculatedPayment.metayage_percentage,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement');
    }
  };

  if (!open) return null;

  const isLoading = calculatePayment.isPending || createPayment.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Créer un paiement
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {worker.first_name} {worker.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Type:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {getWorkerTypeLabel(worker.worker_type, 'fr')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Rémunération:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {getCompensationDisplay(worker)}
              </span>
            </div>
            {worker.farm_name && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Ferme:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {worker.farm_name}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">Début période</Label>
              <Input
                id="period_start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">Fin période</Label>
              <Input
                id="period_end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_type">Type de paiement</Label>
              <Select
                value={paymentType}
                onValueChange={(value) => setPaymentType(value as PaymentType)}
              >
                <SelectTrigger id="payment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {labels.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Mode de paiement</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, labels]) => (
                    <SelectItem key={key} value={key}>
                      {labels.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!calculatedPayment ? (
            <Button
              onClick={handleCalculate}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {calculatePayment.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Calculer le montant
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Détail du calcul
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Montant de base:</span>
                    <span className="font-medium">{formatCurrency(calculatedPayment.base_amount)}</span>
                  </div>
                  
                  {calculatedPayment.days_worked > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Jours travaillés:</span>
                      <span>{calculatedPayment.days_worked}</span>
                    </div>
                  )}
                  
                  {calculatedPayment.hours_worked > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Heures travaillées:</span>
                      <span>{calculatedPayment.hours_worked}h</span>
                    </div>
                  )}
                  
                  {calculatedPayment.tasks_completed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tâches terminées:</span>
                      <span>{calculatedPayment.tasks_completed}</span>
                    </div>
                  )}
                  
                  {calculatedPayment.overtime_amount > 0 && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>+ Heures supp.:</span>
                      <span>{formatCurrency(calculatedPayment.overtime_amount)}</span>
                    </div>
                  )}
                  
                  {calculatedPayment.bonuses && calculatedPayment.bonuses.length > 0 && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>+ Primes:</span>
                      <span>{formatCurrency(calculatedPayment.bonuses.reduce((sum, b) => sum + b.amount, 0))}</span>
                    </div>
                  )}
                  
                  {calculatedPayment.total_deductions > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>- Déductions:</span>
                      <span>{formatCurrency(calculatedPayment.total_deductions)}</span>
                    </div>
                  )}
                  
                  {calculatedPayment.advance_deductions > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>- Avances:</span>
                      <span>{formatCurrency(calculatedPayment.advance_deductions)}</span>
                    </div>
                  )}
                  
                  <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold text-lg">
                    <span>Net à payer:</span>
                    <span className="text-green-600 dark:text-green-400">
                      {formatCurrency(calculatedPayment.net_amount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCalculatedPayment(null)}
                  className="flex-1"
                >
                  Recalculer
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createPayment.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4 mr-2" />
                  )}
                  Créer le paiement
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkerPaymentDialog;
