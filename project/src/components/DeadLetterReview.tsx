import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  listDeadLetters,
  retryDeadLetter,
  discardDeadLetter,
  exportDeadLetters,
} from '@/lib/offline/outbox';
import type { DeadLetterRow } from '@/lib/offline/db';
import { useOrganizationStore } from '@/stores/organizationStore';

export function DeadLetterReview({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const orgId = useOrganizationStore((s) => s.currentOrganization?.id ?? null);
  const [rows, setRows] = useState<DeadLetterRow[]>([]);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setRows(await listDeadLetters(orgId));
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listDeadLetters(orgId ?? '').then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [open, orgId]);

  const handleRetry = async (id: string) => {
    await retryDeadLetter(id);
    await refresh();
  };

  const handleDiscard = async (id: string) => {
    await discardDeadLetter(id);
    await refresh();
  };

  const handleExport = async () => {
    if (!orgId) return;
    const json = await exportDeadLetters(orgId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrogina-failed-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Actions en échec</DialogTitle>
          <DialogDescription>
            Ces actions n'ont pas pu se synchroniser après plusieurs tentatives. Réessayez
            ou exportez-les pour intervention manuelle.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucune action en échec.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded border p-3 text-sm bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {r.original.method} {r.original.resource}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.original.url}
                      </div>
                      <div className="text-xs text-red-600 mt-1">{r.reason}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(r.movedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleRetry(r.id)}>
                        Réessayer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDiscard(r.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            Exporter en JSON
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
