import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { storageApi } from '@/lib/api/storage';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ImagePlus,
  X,
  Loader2,
  GripVertical,
  Star,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageUploadProps {
  itemId?: string;
  organizationId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function ProductImageUpload({
  itemId,
  organizationId,
  images,
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: ProductImageUploadProps) {
  const { t } = useTranslation('stock');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('items.marketplace.invalidFileType', 'Only image files are allowed'));
        return null;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('items.marketplace.fileTooLarge', 'Image must be less than 5MB'));
        return null;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
       const itemFolder = itemId || 'temp-' + Date.now();
       const fileName = `${organizationId}/${itemFolder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

       const { publicUrl } = await storageApi.upload('products', fileName, file, {
         cacheControl: '31536000', // 1 year cache
         upsert: false
       });

       return publicUrl;
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      toast.error(t('items.marketplace.uploadFailed', 'Failed to upload image'));
      return null;
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(t('items.marketplace.maxImagesReached', `Maximum ${maxImages} images allowed`));
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(file => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        onImagesChange([...images, ...successfulUploads]);
        toast.success(
          t('items.marketplace.imagesUploaded', '{{count}} image(s) uploaded', { count: successfulUploads.length })
        );
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [images, maxImages, onImagesChange, disabled, t, organizationId, itemId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  }, [images, onImagesChange]);

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    onImagesChange(newImages);
    setDraggedIndex(index);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  const setAsPrimary = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [removed] = newImages.splice(index, 1);
    newImages.unshift(removed);
    onImagesChange(newImages);
    toast.success(t('items.marketplace.primaryImageSet', 'Primary image updated'));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          dragOver && !disabled
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-gray-300 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-emerald-400'
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
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('items.marketplace.uploading', 'Uploading...')}
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('items.marketplace.dropImages', 'Drop images here or click to upload')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('items.marketplace.imageFormats', 'PNG, JPG, WEBP up to 5MB each')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {images.length}/{maxImages} {t('items.marketplace.imagesUsed', 'images')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {images.map((url, index) => (
            <div
              key={url}
              draggable={!disabled}
              onDragStart={() => handleImageDragStart(index)}
              onDragOver={(e) => handleImageDragOver(e, index)}
              onDragEnd={handleImageDragEnd}
              className={cn(
                'relative group aspect-square rounded-lg overflow-hidden border-2 transition-all',
                index === 0
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 dark:border-gray-700',
                draggedIndex === index && 'opacity-50',
                !disabled && 'cursor-grab active:cursor-grabbing'
              )}
            >
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                  <Star className="w-3 h-3" />
                  {t('items.marketplace.primary', 'Primary')}
                </div>
              )}

              {/* Drag Handle */}
              {!disabled && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 text-white p-1 rounded">
                    <GripVertical className="w-3 h-3" />
                  </div>
                </div>
              )}

              {/* Actions Overlay */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index !== 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsPrimary(index);
                      }}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {t('items.marketplace.setPrimary', 'Primary')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Add More Placeholder */}
          {images.length < maxImages && !disabled && (
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('items.marketplace.imageHelp', 'Drag images to reorder. The first image will be the main product image.')}
      </p>
    </div>
  );
}
