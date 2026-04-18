import {  useState, useMemo  } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { PageLayout } from "@/components/PageLayout";
import ModernPageHeader from "@/components/ModernPageHeader";

import {
  Building2,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
  Send,
  MoreHorizontal,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRouteProtection } from "@/components/authorization/withRouteProtection";
import {
  usePaginatedJournalEntries,
  useJournalStats,
  useJournalEntry,
  useCreateJournalEntry,
  usePostJournalEntry,
  useCancelJournalEntry,
  useDeleteJournalEntry,
  type CreateJournalEntryInput,
} from "@/hooks/useJournalEntries";
import { useAccounts } from "@/hooks/useAccounts";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useServerTableState,
  SortableHeader,
  DataTablePagination,
  FilterBar,
  ListPageLayout,
  ListPageHeader,
} from "@/components/ui/data-table";
import { PageLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from 'react-i18next';


interface JournalLineInput {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

const createEmptyLine = (): JournalLineInput => ({
  id: crypto.randomUUID(),
  account_id: "",
  debit: 0,
  credit: 0,
  description: "",
});

const AppContent = () => {
  const { t } = useTranslation('accounting');
  const { currentOrganization } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "posted" | "cancelled"
  >("all");

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: "entry_date", direction: "desc" },
  });

  const {
    data: paginatedData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = usePaginatedJournalEntries({
    ...tableState.queryParams,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const journalEntries = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const stats = useJournalStats();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const { data: selectedEntry, isLoading: isEntryLoading } =
    useJournalEntry(selectedEntryId);
  const isDrawerOpen = !!selectedEntryId;

  const { data: accounts = [] } = useAccounts();
  const activeAccounts = useMemo(
    () => accounts.filter((account) => Boolean(account.is_active) && !account.is_group),
    [accounts],
  );

  // Create entry modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    remarks: "",
    reference_type: "",
    reference_number: "",
  });
  const [lines, setLines] = useState<JournalLineInput[]>([
    createEmptyLine(),
    createEmptyLine(),
  ]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateJournalEntry();
  const postMutation = usePostJournalEntry();
  const cancelMutation = useCancelJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const formatAmount = (value: number) => {
    return `MAD ${Number(value || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("fr-FR");
  };

  const closeDrawer = () => setSelectedEntryId(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "posted":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "posted":
        return <CheckCircle2 className="h-4 w-4" />;
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "posted":
        return t('journal.posted', 'Comptabilisé');
      case "draft":
        return t('journal.draft', 'Brouillon');
      case "cancelled":
        return t('journal.cancelled', 'Annulé');
      default:
        return status;
    }
  };

  // Calculate totals for new entry
  const totalDebit = lines.reduce(
    (sum, line) => sum + (Number(line.debit) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (sum, line) => sum + (Number(line.credit) || 0),
    0,
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () => {
    setLines([...lines, createEmptyLine()]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (
    index: number,
    field: keyof JournalLineInput,
    value: string | number,
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const resetCreateForm = () => {
    setNewEntry({
      entry_date: new Date().toISOString().split("T")[0],
      remarks: "",
      reference_type: "",
      reference_number: "",
    });
    setLines([createEmptyLine(), createEmptyLine()]);
    setCreateError(null);
  };

  const handleCreateEntry = async () => {
    setCreateError(null);

    // Validate
    if (!newEntry.entry_date) {
      setCreateError(t('journal.dateRequired', 'La date est requise'));
      return;
    }

    const validLines = lines.filter(
      (l) => l.account_id && (l.debit > 0 || l.credit > 0),
    );
    if (validLines.length < 2) {
      setCreateError(
        t('journal.minLines', 'Au moins 2 lignes avec un compte et un montant sont requises'),
      );
      return;
    }

    if (!isBalanced) {
      setCreateError(
        t('journal.notBalanced', "L'écriture n'est pas équilibrée : Débit ({{debit}}) ≠ Crédit ({{credit}})", { debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2) }),
      );
      return;
    }

    const payload: CreateJournalEntryInput = {
      entry_date: newEntry.entry_date,
      remarks: newEntry.remarks || undefined,
      reference_type: newEntry.reference_type || undefined,
      reference_number: newEntry.reference_number || undefined,
      items: validLines.map((l) => ({
        account_id: l.account_id,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || undefined,
      })),
    };

    try {
      await createMutation.mutateAsync(payload);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t('journal.createError', 'Erreur lors de la création'));
    }
  };

  const handlePostEntry = async (id: string) => {
    try {
      await postMutation.mutateAsync(id);
      closeDrawer();
    } catch (err: unknown) {
      console.error("Error posting entry:", err);
    }
  };

  const handleCancelEntry = async (id: string) => {
    showConfirm(t('journal.cancelConfirm', 'Êtes-vous sûr de vouloir annuler cette écriture ?'), async () => {
      try {
        await cancelMutation.mutateAsync(id);
        closeDrawer();
      } catch (err: unknown) {
        console.error("Error cancelling entry:", err);
      }
    }, {variant: "destructive"});
  };

  const handleDeleteEntry = async (id: string) => {
    showConfirm(t('journal.deleteConfirm', 'Êtes-vous sûr de vouloir supprimer cette écriture ? Cette action est irréversible.'), async () => {
      try {
        await deleteMutation.mutateAsync(id);
        closeDrawer();
      } catch (err: unknown) {
        console.error("Error deleting entry:", err);
      }
    }, {variant: "destructive"});
  };

  const _clearFilters = () => {
    setFilterStatus("all");
    tableState.resetFilters();
  };

  void _clearFilters;

  if (!currentOrganization || isLoading) {
    return (
      <PageLoader />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">
            {t('journal.loadError', 'Erreur lors du chargement des écritures')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : t('journal.unknownError', 'Erreur inconnue')}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            {t('journal.retry', 'Réessayer')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageLayout
        activeModule="accounting"
        header={
          <ModernPageHeader
            breadcrumbs={[
              {
                icon: Building2,
                label: currentOrganization.name,
                path: "/dashboard",
              },
              {
                icon: BookOpen,
                label: t('journal.title', 'Journal Comptable'),
                isActive: true,
              },
            ]}
            title={t('journal.title', 'Journal Comptable')}
            subtitle={t('journal.subtitle', 'Gérer les écritures du grand livre')}
          />
        }
      >
        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <ListPageLayout
            header={
              <ListPageHeader
                variant="shell"
                actions={
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full sm:w-auto shadow-md sm:shadow-none"
                  >
                    <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium">{t('journal.newEntry', 'Nouvelle Écriture')}</span>
                  </Button>
                }
              />
            }
            filters={
              <FilterBar
                searchValue={tableState.search}
                onSearchChange={(value) => tableState.setSearch(value)}
                searchPlaceholder={t('journal.searchPlaceholder', 'Rechercher par numéro ou référence...')}
                isSearching={isFetching}
                filters={[
                  {
                    key: "status",
                    value: filterStatus,
                    onChange: (value) =>
                      setFilterStatus(value as typeof filterStatus),
                    options: [
                      { value: "all", label: t('journal.allStatuses', 'Tous statuts') },
                      { value: "draft", label: t('journal.draft', 'Brouillon') },
                      { value: "posted", label: t('journal.posted', 'Comptabilisé') },
                      { value: "cancelled", label: t('journal.cancelled', 'Annulé') },
                    ],
                    placeholder: t('journal.allStatuses', 'Tous statuts'),
                  },
                ]}
                datePreset={tableState.datePreset}
                onDatePresetChange={(preset) => tableState.setDatePreset(preset as Parameters<typeof tableState.setDatePreset>[0])}
              />
            }
            stats={
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('journal.totalEntries', 'Total Écritures')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">
                      {stats.total}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('journal.postedCount', 'Comptabilisées')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {stats.posted}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('journal.draftCount', 'Brouillons')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold text-gray-600 dark:text-gray-600">
                      {stats.draft}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('journal.totalDebits', 'Total Débits')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-base sm:text-xl md:text-2xl font-bold">
                      MAD {stats.totalDebit.toLocaleString("fr-FR")}
                    </div>
                  </CardContent>
                </Card>
              </div>
            }
            pagination={
              <DataTablePagination
                page={tableState.page}
                totalPages={totalPages}
                pageSize={tableState.pageSize}
                totalItems={totalItems}
                onPageChange={tableState.setPage}
                onPageSizeChange={tableState.setPageSize}
              />
            }
          >
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    {t('journal.allEntries', 'Toutes les Écritures')}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t('journal.entriesDescription', 'Consultez et gérez vos écritures du grand livre')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="md:hidden space-y-3">
                    {journalEntries.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {tableState.search ||
                        filterStatus !== "all" ||
                        tableState.datePreset !== "all"
                          ? t('journal.noFilteredEntries', 'Aucune écriture ne correspond à vos filtres.')
                          : t('journal.noEntries', 'Aucune écriture comptable trouvée.')}
                      </div>
                    ) : (
                      journalEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {entry.entry_number}
                              </span>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}
                            >
                              {getStatusIcon(entry.status)}
                              {getStatusLabel(entry.status)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">
                                {t('journal.date', 'Date')}:{" "}
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {formatDate(entry.entry_date)}
                              </span>
                            </div>
                            {entry.posted_at && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {t('journal.postedOn', 'Comptabilisé le')}:{" "}
                                </span>
                                <span className="text-gray-900 dark:text-white">
                                  {formatDate(entry.posted_at)}
                                </span>
                              </div>
                            )}
                          </div>

                          {(entry.reference_type || entry.reference_number) && (
                            <div className="text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                {t('journal.referenceShort', 'Réf.')}:{" "}
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {entry.reference_type || ""}
                                {entry.reference_number
                                  ? ` - ${entry.reference_number}`
                                  : ""}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                {t('journal.debit', 'Débit')}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatAmount(entry.total_debit)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                {t('journal.credit', 'Crédit')}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatAmount(entry.total_credit)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEntryId(entry.id)}
                              className="min-h-[44px]"
                            >
                              {t('journal.view', 'Voir')}
                            </Button>
                            {entry.status === "draft" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePostEntry(entry.id)}
                                  disabled={postMutation.isPending}
                                  className="min-h-[44px]"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-red-600 min-h-[44px]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
                    <Table className="w-full min-w-[800px]">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 dark:border-gray-700">
                          <SortableHeader
                            label={t('journal.entryNumber', 'N° Écriture')}
                            sortKey="entry_number"
                            currentSort={tableState.sortConfig}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <SortableHeader
                            label={t('journal.date', 'Date')}
                            sortKey="entry_date"
                            currentSort={tableState.sortConfig}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <SortableHeader
                            label={t('journal.postedOn', 'Comptabilisé le')}
                            sortKey="posted_at"
                            currentSort={tableState.sortConfig}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <TableHead className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('journal.reference', 'Référence')}
                          </TableHead>
                          <SortableHeader
                            label={t('journal.debit', 'Débit')}
                            sortKey="total_debit"
                            currentSort={tableState.sortConfig}
                            onSort={(key) => tableState.handleSort(String(key))}
                            align="right"
                          />
                          <SortableHeader
                            label={t('journal.credit', 'Crédit')}
                            sortKey="total_credit"
                            currentSort={tableState.sortConfig}
                            onSort={(key) => tableState.handleSort(String(key))}
                            align="right"
                          />
                          <SortableHeader
                            label={t('journal.status', 'Statut')}
                            sortKey="status"
                            currentSort={tableState.sortConfig}
                            onSort={(key) => tableState.handleSort(String(key))}
                          />
                          <TableHead className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('journal.actions', 'Actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalEntries.map((entry) => (
                          <TableRow
                            key={entry.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {entry.entry_number}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(entry.entry_date)}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(entry.posted_at)}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {entry.reference_type || "-"}
                                </span>
                                {entry.reference_number && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {entry.reference_number}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                              {formatAmount(entry.total_debit)}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                              {formatAmount(entry.total_credit)}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}
                              >
                                {getStatusIcon(entry.status)}
                                {getStatusLabel(entry.status)}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEntryId(entry.id)}
                                >
                                  {t('journal.view', 'Voir')}
                                </Button>
                                {entry.status === "draft" && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handlePostEntry(entry.id)}
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        {t('journal.post', 'Comptabiliser')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteEntry(entry.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('journal.delete', 'Supprimer')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {journalEntries.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="py-8 text-center text-gray-500 dark:text-gray-400"
                            >
                              {tableState.search ||
                              filterStatus !== "all" ||
                              tableState.datePreset !== "all"
                                ? t('journal.noFilteredEntries', 'Aucune écriture ne correspond à vos filtres.')
                                : t('journal.noEntriesFull', 'Aucune écriture comptable trouvée. Les écritures sont créées automatiquement lors de la comptabilisation des factures et paiements, ou manuellement via le bouton "Nouvelle Écriture".')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {t('journal.doubleEntryTitle', 'Comptabilité en Partie Double')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('journal.doubleEntryDescription', 'Toutes les écritures suivent le principe de la partie double : ')}
                      <strong>{t('journal.doubleEntryBold', 'Total Débits = Total Crédits')}</strong>{t('journal.doubleEntryConclusion', '. Cela garantit que vos livres sont toujours équilibrés et maintient l\'équation comptable.')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          </ListPageLayout>
        </div>
      </PageLayout>

      {/* View Entry Drawer */}
      <ResponsiveDialog
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <DialogHeader>
            <DialogTitle>
              {selectedEntry
                ? t('journal.entryTitle', 'Écriture {{number}}', { number: selectedEntry.entry_number })
                : t('journal.entryTitleDefault', 'Écriture Comptable')}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry
                ? t('journal.entryRecorded', 'Enregistrée le {{date}}', { date: formatDate(selectedEntry.entry_date) })
                : t('journal.entryLoading', 'Chargement des détails de l\'écriture')}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-6">
            {isEntryLoading ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {['meta-1', 'meta-2', 'meta-3', 'meta-4'].map((skeletonKey) => (
                    <div key={skeletonKey} className="space-y-2">
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700" />
                  {['line-1', 'line-2', 'line-3'].map((skeletonKey) => (
                    <div key={skeletonKey} className="flex items-center gap-4 p-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : selectedEntry ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('journal.number', 'Numéro')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedEntry.entry_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('journal.status', 'Statut')}</p>                    <span
                      className={`mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedEntry.status)}`}
                    >
                      {getStatusIcon(selectedEntry.status)}
                      {getStatusLabel(selectedEntry.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('journal.entryDate', 'Date d\'écriture')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedEntry.entry_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('journal.accountingDate', 'Date comptable')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedEntry.posted_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('journal.reference', 'Référence')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedEntry.reference_type || "—"}
                    </p>
                    {selectedEntry.reference_number && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {selectedEntry.reference_number}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('journal.remarks', 'Remarques')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedEntry.remarks || "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t('journal.accountLines', 'Lignes comptables')}
                  </h3>
                  <div className="mt-3 space-y-3">
                    {selectedEntry.lines && selectedEntry.lines.length > 0 ? (
                      selectedEntry.lines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {line.account
                                ? `${line.account.code} · ${line.account.name}`
                                : t('journal.accountNotFound', 'Compte introuvable')}                            </p>
                            {line.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {line.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm font-semibold text-gray-800 dark:text-gray-200 space-y-1">
                            {line.debit > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400">
                                {t('journal.debitLabel', 'Débit')} {formatAmount(line.debit)}
                              </div>
                            )}
                            {line.credit > 0 && (
                              <div className="text-sky-600 dark:text-sky-400">
                                {t('journal.creditLabel', 'Crédit')} {formatAmount(line.credit)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                        {t('journal.noLines', 'Aucune ligne comptable n\'est associée à cette écriture.')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('journal.totalDebit', 'Total Débit')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatAmount(selectedEntry.total_debit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t('journal.totalCredit', 'Total Crédit')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatAmount(selectedEntry.total_credit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                {t('journal.cannotLoad', 'Impossible de charger les détails de cette écriture.')}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6">
            <div className="flex gap-2 w-full">
              {selectedEntry?.status === "draft" && (
                <>
                  <Button
                    onClick={() => handlePostEntry(selectedEntry.id)}
                    disabled={postMutation.isPending}
                    className="flex-1"
                  >
                    {postMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {t('journal.post', 'Comptabiliser')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteEntry(selectedEntry.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              {selectedEntry?.status === "posted" && (
                <Button
                  variant="outline"
                  onClick={() => handleCancelEntry(selectedEntry.id)}
                  disabled={cancelMutation.isPending}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('journal.cancelEntry', 'Annuler l\'écriture')}
                </Button>
              )}
              <Button variant="outline" onClick={closeDrawer}>
                {t('journal.close', 'Fermer')}
              </Button>
            </div>
          </DialogFooter>
      </ResponsiveDialog>

      {/* Create Entry Dialog */}
      <ResponsiveDialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            resetCreateForm();
          }
        }}
        size="3xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <DialogHeader>
            <DialogTitle>{t('journal.newEntryTitle', 'Nouvelle Écriture Comptable')}</DialogTitle>
            <DialogDescription>
              {t('journal.newEntryDescription', 'Créez une nouvelle écriture en partie double. Le total des débits doit égaler le total des crédits.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {createError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={t('journal.dateLabel', 'Date *')} htmlFor="entry_date">
                <Input
                  id="entry_date"
                  type="date"
                  value={newEntry.entry_date}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      entry_date: (e.target as HTMLInputElement).value,
                    })
                  }
                  required
                />
              </FormField>
              <FormField label={t('journal.referenceType', 'Type de référence')} htmlFor="reference_type">
                <Input
                  id="reference_type"
                  value={newEntry.reference_type}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      reference_type: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder={t('journal.referenceTypePlaceholder', 'Ex: Facture, Paiement, Ajustement...')}
                />
              </FormField>
              <FormField label={t('journal.referenceNumber', 'Numéro de référence')} htmlFor="reference_number">
                <Input
                  id="reference_number"
                  value={newEntry.reference_number}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      reference_number: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder={t('journal.referenceNumberPlaceholder', 'Ex: FAC-001')}
                />
              </FormField>
              <FormField label={t('journal.remarksLabel', 'Remarques')} htmlFor="remarks">
                <Textarea
                  id="remarks"
                  value={newEntry.remarks}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      remarks: (e.target as HTMLTextAreaElement).value,
                    })
                  }
                  placeholder={t('journal.remarksPlaceholder', 'Description ou notes...')}
                  rows={1}
                />
              </FormField>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('journal.linesTitle', 'Lignes comptables')}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t('journal.addLine', 'Ajouter')}
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="col-span-5">
                      <label htmlFor={`line-account-${line.id}`} className="block text-xs text-gray-500 mb-1">
                        {t('journal.account', 'Compte')}
                      </label>
                      <select
                        id={`line-account-${line.id}`}
                        value={line.account_id}
                        onChange={(e) =>
                          updateLine(index, "account_id", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                         <option value="">{t('journal.selectAccount', 'Sélectionner...')}</option>
                        {activeAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label htmlFor={`line-debit-${line.id}`} className="block text-xs text-gray-500 mb-1">
                        {t('journal.debit', 'Débit')}
                      </label>
                      <input
                        id={`line-debit-${line.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit || ""}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "debit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('journal.amountPlaceholder', '0.00')}
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor={`line-credit-${line.id}`} className="block text-xs text-gray-500 mb-1">
                        {t('journal.credit', 'Crédit')}
                      </label>
                      <input
                        id={`line-credit-${line.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit || ""}
                        onChange={(e) =>
                          updateLine(
                            index,
                            "credit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('journal.amountPlaceholder', '0.00')}
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor={`line-description-${line.id}`} className="block text-xs text-gray-500 mb-1">
                        {t('journal.description', 'Description')}
                      </label>
                      <input
                        id={`line-description-${line.id}`}
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, "description", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('journal.descriptionPlaceholder', 'Libellé...')}
                      />
                    </div>
                    <div className="col-span-1 flex items-end pb-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 2}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{t('journal.totals', 'Totaux :')}</span>
                  <div className="flex gap-8">
                    <span
                      className={`font-semibold ${totalDebit > 0 ? "text-emerald-600" : "text-gray-400"}`}
                    >
                      {t('journal.debitTotal', 'Débit : {{amount}}', { amount: formatAmount(totalDebit) })}
                    </span>
                    <span
                      className={`font-semibold ${totalCredit > 0 ? "text-sky-600" : "text-gray-400"}`}
                    >
                      {t('journal.creditTotal', 'Crédit : {{amount}}', { amount: formatAmount(totalCredit) })}
                    </span>
                  </div>
                </div>
                {!isBalanced && totalDebit + totalCredit > 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    {t('journal.notBalancedDifference', "L'écriture n'est pas équilibrée. Différence : {{amount}}", {
                      amount: formatAmount(Math.abs(totalDebit - totalCredit)),
                    })}
                  </p>
                )}
                {isBalanced && totalDebit > 0 && (
                  <p className="text-xs text-green-500 mt-2">
                    {t('journal.balanced', "✓ L'écriture est équilibrée")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
            >
              {t('journal.cancelBtn', 'Annuler')}
            </Button>
            <Button
              onClick={handleCreateEntry}
              disabled={
                createMutation.isPending || !isBalanced || totalDebit === 0
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t('journal.createEntry', "Créer l'écriture")}
            </Button>
          </DialogFooter>
      </ResponsiveDialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
};

export const Route = createFileRoute(
  "/_authenticated/(accounting)/accounting/journal",
)({
  component: withRouteProtection(AppContent, "read", "JournalEntry"),
});
