import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FarmImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: () => void;
}

const FarmImportDialog: React.FC<FarmImportDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json')) {
        setFile(selectedFile);
        setError(null);
        setSuccess(null);
      } else {
        setError('Veuillez sélectionner un fichier JSON');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier JSON');
      return;
    }

    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Read file content
      const fileContent = await file.text();
      const exportData = JSON.parse(fileContent);

      // Validate export data structure
      if (!exportData.farms || !Array.isArray(exportData.farms)) {
        throw new Error('Format de fichier invalide: array "farms" manquant');
      }

      if (!exportData.version) {
        console.warn('Version non spécifiée dans le fichier d\'export');
      }

      // Call import Edge Function
      const { data, error: importError } = await supabase.functions.invoke('import-farm', {
        body: {
          organization_id: organizationId,
          export_data: exportData,
          skip_duplicates: skipDuplicates,
        },
      });

      if (importError) {
        throw new Error(importError.message || 'Erreur lors de l\'import');
      }

      if (data?.success) {
        const imported = data.imported;
        let message = `Import réussi!\n`;
        message += `- ${imported?.farms || 0} ferme(s) importée(s)\n`;
        message += `- ${imported?.parcels || 0} parcelle(s) importée(s)\n`;
        message += `- ${imported?.satellite_aois || 0} AOI(s) importée(s)`;

        if (data.warnings && data.warnings.length > 0) {
          message += `\n\nAvertissements:\n${data.warnings.join('\n')}`;
        }

        setSuccess(message);

        // Wait a bit before closing to show success message
        setTimeout(() => {
          onSuccess();
          setFile(null);
          setSuccess(null);
        }, 2000);
      } else {
        const errorMessages = data?.errors || ['Erreur lors de l\'import'];
        throw new Error(errorMessages.join('\n'));
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setError(error.message || 'Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setFile(null);
      setError(null);
      setSuccess(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importer des fermes
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un fichier JSON d'export pour restaurer des fermes avec leurs parcelles et AOI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fichier JSON d'export
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isImporting}
                />
                <div className="flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <FileJson className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    {file ? (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cliquez pour sélectionner un fichier JSON</p>
                    )}
                  </div>
                </div>
              </label>
            </div>
            {file && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Taille: {(file.size / 1024).toFixed(2)} KB
              </p>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skip-duplicates"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              disabled={isImporting}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="skip-duplicates" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Ignorer les doublons (par nom)
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">Erreur</p>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-300">Succès</p>
                <p className="text-sm text-green-700 dark:text-green-400 whitespace-pre-line">{success}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isImporting ? 'Import en cours...' : 'Importer'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FarmImportDialog;

