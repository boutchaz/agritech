import { CheckCircle2, ClipboardList, Droplets, Leaf, Loader2, Scissors, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useAnnualMissingTasks, useResolveAnnualMissingTasks } from '@/hooks/useAnnualRecalibration';

interface AnnualMissingTasksStepProps {
  parcelId: string;
  onContinue: () => void;
}

type TaskResolution = 'pending' | 'quick-entry' | 'completed' | 'not-done' | 'unconfirmed';

function getTaskIcon(taskType: string) {
  const normalized = taskType.toLowerCase();

  if (normalized.includes('ferti') || normalized.includes('nutrition')) {
    return <Leaf className="h-4 w-4 text-green-600" />;
  }
  if (normalized.includes('irrig')) {
    return <Droplets className="h-4 w-4 text-blue-600" />;
  }
  if (normalized.includes('taille') || normalized.includes('pruning')) {
    return <Scissors className="h-4 w-4 text-violet-600" />;
  }
  if (normalized.includes('phyto') || normalized.includes('pest')) {
    return <ShieldAlert className="h-4 w-4 text-orange-600" />;
  }

  return <ClipboardList className="h-4 w-4 text-gray-600" />;
}

function statusLabel(resolution: TaskResolution): string {
  if (resolution === 'completed') return 'Renseignee';
  if (resolution === 'not-done') return 'Non realisee';
  if (resolution === 'unconfirmed') return 'Non confirmee';
  return 'En attente';
}

export function AnnualMissingTasksStep({ parcelId, onContinue }: AnnualMissingTasksStepProps) {
  const { data: missingTasks, isLoading } = useAnnualMissingTasks(parcelId);
  const resolveMissingTasks = useResolveAnnualMissingTasks(parcelId);
  const [taskStates, setTaskStates] = useState<Record<string, TaskResolution>>({});
  const [quickEntryNotes, setQuickEntryNotes] = useState<Record<string, string>>({});
  const [quickEntryDates, setQuickEntryDates] = useState<Record<string, string>>({});

  const tasks = missingTasks ?? [];

  useEffect(() => {
    if (tasks.length === 0) {
      return;
    }

    setTaskStates((previous) => {
      const nextState = { ...previous };
      for (const task of tasks) {
        if (previous[task.task_id]) {
          continue;
        }

        if (task.current_resolution === 'completed') {
          nextState[task.task_id] = 'completed';
        } else if (task.current_resolution === 'not_done') {
          nextState[task.task_id] = 'not-done';
        } else if (task.current_resolution === 'unconfirmed') {
          nextState[task.task_id] = 'unconfirmed';
        }
      }
      return nextState;
    });

    setQuickEntryNotes((previous) => {
      const nextState = { ...previous };
      for (const task of tasks) {
        if (!nextState[task.task_id] && task.resolution_notes) {
          nextState[task.task_id] = task.resolution_notes;
        }
      }
      return nextState;
    });

    setQuickEntryDates((previous) => {
      const nextState = { ...previous };
      for (const task of tasks) {
        if (!nextState[task.task_id] && task.resolution_date) {
          nextState[task.task_id] = task.resolution_date;
        }
      }
      return nextState;
    });
  }, [tasks]);

  const allResolved = useMemo(
    () =>
      tasks.every((task) => {
        const state = taskStates[task.task_id] ?? 'pending';
        return state === 'completed' || state === 'not-done' || state === 'unconfirmed';
      }),
    [taskStates, tasks],
  );

  const persistResolutions = async (nextStates?: Record<string, TaskResolution>) => {
    const source = nextStates ?? taskStates;
    const resolutions = tasks.flatMap((task) => {
      const state = source[task.task_id] ?? 'pending';
      if (state === 'pending' || state === 'quick-entry') {
        return [];
      }

      return [
        {
          task_id: task.task_id,
          resolution:
            state === 'completed'
              ? 'completed'
              : state === 'not-done'
                ? 'not_done'
                : 'unconfirmed',
          execution_date: quickEntryDates[task.task_id] || undefined,
          notes: quickEntryNotes[task.task_id] || undefined,
        },
      ];
    });

    if (resolutions.length === 0) {
      return;
    }

    await resolveMissingTasks.mutateAsync(resolutions);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Verification des taches annuelles en cours...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-medium">Toutes les taches annuelles semblent renseignees.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onContinue} >
            Continuer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Avant de finaliser le recalibrage, nous avons detecte des elements non renseignes cette annee.
      </p>

      <div className="space-y-3">
        {tasks.map((task) => {
          const taskKey = task.task_id;
          const state = taskStates[taskKey] ?? 'pending';
          const isQuickEntryOpen = state === 'quick-entry';

          return (
            <div
              key={taskKey}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getTaskIcon(task.task_type)}
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{task.task_type}</p>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                      {task.period}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{task.message}</p>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{statusLabel(state)}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTaskStates((previous) => ({ ...previous, [taskKey]: 'quick-entry' }))}
                >
                  Completer maintenant
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTaskStates((previous) => ({ ...previous, [taskKey]: 'not-done' }))}
                >
                  Non realise
                </Button>
              </div>

              {isQuickEntryOpen && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-3">
                  <div>
                    <label htmlFor={`${taskKey}-date`} className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <Input
                      id={`${taskKey}-date`}
                      type="date"
                      value={quickEntryDates[taskKey] ?? ''}
                      onChange={(event) =>
                        setQuickEntryDates((previous) => ({
                          ...previous,
                          [taskKey]: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`${taskKey}-notes`} className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                      Notes rapides
                    </label>
                    <Input
                      id={`${taskKey}-notes`}
                      value={quickEntryNotes[taskKey] ?? ''}
                      onChange={(event) =>
                        setQuickEntryNotes((previous) => ({
                          ...previous,
                          [taskKey]: event.target.value,
                        }))
                      }
                      placeholder="Produit, dose, remarque..."
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setTaskStates((previous) => ({ ...previous, [taskKey]: 'completed' }))}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Enregistrer cette saisie
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Les elements non renseignes seront marques &apos;Non confirme&apos; dans le bilan annuel.
        </p>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const allUnconfirmed = tasks.reduce<Record<string, TaskResolution>>((accumulator, task) => {
              accumulator[task.task_id] = 'unconfirmed';
              return accumulator;
            }, {});

            const nextState = { ...taskStates, ...allUnconfirmed };
            setTaskStates(nextState);
            await persistResolutions(nextState);
            onContinue();
          }}
          disabled={resolveMissingTasks.isPending}
        >
          Ignorer et continuer
        </Button>

        <Button
          type="button"
          onClick={async () => {
            await persistResolutions();
            onContinue();
          }}
          disabled={!allResolved || resolveMissingTasks.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {resolveMissingTasks.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Continuer'
          )}
        </Button>
      </div>
    </div>
  );
}
