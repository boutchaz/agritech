import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type ConflictResolution = 'keep-mine' | 'use-server' | 'edit';

export interface ConflictDialogProps<T = unknown> {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resourceLabel: string;
  mine: T;
  server: T;
  onResolve: (decision: ConflictResolution) => void;
}

function renderField(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ConflictDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  resourceLabel,
  mine,
  server,
  onResolve,
}: ConflictDialogProps<T>) {
  const keys = Array.from(
    new Set([...Object.keys(mine ?? {}), ...Object.keys(server ?? {})]),
  ).filter((k) => !['version', 'updated_at', 'created_at', 'id', 'organization_id'].includes(k));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conflit de synchronisation — {resourceLabel}</DialogTitle>
          <DialogDescription>
            Cette ressource a été modifiée sur le serveur depuis votre dernière
            modification. Choisissez la version à conserver.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-auto">
          <div className="rounded border p-3 bg-amber-50 dark:bg-amber-950/30">
            <h4 className="font-medium text-sm mb-2">Votre version</h4>
            <dl className="text-xs space-y-1">
              {keys.map((k) => (
                <div key={k} className="grid grid-cols-[40%_60%] gap-2">
                  <dt className="text-muted-foreground truncate">{k}</dt>
                  <dd className="break-all">{renderField((mine as Record<string, unknown>)[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded border p-3 bg-sky-50 dark:bg-sky-950/30">
            <h4 className="font-medium text-sm mb-2">Version serveur</h4>
            <dl className="text-xs space-y-1">
              {keys.map((k) => (
                <div key={k} className="grid grid-cols-[40%_60%] gap-2">
                  <dt className="text-muted-foreground truncate">{k}</dt>
                  <dd className="break-all">{renderField((server as Record<string, unknown>)[k])}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => onResolve('edit')}>
            Modifier et réessayer
          </Button>
          <Button variant="outline" onClick={() => onResolve('use-server')}>
            Utiliser la version serveur
          </Button>
          <Button onClick={() => onResolve('keep-mine')}>
            Garder ma version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
