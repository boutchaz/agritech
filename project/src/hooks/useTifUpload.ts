import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storageApi } from '../lib/api/storage';
import { apiClient } from '../lib/api-client';
import { toast } from 'sonner';

interface ParcelTifData {
  tif_image_url: string | null;
}

interface UseTifUploadOptions {
  parcelId: string;
  parcelName: string;
  onSuccess?: (imageUrl: string | null) => void;
}

interface TifMetadata {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
}

export function useTifUpload({ parcelId, parcelName, onSuccess }: UseTifUploadOptions) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<{ imageUrl: string; metadata: TifMetadata }> => {
      // Validate file type
      const validTypes = ['image/tiff', 'image/tif', 'image/geotiff'];
      const fileExt = file.name.toLowerCase().split('.').pop();

      if (!validTypes.includes(file.type) &&
!['tif', 'tiff'].includes(fileExt || '')) {
        throw new Error('Format de fichier non supporté. Veuillez utiliser un fichier TIF ou GeoTIFF.');
      }

      // Check file size (max 100MB for drone images)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new Error('Fichier trop volumineux. Maximum 100MB.');
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Create unique file path
        const timestamp = Date.now();
        const sanitizedName = parcelName.replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = `tif-images/${parcelId}/${sanitizedName}_${timestamp}.tif`;

        // Upload to Supabase storage
        setUploadProgress(30);
        const result = await storageApi.upload('agritech-documents', filePath, file, {
          cacheControl: '86400', // 24 hours
          upsert: false,
        });

        setUploadProgress(70);

        // Update parcel record with image URL
        const metadata: TifMetadata = {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          mimeType: file.type,
        };

        await apiClient.patch(`/api/v1/parcels/${parcelId}`, {
          tif_image_url: result.publicUrl,
          tif_image_uploaded_at: new Date().toISOString(),
          tif_image_metadata: metadata,
        });

        setUploadProgress(100);

        return {
          imageUrl: result.publicUrl,
          metadata,
        };
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    onSuccess: (data) => {
      toast.success('Image TIF importée avec succès !');
      onSuccess?.(data.imageUrl);

      // Invalidate parcels queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
    onError: (error: Error) => {
      console.error('TIF upload error:', error);
      toast.error(`Erreur lors de l'importation: ${error.message}`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      setIsUploading(true);

      try {
        const parcel = await apiClient.get<ParcelTifData>(`/api/v1/parcels/${parcelId}`);

        if (parcel?.tif_image_url) {
          const url = new URL(parcel.tif_image_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(pathParts.indexOf('agritech-documents') + 1).join('/');

          await storageApi.remove('agritech-documents', [filePath]);
        }

        await apiClient.patch(`/api/v1/parcels/${parcelId}`, {
          tif_image_url: null,
          tif_image_uploaded_at: null,
          tif_image_metadata: null,
        });

        queryClient.invalidateQueries({ queryKey: ['parcels'] });
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast.success('Image TIF supprimée');
      onSuccess?.(null);
    },
    onError: (error: Error) => {
      console.error('TIF removal error:', error);
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  const uploadTif = (file: File) => {
    return uploadMutation.mutate(file);
  };

  const removeTif = () => {
    return removeMutation.mutate();
  };

  return {
    uploadTif,
    removeTif,
    isUploading,
    uploadProgress,
  };
}
