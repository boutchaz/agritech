import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { storageApi } from '@/lib/api/storage';
import { filesApi } from '@/lib/api/files';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Upload,
  Loader2,
  Paperclip,
  Image,
  FileText,
  Table,
  File,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Attachment {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface TaskAttachmentsProps {
  taskId: string;
  organizationId: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;
const STORAGE_BUCKET = 'files';

const ACCEPTED_FILE_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
].join(',');

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType === 'text/plain'
  )
    return FileText;
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType === 'text/csv'
  )
    return Table;
  return File;
}

function getStorageKey(taskId: string, organizationId: string): string {
  return `task-attachments:${organizationId}:${taskId}`;
}

function loadAttachments(taskId: string, organizationId: string): Attachment[] {
  try {
    const raw = localStorage.getItem(getStorageKey(taskId, organizationId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAttachments(
  taskId: string,
  organizationId: string,
  attachments: Attachment[]
): void {
  localStorage.setItem(
    getStorageKey(taskId, organizationId),
    JSON.stringify(attachments)
  );
}

export default function TaskAttachments({
  taskId,
  organizationId,
  disabled = false,
}: TaskAttachmentsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const queryKey = ['task-attachments', organizationId, taskId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => loadAttachments(taskId, organizationId),
    staleTime: Infinity,
    enabled: !!taskId && !!organizationId,
  });

  const setAttachments = useCallback(
    (newAttachments: Attachment[]) => {
      saveAttachments(taskId, organizationId, newAttachments);
      queryClient.setQueryData(queryKey, newAttachments);
    },
    [taskId, organizationId, queryClient]
  );

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          t(
            'tasks.attachments.fileTooLarge',
            '{{name}} exceeds the 10MB limit',
            { name: file.name }
          )
        );
        return null;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tasks/${organizationId}/${taskId}/${Date.now()}-${safeName}`;

      const { publicUrl } = await storageApi.upload(
        STORAGE_BUCKET,
        filePath,
        file,
        {
          cacheControl: '31536000',
          upsert: false,
        }
      );

      try {
        await filesApi.register({
          bucket_name: STORAGE_BUCKET,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          entity_type: 'task',
          entity_id: taskId,
          field_name: 'attachments',
        }, organizationId);
      } catch (registerError) {
        console.error('Failed to register file in tracking system:', registerError);
      }

      return {
        url: publicUrl,
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      toast.error(
        t('tasks.attachments.uploadFailed', 'Failed to upload {{name}}', {
          name: file.name,
        })
      );
      return null;
    }
  };

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;

      const remainingSlots = MAX_FILES - attachments.length;
      if (remainingSlots <= 0) {
        toast.error(
          t(
            'tasks.attachments.maxReached',
            'Maximum {{max}} files allowed per task',
            { max: MAX_FILES }
          )
        );
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      setUploading(true);

      try {
        const uploadPromises = filesToUpload.map((file) => uploadFile(file));
        const results = await Promise.all(uploadPromises);
        const successful = results.filter(
          (r): r is Attachment => r !== null
        );

        if (successful.length > 0) {
          setAttachments([...attachments, ...successful]);
          toast.success(
            t(
              'tasks.attachments.uploaded',
              '{{count}} file(s) uploaded',
              { count: successful.length }
            )
          );
        }
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [attachments, disabled, t, setAttachments]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDelete = useCallback(
    async (attachment: Attachment) => {
      try {
        await storageApi.remove(STORAGE_BUCKET, [attachment.path]);
        const updated = attachments.filter((a) => a.path !== attachment.path);
        setAttachments(updated);
        setDeleteConfirm(null);
        toast.success(
          t('tasks.attachments.deleted', '{{name}} deleted', {
            name: attachment.name,
          })
        );
      } catch (error: any) {
        console.error('Failed to delete file:', error);
        toast.error(
          t(
            'tasks.attachments.deleteFailed',
            'Failed to delete {{name}}',
            { name: attachment.name }
          )
        );
      }
    },
    [attachments, setAttachments, t]
  );

  const handleDownload = useCallback(
    async (attachment: Attachment) => {
      try {
        const blob = await storageApi.download(
          STORAGE_BUCKET,
          attachment.path
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error: any) {
        console.error('Failed to download file:', error);
        toast.error(
          t(
            'tasks.attachments.downloadFailed',
            'Failed to download {{name}}',
            { name: attachment.name }
          )
        );
      }
    },
    [t]
  );

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Paperclip className="w-5 h-5" />
        {t('tasks.attachments.title', 'Attachments')}
        {attachments.length > 0 && (
          <span className="text-sm font-normal text-gray-500">
            ({attachments.length})
          </span>
        )}
      </h2>

      {/* Upload Drop Zone */}
      {!disabled && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors mb-4',
            dragOver
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-300 dark:border-gray-600',
            !disabled && 'cursor-pointer hover:border-emerald-400'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={disabled || uploading}
          />

          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('tasks.attachments.uploading', 'Uploading...')}
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {t(
                    'tasks.attachments.dropFiles',
                    'Drop files here or click to upload'
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    'tasks.attachments.fileFormats',
                    'Images, PDF, DOC, XLS up to 10MB each'
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {attachments.length}/{MAX_FILES}{' '}
                  {t('tasks.attachments.filesUsed', 'files')}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* File List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {t('tasks.attachments.noFiles', 'No attachments yet')}
        </p>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => {
            const IconComponent = getFileIcon(attachment.type);
            const showThumbnail = isImage(attachment.type);

            return (
              <div
                key={attachment.path}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 group"
              >
                {/* Thumbnail or Icon */}
                {showThumbnail ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatBytes(attachment.size)}
                    {attachment.uploadedAt && (
                      <>
                        {' '}
                        &middot;{' '}
                        {new Date(attachment.uploadedAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(attachment)}
                    title={t('tasks.attachments.download', 'Download')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  {!disabled && (
                    <>
                      {deleteConfirm === attachment.path ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs px-2"
                            onClick={() => handleDelete(attachment)}
                          >
                            {t('tasks.attachments.confirmDelete', 'Delete')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setDeleteConfirm(attachment.path)}
                          title={t('tasks.attachments.delete', 'Delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
