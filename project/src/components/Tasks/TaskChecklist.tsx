import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, Plus, X, Loader2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
  useTaskChecklist,
  useAddChecklistItem,
  useToggleChecklistItem,
  useRemoveChecklistItem,
} from '@/hooks/useTasks';
import { formatDistance } from 'date-fns';
import { fr, enUS, ar } from 'date-fns/locale';

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

interface TaskChecklistProps {
  taskId: string;
  disabled?: boolean;
  /** No duplicate card/title — parent Card provides chrome. */
  embedded?: boolean;
}

export default function TaskChecklist({ taskId, disabled = false, embedded = false }: TaskChecklistProps) {
  const { t, i18n } = useTranslation();
  const [newItemTitle, setNewItemTitle] = useState('');

  const { data: checklistData, isLoading } = useTaskChecklist(taskId);
  const addItem = useAddChecklistItem();
  const toggleItem = useToggleChecklistItem();
  const removeItem = useRemoveChecklistItem();

  const checklist: ChecklistItem[] = Array.isArray(checklistData) ? checklistData : [];
  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getLocale = () => {
    if (i18n.language.startsWith('fr')) return fr;
    if (i18n.language.startsWith('ar')) return ar;
    return enUS;
  };

  const handleAddItem = async () => {
    const title = newItemTitle.trim();
    if (!title) return;
    try {
      await addItem.mutateAsync({ taskId, title });
      setNewItemTitle('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggle = (itemId: string) => {
    if (disabled) return;
    toggleItem.mutate({ taskId, itemId });
  };

  const handleRemove = (itemId: string) => {
    if (disabled) return;
    removeItem.mutate({ taskId, itemId });
  };

  const addRow = !disabled && (
    embedded ? (
      <div className="mt-4 space-y-2">
        <Input
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder={t('tasks.detail.addChecklistItem', 'Add a checklist item...')}
          className="w-full"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddItem();
            }
          }}
          disabled={addItem.isPending}
        />
        <Button
          type="button"
          onClick={handleAddItem}
          disabled={!newItemTitle.trim() || addItem.isPending}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {addItem.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {t('tasks.detail.addChecklistButton', 'Ajouter un élément')}
        </Button>
      </div>
    ) : (
      <div className="mb-4 flex gap-2">
        <Input
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder={t('tasks.detail.addChecklistItem', 'Add a checklist item...')}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddItem();
            }
          }}
          disabled={addItem.isPending}
        />
        <Button
          onClick={handleAddItem}
          disabled={!newItemTitle.trim() || addItem.isPending}
          size="sm"
          variant="outline"
        >
          {addItem.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="ml-1">{t('common.add', 'Add')}</span>
        </Button>
      </div>
    )
  );

  const body = (
    <>
      {!embedded && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <ListChecks className="h-5 w-5" />
              {t('tasks.detail.checklist', 'Checklist')}
              {totalCount > 0 && (
                <span className="text-sm font-normal text-gray-500">({completedCount}/{totalCount})</span>
              )}
            </h2>
            {totalCount > 0 && (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{percentage}%</span>
            )}
          </div>
          {totalCount > 0 && (
            <div className="mb-4 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300 ease-in-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </>
      )}

      {/* Add item */}
      {!embedded && addRow}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Item list */}
      {!isLoading && totalCount === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t(
            'tasks.detail.noChecklistItems',
            'No checklist items yet. Add items to track subtasks.'
          )}
        </p>
      )}

      {!isLoading && totalCount > 0 && (
        <div className="space-y-1">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-3 py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Checkbox */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleToggle(item.id)}
                disabled={disabled || toggleItem.isPending}
                className="mt-0.5 flex-shrink-0 h-auto w-auto p-0 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                aria-label={item.completed ? t('tasks.checklist.uncheck', 'Uncheck item') : t('tasks.checklist.check', 'Check item')}
              >
                {item.completed ? (
                  <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </Button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm transition-all duration-200 ${
                    item.completed
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.title}
                </span>
                {item.completed && item.completed_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {item.completed_by && `${item.completed_by} \u00b7 `}
                    {formatDistance(new Date(item.completed_at), new Date(), {
                      addSuffix: true,
                      locale: getLocale(),
                    })}
                  </p>
                )}
              </div>

              {/* Delete button */}
              {!disabled && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(item.id)}
                  disabled={removeItem.isPending}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 h-auto w-auto p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  aria-label={t('tasks.checklist.removeItem', 'Remove item')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {embedded && addRow}
    </>
  );

  if (embedded) {
    return <div className="space-y-1">{body}</div>;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      {body}
    </div>
  );
}
