import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { storageApi } from '@/lib/api/storage';
import { filesApi } from '@/lib/api/files';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ImagePlus, X, Loader2, GripVertical, Star, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  organizationId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  bucket?: string;
  entityType?: string;
  entityId?: string;
  folder?: string;
  fieldName?: string;
  maxPhotos?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  showPrimary?: boolean;
}

export function PhotoUpload({
  organizationId,
  photos,
  onChange,
  bucket = 'entity-photos',
  entityType,
  entityId,
  folder,
  fieldName = 'photos',
  maxPhotos = 8,
  maxSizeMB = 5,
  disabled = false,
  showPrimary = false,
}: PhotoUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File): Promise<string | null> => {
    try {
      if (!file.type.startsWith('image/')) {
        toast.error(t('photoUpload.invalidType', 'Only image files are allowed'));
        return null;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(t('photoUpload.tooLarge', `Image must be less than ${maxSizeMB}MB`));
        return null;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const subFolder = folder || entityId || 'temp-' + Date.now();
      const filePath = `${organizationId}/${subFolder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const { publicUrl } = await storageApi.upload(bucket, filePath, file, {
        cacheControl: '31536000',
        upsert: false,
      });

      if (entityType) {
        try {
          await filesApi.register({
            bucket_name: bucket,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            entity_type: entityType,
            entity_id: entityId,
            field_name: fieldName,
          }, organizationId);
        } catch (err) {
          console.error('File registration failed:', err);
        }
      }

      return publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(t('photoUpload.uploadFailed', 'Failed to upload image'));
      return null;
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast.error(t('photoUpload.maxReached', `Maximum ${maxPhotos} photos allowed`));
      return;
    }
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const results = await Promise.all(filesToUpload.map(uploadOne));
      const successful = results.filter((u): u is string => u !== null);
      if (successful.length > 0) {
        onChange([...photos, ...successful]);
        toast.success(
          t('photoUpload.uploaded', '{{count}} photo(s) uploaded', { count: successful.length }),
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, maxPhotos, onChange, disabled, t, organizationId, entityId, bucket]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const remove = useCallback((index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  }, [photos, onChange]);

  const onPhotoDragStart = (i: number) => setDraggedIndex(i);
  const onPhotoDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === i) return;
    const next = [...photos];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(i, 0, moved);
    onChange(next);
    setDraggedIndex(i);
  };
  const onPhotoDragEnd = () => setDraggedIndex(null);

  const setAsPrimary = (i: number) => {
    if (i === 0) return;
    const next = [...photos];
    const [removed] = next.splice(i, 1);
    next.unshift(removed);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 transition-colors',
          dragOver && !disabled
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-gray-300 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-emerald-400',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled || uploading}
        />
        <div className="flex flex-col items-center justify-center text-center">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('photoUpload.uploading', 'Uploading...')}
              </p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('photoUpload.drop', 'Drop photos here or click to upload')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('photoUpload.formats', 'PNG, JPG, WEBP up to {{size}}MB', { size: maxSizeMB })}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {photos.length}/{maxPhotos}
              </p>
            </>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {photos.map((url, index) => (
            <div
              key={url}
              draggable={!disabled}
              onDragStart={() => onPhotoDragStart(index)}
              onDragOver={(e) => onPhotoDragOver(e, index)}
              onDragEnd={onPhotoDragEnd}
              className={cn(
                'relative group aspect-square rounded-lg overflow-hidden border-2 transition-all',
                showPrimary && index === 0
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 dark:border-gray-700',
                draggedIndex === index && 'opacity-50',
                !disabled && 'cursor-grab active:cursor-grabbing',
              )}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {showPrimary && index === 0 && (
                <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                  <Star className="w-3 h-3" />
                  {t('photoUpload.primary', 'Primary')}
                </div>
              )}
              {!disabled && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 text-white p-1 rounded">
                    <GripVertical className="w-3 h-3" />
                  </div>
                </div>
              )}
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {showPrimary && index !== 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-6 text-xs"
                      onClick={(e) => { e.stopPropagation(); setAsPrimary(index); }}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {t('photoUpload.setPrimary', 'Primary')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); remove(index); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {photos.length < maxPhotos && !disabled && (
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;
