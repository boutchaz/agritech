import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/Textarea';
import { useAddTaskComment } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface MentionableUser {
  id: string;
  first_name: string;
  last_name: string;
  user_id?: string;
}

interface TaskCommentInputProps {
  taskId: string;
  onCommentAdded?: () => void;
}

export default function TaskCommentInput({ taskId, onCommentAdded }: TaskCommentInputProps) {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const addComment = useAddTaskComment();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const organizationId = currentOrganization?.id;

  // Fetch mentionable workers
  const { data: workersData } = useQuery({
    queryKey: ['workers-mentionable', organizationId],
    queryFn: () =>
      apiClient.get<MentionableUser[]>(
        `/api/v1/organizations/${organizationId}/workers/active`,
        {},
        organizationId
      ),
    enabled: !!organizationId,
    staleTime: 60000,
  });

  const workers: MentionableUser[] = Array.isArray(workersData) ? workersData : [];

  // Filter workers by mention query
  const filteredWorkers = workers.filter((w) => {
    if (!mentionQuery) return true;
    const fullName = `${w.first_name} ${w.last_name}`.toLowerCase();
    return fullName.includes(mentionQuery.toLowerCase());
  }).slice(0, 8);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionQuery]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      setText(value);

      // Check if we should show mention dropdown
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Show dropdown if @ is at start or preceded by a space, and no space in the query yet
        const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
        if (
          (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) &&
          !textAfterAt.includes('\n')
        ) {
          setShowMentions(true);
          setMentionQuery(textAfterAt);
          setMentionStartIndex(lastAtIndex);
          return;
        }
      }

      setShowMentions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    },
    []
  );

  const insertMention = useCallback(
    (worker: MentionableUser) => {
      const mentionText = `@[${worker.first_name} ${worker.last_name}](${worker.id})`;
      const beforeMention = text.slice(0, mentionStartIndex);
      const afterMention = text.slice(
        mentionStartIndex + 1 + mentionQuery.length
      );
      const newText = `${beforeMention}${mentionText} ${afterMention}`;
      setText(newText);
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);

      // Focus back to textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeMention.length + mentionText.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [text, mentionStartIndex, mentionQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredWorkers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredWorkers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredWorkers.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredWorkers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    // Submit with Ctrl/Cmd + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      await addComment.mutateAsync({
        task_id: taskId,
        comment: text.trim(),
        type: 'comment',
      } as any);
      setText('');
      onCommentAdded?.();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={t(
              'tasks.detail.addCommentMention',
              'Write a comment... Use @ to mention someone'
            )}
            rows={2}
            className="resize-none"
          />

          {/* Mentions dropdown */}
          {showMentions && filteredWorkers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredWorkers.map((worker, index) => (
                <button
                  key={worker.id}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    index === selectedMentionIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => insertMention(worker)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {worker.first_name[0]}
                      {worker.last_name[0]}
                    </span>
                  </div>
                  <span className="truncate">
                    {worker.first_name} {worker.last_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showMentions && filteredWorkers.length === 0 && mentionQuery && (
            <div className="absolute bottom-full left-0 mb-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 px-3 py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tasks.detail.noMentionResults', 'No members found')}
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || addComment.isPending}
          size="sm"
          className="self-end"
        >
          {addComment.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
