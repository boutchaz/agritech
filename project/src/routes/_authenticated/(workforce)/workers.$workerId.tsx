import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DetailPageSkeleton } from '@/components/ui/page-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Banknote,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  CreditCard,
  TrendingUp,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  useWorker,
  useWorkerStats,
  useWorkRecords,
  useMetayageSettlements,
} from "@/hooks/useWorkers";
import { useWorkerPayments, useProcessPayment } from "@/hooks/usePayments";
import { useFarms } from "@/hooks/useParcelsQuery";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withRouteProtection } from "@/components/authorization/withRouteProtection";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import WorkerForm from "@/components/Workers/WorkerForm";
import WorkerPaymentDialog from "@/components/Workers/WorkerPaymentDialog";
import type { PaymentType } from "@/types/payments";

import { paymentRecordsApi } from "@/lib/api/payment-records";
import { cn } from "@/lib/utils";
import { isRTLLocale } from "@/lib/is-rtl-locale";

function WorkerDetailPage() {
  const { t, i18n } = useTranslation();
  const isRTL = isRTLLocale(i18n.language);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workerId } = Route.useParams();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(
    null,
  );
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);

  const { data: worker, isLoading: workerLoading } = useWorker(
    currentOrganization?.id || null,
    workerId,
  );

  const { data: farms = [] } = useFarms(currentOrganization?.id || "");

  const { data: stats } = useWorkerStats(
    currentOrganization?.id || null,
    workerId,
  );

  const { data: payments = [], isLoading: paymentsLoading } = useWorkerPayments(
    currentOrganization?.id || "",
    workerId,
  );

  const { data: workRecords = [], isLoading: workRecordsLoading } =
    useWorkRecords(currentOrganization?.id || null, workerId);

  // Load settlements for metayage workers, but also allow viewing for other workers if they have settlements
  const { data: settlements = [], isLoading: settlementsLoading } =
    useMetayageSettlements(
      currentOrganization?.id || null,
      workerId, // Always load settlements if they exist, regardless of worker type
    );

  const processPaymentMutation = useProcessPayment();

  const handleApprovePayment = async (paymentId: string) => {
    if (!currentOrganization) return;
    try {
      await paymentRecordsApi.approve(currentOrganization.id, paymentId, {});
      toast.success(t("workers.payments.approveSuccess") || "Payment approved");
      queryClient.invalidateQueries({
        queryKey: ["worker-payments", workerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["worker-stats", currentOrganization.id, workerId],
      });
    } catch (error: any) {
      console.error("Failed to approve payment:", error);
      toast.error(
        error.message ||
          t("workers.payments.approveError") ||
          "Failed to approve payment",
      );
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleProcessPayment = async (paymentId: string) => {
    if (!currentOrganization) return;

    setProcessingPaymentId(paymentId);
    try {
      await processPaymentMutation.mutateAsync({
        payment_id: paymentId,
        payment_method: "cash",
      });
      toast.success(t("workers.payments.processSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["worker-payments", workerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["worker-stats", currentOrganization.id, workerId],
      });
    } catch (error) {
      console.error("Failed to process payment:", error);
      toast.error(t("workers.payments.processError"));
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleSettlementPayment = (settlement: any) => {
    if (!settlement?.period_start || !settlement?.period_end) return;
    setPaymentPeriod({
      start: settlement.period_start,
      end: settlement.period_end,
    });
    setPaymentType("metayage_share");
    setShowPaymentDialog(true);
  };

  if (!currentOrganization || workerLoading) {
    return <DetailPageSkeleton />;
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t("workers.detail.notFound")}
        </p>
        <Button onClick={() => navigate({ to: "/workers" })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("workers.detail.backToList")}
        </Button>
      </div>
    );
  }

  const getWorkerTypeColor = (type: string) => {
    switch (type) {
      case "fixed_salary":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "daily_worker":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "metayage":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "approved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate({ to: "/workers" })}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("workers.detail.backToList")}
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <User className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {worker.first_name} {worker.last_name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {worker.position || t("workers.detail.noPosition")}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={getWorkerTypeColor(worker.worker_type)}>
                    {t(`workers.workerTypes.${worker.worker_type}`)}
                  </Badge>
                  {worker.is_active ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("workers.status.active")}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      <XCircle className="h-3 w-3 mr-1" />
                      {t("workers.status.inactive")}
                    </Badge>
                  )}
                  {worker.is_cnss_declared && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      CNSS
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowEditForm(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {t("workers.actions.edit")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("workers.stats.daysWorked")}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalDaysWorked ?? worker.total_days_worked ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("workers.stats.tasksCompleted")}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalTasksCompleted ??
                    worker.total_tasks_completed ??
                    0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("workers.stats.totalPaid")}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats?.totalPaid ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("workers.stats.pendingPayments")}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats?.pendingPayments ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <div
          className={cn(
            "flex w-full min-w-0",
            isRTL ? "justify-end" : "justify-start",
          )}
        >
          <TabsList
            dir={isRTL ? "rtl" : "ltr"}
            className="w-max max-w-full min-w-0 justify-start overflow-x-auto whitespace-nowrap rounded-lg sm:overflow-visible"
          >
            <TabsTrigger
              value="info"
              className="shrink-0 px-2 text-center text-xs sm:px-3 sm:text-sm"
            >
              {t("workers.detail.tabs.info")}
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="shrink-0 px-2 text-center text-xs sm:px-3 sm:text-sm"
            >
              {t("workers.detail.tabs.payments")}
            </TabsTrigger>
            <TabsTrigger
              value="workRecords"
              className="shrink-0 px-2 text-center text-xs sm:px-3 sm:text-sm"
            >
              {t("workers.detail.tabs.workRecords")}
            </TabsTrigger>
            {(worker.worker_type === "metayage" ||
              (settlements && settlements.length > 0)) && (
              <TabsTrigger
                value="settlements"
                className="shrink-0 px-2 text-center text-xs sm:px-3 sm:text-sm"
              >
                {t("workers.detail.tabs.settlements")}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="info" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("workers.detail.personalInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {worker.cin && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.cin")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {worker.cin}
                      </p>
                    </div>
                  </div>
                )}
                {worker.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.phone")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {worker.phone}
                      </p>
                    </div>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.email")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {worker.email}
                      </p>
                    </div>
                  </div>
                )}
                {worker.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.address")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {worker.address}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t("workers.fields.hireDate")}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(worker.hire_date), "dd MMMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("workers.detail.compensation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {worker.worker_type === "fixed_salary" &&
                  worker.monthly_salary && (
                    <div className="flex items-center gap-3">
                      <Banknote className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">
                          {t("workers.fields.monthlySalary")}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(worker.monthly_salary)}
                        </p>
                      </div>
                    </div>
                  )}
                {worker.worker_type === "daily_worker" && worker.daily_rate && (
                  <div className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.dailyRate")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(worker.daily_rate)} /{" "}
                        {t("workers.perDay")}
                      </p>
                    </div>
                  </div>
                )}
                {worker.worker_type === "metayage" && (
                  <>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">
                          {t("workers.fields.metayageType")}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {t(`workers.metayageTypes.${worker.metayage_type}`)} (
                          {worker.metayage_percentage}%)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">
                          {t("workers.fields.calculationBasis")}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {t(
                            `workers.calculationBasis.${worker.calculation_basis}`,
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {worker.payment_method && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.paymentMethod")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t(`workers.paymentMethods.${worker.payment_method}`)}
                      </p>
                    </div>
                  </div>
                )}
                {worker.bank_account && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t("workers.fields.bankAccount")}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {worker.bank_account}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("workers.detail.paymentHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 3 }).map((_, skIdx) => (
                    <div key={"sk-" + skIdx} className="flex items-center gap-4 p-3">
                      <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("workers.detail.noPayments")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.payments.date")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.payments.type")}
                        </TableHead>
                        <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.payments.amount")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.payments.status")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.payments.method")}
                        </TableHead>
                        <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.payments.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: any) => (
                        <TableRow
                          key={payment.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="py-3 px-4 text-gray-900 dark:text-white">
                            {payment.payment_date
                              ? format(
                                  new Date(payment.payment_date),
                                  "dd/MM/yyyy",
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {t(
                              `workers.paymentTypes.${payment.payment_type}`,
                            ) || payment.payment_type}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(
                              payment.net_amount || payment.base_amount || 0,
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge
                              className={getPaymentStatusColor(payment.status)}
                            >
                              {t(`workers.paymentStatuses.${payment.status}`) ||
                                payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {payment.payment_method
                              ? t(
                                  `workers.paymentMethods.${payment.payment_method}`,
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            {payment.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprovePayment(payment.id)}
                                disabled={processingPaymentId === payment.id}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                {processingPaymentId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    {t("workers.payments.approve")}
                                  </>
                                )}
                              </Button>
                            )}
                            {payment.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessPayment(payment.id)}
                                disabled={processingPaymentId === payment.id}
                                className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                {processingPaymentId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    {t("workers.payments.markAsPaid")}
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workRecords" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("workers.detail.workRecords")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workRecordsLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 3 }).map((_, skIdx) => (
                    <div key={"sk-" + skIdx} className="flex items-center gap-4 p-3">
                      <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : workRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("workers.detail.noWorkRecords")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.workRecords.date")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.workRecords.hours")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.workRecords.units")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.workRecords.description")}
                        </TableHead>
                        <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.workRecords.payment")}
                        </TableHead>
                        <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                          {t("workers.workRecords.status")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workRecords.map((record: any) => (
                        <TableRow
                          key={record.id}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <TableCell className="py-3 px-4 text-gray-900 dark:text-white">
                            {format(new Date(record.work_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {record.hours_worked
                              ? `${record.hours_worked}h`
                              : "-"}
                            {record.hours_worked && record.hours_worked >= 8 && (
                              <span className="text-xs text-gray-400 ml-1">
                                ({Math.round((record.hours_worked / 8) * 10) / 10}j)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {record.units_completed ? (
                              <span>
                                {record.units_completed}
                                {record.unit_type && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({record.unit_type})
                                  </span>
                                )}
                                {record.rate_per_unit && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">
                                    @ {formatCurrency(record.rate_per_unit)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            <div className="flex flex-col">
                              <span>
                                {record.task_description ||
                                  record.description ||
                                  "-"}
                              </span>
                              {record.worker_type && (
                                <span className="text-xs text-gray-400">
                                  {record.worker_type === 'per_unit' ? 'À l\'unité' :
                                   record.worker_type === 'daily' ? 'Journalier' :
                                   record.worker_type}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                            {record.total_payment
                              ? formatCurrency(record.total_payment)
                              : "-"}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge
                              className={getPaymentStatusColor(
                                record.payment_status || record.status,
                              )}
                            >
                              {t(
                                `workers.workRecordStatuses.${record.payment_status || record.status}`,
                              ) ||
                                record.payment_status ||
                                record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Show settlements tab if worker is metayage OR if there are settlements to display */}
        {(worker.worker_type === "metayage" ||
          (settlements && settlements.length > 0)) && (
          <TabsContent value="settlements" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("workers.detail.metayageSettlements")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {settlementsLoading ? (
                  <div className="space-y-2 py-4">
                    {Array.from({ length: 3 }).map((_, skIdx) => (
                      <div key={"sk-" + skIdx} className="flex items-center gap-4 p-3">
                        <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : settlements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("workers.detail.noSettlements")}</p>
                    {worker.worker_type !== "metayage" && (
                      <p className="text-xs mt-2 text-gray-400 dark:text-gray-500">
                        {t("workers.detail.settlementsOnlyForMetayage")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 dark:border-gray-700">
                          <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                            {t("workers.settlements.period")}
                          </TableHead>
                          <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                            {t("workers.settlements.grossRevenue")}
                          </TableHead>
                          <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                            {t("workers.settlements.charges")}
                          </TableHead>
                          <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                            {t("workers.settlements.share")}
                          </TableHead>
                          <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                            {t("workers.settlements.status")}
                          </TableHead>
                          <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                            {t("workers.settlements.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlements.map((settlement: any) => (
                          <TableRow
                            key={settlement.id}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <TableCell className="py-3 px-4 text-gray-900 dark:text-white">
                              {settlement.period_start && settlement.period_end
                                ? `${format(new Date(settlement.period_start), "dd/MM/yy")} - ${format(new Date(settlement.period_end), "dd/MM/yy")}`
                                : "-"}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">
                              {formatCurrency(settlement.gross_revenue || 0)}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">
                              {formatCurrency(settlement.total_charges || 0)}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(
                                settlement.worker_share ||
                                  settlement.worker_share_amount ||
                                  0,
                              )}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge
                                className={getPaymentStatusColor(
                                  settlement.payment_status,
                                )}
                              >
                                {t(
                                  `workers.settlementStatuses.${settlement.payment_status}`,
                                ) || settlement.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              {settlement.payment_status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleSettlementPayment(settlement)
                                  }
                                >
                                  {t("workers.settlements.createPayment")}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {worker && (
        <WorkerPaymentDialog
          open={showPaymentDialog}
          worker={worker}
          organizationId={currentOrganization.id}
          initialPeriodStart={paymentPeriod?.start}
          initialPeriodEnd={paymentPeriod?.end}
          initialPaymentType={paymentType || undefined}
          onClose={() => {
            setShowPaymentDialog(false);
            setPaymentPeriod(null);
            setPaymentType(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["worker-payments", workerId],
            });
            queryClient.invalidateQueries({
              queryKey: ["worker-payment-history", workerId],
            });
            queryClient.invalidateQueries({
              queryKey: [
                "metayage-settlements",
                currentOrganization.id,
                workerId,
              ],
            });
          }}
        />
      )}

      {/* Edit Worker Form Modal */}
      {worker && (
        <WorkerForm
          open={showEditForm}
          worker={worker}
          organizationId={currentOrganization.id}
          farms={farms.map((f: any) => ({ id: f.id, name: f.name }))}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries({
              queryKey: ["worker", currentOrganization.id, workerId],
            });
          }}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/(workforce)/workers/$workerId",
)({
  component: withRouteProtection(WorkerDetailPage, "read", "Worker"),
});
