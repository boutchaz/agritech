import { useState } from 'react';
import { 
  AlertTriangle, 
  Circle,
  Filter,
  FileText,
  Search,
  ClipboardList
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useComplianceRequirements } from '@/hooks/useCompliance';
import { CertificationType, type ComplianceRequirementDto } from '@/lib/api/compliance';

interface ComplianceChecklistDialogProps {
  defaultCertificationType?: CertificationType;
}

export function ComplianceChecklistDialog({ defaultCertificationType }: ComplianceChecklistDialogProps) {
  const [open, setOpen] = useState(false);
  const [certType, setCertType] = useState<string>(defaultCertificationType || 'GlobalGAP');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: requirements, isLoading } = useComplianceRequirements(certType);

  const categories = requirements 
    ? [...new Set(requirements.map(r => r.category))].sort()
    : [];

  const filteredRequirements = requirements?.filter(req => {
    const matchesSearch = 
      req.requirement_code.toLowerCase().includes(search.toLowerCase()) ||
      req.requirement_description.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || req.category === categoryFilter;

    return matchesSearch && matchesCategory;
  }) || [];

  const groupedRequirements = filteredRequirements.reduce((acc, req) => {
    if (!acc[req.category]) {
      acc[req.category] = [];
    }
    acc[req.category].push(req);
    return acc;
  }, {} as Record<string, ComplianceRequirementDto[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          <ClipboardList className="mr-2 h-4 w-4" />
          Voir la checklist complète
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Checklist de Conformité
          </DialogTitle>
          <DialogDescription>
            Exigences requises pour la certification. Les points critiques sont marqués en rouge.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={certType} onValueChange={setCertType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type de certification" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CertificationType).map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Catégorie" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Critique</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Standard</span>
            </div>
            <span className="ml-auto">
              {filteredRequirements.length} exigence{filteredRequirements.length !== 1 ? 's' : ''}
            </span>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-16 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : filteredRequirements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Aucune exigence trouvée pour ce filtre.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedRequirements).sort().map(([category, reqs]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {category}
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {reqs.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {reqs.map((req) => (
                        <RequirementItem key={req.id} requirement={req} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequirementItem({ requirement }: { requirement: ComplianceRequirementDto }) {
  const isCritical = requirement.severity === 'critical' || requirement.severity === 'major';

  return (
    <div className={`
      p-3 rounded-lg border transition-colors
      ${isCritical 
        ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' 
        : 'border-border bg-card hover:bg-muted/50'
      }
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          mt-0.5 flex-shrink-0
          ${isCritical ? 'text-red-500' : 'text-blue-500'}
        `}>
          {isCritical ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className={`
              text-xs font-mono px-1.5 py-0.5 rounded
              ${isCritical 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {requirement.requirement_code}
            </code>
            {isCritical && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Critique
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {requirement.requirement_description}
          </p>
        </div>
      </div>
    </div>
  );
}
