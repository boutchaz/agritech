import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Calculator, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/Input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/radix-select";
import {
  useCalculatePayment,
  useCreatePaymentRecord,
} from "../../hooks/usePayments";
import { useAccounts } from "../../hooks/useAccounts";
import type { Worker } from "../../types/workers";
import type {
  PaymentType,
  PaymentMethod,
  CalculatePaymentResponse,
} from "../../types/payments";
import {
  getWorkerTypeLabel,
  getCompensationDisplay,
} from "../../types/workers";
import {
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
} from "../../types/payments";

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
    case "fixed_salary":
      return "monthly_salary";
    case "daily_worker":
      return "daily_wage";
    case "metayage":
      return "metayage_share";
    default:
      return "daily_wage";
  }
}

function getDefaultPeriodDates(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  return {
    start: startOfMonth.toISOString().split("T")[0],
    end: endOfMonth.toISOString().split("T")[0],
  };
}

function getAllowedPaymentTypes(workerType: string): PaymentType[] {
  switch (workerType) {
    case "fixed_salary":
      return ["monthly_salary", "bonus", "overtime", "advance"];
    case "daily_worker":
      return ["daily_wage", "bonus", "overtime", "advance"];
    case "metayage":
      return ["metayage_share", "bonus", "advance"];
    default:
      return ["daily_wage"];
  }
}

