import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../hooks/useAuth';

type ExportStep = 'configure' | 'exporting' | 'complete' | 'error';

export const ExportData: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [step, setStep] = useState<ExportStep>('configure');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExport = async () => {
    if (!passphrase || passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (!currentOrganization) {
      setError('No organization selected');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('exporting');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${API_URL}/api/v1/organizations/${currentOrganization.id}/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ passphrase }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }

      const data = await response.json();
      setDownloadUrl(data.downloadUrl);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Export Organization Data
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Export all your organization data to use in the desktop application.
          The export will be encrypted with your passphrase.
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> Remember your passphrase! You will need it
          to import the data in the desktop application.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="passphrase">Encryption Passphrase</Label>
          <div className="mt-1 relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter a strong passphrase..."
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Minimum 8 characters
          </p>
        </div>

        <div>
          <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
          <div className="mt-1 relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassphrase"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Confirm your passphrase..."
              className="pl-10"
            />
          </div>
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

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          What will be exported:
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Organization settings and users</li>
          <li>• All farms and parcels</li>
          <li>• Workers and tasks</li>
          <li>• Harvests and analyses</li>
          <li>• Accounting data (invoices, orders, etc.)</li>
          <li>• Inventory and stock data</li>
          <li>• Uploaded files and documents</li>
          <li>• Cached map tiles for offline use</li>
        </ul>
      </div>

      <Button
        onClick={handleExport}
        disabled={!passphrase || !confirmPassphrase || loading}
        className="w-full"
      >
        <Download className="h-4 w-4 mr-2" />
        Start Export
      </Button>
    </div>
  );

  const renderExportingStep = () => (
    <div className="space-y-6 text-center py-8">
      <Loader2 className="mx-auto h-16 w-16 text-green-600 animate-spin" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Exporting Data...
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        This may take a few minutes depending on the size of your data.
      </p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full animate-pulse"
          style={{ width: '60%' }}
        />
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Export Complete!
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Your organization data has been exported and encrypted.
      </p>

      {downloadUrl && (
        <Button asChild className="w-full">
          <a href={downloadUrl} download>
            <Download className="h-4 w-4 mr-2" />
            Download Export File
          </a>
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => {
          setStep('configure');
          setPassphrase('');
          setConfirmPassphrase('');
          setDownloadUrl(null);
        }}
        className="w-full"
      >
        Export Again
      </Button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="space-y-6 text-center py-8">
      <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Export Failed
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{error}</p>

      <Button
        variant="outline"
        onClick={() => {
          setStep('configure');
          setError(null);
        }}
        className="w-full"
      >
        Try Again
      </Button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {step === 'configure' && renderConfigureStep()}
      {step === 'exporting' && renderExportingStep()}
      {step === 'complete' && renderCompleteStep()}
      {step === 'error' && renderErrorStep()}
    </div>
  );
};

export default ExportData;
