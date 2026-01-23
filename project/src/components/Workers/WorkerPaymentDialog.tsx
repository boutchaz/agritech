import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, Calculator, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent } from '../ui/card';
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
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
  initialPaymentType?: PaymentType;
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

function getAllowedPaymentTypes(workerType: string): PaymentType[] {
  switch (workerType) {
    case 'fixed_salary':
      return ['monthly_salary', 'bonus', 'overtime', 'advance'];
    case 'daily_worker':
      return ['daily_wage', 'bonus', 'overtime', 'advance'];
    case 'metayage':
      return ['metayage_share', 'bonus', 'advance'];
    default:
      return ['daily_wage'];
  }
}

const WorkerPaymentDialog: React.FC<WorkerPaymentDialogProps> = ({
  open,
  worker,
  onClose,
  onSuccess,
  initialPeriodStart,
  initialPeriodEnd,
  initialPaymentType,
}) => {
  const { t } = useTranslation();
  const defaultDates = useMemo(() => getDefaultPeriodDates(), []);
  const [periodStart, setPeriodStart] = useState(initialPeriodStart || defaultDates.start);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd || defaultDates.end);
  const [paymentType, setPaymentType] = useState<PaymentType>(getPaymentTypeForWorker(worker.worker_type));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [calculatedPayment, setCalculatedPayment] = useState<CalculatePaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowedPaymentTypes = getAllowedPaymentTypes(worker.worker_type);

  const calculatePayment = useCalculatePayment();
  const createPayment = useCreatePaymentRecord();

  useEffect(() => {
    if (open) {
      setPaymentType(initialPaymentType || getPaymentTypeForWorker(worker.worker_type));
      setPeriodStart(initialPeriodStart || defaultDates.start);
      setPeriodEnd(initialPeriodEnd || defaultDates.end);
      setCalculatedPayment(null);
      setError(null);
    }
  }, [open, worker.worker_type, initialPaymentType, initialPeriodStart, initialPeriodEnd, defaultDates]);

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
      setError(err instanceof Error ? err.message : t('dialogs.workerPayment.calculationError'));
    }
  };

  const handleCreatePayment = async () => {
    if (!calculatedPayment) return;
    
    setError(null);
    try {
      await createPayment.mutateAsync({
        worker_id: worker.id,
        farm_id: worker.farm_id || undefined, // Let backend handle fallback if no farm
        payment_type: paymentType,
        payment_method: paymentMethod,
        period_start: periodStart,
        period_end: periodEnd,
        base_amount: calculatedPayment.base_amount,
        advance_deduction: calculatedPayment.advance_deductions,
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
        total_charges: calculatedPayment.total_charges,
        metayage_percentage: calculatedPayment.metayage_percentage,
      });
      
      // Wait a bit to ensure the mutation completes and queries are invalidated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dialogs.workerPayment.createError'));
    }
  };

  const isLoading = calculatePayment.isPending || createPayment.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <DialogTitle>{t('dialogs.workerPayment.title')}</DialogTitle>
              <DialogDescription>
                {worker.first_name} {worker.last_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="bg-gray-50 dark:bg-gray-900/50 border-0">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.type')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getWorkerTypeLabel(worker.worker_type, 'fr')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.compensation')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getCompensationDisplay(worker)}
                </span>
              </div>
              {worker.farm_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.farm')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {worker.farm_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">{t('dialogs.workerPayment.periodStart')}</Label>
              <Input
                id="period_start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">{t('dialogs.workerPayment.periodEnd')}</Label>
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
              <Label htmlFor="payment_type">{t('dialogs.workerPayment.paymentType')}</Label>
              <Select
                value={paymentType}
                onValueChange={(value) => setPaymentType(value as PaymentType)}
              >
                <SelectTrigger id="payment_type">
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                  {allowedPaymentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PAYMENT_TYPE_LABELS[type].fr}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">{t('dialogs.workerPayment.paymentMethod')}</Label>
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
              {t('dialogs.workerPayment.calculateAmount')}
            </Button>
          ) : (
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-green-800 dark:text-green-200">
                    {t('dialogs.workerPayment.calculationDetails')}
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.baseAmount')}:</span>
                      <span className="font-medium">{formatCurrency(calculatedPayment.base_amount)}</span>
                    </div>

                    {calculatedPayment.days_worked > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.daysWorked')}:</span>
                        <span>{calculatedPayment.days_worked}</span>
                      </div>
                    )}

                    {calculatedPayment.hours_worked > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.hoursWorked')}:</span>
                        <span>{calculatedPayment.hours_worked}h</span>
                      </div>
                    )}

                    {calculatedPayment.tasks_completed > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{t('dialogs.workerPayment.tasksCompleted')}:</span>
                        <span>{calculatedPayment.tasks_completed}</span>
                      </div>
                    )}

                    {calculatedPayment.overtime_amount > 0 && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span>+ {t('dialogs.workerPayment.overtime')}:</span>
                        <span>{formatCurrency(calculatedPayment.overtime_amount)}</span>
                      </div>
                    )}

                    {calculatedPayment.bonuses && calculatedPayment.bonuses.length > 0 && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span>+ {t('dialogs.workerPayment.bonuses')}:</span>
                        <span>{formatCurrency(calculatedPayment.bonuses.reduce((sum, b) => sum + b.amount, 0))}</span>
                      </div>
                    )}

                    {calculatedPayment.total_deductions > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>- {t('dialogs.workerPayment.deductions')}:</span>
                        <span>{formatCurrency(calculatedPayment.total_deductions)}</span>
                      </div>
                    )}

                    {calculatedPayment.advance_deductions > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>- {t('dialogs.workerPayment.advances')}:</span>
                        <span>{formatCurrency(calculatedPayment.advance_deductions)}</span>
                      </div>
                    )}

                    <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold text-lg">
                      <span>{t('dialogs.workerPayment.netToPay')}:</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatCurrency(calculatedPayment.net_amount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCalculatedPayment(null)}
                  className="flex-1"
                >
                  {t('dialogs.workerPayment.recalculate')}
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
                  {t('dialogs.workerPayment.createPayment')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t('app.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerPaymentDialog;
