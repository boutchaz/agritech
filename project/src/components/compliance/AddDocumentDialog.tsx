import React, { useState, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { cn } from '@/lib/utils';

import { useUpdateCertification } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { storageApi } from '@/lib/api/storage';
import { type CertificationResponseDto, type DocumentDto } from '@/lib/api/compliance';

const documentTypes = [
  { value: 'certificate', label: 'Certificat' },
  { value: 'audit_report', label: "Rapport d'audit" },
  { value: 'inspection_report', label: "Rapport d'inspection" },
  { value: 'training_record', label: 'Attestation de formation' },
  { value: 'test_result', label: "Résultat d'analyse" },
  { value: 'procedure', label: 'Procédure' },
  { value: 'policy', label: 'Politique' },
  { value: 'other', label: 'Autre' },
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  type: z.string().min(1, "Le type de document est requis"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDocumentDialogProps {
  certification: CertificationResponseDto;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  return '📎';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddDocumentDialog({ certification }: AddDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { currentOrganization } = useAuth();
  const updateCertification = useUpdateCertification();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: '',
    },
  });

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Type de fichier non autorisé. Formats acceptés: PDF, Word, Excel, images (JPEG, PNG, TIFF), texte, CSV.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Le fichier est trop volumineux. Taille maximale: ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const error = validateFile(file);
    
    if (error) {
      toast.error(error);
      return;
    }
    
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function onSubmit(values: FormValues) {
    if (!currentOrganization || !selectedFile) return;

    setUploading(true);

    try {
       const timestamp = Date.now();
       const randomId = Math.random().toString(36).substring(2, 8);
       const sanitizedName = selectedFile.name
         .replace(/[^a-zA-Z0-9.-]/g, '_')
         .substring(0, 50);
       const filePath = `${currentOrganization.id}/${certification.id}/${timestamp}-${randomId}-${sanitizedName}`;

       const { publicUrl } = await storageApi.upload('compliance-documents', filePath, selectedFile, {
         cacheControl: '31536000',
         upsert: false,
       });

       const newDocument: DocumentDto = {
         type: values.type,
         url: publicUrl,
         uploaded_at: new Date().toISOString(),
         name: selectedFile.name,
         size: selectedFile.size,
         mime_type: selectedFile.type,
       };

      const existingDocuments = certification.documents || [];

      await updateCertification.mutateAsync({
        organizationId: currentOrganization.id,
        certificationId: certification.id,
        data: {
          documents: [...existingDocuments, newDocument],
        },
      });

      toast.success('Document ajouté avec succès');
      setOpen(false);
      form.reset();
      setSelectedFile(null);
    } catch (error) {
      console.error('Failed to add document:', error);
      toast.error("Échec de l'ajout du document");
    } finally {
      setUploading(false);
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setSelectedFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ajouter un document
          </DialogTitle>
          <DialogDescription>
            Téléversez un document ou une preuve pour cette certification.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormField 
                label="Type de document" 
                error={form.formState.errors.type?.message}
                required
              >
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((docType) => (
                      <SelectItem key={docType.value} value={docType.value}>
                        {docType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <FormField 
            label="Fichier" 
            error={!selectedFile ? undefined : undefined}
            required
          >
            {!selectedFile ? (
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Glissez un fichier ici ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF, Word, Excel, images (JPEG, PNG, TIFF), texte, CSV
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Taille maximale: 10 MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl">
                  {getFileIcon(selectedFile.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={uploading || !selectedFile || updateCertification.isPending}
            >
              {(uploading || updateCertification.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Upload className="mr-2 h-4 w-4" />
              Téléverser
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
