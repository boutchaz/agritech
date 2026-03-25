import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, CheckCircle, AlertCircle, Lock, FileArchive } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { useAuth } from '../../hooks/useAuth';
import { getApiHeaders } from '../../lib/api-client';

type ExportStep = 'configure' | 'exporting' | 'complete' | 'error';

interface ExportStats {
  farms: number;
  parcels: number;
  workers: number;
  tasks: number;
  harvest_records: number;
  invoices: number;
  journal_entries: number;
  payment_records: number;
  work_records: number;
  accounts: number;
  _storage_files: number;
  total: number;
}

async function encryptData(data: string, passphrase: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    dataBuffer
  );
  
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return result.buffer;
}

export const ExportData: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [step, setStep] = useState<ExportStep>('configure');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!passphrase || passphrase.length < 8) {
      setError(t('settings.export.passphraseMinLength', 'Passphrase must be at least 8 characters'));
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError(t('settings.export.passphraseMismatch', 'Passphrases do not match'));
      return;
    }

    if (!currentOrganization) {
      setError(t('settings.export.noOrganization', 'No organization selected'));
      return;
    }

    setLoading(true);
    setError(null);
    setStep('exporting');
    setProgress(10);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const headers = await getApiHeaders(currentOrganization.id);
      
      setProgress(20);
      
      const response = await fetch(
        `${API_URL}/api/v1/organizations/${currentOrganization.id}/demo-data/export`,
        {
          method: 'GET',
          headers: headers as HeadersInit,
        }
      );

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      const exportData = await response.json();
      
      setProgress(70);

      const exportStats: ExportStats = {
        farms: exportData.farms?.length || 0,
        parcels: exportData.parcels?.length || 0,
        workers: exportData.workers?.length || 0,
        tasks: exportData.tasks?.length || 0,
        harvest_records: exportData.harvest_records?.length || 0,
        invoices: exportData.invoices?.length || 0,
        journal_entries: exportData.journal_entries?.length || 0,
        payment_records: exportData.payment_records?.length || 0,
        work_records: exportData.work_records?.length || 0,
        accounts: exportData.accounts?.length || 0,
        _storage_files: exportData._storage_files?.length || 0,
        total: 0,
      };
      
      Object.keys(exportData).forEach(key => {
        if (key !== 'metadata' && Array.isArray(exportData[key])) {
          exportStats.total += exportData[key].length;
        }
      });
      
      setStats(exportStats);
      
      setProgress(80);

      const jsonString = JSON.stringify(exportData, null, 2);
      const encryptedData = await encryptData(jsonString, passphrase);
      
      setProgress(90);

      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `agritech-export-${currentOrganization.slug || currentOrganization.id}-${date}.agritech`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setProgress(100);
      setStep('complete');
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : t('settings.export.failed', 'Export failed'));
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('settings.export.title', 'Export Organization Data')}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.export.description', 'Export all your organization data to use in the desktop application. The export will be encrypted with your passphrase.')}
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="flex">
          <Lock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div className="ml-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>{t('settings.export.important', 'Important')}:</strong> {t('settings.export.rememberPassphrase', 'Remember your passphrase! You will need it to import the data in the desktop application.')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="passphrase">{t('settings.export.passphrase', 'Encryption Passphrase')}</Label>
          <div className="mt-1 relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={t('settings.export.enterPassphrase', 'Enter a strong passphrase...')}
              className="pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {t('settings.export.minChars', 'Minimum 8 characters')}
          </p>
        </div>

        <div>
          <Label htmlFor="confirmPassphrase">{t('settings.export.confirmPassphrase', 'Confirm Passphrase')}</Label>
          <div className="mt-1 relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassphrase"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder={t('settings.export.confirmPlaceholder', 'Confirm your passphrase...')}
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
          {t('settings.export.whatExported', 'What will be exported:')}
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• {t('settings.export.farmsAndParcels', 'All farms and parcels')}</li>
          <li>• {t('settings.export.workersAndTasks', 'Workers and tasks')}</li>
          <li>• {t('settings.export.harvests', 'Harvests and reception batches')}</li>
          <li>• {t('settings.export.accounting', 'Accounting data (invoices, orders, payments)')}</li>
          <li>• {t('settings.export.inventory', 'Inventory and stock data')}</li>
          <li>• {t('settings.export.customers', 'Customers and suppliers')}</li>
          <li>• {t('settings.export.infrastructure', 'Infrastructure (structures, warehouses)')}</li>
        </ul>
      </div>

      <Button
        onClick={handleExport}
        disabled={!passphrase || !confirmPassphrase || loading}
        className="w-full"
      >
        <Download className="h-4 w-4 mr-2" />
        {t('settings.export.startExport', 'Start Export')}
      </Button>
    </div>
  );

  const renderExportingStep = () => (
    <div className="space-y-6 text-center py-8">
      <Loader2 className="mx-auto h-16 w-16 text-green-600 animate-spin" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('settings.export.exporting', 'Exporting Data...')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {t('settings.export.pleaseWait', 'This may take a few minutes depending on the size of your data.')}
      </p>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">{progress}%</p>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center py-8">
      <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('settings.export.complete', 'Export Complete!')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {t('settings.export.completeMessage', 'Your organization data has been exported and encrypted.')}
      </p>

      {stats && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
            <FileArchive className="h-4 w-4 mr-2" />
            {t('settings.export.exportSummary', 'Export Summary')}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div>{t('common.farms', 'Farms')}:</div>
            <div className="font-medium">{stats.farms}</div>
            <div>{t('common.parcels', 'Parcels')}:</div>
            <div className="font-medium">{stats.parcels}</div>
            <div>{t('common.workers', 'Workers')}:</div>
            <div className="font-medium">{stats.workers}</div>
            <div>{t('common.tasks', 'Tasks')}:</div>
            <div className="font-medium">{stats.tasks}</div>
            <div>{t('common.harvests', 'Harvests')}:</div>
            <div className="font-medium">{stats.harvest_records}</div>
            <div>{t('common.invoices', 'Invoices')}:</div>
            <div className="font-medium">{stats.invoices}</div>
            <div>{t('common.journalEntries', 'Journal Entries')}:</div>
            <div className="font-medium">{stats.journal_entries}</div>
            <div>{t('common.paymentRecords', 'Payment Records')}:</div>
            <div className="font-medium">{stats.payment_records}</div>
            <div>{t('common.workRecords', 'Work Records')}:</div>
            <div className="font-medium">{stats.work_records}</div>
            <div>{t('common.accounts', 'Accounts')}:</div>
            <div className="font-medium">{stats.accounts}</div>
            {stats._storage_files > 0 && (
              <>
                <div>{t('common.files', 'Files & Images')}:</div>
                <div className="font-medium">{stats._storage_files}</div>
              </>
            )}
            <div className="border-t pt-2 font-medium">{t('common.totalRecords', 'Total Records')}:</div>
            <div className="border-t pt-2 font-bold text-green-600">{stats.total}</div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('settings.export.downloadStarted', 'Your download should have started automatically. Use this file to import your data in the AgriTech Desktop application.')}
        </p>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setStep('configure');
          setPassphrase('');
          setConfirmPassphrase('');
          setStats(null);
          setProgress(0);
        }}
        className="w-full"
      >
        {t('settings.export.exportAgain', 'Export Again')}
      </Button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="space-y-6 text-center py-8">
      <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('settings.export.exportFailed', 'Export Failed')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{error}</p>

      <Button
        variant="outline"
        onClick={() => {
          setStep('configure');
          setError(null);
          setProgress(0);
        }}
        className="w-full"
      >
        {t('common.tryAgain', 'Try Again')}
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
