import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet, Archive, Loader2 } from 'lucide-react';
import { calibrationApi } from '@/lib/api/calibration-output';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CalibrationExportButtonProps {
  calibrationId: string;
}

export function CalibrationExportButton({ calibrationId }: CalibrationExportButtonProps) {
  const { currentOrganization } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useTranslation('ai');

  const handleExport = async (format: 'json' | 'csv' | 'zip') => {
    if (!currentOrganization?.id) return;
    
    try {
      setIsExporting(true);
      const blob = await calibrationApi.exportCalibration(calibrationId, format, currentOrganization.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calibration-${calibrationId}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(t('calibrationReview.export.success', { defaultValue: 'Exported successfully as {{format}}', format: format.toUpperCase() }));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('calibrationReview.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="gap-2 border-white/70 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:text-gray-900 [&_svg]:text-gray-700"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('calibrationReview.export.title')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')} className="gap-2 cursor-pointer">
          <FileJson className="h-4 w-4 text-blue-500" />
          <span>{t('calibrationReview.export.downloadJson')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-green-500" />
          <span>{t('calibrationReview.export.downloadCsv')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('zip')} className="gap-2 cursor-pointer">
          <Archive className="h-4 w-4 text-purple-500" />
          <span>{t('calibrationReview.export.downloadZip')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
