import {  useState  } from "react";
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle, AlertCircle, Loader2, FileArchive, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { tauriCommands, type BundleValidation, type ImportResult } from '../../lib/tauri-bridge';

type Step = 'select' | 'validate' | 'import' | 'complete' | 'error';

interface ImportWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ImportWizard = ({ onComplete, onCancel }: ImportWizardProps) => {
  useTranslation();
  const [step, setStep] = useState<Step>('select');
  const [bundlePath, setBundlePath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [validation, setValidation] = useState<BundleValidation | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async () => {
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'AgroGina Export', extensions: ['agritech', 'zip'] }],
      });
      
      if (selected && typeof selected === 'string') {
        setBundlePath(selected);
      }
    } catch (err) {
      console.error('File select error:', err);
      setError('Failed to open file dialog');
    }
  };

  const handleValidate = async () => {
    if (!bundlePath || !passphrase) {
      setError('Please select a file and enter the passphrase');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await tauriCommands.import.validateBundle(bundlePath, passphrase);
      setValidation(result);

      if (result.valid) {
        setStep('validate');
      } else {
        setError(result.error || 'Invalid bundle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setStep('import');

    try {
      const result = await tauriCommands.import.importBundle(bundlePath, passphrase);
      setImportResult(result);

      if (result.success) {
        setStep('complete');
      } else {
        setError(result.message);
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileArchive className="mx-auto h-16 w-16 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Import Organization Data
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select an exported bundle file to import your organization data.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bundle">Export Bundle File</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="bundle"
              value={bundlePath}
              onChange={(e) => setBundlePath(e.target.value)}
              placeholder="Select a .agritech file..."
              readOnly
              className="flex-1"
            />
            <Button onClick={handleFileSelect} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Browse
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="passphrase">Passphrase</Label>
          <div className="mt-1 relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter the export passphrase..."
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            The passphrase was set when exporting from the SaaS platform.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleValidate} disabled={!bundlePath || !passphrase || loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            'Validate Bundle'
          )}
        </Button>
      </div>
    </div>
  );

  const renderValidateStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bundle Validated
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          The export bundle is valid and ready to import.
        </p>
      </div>

      {validation && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Organization:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {validation.org_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Export Version:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {validation.export_version}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Schema Version:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {validation.schema_version}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Exported At:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {validation.exported_at
                ? new Date(validation.exported_at).toLocaleString()
                : 'Unknown'}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setStep('select')}>
          Back
        </Button>
        <Button onClick={handleImport} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            'Start Import'
          )}
        </Button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6 text-center">
      <Loader2 className="mx-auto h-16 w-16 text-green-600 animate-spin" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Importing Data...
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Please wait while your organization data is being imported.
      </p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all duration-500"
          style={{ width: '50%' }}
        />
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Import Complete!
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Your organization data has been successfully imported.
      </p>

      {importResult && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Tables imported:</strong>{' '}
            {importResult.tables_imported.join(', ')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            <strong>Total records:</strong> {importResult.records_count}
          </p>
        </div>
      )}

      <Button onClick={onComplete} className="w-full">
        Continue to App
      </Button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="space-y-6 text-center">
      <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Import Failed
      </h2>
      <p className="text-gray-600 dark:text-gray-400">{error}</p>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => setStep('select')}>
          Try Again
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {step === 'select' && renderSelectStep()}
        {step === 'validate' && renderValidateStep()}
        {step === 'import' && renderImportStep()}
        {step === 'complete' && renderCompleteStep()}
        {step === 'error' && renderErrorStep()}
      </div>
    </div>
  );
};

export default ImportWizard;
