import { Check } from 'lucide-react';
import { ERP_MODULES, BASE_MODULE_IDS } from '@/lib/polar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SubscriptionModulePickerProps {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
}

export default function SubscriptionModulePicker({ selectedModules, onChange }: SubscriptionModulePickerProps) {
  const toggleModule = (moduleId: string) => {
    if (BASE_MODULE_IDS.includes(moduleId)) return;
    if (selectedModules.includes(moduleId)) {
      onChange(selectedModules.filter(id => id !== moduleId));
    } else {
      onChange([...selectedModules, moduleId]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        ERP Modules
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ERP_MODULES.map(mod => {
          const isSelected = selectedModules.includes(mod.id);
          const isBase = mod.isBase;
          return (
            <Card
              key={mod.id}
              className={cn(
                'cursor-pointer transition-all border',
                isBase
                  ? 'border-primary/30 bg-primary/5 opacity-90'
                  : isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50',
              )}
              onClick={() => toggleModule(mod.id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{mod.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mod.desc}</p>
                  {isBase && (
                    <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Included
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <span className="text-sm text-muted-foreground">Pricing tailored to your needs — we will contact you.</span>
      </div>
    </div>
  );
}
