import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tauriCommands } from '@/lib/tauri-bridge';
import { Upload, FileArchive, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/(desktop)/import-data')({
  component: ImportDataPage,
});

function ImportDataPage() {
  const { t } = useTranslation();
  const [bundlePath, setBundlePath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    org_name: string | null;
    exported_at: string | null;
    error: string | null;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    tables_imported: string[];
    records_count: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async () => {
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const selected = await open({
        filters: [{ name: 'AgriTech Bundle', extensions: ['agritech', 'zip'] }],
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        setBundlePath(selected);
        setValidation(null);
        setImportResult(null);
        setError(null);
      }
    } catch (err) {
      setError('Failed to open file picker');
      console.error(err);
    }
  };

  const handleValidate = async () => {
    if (!bundlePath || !passphrase) {
      setError('Please select a file and enter the passphrase');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidation(null);

    try {
      const result = await tauriCommands.import.validateBundle(bundlePath, passphrase);
      setValidation(result);
      if (!result.valid && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!bundlePath || !passphrase || !validation?.valid) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await tauriCommands.import.importBundle(bundlePath, passphrase);
      setImportResult(result);
      if (result.success) {
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <FileArchive className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('desktop.import.title', 'Import Organization Data')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('desktop.import.description', 'Import your organization data from an exported bundle to get started with the desktop app.')}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('desktop.import.selectBundle', 'Data Bundle File')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bundlePath}
                  readOnly
                  placeholder={t('desktop.import.noFileSelected', 'No file selected')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <Button
                  onClick={handleSelectFile}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition"
                >
                  <Upload className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('desktop.import.passphrase', 'Encryption Passphrase')}
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t('desktop.import.enterPassphrase', 'Enter the passphrase used during export')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {validation?.valid && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t('desktop.import.validBundle', 'Valid Bundle')}</span>
                </div>
                <div className="text-sm text-emerald-600 dark:text-emerald-300 space-y-1">
                  <p><strong>{t('desktop.import.organization', 'Organization')}:</strong> {validation.org_name}</p>
                  <p><strong>{t('desktop.import.exportedAt', 'Exported')}:</strong> {validation.exported_at}</p>
                </div>
              </div>
            )}

            {importResult?.success && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t('desktop.import.success', 'Import Successful!')}</span>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-300">
                  {t('desktop.import.recordsImported', 'Imported {{count}} records', { count: importResult.records_count })}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-1">
                  {t('desktop.import.redirecting', 'Redirecting to dashboard...')}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {!validation?.valid && (
                <Button
                  onClick={handleValidate}
                  disabled={!bundlePath || !passphrase || isValidating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t('desktop.import.validate', 'Validate')
                  )}
                </Button>
              )}

              {validation?.valid && (
                <Button variant="emerald" onClick={handleImport} disabled={isImporting || importResult?.success} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition disabled:cursor-not-allowed" >
                  {isImporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t('desktop.import.startImport', 'Start Import')
                  )}
                </Button>
              )}
            </div>
          </div>

          <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
            {t('desktop.import.hint', 'You can export your data from the web app at Settings → Organization → Export Data')}
          </p>
        </div>
      </div>
    </div>
  );
}
