import { createFileRoute } from '@tanstack/react-router';
import { Printer, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ListPageLayout, ListPageHeader } from '@/components/ui/data-table';
import { useAuth } from '@/hooks/useAuth';
import { usePrintSettings, useUpdatePrintSettings } from '@/hooks/usePrintSettings';

export const Route = createFileRoute('/_authenticated/(settings)/settings/print')({
  component: PrintSettingsPage,
});

type PaperSize = 'A4' | 'A3' | 'Letter' | 'Legal';
type PrintFormat = 'PDF' | 'HTML';

interface PrintSettings {
  paperSize: PaperSize;
  defaultFormat: PrintFormat;
  compactTables: boolean;
  repeatHeaderFooter: boolean;
}

const STORAGE_KEY = 'agrogina_print_settings';

function loadSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PrintSettings;
  } catch {
    /* ignore */
  }
  return {
    paperSize: 'A4',
    defaultFormat: 'PDF',
    compactTables: false,
    repeatHeaderFooter: true,
  };
}

function PrintSettingsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const [settings, setSettings] = useState<PrintSettings>(loadSettings);
  const { data: apiSettings, isLoading } = usePrintSettings(currentOrganization?.id ?? null);
  const updatePrintSettings = useUpdatePrintSettings();

  useEffect(() => {
    if (!apiSettings) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings((prev) => {
      const next = {
        ...prev,
        paperSize: apiSettings.paper_size as PaperSize,
        compactTables: apiSettings.compact_tables,
        repeatHeaderFooter: apiSettings.repeat_header_footer,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [apiSettings]);

  const handleSave = async () => {
    if (!currentOrganization?.id) {
      toast.error(t('common.errors.organizationRequired', 'No organization selected'));
      return;
    }

    await updatePrintSettings.mutateAsync({
      organizationId: currentOrganization.id,
      data: {
        paper_size: settings.paperSize,
        compact_tables: settings.compactTables,
        repeat_header_footer: settings.repeatHeaderFooter,
      },
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success(t('printSettings.saved', 'Print settings saved'));
  };

  return (
    <ListPageLayout
      header={
        <ListPageHeader
            variant="shell"
            actions={
              <Button onClick={handleSave} className="gap-2" disabled={isLoading || updatePrintSettings.isPending}>
                <Printer className="h-4 w-4" />
                {t('printSettings.save', 'Save Settings')}
              </Button>
            }
          />
        }
      >
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.loading', 'Loading...')}
              </span>
            </div>
          ) : null}

          <Card>
          <CardHeader>
            <CardTitle>{t('printSettings.output.title', 'Output Settings')}</CardTitle>
            <CardDescription>
              {t('printSettings.output.description', 'Configure default print and export behavior')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('printSettings.paperSize', 'Paper Size')}
                </label>
                <Select
                  value={settings.paperSize}
                  onValueChange={(val) =>
                    setSettings((prev) => ({ ...prev, paperSize: val as PaperSize }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                    <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('printSettings.defaultFormat', 'Default Format')}
                </label>
                <Select
                  value={settings.defaultFormat}
                  onValueChange={(val) =>
                    setSettings((prev) => ({ ...prev, defaultFormat: val as PrintFormat }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">
                      <span className="flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        PDF
                      </span>
                    </SelectItem>
                    <SelectItem value="HTML">
                      <span className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        HTML (Print Preview)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('printSettings.layout.title', 'Layout Options')}</CardTitle>
            <CardDescription>
              {t('printSettings.layout.description', 'Control how document content is rendered')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('printSettings.compactTables', 'Compact Tables')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('printSettings.compactTablesDescription', 'Reduce table row height and font size for more data per page')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.compactTables}
                onClick={() =>
                  setSettings((prev) => ({ ...prev, compactTables: !prev.compactTables }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  settings.compactTables ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.compactTables ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('printSettings.repeatHeaderFooter', 'Repeat Header/Footer')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('printSettings.repeatHeaderFooterDescription', 'Show header and footer on every page of multi-page documents')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.repeatHeaderFooter}
                onClick={() =>
                  setSettings((prev) => ({ ...prev, repeatHeaderFooter: !prev.repeatHeaderFooter }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  settings.repeatHeaderFooter ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.repeatHeaderFooter ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ListPageLayout>
  );
}
