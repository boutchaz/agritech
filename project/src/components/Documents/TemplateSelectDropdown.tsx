import { useDocumentTemplates } from '@/hooks/useDocumentTemplates';
import type { DocumentType } from '@/hooks/useDocumentTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { FileText, Star } from 'lucide-react';

interface TemplateSelectDropdownProps {
  documentType: DocumentType;
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  className?: string;
}

export function TemplateSelectDropdown({
  documentType,
  selectedTemplateId,
  onSelect,
  className,
}: TemplateSelectDropdownProps) {
  const { data: templates } = useDocumentTemplates(documentType);

  if (!templates || templates.length <= 1) return null;

  return (
    <Select
      value={selectedTemplateId ?? ''}
      onValueChange={(val) => onSelect(val || null)}
    >
      <SelectTrigger className={`h-9 w-auto min-w-[160px] ${className ?? ''}`}>
        <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-400 shrink-0" />
        <SelectValue placeholder="Default Template" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">
          Default Template
        </SelectItem>
        {templates.map((tpl) => (
          <SelectItem key={tpl.id} value={tpl.id}>
            <span className="flex items-center gap-1.5">
              {tpl.name}
              {tpl.is_default && (
                <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