function isCustomAmountType(type: PaymentType): boolean {
  return ["bonus", "overtime", "advance"].includes(type);
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
  const [periodStart, setPeriodStart] = useState(
    initialPeriodStart || defaultDates.start,
  );
  const [periodEnd, setPeriodEnd] = useState(
    initialPeriodEnd || defaultDates.end,
  );
  const [paymentType, setPaymentType] = useState<PaymentType>(
    getPaymentTypeForWorker(worker.worker_type),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [calculatedPayment, setCalculatedPayment] =
    useState<CalculatePaymentResponse | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [customDescription, setCustomDescription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const allowedPaymentTypes = getAllowedPaymentTypes(worker.worker_type);
  const requiresCustomAmount = isCustomAmountType(paymentType);

  const calculatePayment = useCalculatePayment();
  const createPayment = useCreatePaymentRecord();
  const { data: accounts = [] } = useAccounts();
  const hasChartOfAccounts = accounts.length > 0;

  useEffect(() => {
    if (open) {
      setPaymentType(
        initialPaymentType || getPaymentTypeForWorker(worker.worker_type),
      );
      setPeriodStart(initialPeriodStart || defaultDates.start);
      setPeriodEnd(initialPeriodEnd || defaultDates.end);
      setCalculatedPayment(null);
      setCustomAmount(0);
      setCustomDescription("");
      setError(null);
    }
  }, [
    open,
    worker.worker_type,
    initialPaymentType,
    initialPeriodStart,
    initialPeriodEnd,
    defaultDates,
  ]);

  useEffect(() => {
    if (requiresCustomAmount) {
      setCalculatedPayment(null);
    }
  }, [paymentType, requiresCustomAmount]);

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
      setError(
        err instanceof Error
          ? err.message
          : t("dialogs.workerPayment.calculationError"),
      );
    }
  };

  const handleCreatePayment = async () => {
    if (!hasChartOfAccounts) {
      setError(
        t(
          "dialogs.workerPayment.noChartOfAccountsBlocking",
          "Aucun plan comptable n'est configuré. Veuillez configurer le plan comptable avant de créer un paiement.",
        ),
      );
      return;
    }

    if (requiresCustomAmount) {
      if (customAmount <= 0) {
        setError(t("dialogs.workerPayment.amountRequired"));
        return;
      }
      setError(null);
      try {
        await createPayment.mutateAsync({
          worker_id: worker.id,
          farm_id: worker.farm_id || undefined,
          payment_type: paymentType,
          payment_method: paymentMethod,
          period_start: periodStart,
          period_end: periodEnd,
          base_amount: customAmount,
          notes: customDescription || undefined,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        onSuccess();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t("dialogs.workerPayment.createError"),
        );
      }
      return;
    }

    if (!calculatedPayment) return;

    setError(null);
    try {
      await createPayment.mutateAsync({
        worker_id: worker.id,
        farm_id: worker.farm_id || undefined,
        payment_type: paymentType,
        payment_method: paymentMethod,
        period_start: periodStart,
        period_end: periodEnd,
        base_amount: calculatedPayment.base_amount,
        task_bonus: (calculatedPayment as any).task_bonus ?? 0,
        advance_deduction: calculatedPayment.advance_deductions,
        days_worked: calculatedPayment.days_worked,
        hours_worked: calculatedPayment.hours_worked,
        tasks_completed: calculatedPayment.tasks_completed,
        overtime_amount: calculatedPayment.overtime_amount,
        bonuses: calculatedPayment.bonuses?.map((b) => ({
          bonus_type: b.bonus_type,
          amount: b.amount,
          description: b.description,
        })),
        deductions: calculatedPayment.deductions?.map((d) => ({
          deduction_type: d.deduction_type,
          amount: d.amount,
          description: d.description,
        })),
        harvest_amount: calculatedPayment.harvest_amount,
        gross_revenue: calculatedPayment.gross_revenue,
        total_charges: calculatedPayment.total_charges,
        metayage_percentage: calculatedPayment.metayage_percentage,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("dialogs.workerPayment.createError"),
      );
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
              <DialogTitle>{t("dialogs.workerPayment.title")}</DialogTitle>
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


          {!hasChartOfAccounts && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {t("dialogs.workerPayment.noChartOfAccounts", "Aucun plan comptable n'est configuré. La création de paiement est bloquée tant que le plan comptable n'est pas configuré dans Comptabilité > Plan comptable.")}
              </AlertDescription>
            </Alert>
          )}
          <Card className="bg-gray-50 dark:bg-gray-900/50 border-0">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("dialogs.workerPayment.type")}:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getWorkerTypeLabel(worker.worker_type, "fr")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("dialogs.workerPayment.compensation")}:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getCompensationDisplay(worker)}
                </span>
              </div>
              {worker.farm_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("dialogs.workerPayment.farm")}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {worker.farm_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">
                {t("dialogs.workerPayment.periodStart")}
              </Label>
              <Input
                id="period_start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">
                {t("dialogs.workerPayment.periodEnd")}
              </Label>
              <Input
                id="period_end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className={periodEnd < periodStart ? 'border-red-500' : ''}
              />
              {periodEnd < periodStart && (
                <p className="text-xs text-red-500">La date de fin doit être après la date de début</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_type">
                {t("dialogs.workerPayment.paymentType")}
              </Label>
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
              <Label htmlFor="payment_method">
                {t("dialogs.workerPayment.paymentMethod")}
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as PaymentMethod)
                }
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(
                    ([key, labels]) => (
                      <SelectItem key={key} value={key}>
                        {labels.fr}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requiresCustomAmount ? (
            <div className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  {paymentType === "bonus" &&
                    t("dialogs.workerPayment.bonusInfo")}
                  {paymentType === "overtime" &&
                    t("dialogs.workerPayment.overtimeInfo")}
                  {paymentType === "advance" &&
                    t("dialogs.workerPayment.advanceInfo")}
                </AlertDescription>
              </Alert>


              {worker.worker_type === 'fixed_salary' && worker.monthly_salary && (paymentType === 'bonus' || paymentType === 'overtime') && (
                <Card className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Salaire mensuel de référence :</span>
                      <span className="font-medium">{formatCurrency(worker.monthly_salary)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Ce paiement est supplémentaire au salaire mensuel.</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="custom_amount">
                  {t("dialogs.workerPayment.amount")} *
                </Label>
                <Input
                  id="custom_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customAmount || ""}
                  onChange={(e) =>
                    setCustomAmount(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>

              {worker.worker_type === 'fixed_salary' && worker.monthly_salary && customAmount >= worker.monthly_salary && (paymentType === 'bonus' || paymentType === 'overtime') && (
                <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Attention : le montant saisi ({formatCurrency(customAmount)}) est supérieur ou égal au salaire mensuel ({formatCurrency(worker.monthly_salary)}). Vérifiez que ce montant est correct.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="custom_description">
                  {t("dialogs.workerPayment.description")}
                </Label>
                <Input
                  id="custom_description"
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={t(
                    "dialogs.workerPayment.descriptionPlaceholder",
                  )}
                />
              </div>

              {customAmount > 0 && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>{t("dialogs.workerPayment.totalToPay")}:</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatCurrency(customAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleCreatePayment}
                disabled={isLoading || customAmount <= 0 || !hasChartOfAccounts}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {createPayment.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Banknote className="w-4 h-4 mr-2" />
                )}
                {t("dialogs.workerPayment.createPayment")}
              </Button>
            </div>
          ) : !calculatedPayment ? (
            <Button
              onClick={handleCalculate}
              disabled={isLoading || periodEnd < periodStart}
              className="w-full"
              variant="outline"
            >
              {calculatePayment.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              {t("dialogs.workerPayment.calculateAmount")}
            </Button>
          ) : (
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-green-800 dark:text-green-200">
                    {t("dialogs.workerPayment.calculationDetails")}
                  </h4>

                  <div className="space-y-2 text-sm">
                    {/* Show "already paid" notice if base salary was already paid */}
                    {(calculatedPayment as any).already_paid_base > 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
                        <span>✓ Salaire de base déjà payé :</span>
                        <span>{formatCurrency((calculatedPayment as any).already_paid_base)}</span>
                      </div>
                    )}

                    {/* Only show base amount if > 0 */}
                    {calculatedPayment.base_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t("dialogs.workerPayment.baseAmount")}:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(calculatedPayment.base_amount)}
                      </span>
                    </div>
                    )}

                    {/* Per-unit/days breakdown: only show if base salary is not already paid */}
                    {calculatedPayment.base_amount > 0 && (calculatedPayment as any).units_completed > 0 ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Unités complétées :
                          </span>
                          <span>{(calculatedPayment as any).units_completed}</span>
                        </div>
                        {(calculatedPayment as any).rate_per_unit != null && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Taux par unité :
                            </span>
                            <span>{formatCurrency((calculatedPayment as any).rate_per_unit)}</span>
                          </div>
                        )}
                      </>
                    ) : calculatedPayment.base_amount > 0 ? (
                      <>
                        {calculatedPayment.days_worked > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("dialogs.workerPayment.daysWorked")}:
                            </span>
                            <span>{calculatedPayment.days_worked}</span>
                          </div>
                        )}

                        {calculatedPayment.hours_worked > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("dialogs.workerPayment.hoursWorked")}:
                            </span>
                            <span>{calculatedPayment.hours_worked}h</span>
                          </div>
                        )}

                        {calculatedPayment.tasks_completed > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("dialogs.workerPayment.tasksCompleted")}:
                            </span>
                            <span>{calculatedPayment.tasks_completed}</span>
                          </div>
                        )}
                      </>
                    ) : null}

                    {calculatedPayment.overtime_amount > 0 && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span>+ {t("dialogs.workerPayment.overtime")}:</span>
                        <span>
                          {formatCurrency(calculatedPayment.overtime_amount)}
                        </span>
                      </div>
                    )}

                    {(calculatedPayment as any).task_bonus > 0 && (
                      <div className="flex justify-between text-purple-600 dark:text-purple-400">
                        <span>+ Tâches supplémentaires :</span>
                        <span>{formatCurrency((calculatedPayment as any).task_bonus)}</span>
                      </div>
                    )}

                    {calculatedPayment.bonuses &&
                      calculatedPayment.bonuses.length > 0 && (
                        <div className="flex justify-between text-blue-600 dark:text-blue-400">
                          <span>+ {t("dialogs.workerPayment.bonuses")}:</span>
                          <span>
                            {formatCurrency(
                              calculatedPayment.bonuses.reduce(
                                (sum, b) => sum + b.amount,
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      )}

                    {calculatedPayment.total_deductions > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>- {t("dialogs.workerPayment.deductions")}:</span>
                        <span>
                          {formatCurrency(calculatedPayment.total_deductions)}
                        </span>
                      </div>
                    )}

                    {calculatedPayment.advance_deductions > 0 && (
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>- {t("dialogs.workerPayment.advances")}:</span>
                        <span>
                          {formatCurrency(calculatedPayment.advance_deductions)}
                        </span>
                      </div>
                    )}

                    <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold text-lg">
                      <span>{t("dialogs.workerPayment.netToPay")}:</span>
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
                  {t("dialogs.workerPayment.recalculate")}
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={isLoading || !hasChartOfAccounts}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createPayment.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4 mr-2" />
                  )}
                  {t("dialogs.workerPayment.createPayment")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {t("app.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerPaymentDialog;
