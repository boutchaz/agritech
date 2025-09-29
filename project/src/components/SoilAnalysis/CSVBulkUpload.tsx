import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CSVBulkUploadProps {
  onImportComplete: () => void;
}

interface ParsedAnalysis {
  parcel_name: string;
  sample_date: string;
  ph_level: number;
  organic_matter: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soil_type?: string;
  depth?: number;
  lab_name?: string;
  notes?: string;
}

const CSVBulkUpload: React.FC<CSVBulkUploadProps> = ({ onImportComplete }) => {
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAnalysis[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const csvTemplate = `parcel_name,sample_date,ph_level,organic_matter,nitrogen,phosphorus,potassium,soil_type,depth,lab_name,notes
Parcelle A,2025-01-15,6.5,3.2,2.1,0.045,2.3,Limono-sableux,30,Lab AgriTest,Première analyse
Parcelle B,2025-01-20,7.2,2.8,1.8,0.038,1.9,Argileux,30,Lab AgriTest,Zone nord
Parcelle C,2025-01-22,5.9,3.5,2.4,0.052,2.6,Sableux,30,Lab AgriTest,Nécessite chaulage`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'soil_analysis_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text: string): ParsedAnalysis[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const requiredFields = ['parcel_name', 'sample_date', 'ph_level', 'organic_matter', 'nitrogen', 'phosphorus', 'potassium'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      throw new Error(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
    }

    const data: ParsedAnalysis[] = [];
    const newErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate and convert types
      try {
        const analysis: ParsedAnalysis = {
          parcel_name: row.parcel_name,
          sample_date: row.sample_date,
          ph_level: parseFloat(row.ph_level),
          organic_matter: parseFloat(row.organic_matter),
          nitrogen: parseFloat(row.nitrogen),
          phosphorus: parseFloat(row.phosphorus),
          potassium: parseFloat(row.potassium),
          soil_type: row.soil_type || undefined,
          depth: row.depth ? parseInt(row.depth) : undefined,
          lab_name: row.lab_name || undefined,
          notes: row.notes || undefined
        };

        // Validation
        if (!analysis.parcel_name) throw new Error('Nom de parcelle requis');
        if (!analysis.sample_date) throw new Error('Date d\'échantillonnage requise');
        if (isNaN(analysis.ph_level) || analysis.ph_level < 0 || analysis.ph_level > 14) {
          throw new Error('pH invalide (doit être entre 0 et 14)');
        }
        if (isNaN(analysis.organic_matter) || analysis.organic_matter < 0) {
          throw new Error('Matière organique invalide');
        }

        data.push(analysis);
      } catch (err: any) {
        newErrors.push(`Ligne ${i + 1}: ${err.message}`);
      }
    }

    setErrors(newErrors);
    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrors([]);
    setParsedData([]);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setParsedData(parsed);
      } catch (err: any) {
        setErrors([err.message]);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      for (const analysis of parsedData) {
        try {
          // Find parcel by name
          const { data: parcel } = await supabase
            .from('parcels')
            .select('id')
            .eq('name', analysis.parcel_name)
            .single();

          if (!parcel) {
            failedCount++;
            continue;
          }

          // Insert soil analysis
          const { error } = await supabase
            .from('soil_analyses')
            .insert({
              parcel_id: parcel.id,
              sample_date: analysis.sample_date,
              ph_level: analysis.ph_level,
              organic_matter: analysis.organic_matter,
              nitrogen: analysis.nitrogen,
              phosphorus: analysis.phosphorus,
              potassium: analysis.potassium,
              soil_type: analysis.soil_type,
              depth_cm: analysis.depth,
              lab_name: analysis.lab_name,
              notes: analysis.notes,
              created_by: user.id
            });

          if (error) {
            failedCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          failedCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount });

      if (successCount > 0) {
        setTimeout(() => {
          onImportComplete();
          setShowModal(false);
        }, 2000);
      }
    } catch (err: any) {
      setErrors([...errors, err.message]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Upload className="w-4 h-4" />
        <span>Import CSV</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Import en masse - Analyses de sol
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Télécharger le modèle CSV
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                      Utilisez notre modèle pour importer vos analyses de sol. Le fichier doit contenir les colonnes suivantes :
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-800 dark:text-blue-300 mb-3">
                      <div>• parcel_name (requis)</div>
                      <div>• sample_date (requis)</div>
                      <div>• ph_level (requis)</div>
                      <div>• organic_matter (requis)</div>
                      <div>• nitrogen (requis)</div>
                      <div>• phosphorus (requis)</div>
                      <div>• potassium (requis)</div>
                      <div>• soil_type (optionnel)</div>
                      <div>• depth (optionnel)</div>
                      <div>• lab_name (optionnel)</div>
                      <div>• notes (optionnel)</div>
                    </div>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger le modèle</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fichier CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
                />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                        Erreurs de validation
                      </h4>
                      <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Parsed Data Preview */}
              {parsedData.length > 0 && errors.length === 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Aperçu des données ({parsedData.length} analyses)
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Parcelle</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">pH</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">M.O.</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">N</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">P</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">K</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {parsedData.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.parcel_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.sample_date}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.ph_level}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.organic_matter}%</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.nitrogen}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.phosphorus}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.potassium}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 5 && (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                        ... et {parsedData.length - 5} autres analyses
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                        Import terminé
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-300">
                        {importResults.success} analyse(s) importée(s) avec succès
                        {importResults.failed > 0 && `, ${importResults.failed} échec(s)`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={parsedData.length === 0 || errors.length > 0 || importing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {importing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{importing ? 'Import en cours...' : 'Importer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CSVBulkUpload;