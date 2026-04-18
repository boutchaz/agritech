import { Info } from 'lucide-react';
import type { BlockGMetadonnees as BlockGData } from '@/types/calibration-review';

interface BlockGMetadonneesProps {
  data: BlockGData;
}

export function BlockGMetadonnees({ data }: BlockGMetadonneesProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 px-1" data-block="G">
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>{data.generated_at_formatted}</span>
    </div>
  );
}
