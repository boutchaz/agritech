import { ConflictDialog } from './ConflictDialog';
import { useConflictStore } from '@/stores/conflictStore';

export function ConflictDialogHost() {
  const current = useConflictStore((s) => s.current);
  const close = useConflictStore((s) => s.close);

  if (!current) return null;

  return (
    <ConflictDialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
      resourceLabel={current.resourceLabel}
      mine={current.mine}
      server={current.server}
      onResolve={(decision) => close(decision)}
    />
  );
}
