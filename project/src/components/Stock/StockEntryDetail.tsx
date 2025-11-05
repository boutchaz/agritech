import React from 'react';
import { useStockEntry } from '@/hooks/useStockEntries';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Package, Warehouse, Calendar, FileText, User } from 'lucide-react';
import type { StockEntry } from '@/types/stock-entries';
import { STOCK_ENTRY_TYPES, STOCK_ENTRY_STATUS_COLORS } from '@/types/stock-entries';

interface StockEntryDetailProps {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockEntryDetail({ entryId, open, onOpenChange }: StockEntryDetailProps) {
  const { data: entry, isLoading } = useStockEntry(entryId);
  const { format: formatCurrency } = useCurrency();

  if (!open) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3">Loading entry details...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!entry) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <div className="text-center py-12">
            <p className="text-gray-500">Entry not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const typeConfig = STOCK_ENTRY_TYPES[entry.entry_type];
  const totalCost = entry.items?.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Stock Entry Details
          </DialogTitle>
          <DialogDescription>
            {entry.entry_number} - {entry.entry_type}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Header Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Entry Number</p>
                <p className="font-semibold text-lg">{entry.entry_number}</p>
              </div>
              <Badge className={STOCK_ENTRY_STATUS_COLORS[entry.status]}>
                {entry.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Entry Date
                </p>
                <p className="font-medium">{new Date(entry.entry_date).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Entry Type
                </p>
                <Badge className={`bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
                  {entry.entry_type}
                </Badge>
              </div>
            </div>

            {/* Warehouses */}
            {(entry.from_warehouse || entry.to_warehouse) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                {entry.from_warehouse && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      From Warehouse
                    </p>
                    <p className="font-medium">{entry.from_warehouse.name}</p>
                  </div>
                )}

                {entry.to_warehouse && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      To Warehouse
                    </p>
                    <p className="font-medium">{entry.to_warehouse.name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reference */}
            {entry.reference_number && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Reference</p>
                <p className="font-medium">
                  {entry.reference_type && `${entry.reference_type}: `}
                  {entry.reference_number}
                </p>
              </div>
            )}

            {/* Purpose */}
            {entry.purpose && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Purpose</p>
                <p className="font-medium">{entry.purpose}</p>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.items && entry.items.length > 0 ? (
                    entry.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.item?.item_code && (
                              <p className="text-xs text-gray-500">
                                Code: {item.item.item_code}
                              </p>
                            )}
                            {item.batch_number && (
                              <p className="text-xs text-gray-500">
                                Batch: {item.batch_number}
                              </p>
                            )}
                            {item.serial_number && (
                              <p className="text-xs text-gray-500">
                                Serial: {item.serial_number}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.cost_per_unit ? formatCurrency(item.cost_per_unit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.cost_per_unit
                            ? formatCurrency(item.quantity * item.cost_per_unit)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No items in this entry
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Total */}
            {totalCost > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-w-[200px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Cost:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Created</span>
              <span>{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            {entry.updated_at && entry.updated_at !== entry.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Updated</span>
                <span>{new Date(entry.updated_at).toLocaleString()}</span>
              </div>
            )}
            {entry.posted_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Posted</span>
                <span>{new Date(entry.posted_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
