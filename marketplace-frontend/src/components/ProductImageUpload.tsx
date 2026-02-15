'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ApiClient } from '../lib/api';

interface ProductImageUploadProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
    maxImages?: number;
    organizationId?: string;
    listingId?: string;
}

export default function ProductImageUpload({
    images,
    onImagesChange,
    maxImages = 5,
    organizationId,
    listingId,
}: ProductImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files);
        await uploadFiles(files);
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            await uploadFiles(files);
        }
    };

    const uploadFiles = async (files: File[]) => {
        setError('');

        // Check if we can upload more images
        const remainingSlots = maxImages - images.length;
        if (files.length > remainingSlots) {
            setError(`Vous ne pouvez télécharger que ${remainingSlots} image(s) supplémentaire(s)`);
            return;
        }

        // Validate file types and sizes
        const validFiles = files.filter(file => {
            const isValidType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

            if (!isValidType) {
                setError(`${file.name}: Type de fichier non supporté. Utilisez JPG, PNG, WebP ou GIF.`);
                return false;
            }
            if (!isValidSize) {
                setError(`${file.name}: Fichier trop volumineux. Maximum 5MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setUploading(true);

        try {
            // Get current user to determine organization_id
            let orgId = organizationId;
            if (!orgId) {
                const user = await ApiClient.getCurrentUser();
                orgId = user.organization_id;
            }

            if (!orgId) {
                throw new Error('Organization ID not found');
            }

            const supabase = createBrowserSupabaseClient();
            const uploadedUrls: string[] = [];

            for (const file of validFiles) {
                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 9);
                const fileName = `${orgId}/${listingId || 'temp'}/${timestamp}-${random}.${fileExt}`;

                // Upload to Supabase storage
                const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(fileName, file, {
                        cacheControl: '31536000', // 1 year cache
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error(`Échec du téléchargement de ${file.name}`);
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('products')
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrl);
            }

            // Update images array
            onImagesChange([...images, ...uploadedUrls]);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Échec du téléchargement des images');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = async (index: number) => {
        const imageUrl = images[index];

        // Extract file path from URL
        const urlParts = imageUrl.split('/products/');
        if (urlParts.length === 2) {
            const filePath = urlParts[1].split('?')[0]; // Remove query params

            try {
                const supabase = createBrowserSupabaseClient();
                await supabase.storage.from('products').remove([filePath]);
            } catch (err) {
                console.error('Failed to delete image from storage:', err);
                // Continue anyway - update UI even if storage deletion fails
            }
        }

        // Remove from array
        const newImages = images.filter((_, i) => i !== index);
        onImagesChange(newImages);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newImages = [...images];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedImage);

        setDraggedIndex(index);
        onImagesChange(newImages);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                    dragActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={uploading || images.length >= maxImages}
                />

                <div className="text-center">
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="h-12 w-12 text-green-600 animate-spin mb-4" />
                            <p className="text-gray-600">Téléchargement en cours...</p>
                        </div>
                    ) : (
                        <>
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-700 font-medium mb-2">
                                Glissez-déposez vos images ici
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                                ou cliquez pour sélectionner
                            </p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={images.length >= maxImages}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sélectionner des images
                            </button>
                            <p className="text-xs text-gray-500 mt-4">
                                JPG, PNG, WebP ou GIF • Max 5MB par image • {images.length}/{maxImages} images
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Image Preview Grid */}
            {images.length > 0 && (
                <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                        Images téléchargées ({images.length}/{maxImages})
                        {images.length > 0 && <span className="text-gray-500 ml-2">• Glissez pour réorganiser</span>}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {images.map((url, index) => (
                            <div
                                key={url}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-move ${
                                    index === 0 ? 'border-green-500' : 'border-gray-200'
                                } hover:border-green-400 transition-colors`}
                            >
                                <img
                                    src={url}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                {index === 0 && (
                                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                        Principal
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Supprimer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
